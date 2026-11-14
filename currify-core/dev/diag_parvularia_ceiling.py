"""DIAGNÓSTICO (solo lectura) — Techo dimensional del caso parvularia (overall 36→60).

Ejecuta la RUTA REAL de producción:
  RobustExtractionService.extract_from_text -> ScoringService.evaluate_candidate
  (matriz determinista _calculate_matrix_scores incluida, sin mockearla)

con mocks de LLM DETERMINISTAS idénticos a evals/test_cv_parvularia_15y.py
(cero costo de tokens). Instrumentación SOLO POR OBSERVACIÓN: wrappers que
registran llamadas (judge / similitud / normalización) sin alterar lógica.

Escenarios:
  S1 baseline      : rúbrica golden del eval (representativa del rol)
  S2 stress        : rúbrica con +2 mandatory típicas de ofertas reales que el CV
                     NO tiene (drift de producción) — sensibilidad
  S3 cultural      : parsedJobData.habilidades_blandas pobladas (palanca job-side)
  S4 logistics     : ubicación requerida no contenida en la del candidato (kill clause)
  S5 expansion     : SEMANTIC_EXPANSION enriquecido con sinónimos pedagógicos

Uso:  python dev\\diag_parvularia_ceiling.py   (desde currify-core/)
"""
import asyncio
import json
import sys
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
from app.services.llm_service import LLMService  # noqa: E402
from app.services.robust_extraction_service import RobustExtractionService  # noqa: E402
from app.services.scoring_service import ScoringService  # noqa: E402

FIXTURE_DIR = _ROOT / "evals" / "cvs_fixture"
RAW_PATH = FIXTURE_DIR / "cv_parvularia_15y.txt"
GOLDEN_PATH = FIXTURE_DIR / "cv_parvularia_15y_golden.json"

WEIGHTS = {"skills_match": 30, "experience": 25, "education": 15,
           "cultural_fit": 15, "logistics": 10, "career_trajectory": 5}

# ─────────────────────────────────────────────────────────────────────────────
# Mocks idénticos al eval (deterministas, costo 0)
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


def make_fake(judge_log, latent_extra=None):
    """Dispatcher de stages idéntico al eval; registra llamadas del judge."""
    async def fake(prompt, input_data, stage_name, **kw):
        p = str(prompt).lower()
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
        if "SKILL_JUDGE" in stage_name:
            if "comunicacion con apoderados" in p or "comunicación con apoderados" in p:
                res = {"score": 1.0, "evidence": "Reuniones periódicas con apoderados y comunidad educativa"}
            else:
                res = {"score": 0.0, "evidence": None}
            judge_log.append({"prompt_head": str(prompt)[:120], **res})
            return res
        if "LATENT_SKILL_EXTRACTION" in stage_name:
            base = ["proyectos pedagogicos", "educacion inicial", "estimulacion temprana"]
            return base + (latent_extra or [])
        if "ROLE_NORMALIZATION" in stage_name:
            titles = input_data if isinstance(input_data, list) else []
            return [str(t).lower() for t in titles]
        if "SCORING_EVALUATION" in stage_name:
            return {
                "breakdown": {
                    "skills_match": {"reasoning": "Competencias pedagógicas equivalentes"},
                    "experience": {"reasoning": "15 años de trayectoria educativa"},
                    "education": {"reasoning": "Título de Educadora de Párvulos"},
                    "cultural_fit": {"reasoning": "Trabajo con familias y comunidad"},
                    "logistics": {"reasoning": "Santiago compatible"},
                    "career_trajectory": {"reasoning": "Progresión entre instituciones"},
                },
                "strengths": ["15 años de trayectoria"], "gaps": [],
                "summary": "Educadora sólida.",
            }
        if "TRANSFERABILITY_CHECK" in stage_name:
            return "FALSE"
        if "section_" in stage_name:
            return {"items": []}
        return None
    return fake


def base_rubric_dict(extra_mandatory=None, location=None):
    mandatory = [
        "planificación educativa",
        "evaluación del desarrollo infantil",
        "primeros auxiliares",
        "comunicación con apoderados",
        "gestión de curso",
    ] + (extra_mandatory or [])
    return {
        "education": {"required_degrees": ["Educadora de Párvulos"],
                      "academic_level": "Universitario", "kill_clause": False},
        "experience": {"min_years": 5, "key_roles": ["Educadora de Párvulos Nivel Medio"]},
        "skills": {"mandatory_skills": mandatory, "nice_to_have_skills": ["inglés básico"]},
        "logistics": {"location": location, "modality": "Presencial"},
        "languages": {"required_languages": []},
        "certifications": {"mandatory_certs": []},
    }


async def extract_datos(raw):
    llm = _make_llm()
    llm.call_agent = make_fake(judge_log=[])
    svc = RobustExtractionService(llm_service=llm)
    req = ResumeExtractionRequest(archivo_contenido=raw, tipo_archivo="txt",
                                  nombre_archivo="cv_parvularia_15y_anon.txt")
    resp = await svc.extract_from_text(req, request_id="diag-parvularia")
    return resp.datos_cv


async def run_scenario(name, datos, *, extra_mandatory=None, location=None,
                       job_soft=None, latent_extra=None):
    judge_log, sim_log, norm_log = [], [], []
    llm = _make_llm()
    llm.call_agent = make_fake(judge_log, latent_extra=latent_extra)
    svc = ScoringService(llm_service=llm)

    async def fake_expand(skills):
        return set(str(s).lower() for s in skills)

    async def fake_norm_deg(deg):
        return [d.lower() for d in deg]

    async def fake_rubric(title, desc, parsed_data=None):
        from app.models.dynamic_rubric import StructuredRubric
        return StructuredRubric.model_validate(
            base_rubric_dict(extra_mandatory=extra_mandatory, location=location))

    async def fake_embedding(t):
        return [0.0] * 4

    # ── Instrumentación por observación (no altera lógica) ──
    orig_sim = svc.semantic_service.calculate_similarity
    async def wrapped_sim(a, b):
        s = await orig_sim(a, b)
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
        judge_log.append({"skill": req_skill, "score": float(r.score),
                          "evidence": r.evidence})
        return r
    svc._judge_single_skill = wrapped_judge  # type: ignore

    svc.semantic_service.expand_skills = fake_expand  # type: ignore
    svc.semantic_service.normalize_degrees = fake_norm_deg  # type: ignore
    svc.semantic_service.get_text_embedding = fake_embedding  # type: ignore
    svc.dynamic_rubric_service.generate_rubric = fake_rubric  # type: ignore

    cand = datos.model_dump()
    job_payload = {
        "title": "Educadora de Párvulos Nivel Medio",
        "description": ("Educadora de Párvulos para nivel medio. Requiere: planificación educativa, "
                        "evaluación del desarrollo infantil, primeros auxiliares, comunicación con "
                        "apoderados, gestión de curso. Deseable inglés básico."),
        "parsedJobData": {"habilidades_blandas": job_soft or []},
    }
    resp = await svc.evaluate_candidate(cand, job_payload)

    # Reconstrucción de bandas de skills (misma lógica que la matriz, con datos observados)
    rubric = base_rubric_dict(extra_mandatory=extra_mandatory, location=location)
    mandatory = sorted(set(str(s).lower() for s in rubric["skills"]["mandatory_skills"]))
    habs = cand.get("habilidades", {})
    raw_skills = []
    for sk in habs.get("habilidades_tecnicas", []):
        raw_skills.append(sk.get("skill") if isinstance(sk, dict) else str(sk))
    latent = set(["proyectos pedagogicos", "educacion inicial", "estimulacion temprana"] + (latent_extra or []))
    expanded = set(str(s).lower() for s in raw_skills) | latent
    ctx_parts = [str(cand.get("resumen_profesional", {}).get("resumen", ""))]
    for e in cand.get("experiencia_laboral", []) or []:
        ctx_parts.append(str(e.get("responsabilidades", "")))
        ctx_parts.append(str(e.get("cargo", "")))
    full_text = " ".join(ctx_parts).lower()

    judged_by_skill = {j["skill"]: j for j in judge_log if "skill" in j}
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
                bands[m] = {"banda": "SIN-CREDITO(judge no disp.)", "credito": 0.0}

    breakdown = {k: {"score": v.score, "weight": v.weight,
                     "weighted": round(v.weighted_score, 2)}
                 for k, v in resp.breakdown.items()}
    return {
        "name": name,
        "overall": resp.overall_score,
        "recommendation": resp.recommendation,
        "breakdown": breakdown,
        "bands": bands,
        "judge_calls": judge_log,
        "norm_trace": norm_log,
        "sim_count": len(sim_log),
        "exp_count": len(cand.get("experiencia_laboral", []) or []),
        "expresas": [e.get("empresa") for e in cand.get("experiencia_laboral", []) or []],
        "fechas": [(e.get("empresa"), str(e.get("periodo", {}).get("fecha_inicio")),
                    str(e.get("periodo", {}).get("fecha_fin")))
                   for e in cand.get("experiencia_laboral", []) or []],
    }


def print_table(r):
    print(f"\n=== {r['name']} === overall={r['overall']} ({r['recommendation']})")
    print(f"{'dim':<18}{'score':>7}{'peso':>6}{'aporte':>8}{'perdidos':>9}")
    for dim, w in WEIGHTS.items():
        d = r["breakdown"].get(dim, {"score": 0, "weighted": 0})
        lost = round((100 - d["score"]) * w / 100, 2)
        print(f"{dim:<18}{d['score']:>7.1f}{w:>6}{d['weighted']:>8.2f}{lost:>9.2f}")
    print("skills bands:")
    for k, v in r["bands"].items():
        print(f"  - {k:<38} -> {v['banda']}")
    print(f"judge_llamadas={len([j for j in r['judge_calls'] if 'skill' in j])} "
          f"sim_llamadas={r['sim_count']} exp_reenrutadas={r['exp_count']} {r['expresas']}")
    print(f"fechas={r['fechas']}")
    for t in r["norm_trace"]:
        print(f"norm: {t['in']} -> {t['out']}")


async def main():
    raw = RAW_PATH.read_text(encoding="utf-8")
    datos = await extract_datos(raw)

    results = []
    results.append(await run_scenario("S1 BASELINE (rubrica golden eval)", datos))
    results.append(await run_scenario("S2 STRESS (+2 mandatory ausentes en CV)",
                                      datos, extra_mandatory=["convivencia escolar", "curriculum nacional"]))
    results.append(await run_scenario("S3 CULTURAL (soft skills del job pobladas)",
                                      datos, job_soft=["comunicación efectiva", "trabajo colaborativo con familias"]))
    results.append(await run_scenario("S4 LOGISTICS (ubicacion requerida no match)",
                                      datos, location="Providencia, Santiago"))
    results.append(await run_scenario("S5 EXPANSION (sinonimos pedagogicos en latentes)",
                                      datos, latent_extra=["planificacion curricular", "convivencia escolar",
                                                           "comunicacion con apoderados"]))
    # S3b: palanca cultural COMPLETA -> job reporta blandas Y el puente semántico
    # (LATENT_SKILL_EXTRACTION/embeddings reales) las conecta con el set expandido.
    results.append(await run_scenario("S3b CULTURAL-FULL (job blandas + puente semantico exacto)",
                                      datos, job_soft=["comunicación efectiva", "trabajo colaborativo con familias"],
                                      latent_extra=["comunicación efectiva", "trabajo colaborativo con familias"]))
    for r in results:
        print_table(r)

    # Techo estructural sin tocar pesos (constantes actuales del código)
    print("\n=== TECHO ESTRUCTURAL (sin cambios de codigo/pesos) ===")
    print("skills: mandatory=100 -> 80.0 (split 80/20); +2 por c/u nice match; techo rubrica actual = 82.0")
    print("trajectory: hardcode 70 cuando rol matchea (techo real 70, no 100)")
    print("overall_max_hoy = 82*0.30 + 100*0.25 + 100*0.15 + 100*0.15 + 100*0.10 + 70*0.05 =",
          round(82 * .30 + 100 * .25 + 100 * .15 + 100 * .15 + 100 * .10 + 70 * .05, 2))

    out = _CORE / "dev" / "diag_parvularia_results.json"
    out.write_text(json.dumps(results, ensure_ascii=False, indent=2, default=str), encoding="utf-8")
    print(f"\nJSON completo: {out}")


if __name__ == "__main__":
    asyncio.run(main())
