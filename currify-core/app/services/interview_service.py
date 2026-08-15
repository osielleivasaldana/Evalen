import logging
from typing import Any, Optional
from app.models.interview import InterviewGuideRequest, InterviewGuideResponse
from app.services.llm_service import LLMService
from app.core.interview_prompts import get_interview_guide_prompt

logger = logging.getLogger(__name__)


class InterviewService:
    """Genera la guía de preguntas de entrevista para una etapa del proceso."""

    llm_service: Any = None

    def __init__(self, llm_service: Optional[LLMService] = None):
        self.llm_service = llm_service or LLMService()

    def _build_input_text(self, request: InterviewGuideRequest) -> str:
        # PRIVACIDAD: solo candidate + campaign + stage + rúbrica.
        # NUNCA feedback, notas, decisiones ni datos de otras etapas.
        habs = ", ".join(request.candidate.habilidades) or "No informadas"
        brechas = ", ".join(request.candidate.brechas) or "Sin brechas detectadas"
        rubric = "\n".join(f"- {c}" for c in request.rubric_criteria) or "Sin criterios (vacía)"

        return f"""CAMPAÑA:
Título: {request.campaign.title}
Descripción: {request.campaign.description}
Requisitos: {request.campaign.requirements}

ETAPA:
Nombre: {request.stage.name}
Descripción: {request.stage.description}

CANDIDATO:
Resumen profesional: {request.candidate.resumen}
Habilidades técnicas: {habs}
Brechas detectadas: {brechas}

RÚBRICA DEL CARGO:
{rubric}
"""

    async def generate_guide(
        self,
        request: InterviewGuideRequest,
        request_id: str = "unknown",
    ) -> InterviewGuideResponse:
        try:
            logger.info(f"[{request_id}] Generando guía de entrevista para etapa '{request.stage.name}'")
            result = await self.llm_service.call_agent_structured(
                prompt=get_interview_guide_prompt(),
                input_data=self._build_input_text(request),
                response_model=InterviewGuideResponse,
                stage_name="INTERVIEW_GUIDE",
            )
            if not result:
                logger.warning("LLM devolvió None para la guía; respuesta vacía.")
                return InterviewGuideResponse(questions=[])
            return result
        except Exception as e:
            logger.error(f"Error generando guía de entrevista: {e}", exc_info=True)
            return InterviewGuideResponse(questions=[])