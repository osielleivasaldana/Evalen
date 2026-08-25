"""
Test heurística y prompt inclusivo RRHH — Task 2

Verifica que PROMPT_SKILLS sea inclusivo para dominio no-tech.
"""

def test_prompt_skills_inclusivo_rrhh():
    from app.services.section_extractor import PROMPT_SKILLS
    assert "Reclutamiento" in PROMPT_SKILLS, "PROMPT_SKILLS debe contener 'Reclutamiento' para dominio RRHH"
    assert "Gestión" in PROMPT_SKILLS or "Gestión de" in PROMPT_SKILLS, "PROMPT_SKILLS debe contener 'Gestión' / 'Gestión de'"
    # Validaciones adicionales del plan — reglas ampliadas
    assert "Intermedio - Avanzado" in PROMPT_SKILLS or "Intermedio-Avanzado" in PROMPT_SKILLS
    assert "habilidades_blandas" in PROMPT_SKILLS
    assert "Few-shot RRHH" in PROMPT_SKILLS
