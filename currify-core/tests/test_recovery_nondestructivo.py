from app.services.robust_extraction_service import RobustExtractionService
from app.services.llm_service import LLMService


def _make_svc():
    try:
        from app.core.config import settings
        orig = settings.google_api_key
        settings.google_api_key = "test-fake-key"
        try:
            return RobustExtractionService(llm_service=LLMService())
        finally:
            settings.google_api_key = orig
    except Exception:
        from unittest.mock import MagicMock
        return RobustExtractionService(llm_service=MagicMock())


def test_recovery_preserves_partial():
    svc = _make_svc()
    structured = {
        "datos_contacto": {"nombre_completo": "Ana QA", "email": "ana@test.cl"},
        "titular_profesional": {"titular": "QA Lead"},
        "experiencia_laboral": [{"cargo": "QA Lead", "empresa": "Empresa A", "periodo": {"fecha_inicio": "2020-01"}, "responsabilidades": ["Selenium"]}],
        "formacion_academica": [{"titulo": "Ing. Informática", "institucion": "UChile"}],
        "habilidades": {"habilidades_tecnicas": [{"skill": "Selenium"}], "habilidades_blandas": [{"skill": "Liderazgo"}]}
    }
    resume = svc._create_validated_response(structured, "raw texto")
    assert resume.datos_contacto.nombre_completo == "Ana QA"
    assert len(resume.experiencia_laboral) == 1
    assert resume.habilidades.habilidades_blandas == ["Liderazgo"]
    assert resume.titular_profesional.titular != "No extraído"


def test_emergency_not_destructive():
    svc = _make_svc()
    structured = {"datos_contacto": {"nombre_completo": "Ana QA", "email": "ana@test.cl"}, "experiencia_laboral": [{"cargo": "QA", "empresa": "X", "periodo": {"fecha_inicio": "2020-01"}, "responsabilidades": ["a"]}], "habilidades": {"habilidades_tecnicas": [], "habilidades_blandas": [{"skill": "Liderazgo"}]}}
    # Simulate old emergency would return minimal with no experiencia; new should preserve
    resp = svc._create_emergency_response(structured, "raw")
    assert len(resp.experiencia_laboral) >= 1
    # Must sanitize habilidades_blandas dict->str
    assert resp.habilidades.habilidades_blandas == ["Liderazgo"]
    # Must mark partial/recovered
    assert resp.metadata_procesamiento is not None
    assert resp.metadata_procesamiento.get("partial") is True
    assert resp.metadata_procesamiento.get("recovered") is True


def test_emergency_sanitizes_habilidades_blandas():
    svc = _make_svc()
    structured = {
        "datos_contacto": {"nombre_completo": "Ana QA", "email": "ana@test.cl"},
        "experiencia_laboral": [],
        "habilidades": {"habilidades_tecnicas": [], "habilidades_blandas": [{"skill": "Liderazgo", "level": "Avanzado"}, {"nombre": "Comunicación"}, "Trabajo en equipo"]},
        "titular_profesional": {"titular": "QA Lead"},
    }
    resp = svc._create_emergency_response(structured, "raw texto con QA Lead")
    assert all(isinstance(x, str) for x in resp.habilidades.habilidades_blandas)
    assert "Liderazgo" in resp.habilidades.habilidades_blandas
    assert "Comunicación" in resp.habilidades.habilidades_blandas
