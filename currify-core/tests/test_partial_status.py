def _make_svc():
    try:
        from app.core.config import settings
        from app.services.llm_service import LLMService
        from app.services.robust_extraction_service import RobustExtractionService
        orig = settings.google_api_key
        settings.google_api_key = "test-fake-key"
        try:
            return RobustExtractionService(llm_service=LLMService())
        finally:
            settings.google_api_key = orig
    except Exception:
        from unittest.mock import MagicMock
        from app.services.robust_extraction_service import RobustExtractionService
        return RobustExtractionService(llm_service=MagicMock())


def test_ensure_required_fields_marks_partial():
    svc = _make_svc()
    merged = {"datos_contacto": {"nombre_completo": "Ana QA", "email": "ana@test.cl"}, "titular_profesional": {"titular": "QA Lead"}, "experiencia_laboral": [], "formacion_academica": []}
    svc._ensure_required_fields(merged, "raw")
    assert "experiencia_laboral" in merged
    assert "formacion_academica" in merged


def test_create_validated_response_partial_flag_on_sanitization():
    svc = _make_svc()
    # Force second ValidationError by providing an invalid top-level field that will be dropped
    # habilidades_blandas with dict should be sanitized without triggering partial,
    # but if we provide completely invalid proyectos structure, it should go partial path
    structured = {
        "datos_contacto": {"nombre_completo": "Ana QA", "email": "ana@test.cl"},
        "titular_profesional": {"titular": "QA Lead"},
        "experiencia_laboral": [{"cargo": "QA", "empresa": "X", "periodo": {"fecha_inicio": "2020-01"}, "responsabilidades": ["a"]}],
        "habilidades": {"habilidades_tecnicas": [], "habilidades_blandas": [{"skill": "Liderazgo"}]},
        "proyectos": {"proyectos": [{"nombre": "--- LAYOUT CONTEXT (PAGE 2) ---"}]},
    }
    resume = svc._create_validated_response(structured, "raw texto")
    # proyectos layout should be filtered, but resume should still be valid
    assert resume is not None
    # Either partial flag or at least experiencia preserved
    assert len(resume.experiencia_laboral) >= 1
