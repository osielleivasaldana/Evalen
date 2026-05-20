from fastapi import APIRouter, Depends, HTTPException, Body, Request
from slowapi import Limiter
from slowapi.util import get_remote_address
import logging
import uuid
import asyncio

from app.models.smart_fill import SmartFillRequest, SmartFillResponse
from app.services.llm_service import LLMService
from app.core.security import verify_token
from app.core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/smart-fill", tags=["AI", "Smart Fill"])
limiter = Limiter(key_func=get_remote_address)

SYSTEM_PROMPT = """
You are an expert HR Tech consultant.
Your task is to generate a comprehensive, professional job campaign draft based on the user's input.
The user will provide a 'Job Title', an optional 'Additional Context', and the desired 'Language'.
Generate a complete job offer following the required schema. Ensure requirements are clear, realistic, and formatted appropriately.
For the suggested rubric weights, ensure they add up to 1.0.
"""

@router.post("", response_model=SmartFillResponse)
@limiter.limit(f"{settings.rate_limit_requests}/{settings.rate_limit_window}minute")
async def generate_smart_fill(
    request: Request,
    payload: SmartFillRequest = Body(...),
    token: dict = Depends(verify_token)
):
    try:
        request_id = str(uuid.uuid4())[:8]
        logger.info(f"[{request_id}] Generating Smart Fill draft for Job Title: {payload.jobTitle}")

        llm = LLMService()
        
        input_data = f"Job Title: {payload.jobTitle}\n"
        if payload.additionalContext:
            input_data += f"Additional Context: {payload.additionalContext}\n"
        input_data += f"Target Language: {payload.language}\n"

        result = await llm.call_agent_structured(
            prompt=SYSTEM_PROMPT,
            input_data=input_data,
            response_model=SmartFillResponse,
            stage_name="smart_fill_generation",
            request_id=request_id
        )

        if not result:
            logger.error(f"[{request_id}] Failed to generate structured data from LLM")
            raise HTTPException(status_code=500, detail="Failed to generate structured data from LLM")

        logger.info(f"[{request_id}] Smart Fill draft generated successfully")
        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in smart fill generation: {e}")
        raise HTTPException(status_code=500, detail=str(e))
