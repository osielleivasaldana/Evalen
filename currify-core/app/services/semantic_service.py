
import logging
from typing import List, Set, Optional
from app.services.llm_service import LLMService

logger = logging.getLogger(__name__)

class SemanticService:
    """
    Service responsible for Semantic Expansion of skills and Role Normalization.
    Ensures that implicit technical knowledge and job titles are standardized for deterministic scoring.
    """
    
    def __init__(self, llm_service: Optional[LLMService] = None):
        self.llm_service = llm_service or LLMService()
        self._embedding_cache = {}

    async def get_text_embedding(self, text: str) -> List[float]:
        """Obtiene embedding con caché simple en memoria"""
        if text in self._embedding_cache:
            return self._embedding_cache[text]
        
        vector = await self.llm_service.get_embedding(text)
        if vector:
            self._embedding_cache[text] = vector
        return vector

    def _cosine_similarity(self, v1: List[float], v2: List[float]) -> float:
        """Calcula similitud coseno sin dependencias externas (numpy)"""
        if not v1 or not v2: return 0.0
        dot_product = sum(a*b for a, b in zip(v1, v2))
        magnitude1 = sum(a*a for a in v1) ** 0.5
        magnitude2 = sum(a*a for a in v2) ** 0.5
        if magnitude1 == 0 or magnitude2 == 0: return 0.0
        return dot_product / (magnitude1 * magnitude2)

    async def calculate_similarity(self, text1: str, text2: str) -> float:
        """Calcula similitud semántica entre dos textos (0.0 a 1.0)"""
        # Optimización rápida: si son iguales, 1.0
        if text1.lower().strip() == text2.lower().strip():
            return 1.0
            
        v1 = await self.get_text_embedding(text1)
        v2 = await self.get_text_embedding(text2)
        return self._cosine_similarity(v1, v2)

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
            You are a Technical Dependency Analyzer operating in STRICT MODE.

            TASK: Expand each skill to include ONLY its hard technical prerequisites.

            HARD DEPENDENCY RULES (ABSOLUTE):
            1. A "Hard Dependency" means the skill CANNOT EXIST without the prerequisite.
               Example: Django cannot exist without Python. Therefore Python IS included.
            2. INCLUDE the SKILL ITSELF in the output list.
            3. REJECT categories, domains, or fields of application.
               Example: "React" → "frontend" is REJECTED (frontend is a category).
               Example: "Python" → "data science" is REJECTED (data science is a field).
               Example: "Excel" → "spreadsheets" is REJECTED (Excel IS the tool itself).
            4. REJECT probabilistic associations.
               Example: "Accounting" → "Excel" is REJECTED (accounting can be done without Excel).
               Example: "Management" → "leadership" is REJECTED (not a technical dependency).
            5. REJECT soft skills, vague concepts, or industries.
            6. Output must be a flat JSON list of strings in lowercase.
            7. When in doubt, DO NOT include it.

            EXAMPLES:
            Input: ["Django", "React"]
            Output: ["django", "python", "react", "javascript"]
            (Explanation: Python is hard dependency of Django. JavaScript is hard dependency of React.
             "frontend" and "backend" are REJECTED because they are CATEGORIES, not dependencies.)

            Input: ["Chofer", "Contabilidad"]
            Output: ["chofer", "contabilidad"]
            (No hard dependencies added. "Conducir" is already the skill itself.
             "Excel" is REJECTED because you can do accounting without Excel.)

            Input: ["Docker"]
            Output: ["docker", "containerization", "linux"]
            (Linux is hard dependency of Docker. Containerization IS the technology.)

            Input: ["TensorFlow"]
            Output: ["tensorflow", "python"]
            (Python is hard dependency. "machine learning" is REJECTED because it's a field, not dependency.)

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

    async def extract_skills_from_description(self, text: str) -> Set[str]:
        """
        Extracts implicit skills and domain knowledge from free text.
        This handles cases where a candidate describes experience (e.g. "Managed a Magento store") 
        but forgets to list "E-commerce" or "Magento" in their skills section.
        """
        if not text or len(text) < 50:
            return set()
            
        try:
            logger.info("🕵️ Starting Latent Skill Extraction from text...")
            
            # Truncate text to avoid token limits if necessary (e.g. first 3000 chars is usually enough context)
            truncated_text = text[:4000]

            prompt = f"""
            You are a Technical Recruiter and Domain Expert.
            
            TASK: Analyze the following professional experience text and EXTRACT all technical skills, 
            tools, software, methodologies, and DOMAIN KNOWLEDGE mentioned or strongly implied.
            
            RULES:
            1. Extract explicit tools (e.g., "Excel", "Python", "SAP").
            2. Extract DOMAIN knowledge (e.g., "Retail", "E-commerce", "Banking", "Logistics"). 
               If the text says "worked at Walmart", you MUST extract "Retail".
            3. Extract implied roles/skills (e.g., "Managed cash register" -> "POS", "Cash Handling").
            4. Normalize to standard English or Spanish terms (lowercase).
            5. Return a flat JSON list of strings.
            6. Be generous but accurate.
            
            TEXT TO ANALYZE:
            "{truncated_text}"
            
            Return JSON list only.
            """
            
            result_list = await self.llm_service.call_agent(
                prompt=prompt,
                input_data={},
                stage_name="LATENT_SKILL_EXTRACTION",
                temperature=0.0
            )
            
            if result_list and isinstance(result_list, list):
                extracted_set = {str(s).lower().strip() for s in result_list}
                logger.info(f"🕵️ Latent Skills Extracted: {len(extracted_set)} items")
                logger.debug(f"Extracted: {list(extracted_set)[:10]}...")
                return extracted_set
            
            return set()
            
        except Exception as e:
            logger.error(f"Error during latent skill extraction: {e}")
            return set()

    async def normalize_job_titles(self, titles: List[str]) -> List[str]:
        """
        Normalizes job titles to a standard industry form to allow fuzzy matching.
        Example: "Automatizador QA" -> "QA Automation Engineer"
        Example: "Vendedor de Terreno" -> "Field Sales Representative"
        """
        if not titles:
            return []
            
        try:
            unique_titles = sorted(list(set(t.strip() for t in titles if t)))
            if not unique_titles: return []
            
            logger.info(f"👔 Normalizing Job Titles: {unique_titles}")
            
            prompt = f"""
            You are a HR Classification Expert.
            
            TASK: Normalize the following job titles to their STANDARD INDUSTRY FORM (English or Spanish Neutral).
             The goal is to make them comparable.
            
            RULES:
            1. Use the most common international standard (e.g., "QA Automation" is better than "Automatizador de Pruebas").
            2. Preserve seniority if present (Senior, Junior, Lead).
            3. Output a 1-to-1 mapped JSON list corresponding to the input order (or just a flat list of normalized unique titles).
            4. If a title is already standard, keep it.
            
            INPUT TITLES:
            {unique_titles}
            
            OUTPUT EXAMPLE:
            Input: ["Jefe de Ventas", "Software Eng."]
            Output: ["sales manager", "software engineer"]
            
            Return JSON list only.
            """
            
            result_list = await self.llm_service.call_agent(
                prompt=prompt,
                input_data={},
                stage_name="ROLE_NORMALIZATION",
                temperature=0.0
            )
            
            if result_list and isinstance(result_list, list):
                normalized = [str(t).lower().strip() for t in result_list]
                logger.info(f"👔 Normalized Titles Result: {normalized}")
                return normalized
                
            return unique_titles # Fallback
            
        except Exception as e:
            logger.error(f"Error normalizing job titles: {e}")
            return titles
