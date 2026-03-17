import asyncio
import sys
import os
import logging
from unittest.mock import MagicMock, AsyncMock, patch

# Add project root to path
sys.path.append(os.getcwd())

# MOCK ENV VARS
os.environ["API_SECRET_KEY"] = "dummy"
os.environ["OPENAI_API_KEY"] = "dummy"
os.environ["GEMINI_API_KEY"] = "dummy"
os.environ["ENVIRONMENT"] = "development"

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

from app.services.scoring_service import ScoringService
from app.models.dynamic_rubric import StructuredRubric, RubricEducation, RubricExperience, RubricSkills, RubricLogistics

async def reproduce_regression():
    logger.info("Initializing ScoringService with Mocks to Reproduce Regression...")
    
    with patch('app.services.scoring_service.LLMService') as MockLLM, \
         patch('app.services.scoring_service.DynamicRubricService') as MockRubricService, \
         patch('app.services.scoring_service.SemanticService') as MockSemanticService, \
         patch('app.services.scoring_service.EducationNormalizer') as MockEduNormalizer:
         
        # Setup Instances
        mock_llm_instance = MockLLM.return_value
        mock_llm_instance.call_agent = AsyncMock(return_value=None)
        
        mock_rubric_instance = MockRubricService.return_value
        
        mock_semantic_instance = MockSemanticService.return_value
        
        # Education: 100/100 (Working correctly)
        mock_edu_instance = MockEduNormalizer.return_value
        mock_edu_instance.normalize_degree.return_value = (6, "ingeniero")
        mock_edu_instance.check_level_match.side_effect = lambda c, r: c >= r
        mock_edu_instance.extract_required_level.return_value = 6
        
        # Instantiate Service
        service = ScoringService()
        
        # 1. Setup Semantic Mock Logic
        # REGRESSION SCENARIO: Real embeddings don't see similarity between "Ingeniero de Software" and "QA Automation"
        # So we return LOW SIMILARITY (< 0.85)
        
        mock_semantic_instance.extract_skills_from_description = AsyncMock(return_value={"Git", "Docker"})
        mock_semantic_instance.expand_skills = AsyncMock(return_value={"Python", "Selenium", "React", "Node.js"})
        mock_semantic_instance.normalize_job_titles = AsyncMock(side_effect=lambda x: x)
        mock_semantic_instance.normalize_degrees = AsyncMock(side_effect=lambda x: x)
        mock_semantic_instance.get_text_embedding = AsyncMock(return_value=[0.1]*10)
        
        async def mock_low_similarity(t1, t2):
            # Strict mode: No semantic match
            print(f"DEBUG: Comparing '{t1}' vs '{t2}'")
            return 0.1
            
        mock_semantic_instance.calculate_similarity = AsyncMock(side_effect=mock_low_similarity)
        
        # 2. Setup Rubric Mock with EMPTY REQUIREMENTS (To trigger Fallbacks)
        mock_rubric = StructuredRubric(
            education=RubricEducation(required_degrees=[]), # Fallback: Job Title -> Ingeniero (Level 6)
            experience=RubricExperience(key_roles=[], min_years=3), # Fallback: Job Title -> Ingeniero de Software
            skills=RubricSkills(mandatory_skills=["Python", "Selenium"]),
            logistics=RubricLogistics(location="Santiago")
        )
        mock_rubric_instance.generate_rubric = AsyncMock(return_value=mock_rubric)
        
        # --- INPUT DATA ---
        candidate = {
            "titular_profesional": {"titular": "Ingeniero Informático"},
            "resumen_profesional": {"resumen": "Ingeniero Informático con más de 15 años de experiencia..."},
            "formacion_academica": [{"titulo": "Ingeniero Informático", "institucion": "U", "periodo": {"fecha_inicio": "2010"}}],
            "experiencia_laboral": [
                {"cargo": "QA Automation Engineer", "empresa": "Tech Corp", "responsabilidades": ["Selenium"], "periodo": {"fecha_inicio": "2020"}},
                {"cargo": "Full Stack Developer", "empresa": "Old Corp", "responsabilidades": ["React"], "periodo": {"fecha_inicio": "2015", "fecha_fin": "2020"}}
            ],
            "habilidades": {"habilidades_tecnicas": ["Python"]},
            "datos_contacto": {"ubicacion": "Santiago"}
        }
        
        job_data = {
            "title": "Ingeniero de Software",
            "parsedJobData": {"habilidades_blandas": ["Liderazgo"], "educacion": "Ingeniería Informática"}
        }
        
        print("🚀 Starting REGRESSION Test 🚀")
        
        try:
            rubric = await service.dynamic_rubric_service.generate_rubric("title", "desc", job_data)
            
            scores = await service._calculate_matrix_scores(
                candidate, 
                rubric, 
                expanded_skills=["Python"],
                job_soft_skills=["Liderazgo"],
                job_title="Ingeniero de Software"
            )
            
            print(f"\n🏆 Calculated Scores Breakdown:")
            for k, v in scores.items():
                print(f"  - {k}: {v}")
                
            # Assert expectations for regression
            # Assert expectations for regression fix
            # EXP should be >= 70 if fix worked (60 role + 100 years + 100 industry)
            if scores['experience'] >= 70:
                print(f"\n✅ Regression Fixed! Experience Score is {scores['experience']} (>= 70).")
            else:
                print(f"\n❌ Regression STILL PRESENT. Experience Score is {scores['experience']}.")
                
        except Exception as e:
            logger.error(f"Scoring crashed: {e}", exc_info=True)

if __name__ == "__main__":
    asyncio.run(reproduce_regression())
