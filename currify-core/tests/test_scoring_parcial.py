import pytest
from unittest.mock import MagicMock, AsyncMock, patch

from app.services.scoring_service import ScoringService
from app.services.llm_service import LLMService
from app.core.config import settings

@pytest.mark.asyncio
async def test_scoring_partial_not_zero(monkeypatch):
    monkeypatch.setattr(settings, "google_api_key", "test-dummy-key")
    monkeypatch.setattr(settings, "anthropic_api_key", "test-dummy-key")
    llm = LLMService()
    async def fake(prompt, input_data, stage_name, **kw):
        # Return minimal LLM reasoning
        return {"breakdown":{"skills_match":{"reasoning":"ok"},"experience":{"reasoning":"ok"},"education":{"reasoning":"falta"},"cultural_fit":{"reasoning":"ok"},"logistics":{"reasoning":"ok"},"career_trajectory":{"reasoning":"ok"}},"strengths":[],"gaps":[],"summary":"ok"}
    llm.call_agent = fake  # type: ignore
    # Mock semantic and rubric to avoid real calls
    svc = ScoringService(llm_service=llm)
    async def fake_expand(skills): return set(["selenium","java"])
    async def fake_norm_roles(roles): return [r.lower() for r in roles]
    async def fake_norm_deg(deg): return [d.lower() for d in deg]
    async def fake_rubric(title, desc, parsed_data=None):
        from app.models.dynamic_rubric import StructuredRubric
        return StructuredRubric.model_validate({"education":{"required_degrees":[],"academic_level":"Técnico","kill_clause":False},"experience":{"min_years":0,"key_roles":["QA Automation"]},"skills":{"mandatory_skills":["selenium","java"],"nice_to_have_skills":[]},"logistics":{"location":None,"modality":"Presencial"},"languages":{"required_languages":[]},"certifications":{"mandatory_certs":[]}})
    async def fake_extract(text): return set()
    async def fake_emb(t): return [0.0]*4
    async def fake_sim(a,b): return 0.9
    svc.semantic_service.expand_skills = fake_expand  # type: ignore
    svc.semantic_service.normalize_job_titles = fake_norm_roles  # type: ignore
    svc.semantic_service.normalize_degrees = fake_norm_deg  # type: ignore
    svc.semantic_service.extract_skills_from_description = fake_extract  # type: ignore
    svc.semantic_service.get_text_embedding = fake_emb  # type: ignore
    svc.semantic_service.calculate_similarity = fake_sim  # type: ignore
    svc.dynamic_rubric_service.generate_rubric = fake_rubric  # type: ignore

    candidate = {"titular_profesional":{"titular":"QA Lead"},"datos_contacto":{"ubicacion":"Santiago"},"experiencia_laboral":[{"cargo":"QA Lead","empresa":"Empresa A","responsabilidades":["Selenium"]}],"habilidades":{"habilidades_tecnicas":[{"skill":"Selenium","level":"Avanzado"}],"idiomas":[],"habilidades_blandas":["Liderazgo"]},"formacion_academica":[]}
    job = {"title":"QA Automation","description":"Selenium Java","parsedJobData":{"habilidades_blandas":[]}}
    resp = await svc.evaluate_candidate(candidate, job)
    assert resp is not None
    assert resp.overall_score > 0
    assert resp.breakdown["education"].score == 0
    assert resp.overall_score < 100

@pytest.mark.asyncio
async def test_scoring_empty_still_zero(monkeypatch):
    monkeypatch.setattr(settings, "google_api_key", "test-dummy-key")
    monkeypatch.setattr(settings, "anthropic_api_key", "test-dummy-key")
    svc = ScoringService(llm_service=LLMService())
    # Mock to avoid real LLM, but guardrail should short-circuit before
    resp = await svc.evaluate_candidate({"titular_profesional":{"titular":"No extraído"},"habilidades":{},"experiencia_laboral":[],"formacion_academica":[]}, {"title":"X","description":"Y"})
    assert resp.overall_score == 0.0
