from app.models.resume import PartialResumeData

def test_flexible_extraction_logic():
    # Simulate LLM output from Chunk 1 logs (flatter structure)
    raw_chunk_1 = {
        "nombre_completo": "Osiel Leiva Saldaña",
        "titulo_profesional": "Ingeniero Informático",
        "contacto": {
            "telefono": "+56967891153",
            "email": "osielleivasaldana@gmail.com"
        },
        "resumen": "Ingeniero Informático con más de 15 años de experiencia..."
    }

    # The validator should move these into their proper nested Pydantic models
    partial = PartialResumeData(**raw_chunk_1)

    # Verify Contact Info
    print(f"Contact Info: {partial.datos_contacto}")
    assert partial.datos_contacto is not None
    assert partial.datos_contacto.nombre_completo == "Osiel Leiva Saldaña"
    assert partial.datos_contacto.email == "osielleivasaldana@gmail.com"
    assert partial.datos_contacto.telefono == "+56967891153"

    # Verify Professional Title
    print(f"Title: {partial.titular_profesional}")
    assert partial.titular_profesional is not None
    assert partial.titular_profesional.titular == "Ingeniero Informático"

    # Verify Summary
    print(f"Summary: {partial.resumen_profesional}")
    assert partial.resumen_profesional is not None
    assert "15 años" in partial.resumen_profesional.resumen

if __name__ == "__main__":
    try:
        test_flexible_extraction_logic()
        print("Flexible extraction test PASSED")
    except Exception as e:
        print(f"Flexible extraction test FAILED: {e}")
        import traceback
        traceback.print_exc()
