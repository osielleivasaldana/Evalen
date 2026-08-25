import pytest
import asyncio
from app.models.resume import Skills
from app.services.section_extractor import SectionExtractor
from app.services.robust_extraction_service import RobustExtractionService
from app.services.llm_service import LLMService
from app.models.resume import SectionDetection, SectionType


def test_skills_validator_dict_to_str():
    s = Skills(habilidades_blandas=[{"skill": "Liderazgo", "level": "Avanzado"}, "Trabajo en equipo", {"skill": "Comunicación"}])
    assert s.habilidades_blandas == ["Liderazgo", "Trabajo en equipo", "Comunicación"]


def test_skills_validator_accepts_empty():
    s = Skills(habilidades_blandas=[])
    assert s.habilidades_blandas == []
    s2 = Skills(habilidades_blandas=None)
    assert s2.habilidades_blandas == []


@pytest.mark.asyncio
async def test_merge_skills_dict_sanitized():
    async def fake(prompt, input_data, stage_name, **kw):
        return {"habilidades_tecnicas": [{"skill": "Selenium", "level": "Avanzado"}], "idiomas": [], "habilidades_blandas": [{"skill": "Liderazgo", "level": "Avanzado"}]}

    # Create LLM service without requiring real API key (mocked)
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
    llm.call_agent = fake  # type: ignore
    svc = RobustExtractionService(llm_service=llm)
    # Simulate merge directly
    from app.services.section_extractor import SectionResult

    sr = SectionResult(section_type="skills", success=True, data={"habilidades_tecnicas": [{"skill": "Selenium", "level": "Avanzado"}], "habilidades_blandas": [{"skill": "Liderazgo", "level": "Avanzado"}]}, method="llm")
    merged = svc._merge_section_results({"skills": sr}, "Candidato QA\nqa@test.cl", "test-001")
    # Should be sanitized to list[str] before Pydantic
    assert all(isinstance(x, str) for x in merged["habilidades"]["habilidades_blandas"])
    assert merged["habilidades"]["habilidades_blandas"] == ["Liderazgo"]
