"""HARNESS GUARDARRAIL Fase B (SDD §4.3/§8-B.4) — Re-clasificación mandatory/nice.

Corre TODOS los fixtures + golden JSONs existentes (evals/cvs_fixture/) en DOS modos:
  - flag OFF (baseline RUBRIC_TIER_RECLASS off)  → comportamiento actual
  - flag ON  (post tier-reclass)                 → corrección determinista

y compara overall ptaje a punto. Re-ejecutable (determinista, LLM mockeado,
cero tokens). Artefacto comparativo: dev/harness_tier_reclass_results.json

Criterios (SDD §4.3 guardarraíl + §10):
  BLOQUEANTE : NINGÚN escenario/golden cae >2 pts de overall entre modos.
  ÉXITO §10  : parvularia × campaña REAL (R4 réplica, primario) overall >= 74.
  ÉXITO §4.3 : parvularia × campaña REAL mejora >= +2 pts (estimación original
               del SDD; se reporta junto al análisis técnico del delta medido).

Escenarios (todos con ruta REAL ScoringService.evaluate_candidate + matriz
determinista intacta; solo LLM/embeddings mockeados, igual que los evals):
  1. parvularia_golden_job      : golden datos_cv × job_reference del golden.
  2. parvularia_campana_real_R4 : golden datos_cv × CAMPAÑA REAL (réplica CAL,
                                  escenario primario de diag_campana_real.py).
  3. qa_lead_golden_job         : golden datos_cv QA × job_reference del golden.

Uso: python dev\\harness_rubric_tier.py   (desde currify-core/)
Exit code: 0 = criterio BLOQUEANTE y ÉXITO §10 cumplidos; 1 = alguno falló.
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

from app.core.config import settings  # noqa: E402
from app.models.dynamic_rubric import StructuredRubric  # noqa: E402
from app.services.llm_service import LLMService  # noqa: E402
from app.services.scoring_service import ScoringService  # noqa: E402
from app.services import rubric_tier_classifier as rtc  # noqa: E402

FIXTURE_DIR = _ROOT / "evals" / "cvs_fixture"
PARVULARIA_GOLDEN = FIXTURE_DIR / "cv_parvularia_15y_golden.json"
QA_GOLDEN = FIXTURE_DIR / "cv_qa_lead_15y.json"

WEIGHTS = {"skills_match": 30, "experience": 25, "education": 15,
           "cultural_fit": 15, "logistics": 10, "career_trajectory": 5}

# ─────────────────────────────────────────────────────────────────────────────
# Campaña REAL (verbatim de diag_campana_real.py — réplica CAL, escenario R4)
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

JOB_TITLE_REAL = "Educadora de Párvulos"

# Rúbrica mock determinista de la campaña real (idéntica a diag_campana_real.MOCK_RUBRIC;
# incluye el FALSO mandatory que P3 debe degradar).
CAMPAIGN_RUBRIC = {
    "education": {
        "required_degrees": ["Educadora de Párvulos"],
        "academic_level": "Universitario",
        "kill_clause": True,
    },
    "experience": {"min_years": 0, "key_roles": ["Educadora de Párvulos"]},
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
CAMPAIGN_JOB_BLANDAS = ["comunicación efectiva", "liderazgo", "trabajo en equipo",
                        "proactividad", "creatividad", "inclusión"]

JUDGE_EV_COMUNICACION = "Reuniones periódicas con apoderados y comunidad educativa"
JUDGE_BASE = {"comunicación oral y escrita": (0.5, JUDGE_EV_COMUNICACION)}
BASE_LATENT = ["proyectos pedagogicos", "educacion inicial", "estimulacion temprana"]

# ─────────────────────────────────────────────────────────────────────────────
# Régimen CAL (proxy determinista de embeddings, idéntico a diag_campana_real)
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
    if ca[0] == cb[0]:
        return max(jac, 0.75)
    return jac


def _make_llm():
    try:
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


# ─────────────────────────────────────────────────────────────────────────────
# Escenario A/B genérico: corre evaluate_candidate con flag OFF y flag ON
# ─────────────────────────────────────────────────────────────────────────────
async def _run_once(name, candidate, job_payload, *, wiring):
    """Una pasada de scoring con mocks deterministas. wiring() instala los mocks."""
    svc, extras = wiring()
    resp = await svc.evaluate_candidate(candidate, job_payload)
    breakdown = {k: {"score": round(v.score, 2), "weight": v.weight,
                     "weighted": round(v.weighted_score, 2)}
                 for k, v in resp.breakdown.items()}
    return {
        "name": name,
        "overall": resp.overall_score,
        "recommendation": resp.recommendation,
        "breakdown": breakdown,
        "judge_calls": extras.get("judge_calls", 0),
        "reclass_events": rtc.get_recent_reclass_events(),
    }


async def run_scenario(name, candidate, job_payload, *, wiring):
    """Corre el MISMO escenario con flag OFF y flag ON; devuelve comparativo."""
    orig_flag = getattr(settings, "rubric_tier_reclass", False)
    try:
        settings.rubric_tier_reclass = False
        rtc.clear_reclass_events()
        off = await _run_once(f"{name} [flag=OFF]", candidate, job_payload, wiring=wiring)

        settings.rubric_tier_reclass = True
        rtc.clear_reclass_events()
        on = await _run_once(f"{name} [flag=ON]", candidate, job_payload, wiring=wiring)
    finally:
        settings.rubric_tier_reclass = orig_flag
        rtc.clear_reclass_events()

    delta = round(on["overall"] - off["overall"], 2)
    return {
        "scenario": name,
        "flag_off": off,
        "flag_on": on,
        "delta_overall": delta,
        "cae_mas_de_2pts": delta < -2.0,
        "requisitos_reclasificados": sorted({
            ev["requisito_original"] for ev in on["reclass_events"]
        }),
    }


# ─────────────────────────────────────────────────────────────────────────────
# Wiring 1: parvularia golden job (mocks idénticos a evals/test_cv_parvularia_15y.py)
# ─────────────────────────────────────────────────────────────────────────────
GOLDEN_PARV_RUBRIC = {
    "education": {"required_degrees": ["Educadora de Párvulos"], "academic_level": "Universitario", "kill_clause": False},
    "experience": {"min_years": 5, "key_roles": ["Educadora de Párvulos Nivel Medio"]},
    "skills": {
        "mandatory_skills": [
            "planificación educativa",
            "evaluación del desarrollo infantil",
            "primeros auxiliares",
            "comunicación con apoderados",
            "gestión de curso",
        ],
        "nice_to_have_skills": ["inglés básico"],
    },
    "logistics": {"location": None, "modality": "Presencial"},
    "languages": {"required_languages": []},
    "certifications": {"mandatory_certs": []},
}


def wiring_parvularia_golden():
    llm = _make_llm()
    judge_calls = {"n": 0}

    async def fake(prompt, input_data, stage_name, **kw):
        if "SKILL_JUDGE" in stage_name:
            judge_calls["n"] += 1
            p = str(prompt).lower()
            if "comunicacion con apoderados" in p or "comunicación con apoderados" in p:
                return {"score": 1.0, "evidence": "Reuniones periódicas con apoderados y comunidad educativa"}
            return {"score": 0.0, "evidence": None}
        if "LATENT_SKILL_EXTRACTION" in stage_name:
            return ["proyectos pedagogicos", "educacion inicial", "estimulacion temprana"]
        if "ROLE_NORMALIZATION" in stage_name:
            titles = input_data if isinstance(input_data, list) else []
            return [str(t).lower() for t in titles]
        if "SCORING_EVALUATION" in stage_name:
            return {
                "breakdown": {
                    "skills_match": {"reasoning": "Competencias pedagógicas equivalentes"},
                    "experience": {"reasoning": "15 años de trayectoria educativa progresiva"},
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
        return None

    async def fake_structured(prompt, input_data, response_model=None, stage_name="", **kw):
        return StructuredRubric.model_validate(GOLDEN_PARV_RUBRIC)

    llm.call_agent = fake  # type: ignore
    llm.call_agent_structured = fake_structured  # type: ignore

    svc = ScoringService(llm_service=llm)

    async def fake_expand(skills):
        return set(str(s).lower() for s in skills)

    async def fake_norm_deg(deg):
        return [d.lower() for d in deg]

    async def fake_embedding(t):
        return [0.0] * 4

    svc.semantic_service.expand_skills = fake_expand  # type: ignore
    svc.semantic_service.normalize_degrees = fake_norm_deg  # type: ignore
    svc.semantic_service.get_text_embedding = fake_embedding  # type: ignore
    return svc, {"judge_calls": judge_calls["n"]}


# ─────────────────────────────────────────────────────────────────────────────
# Wiring 2: parvularia × campaña REAL (mocks idénticos a diag_campana_real R4)
# ─────────────────────────────────────────────────────────────────────────────
def wiring_parvularia_campana_real():
    llm = _make_llm()
    judge_calls = {"n": 0}

    async def fake_structured(prompt, input_data, response_model=None, stage_name="", **kw):
        return StructuredRubric.model_validate(CAMPAIGN_RUBRIC)

    async def fake(prompt, input_data, stage_name, **kw):
        p = str(prompt).lower()
        if "SKILL_JUDGE" in stage_name:
            judge_calls["n"] += 1
            for key, (score, evidence) in JUDGE_BASE.items():
                if key in p:
                    return {"score": score, "evidence": evidence}
            return {"score": 0.0, "evidence": None}
        if "LATENT_SKILL_EXTRACTION" in stage_name:
            return list(BASE_LATENT)
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

    llm.call_agent = fake  # type: ignore
    llm.call_agent_structured = fake_structured  # type: ignore

    svc = ScoringService(llm_service=llm)

    async def wrapped_sim(a, b):
        return sim_cal(a, b)

    async def fake_expand(skills):
        return set(str(s).lower() for s in skills)

    async def fake_norm_deg(deg):
        return [d.lower() for d in deg]

    async def fake_embedding(t):
        return [0.0] * 4

    svc.semantic_service.calculate_similarity = wrapped_sim  # type: ignore
    svc.semantic_service.expand_skills = fake_expand  # type: ignore
    svc.semantic_service.normalize_degrees = fake_norm_deg  # type: ignore
    svc.semantic_service.get_text_embedding = fake_embedding  # type: ignore
    return svc, {"judge_calls": judge_calls["n"]}


# ─────────────────────────────────────────────────────────────────────────────
# Wiring 3: QA Lead golden job (mocks idénticos a evals/test_cv_qa_lead_15y.py)
# ─────────────────────────────────────────────────────────────────────────────
QA_RUBRIC = {
    "education": {"required_degrees": ["Ingeniería en Informática"], "academic_level": "Universitario", "kill_clause": False},
    "experience": {"min_years": 10, "key_roles": ["QA Lead Automation Engineer", "QA Lead"]},
    "skills": {
        "mandatory_skills": ["selenium", "java", "gherkin", "cucumber", "bdd", "jira", "jenkins", "git", "sql", "api testing"],
        "nice_to_have_skills": ["playwright", "cypress", "docker"],
    },
    "logistics": {"location": "Santiago", "modality": "Híbrido"},
    "languages": {"required_languages": ["Inglés"]},
    "certifications": {"mandatory_certs": []},
}


def wiring_qa_golden():
    llm = _make_llm()

    async def fake(prompt, input_data, stage_name, **kw):
        if "SCORING_EVALUATION" in stage_name:
            return {
                "breakdown": {
                    "skills_match": {"reasoning": "37 skills cubren BDD/Selenium/Java"},
                    "experience": {"reasoning": "15 años progresivos, lideró 12"},
                    "education": {"reasoning": "Ingeniería + Magíster + ISTQB Advanced"},
                    "cultural_fit": {"reasoning": "Mentoring y liderazgo evidenciado"},
                    "logistics": {"reasoning": "Santiago compatible"},
                    "career_trajectory": {"reasoning": "Progresión QA Analyst -> Senior -> Lead"},
                },
                "strengths": ["Lideró equipos de 12"], "gaps": [],
                "summary": "QA Lead senior.",
            }
        if "LATENT_SKILL_EXTRACTION" in stage_name:
            return []
        if "ROLE_NORMALIZATION" in stage_name:
            titles = input_data if isinstance(input_data, list) else []
            return [str(t).lower() for t in titles]
        if "TRANSFERABILITY_CHECK" in stage_name:
            return "FALSE"
        return None

    async def fake_structured(prompt, input_data, response_model=None, stage_name="", **kw):
        return StructuredRubric.model_validate(QA_RUBRIC)

    llm.call_agent = fake  # type: ignore
    llm.call_agent_structured = fake_structured  # type: ignore

    svc = ScoringService(llm_service=llm)

    async def fake_expand(skills):
        return set(str(s).lower() for s in skills)

    async def fake_norm_roles(roles):
        return [r.lower() for r in roles]

    async def fake_norm_deg(deg):
        return [d.lower() for d in deg]

    async def fake_extract_latent(text):
        return set()

    async def fake_embedding(t):
        return [0.0] * 4

    async def fake_similarity(a, b):
        return 0.92 if a.lower() in b.lower() or b.lower() in a.lower() else 0.88

    svc.semantic_service.expand_skills = fake_expand  # type: ignore
    svc.semantic_service.normalize_job_titles = fake_norm_roles  # type: ignore
    svc.semantic_service.normalize_degrees = fake_norm_deg  # type: ignore
    svc.semantic_service.extract_skills_from_description = fake_extract_latent  # type: ignore
    svc.semantic_service.get_text_embedding = fake_embedding  # type: ignore
    svc.semantic_service.calculate_similarity = fake_similarity  # type: ignore
    return svc, {"judge_calls": 0}


# ─────────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────────
async def main():
    parv = json.loads(PARVULARIA_GOLDEN.read_text(encoding="utf-8"))
    qa = json.loads(QA_GOLDEN.read_text(encoding="utf-8"))

    cand_parv = parv["golden"]["datos_cv"]
    job_parv_golden = parv["scoring_expected"]["job_reference"]
    payload_parv_golden = {
        "title": job_parv_golden["title"],
        "description": job_parv_golden["description"],
        "parsedJobData": {"habilidades_blandas": []},
    }
    payload_parv_real = {
        "title": JOB_TITLE_REAL,
        "description": CAMPAIGN_TEXT,
        "parsedJobData": {"habilidades_blandas": list(CAMPAIGN_JOB_BLANDAS)},
    }

    cand_qa = qa["golden"]["datos_cv"]
    job_qa = qa["scoring_expected"]["job_reference"]
    payload_qa = {
        "title": job_qa["title"],
        "description": job_qa["description"],
        "parsedJobData": {"habilidades_blandas": []},
    }

    results = []
    results.append(await run_scenario(
        "parvularia_golden_job", cand_parv, payload_parv_golden,
        wiring=wiring_parvularia_golden))
    results.append(await run_scenario(
        "parvularia_campana_real_R4 [PRIMARIO]", cand_parv, payload_parv_real,
        wiring=wiring_parvularia_campana_real))
    results.append(await run_scenario(
        "qa_lead_golden_job", cand_qa, payload_qa,
        wiring=wiring_qa_golden))

    r4 = next(r for r in results if "campana_real" in r["scenario"])

    print("\n" + "=" * 78)
    print("HARNESS GUARDARRAIL Fase B — comparativa flag OFF vs flag ON")
    print("=" * 78)
    for r in results:
        print(f"\n--- {r['scenario']} ---")
        print(f"  overall OFF={r['flag_off']['overall']}  ON={r['flag_on']['overall']}  Δ={r['delta_overall']:+}")
        print(f"  recommendation OFF={r['flag_off']['recommendation']} ON={r['flag_on']['recommendation']}")
        sm_off = r['flag_off']['breakdown'].get('skills_match', {}).get('score')
        sm_on = r['flag_on']['breakdown'].get('skills_match', {}).get('score')
        print(f"  skills_match OFF={sm_off} ON={sm_on}")
        print(f"  requisitos_reclasificados: {r['requisitos_reclasificados'] or '—'}")

    print("\n" + "-" * 78)
    print("CRITERIOS:")
    fallen = [r for r in results if r["cae_mas_de_2pts"]]
    ok_block = not fallen
    print(f"  [BLOQUEANTE] ningún golden cae >2 pts : {'✓ CUMPLE' if ok_block else '✗ FALLA ' + str([f['scenario'] for f in fallen])}")
    ok_s10 = r4["flag_on"]["overall"] >= 74
    print(f"  [ÉXITO §10 ] R4 campaña real >= 74     : {'✓ CUMPLE' if ok_s10 else '✗ FALLA'} "
          f"(ON={r4['flag_on']['overall']})")
    ok_est = r4["delta_overall"] >= 2
    print(f"  [ÉXITO §4.3] R4 mejora >= +2 (estim.)  : {'✓ CUMPLE' if ok_est else '✗ NO ALCANZADO'} "
          f"(Δ={r4['delta_overall']:+})")

    artifact = {
        "meta": {
            "fecha": "2026-08-26",
            "sdd": "docs/SDD Calidad de Scoring Fase 2 - Currify Core.md §4.3/§8-B.4/§10",
            "modo": "LLM mockeado determinista (cero tokens); ruta REAL generate_rubric + matriz",
            "flag_env": "RUBRIC_TIER_RECLASS",
            "baseline_fase_a": {"R4": 73.17, "S4": 86.1},
        },
        "escenarios": results,
        "criterios": {
            "bloqueante_ningun_golden_cae_mas_de_2pts": ok_block,
            "exito_s10_r4_ge_74": ok_s10,
            "exito_s43_estimacion_delta_ge_2": ok_est,
        },
    }
    out = _CORE / "dev" / "harness_tier_reclass_results.json"
    out.write_text(json.dumps(artifact, ensure_ascii=False, indent=2, default=str), encoding="utf-8")
    print(f"\nArtefacto comparativo: {out}")

    sys.exit(0 if (ok_block and ok_s10) else 1)


if __name__ == "__main__":
    asyncio.run(main())
