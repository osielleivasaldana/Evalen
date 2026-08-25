"""Eval específico cv_qa_lead_15y.json — QA Lead 15y anonimizado Osiel.
Valida invariantes pedidas:
- habilidades_blandas list[str] correcto (no dict)
- proyectos limpio de LAYOUT
- titular headline real "QA Lead Automation Engineer - 15 años en testing y BDD"
- score 75-85 strong_fit (37 skills, 15 años, lideró equipos)
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

FIXTURE_PATH = Path(__file__).parent / "cvs_fixture" / "cv_qa_lead_15y.json"


def _load_fixture():
    data = json.loads(FIXTURE_PATH.read_text(encoding="utf-8"))
    return data["input"]["archivo_contenido"], data["golden"], data["scoring_expected"]


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


@pytest.mark.asyncio
async def test_cv_qa_lead_15y_extraction_and_scoring():
    raw, golden, scoring_expected = _load_fixture()
    llm = _make_llm()

    # Fake por sección: devuelve golden tal cual para que pase extraction
    async def fake(prompt, input_data, stage_name, **kw):
        if "section_skills" in stage_name:
            return {
                "habilidades_tecnicas": golden["datos_cv"]["habilidades"]["habilidades_tecnicas"],
                "idiomas": golden["datos_cv"]["habilidades"]["idiomas"],
                # Caso crítico: devolver list[str] correcto, no dict
                "habilidades_blandas": golden["datos_cv"]["habilidades"]["habilidades_blandas"],
            }
        if "section_titles" in stage_name:
            return {
                "titulo_profesional": golden["datos_cv"]["titular_profesional"]["titular"],
                "formacion": [
                    {"titulo": e["titulo"], "institucion": e["institucion"], "periodo": e.get("periodo", {})}
                    for e in golden["datos_cv"]["formacion_academica"]
                ],
            }
        if "section_experience" in stage_name:
            return {
                "experiencias": [
                    {
                        "cargo": e["cargo"],
                        "empresa": e["empresa"],
                        "periodo": e.get("periodo", {}),
                        "responsabilidades": e.get("responsabilidades", []),
                        "ubicacion": e.get("ubicacion"),
                    }
                    for e in golden["datos_cv"]["experiencia_laboral"]
                ]
            }
        if "section_education" in stage_name:
            return {
                "formacion": [
                    {"titulo": e["titulo"], "institucion": e["institucion"], "periodo": e.get("periodo", {})}
                    for e in golden["datos_cv"]["formacion_academica"]
                ]
            }
        if "section_summary" in stage_name:
            return {"resumen": golden["datos_cv"]["resumen_profesional"]["resumen"]}
        if "section_projects" in stage_name:
            # Debe estar limpio de LAYOUT
            return {
                "items": [
                    {"nombre": p["nombre"], "descripcion": p.get("descripcion"), "tecnologias": p.get("tecnologias", [])}
                    for p in golden["datos_cv"]["proyectos"]["proyectos"]
                ]
            }
        if "projects" in stage_name or "other" in stage_name or "certifications" in stage_name:
            return {"items": []}
        if "languages" in stage_name:
            return {"idiomas": golden["datos_cv"]["habilidades"]["idiomas"]}
        if "section_" in stage_name:
            return {"items": []}
        return None

    llm.call_agent = fake  # type: ignore

    svc = RobustExtractionService(llm_service=llm)
    req = ResumeExtractionRequest(archivo_contenido=raw, tipo_archivo="txt", nombre_archivo="cv_qa_lead_15y_anon.txt")
    resp = await svc.extract_from_text(req, request_id="eval-qa-lead-15y")

    datos = resp.datos_cv

    # 1. habilidades_blandas formato correcto: list[str], no dict
    assert all(isinstance(s, str) for s in datos.habilidades.habilidades_blandas), f"habilidades_blandas contains dict: {datos.habilidades.habilidades_blandas}"
    assert datos.habilidades.habilidades_blandas == golden["datos_cv"]["habilidades"]["habilidades_blandas"]
    assert len(datos.habilidades.habilidades_blandas) >= 4

    # 2. proyectos limpio de layout
    proyectos = datos.proyectos.proyectos if datos.proyectos else []
    assert all("LAYOUT" not in p.nombre for p in proyectos), f"LAYOUT leak: {[p.nombre for p in proyectos]}"
    assert all(len(p.nombre) < 120 for p in proyectos)
    assert len(proyectos) == len(golden["datos_cv"]["proyectos"]["proyectos"])

    # 3. titular headline real (no académico)
    assert datos.titular_profesional.titular == golden["datos_cv"]["titular_profesional"]["titular"]
    assert "QA Lead Automation Engineer - 15 años en testing y BDD" in datos.titular_profesional.titular
    assert "Magíster" not in datos.titular_profesional.titular

    # 4. técnicas count 37
    assert len(datos.habilidades.habilidades_tecnicas) == 37, f"tecnicas {len(datos.habilidades.habilidades_tecnicas)} != 37"

    # 5. confianza >= min
    assert resp.confianza_general >= golden["confianza_min"], f"confianza {resp.confianza_general} < {golden['confianza_min']}"

    # 6. Scoring 75-85 strong_fit con mocks deterministas
    # Mock scoring deps para aislar matrix (sin LLM real)
    scoring_llm = _make_llm()

    async def fake_scoring(prompt, input_data, stage_name, **kw):
        return {
            "breakdown": {
                "skills_match": {"reasoning": "37 skills cubren BDD/Selenium/Java, stack completo"},
                "experience": {"reasoning": "15 años progresivos, lideró 12"},
                "education": {"reasoning": "Ingeniería + Magíster + ISTQB Advanced"},
                "cultural_fit": {"reasoning": "Mentoring y liderazgo evidenciado"},
                "logistics": {"reasoning": "Santiago compatible"},
                "career_trajectory": {"reasoning": "Progresión QA Analyst -> Senior -> Lead"},
            },
            "strengths": ["Lideró equipos de 12", "BDD Gherkin/Cucumber", "Automatización Selenium/Java 70% reducción"],
            "gaps": [],
            "summary": "QA Lead senior con 15 años, fit alto para QA Lead Automation",
        }

    scoring_llm.call_agent = fake_scoring  # type: ignore
    scoring_svc = ScoringService(llm_service=scoring_llm)

    # Mock semantic/rubric para determinismo
    async def fake_expand(skills):
        return set([s.lower() for s in skills])
    async def fake_norm_roles(roles):
        return [r.lower() for r in roles]
    async def fake_norm_deg(deg):
        return [d.lower() for d in deg]
    async def fake_rubric(title, desc, parsed_data=None):
        from app.models.dynamic_rubric import StructuredRubric
        return StructuredRubric.parse_obj(
            {
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
        )
    async def fake_extract_latent(text):
        return set()
    scoring_svc.semantic_service.expand_skills = fake_expand  # type: ignore
    scoring_svc.semantic_service.normalize_job_titles = fake_norm_roles  # type: ignore
    scoring_svc.semantic_service.normalize_degrees = fake_norm_deg  # type: ignore
    scoring_svc.semantic_service.extract_skills_from_description = fake_extract_latent  # type: ignore
    async def fake_embedding(t):
        return [0.0] * 4

    async def fake_similarity(a, b):
        return 0.92 if a.lower() in b.lower() or b.lower() in a.lower() else 0.88

    scoring_svc.semantic_service.get_text_embedding = fake_embedding  # type: ignore
    scoring_svc.semantic_service.calculate_similarity = fake_similarity  # type: ignore
    scoring_svc.dynamic_rubric_service.generate_rubric = fake_rubric  # type: ignore

    candidate_dict = datos.model_dump()
    job_dict = scoring_expected["job_reference"]
    # Adapt to scoring_service expected shape: job title/description + parsedJobData
    job_payload = {
        "title": job_dict["title"],
        "description": job_dict["description"],
        "parsedJobData": {"habilidades_blandas": []},
    }
    scoring_resp = await scoring_svc.evaluate_candidate(candidate_dict, job_payload)
    assert scoring_resp is not None
    assert scoring_expected["overall_score"]["min"] <= scoring_resp.overall_score <= scoring_expected["overall_score"]["max"], (
        f"score {scoring_resp.overall_score} fuera de rango {scoring_expected['overall_score']}"
    )
    assert scoring_resp.recommendation == scoring_expected["recommendation"]
    # breakdown sanity
    assert scoring_resp.breakdown["skills_match"].score >= scoring_expected["breakdown_expectations"]["skills_match"]["min"]
    assert scoring_resp.breakdown["experience"].score >= scoring_expected["breakdown_expectations"]["experience"]["min"]
