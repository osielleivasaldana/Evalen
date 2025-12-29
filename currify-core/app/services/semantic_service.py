
import logging
from typing import List, Set
from app.services.llm_service import LLMService

logger = logging.getLogger(__name__)

class SemanticService:
    """
    Service responsible for Semantic Expansion of skills.
    Ensures that implicit technical knowledge is made explicit for deterministic scoring.
    """
    
    def __init__(self):
        self.llm_service = LLMService()

    async def expand_skills(self, skills: List[str]) -> Set[str]:
        """
        Expands a list of skills to include their hard technical dependencies.
        Example: ["Django"] -> {"Django", "Python", "Web Development", "MVC"}
        Strict Mode: Only includes absolute prerequisites. "Accounting" -> "Excel" is REJECTED.
        """
        if not skills:
            return set()
            
        try:
            # Clean and deduplicate input
            cleaned_skills = []
            for s in skills:
                if isinstance(s, dict):
                    # Extract from PartialSkill or generic dict
                    skill_name = s.get('skill') or s.get('name') or str(s)
                    cleaned_skills.append(str(skill_name).strip())
                else:
                    cleaned_skills.append(str(s).strip())
            
            unique_skills = sorted(list(set(s for s in cleaned_skills if s)))
            if not unique_skills:
                return set()

            logger.info(f"🧠 Expanding {len(unique_skills)} skills: {unique_skills[:5]}...")

            prompt = f"""
            You are a Technical Dependency Analyzer.
            
            INPUT: A list of professional skills/technologies.
            OUTPUT: A JSON list containing the original skills PLUS strictly implied technical prerequisites.

            RULES (STRICT MODE):
            1. INCLUDE only HARD DEPENDENCIES. A "Hard Dependency" is a technology that underlies the skill (e.g., Python underlies Django).
            2. INCLUDE supersets/categories if they are technically accurate (e.g., React -> Frontend).
            3. REJECT probabilistic associations. (e.g., Accounting -> Excel is REJECTED because you can do accounting without Excel).
            4. REJECT soft skills or vague concepts.
            5. Output must be a flat list of strings in lowercase.

            EXAMPLES:
            Input: ["Django", "React"]
            Output: ["django", "python", "backend", "react", "javascript", "frontend"]

            Input: ["Chofer", "Contabilidad"]
            Output: ["chofer", "contabilidad"] (No hard dependencies added)

            TARGET SKILLS:
            {unique_skills}

            Return JSON list only.
            """

            # Call LLM with Temperature 0.0 for maximum determinism
            result_list = await self.llm_service.call_agent(
                prompt=prompt,
                input_data={}, # skills are in prompt
                stage_name="SEMANTIC_EXPANSION",
                temperature=0.0
            )

            if result_list and isinstance(result_list, list):
                # Normalize results
                expanded_set = {str(s).lower().strip() for s in result_list}
                logger.info(f"🧠 Expansion result: {len(expanded_set)} items (Original: {len(unique_skills)})")
                return expanded_set
            
            logger.warning("🧠 Semantic expansion returned invalid format breakdown. Returning original skills.")
            return set(unique_skills)

        except Exception as e:
            logger.error(f"Error during semantic expansion: {e}")
            # Fail safe: Return original skills
            return set(unique_skills)

    async def normalize_degrees(self, degrees: List[str]) -> List[str]:
        """
        Normalizes academic degrees to their canonical form.
        Example: "Ing. Civ. Informática" -> "ingeniería civil informática"
        Example: "Médico Cirujano con especialidad en Pediatría" -> "médico cirujano", "pediatría"
        """
        if not degrees:
            return []
            
        try:
            unique_degrees = sorted(list(set(d.strip() for d in degrees if d)))
            if not unique_degrees: return []
            
            logger.info(f"🎓 Normalizing degrees: {unique_degrees}")
            
            prompt = f"""
            You are an Academic Standardization Expert.
            
            TASK: Normalize the following academic titles into their STANDARD CANONICAL FORM (Spanish lowercase).
            
            RULES:
            1. Remove abbreviations (Ing. -> ingeniería).
            2. Remove universities or locations.
            3. Split multi-disciplinary degrees if necessary.
            4. Output strictly a JSON LIST of strings.
            
            INPUT DEGREES:
            {unique_degrees}
            
            OUTPUT EXAMPLE:
            Input: ["Ing. Civil Ind.", "MBA Adolfo Ibañez"]
            Output: ["ingenieria civil industrial", "master of business administration"]
            
            Return JSON list only.
            """
            
            result_list = await self.llm_service.call_agent(
                prompt=prompt,
                input_data={},
                stage_name="SEMANTIC_Normalization",
                temperature=0.0
            )
            
            if result_list and isinstance(result_list, list):
                normalized = [str(d).lower().strip() for d in result_list]
                logger.info(f"🎓 Normalized degrees result: {normalized}")
                return normalized
                
            return unique_degrees # Fallback
            
        except Exception as e:
            logger.error(f"Error normalizing degrees: {e}")
            return degrees
