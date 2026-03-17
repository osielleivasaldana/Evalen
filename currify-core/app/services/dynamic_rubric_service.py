
import logging
from app.services.llm_service import LLMService
from app.models.dynamic_rubric import StructuredRubric

logger = logging.getLogger(__name__)

class DynamicRubricService:
    """
    Service responsible for extracting a Structured Rubric (Checklist) 
    from a vague Job Description.
    """

    def __init__(self):
        self.llm_service = LLMService()

    async def generate_rubric(self, job_title: str, job_description: str, parsed_data: dict = None) -> StructuredRubric:
        """
        Analyzes the Job Description and builds a strict evaluation rubric.
        Input: Job Title + Description
        Output: StructuredRubric object (Validated JSON)
        """
        prompt = f"""
        You are an Expert Recruiter and Job Analyst.
        
        TASK:
        Transform the following Job Description for '{job_title}' into a STRICT EVALUATION RUBRIC (JSON).
        This rubric will be used to mathematically score candidates.

        INSTRUCTIONS:
        1. EDUCATION: Extract exact degree titles required.
           - CRITICAL: Include valid SYNONYMS/VARIATIONS. (e.g. "Computer Science" -> ["Computer Science", "Software Engineering", "Informatics"]).
           - Identify if University level is mandatory.
        2. EXPERIENCE: Extract minimum years numeric. Identify KEY roles they must have held.
           - Include SYNONYMS for roles (e.g. "Sales Manager" -> ["Sales Lead", "Account Executive"]).
           - Identify target industries (e.g. 'Mining', 'Health') ONLY if explicitly mentioned.
        3. SKILLS: Separate into MANDATORY (Must Have) and NICE-TO-HAVE.
           - Mandatory: Skills that if missing, the candidate cannot do the job.
           - Nice-to-Have: Bonus skills.
        4. LOGISTICS: Identify location (City/Comuna). Check for 'Shift Work' (Turnos) or specific modality.
        5. CERTIFICATIONS: Extract any license/cert that is legally required (e.g 'Driving License A4', 'SEC License').
        
        CRITICAL RULES:
        - Be precise. Do not infer "Soft Skills" as "Mandatory Technical Skills".
        - If the Job Description is vague, YOU MUST INFER standard requirements based on the JOB TITLE.
          (e.g., If Title is "Medical Technologist", infer "Medical Technology Degree" as MANDATORY even if not written).
        - "Kill Clause" fields (like Education) must be accurate.
        - If no explicit degree is mentioned but the role implies one (e.g. Doctor, Lawyer, Engineer), LIST IT and its synonyms as required.

        JOB TITLE: {job_title}
        JOB DESCRIPTION:
        {job_description[:5000]} # Truncate to avoid token limits if necessary
        """

        try:
            logger.info(f"🧩 Generating Structured Rubric for job: {job_title}")
            rubric = await self.llm_service.call_agent_structured(
                prompt=prompt,
                input_data={}, # Context is in prompt
                response_model=StructuredRubric,
                stage_name="RUBRIC_EXTRACTION"
            )
            
            # Fallback if None
            if not rubric:
                logger.warning("🧩 LLM returned None for Rubric. returning default.")
                rubric = StructuredRubric()

            # --- POST-PROCESSING ENFORCEMENT ---
            
            # 0. INJECT PARSED SKILLS (Reliability Fix)
            # If we already have parsed structural data (from FastAPI layer), prioritize it!
            if parsed_data and parsed_data.get('requisitos', {}).get('habilidades_requeridas'):
                skills_from_parser = parsed_data['requisitos']['habilidades_requeridas']
                if skills_from_parser:
                    logger.info(f"🧩 Injecting {len(skills_from_parser)} parsed skills into Rubric as Mandatory.")
                    # Merge logic: Add if not present
                    current_mandatory = set(s.lower() for s in rubric.skills.mandatory_skills)
                    for skill in skills_from_parser:
                        if skill.lower() not in current_mandatory:
                            rubric.skills.mandatory_skills.append(skill)
            
            # If Job Description was too vague and LLM didn't extract degrees,
            # we MUST inject the Job Title itself as a required degree logic.
            # e.g. Job: "Medical Technologist" -> Req: ["Medical Technologist"]
            
            # CRITICAL: Do NOT inject the generic fallback title, as it will cause FALSE NEGATIVES (0 Score)
            GENERIC_FALLBACK = "Requerimientos Técnicos Generales"
            
            if not rubric.education.required_degrees and job_title != GENERIC_FALLBACK:
                logger.info(f"🧩 Empty Required Degrees. Injecting Job Title '{job_title}' as mandatory requirement.")
                rubric.education.required_degrees = [job_title]
                rubric.education.kill_clause = True # Enforce strictness

            # Likewise for Experience Roles
            if not rubric.experience.key_roles and job_title != GENERIC_FALLBACK:
                logger.info(f"🧩 Empty Key Roles. Injecting Job Title '{job_title}' as mandatory role for experience.")
                rubric.experience.key_roles = [job_title]
                rubric.experience.industry_mandatory = True # Assume strict industry match needed if we had to force it

            logger.info(f"🧩 Rubric Generated Successfully. Mandatory Skills: {len(rubric.skills.mandatory_skills)}")
            return rubric

        except Exception as e:
            logger.error(f"Error generating dynamic rubric: {e}")
            return StructuredRubric()
