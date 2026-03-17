"""
Scoring Service
Evaluates candidate-job fit using AI and structured rubric
"""

import json
import logging
from typing import Dict, Any, Optional
from app.services.llm_service import LLMService
from app.core.scoring_rubric import ScoringRubric
from app.services.dynamic_rubric_service import DynamicRubricService
from app.models.scoring import ScoringResponse, DimensionScore
from app.services.education_normalizer import EducationNormalizer
from app.services.semantic_service import SemanticService # Moved to top
import asyncio

logger = logging.getLogger(__name__)


class ScoringService:
    """Service for evaluating candidate-job matching"""

    def __init__(self):
        self.llm_service = LLMService()
        self.rubric = ScoringRubric()
        self.dynamic_rubric_service = DynamicRubricService()
        self.education_normalizer = EducationNormalizer()
        self.semantic_service = SemanticService()

    async def evaluate_candidate(
        self,
        candidate_data: Dict[str, Any],
        job_data: Dict[str, Any]
    ) -> Optional[ScoringResponse]:
        """
        Evaluate candidate-job fit using AI and structured rubric (Scoring v3 - Global Intelligence)
        """
        try:
            logger.info("Starting candidate-job scoring evaluation (v3: Latent Skills & Normalized Roles)")
            
            # 0. GUARDRAIL: Short-circuit if extraction failed
            titular = candidate_data.get('titular_profesional', {}).get('titular', '')
            has_skills = any(candidate_data.get('habilidades', {}).values()) if isinstance(candidate_data.get('habilidades'), dict) else False
            has_experience = len(candidate_data.get('experiencia_laboral', [])) > 0
            has_education = len(candidate_data.get('formacion_academica', [])) > 0
            
            # Allow evaluation if we have at least SOME meaningful matching data
            if not has_experience and not has_skills and not has_education:
                logger.warning("⚠️ Extraction failed or empty data detected. Returning 0 score.")
                return ScoringResponse(
                    overall_score=0.0,
                    recommendation="weak_fit",
                    breakdown={},
                    strengths=[],
                    gaps=["Error en la extracción de datos del CV"],
                    summary="No se pudo procesar el contenido del CV para realizar la evaluación."
                )

            # 1. Semantic Layer: Global Intelligence Extraction
            # semantic_service already initialized
            semantic_service = self.semantic_service
            
            # A. Latent Skill Discovery (Extract from Text)
            # Combine all relevant text to find hidden gems (e.g. "Managed Magento store" implies "E-commerce")
            full_text_parts = []
            if candidate_data.get('resumen_profesional'):
                full_text_parts.append(str(candidate_data['resumen_profesional'].get('resumen', '')))
            
            for exp in candidate_data.get('experiencia_laboral', []):
                full_text_parts.append(str(exp.get('responsabilidades', '')))
                full_text_parts.append(str(exp.get('cargo', '')))
                
            full_experience_text = " ".join(full_text_parts)
            
            # call AI to extract implicit skills
            latent_skills = await semantic_service.extract_skills_from_description(full_experience_text)
            
            # B. Standard Skill Extraction
            raw_skills = []
            if isinstance(candidate_data.get('habilidades'), dict):
                habs = candidate_data['habilidades']
                # SAFE GUARD: Ensure all skills are strings
                for skill in habs.get('habilidades_tecnicas', []):
                    if isinstance(skill, str):
                        raw_skills.append(skill)
                    elif isinstance(skill, dict):
                        # Attempt to get 'name' or similar if it's an object
                        val = skill.get('habilidad') or skill.get('name') or skill.get('skill') or str(skill)
                        if val: raw_skills.append(str(val))
                    else:
                        raw_skills.append(str(skill))
            
            # MERGE Explicit + Latent Skills
            combined_skills = set(raw_skills).union(latent_skills)
            
            # C. Semantic Expansion (The usual expanding of dependencies)
            expanded_skills_set = await semantic_service.expand_skills(list(combined_skills))
            expanded_skills_list = sorted(list(expanded_skills_set))
            
            logger.info(f"🚀 FINAL Expanded Skills (Explicit + Latent): {len(expanded_skills_list)} items")

            # D. Role Normalization
            # Normalize Candidate Roles
            candidate_roles_raw = [str(exp.get('cargo', '')) for exp in candidate_data.get('experiencia_laboral', [])]
            normalized_candidate_roles = await semantic_service.normalize_job_titles(candidate_roles_raw)
            logger.info(f"👔 Normalized Candidate Roles: {normalized_candidate_roles} (from {candidate_roles_raw})")
            
            # Normalize Candidate Degrees
            raw_degrees = [str(edu.get('titulo', '')) for edu in candidate_data.get('formacion_academica', [])]
            normalized_degrees = []
            if raw_degrees:
                normalized_degrees = await semantic_service.normalize_degrees(raw_degrees)

            # 2. Rubric Extraction
            job_title = str(job_data.get('title') or job_data.get('job_title') or job_data.get('position') or job_data.get('cargo') or '')
            job_desc = str(job_data.get('description', ''))
            
            if not job_title.strip():
                job_title = "Requerimientos Técnicos Generales"
            
            structured_rubric = await self.dynamic_rubric_service.generate_rubric(job_title, job_desc, parsed_data=job_data)
            
            # Normalize Rubric Required Roles (to match standardized candidate roles)
            rubric_roles_raw = getattr(structured_rubric.experience, 'key_roles', []) or []
            
            # FALLBACK: If Rubric missed Education but parsedJobData has it, inject it
            if not getattr(structured_rubric.education, 'required_degrees', []):
                 parsed_edu = job_data.get('parsedJobData', {}).get('educacion')
                 if parsed_edu:
                     logger.info(f"⚠️ Rubric missed Education, injecting from parsedJobData: {parsed_edu}")
                     structured_rubric.education.required_degrees = [str(parsed_edu)]
            
            normalized_rubric_roles = await semantic_service.normalize_job_titles(rubric_roles_raw)
            logger.info(f"👔 Normalized Rubric Roles: {normalized_rubric_roles} (from {rubric_roles_raw})")


            # 3. Mathematical Scoring (Stage 2 - Matrix Execution)
            baseline_scores = await self._calculate_matrix_scores(
                candidate_data, 
                structured_rubric, 
                expanded_skills=expanded_skills_list,
                normalized_degrees=normalized_degrees,
                normalized_candidate_roles=normalized_candidate_roles,
                normalized_rubric_roles=normalized_rubric_roles,
                job_soft_skills=job_data.get('parsedJobData', {}).get('habilidades_blandas', []),
                job_title=job_title # Added job_title
            )
            logger.info(f"🧮 Matrix Scores: {baseline_scores}")

            # Generate evaluation prompt
            prompt = self._build_evaluation_prompt_with_rubric(structured_rubric, baseline_scores)
            
            input_data = json.dumps({
                "candidate": candidate_data,
                "job_rubric": structured_rubric.dict(),
                "semantic_analysis": {
                    "expanded_skills": expanded_skills_list,
                    "normalized_degrees": normalized_degrees,
                    "normalized_roles": normalized_candidate_roles
                },
                "deterministic_metrics": baseline_scores,
                "rubric_weights": ScoringRubric.WEIGHTS
            }, ensure_ascii=False, indent=2)

            # Call LLM for evaluation
            result = await self.llm_service.call_agent(
                prompt=prompt,
                input_data=input_data,
                stage_name="SCORING_EVALUATION",
                temperature=0.0
            )

            if not result:
                logger.error("LLM returned no result for scoring")
                return None

            scoring_response = self._parse_llm_response(result, deterministic_scores=baseline_scores)

            if scoring_response:
                logger.info(f"Scoring completed: {scoring_response.overall_score:.1f}/100")

            return scoring_response

        except Exception as e:
            logger.error(f"Error during scoring evaluation: {e}", exc_info=True)
            return None
    
    async def _calculate_matrix_scores(self, candidate, rubric, expanded_skills=None, normalized_degrees=None, normalized_candidate_roles=None, normalized_rubric_roles=None, job_soft_skills=None, job_title="") -> Dict[str, Any]:
        """
        Executes the Detailed Scoring Matrix (The Contract).
        Returns raw scores (0-100) per dimension.
        """
        scores = {}
        
        # --- PRE-CALCULATION DEFINITIONS ---
        mandatory_raw = getattr(rubric.skills, 'mandatory_skills', []) or []
        mandatory = set(str(s).lower() for s in mandatory_raw if s)

        # --- PREFETCH EMBEDDINGS (Parallel) ---
        # Identify all text that needs comparison to warm up the cache
        req_titles_raw = getattr(rubric.education, 'required_degrees', []) or []
        req_titles = [str(t).lower().strip() for t in req_titles_raw if t and str(t).strip()]
        
        cand_degrees_to_check = normalized_degrees if normalized_degrees else [
            str(edu.get('titulo', '')) for edu in candidate.get('formacion_academica', []) if edu.get('titulo')
        ]
        
        if normalized_rubric_roles:
            req_roles = [str(r).lower().strip() for r in normalized_rubric_roles if r]
        else:
            req_roles = [str(r).lower().strip() for r in (getattr(rubric.experience, 'key_roles', []) or []) if r]
            
        cand_roles_to_check = normalized_candidate_roles if normalized_candidate_roles else [
            str(exp.get('cargo', '')).lower() for exp in (candidate.get('experiencia_laboral', []) or [])
        ]

        # Gather all unique texts
        all_texts = set(req_titles + cand_degrees_to_check + req_roles + cand_roles_to_check)
        if all_texts:
            logger.info(f"🧠 Prefetching embeddings for {len(all_texts)} terms...")
            await asyncio.gather(*[self.semantic_service.get_text_embedding(t) for t in all_texts if t])
        
        logger.info(f"debug_edu: req_titles={req_titles}, cand_degrees={cand_degrees_to_check}")
        
        has_title_match = False
        
        # Helper for Semantic Matching
        async def _semantic_match(req_phrase: str, cand_phrase: str, threshold: float = 0.85) -> bool:
            # 1. Direct match check
            if req_phrase == cand_phrase: return True
            # 2. Semantic Similarity (Threshold > 0.85)
            # Since we prefetched, this should be fast (using cache)
            # Use await explicitly
            sim = await self.semantic_service.calculate_similarity(req_phrase, cand_phrase)
            return sim > threshold

        if not req_titles:
            # FALLBACK: Try to infer education from Job Title
            # e.g. "Ingeniero de Software" -> Implies "Ingeniero" (Level 6)
            job_title_level, _ = self.education_normalizer.normalize_degree(job_title)
            if job_title_level > 0:
                logger.info(f"🎓 Inferring required education level {job_title_level} from Job Title '{job_title}'")
                
                # Check Candidate Level
                max_cand_level = 0
                for d in cand_degrees_to_check:
                     l, _ = self.education_normalizer.normalize_degree(d)
                     if l > max_cand_level: max_cand_level = l
                
                if max_cand_level >= job_title_level:
                    scores['education'] = 100 # Met implied requirement
                elif max_cand_level > 0:
                    scores['education'] = 60 # Has degree but lower level
                else:
                    scores['education'] = 0
            else:
                # Default to Neutral (50) if they have some education, else 0.
                scores['education'] = 50 if len(cand_degrees_to_check) > 0 else 0
        else:
            # NEW: Hierarchical Matching
            req_level = self.education_normalizer.extract_required_level(req_titles)
            
            has_level_match = False
            has_text_match = False
            
            # Check if any req title has multiple options split by comma or ' o '
            expanded_req_titles = []
            for t in req_titles:
                parts = t.replace(' o ', ',').split(',')
                for p in parts:
                    if p.strip(): expanded_req_titles.append(p.strip())
            
            final_req_titles = expanded_req_titles if expanded_req_titles else req_titles

            for deg in cand_degrees_to_check:
                # 1. Level Check
                cand_level, _ = self.education_normalizer.normalize_degree(deg)
                if req_level > 0 and self.education_normalizer.check_level_match(cand_level, req_level):
                    has_level_match = True
                
                # 2. Text Check (Semantic)
                for req in final_req_titles:
                    if await _semantic_match(req, deg):
                        has_text_match = True
                        break
            
            if has_text_match:
                scores['education'] = 100
            elif has_level_match:
                 # The candidate has the required academic LEVEL (e.g., Master's), but the FIELD OF STUDY (semantic text check) 
                 # did NOT cross the similarity threshold for the required degrees (e.g., MBA instead of Computer Science).
                 # We shouldn't give 90 points for an unrelated degree.
                scores['education'] = 40
            elif rubric.education.kill_clause:
                # SOFTEN KILL CLAUSE: Only kill if level is significantly lower (e.g. 4 vs 6)
                # If we had partial matches or just mismatched field, give partial credit
                # Heuristic: If has *any* degree (level > 0), give 40-50 instead of 0
                max_cand_level = 0
                for d in cand_degrees_to_check:
                     l, _ = self.education_normalizer.normalize_degree(d)
                     if l > max_cand_level: max_cand_level = l
                
                if max_cand_level >= req_level - 1: # Close enough in level (e.g. required 6, got 5)
                     scores['education'] = 60 # Penalty but not 0
                elif max_cand_level > 0:
                     scores['education'] = 30 # Something is something
                else:
                    scores['education'] = 0 
            else:
                 # If no kill clause, give small credit for having SOME degree
                scores['education'] = 30

        # --- 2. EXPERIENCE (25%) ---
        # Sub-weights: Roles (50%), Years (30%), Industry (20%)
        # Refined: If no Rubric Roles, default to 50 (Neutral) not 100
        # USE NORMALIZED ROLES IF AVAILABLE
        if normalized_rubric_roles:
            req_roles = [str(r).lower().strip() for r in normalized_rubric_roles if r]
        else:
            key_roles_raw = getattr(rubric.experience, 'key_roles', []) or []
            req_roles = [str(r).lower().strip() for r in key_roles_raw if r and str(r).strip()]
            
        # USE NORMALIZED CANDIDATE ROLES IF AVAILABLE
        cand_roles_to_check = []
        if normalized_candidate_roles:
             cand_roles_to_check = normalized_candidate_roles
        else:
             cand_exps = candidate.get('experiencia_laboral', []) or []
             cand_roles_to_check = [str(exp.get('cargo', '')).lower() for exp in cand_exps]

        cand_exps = candidate.get('experiencia_laboral', []) or []
        
        # A. Roles Match
        role_match_score = 0
        roles_mismatch = False # Flag to penalize other sub-dimensions
        
        if not req_roles: 
            # FALLBACK: Use Job Title as required role if no specific key roles found
            logger.info(f"⚠️ No key_roles in rubric. Using Job Title '{job_title}' as required role.")
            req_roles = [job_title.lower().strip()]
            used_fallback_role = True # Flag to prevent regression
        else:
            used_fallback_role = False
            
        # Re-check if still empty (safety)
        if not req_roles:
            role_match_score = 50 
        else:
            # Check CURRENT role (index 0) AND PREVIOUS role (index 1)
            # to avoid penalizing if they are currently in a generic role but were specialized before
            current_role_match = False
            previous_role_match = False
            
            # Check Current Role (First in list)
            if cand_roles_to_check:
                 curr = str(cand_roles_to_check[0])
                 # Since we normalized, we can try Direct Exact Match first for speed and accuracy
                 if curr in req_roles:
                     current_role_match = True
                 elif any([await _semantic_match(req, curr) for req in req_roles if len(req) > 2]):
                     current_role_match = True
            
            # Check Previous Role (Second in list)
            if len(cand_roles_to_check) > 1:
                 prev = str(cand_roles_to_check[1])
                 if prev in req_roles:
                     previous_role_match = True
                 elif any([await _semantic_match(req, prev) for req in req_roles if len(req) > 2]):
                     previous_role_match = True

            if current_role_match:
                role_match_score = 100
            elif previous_role_match:
                role_match_score = 90 # High credit for recent experience
            else:
                # Iterate ALL roles for "some" match
                matched_count = 0
                for role in cand_roles_to_check:
                    if role in req_roles:
                        matched_count += 1
                        continue
                        
                    if any([await _semantic_match(req, role) for req in req_roles if len(req) > 2]):
                        matched_count += 1
                
                if matched_count > 0:
                     role_match_score = 70 # Found somewhere in history
                else:
                    # ROLE ADJACENCY CHECK (Generic Transferability)
                    if mandatory:
                         # Join all responsibilities text safely
                         text_parts = []
                         for e in cand_exps:
                             c = str(e.get('cargo') or '')
                             r = str(e.get('responsabilidades') or '')
                             text_parts.append(c)
                             text_parts.append(r)
                         
                         all_exp_text = " ".join(text_parts).lower()
                         
                         # Count how many mandatory skills appear in experience
                         skill_in_exp_count = sum(1 for s in mandatory if s.lower() in all_exp_text)
                         skill_coverage = skill_in_exp_count / len(mandatory) if len(mandatory) > 0 else 0
                         
                         if skill_coverage > 0.4: # If they used >40% of stack in mismatched role
                             role_match_score = 60 # Significant recovery from 20
                             roles_mismatch = True # Still a mismatch, but softer
                         else:
                             role_match_score = 20
                             roles_mismatch = True
                    else:
                        role_match_score = 20 # Mismatch penalty
                        roles_mismatch = True
        
        # CHECK FALLBACK REGRESSION (added)
        # CHECK FALLBACK REGRESSION (added)
        if used_fallback_role:
             if role_match_score < 50:
                 logger.info(f"⚠️ Fallback Role Match failed (Score {role_match_score}). Reverting to Neutral (50).")
                 role_match_score = 50
             # Always clear mismatch flag if we used fallback, 
             # because we aren't sure enough to penalize career history.
             roles_mismatch = False 

        # B. Years Constraint
        # If roles don't match (e.g. Accountant in Trucking Co), years are less valuable.
        base_years = 100 if len(cand_exps) >= 2 else (60 if len(cand_exps) == 1 else 0)
        years_score = base_years if not roles_mismatch else (base_years * 0.5)
        
        # C. Industry
        # If roles don't match, industry context is likely irrelevant or different department
        industry_score = 100 if not roles_mismatch else 50
        
        scores['experience'] = (role_match_score * 0.5) + (years_score * 0.3) + (industry_score * 0.2)
        scores['experience'] = min(100, scores['experience'])

        # --- 3. SKILLS (30%) ---
        # mandatory already defined above

        expanded_cand_skills = set()
        if expanded_skills:
            expanded_cand_skills = set(str(s).lower() for s in expanded_skills if s)
        
        if not mandatory:
            minutes_skills_score = 50 # Neutral if no skills listed 
            # If candidate has tech skills, boost
            if expanded_cand_skills: minutes_skills_score = 70
            mandatory_score = minutes_skills_score
        else:
            matches = mandatory.intersection(expanded_cand_skills)
            missing = mandatory - expanded_cand_skills
            
            # DEEP SEARCH for Missing Skills in Experience/Summary Text
            if missing:
                # Build context text (Summary + Responsibilities)
                context_parts = []
                if candidate.get('resumen_profesional'):
                    context_parts.append(str(candidate['resumen_profesional'].get('resumen', '')))
                for exp in cand_exps:
                    context_parts.append(str(exp.get('responsabilidades', '')))
                    context_parts.append(str(exp.get('cargo', '')))
                
                full_text_lower = " ".join(context_parts).lower()
                
                for skill in missing:
                    # Simple check: is skill name in text?
                    # TODO: Robust word boundary check
                    if skill in full_text_lower:
                        matches.add(skill)
                        logger.info(f"🔍 Deep Search found '{skill}' in candidate text!")

            coverage = len(matches) / len(mandatory) if mandatory else 0.0
            mandatory_score = coverage * 100
            
        nice = set(s.lower() for s in rubric.skills.nice_to_have_skills)
        nice_matches = nice.intersection(expanded_cand_skills)
        nice_bonus = min(len(nice_matches) * 10, 20) # Max 20 pts bonus
        
        scores['skills_match'] = min(100, (mandatory_score * 0.8) + (nice_bonus * 0.2 if mandatory_score > 0 else 0))

        # --- 4. OTHERS ---
        
        # LOGISTICS (City/Region Match)
        # If strict location required, check match.
        logistics_score = 100
        if rubric.logistics.location:
            req_loc = rubric.logistics.location.lower()
            # Try to match with ANY location in candidate contact info
            cand_loc = ""
            if candidate.get('datos_contacto'):
                cand_loc = str(candidate['datos_contacto'].get('ubicacion', '')).lower()
            
            # Simple substring match (e.g. "Temuco" in "Temuco, Chile")
            if req_loc in cand_loc:
                logistics_score = 100
            else:
                # If specific location requested but not found -> 0 (Kill Clause for logistics)
                logistics_score = 0
        
        scores['logistics'] = logistics_score
        
        # Cultural Fit - Soft Skills Match
        # If soft skills provided in job description (parsedJobData), check for them
        cultural_score = 50 # Default
        if job_soft_skills and isinstance(job_soft_skills, list) and len(job_soft_skills) > 0:
             # Build Text
             context_parts = []
             if candidate.get('resumen_profesional'):
                 context_parts.append(str(candidate['resumen_profesional'].get('resumen', '')))
             for exp in cand_exps:
                 context_parts.append(str(exp.get('responsabilidades', '')))
             
             full_text_lower = " ".join(context_parts).lower()
             
             soft_matches = 0
             for ss in job_soft_skills:
                 ss_lower = str(ss).lower()
                 # 1. Direct Match
                 if ss_lower in full_text_lower:
                     soft_matches += 1
                 else:
                     # 2. Semantic Soft Skill Match (New)
                     # Check against chunks of text or just trust the Semantic Service if we implement it for soft skills.
                     # For now, let's try to match against the extracted skills list causing a "bridge"
                     # It's 'expanded_skills' in this scope (argument)
                     skills_to_check = expanded_skills if expanded_skills else []
                     found_semantic = False # Initialize variable
                     for cand_skill in skills_to_check:
                         # Use lower threshold (0.65) for Soft Skills to be more lenient
                         if await _semantic_match(ss_lower, str(cand_skill).lower(), threshold=0.65):
                             found_semantic = True
                             break
                     if found_semantic:
                         soft_matches += 1
             
             # Calculate Coverage
             coverage = soft_matches / len(job_soft_skills)
             # Base 50 + up to 50 based on coverage
             cultural_score = 50 + (coverage * 50)
        
        scores['cultural_fit'] = cultural_score 
        
        # Penalize trajectory if roles are completely mismatched
        # (e.g. Accountant applying for Medical Tech -> Trajectory is irrelevant)
        # RECOVERY: If role_match_score was recovered to 60 via adjacency, trajectory shouldn't be 30
        if role_match_score >= 60:
             scores['career_trajectory'] = 70
        scores['career_trajectory'] = 30 if roles_mismatch else 70
        
        return scores

    def _build_evaluation_prompt_with_rubric(self, rubric, baseline_scores) -> str:
        checklist_text = f"""
TABLA DE EVALUACIÓN (RÚBRICA MAESTRA):
- Títulos: {rubric.education.required_degrees} (Kill Clause: {rubric.education.kill_clause})
- Roles: {rubric.experience.key_roles}
- Skills: {rubric.skills.mandatory_skills}

PUNTAJES FINALES OBLIGATORIOS (Ya calculados por Matriz, NO LOS ALTERES BAJO NINGUNA CIRCUNSTANCIA):
- Educación: {baseline_scores.get('education')}
- Experiencia: {baseline_scores.get('experience')}
- Skills: {baseline_scores.get('skills_match')}
"""
        return f"""Eres un auditor de reclutamiento estrictamente regido por matemáticas. 

{checklist_text}

Genera el JSON de evaluación final siguiendo la estructura estándar. Sé breve y directo en los razonamientos.

INSTRUCCIONES CRÍTICAS INQUEBRANTABLES:
1. Analiza cada dimensión según los criterios proporcionados en la rúbrica.
2. TIENES PROHIBIDO ALTERAR LOS PUNTAJES MATEMÁTICOS OBLIGATORIOS calculados en el bloque anterior. Tu único trabajo para "Educación", "Experiencia" y "Skills" es justificar en texto el puntaje ya dado (ej. si Educación es 40, justifica por qué falló el matching semántico del título, no le subas a 100 por tu cuenta).
3. Para cada dimensión, proporciona un razonamiento claro y profesional respaldando el número.
   - Si un puntaje es bajo (ej: Cultural Fit 50), explica qué información faltaría para subirlo.
4. Genera strengths, gaps y summary.

IMPORTANTE - FORMATO JSON:
- NO envuelvas el JSON en una clave "audit".
- El JSON debe empezar con {{ "breakdown": ... }}

FORMATO DE SALIDA (JSON válido):

```json
{{
  "breakdown": {{
    "skills_match": {{
      "score": 85,
      "reasoning": "El candidato demuestra 8/10 habilidades técnicas requeridas..."
    }},
    "experience": {{
      "score": 75,
      "reasoning": "5 años de experiencia..."
    }},
    "education": {{
      "score": 90,
      "reasoning": "Licenciatura en Ingeniería..."
    }},
    "cultural_fit": {{
      "score": 80,
      "reasoning": "Liderazgo y comunicación..."
    }},
    "logistics": {{
      "score": 100,
      "reasoning": "Ubicación ideal..."
    }},
    "career_trajectory": {{
      "score": 70,
      "reasoning": "Progresión clara..."
    }}
  }},
  "strengths": ["Fuerte stack técnico", "Buena comunicación"],
  "gaps": ["Falta inglés avanzado"],
  "summary": "Candidato sólido con 75% de compatibilidad..."
}}
```
"""

    def _parse_llm_response(self, llm_result: Dict[str, Any], deterministic_scores: Dict[str, Any] = None) -> Optional[ScoringResponse]:
        """Parse and validate LLM response, OVERWRITING hard dimensions with deterministic scores"""
        try:
            logger.info(f"🔍 DEBUG: LLM Result Keys: {list(llm_result.keys())}")
            
            # Handle possible wrapper keys from LLM hallucinations
            if "audit" in llm_result:
                logger.info("⚠️ Detected 'audit' wrapper key in LLM response. Unwrapping...")
                llm_result = llm_result["audit"]

            breakdown_dict = llm_result.get("breakdown", {})
            if not breakdown_dict: 
                logger.error(f"❌ No 'breakdown' key found in LLM response. Full keys: {llm_result.keys()}")
                logger.debug(f"Full Response: {json.dumps(llm_result, default=str)}")
                return None

            dimension_scores = {}
            total_weighted_score = 0.0

            # Dimensions that MUST respect Python logic
            LOCKED_DIMENSIONS = ['education', 'experience', 'skills_match']

            for dimension_key, weight in ScoringRubric.WEIGHTS.items():
                dimension_data = breakdown_dict.get(dimension_key, {})
                
                # Default Logic
                llm_score = float(dimension_data.get("score", 0))
                reasoning = dimension_data.get("reasoning", "Sin explicación")

                # OVERWRITE LOGIC: Enforce Determinism
                final_score = llm_score
                if deterministic_scores and dimension_key in LOCKED_DIMENSIONS:
                    det_score = deterministic_scores.get(dimension_key)
                    if det_score is not None:
                        logger.info(f"🔒 Locking Score for {dimension_key}: LLM said {llm_score}, Python enforces {det_score}")
                        final_score = float(det_score)
                
                # Validation
                final_score = max(0, min(100, final_score))
                weighted_score = final_score * (weight / 100)
                total_weighted_score += weighted_score

                dimension_scores[dimension_key] = DimensionScore(
                    score=final_score,
                    weight=weight,
                    weighted_score=weighted_score,
                    reasoning=reasoning
                )

            total_weighted_score = min(100.0, total_weighted_score)
            recommendation = ScoringRubric.get_recommendation(total_weighted_score)
            
            return ScoringResponse(
                overall_score=round(total_weighted_score, 2),
                recommendation=recommendation,
                breakdown=dimension_scores,
                strengths=llm_result.get("strengths", []),
                gaps=llm_result.get("gaps", []),
                summary=llm_result.get("summary", "")
            )

        except Exception as e:
            logger.error(f"Error parsing LLM response: {e}", exc_info=True)
            return None
