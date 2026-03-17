from app.models.resume import PartialResumeData

def test_education_normalization():
    # Simulate LLM output from Chunk 2 logs (where education was under "educacion")
    raw_chunk_2 = {
        "educacion": [
            {
                "titulo": "Certificación en Big Data y Analytics",
                "institucion": "Cisco Networking Academy",
                "anio": "2021"
            },
            {
                "titulo": "Diplomado en Inteligencia Artificial",
                "institucion": "Pontificia Universidad Católica de Valparaíso",
                "anio": "2018"
            }
        ]
    }

    # The validator should map "educacion" -> "formacion_academica"
    partial = PartialResumeData(**raw_chunk_2)

    # Verify formatting
    print(f"Formación Académica: {partial.formacion_academica}")
    
    assert partial.formacion_academica is not None
    assert len(partial.formacion_academica) == 2
    
    # Check first item content
    item1 = partial.formacion_academica[0]
    assert item1.titulo == "Certificación en Big Data y Analytics"
    assert item1.institucion == "Cisco Networking Academy"
    assert item1.periodo.fecha_fin == "2021"

    # Check second item content
    item2 = partial.formacion_academica[1]
    assert item2.titulo == "Diplomado en Inteligencia Artificial"
    assert item2.institucion == "Pontificia Universidad Católica de Valparaíso"
    assert item2.periodo.fecha_fin == "2018"

if __name__ == "__main__":
    try:
        test_education_normalization()
        print("Education normalization test PASSED")
    except Exception as e:
        print(f"Education normalization test FAILED: {e}")
        import traceback
        traceback.print_exc()
