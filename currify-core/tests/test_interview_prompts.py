from app.core.interview_prompts import get_interview_guide_prompt


def test_prompt_clasifica_tipo_de_etapa():
    p = get_interview_guide_prompt()
    assert "técnica" in p.lower()
    assert "psicológica" in p.lower()
    assert "SHAR" in p.upper() or "STAR" in p.upper()


def test_prompt_sources_completas():
    p = get_interview_guide_prompt()
    for src in ("rubrica", "perfil", "brecha", "estandar"):
        assert src in p


def test_prompt_anti_fuga():
    p = get_interview_guide_prompt().lower()
    assert "otras etapas" in p
    assert "feedback" in p or "retroalimentación" in p
    assert "sensible" in p


def test_prompt_cinco_preguntas():
    assert "5 preguntas" in get_interview_guide_prompt()