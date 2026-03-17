from app.models.resume import WorkExperience, Education, Period

def test_work_experience_flat_dates():
    data = {
        "cargo": "Dev",
        "empresa": "Corp",
        "fecha_inicio": "2020-01",
        "fecha_fin": "Presente"
    }
    we = WorkExperience(**data)
    assert we.periodo is not None
    assert we.periodo.fecha_inicio == "2020-01"
    assert we.periodo.fecha_fin == "Presente"

def test_education_flat_dates():
    data = {
        "titulo": "Degree",
        "institucion": "Uni",
        "anio": "2019"
    }
    edu = Education(**data)
    assert edu.periodo is not None
    assert edu.periodo.fecha_inicio == "2019"
    assert edu.periodo.fecha_fin == "2019"
    
def test_education_flat_dates_start_end():
    data = {
        "titulo": "Degree",
        "institucion": "Uni",
        "fecha_inicio": "2015",
        "fecha_fin": "2019"
    }
    edu = Education(**data)
    assert edu.periodo.fecha_inicio == "2015"
    assert edu.periodo.fecha_fin == "2019"

if __name__ == "__main__":
    try:
        test_work_experience_flat_dates()
        print("WorkExperience test passed")
        test_education_flat_dates()
        print("Education flat year test passed")
        test_education_flat_dates_start_end()
        print("Education start/end test passed")
    except Exception as e:
        print(f"Test failed: {e}")
        import traceback
        traceback.print_exc()
