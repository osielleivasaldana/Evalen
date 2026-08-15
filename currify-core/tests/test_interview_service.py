import pytest
from typing import Optional
from app.models.interview import (
    InterviewGuideRequest, InterviewGuideResponse, GuideQuestion,
)
from app.services.interview_service import InterviewService


class FakeLLM:
    """Devuelve 3 preguntas fake — el servicio debe fallback a respuesta vacía si da menos de 1."""

    def __init__(self, result: Optional[list] = None):
        self._result = result

    async def call_agent_structured(self, prompt: str, input_data, response_model,
                                    stage_name: str = "", temperature: float = 0.0):
        if self._result is None:
            return None
        return response_model(questions=self._result)


def make_request() -> InterviewGuideRequest:
    return InterviewGuideRequest(
        campaign={"title": "Experto en React", "description": "Frontend", "requirements": "React, TS"},
        stage={"name": "Entrevista Técnica", "description": "Deep dive de React"},
        candidate={"resumen": "QA 6 años", "habilidades": ["QA"], "brechas": ["Sin React"]},
        rubric_criteria=["React avanzado"],
    )


async def fake_agent_final(*args, **kwargs):
    return None


async def fake_agent_fallback(*args, **kwargs):
    q = GuideQuestion(question="¿Fallas?", source="estandar")
    return InterviewGuideResponse(questions=[q])


async def fake_agent_full(*args, **kwargs):
    return InterviewGuideResponse(questions=[
        GuideQuestion(question="P1", source="rubrica"),
        GuideQuestion(question="P2", source="brecha"),
        GuideQuestion(question="P3", source="perfil"),
        GuideQuestion(question="P4", source="estandar"),
        GuideQuestion(question="P5", source="rubrica"),
    ])


@pytest.mark.asyncio
async def test_returns_llm_questions(monkeypatch):
    svc = InterviewService.__new__(InterviewService)
    monkeypatch.setattr(svc, "llm_service", type("LLM", (), {"call_agent_structured": fake_agent_full})())
    result = await svc.generate_guide(make_request())
    assert len(result.questions) == 5
    assert result.questions[1].source == "brecha"


@pytest.mark.asyncio
async def test_fallback_when_llm_returns_none(monkeypatch):
    svc = InterviewService.__new__(InterviewService)
    monkeypatch.setattr(svc, "llm_service", type("LLM", (), {"call_agent_structured": fake_agent_final})())
    result = await svc.generate_guide(make_request())
    assert isinstance(result, InterviewGuideResponse)
    assert isinstance(result.questions, list)


@pytest.mark.asyncio
async def test_fallback_when_llm_returns_one_question(monkeypatch):
    svc = InterviewService.__new__(InterviewService)
    monkeypatch.setattr(svc, "llm_service", type("LLM", (), {"call_agent_structured": fake_agent_fallback})())
    result = await svc.generate_guide(make_request())
    assert len(result.questions) >= 1


@pytest.mark.asyncio
async def test_input_data_never_contains_feedback_sensitive(monkeypatch):
    captured = {}

    async def spy(prompt, input_data, response_model, stage_name="", temperature=0.0):
        captured["input"] = str(input_data)
        return InterviewGuideResponse(questions=[
            GuideQuestion(question="P1", source="rubrica")])

    llm = type("LLM", (), {})()
    llm.call_agent_structured = spy
    svc = InterviewService.__new__(InterviewService)
    monkeypatch.setattr(svc, "llm_service", llm)
    await svc.generate_guide(make_request())
    lower = captured["input"].lower()
    assert "feedback" not in lower
    assert "sensitive" not in lower
    assert "etapa 1" not in lower