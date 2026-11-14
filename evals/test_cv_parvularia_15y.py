"""Eval específico cv_parvularia_15y — CLASE de CVs no-tech chilenos (educación inicial).

Fixture SINTÉTICO/ANONIMIZADO que representa la clase de fallos observada en producción:
  1. BUG fechas: layout pipe/en-dash `Fundación San Carlos de Maipo | 2018 – 2023`
     → el LLM devuelve periodo con fecha_inicio="N/A".
  2. BUG re-enrute: bloques laborales completos colados bajo "Otros Antecedentes"
     → terminan en otros_antecedentes y experiencia_laboral queda incompleta.
  3. BUG skills=0: competencias pedagógicas no matchean literal contra rúbrica
     → sin crédito parcial la dimensión skills_match colapsa.
  4. BUG roles: "Educadora de Párvulos" vs "Educadora de Párvulos Nivel Medio"
     → normalización tech-céntrica no los alinea.

Asserts contractuales: skills>=60, experience>=60, fechas 2018–2023 parseadas.
"""
import json
import sys
from pathlib import Path

import pytest

_HERE = Path(__file__).resolve()
_ROOT = _HERE.parents[1]
_CORE = _ROOT / "currify-core"
for _p in (str(_ROOT), str(_CORE)):
    if _p not in sys.path:
        sys.path.insert(0, _p)

from app.models.resume import ResumeExtractionRequest  # noqa: E402
from app.services.llm_service import LLMService  # noqa: E402
from app.services.robust_extraction_service import RobustExtractionService  # noqa: E402
from app.services.scoring_service import ScoringService  # noqa: E402

FIXTURE_DIR = Path(__file__).parent / "cvs_fixture"
RAW_PATH = FIXTURE_DIR / "cv_parvularia_15y.txt"
GOLDEN_PATH = FIXTURE_DIR / "cv_parvularia_15y_golden.json"


def _load_fixture():
    raw = RAW_PATH.read_text(encoding="utf-8")
    data = json.loads(GOLDEN_PATH.read_text(encoding="utf-8"))
    return raw, data["golden"], data["scoring_expected"]


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


# ─────────────────────────────────────────────────────────────────────────────
# Salida REALISTA del LLM de extracción para esta clase de CV (con los defectos
# de producción). NO es el golden: es lo que Gemini Flash devolvió realmente.
# ─────────────────────────────────────────────────────────────────────────────
BROKEN_EXPERIENCE_OUTPUT = {
    "experiencias": [
        {
            "cargo": "Educadora de Párvulos",
            "empresa": "Fundación San Carlos de Maipo",
            # Layout pipe/en-dash confundió al LLM: pierde el año de inicio.
            "periodo": {"fecha_inicio": "N/A", "fecha_fin": "2023", "texto_original": "N/A - 2023"},
            "responsabilidades": [
                "Elaboración de proyectos pedagógicos para primer y segundo ciclo",
                "Evaluación del desarrollo infantil mediante observación sistemática",
                "Reuniones periódicas con apoderados y comunidad educativa",
            ],
        }
    ]
}

COLADED_OTHER_OUTPUT = {
    "section_name": "OTROS ANTECEDENTES",
    "items": [
        # Bloques laborales colados con sus viñetas (deben re-enrutarse a experiencia_laboral)
        "Corporación Educacional B | 2010 - 2017 Educadora de Párvulos Nivel Medio",
        "• Gestión de curso de 25 párvulos con planificación educativa por ámbitos",
        "• Aplicación de primeros auxiliares pediátricos y protocolos de emergencia",
        "Junta de Vecinos Los Aromos | 2009 - 2010 Educadora en programa comunitario",
        "• Talleres de estimulación temprana para la comunidad",
        # Item genuino de otros antecedentes (debe QUEDARSE en otros_antecedentes)
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


@pytest.mark.asyncio
async def test_cv_parvularia_15y_extraction_and_scoring():
    raw, golden, scoring_expected = _load_fixture()
    llm = _make_llm()

    judge_calls = {"count": 0}

    # Fake por sección: reproduce la salida realista ROTA del LLM de producción
    async def fake(prompt, input_data, stage_name, **kw):
        if "section_experience" in stage_name:
            return BROKEN_EXPERIENCE_OUTPUT
        if "section_other" in stage_name:
            return COLADED_OTHER_OUTPUT
        if "section_skills" in stage_name:
            return PEDAGOGICAL_SKILLS_OUTPUT
        if "section_titles" in stage_name:
            return {
                "titulo_profesional": golden["datos_cv"]["titular_profesional"]["titular"],
                "formacion": [
                    {"titulo": e["titulo"], "institucion": e["institucion"], "periodo": e.get("periodo", {})}
                    for e in golden["datos_cv"]["formacion_academica"]
                ],
            }
        if "section_education" in stage_name:
            return {
                "formacion": [
                    {"titulo": e["titulo"], "institucion": e["institucion"], "periodo": e.get("periodo", {})}
                    for e in golden["datos_cv"]["formacion_academica"]
                ]
            }
        if "section_summary" in stage_name:
            return {"resumen": "Educadora de Párvulos con 15 años de trayectoria en educación inicial."}
        if "date_repair" in stage_name:
            # Retry acotado Bug 1c: nunca debería dispararse si la capa determinista (b) funciona
            return {"fecha_inicio": "2018", "fecha_fin": "2023"}
        if "SKILL_JUDGE" in stage_name:
            judge_calls["count"] += 1
            # Judge simulado: la skill va embebida en el PROMPT; evidencia LITERAL del contexto
            prompt_lower = str(prompt).lower()
            if "comunicacion con apoderados" in prompt_lower or "comunicación con apoderados" in prompt_lower:
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
                    "skills_match": {"reasoning": "Competencias pedagógicas equivalentes a las requeridas"},
                    "experience": {"reasoning": "15 años de trayectoria educativa progresiva"},
                    "education": {"reasoning": "Título de Educadora de Párvulos"},
                    "cultural_fit": {"reasoning": "Trabajo con familias y comunidad"},
                    "logistics": {"reasoning": "Santiago compatible"},
                    "career_trajectory": {"reasoning": "Progresión entre instituciones"},
                },
                "strengths": ["15 años de trayectoria", "Proyectos pedagógicos"],
                "gaps": [],
                "summary": "Educadora de Párvulos sólida, fit adecuado.",
            }
        if "section_" in stage_name:
            return {"items": []}
        return None

    llm.call_agent = fake  # type: ignore

    svc = RobustExtractionService(llm_service=llm)
    req = ResumeExtractionRequest(
        archivo_contenido=raw,
        tipo_archivo="txt",
        nombre_archivo="cv_parvularia_15y_anon.txt",
    )
    resp = await svc.extract_from_text(req, request_id="eval-parvularia-15y")

    datos = resp.datos_cv

    # ── ASSERT 1: Fechas 2018–2023 parseadas (Bug 1) ──
    maipo = [
        e for e in datos.experiencia_laboral
        if e.empresa and "san carlos de maipo" in e.empresa.lower()
    ]
    assert maipo, f"No hay entrada de Fundación San Carlos de Maipo: {[e.empresa for e in datos.experiencia_laboral]}"
    periodo = maipo[0].periodo
    assert periodo.fecha_inicio and str(periodo.fecha_inicio).startswith("2018"), (
        f"fecha_inicio N/A no reparada: {periodo.fecha_inicio} (texto_original={periodo.texto_original})"
    )
    assert periodo.fecha_fin and str(periodo.fecha_fin).startswith("2023"), (
        f"fecha_fin incorrecta: {periodo.fecha_fin}"
    )

    # ── ASSERT 2: Bloques colados re-enrutados (Bug 2) ──
    assert len(datos.experiencia_laboral) >= 3, (
        f"Bloques bajo Otros Antecedentes no re-enrutados: solo {len(datos.experiencia_laboral)} experiencias"
    )
    empresas = [str(e.empresa or "").lower() for e in datos.experiencia_laboral]
    assert any("corporación educacional b" in x for x in empresas), f"Falta Corporación Educacional B: {empresas}"
    # El item genuino permanece en otros_antecedentes
    assert any("disponibilidad" in str(x).lower() for x in (datos.otros_antecedentes or [])), (
        f"Item genuino 'Disponibilidad...' fue removido de otros_antecedentes: {datos.otros_antecedentes}"
    )

    # ── Scoring con matriz determinista REAL (mocks solo de embeddings/rúbrica) ──
    scoring_llm = _make_llm()
    scoring_llm.call_agent = fake  # type: ignore
    scoring_svc = ScoringService(llm_service=scoring_llm)

    async def fake_expand(skills):
        return set(str(s).lower() for s in skills)

    async def fake_norm_deg(deg):
        return [d.lower() for d in deg]

    async def fake_rubric(title, desc, parsed_data=None):
        from app.models.dynamic_rubric import StructuredRubric
        return StructuredRubric.parse_obj(
            {
                "education": {
                    "required_degrees": ["Educadora de Párvulos"],
                    "academic_level": "Universitario",
                    "kill_clause": False,
                },
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
        )

    async def fake_embedding(t):
        return [0.0] * 4

    scoring_svc.semantic_service.expand_skills = fake_expand  # type: ignore
    scoring_svc.semantic_service.normalize_degrees = fake_norm_deg  # type: ignore
    scoring_svc.semantic_service.get_text_embedding = fake_embedding  # type: ignore
    scoring_svc.dynamic_rubric_service.generate_rubric = fake_rubric  # type: ignore
    # NOTA: normalize_job_titles NO se mockea — se prueba el path exact-match (Bug 4).
    #       calculate_similarity NO se mockea — bandas de similitud reales con embeddings fake.

    candidate_dict = datos.model_dump()
    job_dict = scoring_expected["job_reference"]
    job_payload = {
        "title": job_dict["title"],
        "description": job_dict["description"],
        "parsedJobData": {"habilidades_blandas": []},
    }
    scoring_resp = await scoring_svc.evaluate_candidate(candidate_dict, job_payload)
    assert scoring_resp is not None

    # ── ASSERT 3: skills >= 60 (Bug 3: crédito parcial + judge acotado) ──
    skills_score = scoring_resp.breakdown["skills_match"].score
    assert skills_score >= scoring_expected["breakdown_expectations"]["skills_match"]["min"], (
        f"skills_match={skills_score} < 60 (terminología pedagógica sin crédito parcial)"
    )
    # Presupuesto del judge: máximo 6 llamadas por evaluación
    assert judge_calls["count"] <= 6, f"Judge excedió presupuesto: {judge_calls['count']} > 6"

    # ── ASSERT 4: experience >= 60 (Bug 2 + Bug 4) ──
    exp_score = scoring_resp.breakdown["experience"].score
    assert exp_score >= scoring_expected["breakdown_expectations"]["experience"]["min"], (
        f"experience={exp_score} < 60 (bloques no re-enrutados o roles no normalizados)"
    )

    # ── Sanity overall determinista ──
    assert scoring_resp.overall_score >= scoring_expected["overall_score"]["min"]
    assert scoring_resp.recommendation in scoring_expected["recommendation_any_of"]
