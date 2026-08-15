import pytest
from pydantic import ValidationError
from app.models.interview import InterviewGuideRequest, InterviewGuideResponse, GuideQuestion


def test_valid_request_roundtrip():
    req = InterviewGuideRequest(
        campaign={"title": "Experto en React", "description": "Frontend", "requirements": "React, TS"},
        stage={"name": "Entrevista Técnica", "description": "Evaluar stack"},
        candidate={"resumen": "QA 6 años", "habilidades": ["QA", "Python"], "brechas": ["Sin React"]},
        rubric_criteria=["React avanzado", "TypeScript"],
    )
    assert req.campaign.title == "Experto en React"
    assert req.rubric_criteria == ["React avanzado", "TypeScript"]


def test_valid_response_roundtrip():
    resp = InterviewGuideResponse(questions=[
        {"question": "¿Cuéntame de tu proyecto React más complejo?", "source": "perfil"},
        {"question": "¿Cómo abordarías aprender testing?", "source": "brecha"},
        {"question": "Cuéntame de un conflicto de equipo", "source": "estandar"},
        {"question": "¿Qué significa React para ti?", "source": "rubrica"},
        {"question": "¿Cómo validas en producción?", "source": "perfil"},
    ])
    assert len(resp.questions) == 5


def test_invalid_source_rejected():
    with pytest.raises(ValidationError):
        GuideQuestion(question="x", source="feedback")


def test_source_normalized():
    assert GuideQuestion(question="x", source="Rúbrica").source == "rubrica"
    assert GuideQuestion(question="x", source="estándar").source == "estandar"