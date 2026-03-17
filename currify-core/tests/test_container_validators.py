from app.models.resume import Recognition, AdditionalTraining, ExtracurricularActivities, Interests

def test_recognition_container():
    # Case 1: Standard object input
    data_std = {"logros_premios": ["Premio A"]}
    rec = Recognition.model_validate(data_std)
    assert rec.logros_premios == ["Premio A"]

    # Case 2: Direct list input (The Fix)
    data_list = ["Premio B", "Premio C"]
    rec_list = Recognition.model_validate(data_list) # model_validate invokes the validator
    assert rec_list.logros_premios == ["Premio B", "Premio C"]
    
    # Case 3: Empty list
    rec_empty = Recognition.model_validate([])
    assert rec_empty.logros_premios == []

def test_training_container():
    # Direct list input
    data = ["Curso A", "Curso B"]
    training = AdditionalTraining.model_validate(data)
    assert training.certificaciones_cursos == ["Curso A", "Curso B"]

def test_activities_container():
    # Direct list input
    data = ["Voluntario A"]
    act = ExtracurricularActivities.model_validate(data)
    assert act.voluntariado == ["Voluntario A"]

def test_interests_container():
    # Direct list input
    data = ["Leer", "Correr"]
    interest = Interests.model_validate(data)
    assert interest.hobbies_intereses == ["Leer", "Correr"]

if __name__ == "__main__":
    try:
        test_recognition_container()
        print("Recognition test passed")
        test_training_container()
        print("Training test passed")
        test_activities_container()
        print("Activities test passed")
        test_interests_container()
        print("Interests test passed")
        print("ALL CONTAINER TESTS PASSED")
    except Exception as e:
        print(f"Test failed: {e}")
        import traceback
        traceback.print_exc()
