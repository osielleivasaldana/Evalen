"""Eval E2E golden anon — Task 9 (contract D). Mocked LLM por stage_name skills/titles/experience/education/summary."""
import json
import sys
from pathlib import Path

import pytest

# Ensure imports resolve whether pytest is run from repo root or currify-core
_HERE = Path(__file__).resolve()
_ROOT = _HERE.parents[1]  # C:\...\Currify
_CORE = _ROOT / "currify-core"
for _p in (str(_ROOT), str(_CORE)):
    if _p not in sys.path:
        sys.path.insert(0, _p)

from app.models.resume import ResumeExtractionRequest  # noqa: E402
from app.services.llm_service import LLMService  # noqa: E402
from app.services.robust_extraction_service import RobustExtractionService  # noqa: E402
from evals.assertions import assert_extraction_golden  # noqa: E402

GOLDEN_PATH = Path(__file__).parent / "cvs_fixture" / "qa_lead_15y_anon_golden.json"
RAW_PATH = Path(__file__).parent / "cvs_fixture" / "qa_lead_15y_anon.txt"


def _load_golden():
    return json.loads(GOLDEN_PATH.read_text(encoding="utf-8"))


def _load_raw():
    if RAW_PATH.exists():
        return RAW_PATH.read_text(encoding="utf-8")
    return (
        "Candidato QA 15y\n"
        "QA Test Lead Automation Engineer\n"
        "qa.anon@example.com\n"
        "+56 9 12345678\n"
        "Santiago, Chile\n"
        "EXPERIENCIA LABORAL\n"
        "QA Lead Empresa A Ene 2024 - Presente\n"
        "HABILIDADES\n"
        "Selenium, Java\n"
    )


def _make_llm():
    """Create LLMService with fake key so it doesn't require env vars."""
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
        # ensure async call_agent can be assigned
    return llm


@pytest.mark.asyncio
async def test_e2e_golden_anon():
    golden = _load_golden()
    raw = _load_raw()

    llm = _make_llm()

    async def fake(prompt, input_data, stage_name, **kw):
        # Skills — list[str] for blandas (bug 1)
        if "section_skills" in stage_name:
            return {
                "habilidades_tecnicas": [
                    {"skill": "Selenium", "level": "Avanzado"},
                    {"skill": "Java", "level": "Avanzado"},
                    {"skill": "JIRA", "level": "Intermedio"},
                ],
                "idiomas": [{"idioma": "Inglés", "nivel": "Intermedio"}],
                "habilidades_blandas": ["Liderazgo", "Trabajo en equipo", "Comunicación"],
            }
        if "section_titles" in stage_name:
            return {
                "titulo_profesional": "QA Test Lead Automation Engineer",
                "formacion": [
                    {
                        "titulo": "Ingeniería en Informática",
                        "institucion": "Universidad Tecnológica",
                        "periodo": {"fecha_inicio": "2010", "fecha_fin": "2015"},
                    },
                    {
                        "titulo": "Magíster en Dirección de Empresas",
                        "institucion": "Universidad X",
                        "periodo": {"fecha_inicio": "2018", "fecha_fin": "2020"},
                    },
                ],
            }
        if "section_experience" in stage_name:
            return {
                "experiencias": [
                    {
                        "cargo": "QA Test Lead Automation Engineer",
                        "empresa": "Empresa A",
                        "periodo": {"fecha_inicio": "2024-01", "fecha_fin": "Presente", "texto_original": "Ene 2024 - Presente"},
                        "responsabilidades": ["Automatización Selenium"],
                        "ubicacion": "Santiago",
                    },
                    {
                        "cargo": "QA Test Lead",
                        "empresa": "Empresa B",
                        "periodo": {"fecha_inicio": "2021-03", "fecha_fin": "2023-11", "texto_original": "Mar 2021 - Nov 2023"},
                        "responsabilidades": ["Liderazgo QA"],
                        "ubicacion": "Santiago",
                    },
                ]
            }
        if "section_education" in stage_name:
            return {
                "formacion": [
                    {
                        "titulo": "Ingeniería en Informática",
                        "institucion": "Universidad Tecnológica",
                        "periodo": {"fecha_inicio": "2010", "fecha_fin": "2015"},
                    },
                    {
                        "titulo": "Magíster en Dirección de Empresas",
                        "institucion": "Universidad X",
                        "periodo": {"fecha_inicio": "2018", "fecha_fin": "2020"},
                    },
                ]
            }
        if "section_summary" in stage_name:
            return {"resumen": "15 años experiencia QA, liderazgo equipos, automatización Selenium Java, ISTQB."}
        # projects/other/certifications/languages fallback — must not contain LAYOUT
        if "projects" in stage_name or "other" in stage_name or "certifications" in stage_name:
            return {"items": []}
        if "languages" in stage_name:
            return {"idiomas": [{"idioma": "Inglés", "nivel": "Intermedio"}]}
        # catch-all section_* → heuristic fallback won't break; return None for default handling
        if "section_" in stage_name:
            return {"items": []}
        return None

    llm.call_agent = fake  # type: ignore

    svc = RobustExtractionService(llm_service=llm)
    req = ResumeExtractionRequest(archivo_contenido=raw, tipo_archivo="txt", nombre_archivo="qa_anon.txt")
    resp = await svc.extract_from_text(req, request_id="eval-001")

    # Contract D assertions
    assert_extraction_golden(resp.datos_cv, golden)
    # Confianza >0.6 (pipeline completo, no degraded)
    assert resp.confianza_general > 0.6, f"confianza {resp.confianza_general} <= 0.6"
    # Proyectos already checked inside assert_extraction_golden but double-check edge layout
    proyectos = resp.datos_cv.proyectos.proyectos if resp.datos_cv.proyectos else []
    assert all("LAYOUT" not in p.nombre for p in proyectos)
