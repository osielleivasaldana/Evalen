from app.models.resume import Skills

def test_language_parsing_strings():
    data = {
        "habilidades_tecnicas": [],
        "idiomas": [
            "Inglés (Avanzado)",
            "Francés Intermedio", 
            "Alemán",
            {"idioma": "Italiano", "nivel": "Básico"}
        ]
    }
    
    skills = Skills(**data)
    
    langs = skills.idiomas
    assert len(langs) == 4
    
    # Test 1: Inglés (Avanzado) -> Parens extraction
    assert langs[0].idioma == "Inglés"
    assert langs[0].nivel == "Avanzado"
    
    # Test 2: Francés Intermedio -> Keyword extraction
    assert langs[1].idioma == "Francés"
    assert langs[1].nivel == "Intermedio"
    
    # Test 3: Alemán -> Simple string
    assert langs[2].idioma == "Alemán"
    assert langs[2].nivel is None
    
    # Test 4: Italiano -> Dictionary (passthrough)
    assert langs[3].idioma == "Italiano"
    assert langs[3].nivel == "Básico"

if __name__ == "__main__":
    try:
        test_language_parsing_strings()
        print("Language parsing test passed!")
    except Exception as e:
        print(f"Test failed: {e}")
        import traceback
        traceback.print_exc()
