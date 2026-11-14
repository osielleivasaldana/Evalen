"""DIAGNÓSTICO 2 (solo lectura) — Réplica campaña REAL "Educadora de Párvulos" × fixture cv_parvularia_15y.

Continuación de dev/diag_parvularia_ceiling.py (baseline golden = 85).

Qué hace:
  1. RUBRIC_EXTRACTION sobre el TEXTO REAL de la campaña. NO hay API key en el
     entorno => se usa un MOCK DETERMINISTA DECLARADO (MOCK_RUBRIC abajo), pero se
     ejercita la RUTA REAL de DynamicRubricService.generate_rubric (se mockea solo
     llm.call_agent_structured) => el post-procesamiento de inyección corre de verdad.
  2. Candidato: fixture evals/cvs_fixture/cv_parvularia_15y.txt vía ruta REAL
     RobustExtractionService.extract_from_text -> ScoringService.evaluate_candidate
     (matriz determinista incluida, sin mockearla). Mocks LLM idénticos al diag 1.
  3. Escenarios (pesos intactos, sin tocar app/**):
     R1 PISO          : parsedJobData.habilidades_blandas=[] + sims en cero
                        (hipótesis producción-flat del diag 1)
     R2 BLANDAS-SINPUENTE: blandas de la campaña pobladas + sims en cero
                        (mide matching puramente literal de cultural_fit)
     R3 INYECCION-PARSED  : payload trae top-level 'requisitos.habilidades_requeridas'
                        (ruta REAL de inyección de DynamicRubricService) => mide el
                        "balloon" de mandatory con bullets blandos del parser
     R4 REPLICA-CAL   : blandas pobladas + similitud CAL (proxy determinista de
                        embeddings reales: jaccard de conceptos + regla head-noun 0.75)
                        <<< ESCENARIO PRIMARIO DE RÉPLICA >>>
     R5 F1-FIX        : R4 + las habilidades_blandas DECLARADAS del CV entran al set
                        puenteable (vía latent_extra) => cuantifica EXACTO la fuga F1
     R6 TECHO-JUDGE   : R4 con judge generoso (comunicación oral y escrita = 1.0)

Uso:  python dev\\diag_campana_real.py   (desde currify-core/)
Salidas: dev/diag_campana_real_results.json + dev/diag_campana_real_rubrica.json
"""
import asyncio
import json
import sys
import unicodedata
from pathlib import Path

_HERE = Path(__file__).resolve()
_CORE = _HERE.parents[1]
_ROOT = _CORE.parent
for _p in (str(_ROOT), str(_CORE)):
    if _p not in sys.path:
        sys.path.insert(0, _p)

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

from app.models.resume import ResumeExtractionRequest  # noqa: E402
from app.models.dynamic_rubric import StructuredRubric  # noqa: E402
from app.services.llm_service import LLMService  # noqa: E402
from app.services.robust_extraction_service import RobustExtractionService  # noqa: E402
from app.services.scoring_service import ScoringService  # noqa: E402

FIXTURE_DIR = _ROOT / "evals" / "cvs_fixture"
RAW_PATH = FIXTURE_DIR / "cv_parvularia_15y.txt"

WEIGHTS = {"skills_match": 30, "experience": 25, "education": 15,
           "cultural_fit": 15, "logistics": 10, "career_trajectory": 5}

# ─────────────────────────────────────────────────────────────────────────────
# TEXTO REAL DE LA CAMPAÑA (entregado por el usuario; verbatim)
# ─────────────────────────────────────────────────────────────────────────────
CAMPAIGN_TEXT = """Buscamos una Educadora de Párvulos altamente motivada y comprometida para unirse a nuestro equipo. La profesional seleccionada será responsable de planificar, implementar y evaluar experiencias educativas significativas, basadas en el Currículum Nacional de Educación Parvularia. Deberá liderar un equipo educativo, fomentando un ambiente de aprendizaje estimulante, seguro e inclusivo, y realizando adaptaciones educativas para atender la diversidad de nuestros niños y niñas. Su rol será fundamental en el desarrollo integral de los párvulos, promoviendo su autonomía, creatividad y bienestar.
Requisitos
Título profesional de Educadora de Párvulos, reconocido por el Ministerio de Educación.
Experiencia comprobable en el manejo y aplicación del Currículum Nacional de Educación Parvularia.
Capacidad demostrada para diseñar e implementar adaptaciones educativas y estrategias pedagógicas diferenciadas.
Experiencia en liderazgo y coordinación de equipos de trabajo (técnicos en párvulos, asistentes).
Excelentes habilidades de comunicación oral y escrita, y capacidad para establecer relaciones efectivas con niños, familias y colegas.
Proactividad, creatividad y capacidad para resolver desafíos pedagógicos.
Compromiso con la promoción de un ambiente de respeto, inclusión y desarrollo integral.
Manejo de herramientas tecnológicas básicas para la planificación y gestión educativa.
Beneficios y Condiciones
Tipo de contrato: Indefinido. Modalidad: Presencial. Beneficios: crecimiento profesional, clima laboral, equipamiento proporcionado."""

JOB_TITLE = "Educadora de Párvulos"

# ─────────────────────────────────────────────────────────────────────────────
# MOCK DETERMINISTA DE RUBRIC_EXTRACTION (declarado: NO hay API key en entorno).
# Decisiones de extracción (documentadas en el reporte):
#  - education: "Título profesional de Educadora de Párvulos reconocido por Mineduc"
#    => required_degrees explícito, nivel Universitario, kill_clause True.
#  - experience: "Experiencia comprobable" SIN número => min_years=0 (no inferible);
#    key_roles = rol nominal de la oferta.
#  - skills.mandatory: SOLO ítems "si faltan no puede hacer el trabajo":
#    Currículum Nacional (requisito #2), adaptaciones/estrategias (#3), liderazgo (#4),
#    comunicación oral y escrita (#5), herramientas tecnológicas básicas (#8),
#    planificación educativa (intro "planificar... experiencias educativas").
#  - nice_to_have: la campaña no declara deseables => [].
#  - logistics: SIN ciudad en el texto ("Presencial" sólo) => location=None.
#  - Blandas (proactividad/creatividad/inclusión/etc.) NO van a mandatory
#    (regla del prompt: no inferir soft como técnicas) => viven SOLO en
#    parsedJobData.habilidades_blandas (parser del backend), que simulamos aparte.
# ─────────────────────────────────────────────────────────────────────────────
MOCK_RUBRIC = {
    "education": {
        "required_degrees": ["Educadora de Párvulos"],
        "academic_level": "Universitario",
        "kill_clause": True,
    },
    "experience": {
        "min_years": 0,
        "key_roles": ["Educadora de Párvulos"],
    },
    "skills": {
        "mandatory_skills": [
            "Currículum Nacional de Educación Parvularia",
            "adaptaciones educativas",
            "estrategias pedagógicas diferenciadas",
            "liderazgo de equipos",
            "comunicación oral y escrita",
            "herramientas tecnológicas básicas",
            "planificación educativa",
        ],
        "nice_to_have_skills": [],
    },
    "logistics": {"location": None, "modality": "Presencial"},
    "languages": {"required_languages": []},
    "certifications": {"mandatory_certs": []},
}

# parsedJobData.habilidades_blandas canónico (lo que extraería el parser del backend
# de esta campaña; cubre las 4 que nombra el usuario + liderazgo + teamwork).
MOCK_JOB_BLANDAS = ["comunicación efectiva", "liderazgo", "trabajo en equipo",
                    "proactividad", "creatividad", "inclusión"]

# Hipótesis R3: bullets de la sección "Requisitos" tal como los volcaría un parser
# de ofertas a top-level 'requisitos.habilidades_requeridas' (incluye BLANDAS).
R3_REQUISITOS_PARSED = [
    "Currículum Nacional de Educación Parvularia",
    "Adaptaciones educativas",
    "Estrategias pedagógicas diferenciadas",
    "Liderazgo y coordinación de equipos",
    "Comunicación oral y escrita",
    "Herramientas tecnológicas básicas",
    "Proactividad",
    "Creatividad",
    "Resolución de desafíos pedagógicos",
]

# Habilidades_blandas DECLARADAS por el fixture CV (las que F1 ignora).
CV_DECLARED_BLANDAS = ["Trabajo colaborativo con familias", "Empatía", "Comunicación efectiva"]

# Política BASE del Skill Judge (determinista, declarada, anti-alucinación):
# sólo acredita con evidencia LITERAL del contexto. Conservadora: comunicación
# oral y escrita => 0.5 (las reuniones con apoderados acreditan lo oral; lo
# escrito es inferencia). Variante GENEROSA (R6): 1.0.
JUDGE_EV_COMUNICACION = "Reuniones periódicas con apoderados y comunidad educativa"
JUDGE_BASE = {"comunicación oral y escrita": (0.5, JUDGE_EV_COMUNICACION)}
JUDGE_GENEROSO = {"comunicación oral y escrita": (1.0, JUDGE_EV_COMUNICACION)}

# ─────────────────────────────────────────────────────────────────────────────
# Mocks de EXTRACCIÓN — idénticos al diag 1 / eval oficial (deterministas, costo 0)
# ─────────────────────────────────────────────────────────────────────────────
BROKEN_EXPERIENCE_OUTPUT = {
    "experiencias": [{
        "cargo": "Educadora de Párvulos",
        "empresa": "Fundación San Carlos de Maipo",
        "periodo": {"fecha_inicio": "N/A", "fecha_fin": "2023", "texto_original": "N/A - 2023"},
        "responsabilidades": [
            "Elaboración de proyectos pedagógicos para primer y segundo ciclo",
            "Evaluación del desarrollo infantil mediante observación sistemática",
            "Reuniones periódicas con apoderados y comunidad educativa",
        ],
    }]
}
COLADED_OTHER_OUTPUT = {
    "section_name": "OTROS ANTECEDENTES",
    "items": [
        "Corporación Educacional B | 2010 - 2017 Educadora de Párvulos Nivel Medio",
        "• Gestión de curso de 25 párvulos con planificación educativa por ámbitos",
        "• Aplicación de primeros auxiliares pediátricos y protocolos de emergencia",
        "Junta de Vecinos Los Aromos | 2009 - 2010 Educadora en programa comunitario",
        "• Talleres de estimulación temprana para la comunidad",
        "Disponibilidad para trabajar en regiones",
    ],
}
PEDAGOGICAL_SKILLS_OUTPUT = {
    "habilidades_tecnicas": [
        {"skill": "Elaboración de proyectos pedagógicos", "level": "Avanzado"},
        {"skill": "Evaluación del desarrollo infantil", "level": "Avanzado"},
        {"skill": "Primeros auxiliares pediátricos", "level": "Intermedio"},
        {"skill": "Comunicación con apoderados", "level": "Avanzado"},
        {"skill": "Gestión de curso", "level": "Avanzado"},
        {"skill": "Metodologías lúdicas", "level": "Intermedio"},
        {"skill": "Planificación educativa por ámbitos", "level": "Avanzado"},
    ],
    "idiomas": [],
    "habilidades_blandas": ["Trabajo colaborativo con familias", "Empatía", "Comunicación efectiva"],
}

BASE_LATENT = ["proyectos pedagogicos", "educacion inicial", "estimulacion temprana"]


def _make_llm():
    try:
        from app.core.config import settings
        orig = settings.google_api_key
        settings.google_api_key = "test-fake-key"
        try:
            llm = LLMService()
        finally:
            settings.google_api_key = orig
    except Exception:
        from unittest.mock import MagicMock
        llm = MagicMock()
    return llm


def make_extraction_llm():
    """LLM mockeado para la etapa de EXTRACCIÓN (idéntico al diag 1)."""
    llm = _make_llm()

    async def fake(prompt, input_data, stage_name, **kw):
        if "section_experience" in stage_name:
            return BROKEN_EXPERIENCE_OUTPUT
        if "section_other" in stage_name:
            return COLADED_OTHER_OUTPUT
        if "section_skills" in stage_name:
            return PEDAGOGICAL_SKILLS_OUTPUT
        if "section_titles" in stage_name or "section_education" in stage_name:
            return {"formacion": [{"titulo": "Educadora de Párvulos",
                                   "institucion": "Universidad Central de Chile",
                                   "periodo": {"fecha_inicio": "2005", "fecha_fin": "2009"}}]}
        if "section_summary" in stage_name:
            return {"resumen": "Educadora de Párvulos con 15 años de trayectoria en educación inicial."}
        if "date_repair" in stage_name:
            return {"fecha_inicio": "2018", "fecha_fin": "2023"}
        if "section_" in stage_name:
            return {"items": []}
        return None

    llm.call_agent = fake
    return llm


def make_scoring_llm(judge_policy, latent_extra=None):
    """LLM mockeado para SCORING + RUBRIC_EXTRACTION (ruta real del servicio)."""
    llm = _make_llm()
    judge_log = []

    async def fake_structured(prompt, input_data, response_model=None, stage_name="", **kw):
        # RUTA REAL: DynamicRubricService valida + post-procesa este objeto.
        return StructuredRubric.model_validate(MOCK_RUBRIC)

    async def fake(prompt, input_data, stage_name, **kw):
        p = str(prompt).lower()
        if "SKILL_JUDGE" in stage_name:
            score, evidence = 0.0, None
            for key, (s, ev) in judge_policy.items():
                if key in p:
                    score, evidence = s, ev
                    break
            judge_log.append({"skill_head": str(prompt)[:100], "score": score,
                              "evidence": evidence})
            return {"score": score, "evidence": evidence}
        if "LATENT_SKILL_EXTRACTION" in stage_name:
            return BASE_LATENT + (latent_extra or [])
        if "ROLE_NORMALIZATION" in stage_name:
            titles = input_data if isinstance(input_data, list) else []
            return [str(t).lower() for t in titles]
        if "SCORING_EVALUATION" in stage_name:
            return {
                "breakdown": {
                    "skills_match": {"reasoning": "Cobertura parcial de mandatory de campaña real"},
                    "experience": {"reasoning": "15 años de trayectoria educativa"},
                    "education": {"reasoning": "Título de Educadora de Párvulos"},
                    "cultural_fit": {"reasoning": "Perfil orientado a familias y comunidad"},
                    "logistics": {"reasoning": "Sin ubicación exigida en la campaña"},
                    "career_trajectory": {"reasoning": "Progresión entre instituciones"},
                },
                "strengths": ["15 años de trayectoria"], "gaps": [],
                "summary": "Educadora sólida.",
            }
        if "TRANSFERABILITY_CHECK" in stage_name:
            return "FALSE"
        return None

    llm.call_agent = fake
    llm.call_agent_structured = fake_structured
    llm._judge_log = judge_log
    return llm


# ─────────────────────────────────────────────────────────────────────────────
# Régimen de similitud CAL (proxy determinista de embeddings reales, DECLARADO):
# jaccard sobre "conceptos" (stems agrupados) + regla head-noun (primer concepto
# común => floor 0.75). Sin parámetros libres más allá de la tabla pública.
# ─────────────────────────────────────────────────────────────────────────────
_CONCEPT_RULES = [
    ("curricul", "CURRICUL"), ("nacional", "NACIONAL"), ("parvul", "EDUC"),
    ("educ", "EDUC"), ("pedagog", "EDUC"), ("docen", "EDUC"),
    ("planif", "PLANIF"), ("evalu", "EVALU"),
    ("comunic", "COMUNIC"), ("apoder", "FAMILIA"), ("famili", "FAMILIA"),
    ("lider", "LIDER"), ("dirig", "LIDER"), ("equip", "EQUIP"),
    ("trabaj", "TRABAJ"), ("colabor", "TRABAJ"),
    ("inclus", "INCLUS"), ("creativ", "CREATIV"), ("proactiv", "PROACTIV"),
    ("tecnol", "TECNOL"), ("digital", "TECNOL"), ("informatic", "TECNOL"), ("comput", "TECNOL"),
    ("metodol", "METODOL"), ("ludic", "LUDIC"), ("jueg", "LUDIC"),
    ("estrateg", "ESTRAT"), ("diferenci", "DIFERENCI"), ("adapt", "ADAPT"),
    ("gestion", "GESTION"), ("curso", "CURSO"),
    ("auxili", "AUXILIO"), ("emergen", "EMERGEN"),
    ("proyect", "PROYECT"), ("infantil", "INFANTIL"), ("desarrollo", "DESARROLLO"),
    ("estimul", "ESTIMUL"), ("herram", "HERRAM"),
    ("oral", "ORAL"), ("escrit", "ESCRIT"), ("efectiv", "EFECTIV"),
    ("empat", "EMPATIA"), ("problem", "PROBLEMA"), ("resolv", "PROBLEMA"), ("desafi", "PROBLEMA"),
    ("ambit", "AMBITO"), ("inicial", "INICIAL"), ("basic", "BASIC"),
]


def _strip_accents(s: str) -> str:
    s = unicodedata.normalize("NFD", str(s or "").lower())
    return "".join(c for c in s if not unicodedata.combining(c))


def _concepts(text: str):
    toks = [_strip_accents(t) for t in str(text).replace(",", " ").split()]
    out = []
    for tok in toks:
        for prefix, label in _CONCEPT_RULES:
            if prefix in tok:
                out.append(label)
                break
    return out


def sim_cal(a: str, b: str) -> float:
    a_l, b_l = _strip_accents(a).strip(), _strip_accents(b).strip()
    if a_l == b_l:
        return 1.0
    ca, cb = _concepts(a), _concepts(b)
    if not ca or not cb:
        return 0.0
    inter = len(set(ca) & set(cb))
    union = len(set(ca) | set(cb))
    jac = inter / union if union else 0.0
    if ca[0] == cb[0]:          # regla head-noun (anclaje del sustantivo cabeza)
        return max(jac, 0.75)
    return jac


async def extract_datos(raw):
    llm = make_extraction_llm()
    svc = RobustExtractionService(llm_service=llm)
    req = ResumeExtractionRequest(archivo_contenido=raw, tipo_archivo="txt",
                                  nombre_archivo="cv_parvularia_15y_anon.txt")
    resp = await svc.extract_from_text(req, request_id="diag-campana-real")
    return resp.datos_cv


async def run_scenario(name, datos, *, job_soft=None, sim_mode="zero",
                       requisitos_injection=False, latent_extra=None,
                       judge_policy=None):
    judge_policy = judge_policy if judge_policy is not None else dict(JUDGE_BASE)
    llm = make_scoring_llm(judge_policy, latent_extra=latent_extra)
    svc = ScoringService(llm_service=llm)

    sim_log, norm_log, rubric_log = [], [], []

    async def fake_expand(skills):
        return set(str(s).lower() for s in skills)

    async def fake_norm_deg(deg):
        return [d.lower() for d in deg]

    async def fake_embedding(t):
        return [0.0] * 4

    # ── Instrumentación por observación (no altera lógica) ──
    orig_sim = svc.semantic_service.calculate_similarity
    async def wrapped_sim(a, b):
        if sim_mode == "cal":
            s = sim_cal(a, b)
        else:
            s = await orig_sim(a, b)  # régimen zero: embeddings [0,0,0,0] => coseno 0
        sim_log.append({"a": a, "b": b, "sim": round(float(s), 4)})
        return s
    svc.semantic_service.calculate_similarity = wrapped_sim  # type: ignore

    orig_norm = svc.semantic_service.normalize_job_titles
    async def wrapped_norm(titles):
        r = await orig_norm(titles)
        norm_log.append({"in": list(titles), "out": list(r)})
        return r
    svc.semantic_service.normalize_job_titles = wrapped_norm  # type: ignore

    orig_judge = svc._judge_single_skill
    async def wrapped_judge(req_skill, ctx):
        r = await orig_judge(req_skill, ctx)
        llm._judge_log.append({"skill": req_skill, "score": float(r.score),
                               "evidence": r.evidence})
        return r
    svc._judge_single_skill = wrapped_judge  # type: ignore

    orig_gr = svc.dynamic_rubric_service.generate_rubric
    async def wrapped_gr(title, desc, parsed_data=None):
        r = await orig_gr(title, desc, parsed_data)  # ruta REAL + post-procesamiento
        rubric_log.append(r.model_dump())
        return r
    svc.dynamic_rubric_service.generate_rubric = wrapped_gr  # type: ignore

    svc.semantic_service.expand_skills = fake_expand  # type: ignore
    svc.semantic_service.normalize_degrees = fake_norm_deg  # type: ignore
    svc.semantic_service.get_text_embedding = fake_embedding  # type: ignore

    cand = datos.model_dump()
    job_payload = {
        "title": JOB_TITLE,
        "description": CAMPAIGN_TEXT,
        "parsedJobData": {"habilidades_blandas": list(job_soft or [])},
    }
    if requisitos_injection:
        # Ruta REAL de inyección: DynamicRubricService lee payload['requisitos']
        job_payload["requisitos"] = {"habilidades_requeridas": list(R3_REQUISITOS_PARSED)}

    resp = await svc.evaluate_candidate(cand, job_payload)

    # ── Reconstrucción analítica de bandas de skills (con lo observado) ──
    final_rubric = rubric_log[-1] if rubric_log else MOCK_RUBRIC
    mandatory = sorted(set(str(s).lower() for s in final_rubric["skills"]["mandatory_skills"]))
    habs = cand.get("habilidades", {})
    raw_skills = []
    for sk in habs.get("habilidades_tecnicas", []):
        raw_skills.append(sk.get("skill") if isinstance(sk, dict) else str(sk))
    latent = set(BASE_LATENT + (latent_extra or []))
    expanded = set(str(s).lower() for s in raw_skills) | latent
    ctx_parts = [str(cand.get("resumen_profesional", {}).get("resumen", ""))]
    for e in cand.get("experiencia_laboral", []) or []:
        ctx_parts.append(str(e.get("responsabilidades", "")))
        ctx_parts.append(str(e.get("cargo", "")))
    full_text = " ".join(ctx_parts).lower()

    judged_by_skill = {j.get("skill"): j for j in llm._judge_log if j.get("skill")}
    bands = {}
    for m in mandatory:
        if m in expanded:
            bands[m] = {"banda": "LITERAL(expandidas)", "credito": 1.0}
        elif m in full_text:
            bands[m] = {"banda": "LITERAL(texto)", "credito": 1.0}
        else:
            sims = [s["sim"] for s in sim_log if s["a"] == m]
            best = max(sims) if sims else 0.0
            if best >= 0.80:
                bands[m] = {"banda": f"SIM>=0.80 ({best})", "credito": 1.0}
            elif best >= 0.65:
                bands[m] = {"banda": f"SIM 0.65-0.80 ({best})", "credito": 0.5}
            elif m in judged_by_skill:
                j = judged_by_skill[m]
                bands[m] = {"banda": f"JUDGE({j['score']}) ev={str(j['evidence'])[:60]}",
                            "credito": j["score"]}
            else:
                bands[m] = {"banda": "SIN-CREDITO", "credito": 0.0}

    # ── Trace analítica de cultural_fit (corpus = resumen+responsabilidades;
    #    puente semántico = expanded_skills; umbral estricto >0.65) ──
    cult_corpus_parts = [str(cand.get("resumen_profesional", {}).get("resumen", ""))]
    for e in cand.get("experiencia_laboral", []) or []:
        cult_corpus_parts.append(str(e.get("responsabilidades", "")))
    cult_corpus = " ".join(cult_corpus_parts).lower()
    cultural_trace = []
    for ss in (job_soft or []):
        ss_l = str(ss).lower()
        entry = {"blanda": ss}
        if ss_l in cult_corpus:
            entry["via"] = "LITERAL(corpus resumen+resp)"
        else:
            best_pair, best_v = None, 0.0
            for cand_skill in sorted(expanded):
                v = sim_cal(ss_l, str(cand_skill).lower()) if sim_mode == "cal" else 0.0
                if v > best_v:
                    best_pair, best_v = cand_skill, v
            if best_v > 0.65:
                entry["via"] = f"PUENTE-SEMANTICO vs '{best_pair}' (sim={round(best_v,2)})"
            else:
                entry["via"] = f"FALLO (mejor puente={best_pair}:{round(best_v,2)} <=0.65)"
                if any(sim_cal(ss_l, str(db).lower()) > 0.65 for db in CV_DECLARED_BLANDAS):
                    entry["f1_fix_habría_creditado"] = True
        cultural_trace.append(entry)

    breakdown = {k: {"score": round(v.score, 2), "weight": v.weight,
                     "weighted": round(v.weighted_score, 2)}
                 for k, v in resp.breakdown.items()}
    return {
        "name": name,
        "overall": resp.overall_score,
        "recommendation": resp.recommendation,
        "breakdown": breakdown,
        "bands": bands,
        "cultural_trace": cultural_trace,
        "final_rubric": final_rubric,
        "judge_calls": llm._judge_log,
        "norm_trace": norm_log,
        "expanded_skills_count": len(expanded),
        "expresas": [e.get("empresa") for e in cand.get("experiencia_laboral", []) or []],
    }


def print_table(r):
    print(f"\n=== {r['name']} === overall={r['overall']} ({r['recommendation']})")
    print(f"{'dim':<18}{'score':>8}{'peso':>6}{'aporte':>8}{'perdidos':>9}")
    for dim, w in WEIGHTS.items():
        d = r["breakdown"].get(dim, {"score": 0, "weighted": 0})
        lost = round((100 - d["score"]) * w / 100, 2)
        print(f"{dim:<18}{d['score']:>8.2f}{w:>6}{d['weighted']:>8.2f}{lost:>9.2f}")
    print("bands skills:")
    for k, v in r["bands"].items():
        print(f"  - {k:<45} -> {v['banda']}")
    print("cultural_fit trace:")
    for t in r["cultural_trace"]:
        extra = "  <<F1>>" if t.get("f1_fix_habría_creditado") else ""
        print(f"  - {t['blanda']:<28} -> {t['via']}{extra}")
    n_judge = len([j for j in r["judge_calls"] if j.get("skill")])
    print(f"judge_llamadas={n_judge} mandatory_final={len(r['final_rubric']['skills']['mandatory_skills'])}")


async def main():
    raw = RAW_PATH.read_text(encoding="utf-8")
    print("Extrayendo CV (ruta real RobustExtractionService, mocks deterministas)...")
    datos = await extract_datos(raw)
    print(f"  experiencia_laboral={len(datos.experiencia_laboral)} "
          f"blandas_declaradas={datos.habilidades.habilidades_blandas}")

    results = []
    results.append(await run_scenario(
        "R1 PISO (blandas vacías + sims cero) [hipótesis producción-flat]", datos))
    results.append(await run_scenario(
        "R2 BLANDAS-SIN-PUENTE (blandas campaña + sims cero)", datos,
        job_soft=MOCK_JOB_BLANDAS))
    results.append(await run_scenario(
        "R3 INYECCION-PARSED (requisitos del parser -> mandatory)", datos,
        job_soft=MOCK_JOB_BLANDAS, requisitos_injection=True))
    results.append(await run_scenario(
        "R4 REPLICA-CAL (blandas + puente CAL) [PRIMARIO]", datos,
        job_soft=MOCK_JOB_BLANDAS, sim_mode="cal"))
    results.append(await run_scenario(
        "R5 F1-FIX (R4 + blandas declaradas del CV en el puente)", datos,
        job_soft=MOCK_JOB_BLANDAS, sim_mode="cal",
        latent_extra=[b.lower() for b in CV_DECLARED_BLANDAS]))
    results.append(await run_scenario(
        "R6 JUDGE-DOMINANTE (sin embeddings + judge generoso comunicacion=1.0)", datos,
        job_soft=MOCK_JOB_BLANDAS, sim_mode="zero",
        judge_policy=dict(JUDGE_GENEROSO)))

    for r in results:
        print_table(r)

    # ΔF1 exacto: R5 - R4 en cultural_fit y overall
    r4 = next(r for r in results if r["name"].startswith("R4"))
    r5 = next(r for r in results if r["name"].startswith("R5"))
    d_cult = r5["breakdown"]["cultural_fit"]["score"] - r4["breakdown"]["cultural_fit"]["score"]
    d_all = r5["overall"] - r4["overall"]
    print("\n=== FUGA F1 CUANTIFICADA (esta campaña) ===")
    print(f"cultural_fit: {r4['breakdown']['cultural_fit']['score']} -> {r5['breakdown']['cultural_fit']['score']} (Δ{round(d_cult,2)})")
    print(f"overall     : {r4['overall']} -> {r5['overall']} (Δ{round(d_all,2)} pts)")

    out = _CORE / "dev" / "diag_campana_real_results.json"
    out.write_text(json.dumps(results, ensure_ascii=False, indent=2, default=str), encoding="utf-8")
    rub_out = _CORE / "dev" / "diag_campana_real_rubrica.json"
    rub_artifact = {
        "modo": "MOCK DETERMINISTA (sin API key en entorno); ruta real DynamicRubricService.generate_rubric ejercitada",
        "campaign_title": JOB_TITLE,
        "rubrica_mock_declarada": MOCK_RUBRIC,
        "job_blandas_mock": MOCK_JOB_BLANDAS,
        "r3_requisitos_parsed": R3_REQUISITOS_PARSED,
        "rubrica_post_procesada_R1": results[0]["final_rubric"],
        "rubrica_post_procesada_R3_injection": results[2]["final_rubric"],
    }
    rub_out.write_text(json.dumps(rub_artifact, ensure_ascii=False, indent=2, default=str), encoding="utf-8")
    print(f"\nJSON resultados: {out}")
    print(f"JSON rúbrica:   {rub_out}")


if __name__ == "__main__":
    asyncio.run(main())
