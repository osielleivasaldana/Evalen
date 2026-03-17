from app.models.resume import Education

def test_date_parsing_logic():
    print("Testing Education Date Parsing (Robust)...")

    # Case 1: Single Year
    print("\nCase 1: Single Year ('2021')")
    data_single = {"titulo": "Cert", "anio": "2021"}
    edu_single = Education(**data_single)
    print(f"Result: Start={edu_single.periodo.fecha_inicio}, End={edu_single.periodo.fecha_fin}")
    assert edu_single.periodo.fecha_fin == "2021"
    assert edu_single.periodo.fecha_inicio == "2021"

    # Case 2: Date Range String ('2012-2016')
    print("\nCase 2: Date Range ('2012-2016')")
    data_range = {"titulo": "Ingenieria", "anio": "2012-2016"}
    edu_range = Education(**data_range)
    print(f"Result: Start={edu_range.periodo.fecha_inicio}, End={edu_range.periodo.fecha_fin}")
    
    assert edu_range.periodo.fecha_inicio == "2012"
    assert edu_range.periodo.fecha_fin == "2016"
    
    # Case 3: Date embedded in title ('2021: Curso AWS')
    print("\nCase 3: Date embedded in title ('2021: Curso AWS')")
    # Simulate LLM failing to extract date, putting it in title
    data_embedded = {"titulo": "2021: Curso AWS"} 
    edu_embedded = Education(**data_embedded)
    print(f"Result: Start={edu_embedded.periodo.fecha_inicio}, End={edu_embedded.periodo.fecha_fin}, Title={edu_embedded.titulo}")

    assert edu_embedded.periodo.fecha_inicio == "2021"
    assert edu_embedded.periodo.fecha_fin == "2021"
    assert edu_embedded.titulo == "Curso AWS"

    # Case 4: Range embedded in title ('2012-2016: Ingenieria')
    print("\nCase 4: Range embedded in title ('2012-2016: Ingenieria')")
    data_range_embedded = {"titulo": "2012-2016: Ingenieria"}
    edu_range_embedded = Education(**data_range_embedded)
    print(f"Result: Start={edu_range_embedded.periodo.fecha_inicio}, End={edu_range_embedded.periodo.fecha_fin}, Title={edu_range_embedded.titulo}")
    
    assert edu_range_embedded.periodo.fecha_inicio == "2012"
    assert edu_range_embedded.periodo.fecha_fin == "2016"
    assert edu_range_embedded.titulo == "Ingenieria"

    print("\nDate Parsing Tests PASSED")

if __name__ == "__main__":
    try:
        test_date_parsing_logic()
    except Exception as e:
        print(f"\nDate Parsing Tests FAILED: {e}")
        import traceback
        traceback.print_exc()
