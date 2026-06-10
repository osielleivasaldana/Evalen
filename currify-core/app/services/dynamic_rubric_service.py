
import logging
from typing import Optional
from app.services.llm_service import LLMService
from app.models.dynamic_rubric import StructuredRubric

logger = logging.getLogger(__name__)

class DynamicRubricService:
    """
    Service responsible for extracting a Structured Rubric (Checklist) 
    from a vague Job Description.
    """

    def __init__(self, llm_service: Optional[LLMService] = None):
        self.llm_service = llm_service or LLMService()

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
            
            # CRITICAL: Do NOT inject the generic fallback title, as it will cause FALSE NEGATIVES (0 Score)
            GENERIC_FALLBACK = "Requerimientos Técnicos Generales"

            if not rubric.education.required_degrees and job_title != GENERIC_FALLBACK:
                # En lugar de inyectar job_title como grado requerido (autocirculación),
                # inferir el campo de estudio real desde el título del cargo usando LLM.
                inferred_degree = await self._infer_degree_from_title(job_title)
                if inferred_degree:
                    logger.info(f"🧩 Inferred degree '{inferred_degree}' from job title '{job_title}'.")
                    rubric.education.required_degrees = [inferred_degree]
                    rubric.education.kill_clause = False  # No kill clause porque es inferido
                    rubric.education.is_inferred_degree = True
                else:
                    logger.info(f"🧩 No degree inferred from '{job_title}'. Leaving empty (scoring will infer from level).")
                    # scoring_service se encargará de inferir desde job_title usando nivel académico + campo

            # Likewise for Experience Roles
            if not rubric.experience.key_roles and job_title != GENERIC_FALLBACK:
                logger.info(f"🧩 Empty Key Roles. Injecting Job Title '{job_title}' as mandatory role for experience.")
                rubric.experience.key_roles = [job_title]
                rubric.experience.industry_mandatory = False  # No forzar industria si es inferido

            # Ensure the is_inferred_degree field exists (backward compat)
            if not hasattr(rubric.education, 'is_inferred_degree'):
                rubric.education.is_inferred_degree = False

            logger.info(f"🧩 Rubric Generated Successfully. Mandatory Skills: {len(rubric.skills.mandatory_skills)}")
            return rubric

        except Exception as e:
            logger.error(f"Error generating dynamic rubric: {e}")
            return StructuredRubric()

    async def _infer_degree_from_title(self, job_title: str) -> Optional[str]:
        """
        Usa el LLM para inferir qué título académico estándar requiere un puesto.
        Ej: 'Médico Veterinario' → 'Medicina Veterinaria'
            'Desarrollador Full Stack' → 'Ingeniería Informática o afín'
            'Recepcionista' → None (no requiere título específico)
        """
        try:
            prompt = f"""
            Eres un orientador vocacional y experto en RRHH.

            Dado el siguiente título de puesto de trabajo, infiere cuál es el TÍTULO
            ACADÉMICO estándar que normalmente se requiere para ejercerlo.

            Reglas:
            - Sé preciso. No generalices a 'cualquier título universitario'.
            - Si el puesto no requiere un título específico
              (ej. 'Recepcionista', 'Vendedor'), responde 'NONE'.
            - Si el puesto típicamente requiere una carrera
              (ej. 'Médico Veterinario' requiere 'Medicina Veterinaria'),
              responde SOLO el nombre del título en español.
            - No incluyas niveles (técnico/universitario), solo el nombre del título.

            Título del puesto: {job_title}

            Respuesta (nombre del título o 'NONE'):
            """

            result = await self.llm_service.call_agent(
                prompt=prompt,
                input_data="",
                stage_name="INFER_DEGREE_FROM_TITLE",
                temperature=0.0
            )

            if isinstance(result, str):
                cleaned = result.strip().strip('"').strip("'").strip()
                if cleaned.upper() == "NONE" or not cleaned:
                    return None
                return cleaned
            return None

        except Exception as e:
            logger.error(f"Error inferring degree from title '{job_title}': {e}")
            return None
