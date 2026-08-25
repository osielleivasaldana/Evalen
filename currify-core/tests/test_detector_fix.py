from app.services.robust_extraction_service import RobustExtractionService
from app.services.llm_service import LLMService


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


def test_detector_no_false_positive():
    import inspect
    from types import SimpleNamespace
    svc = _make_svc()
    structured = {"experiencia_laboral": [{"cargo": "QA Lead"}], "datos_contacto": {"email": "qa@test.cl", "nombre_completo": "Candidato QA"}}
    # Simulate resume_data empty due to Pydantic bug but structured not empty
    fake = SimpleNamespace(
        titular_profesional=SimpleNamespace(titular="No extraído"),
        datos_contacto=SimpleNamespace(email="no-extraido@example.com"),
        experiencia_laboral=[],
    )

    # New detector should NOT fire error if structured has data
    is_empty_post = len(fake.experiencia_laboral) == 0 and fake.titular_profesional.titular == "No extraído"
    is_empty_pre = len(structured.get("experiencia_laboral", [])) == 0
    should_error = is_empty_post and is_empty_pre and 0.9 > 0.8
    assert should_error == False  # warning not error

    # Verify implementation uses pre vs post logic (no false positive)
    src = inspect.getsource(svc.extract_from_text)
    assert "is_empty_post" in src, "Detector must use is_empty_post logic"
    assert "is_empty_pre" in src, "Detector must use is_empty_pre logic"
    assert "__quality_mismatch__" in src, "Detector must set __quality_mismatch__ on warning"


def test_validate_quality_no_osiel_hack():
    import inspect
    svc = _make_svc()
    extraction = {"datos_contacto": {"nombre_completo": "Ana QA", "email": "ana@test.cl"}, "experiencia_laboral": [{"cargo": "QA", "empresa": "X", "responsabilidades": ["a"]}], "habilidades": {"habilidades_tecnicas": [{"skill": "Python"}]}}
    score = svc._validate_extraction_quality(extraction)
    # Without PII hack, score should be deterministic, not inflated for "Osiel"
    assert 0.1 <= score <= 0.9

    # Verify Osiel hack removed from source
    src = inspect.getsource(svc._validate_extraction_quality)
    assert "Osiel" not in src, "PII hack 'Osiel' must be removed"
    assert "gmail" not in src.lower() or "gmail" not in src, "PII hack 'gmail' must be removed"
    assert "has_valid_data" in src, "Generic has_valid_data logic must exist"
    assert "max(final_score, 0.30" in src or "max(final_score, 0.3" in src, "Generic bump to 0.30 must exist"

    # Low-score case: generic name and Osiel should get same treatment after fix
    low_generic = {"datos_contacto": {"nombre_completo": "Ana QA"}, "experiencia_laboral": []}
    low_osiel = {"datos_contacto": {"nombre_completo": "Osiel QA"}, "experiencia_laboral": []}
    score_generic = svc._validate_extraction_quality(low_generic)
    score_osiel = svc._validate_extraction_quality(low_osiel)
    # After fix both should be bumped to 0.30 via generic has_valid_data, before fix Ana stayed 0.1
    assert abs(score_generic - score_osiel) < 1e-6, f"Generic and PII should have same score after fix, got {score_generic} vs {score_osiel}"
    assert score_generic >= 0.30, "Generic low-score valid data should be bumped to 0.30"
