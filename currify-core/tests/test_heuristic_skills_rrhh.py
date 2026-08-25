"""
Test heurística y prompt inclusivo RRHH — Task 2 + Task 3

Verifica que PROMPT_SKILLS sea inclusivo para dominio no-tech
y que la heurística detecte competencias RRHH sin cabecera.
"""

def test_prompt_skills_inclusivo_rrhh():
    from app.services.section_extractor import PROMPT_SKILLS
    assert "Reclutamiento" in PROMPT_SKILLS, "PROMPT_SKILLS debe contener 'Reclutamiento' para dominio RRHH"
    assert "Gestión" in PROMPT_SKILLS or "Gestión de" in PROMPT_SKILLS, "PROMPT_SKILLS debe contener 'Gestión' / 'Gestión de'"
    # Validaciones adicionales del plan — reglas ampliadas
    assert "Intermedio - Avanzado" in PROMPT_SKILLS or "Intermedio-Avanzado" in PROMPT_SKILLS
    assert "habilidades_blandas" in PROMPT_SKILLS
    assert "Few-shot RRHH" in PROMPT_SKILLS


def test_heuristic_rrhh_sin_cabecera():
    from app.services.section_extractor import _heuristic_skills
    content = "Gestión de Recursos Humanos\nAdministración\nLiderazgo\nInglés intermedio avanzado"
    res = _heuristic_skills(content)
    assert res is not None
    tech = [s["skill"].lower() for s in res["habilidades_tecnicas"]]
    assert any("gestión" in t for t in tech)
    assert any("liderazgo" in s.lower() for s in res["habilidades_blandas"]) or any("liderazgo" in t for t in tech)  # tolerante
    assert len(res["idiomas"]) >= 1


def test_is_not_skill_no_filtra_rrhh():
    from app.services.robust_extraction_service import RobustExtractionService
    from unittest.mock import MagicMock
    svc = RobustExtractionService(llm_service=MagicMock())
    assert not svc._is_not_skill("Gestión de Recursos Humanos")
    assert not svc._is_not_skill("Desarrollo organizacional")
    assert svc._is_not_skill("Teléfono: +56 9 1234")


def test_resume_prompts_inclusivo():
    from app.core.resume_prompts import ResumeExtractionPrompts
    p = ResumeExtractionPrompts.get_skills_extraction_prompt()
    assert "Reclutamiento" in p or "Gestión de RRHH" in p
    assert "HABILIDADES TÉCNICAS Y DE DOMINIO" in p
