"""
Interview Guide API Endpoints
Genera preguntas de entrevista para una etapa del proceso de selección.
"""

import logging
from fastapi import APIRouter, Body, Depends, HTTPException, Request, Response, status
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.models.interview import InterviewGuideRequest, InterviewGuideResponse
from app.services.interview_service import InterviewService
from app.services.llm_service import token_usage_var
from app.core.security import verify_token
from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/interview", tags=["interview"])

# Rate limiter
limiter = Limiter(key_func=get_remote_address)


@router.post(
    "/questions",
    response_model=InterviewGuideResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate interview guide questions for a stage",
    description="""
    Generates up to 5 interview questions for a selection-process stage.

    **Input:**
    - `campaign`: title, description, requirements of the job campaign
    - `stage`: name and description of the stage (e.g. 'Entrevista Técnica', 'Psicolaboral')
    - `candidate`: resume summary, technical skills and CV gaps
    - `rubric_criteria`: mandatory criteria of the job rubric (optional)

    **Privacy:** the model never receives feedback, notes or decisions from other stages,
    nor sensitive candidate data. The stage name/description drives the question style
    (technical deep-dive, SHAR/STAR behavioral, cultural fit, etc.).
    """,
)
@limiter.limit(f"{settings.rate_limit_requests}/{settings.rate_limit_window}minute")
async def generate_interview_guide(
    request: Request,
    response: Response,
    payload: InterviewGuideRequest = Body(...),
    token: dict = Depends(verify_token),
):
    token_usage_list = []
    tok = token_usage_var.set(token_usage_list)
    try:
        logger.info("Received interview guide request")
        service = InterviewService()
        result = await service.generate_guide(payload, request_id=token.get("sub", "unknown"))

        if token_usage_list:
            total_prompt = sum(u.get("prompt_tokens", 0) for u in token_usage_list)
            total_completion = sum(u.get("completion_tokens", 0) for u in token_usage_list)
            models = list(set(u.get("model", "unknown") for u in token_usage_list))
            response.headers["X-LLM-Prompt-Tokens"] = str(total_prompt)
            response.headers["X-LLM-Completion-Tokens"] = str(total_completion)
            response.headers["X-LLM-Model"] = ",".join(models)

        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in interview endpoint: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error inesperado durante la generación de la guía",
        )
    finally:
        token_usage_var.reset(tok)