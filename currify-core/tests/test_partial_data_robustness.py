from app.models.resume import PartialResumeData

def test_partial_resume_robustness():
    # Simulate LLM output that caused the error: lists instead of dicts for container fields
    raw_data = {
        "reconocimientos": ["Premio Innovación 2024", "Empleado del mes"],
        "formacion_complementaria": ["Curso de Python", "Certificación AWS"],
        "actividades_extracurriculares": ["Voluntariado Cruz Roja"],
        "intereses": ["Ajedrez", "Fútbol"]
    }
    
    # Validation should succeed now, wrapping lists into proper fields
    partial = PartialResumeData(**raw_data)
    
    # Verify Reconocimientos
    assert partial.reconocimientos is not None
    assert partial.reconocimientos.logros_premios == ["Premio Innovación 2024", "Empleado del mes"]
    
    # Verify Formación Complementaria
    assert partial.formacion_complementaria is not None
    assert partial.formacion_complementaria.certificaciones_cursos == ["Curso de Python", "Certificación AWS"]
    
    # Verify Extracurriculares
    assert partial.actividades_extracurriculares is not None
    assert partial.actividades_extracurriculares.voluntariado == ["Voluntariado Cruz Roja"]
    
    # Verify Intereses
    assert partial.intereses is not None
    assert partial.intereses.hobbies_intereses == ["Ajedrez", "Fútbol"]

if __name__ == "__main__":
    try:
        test_partial_resume_robustness()
        print("PartialResumeData robustness test PASSED")
    except Exception as e:
        print(f"PartialResumeData robustness test FAILED: {e}")
        import traceback
        traceback.print_exc()
