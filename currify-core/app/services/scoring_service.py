"""
Scoring Service
Evaluates candidate-job fit using AI and structured rubric
"""

import json
import logging
import re
from typing import Dict, Any, List, Optional
from app.services.llm_service import LLMService
from app.core.scoring_rubric import ScoringRubric
from app.services.dynamic_rubric_service import DynamicRubricService
from app.models.scoring import ScoringResponse, DimensionScore, SkillJudgeResult
from app.services.education_normalizer import EducationNormalizer
from app.services.semantic_service import SemanticService # Moved to top
from app.services.domain_expansion import expand_rubric_skill, normalize_text
from app.services.geo_chile import resolve_geo_match, GEO_CHILE_VERSION
import asyncio

logger = logging.getLogger(__name__)


# ══════════════════════════════════════════════════════════════════════════════
#  TRAJECTORY / YEARS — Constantes centralizadas (SDD Fase 2 §4.2, P2)
#  Único lugar autorizado para estos números: PROHIBIDO dispersar mágicos.
# ══════════════════════════════════════════════════════════════════════════════
TRAJECTORY_WEIGHT_YEARS = 0.50
TRAJECTORY_WEIGHT_STABILITY = 0.30
TRAJECTORY_WEIGHT_PROGRESSION = 0.20

STABILITY_TENURE_FULL_MONTHS = 24      # tenencia promedio ≥24 meses → 100
STABILITY_TENURE_PARTIAL_MONTHS = 12   # 12–24 meses → 70 · <12 → 40
STABILITY_SCORE_FULL = 100
STABILITY_SCORE_PARTIAL = 70
STABILITY_SCORE_LOW = 40

PROGRESSION_SCORE_ASCENDING = 100      # tiers léxicos ascendentes
PROGRESSION_SCORE_LATERAL = 70         # mismo tier entre empleadores
PROGRESSION_SCORE_INSUFFICIENT = 60    # <2 entradas con tier resoluble / no clasificable

TRAJECTORY_FALLBACK_SCORE = 70         # <1 entrada o fechas no parseables (preservado)

YEARS_FALLBACK_MULTI_ENTRIES = 100     # ≥2 entradas (fallback lógica actual)
YEARS_FALLBACK_SINGLE_ENTRY = 60       # 1 entrada
YEARS_FALLBACK_NO_ENTRIES = 0

MONTHS_PER_YEAR = 12

# Tiers léxicos de progresión (SDD §4.2): asistente/ayudante < profesional/titulado
# < coordinador/encargado/jefe. Extensible añadiendo keywords al tier.
_PROGRESSION_TIERS: List[tuple] = [
    (0, ["asistente", "ayudante", "auxiliar", "practicante", "aprendiz", "pasante"]),
    (1, ["profesional", "titulado", "titulada", "senior", "experto", "especialista"]),
    (2, ["coordinador", "coordinadora", "encargado", "encargada", "jefe", "jefa",
         "jefatura", "director", "directora", "gerente", "gerenta", "supervisor",
         "supervisora", "lider"]),
]


def _parse_year_month(value):
    """'2018' | '2018-03' | 'mar 2018' -> (year, month|None) · 'presente/actual' -> 'now'.
    Retorna None si no es parseable (anti-invención: nunca deducir años ausentes)."""
    if value is None:
        return None
    s = str(value).strip().lower()
    if not s:
        return None
    if any(k in s for k in ("presente", "actual", "current", "hoy", "today")):
        return "now"
    m = re.search(r"(\d{4})(?:[-/](\d{1,2}))?", s)
    if not m:
        return None
    year = int(m.group(1))
    if not (1900 <= year <= 2100):
        return None
    month = int(m.group(2)) if m.group(2) else None
    if month is not None and not (1 <= month <= 12):
        month = None
    return (year, month)


def compute_timeline_months(experiencias) -> List[Dict[str, Any]]:
    """Timeline determinista por entrada: cargo parseable + tenencia en meses.
    Entradas sin fechas parseables quedan con months=None (no se inventan)."""
    from datetime import datetime
    timeline: List[Dict[str, Any]] = []
    now_ym = (datetime.now().year, datetime.now().month)
    for exp in (experiencias or []):
        periodo = exp.get('periodo') or {} if isinstance(exp, dict) else {}
        start = _parse_year_month(periodo.get('fecha_inicio'))
        end_raw = periodo.get('fecha_fin')
        end = _parse_year_month(end_raw)
        months = None
        if start and start != "now" and end is not None:
            ey, em = now_ym if end == "now" else end
            sy, sm = start
            months = max(0, (ey * MONTHS_PER_YEAR + (em or 1)) - (sy * MONTHS_PER_YEAR + (sm or 1)))
        timeline.append({
            "cargo": str(exp.get('cargo') or '') if isinstance(exp, dict) else '',
            "start": start,
            "months": months,
        })
    return timeline


def total_real_years(timeline) -> Optional[float]:
    """Suma de tenencias reales parseadas en años; None si ninguna fecha parseó."""
    months = [t["months"] for t in timeline if t.get("months") is not None]
    if not months:
        return None
    return sum(months) / MONTHS_PER_YEAR


def years_component(min_years: int, timeline) -> int:
    """years_c (SDD §4.2): con min_years>0 y fechas reales → min(100, años/min·100);
    si no aplica → fallback lógica actual por entradas (única fuente de verdad)."""
    real_years = total_real_years(timeline)
    if min_years and min_years > 0 and real_years is not None:
        return int(round(min(100, (real_years / min_years) * 100)))
    n_entries = len(timeline)
    if n_entries >= 2:
        return YEARS_FALLBACK_MULTI_ENTRIES
    if n_entries == 1:
        return YEARS_FALLBACK_SINGLE_ENTRY
    return YEARS_FALLBACK_NO_ENTRIES


def stability_component(timeline) -> Optional[int]:
    """stability_c: tenencia promedio por empleo ≥24m→100 · 12–24m→70 · <12m→40.
    None si ninguna entrada tiene fechas parseables."""
    tenures = [t["months"] for t in timeline if t.get("months") is not None]
    if not tenures:
        return None
    avg = sum(tenures) / len(tenures)
    if avg >= STABILITY_TENURE_FULL_MONTHS:
        return STABILITY_SCORE_FULL
    if avg >= STABILITY_TENURE_PARTIAL_MONTHS:
        return STABILITY_SCORE_PARTIAL
    return STABILITY_SCORE_LOW


def progression_component(timeline) -> int:
    """progression_c: tiers léxicos ordenados cronológicamente.
    Ascendente→100 · lateral→70 · insuficiente/no clasificable→60."""
    def _tier(cargo: str):
        c = normalize_text(cargo)
        for level, keywords in _PROGRESSION_TIERS:
            for kw in keywords:
                if re.search(rf"(^| ){re.escape(kw)}( |$)", c):
                    return level
        return None

    tiered = [(t["start"], _tier(t["cargo"])) for t in timeline]
    tiered = [lvl for _, lvl in sorted(
        (s for s in tiered if s[0] and s[0] != "now"), key=lambda x: x[0]) if lvl is not None]
    if len(tiered) < 2:
        return PROGRESSION_SCORE_INSUFFICIENT
    first, last = tiered[0], tiered[-1]
    if last > first:
        return PROGRESSION_SCORE_ASCENDING
    if last == first:
        return PROGRESSION_SCORE_LATERAL
    return PROGRESSION_SCORE_INSUFFICIENT  # descendente/zigzag: señal no clara


def trajectory_signal(min_years: int, experiencias) -> tuple:
    """Fórmula SDD §4.2: round(0.50·years_c + 0.30·stability_c + 0.20·progression_c).
    Fallback preservado: <1 entrada o fechas no parseables → 70.
    Retorna (score:int, componentes:dict) — componentes SIEMPRE trazables."""
    timeline = compute_timeline_months(experiencias)
    if len(timeline) < 1:
        return TRAJECTORY_FALLBACK_SCORE, {"reason": "sin_experiencia"}
    stability = stability_component(timeline)
    if stability is None:
        return TRAJECTORY_FALLBACK_SCORE, {"reason": "fechas_no_parseables"}
    years_c = years_component(min_years, timeline)
    progression_c = progression_component(timeline)
    score = int(round(
        TRAJECTORY_WEIGHT_YEARS * years_c
        + TRAJECTORY_WEIGHT_STABILITY * stability
        + TRAJECTORY_WEIGHT_PROGRESSION * progression_c
    ))
    real_years = total_real_years(timeline)
    components = {
        "years": years_c,
        "stability": stability,
        "progression": progression_c,
        "years_total": round(real_years, 1) if real_years is not None else None,
        "min_years": min_years,
    }
    return score, components


class ScoringService:
    """Service for evaluating candidate-job matching"""

    def __init__(self, llm_service: Optional[LLMService] = None):
        self.llm_service = llm_service or LLMService()
        self.rubric = ScoringRubric()
        self.dynamic_rubric_service = DynamicRubricService(llm_service=self.llm_service)
        self.education_normalizer = EducationNormalizer()
        self.semantic_service = SemanticService(llm_service=self.llm_service)
        # Cache del Skill Judge: clave (skill_normalizada, hash_contexto_candidato).
        # Gracias a este cache el presupuesto neto típico es ≤ +2 llamadas LLM/evaluación.
        self._skill_judge_cache: Dict[tuple, Any] = {}

    # Presupuesto del Skill Judge (Bug 3): máximo 6 llamadas por evaluación.
    MAX_SKILL_JUDGE_CALLS = 6
    # Bandas de crédito parcial por similitud semántica
    SKILL_SIM_FULL_CREDIT = 0.80   # ≥ 0.80 → 1.0
    SKILL_SIM_HALF_CREDIT = 0.65   # ≥ 0.65 → 0.5 ; < 0.65 → elegible para judge

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
            
            # 0. GUARDRAIL: Short-circuit if extraction failed (graceful per-dimension)
            titular = candidate_data.get('titular_profesional', {}).get('titular', '')
            habs = candidate_data.get('habilidades', {})
            has_skills = False
            if isinstance(habs, dict):
                has_skills = any(
                    (isinstance(v, list) and len(v) > 0) or (isinstance(v, str) and v.strip())
                    for v in habs.values()
                )
            has_experience = len(candidate_data.get('experiencia_laboral', [])) > 0
            has_education = len(candidate_data.get('formacion_academica', [])) > 0
            has_contact = bool(candidate_data.get('datos_contacto', {}).get('email')) and candidate_data.get('datos_contacto', {}).get('email') != "no-extraido@example.com"
            # Only return 0.0 if truly empty (all dimensions missing) — else graceful partial scoring
            if not has_experience and not has_skills and not has_education and not has_contact:
                logger.warning("⚠️ Extraction failed or empty data detected. Returning 0 score.")
                return ScoringResponse(
                    overall_score=0.0,
                    recommendation="weak_fit",
                    breakdown={},
                    strengths=[],
                    gaps=["Error en la extracción de datos del CV"],
                    summary="No se pudo procesar el contenido del CV para realizar la evaluación."
                )
            # Else: continue to graceful partial scoring (do not short-circuit if partial data exists)

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
                "job_rubric": structured_rubric.model_dump(),
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
    
    # ------------------------------------------------------------------ #
    #  SKILL JUDGE (Bug 3) — acotado, con evidencia literal obligatoria   #
    # ------------------------------------------------------------------ #

    async def _judge_single_skill(self, req_skill: str, candidate_context: str) -> SkillJudgeResult:
        """
        Juzga UNA mandatory skill que quedó en 0 tras similitud semántica.
        - Schema Pydantic SkillJudgeResult (evidencia LITERAL obligatoria → si no, score 0).
        - Anti-alucinación: la evidencia devuelta DEBE ser substring literal del contexto.
        - El resultado alimenta la MATRIZ de matching; NUNCA el score final.
        """
        context_excerpt = candidate_context[:3000]
        prompt = f"""Eres un evaluador de competencias (judge) NEUTRAL al dominio: educación, salud,
oficios, retail, tecnología, etc. Determina si el candidato demuestra la skill requerida.

SKILL REQUERIDA: "{req_skill}"

CONTEXTO DEL CANDIDATO (texto literal de su CV):
<contexto>
{context_excerpt}
</contexto>

REGLAS ESTRICTAS:
1. "evidence" debe ser una cita LITERAL (substring exacto) del contexto. PROHIBIDO parafrasear o inventar.
2. Si NO puedes citar evidencia literal → score = 0.0 y evidence = null.
3. score: 1.0 = evidencia clara e inequívoca; 0.5 = evidencia parcial/adyacente razonable; 0.0 = sin evidencia.
4. Devuelve EXCLUSIVAMENTE JSON válido:
{{"score": 0.0 | 0.5 | 1.0, "evidence": "<cita literal o null>"}}
"""
        try:
            raw = await self.llm_service.call_agent(
                prompt=prompt,
                input_data="",
                stage_name="SKILL_JUDGE",
                temperature=0.0,
            )
            result = SkillJudgeResult.model_validate(raw)
            # Anti-alucinación: la evidencia debe existir LITERALMENTE en el contexto
            if result.evidence and str(result.evidence).strip().lower() not in candidate_context.lower():
                logger.warning(f"⚖️ Judge evidencia no literal para '{req_skill}' → score forzado a 0")
                return SkillJudgeResult(skill=req_skill, score=0.0, evidence=None)
            result.skill = req_skill
            return result
        except Exception as e:
            logger.warning(f"⚖️ Skill Judge falló para '{req_skill}': {e} → score 0")
            return SkillJudgeResult(skill=req_skill, score=0.0, evidence=None)

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

        # --- EDUCATION SCORING (CORREGIDO: Campo de estudio + Nivel académico) ---
        scores['education'] = await self._score_education(
            req_titles=req_titles,
            cand_degrees=cand_degrees_to_check,
            job_title=job_title,
            rubric=rubric
        )

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
        
        # FALLBACK ROLE REGRESSION: En lugar de boost artificial a 50,
        # verificar si hay habilidades transferibles reales.
        if used_fallback_role and role_match_score < 60:
            transferable = await self._check_role_transferability(
                candidate_roles=cand_roles_to_check,
                target_role=job_title,
                expanded_skills=expanded_skills if expanded_skills else []
            )
            if transferable:
                logger.info(f"🔄 Fallback: Skills transferibles detectadas para '{job_title}'. Score 50.")
                role_match_score = 50
                roles_mismatch = True  # Sigue siendo mismatch, pero con skills transferibles
            else:
                logger.info(f"🔄 Fallback: Sin skills transferibles para '{job_title}'. Score bajo.")
                role_match_score = 15  # Sin transferibilidad → score muy bajo
                roles_mismatch = True

        # B. Years Constraint (SDD Fase 2 P2: fechas reales + rubric.min_years como
        # única fuente de verdad; fallback por entradas cuando min_years no aplica).
        # If roles don't match (e.g. Accountant in Trucking Co), years are less valuable.
        _min_years_req = int(getattr(rubric.experience, 'min_years', 0) or 0)
        _timeline = compute_timeline_months(cand_exps)
        base_years = years_component(_min_years_req, _timeline)
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

        # Contexto textual del candidato (para deep search y evidencia del judge)
        context_parts = []
        if candidate.get('resumen_profesional'):
            context_parts.append(str(candidate['resumen_profesional'].get('resumen', '')))
        for exp in cand_exps:
            context_parts.append(str(exp.get('responsabilidades', '')))
            context_parts.append(str(exp.get('cargo', '')))
        full_text_lower = " ".join(context_parts).lower()

        if not mandatory:
            minutes_skills_score = 50 # Neutral if no skills listed 
            # If candidate has tech skills, boost
            if expanded_cand_skills: minutes_skills_score = 70
            mandatory_score = minutes_skills_score
        else:
            # ── BUG 3: Crédito parcial en TRES BANDAS (1.0 / 0.5 / 0.0) ──
            # Bandas por similitud: ≥0.80 → 1.0 ; ≥0.65 → 0.5 ; <0.65 → judge acotado.
            # Batch-fix F3 (2026-08-25): expansión léxica LADO RÚBRICA antes de las
            # bandas (léxico estático de dominio — CNEP primero—, NUNCA vía LLM).
            # Las sondas alimentan el matching literal y las bandas existentes; el
            # judge mantiene rol/umbral <0.65/cache/presupuesto intactos.
            total_credit = 0.0
            pending_judge: List[str] = []

            expanded_norm = {normalize_text(s) for s in expanded_cand_skills}
            full_text_norm = normalize_text(full_text_lower)

            for req_skill in sorted(mandatory):
                req_l = str(req_skill).lower().strip()
                if not req_l:
                    continue

                # Sondas = skill requerida + sinónimos de dominio (si aplica)
                probes = [req_l]
                for probe in sorted(expand_rubric_skill(req_l)):
                    if probe not in probes:
                        probes.append(probe)

                # Banda instantánea: match literal (evidencia directa, original o sonda)
                literal_hit = False
                for probe in probes:
                    if probe in expanded_cand_skills or probe in full_text_lower:
                        literal_hit = True
                        break
                    p_norm = normalize_text(probe)
                    if p_norm in expanded_norm or p_norm in full_text_norm:
                        literal_hit = True
                        break
                if literal_hit:
                    total_credit += 1.0
                    continue

                # Bandas de similitud semántica contra skills expandidas del candidato
                best_sim = 0.0
                for probe in probes:
                    for cand_skill in expanded_cand_skills:
                        sim = await self.semantic_service.calculate_similarity(probe, cand_skill)
                        if sim > best_sim:
                            best_sim = sim
                            if best_sim >= self.SKILL_SIM_FULL_CREDIT:
                                break
                    if best_sim >= self.SKILL_SIM_FULL_CREDIT:
                        break

                if best_sim >= self.SKILL_SIM_FULL_CREDIT:
                    total_credit += 1.0
                elif best_sim >= self.SKILL_SIM_HALF_CREDIT:
                    total_credit += 0.5
                else:
                    pending_judge.append(req_l)

            # ── Judge LLM acotado: SOLO para skills que quedaron en 0 tras similitud ──
            # Máximo MAX_SKILL_JUDGE_CALLS llamadas por evaluación; cache por
            # (skill + hash candidato). El judge alimenta la MATRIZ (crédito de
            # matching), NUNCA el score final (overall sigue siendo Σ ponderada).
            # ── Hotfix 408: paralelizado máx 3 concurrentes (wall-time ~⅓) ──
            # Preserva: presupuesto 6 (check antes de encolar), cache por (skill+hash),
            # validación evidencia literal (delegada a _judge_single_skill), determinismo
            # total_credit (suma conmutativa) y log ⚖️ por resultado. Orden sorted(mandatory)
            # garantiza prioridad alfabética determinista si >6 pendientes.
            import time as _time_mod
            _judge_wall_start = _time_mod.monotonic()
            _hits_credit = 0.0
            _misses: List[str] = []
            _skipped_budget: List[str] = []
            for req_l in pending_judge:
                cache_key = (req_l, hash(full_text_lower))
                cached = self._skill_judge_cache.get(cache_key)
                if cached is not None:
                    _hits_credit += float(cached.get("score", 0.0))
                    continue
                if len(_misses) >= self.MAX_SKILL_JUDGE_CALLS:
                    _skipped_budget.append(req_l)
                    logger.warning(f"⚖️ Skill Judge: presupuesto agotado ({self.MAX_SKILL_JUDGE_CALLS}); "
                                   f"'{req_l}' queda en 0 sin juzgar")
                    continue
                _misses.append(req_l)
            total_credit += _hits_credit

            if _misses:
                _sem = asyncio.Semaphore(3)

                async def _judge_bounded(req: str):
                    async with _sem:
                        judged = await self._judge_single_skill(req, full_text_lower)
                        return req, judged

                _results = await asyncio.gather(*[_judge_bounded(r) for r in _misses])
                # Procesar en orden de _misses para determinismo de cache/log
                for req_l, judged in _results:
                    cache_key = (req_l, hash(full_text_lower))
                    self._skill_judge_cache[cache_key] = {"score": judged.score, "evidence": judged.evidence}
                    if judged.score > 0:
                        logger.info(f"⚖️ Skill Judge '{req_l}' → {judged.score} con evidencia literal")
                    total_credit += float(judged.score)

            _judge_wall_elapsed = _time_mod.monotonic() - _judge_wall_start
            logger.info(
                f"⏱️ Skill Judge bloque wall-time: {_judge_wall_elapsed:.3f}s "
                f"| pending={len(pending_judge)} hits={len(pending_judge)-len(_misses)-len(_skipped_budget)} "
                f"misses={len(_misses)} skipped_budget={len(_skipped_budget)} max_concurrent=3"
            )

            coverage = total_credit / len(mandatory) if mandatory else 0.0
            mandatory_score = coverage * 100
            
        nice = set(s.lower() for s in rubric.skills.nice_to_have_skills)
        nice_matches = nice.intersection(expanded_cand_skills)
        nice_bonus = min(len(nice_matches) * 10, 20) # Max 20 pts bonus
        
        scores['skills_match'] = min(100, (mandatory_score * 0.8) + (nice_bonus * 0.2 if mandatory_score > 0 else 0))

        # --- 4. OTHERS ---
        
        # LOGISTICS (SDD Fase 2 §4.1 — geográfico jerárquico, determinista, cero LLM)
        # Escalera: comuna=100 · provincia=70 · región=50 · sin match=0 ·
        # campaña sin requisito=100 · CV sin ubicación con requisito=50 neutral.
        # Trazabilidad obligatoria: tier + texto contra el que matcheó.
        cv_location_texts: List[str] = []
        contact = candidate.get('datos_contacto') or {}
        if isinstance(contact, dict):
            for _loc_key in ('ubicacion', 'ciudad', 'comuna', 'provincia', 'region'):
                _loc_val = contact.get(_loc_key)
                if _loc_val and str(_loc_val).strip():
                    cv_location_texts.append(str(_loc_val))

        geo_result = resolve_geo_match(getattr(rubric.logistics, 'location', None), cv_location_texts)
        scores['logistics'] = geo_result.score
        # Traza informativa aditiva (los consumidores iteran WEIGHTS; no altera HTTP)
        scores['_logistics_geo'] = {
            "geo_version": GEO_CHILE_VERSION,
            "tier": geo_result.tier,
            "matched_on": geo_result.matched_on,
            "score": geo_result.score,
        }
        
        # Cultural Fit - Soft Skills Match
        # Batch-fix F1 (2026-08-25): fuentes de blandas de la oferta = parámetro
        # parsedJobData.habilidades_blandas (retrocompat) + campo estructurado
        # rubric.skills.soft_skills (dedup case-insensitive, sin cambiar firma ni HTTP).
        cultural_score = 50 # Default
        job_soft_list: List[str] = []
        _seen_job_soft = set()
        for _src in (list(job_soft_skills or []) + list(getattr(rubric.skills, 'soft_skills', None) or [])):
            _s = str(_src).strip()
            _k = _s.lower()
            if _s and _k not in _seen_job_soft:
                _seen_job_soft.add(_k)
                job_soft_list.append(_s)

        if job_soft_list:
             # Build Text
             context_parts = []
             if candidate.get('resumen_profesional'):
                 context_parts.append(str(candidate['resumen_profesional'].get('resumen', '')))
             for exp in cand_exps:
                 context_parts.append(str(exp.get('responsabilidades', '')))

             # ── Batch-fix F1: blandas DECLARADAS por el CV (habilidades.habilidades_blandas)
             #    entran al corpus literal Y al set puenteable. Evidencia trazable:
             #    la declaración del propio CV (literal) o similitud documentada ≥0.65. ──
             declared_softs: List[str] = []
             habs_cand = candidate.get('habilidades')
             raw_declared = habs_cand.get('habilidades_blandas', []) or [] if isinstance(habs_cand, dict) else []
             for ds in raw_declared:
                 if isinstance(ds, str):
                     val = ds
                 elif isinstance(ds, dict):
                     val = ds.get('habilidad') or ds.get('name') or ds.get('skill') or ''
                 else:
                     val = str(ds)
                 val = str(val).strip()
                 if val:
                     declared_softs.append(val)
             declared_lower = [d.lower() for d in declared_softs]
             if declared_lower:
                 context_parts.append(" ".join(declared_lower))

             full_text_lower = " ".join(context_parts).lower()

             # Set puenteable de la dimensión: técnicas+latentes expandidas + blandas declaradas
             bridge_skills: List[str] = []
             _seen_bridge = set()
             for _b in (list(expanded_skills or []) + declared_lower):
                 _bl = str(_b).lower().strip()
                 if _bl and _bl not in _seen_bridge:
                     _seen_bridge.add(_bl)
                     bridge_skills.append(_bl)

             soft_matches = 0
             for ss in job_soft_list:
                  ss_lower = str(ss).lower()
                  # 1. Direct Match (el corpus ahora incluye las blandas declaradas del CV)
                  if ss_lower in full_text_lower:
                      soft_matches += 1
                  else:
                      # 2. Semantic Soft Skill Match (puente documentado, umbral 0.65)
                      found_semantic = False # Initialize variable
                      for cand_skill in bridge_skills:
                          if await _semantic_match(ss_lower, cand_skill, threshold=0.65):
                              found_semantic = True
                              break
                      if found_semantic:
                          soft_matches += 1

              # Calculate Coverage
             coverage = soft_matches / len(job_soft_list)
             # Base 50 + up to 50 based on coverage
             cultural_score = 50 + (coverage * 50)

        scores['cultural_fit'] = cultural_score
        
        # Penalize trajectory if roles are completely mismatched
        # (e.g. Accountant applying for Medical Tech -> Trajectory is irrelevant)
        # RECOVERY: If role_match_score was recovered to 60 via adjacency, trajectory shouldn't be 30
        # SDD Fase 2 P2: el branch "rol matcheado" deja el hardcode 70 y calcula por
        # componentes (years/stability/progression) con fallback 70 preservado.
        if role_match_score >= 60:
            traj_score, traj_components = trajectory_signal(_min_years_req, cand_exps)
            scores['career_trajectory'] = traj_score
            # Traza informativa aditiva (no altera contrato HTTP)
            scores['_trajectory_components'] = traj_components
        elif roles_mismatch:
            scores['career_trajectory'] = 30
        else:
            scores['career_trajectory'] = 50  # Neutral when insufficient data
        
        return scores

    # ------------------------------------------------------------------ #
    #  EDUCATION SCORING (Corregido: Campo de estudio + Nivel académico)  #
    # ------------------------------------------------------------------ #

    async def _score_education(
        self,
        req_titles: list,
        cand_degrees: list,
        job_title: str,
        rubric
    ) -> float:
        """
        Evalúa educación en 2 ejes ortogonales: nivel académico + campo de estudio.
        - Si hay required_degrees en rúbrica: matching semántico con threshold y penalización de dominio
        - Si NO hay required_degrees: inferencia de campo desde job_title con verificación de nivel
        """
        if not req_titles:
            # --- FALLBACK: Inferir desde Job Title ---
            job_title_level, _ = self.education_normalizer.normalize_degree(job_title)
            if job_title_level > 0:
                logger.info(f"🎓 Inferring required education level {job_title_level} from Job Title '{job_title}'")

                max_cand_level = 0
                for d in cand_degrees:
                    l, _ = self.education_normalizer.normalize_degree(d)
                    if l > max_cand_level:
                        max_cand_level = l

                # Verificar nivel
                if not self.education_normalizer.check_level_match(max_cand_level, job_title_level):
                    if max_cand_level > 0:
                        return 30.0  # Tiene título pero de nivel inferior
                    return 0.0

                # Tiene el nivel correcto → verificar campo de estudio
                # Inferir campo desde job_title vs campo del candidato
                field_score = await self._score_field_match(
                    [job_title], cand_degrees, job_title
                )
                # Penalización por nivel completo pero campo incorrecto
                if field_score < 0.3:
                    return 30.0
                return field_score * 100.0
            else:
                # Sin nivel inferible → neutral si tiene educación
                return 50.0 if len(cand_degrees) > 0 else 0.0
        else:
            # --- REQUIRED DEGREES EXPLÍCITOS ---
            req_level = self.education_normalizer.extract_required_level(req_titles)

            has_level_match = False

            # Expandir req_titles por comas o ' o '
            expanded_req_titles = []
            for t in req_titles:
                parts = t.replace(' o ', ',').split(',')
                for p in parts:
                    if p.strip():
                        expanded_req_titles.append(p.strip())
            final_req_titles = expanded_req_titles if expanded_req_titles else req_titles

            for deg in cand_degrees:
                cand_level, _ = self.education_normalizer.normalize_degree(deg)
                if req_level > 0 and self.education_normalizer.check_level_match(cand_level, req_level):
                    has_level_match = True

            # EJE 2: Campo de estudio (con penalización de dominio)
            field_score = await self._score_field_match(final_req_titles, cand_degrees, job_title)

            # --- Decisión final combinando nivel + campo ---
            if field_score >= 0.90:
                # Mismo campo de estudio
                if has_level_match or req_level == 0:
                    return 100.0
                return 60.0  # Tiene el campo pero no el nivel exacto
            elif field_score >= 0.60:
                # Campo relacionado
                if has_level_match:
                    return 70.0
                return 40.0
            elif field_score >= 0.30:
                # Campo tangencial
                if has_level_match:
                    return 40.0
                return 20.0
            else:
                # Campo completamente diferente
                if has_level_match:
                    # Tiene el nivel académico pero en campo distinto
                    # (ej. Ingeniero Informático postulando a Médico Veterinario)
                    if rubric.education.kill_clause:
                        return 0.0
                    return 15.0  # Crédito mínimo por tener educación superior
                if rubric.education.kill_clause:
                    return 0.0
                return 5.0 if len(cand_degrees) > 0 else 0.0

    async def _score_field_match(
        self,
        req_titles: list,
        cand_degrees: list,
        job_title: str
    ) -> float:
        """
        Calcula qué tan relacionado está el campo de estudio del candidato
        con el campo requerido. Retorna 0.0 a 1.0.
        Usa similitud semántica con penalización de dominio léxico.
        """
        effective_req = req_titles if req_titles else [job_title]

        best_sim = 0.0
        for req in effective_req:
            for cand in cand_degrees:
                sim = await self.semantic_service.calculate_similarity(req, cand)

                # Penalización por cambio de dominio léxico
                domain_penalty = self._compute_domain_penalty(req, cand)
                adjusted_sim = sim * domain_penalty

                if adjusted_sim > best_sim:
                    best_sim = adjusted_sim

        # Mapear similitud ajustada a score categorizado
        if best_sim >= 0.90:
            return 1.0      # Mismo campo
        elif best_sim >= 0.70:
            return 0.7      # Campo relacionado
        elif best_sim >= 0.45:
            return 0.3      # Campo tangencial
        else:
            return 0.0      # Campo diferente

    def _compute_domain_penalty(self, req: str, cand: str) -> float:
        """
        Penaliza pares que pertenecen a familias léxicas distintas
        (ej. 'medicina' vs 'ingeniería') usando palabras clave de dominio.
        Sin penalización si están en el mismo cluster de dominio.
        """
        domain_keywords = {
            "salud": ["medicin", "enfermer", "veterinari", "odontolog", "quirofano",
                      "clinica", "hospital", "paciente", "biolog", "farmac",
                      "cirujan", "pediatra", "anestesio", "traumatolog", "kinesiolog"],
            "ingenieria": ["ingenier", "software", "sistema", "computacion",
                           "informatic", "electron", "mecanic", "civil", "industrial",
                           "telecom", "automatiz", "robotica", "programacion"],
            "negocios": ["administracion", "contabil", "finanz", "marketing",
                         "economia", "comercial", "venta", "auditor", "negocio",
                         "gestio"],
            "educacion": ["pedagog", "docenc", "profesor", "educacion",
                          "enseñanza", "didactic", "formacion"],
            "derecho": ["derecho", "abogad", "legal", "juridic", "leyes",
                        "litigacion"],
            "arte": ["disen", "artistic", "visual", "grafic", "creative",
                     "multimedia", "animacion"],
            "construccion": ["arquitectur", "construccion", "obra", "edificacion",
                             "obra civil", "topograf"],
        }

        req_lower = req.lower()
        cand_lower = cand.lower()

        req_domains = set()
        cand_domains = set()

        for domain, keywords in domain_keywords.items():
            for kw in keywords:
                if kw in req_lower:
                    req_domains.add(domain)
                if kw in cand_lower:
                    cand_domains.add(domain)

        # Si están en dominios diferentes → penalizar fuerte
        if req_domains and cand_domains and not req_domains.intersection(cand_domains):
            logger.info(f"🎓 Domain penalty applied: '{req}' ({req_domains}) vs '{cand}' ({cand_domains})")
            return 0.25  # Penalización severa

        # Si uno tiene dominio y el otro no está clasificado → penalización leve
        if req_domains and not cand_domains:
            return 0.6

        return 1.0  # Sin penalización (mismo dominio o ambos sin clasificar)

    # ------------------------------------------------------------------ #
    #  ROLE TRANSFERABILITY CHECK                                         #
    # ------------------------------------------------------------------ #

    async def _check_role_transferability(
        self,
        candidate_roles: list,
        target_role: str,
        expanded_skills: list
    ) -> bool:
        """
        Verifica si las habilidades del candidato son transferibles al rol objetivo.
        Usa un LLM para determinar si hay superposición de competencias entre industrias distintas.
        """
        if not expanded_skills or not candidate_roles:
            return False

        # Filtro rápido: si tiene skills muy especializadas del dominio del target
        # ej. target_role = "Médico Veterinario", skills = ["Python","JavaScript"]
        # → claramente no transferible, evitar llamada LLM
        target_lower = target_role.lower()
        domain_hints = ["veterinari", "medicin", "enfermer", "clinica", "hospital",
                        "derecho", "abogad", "legal", "construccion", "obra",
                        "educacion", "docenc", "pedagog"]

        # Si el target es de un dominio específico y el candidato no tiene
        # skills relacionadas, cortocircuitar
        if any(hint in target_lower for hint in domain_hints):
            all_skills_text = " ".join(str(s).lower() for s in expanded_skills)
            has_relevant = any(
                kw in all_skills_text
                for kw in ["medicin", "veterinari", "enfermer", "derecho",
                          "legal", "construccion", "obra", "pedagog", "docenc"]
            )
            # Si no hay skills relevantes al dominio, no transferible
            if not has_relevant:
                logger.info(f"🔄 Quick reject: target '{target_role}' has domain keywords "
                           f"but candidate skills don't match")
                return False

        prompt = f"""
        Eres un analista de transferibilidad profesional.
        Determina si las habilidades y roles de un candidato son TRANSFERIBLES
        a un rol objetivo.

        Rol objetivo: {target_role}
        Roles del candidato: {candidate_roles}
        Habilidades del candidato: {expanded_skills}

        Responde SOLO con "TRUE" si las habilidades son transferibles
        (ej. un Contador puede ser Analista Financiero porque ambos usan
        análisis de datos, reporting, Excel).
        Responde "FALSE" si NO hay transferibilidad real
        (ej. un Ingeniero de Software no tiene habilidades de Cirugía Veterinaria).

        Respuesta (TRUE/FALSE):
        """

        result = await self.llm_service.call_agent(
            prompt=prompt,
            input_data="",
            stage_name="TRANSFERABILITY_CHECK",
            temperature=0.0
        )

        if isinstance(result, str) and result.strip().upper() == "TRUE":
            return True
        return False

    def _build_evaluation_prompt_with_rubric(self, rubric, baseline_scores) -> str:
        checklist_text = f"""
TABLA DE EVALUACIÓN (RÚBRICA MAESTRA):
- Títulos: {rubric.education.required_degrees} (Kill Clause: {rubric.education.kill_clause})
- Roles: {rubric.experience.key_roles}
- Skills: {rubric.skills.mandatory_skills}

EVALUACIÓN CUANTITATIVA BASE (Calculada por el Motor de Reglas):
- Educación: {baseline_scores.get('education')}
- Experiencia: {baseline_scores.get('experience')}
- Skills: {baseline_scores.get('skills_match')}
"""
        return f"""Eres un Analista Senior de Reclutamiento. Tu tarea es proporcionar una evaluación CUALITATIVA de un candidato frente a un puesto de trabajo.

⚠️ INSTRUCCIÓN CRÍTICA: NO generes puntajes numéricos (score).
El motor de reglas ya calculó todos los scores deterministas.
Tu trabajo es exclusivamente INTERPRETAR y REDACTAR el razonamiento cualitativo.

{checklist_text}

INSTRUCCIONES:
1. Para CADA dimensión, genera un `reasoning` que explique los matices cualitativos.
   Ej: "Aunque tiene 5 años de experiencia, el score de 60 refleja que los roles previos no alinean directamente con la rúbrica porque..."
2. Genera listas accionables y reales de `strengths` (fortalezas) y `gaps` (brechas).
3. Genera un `summary` ejecutivo descriptivo.
4. CRÍTICO: NO incluyas puntajes numéricos ni porcentajes en el summary.
5. Devuelve estricta y ÚNICAMENTE un JSON válido, sin Markdown extra.

FORMATO DE SALIDA (JSON válido - SIN scores, SOLO reasoning):

```json
{{
  "breakdown": {{
    "skills_match": {{
      "reasoning": "El candidato demuestra 8/10 habilidades técnicas requeridas..."
    }},
    "experience": {{
      "reasoning": "5 años de experiencia en roles relevantes..."
    }},
    "education": {{
      "reasoning": "Licenciatura en Ingeniería alineada con el perfil..."
    }},
    "cultural_fit": {{
      "reasoning": "Liderazgo y comunicación evidenciados en experiencia previa..."
    }},
    "logistics": {{
      "reasoning": "Ubicación compatible con el requisito del puesto..."
    }},
    "career_trajectory": {{
      "reasoning": "Progresión clara con crecimiento en responsabilidades..."
    }}
  }},
  "strengths": ["Fuerte stack técnico", "Buena comunicación"],
  "gaps": ["Falta inglés avanzado"],
  "summary": "Candidato con sólida formación en TI, con gran potencial para adaptarse al stack requerido mediante un plan de capacitación específico."
}}
```
"""

    def _parse_llm_response(self, llm_result: Dict[str, Any], deterministic_scores: Dict[str, Any] = None) -> Optional[ScoringResponse]:
        """
        Parse LLM response y construye ScoringResponse.
        Los scores vienen 100% de deterministic_scores (matriz de reglas).
        El LLM solo provee reasoning, strengths, gaps y summary.
        """
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

            for dimension_key, weight in ScoringRubric.WEIGHTS.items():
                dimension_data = breakdown_dict.get(dimension_key, {})
                reasoning = dimension_data.get("reasoning", "Sin explicación")

                # SCORE 100% DETERMINISTA: el LLM NO genera scores, solo reasoning
                final_score = 0.0
                if deterministic_scores and dimension_key in deterministic_scores:
                    det_score = deterministic_scores.get(dimension_key)
                    if det_score is not None:
                        final_score = float(det_score)
                else:
                    # Fallback por si falta alguna dimensión en deterministic_scores
                    logger.warning(f"⚠️ No deterministic score for {dimension_key}. Using 0.")
                    final_score = 0.0

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
