
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

async def test_dict_skills():
    try:
        service = ScoringService()
        
        # Candidate with DICT inside skills list (The Bug Cause)
        candidate = {
            "datos_personales": {"nombre": "Test Candidate", "email": "test@example.com"},
            "resumen_profesional": {"resumen": "Developer"},
            "experiencia_laboral": [],
            "habilidades": {
                "habilidades_tecnicas": [
                    "Python", 
                    {"name": "Docker", "level": "Expert"}, # This caused the crash
                    123 # Edge case number
                ], 
                "idiomas": ["Español"]
            },
            "formacion_academica": []
        }

        job = {
            "title": "Developer",
            "description": "Python Developer",
            "requirements": ["Python", "Docker"]
        }

        print("\n--- STARTING EVALUATION WITH DICT SKILLS ---")
        response = await service.evaluate_candidate(candidate, job)
        
        if response:
            print(f"\n✅ Evaluation Completed successfully!")
            print(f"Overall Score: {response.overall_score}/100")
        else:
            print("\n❌ Evaluation Failed (None response)")

    except Exception as e:
        print(f"\n❌ EXCEPTION: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_dict_skills())
