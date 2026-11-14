
import json
import logging
from typing import Optional
from app.core.config import settings
from app.services.llm_service import LLMService
from app.models.dynamic_rubric import StructuredRubric
from app.services.skill_classification import is_soft_skill

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
           - Mandatory = EXCLUSIVE conditions ONLY ("Requisito:", required professional
             title, legally required certification). If missing, the candidate cannot do the job.
           - Nice-to-Have = complementary capabilities phrased as "deseable", "se valora",
             "valorable", "ideal", complementary tools, or BASIC tool proficiency.
           - CLASSIFICATION EXAMPLES (follow them strictly):
             * "Manejo de herramientas tecnológicas básicas para la planificación" -> NICE-TO-HAVE
               (basic/complementary tools are NOT exclusive conditions).
             * "Deseable experiencia con SAP" -> NICE-TO-HAVE.
             * "Se valora inglés avanzado" -> NICE-TO-HAVE.
             * "Título de Educadora de Párvulos (excluyente)" -> MANDATORY (explicit exclusive condition).
             * "Licencia SEC indispensable" -> MANDATORY (legal requirement).
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
            # Batch-fix F2 (2026-08-25): filtro anti-soft DETERMINISTA — una entrada
            # clasificable como blanda (léxico estático, sin LLM) NUNCA entra a
            # mandatory_skills; se redirige a skills.soft_skills (bucket correcto).
            if parsed_data and parsed_data.get('requisitos', {}).get('habilidades_requeridas'):
                skills_from_parser = parsed_data['requisitos']['habilidades_requeridas']
                if skills_from_parser:
                    logger.info(f"🧩 Injecting {len(skills_from_parser)} parsed skills into Rubric (filtro anti-soft activo).")
                    # Merge logic: Add if not present
                    current_mandatory = set(s.lower() for s in rubric.skills.mandatory_skills)
                    current_soft = set(s.lower() for s in (getattr(rubric.skills, 'soft_skills', None) or []))
                    for skill in skills_from_parser:
                        s_clean = str(skill).strip()
                        if not s_clean:
                            continue
                        s_key = s_clean.lower()
                        if is_soft_skill(s_clean):
                            if s_key not in current_soft and s_key not in current_mandatory:
                                rubric.skills.soft_skills.append(s_clean)
                                current_soft.add(s_key)
                                logger.info(f"🧩 Anti-soft: '{s_clean}' redirigida a skills.soft_skills (no mandatory)")
                            continue
                        if s_key not in current_mandatory:
                            rubric.skills.mandatory_skills.append(s_clean)
                            current_mandatory.add(s_key)

            # Fase B P3 (SDD §4.3): re-clasificación determinista mandatory→nice.
            # Orden OBLIGATORIO: DESPUÉS del filtro anti-soft (una blanda ya fue
            # desviada a soft_skills y NUNCA llega aquí como mandatory). Gated por
            # RUBRIC_TIER_RECLASS (default OFF = comportamiento actual intacto).
            # REGLA DE ORO: jamás promover a mandatory; solo degradar a nice con
            # evidencia léxica explícita (classify_requirement_tier).
            if getattr(settings, "rubric_tier_reclass", False):
                from app.services.rubric_tier_classifier import (
                    classify_requirement_tier,
                    normalize_requirement_text,
                    structured_reclass_log_payload,
                    first_triggering_hint,
                    record_reclass_event,
                )

                still_mandatory = []
                current_nice_lower = set(
                    s.lower() for s in (rubric.skills.nice_to_have_skills or [])
                )
                for skill in rubric.skills.mandatory_skills:
                    decision = classify_requirement_tier(skill)
                    if decision == "nice":
                        pista = first_triggering_hint(normalize_requirement_text(skill))
                        if skill.lower() not in current_nice_lower:
                            rubric.skills.nice_to_have_skills.append(skill)
                            current_nice_lower.add(skill.lower())
                        event = record_reclass_event(
                            requisito_original=skill,
                            decision="nice",
                            pista=pista,
                        )
                        logger.info(
                            "🧩 [TIER-RECLASS] %s",
                            structured_reclass_log_payload(event),
                        )
                        continue  # degradado: sale de mandatory
                    # "mandatory" (confirmado con evidencia fuerte) o None
                    # (sin pista → se respeta el LLM): permanece en mandatory.
                    still_mandatory.append(skill)
                if len(still_mandatory) != len(rubric.skills.mandatory_skills):
                    logger.info(
                        "🧩 Tier-reclass: mandatory %d -> %d (degradados a nice_to_have).",
                        len(rubric.skills.mandatory_skills),
                        len(still_mandatory),
                    )
                    rubric.skills.mandatory_skills = still_mandatory
            
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
