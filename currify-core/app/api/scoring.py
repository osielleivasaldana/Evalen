"""
Scoring API Endpoints
Endpoints for candidate-job matching evaluation
"""

import logging
import hashlib
from typing import Dict, Any
from fastapi import APIRouter, HTTPException, status, Response
from app.models.scoring import (
    ScoringRequest,
    ScoringResponse,
    ScoringError,
    JobParsingRequest,
    ParsedJobData,
    CompleteJobData
)
from app.services.scoring_service import ScoringService
from app.services.llm_service import LLMService, token_usage_var
from app.core.job_parsing_prompts import get_job_parsing_prompt

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/scoring", tags=["scoring"])

# Simple in-memory cache for job parsing to prevent redundant LLM calls
_job_parsing_cache = {}


@router.post(
    "/evaluate",
    response_model=ScoringResponse,
    status_code=status.HTTP_200_OK,
    summary="Evaluate candidate-job fit",
    description="""
    Analyzes the compatibility between a candidate's CV and a job posting.

    **Input:**
    - `candidate`: JSON object with CV data (from /resume/extract endpoint)
    - `job`: JSON object with job posting data

    **Output:**
    - Overall score (0-100)
    - Detailed breakdown by dimension (skills, experience, education, etc.)
    - Strengths and gaps analysis
    - Recommendation (strong_fit, moderate_fit, weak_fit)
    - Executive summary

    **Scoring Dimensions:**
    - **Skills Match (30%)**: Technical and professional skills alignment
    - **Experience (25%)**: Years and relevance of experience
    - **Education (15%)**: Academic background match
    - **Cultural Fit (15%)**: Soft skills and values alignment
    - **Logistics (10%)**: Location, availability, salary expectations
    - **Career Trajectory (5%)**: Career growth and stability
    """
)
async def evaluate_candidate_job_fit(request: ScoringRequest, response: Response):
    """
    Evaluate how well a candidate matches a job position

    Returns detailed scoring analysis with breakdown by dimension
    """
    token_usage_list = []
    token = token_usage_var.set(token_usage_list)
    try:
        logger.info("Received scoring evaluation request")

        # Initialize scoring service
        scoring_service = ScoringService()

        # Unwrap candidate data if nested in ResumeExtractionResponse structure
        candidate_data = request.candidate
        if 'datos_cv' in candidate_data:
            logger.info("📦 Unwrapping 'datos_cv' from candidate data")
            candidate_data = candidate_data['datos_cv']

        # Perform evaluation
        result = await scoring_service.evaluate_candidate(
            candidate_data=candidate_data,
            job_data=request.job
        )

        if not result:
            logger.error("Scoring evaluation failed - no result returned")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Error al evaluar la compatibilidad. Por favor intenta nuevamente."
            )

        logger.info(f"Scoring evaluation completed: {result.overall_score:.1f}/100")

        # Set custom usage headers if logs accumulated
        if token_usage_list:
            total_prompt = sum(u.get("prompt_tokens", 0) for u in token_usage_list)
            total_completion = sum(u.get("completion_tokens", 0) for u in token_usage_list)
            models = list(set(u.get("model", "unknown") for u in token_usage_list))
            response.headers["X-LLM-Prompt-Tokens"] = str(total_prompt)
            response.headers["X-LLM-Completion-Tokens"] = str(total_completion)
            response.headers["X-LLM-Model"] = ",".join(models)
            logger.info(f"🚀 Attached usage headers: prompt={total_prompt}, completion={total_completion}, models={models}")

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in scoring endpoint: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error inesperado durante la evaluación: {str(e)}"
        )
    finally:
        token_usage_var.reset(token)


@router.post(
    "/parse-job",
    response_model=ParsedJobData,
    status_code=status.HTTP_200_OK,
    summary="Parse job description to structured format",
    description="""
    Parses a job description (plain text) into structured JSON format.

    **Use case:** When you have a Campaign with only `description` and `requirements` fields,
    this endpoint extracts structured data like skills, experience, education, etc.

    **Input:**
    - `description`: Job description text (required)
    - `requirements`: Job requirements text (optional)

    **Output:**
    - Structured job data with:
      - requisitos (experience, skills, education, languages)
      - habilidades_deseables
      - salario
      - beneficios

    **Next step:** Combine this output with Campaign metadata (title, company, location)
    and send to `/scoring/evaluate`
    """
)
async def parse_job_description(request: JobParsingRequest, response: Response):
    """
    Parse job description text into structured format using LLM

    Returns structured job data ready to be combined with campaign metadata
    """
    token_usage_list = []
    token = token_usage_var.set(token_usage_list)
    try:
        logger.info("Received job parsing request")

        # Initialize LLM service
        llm_service = LLMService()

        # Prepare input data
        input_text = f"""DESCRIPCIÓN DEL PUESTO:
{request.description}

REQUISITOS:
{request.requirements if request.requirements else 'No especificados'}
"""
        # 1. Check Cache
        job_hash = hashlib.md5(input_text.encode()).hexdigest()
        if job_hash in _job_parsing_cache:
            logger.info("♻️ Returning cached job parsing result")
            return _job_parsing_cache[job_hash]

        # Call LLM for parsing
        logger.info("Calling LLM for job description parsing")
        result = await llm_service.call_agent(
            prompt=get_job_parsing_prompt(),
            input_data=input_text,
            stage_name="JOB_PARSING",
            temperature=0.1
        )

        if not result:
            logger.error("LLM returned no result for job parsing")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Error al parsear la descripción del puesto. Por favor intenta nuevamente."
            )

        # Parse response into Pydantic model
        try:
            parsed_data = ParsedJobData(**result)
            # Store in cache
            _job_parsing_cache[job_hash] = parsed_data
            logger.info("Job description parsed successfully and cached")

            # Set custom usage headers if logs accumulated
            if token_usage_list:
                total_prompt = sum(u.get("prompt_tokens", 0) for u in token_usage_list)
                total_completion = sum(u.get("completion_tokens", 0) for u in token_usage_list)
                models = list(set(u.get("model", "unknown") for u in token_usage_list))
                response.headers["X-LLM-Prompt-Tokens"] = str(total_prompt)
                response.headers["X-LLM-Completion-Tokens"] = str(total_completion)
                response.headers["X-LLM-Model"] = ",".join(models)
                logger.info(f"🚀 Attached usage headers: prompt={total_prompt}, completion={total_completion}, models={models}")

            return parsed_data

        except Exception as e:
            logger.error(f"Error validating parsed job data: {e}")
            logger.debug(f"LLM result: {result}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error al validar los datos parseados: {str(e)}"
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in job parsing endpoint: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error inesperado durante el parsing: {str(e)}"
        )
    finally:
        token_usage_var.reset(token)


@router.post(
    "/combine-job-data",
    response_model=CompleteJobData,
    status_code=status.HTTP_200_OK,
    summary="Combine parsed job data with campaign metadata",
    description="""
    Helper endpoint to combine parsed job data with campaign metadata.

    **Input:**
    - `parsed_job`: Output from `/parse-job` endpoint
    - `campaign_data`: Object with campaign metadata (title, company, location, etc.)

    **Output:**
    - Complete job data ready for `/scoring/evaluate`
    """
)
async def combine_job_data(
    parsed_job: ParsedJobData,
    campaign_data: Dict[str, Any]
):
    """
    Combine parsed job data with campaign metadata

    Returns complete job data structure for scoring
    """
    try:
        complete_job = CompleteJobData(
            titulo=campaign_data.get("title", "No especificado"),
            empresa=campaign_data.get("company_name", "No especificado"),
            ubicacion=campaign_data.get("location", "No especificado"),
            tipo=campaign_data.get("employment_type", "Tiempo completo"),
            descripcion=campaign_data.get("description", ""),
            requisitos=parsed_job.requisitos,
            habilidades_deseables=parsed_job.habilidades_deseables,
            salario=parsed_job.salario,
            beneficios=parsed_job.beneficios
        )

        logger.info(f"Combined job data for: {complete_job.titulo}")
        return complete_job

    except Exception as e:
        logger.error(f"Error combining job data: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al combinar datos: {str(e)}"
        )


@router.get(
    "/rubric",
    summary="Get scoring rubric information",
    description="Returns the scoring rubric configuration including dimensions, weights, and criteria"
)
async def get_scoring_rubric():
    """
    Get the scoring rubric configuration

    Returns information about evaluation dimensions, weights, and criteria
    """
    from app.core.scoring_rubric import ScoringRubric

    return {
        "weights": ScoringRubric.WEIGHTS,
        "dimensions": ScoringRubric.DIMENSIONS,
        "recommendation_thresholds": ScoringRubric.RECOMMENDATION_THRESHOLDS,
        "total_weight": sum(ScoringRubric.WEIGHTS.values()),
        "is_valid": ScoringRubric.validate_weights()
    }
