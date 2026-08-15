import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


class FakeLLM:
    """Fake del cliente LLM: evita API keys y llamadas de red en el test del contrato HTTP."""

    def __init__(self, result=None):
        self._result = result

    async def call_agent_structured(self, prompt, input_data, response_model, stage_name="", **kwargs):
        if self._result is None:
            return None
        return response_model(questions=self._result)


@pytest.fixture(autouse=True)
def fake_llm(monkeypatch):
    from app.services import interview_service
    questions = [
        {"question": "¿Cuéntame de tu proyecto React más complejo?", "source": "perfil"},
        {"question": "¿Cómo abordarías aprender testing?", "source": "brecha"},
        {"question": "Cuéntame de un conflicto de equipo", "source": "estandar"},
    ]
    fake = FakeLLM(result=questions)
    monkeypatch.setattr(interview_service, "LLMService", lambda *a, **k: fake)
    return fake


@pytest.fixture(scope="module")
def auth_token():
    from app.core.security import create_access_token
    return create_access_token(data={"sub": "test_user", "type": "user"})


def test_requires_token():
    r = client.post("/interview/questions", json={})
    assert r.status_code == 403


def test_rejects_invalid_token():
    r = client.post("/interview/questions", json={}, headers={"Authorization": "Bearer token-invalido"})
    assert r.status_code == 401


def test_generates_guide(auth_token):
    payload = {
        "campaign": {"title": "Experto en React", "description": "Frontend", "requirements": "React, TS"},
        "stage": {"name": "Entrevista Técnica", "description": "Deep dive de React"},
        "candidate": {"resumen": "QA 6 años", "habilidades": ["QA"], "brechas": ["Sin React"]},
        "rubric_criteria": ["React avanzado"],
    }
    r = client.post("/interview/questions", json=payload, headers={"Authorization": f"Bearer {auth_token}"})
    assert r.status_code == 200, r.text
    questions = r.json()["questions"]
    assert isinstance(questions, list)
    assert len(questions) == 3
    assert questions[0]["source"] in {"rubrica", "perfil", "brecha", "estandar"}