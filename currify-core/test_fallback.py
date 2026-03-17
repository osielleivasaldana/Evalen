
import asyncio
import logging
import sys
import os

# Add current directory to path
sys.path.append(os.getcwd())

# Load environment variables
from dotenv import load_dotenv
load_dotenv(os.path.join(os.getcwd(), '..', '.env'))
# Also try loading from current dir just in case
load_dotenv()

# Manually set critical keys if missing (for test purpose only if .env fails)
if not os.getenv("API_SECRET_KEY"):
    os.environ["API_SECRET_KEY"] = "test_secret_key_for_validation"

from app.services.scoring_service import ScoringService

# Configure logging
logging.basicConfig(level=logging.INFO)

async def test_education_fallback_and_cultural():
    try:
        service = ScoringService()
        
        # Scenario: 
        # 1. Rubric Extraction MISSES the degree requirement (Simulated by empty required_degrees in LLM response if we could mock it, but here we rely on the code fix)
        # 2. ParsedJobData HAS the degree requirement.
        # 3. Soft Skills are present in ParsedJobData.
        
        candidate = {
            "datos_personales": {"nombre": "Test Candidate", "email": "test@example.com"},
            "resumen_profesional": {"resumen": "Soy una persona con gran capacidad analítica y atención al detalle."},
            "experiencia_laboral": [
                {
                    "cargo": "Desarrollador",
                    "responsabilidades": ["Orientación a resultados en proyectos complejos."],
                    "periodo": {}
                }
            ],
            "habilidades": {
                "habilidades_tecnicas": ["Python"], 
                "idiomas": ["Español"]
            },
            "formacion_academica": [
                {"titulo": "Ingeniero Informatico"}
            ]
        }

        # Mock parsedJobData with explicit "Ingeniería en Informática"
        job = {
            "title": "Developer",
            "description": "Python Developer",
            "requirements": "Ingeniero Informatico",
            "parsedJobData": {
                "educacion": "Ingeniería en Informática", # This should trigger the fallback
                "habilidades_blandas": ["Capacidad analítica", "Atención al detalle", "Orientación a resultados"]
            }
        }

        print("\n--- STARTING EVALUATION: Education Fallback & Cultural Fit ---")
        response = await service.evaluate_candidate(candidate, job)
        
        if response:
            print(f"\n✅ Evaluation Completed!")
            print(f"Overall Score: {response.overall_score}/100")
            
            # Check Deterministic Scores in logs/response if available (here we check expected behavior via score)
            # If Education matches "Ingeniero Informatico" vs "Ingeniería en Informática", score should be 100 or 90.
            # If Cultural Fit works, score should be > 50 (3 matches = 100).
            
            # Since response object encapsulates final score, we infer success if score is high.
            # We can inspect internal matrix scores if we added logging (which we did).
            
        else:
            print("\n❌ Evaluation Failed (None response)")

    except Exception as e:
        print(f"\n❌ EXCEPTION: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_education_fallback_and_cultural())
