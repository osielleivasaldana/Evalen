import pytest
from app.services.robust_extraction_service import RobustExtractionService
from app.services.llm_service import LLMService
from app.services.section_extractor import SectionResult


def _make_svc():
    try:
        from app.core.config import settings
        orig_key = settings.google_api_key
        settings.google_api_key = "test-fake-key"
        try:
            llm = LLMService()
        finally:
            settings.google_api_key = orig_key
    except Exception:
        from unittest.mock import MagicMock
        llm = MagicMock()
    return RobustExtractionService(llm_service=llm)


def test_titular_headline_preferred_over_master():
    svc = _make_svc()
    raw = "Candidato QA 15y\nQA Test Lead Automation Engineer\nqa@test.cl\nEXPERIENCIA\nQA Lead Empresa A"
    sr = SectionResult(section_type="titles", success=True, data={"titulo_profesional": "Magíster en Dirección de Empresas", "formacion": [{"titulo": "Magíster en Dirección", "institucion": "U X"}]}, method="llm")
    sr_exp = SectionResult(section_type="experience", success=True, data={"experiencias": [{"cargo": "QA Test Lead Automation Engineer", "empresa": "Empresa A", "periodo": {"fecha_inicio": "2024-01"}, "responsabilidades": ["a"]}]}, method="llm")
    merged = svc._merge_section_results({"titles": sr, "experience": sr_exp}, raw, "test-titular-001")
    assert merged["titular_profesional"]["titular"] == "QA Test Lead Automation Engineer"
    assert "Magíster" not in merged["titular_profesional"]["titular"]


def test_titular_fallback_for_junior_without_experience():
    svc = _make_svc()
    raw = "Ana Junior\nana@test.cl"
    sr = SectionResult(section_type="titles", success=True, data={"titulo_profesional": "Ingeniería en Informática", "formacion": [{"titulo": "Ingeniería en Informática", "institucion": "UChile"}]}, method="llm")
    merged = svc._merge_section_results({"titles": sr}, raw, "test-titular-002")
    # Junior without experience, education fallback is correct
    assert "Ingeniería" in merged["titular_profesional"]["titular"]
