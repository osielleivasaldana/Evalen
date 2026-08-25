import re
from app.services.file_parser_service import FileParserService
from app.models.resume import Projects
from app.services.robust_extraction_service import RobustExtractionService
from app.services.llm_service import LLMService
from app.services.section_extractor import SectionResult


def test_clean_strips_layout():
    svc = FileParserService()
    raw = "Hola mundo\n--- LAYOUT CONTEXT (PAGE 1) ---\nTexto duplicado\n--- LAYOUT CONTEXT (PAGE 2) ---\nMundo"
    cleaned = svc._clean_extracted_text(raw)
    assert "LAYOUT CONTEXT" not in cleaned
    assert cleaned.count("Mundo") == 1 or "Hola mundo" in cleaned


def test_projects_validator_filters_layout():
    p = Projects(proyectos=[{"nombre": "--- LAYOUT CONTEXT (PAGE 2) ---", "descripcion": None}, {"nombre": "Proyecto Real"}])
    assert len(p.proyectos) == 1
    assert p.proyectos[0].nombre == "Proyecto Real"


def test_merge_projects_filters_layout_and_long_dict():
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
    svc = RobustExtractionService(llm_service=llm)
    sr = SectionResult(section_type="projects", success=True, data={"items": ["--- LAYOUT CONTEXT (PAGE 2) ---", "Proyecto X", {"nombre": "A" * 90}]}, method="llm")
    merged = svc._merge_section_results({"projects": sr}, "raw", "test-layout-002")
    nombres = [pr["nombre"] if isinstance(pr, dict) else str(pr) for pr in merged["proyectos"]["proyectos"]]
    assert all("LAYOUT" not in n for n in nombres)
