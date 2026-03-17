from app.models.resume import WorkExperience, Education
import json

def test_detail_extraction():
    # 1. Test Work Experience Description -> Responsibilities (Messy Input)
    print("Testing Work Experience description mapping with MESSY input...")
    
    # Simulating the user's reported issue:
    # - Hard wraps in the middle of sentences
    # - Glued text
    # - Duplicate content
    messy_desc = """
•
Automaticé pruebas para flujos críticos en un proyecto interno de Citi Bank, reduciendo 
los errores en ambientes de pruebas en más de un 50%. Utilicé Selenium, Java, Cucumber 
y Selenium Grid desplegados en Jenkins.
•
Utilizando Zephyr Enterprise diseñé planes de pruebas de historias de usuario para su ejecución manual, esto con el fin de abordar casos bordes no especificados en los criterios de aceptación.
•
UtilizandoZephyrEnterprisediseñéplanesdepruebasdehistoriasdeusuarioparasuejecuciónmanual, 
esto con el fin de abordar casos bordes no especificados en los criterios de aceptación.
•
Participé en la planificación y análisis de nuevas funcionalidades con equipos multinacionales.
"""
    
    raw_experience = {
        "cargo": "QA Automation Engineer",
        "empresa": "Tech Corp",
        "descripcion": messy_desc
    }
    
    exp = WorkExperience(**raw_experience)
    
    print(f"\nFinal Mapped Responsabilidades ({len(exp.responsabilidades)} items):")
    for i, item in enumerate(exp.responsabilidades):
        print(f"[{i+1}] {item}")
    
    # Assertions
    # 1. Should have roughly 3 valid items (Automaticé..., Utilizando..., Participé...)
    # The glued text should be filtered out or deduplicated
    assert len(exp.responsabilidades) >= 3
    
    # 2. Check for the "glued" text (should NOT be present)
    glued_text_start = "UtilizandoZephyrEnterprise"
    assert not any(glued_text_start in item for item in exp.responsabilidades), "Glued text should be filtered out"

    # 3. Check that sentences are not fragmented (e.g., "los errores..." shouldn't be a separate item)
    fragment = "los errores en ambientes de pruebas"
    # It should be part of the first item, not a standalone item
    assert any(fragment in item for item in exp.responsabilidades)
    assert not any(item.strip() == fragment for item in exp.responsabilidades)

    print("\nMessy description test PASSED")

if __name__ == "__main__":
    try:
        test_detail_extraction()
        print("\nAll detail extraction tests PASSED")
    except Exception as e:
        print(f"\nDetail extraction test FAILED: {e}")
        import traceback
        traceback.print_exc()
