
import logging
from app.services.education_normalizer import EducationNormalizer
from app.services.scoring_service import ScoringService
from app.core.scoring_rubric import ScoringRubric
from app.models.dynamic_rubric import StructuredRubric as RubricModel

# Setup Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_education_normalization():
    print("\n--- Testing Education Normalizer ---")
    normalizer = EducationNormalizer()
    
    # Test Case 1: Engineer vs Engineer
    candidate_degree = "Ingeniería en Computación e Informática"
    required_degree = "Ingeniería Civil Informática"
    
    c_lvl, c_type = normalizer.normalize_degree(candidate_degree)
    r_lvl, r_type = normalizer.normalize_degree(required_degree)
    
    print(f"Candidate: '{candidate_degree}' -> Level {c_lvl} ({c_type})")
    print(f"Required:  '{required_degree}' -> Level {r_lvl} ({r_type})")
    
    match = normalizer.check_level_match(c_lvl, r_lvl)
    print(f"Match Result (Level {c_lvl} >= {r_lvl}): {match}")
    
    if match and c_lvl == 6:
        print("✅ SUCCESS: Engineering degrees matched by Level 6!")
    else:
        print("❌ FAILURE: Degrees did not match correctly.")

def test_scoring_matrix():
    print("\n--- Testing Scoring Matrix (QA -> Dev Adjacency) ---")
    service = ScoringService()
    
    # Mock Data
    rubric = RubricModel()
    rubric.education.required_degrees = ["Ingeniería Civil"]
    rubric.skills.mandatory_skills = ["Java", "Selenium", "SQL", "Spring Boot"] # Stack mixed
    rubric.experience.key_roles = ["Full Stack Developer"] 
    
    candidate = {
        "formacion_academica": [{"titulo": "Ingeniería en Computación"}],
        "experiencia_laboral": [
            {
                "cargo": "QA Automation Engineer", # Mismatch title
                "responsabilidades": "Desarrollo de pruebas automatizadas con Java, Selenium y consultas SQL para validar APIs." # Contains skills
            }
        ]
    }
    
    # Expand Mandatory for testing check
    # In real app, `expanded_skills` comes from semantic service. 
    # Here we just pass the raw stack to simulate coverage.
    expanded_skills = ["java", "selenium", "sql", "spring boot", "python"] 
    
    # Run Matrix
    scores = service._calculate_matrix_scores(candidate, rubric, expanded_skills=expanded_skills)
    
    print(f"Scores Calculated: {scores}")
    
    # Verify Education
    if scores['education'] >= 90:
        print("✅ Education Score: High (Level Match Verified)")
    else:
        print(f"❌ Education Score Low: {scores['education']}")

    # Verify Adjacency Recovery
    # QA Role != Full Stack -> Should be 20, but with Java/SQL in text -> Should be 60.
    if scores['experience'] >= 40: # (60 * 0.5) + years + industry... roughly > 40
        print(f"✅ Experience Score Recovered: {scores['experience']} (Adjacency Working)")
    else:
        print(f"❌ Experience Score Quantized: {scores['experience']} (Adjacency Failed)")

if __name__ == "__main__":
    try:
        test_education_normalization()
        test_scoring_matrix()
    except Exception as e:
        print(f"CRASHED: {e}")
        import traceback
        traceback.print_exc()
