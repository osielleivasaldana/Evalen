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
# Correct imports for Rubric Models
from app.models.dynamic_rubric import StructuredRubric, RubricEducation, RubricExperience, RubricSkills, RubricLogistics

async def debug_scoring():
    logger.info("Initializing ScoringService with Mocks...")
    
    # PATCH CLASSES BEFORE INSTANTIATION
    with patch('app.services.scoring_service.LLMService') as MockLLM, \
         patch('app.services.scoring_service.DynamicRubricService') as MockRubricService, \
         patch('app.services.scoring_service.SemanticService') as MockSemanticService, \
         patch('app.services.scoring_service.EducationNormalizer') as MockEduNormalizer:
         
        # Setup Instances
        mock_llm_instance = MockLLM.return_value
        mock_llm_instance.call_agent = AsyncMock(return_value=None)
        
        mock_rubric_instance = MockRubricService.return_value
        
        mock_semantic_instance = MockSemanticService.return_value
        
        # Setup Education Normalizer (we want REAL logic if possible, but for now let's mock it to control test)
        # Actually, let's use REAL EducationNormalizer logic if we can, or Mock it to return strict values.
        # User reported "Ingeniero Informático" (Level 6) vs "Ingeniero Informático".
        # Let's mock it to return (6, "ingeniero") so we check the SCORING logic.
        mock_edu_instance = MockEduNormalizer.return_value
        mock_edu_instance.normalize_degree.return_value = (6, "ingeniero")
        mock_edu_instance.check_level_match.side_effect = lambda c, r: c >= r
        mock_edu_instance.extract_required_level.return_value = 6
        
        # Instantiate Service (uses mocks)
        service = ScoringService()
        
        # 1. Setup Semantic Mock Logic
        mock_semantic_instance.extract_skills_from_description = AsyncMock(return_value={"Git", "Docker"})
        mock_semantic_instance.expand_skills = AsyncMock(return_value={"Python", "Selenium", "React", "Node.js", "Git", "Docker"})
        mock_semantic_instance.normalize_job_titles = AsyncMock(side_effect=lambda x: x)
        mock_semantic_instance.normalize_degrees = AsyncMock(side_effect=lambda x: x) # Pass through
        mock_semantic_instance.get_text_embedding = AsyncMock(return_value=[0.1]*10)
        
        async def mock_similarity(t1, t2):
            print(f"DEBUG: Comparing '{t1}' vs '{t2}'")
            t1, t2 = t1.lower(), t2.lower()
            if "ingeniero" in t1 and "ingeniería" in t2 and "informática" in t1 and "informática" in t2:
                return 0.95
            if "ingenieria" in t1 and "ingeniero" in t2:
                return 0.95
            if t1 == t2: return 1.0
            return 0.1
        mock_semantic_instance.calculate_similarity = AsyncMock(side_effect=mock_similarity)
        
        # 2. Setup Rubric Mock with EMPTY REQUIREMENTS (To test Fallbacks)
        mock_rubric = StructuredRubric(
            education=RubricEducation(
                required_degrees=[], # EMPTY to trigger fallback
                # kill_clause=True
            ),
            experience=RubricExperience(
                key_roles=[], # EMPTY to trigger fallback to Job Title
                min_years=3
            ),
            skills=RubricSkills(
                mandatory_skills=["Python", "Selenium", "React", "Node.js"],
                nice_to_have_skills=["Java", "SQL"]
            ),
            logistics=RubricLogistics(location="Santiago")
        )
        mock_rubric_instance.generate_rubric = AsyncMock(return_value=mock_rubric)
        
        # --- INPUT DATA ---
        candidate = {
            "titular_profesional": {"titular": "Ingeniero Informático"},
            "resumen_profesional": {"resumen": "Ingeniero Informático con más de 15 años de experiencia..."},
            "formacion_academica": [
                {"titulo": "Ingeniero Informático", "institucion": "Universidad X", "periodo": {"fecha_inicio": "2010"}}
            ],
            "experiencia_laboral": [
                {"cargo": "QA Automation Engineer", "empresa": "Tech Corp", "responsabilidades": ["Selenium", "Python"], "periodo": {"fecha_inicio": "2020"}},
                {"cargo": "Full Stack Developer", "empresa": "Old Corp", "responsabilidades": ["Node.js", "React"], "periodo": {"fecha_inicio": "2015"}}
            ],
            "habilidades": {
                "habilidades_tecnicas": ["Python", "Selenium", "React", "Node.js", "Scrum"], # Added Scrum for soft match potential
                "habilidades_blandas": ["Trabajo en equipo"]
            },
            "datos_contacto": {"ubicacion": "Santiago, Chile"}
        }
        
        job_data = {
            "title": "Ingeniero de Software", # Implies Level 6
            "parsedJobData": {
                "habilidades_blandas": ["Liderazgo"], # Liderazgo vs Scrum/Teamwork?
                "educacion": "Ingeniería Informática"
            }
        }
        
        # Mock Semantic Match for Soft Skills
        async def mock_similarity(t1, t2):
            print(f"DEBUG: Comparing '{t1}' vs '{t2}'")
            t1, t2 = t1.lower(), t2.lower()
            if "ingeniero" in t1 and "ingeniería" in t2: return 0.95
            if "ingenieria" in t1 and "ingeniero" in t2: return 0.95
            # Job Title Fallback Match
            if "ingeniero de software" in t1 and "qa automation" in t2: return 0.86 # Match Job Title (fallback role) to Candidate Role?
            if "ingeniero de software" in t1 and "full stack" in t2: return 0.86
            
            # Soft Skills Semantic Match
            if "liderazgo" in t1 and "scrum" in t2: return 0.88 # Pretend Scrum implies Leadership
            
            if t1 == t2: return 1.0
            return 0.1
        mock_semantic_instance.calculate_similarity = AsyncMock(side_effect=mock_similarity)
        
        print("🚀 Starting MOCKED Scoring Debug 🚀")
        
        try:
            # Emulate logic
            rubric = await service.dynamic_rubric_service.generate_rubric("title", "desc", job_data)
            
            scores = await service._calculate_matrix_scores(
                candidate, 
                rubric, 
                expanded_skills=["Python", "Selenium"],
                job_soft_skills=["Liderazgo"],
                job_title="Ingeniero de Software" # Pass title explicitly
            )
            
            print(f"\n🏆 Calculated Scores Breakdown:")
            for k, v in scores.items():
                print(f"  - {k}: {v}")
            
        except Exception as e:
            logger.error(f"Scoring crashed: {e}", exc_info=True)

if __name__ == "__main__":
    asyncio.run(debug_scoring())
