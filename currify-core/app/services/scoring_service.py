"""
Scoring Service
Evaluates candidate-job fit using AI and structured rubric
"""

import json
import logging
from typing import Dict, Any, Optional
from app.services.llm_service import LLMService
from app.core.scoring_rubric import ScoringRubric
from app.services.dynamic_rubric_service import DynamicRubricService # Added import
from app.models.scoring import ScoringResponse, DimensionScore

logger = logging.getLogger(__name__)


class ScoringService:
    """Service for evaluating candidate-job matching"""

    def __init__(self):
        self.llm_service = LLMService()
        self.rubric = ScoringRubric()
        self.dynamic_rubric_service = DynamicRubricService() # Initialized service

    async def evaluate_candidate(
        self,
        candidate_data: Dict[str, Any],
        job_data: Dict[str, Any]
    ) -> Optional[ScoringResponse]:
        """
        Evaluate candidate-job fit using AI and structured rubric

        Args:
            candidate_data: Parsed CV data from /resume/extract
            job_data: Job posting data

        Returns:
            ScoringResponse with detailed breakdown and recommendation
        """
        try:
            logger.info("Starting candidate-job scoring evaluation")
            
            # DEBUG LOGGING
            logger.info(f"🔍 DEBUG: Candidate keys: {list(candidate_data.keys())}")
            if 'titular_profesional' in candidate_data:
                logger.info(f"🔍 DEBUG: Titular: {candidate_data['titular_profesional']}")
            if 'experiencia_laboral' in candidate_data:
                exp_len = len(candidate_data['experiencia_laboral']) if isinstance(candidate_data['experiencia_laboral'], list) else 'Not List'
                logger.info(f"🔍 DEBUG: Experiencia len: {exp_len}")
            if 'habilidades' in candidate_data:
                logger.info(f"🔍 DEBUG: Habilidades raw: {candidate_data['habilidades']}")

            # 0. GUARDRAIL: Short-circuit if extraction failed
            titular = candidate_data.get('titular_profesional', {}).get('titular', '')
            has_skills = any(candidate_data.get('habilidades', {}).values()) if isinstance(candidate_data.get('habilidades'), dict) else False
            has_experience = len(candidate_data.get('experiencia_laboral', [])) > 0
            
            if titular == "Error en procesamiento" or titular == "No extraído" or (not has_experience and not has_skills):
                logger.warning("⚠️ Extraction failed or empty data detected. Returning 0 score without LLM call.")
                return ScoringResponse(
                    overall_score=0.0,
                    recommendation="weak_fit",
                    breakdown={},
                    strengths=[],
                    gaps=["Error en la extracción de datos del CV"],
                    summary="No se pudo procesar el contenido del CV para realizar la evaluación."
                )

            # 1. Semantic Expansion (Hybrid Layer)
            from app.services.semantic_service import SemanticService
            semantic_service = SemanticService()
            
            # Extract raw skills from various sources in the CV
            raw_skills = []
            if isinstance(candidate_data.get('habilidades'), dict):
                habs = candidate_data['habilidades']
                raw_skills.extend(habs.get('habilidades_tecnicas', []))
                # Also include tools mentions in experience if we extracted them (future improvement)
            
            # Expand skills deterministically
            expanded_skills_set = await semantic_service.expand_skills(raw_skills)
            expanded_skills_list = sorted(list(expanded_skills_set))
            
            logger.info(f"🚀 Expanded Skills for Scoring: {expanded_skills_list}")

            # Normalize Candidate Degrees (AI Standardization)
            raw_degrees = [str(edu.get('titulo', '')) for edu in candidate_data.get('formacion_academica', [])]
            normalized_degrees = []
            if raw_degrees:
                normalized_degrees = await semantic_service.normalize_degrees(raw_degrees)
                logger.info(f"🚀 Normalized Degrees: {normalized_degrees} (from {raw_degrees})")


            # 2. Rubric Extraction (Stage 1.5)
            
            # Robust Job Title Extraction
            # Added 'titulo' and 'nombre' based on common Spanish JSON keys
            job_title = str(job_data.get('title') or job_data.get('job_title') or job_data.get('position') or job_data.get('cargo') or job_data.get('titulo') or job_data.get('nombre') or '')
            job_desc = str(job_data.get('description', ''))
            
            if not job_title.strip():
                logger.warning(f"⚠️ Job Title is empty. Available keys in job_data: {list(job_data.keys())}")
                logger.warning("Rubric extraction will struggle.")
                job_title = "Requerimientos Técnicos Generales" # Generic Fallback
            
            # Generate the "Contract" Rubric
            structured_rubric = await self.dynamic_rubric_service.generate_rubric(job_title, job_desc)
            logger.info(f"📜 Structured Rubric Generated: {structured_rubric.dict(exclude_none=True)}")

            # 3. Mathematical Scoring (Stage 2 - Matrix Execution)
            baseline_scores = self._calculate_matrix_scores(
                candidate_data, 
                structured_rubric, 
                expanded_skills=expanded_skills_list,
                normalized_degrees=normalized_degrees
            )
            logger.info(f"🧮 Matrix Scores: {baseline_scores}")

            # Calculate system guards (Legacy) - Removed
            # guardrails = ...


            # Generate evaluation prompt with Rubric Context
            prompt = self._build_evaluation_prompt_with_rubric(structured_rubric, baseline_scores)
            
            # Prepare input data with ENRICHED context
            input_data = json.dumps({
                "candidate": candidate_data,
                "job_rubric": structured_rubric.dict(),
                "semantic_analysis": {
                    "expanded_skills": expanded_skills_list,
                    "normalized_degrees": normalized_degrees,
                    "explanation": "These skills include strictly implied technical prerequisites."
                },
                "deterministic_metrics": baseline_scores,
                "rubric_weights": ScoringRubric.WEIGHTS
            }, ensure_ascii=False, indent=2)


            # Call LLM for evaluation (Stage 3 - Audit/Reasoning)
            logger.info("Calling LLM for scoring audit")
            result = await self.llm_service.call_agent(
                prompt=prompt,
                input_data=input_data,
                stage_name="SCORING_EVALUATION",
                temperature=0.0
            )

            if not result:
                logger.error("LLM returned no result for scoring")
                return None

            # Parse and validate response (Injecting Deterministic Scores)
            scoring_response = self._parse_llm_response(result, deterministic_scores=baseline_scores)

            if scoring_response:
                logger.info(f"Scoring completed: {scoring_response.overall_score:.1f}/100 - {scoring_response.recommendation}")

            return scoring_response

        except Exception as e:
            logger.error(f"Error during scoring evaluation: {e}", exc_info=True)
            return None
    
    def _calculate_matrix_scores(self, candidate, rubric, expanded_skills=None, normalized_degrees=None) -> Dict[str, Any]:
        """
        Executes the Detailed Scoring Matrix (The Contract).
        Returns raw scores (0-100) per dimension.
        """
        scores = {}
        
        # --- 1. EDUCATION (15%) ---
        edu_score = 0
        # CRITICAL FIX: Filter out empty strings to avoid accidental wildcard matches
        req_titles = [t.lower().strip() for t in rubric.education.required_degrees if t.strip()]
        
        # USE NORMALIZED DEGREES IF AVAILABLE
        cand_degrees_to_check = normalized_degrees if normalized_degrees else [str(edu.get('titulo', '')) for edu in candidate.get('formacion_academica', [])]
        
        has_title_match = False
        
        # Helper for fuzzy matching (Token-based Stemming)
        def _token_fuzzy_match(req_phrase: str, cand_phrase: str) -> bool:
            # ... (same as before)
            # 1. Normalize both phrases
            def normalize(s):
                replacements = (("á", "a"), ("é", "e"), ("í", "i"), ("ó", "o"), ("ú", "u"))
                s = s.lower().strip()
                for a, b in replacements: s = s.replace(a, b)
                return s
            
            # 2. Get stems for a word
            def get_stem(word):
                # Remove common suffixes roughly
                return word.rstrip('os').rstrip('as').rstrip('es').rstrip('o').rstrip('a').rstrip('ico').rstrip('ica').rstrip('ia')

            req_words = normalize(req_phrase).split()
            cand_words = normalize(cand_phrase).split()
            cand_stems = [get_stem(w) for w in cand_words]
            
            # 3. Check if ALL required significant words (len>3) have a match in candidate
            match_count = 0
            required_count = 0
            
            for rw in req_words:
                if len(rw) < 4: continue # Skip 'de', 'el', 'en'
                required_count += 1
                r_stem = get_stem(rw)
                
                # Check if this stem exists in any candidate word stem
                # Relaxed: check if r_stem is IN c_stem or vice versa
                if any(r_stem in cs or cs in r_stem for cs in cand_stems if len(cs) > 2):
                    match_count += 1
            
            if required_count == 0: return True # No significant words, permissive
            # ALL significant words must match
            return match_count == required_count

        if not req_titles:
            # If no specific titles requested in Rubric (and fallback failed),
            # Default to Neutral (50) if they have some education, else 0.
            scores['education'] = 50 if len(cand_degrees_to_check) > 0 else 0
        else:
            has_title_match = False
            for deg in cand_degrees_to_check:
                # Token-based check
                if any(_token_fuzzy_match(req, deg) for req in req_titles if len(req) > 2):
                    has_title_match = True
                    break
            
            if not has_title_match and rubric.education.kill_clause:
                scores['education'] = 0 # KILL CLAUSE
            else:
                scores['education'] = 100 if has_title_match else 40

        # --- 2. EXPERIENCE (25%) ---
        # Sub-weights: Roles (50%), Years (30%), Industry (20%)
        # Refined: If no Rubric Roles, default to 50 (Neutral) not 100
        req_roles = [r.lower().strip() for r in rubric.experience.key_roles if r.strip()]
        cand_exps = candidate.get('experiencia_laboral', [])
        
        # A. Roles Match
        role_match_score = 0
        roles_mismatch = False # Flag to penalize other sub-dimensions
        
        if not req_roles: 
            # If no specific roles in Rubric, default to 50
            role_match_score = 50 
        else:
            matched_count = 0
            for exp in cand_exps:
                role = str(exp.get('cargo', ''))
                # Semantic/Fuzzy check for roles (Token-based)
                if any(_token_fuzzy_match(req, role) for req in req_roles if len(req) > 2):
                    matched_count += 1
            if matched_count > 0: 
                role_match_score = 100
            else: 
                role_match_score = 20 # Mismatch penalty
                roles_mismatch = True
        
        # B. Years Constraint
        # If roles don't match (e.g. Accountant in Trucking Co), years are less valuable.
        base_years = 100 if len(cand_exps) >= 2 else (60 if len(cand_exps) == 1 else 0)
        years_score = base_years if not roles_mismatch else (base_years * 0.5)
        
        # C. Industry
        # If roles don't match, industry context is likely irrelevant or different department
        industry_score = 100 if not roles_mismatch else 50
        
        scores['experience'] = (role_match_score * 0.5) + (years_score * 0.3) + (industry_score * 0.2)

        # --- 3. SKILLS (30%) ---
        mandatory = set(s.lower() for s in rubric.skills.mandatory_skills)
        expanded_cand_skills = set(expanded_skills) if expanded_skills else set()
        
        if not mandatory:
            minutes_skills_score = 50 # Neutral if no skills listed 
            # If candidate has tech skills, boost
            if expanded_cand_skills: minutes_skills_score = 70
            mandatory_score = minutes_skills_score
        else:
            matches = mandatory.intersection(expanded_cand_skills)
            coverage = len(matches) / len(mandatory) if mandatory else 0.0
            mandatory_score = coverage * 100
            
        nice = set(s.lower() for s in rubric.skills.nice_to_have_skills)
        nice_matches = nice.intersection(expanded_cand_skills)
        nice_bonus = min(len(nice_matches) * 10, 20) # Max 20 pts bonus
        
        scores['skills_match'] = min(100, (mandatory_score * 0.8) + (nice_bonus * 0.2 if mandatory_score > 0 else 0))

        # --- 4. OTHERS ---
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
        scores['cultural_fit'] = 50 # Default Neutral
        
        # Penalize trajectory if roles are completely mismatched
        # (e.g. Accountant applying for Medical Tech -> Trajectory is irrelevant)
        scores['career_trajectory'] = 30 if roles_mismatch else 70
        
        return scores

    def _build_evaluation_prompt_with_rubric(self, rubric, baseline_scores) -> str:
        checklist_text = f"""
TABLA DE EVALUACIÓN (RÚBRICA MAESTRA):
- Títulos: {rubric.education.required_degrees} (Kill Clause: {rubric.education.kill_clause})
- Roles: {rubric.experience.key_roles}
- Skills: {rubric.skills.mandatory_skills}

PUNTAJES FINALES OBLIGATORIOS (Ya calculados por Matriz):
- Educación: {baseline_scores.get('education')}
- Experiencia: {baseline_scores.get('experience')}
- Skills: {baseline_scores.get('skills_match')}
"""
        return f"""Eres un auditor de reclutamiento estricto. Tu trabajo es verificar el cumplimiento de una rúbrica técnica.

{checklist_text}

Genera el JSON de evaluación final siguiendo la estructura estándar. Sé breve y directo en los razonamientos.

INSTRUCCIONES:
1. Analiza cada dimensión según los criterios proporcionados en la rúbrica.
2. ACEPTA los puntajes de Educación, Experiencia y Skills calculados por el sistema (Ya incluidos arriba). NO LOS CAMBIES salvo error flagrante de extracción.
3. Para cada dimensión, proporciona un razonamiento claro y profesional.
   - EVITA frases redundantes como "Se mantiene el puntaje calculado".
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

