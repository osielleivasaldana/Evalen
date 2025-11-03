"""
Scoring Service
Evaluates candidate-job fit using AI and structured rubric
"""

import json
import logging
from typing import Dict, Any, Optional
from app.services.llm_service import LLMService
from app.core.scoring_rubric import ScoringRubric
from app.models.scoring import ScoringResponse, DimensionScore

logger = logging.getLogger(__name__)


class ScoringService:
    """Service for evaluating candidate-job matching"""

    def __init__(self):
        self.llm_service = LLMService()
        self.rubric = ScoringRubric()

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

            # Generate evaluation prompt
            prompt = self._build_evaluation_prompt()

            # Prepare input data
            input_data = json.dumps({
                "candidate": candidate_data,
                "job": job_data,
                "rubric": {
                    "dimensions": ScoringRubric.DIMENSIONS,
                    "weights": ScoringRubric.WEIGHTS
                }
            }, ensure_ascii=False, indent=2)

            # Call LLM for evaluation
            logger.info("Calling LLM for scoring analysis")
            result = await self.llm_service.call_agent(
                prompt=prompt,
                input_data=input_data,
                stage_name="SCORING_EVALUATION",
                temperature=0.1  # Low temperature for consistent scoring
            )

            if not result:
                logger.error("LLM returned no result for scoring")
                return None

            # Parse and validate response
            scoring_response = self._parse_llm_response(result)

            if scoring_response:
                logger.info(f"Scoring completed: {scoring_response.overall_score:.1f}/100 - {scoring_response.recommendation}")

            return scoring_response

        except Exception as e:
            logger.error(f"Error during scoring evaluation: {e}", exc_info=True)
            return None

    def _build_evaluation_prompt(self) -> str:
        """Build the evaluation prompt for the LLM"""
        return """Eres un experto reclutador especializado en evaluar la compatibilidad entre candidatos y puestos de trabajo.

Tu tarea es analizar exhaustivamente el CV del candidato y la descripción del puesto, y generar un análisis detallado de compatibilidad.

INSTRUCCIONES:

1. Analiza cada dimensión según los criterios proporcionados en la rúbrica
2. Asigna un puntaje de 0-100 para cada dimensión basándote en:
   - Coincidencias exactas y relevantes
   - Nivel de experiencia vs requisitos
   - Calidad y profundidad de las habilidades
   - Alineación cultural y logística

3. Para cada dimensión, proporciona un razonamiento claro y específico que explique:
   - Qué aspectos coinciden bien
   - Qué aspectos no coinciden o faltan
   - Ejemplos específicos del CV que respaldan el puntaje

4. Identifica las fortalezas clave (top 3-5 aspectos donde el candidato destaca para este puesto)
5. Identifica las brechas principales (top 3-5 áreas donde el candidato no cumple completamente)
6. Genera un resumen ejecutivo conciso (2-3 oraciones)

IMPORTANTE:
- Sé objetivo y basado en datos
- No inventes información que no esté en el CV o en la descripción del puesto
- Los puntajes deben reflejar la realidad: un 100 significa coincidencia perfecta, no ser generoso
- Si falta información crítica, refleja esto en el puntaje y razonamiento

FORMATO DE SALIDA (JSON válido):

```json
{
  "breakdown": {
    "skills_match": {
      "score": 85,
      "reasoning": "El candidato demuestra 8/10 habilidades técnicas requeridas. Tiene experiencia sólida en Python, FastAPI y PostgreSQL que coinciden exactamente con los requisitos. Sin embargo, le falta experiencia documentada en Kubernetes y CI/CD."
    },
    "experience": {
      "score": 75,
      "reasoning": "5 años de experiencia en desarrollo backend vs 3-5 años requeridos. Ha trabajado en roles similares como Backend Developer en empresas de tecnología. Falta experiencia específica en fintech que sería ideal."
    },
    "education": {
      "score": 90,
      "reasoning": "Licenciatura en Ingeniería de Sistemas cumple perfectamente con el requisito de grado en Computer Science. Certificaciones adicionales en AWS y arquitectura de software añaden valor."
    },
    "cultural_fit": {
      "score": 80,
      "reasoning": "Soft skills de trabajo en equipo, comunicación y liderazgo están presentes. Idioma inglés nivel B2 cumple requisito mínimo. Experiencia en metodologías ágiles alineada con cultura de la empresa."
    },
    "logistics": {
      "score": 100,
      "reasoning": "Ubicación en Ciudad de México coincide con la oficina. Disponibilidad inmediata. Expectativa salarial dentro del rango ofrecido."
    },
    "career_trajectory": {
      "score": 70,
      "reasoning": "Progresión clara de Junior a Senior en 5 años. Sin embargo, ha cambiado de empresa 3 veces en 2 años, lo que podría indicar menor estabilidad."
    }
  },
  "strengths": [
    "Experiencia técnica sólida en el stack tecnológico principal (Python, FastAPI, PostgreSQL)",
    "Nivel de seniority apropiado con 5 años de experiencia relevante",
    "Educación formal en Computer Science con certificaciones adicionales relevantes",
    "Ubicación geográfica ideal y disponibilidad inmediata",
    "Experiencia demostrable en proyectos de escala similar"
  ],
  "gaps": [
    "Falta experiencia en herramientas de DevOps específicas (Kubernetes, CI/CD)",
    "No tiene experiencia previa en la industria fintech",
    "Nivel de inglés en el mínimo requerido, idealmente debería ser más alto",
    "Patrón de rotación laboral relativamente alta en años recientes"
  ],
  "summary": "Candidato sólido con 75% de compatibilidad general. Cumple con los requisitos técnicos y de experiencia principales, con fortalezas en el stack tecnológico core y educación formal. Las principales brechas son la falta de experiencia en DevOps y en la industria fintech, aunque estas podrían superarse con capacitación. La ubicación y disponibilidad son ideales."
}
```

Analiza los datos proporcionados y genera tu evaluación en el formato JSON especificado."""

    def _parse_llm_response(self, llm_result: Dict[str, Any]) -> Optional[ScoringResponse]:
        """Parse and validate LLM response into ScoringResponse"""
        try:
            # Extract breakdown
            breakdown_dict = llm_result.get("breakdown", {})

            if not breakdown_dict:
                logger.error("No breakdown found in LLM response")
                return None

            # Calculate weighted scores for each dimension
            dimension_scores = {}
            total_weighted_score = 0.0

            for dimension_key, weight in ScoringRubric.WEIGHTS.items():
                dimension_data = breakdown_dict.get(dimension_key)

                if not dimension_data:
                    logger.warning(f"Missing dimension in response: {dimension_key}")
                    # Use default values if dimension is missing
                    dimension_scores[dimension_key] = DimensionScore(
                        score=0.0,
                        weight=weight,
                        weighted_score=0.0,
                        reasoning="No se pudo evaluar esta dimensión"
                    )
                    continue

                score = float(dimension_data.get("score", 0))
                reasoning = dimension_data.get("reasoning", "Sin explicación proporcionada")

                # Validate score range
                score = max(0, min(100, score))

                weighted_score = score * (weight / 100)
                total_weighted_score += weighted_score

                dimension_scores[dimension_key] = DimensionScore(
                    score=score,
                    weight=weight,
                    weighted_score=weighted_score,
                    reasoning=reasoning
                )

            # Get recommendation based on overall score
            recommendation = ScoringRubric.get_recommendation(total_weighted_score)

            # Extract strengths, gaps, and summary
            strengths = llm_result.get("strengths", [])
            gaps = llm_result.get("gaps", [])
            summary = llm_result.get("summary", "Evaluación completada")

            # Validate lists
            if not isinstance(strengths, list):
                strengths = [str(strengths)] if strengths else []
            if not isinstance(gaps, list):
                gaps = [str(gaps)] if gaps else []

            return ScoringResponse(
                overall_score=round(total_weighted_score, 2),
                recommendation=recommendation,
                breakdown=dimension_scores,
                strengths=strengths,
                gaps=gaps,
                summary=summary
            )

        except Exception as e:
            logger.error(f"Error parsing LLM response: {e}", exc_info=True)
            logger.debug(f"LLM result: {json.dumps(llm_result, indent=2)}")
            return None
