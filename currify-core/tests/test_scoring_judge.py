"""
LLM-as-a-Judge: Evalúa la precisión del motor de scoring en 4 escenarios clave.
Verifica que las correcciones de dominio cruzado funcionen correctamente.
"""
import pytest
import json
import logging
from typing import List, Optional
from pydantic import BaseModel, Field
from app.services.llm_service import LLMService
from app.services.scoring_service import ScoringService
from app.core.config import settings

logger = logging.getLogger(__name__)


class ScoringJudgeScorecard(BaseModel):
    reasoning: str = Field(description="Análisis paso a paso de la evaluación")
    education_accuracy: int = Field(description="1-5: ¿El score de educación refleja correctamente la relación entre campos?")
    experience_accuracy: int = Field(description="1-5: ¿El score de experiencia refleja correctamente los roles?")
    overall_plausibility: int = Field(description="1-5: ¿El score global es plausible dado el perfil vs puesto?")
    detected_bugs: List[str] = Field(default_factory=list, description="Bugs o inconsistencias detectadas")


# Escenarios de prueba
SCENARIOS = [
    {
        "name": "ingeniero_a_veterinario",
        "description": "Ingeniero Informático postula a Médico Veterinario. Debería obtener ~0 en education y experience.",
        "candidate": {
            "titular_profesional": {"titular": "Ingeniero Informático"},
            "formacion_academica": [{"titulo": "Ingeniería Informática", "institucion": "Universidad de Chile"}],
            "experiencia_laboral": [
                {"cargo": "Desarrollador Full Stack", "empresa": "Tech Corp",
                 "responsabilidades": ["Desarrollo web con React", "APIs en Node.js"]}
            ],
            "habilidades": {"habilidades_tecnicas": ["Python", "JavaScript", "React", "Node.js"]}
        },
        "job": {"title": "Médico Veterinario", "description": "Atención clínica de animales menores y mayores."},
        "assertions": {
            "education_max": 20.0,
            "overall_max": 40.0
        }
    },
    {
        "name": "ingeniero_a_ingeniero",
        "description": "Ingeniero Informático postula a Desarrollador Senior. Debería obtener score alto en educación.",
        "candidate": {
            "titular_profesional": {"titular": "Ingeniero Informático"},
            "formacion_academica": [{"titulo": "Ingeniería Informática", "institucion": "U. de Chile"}],
            "experiencia_laboral": [
                {"cargo": "Senior Software Engineer", "empresa": "BigTech",
                 "responsabilidades": ["Arquitectura de microservicios", "Liderazgo técnico"]}
            ],
            "habilidades": {"habilidades_tecnicas": ["Python", "AWS", "Docker", "Kubernetes"]}
        },
        "job": {"title": "Desarrollador Full Stack Senior", "description": "5+ años en desarrollo de software."},
        "assertions": {
            "education_min": 60.0,
            "overall_min": 60.0
        }
    },
    {
        "name": "contador_a_analista",
        "description": "Contador postula a Analista de Datos. Debería obtener score medio (skills transferibles).",
        "candidate": {
            "titular_profesional": {"titular": "Contador Auditor"},
            "formacion_academica": [{"titulo": "Contador Público Auditor", "institucion": "U. Diego Portales"}],
            "experiencia_laboral": [
                {"cargo": "Analista Financiero Senior", "empresa": "Banco",
                 "responsabilidades": ["Análisis de datos financieros", "Reporting con Excel y SQL",
                                       "Modelos financieros en Python"]}
            ],
            "habilidades": {"habilidades_tecnicas": ["Excel", "SQL", "Python", "Power BI"]}
        },
        "job": {"title": "Analista de Datos", "description": "Análisis de datos y reporting para la gerencia."},
        "assertions": {
            "education_min": 15.0,
            "education_max": 70.0,
            "overall_min": 30.0,
            "overall_max": 75.0
        }
    },
    {
        "name": "medico_a_enfermero",
        "description": "Médico postula a Enfermero. Debería obtener score alto (mismo dominio SALUD).",
        "candidate": {
            "titular_profesional": {"titular": "Médico Cirujano"},
            "formacion_academica": [{"titulo": "Medicina", "institucion": "U. Católica"}],
            "experiencia_laboral": [
                {"cargo": "Médico General", "empresa": "Hospital Clínico",
                 "responsabilidades": ["Atención de pacientes", "Diagnóstico clínico",
                                       "Coordinación con enfermería"]}
            ],
            "habilidades": {"habilidades_tecnicas": ["Diagnóstico clínico", "Gestión de pacientes", "Farmacología"]}
        },
        "job": {"title": "Enfermero Jefe", "description": "Supervisión del equipo de enfermería en clínica privada."},
        "assertions": {
            "education_min": 40.0,
            "overall_min": 45.0
        }
    }
]


@pytest.mark.asyncio
@pytest.mark.parametrize("scenario", SCENARIOS, ids=[s["name"] for s in SCENARIOS])
async def test_scoring_judge(scenario):
    """Evalúa cada escenario con el motor de scoring y verifica las aserciones de dominio."""
    # Skip if no API key configured
    if not settings.current_api_key:
        pytest.skip("No API key configured for the current LLM provider.")

    llm_service = LLMService()
    scoring_service = ScoringService(llm_service)

    # Ejecutar scoring real
    result = await scoring_service.evaluate_candidate(
        candidate_data=scenario["candidate"],
        job_data=scenario["job"]
    )

    assert result is not None, f"Scoring failed for {scenario['name']}"

    # Verificar aserciones del escenario
    assertions = scenario["assertions"]
    errors = []

    if "education_min" in assertions:
        edu_score = result.breakdown.get("education")
        assert edu_score is not None, "Education breakdown missing"
        if edu_score.score < assertions["education_min"]:
            errors.append(
                f"Education score {edu_score.score} < min {assertions['education_min']}"
            )

    if "education_max" in assertions:
        edu_score = result.breakdown.get("education")
        assert edu_score is not None, "Education breakdown missing"
        if edu_score.score > assertions["education_max"]:
            errors.append(
                f"Education score {edu_score.score} > max {assertions['education_max']}"
            )

    if "overall_min" in assertions:
        if result.overall_score < assertions["overall_min"]:
            errors.append(
                f"Overall score {result.overall_score} < min {assertions['overall_min']}"
            )

    if "overall_max" in assertions:
        if result.overall_score > assertions["overall_max"]:
            errors.append(
                f"Overall score {result.overall_score} > max {assertions['overall_max']}"
            )

    # Mostrar resultados completos (siempre)
    print(f"\n====== Escenario: {scenario['name']} ======")
    print(f"  Overall: {result.overall_score:.1f}/100 ({result.recommendation})")
    for dim_key, dim_score in result.breakdown.items():
        print(f"  {dim_key}: {dim_score.score:.1f}/100 (weight: {dim_score.weight}%)")
        if dim_score.reasoning:
            print(f"    Reasoning: {dim_score.reasoning[:120]}...")
    if result.strengths:
        print(f"  Strengths: {result.strengths}")
    if result.gaps:
        print(f"  Gaps: {result.gaps}")

    if errors:
        error_msg = "; ".join(errors)
        logger.warning(f"⚠️  {scenario['name']}: {error_msg}")
        pytest.fail(error_msg)

    logger.info(f"✅ {scenario['name']}: All assertions passed (overall={result.overall_score:.1f})")


@pytest.mark.asyncio
async def test_scoring_llm_judge_evaluation():
    """
    Evalúa los 4 escenarios con LLM-as-a-Judge para obtener feedback cualitativo.
    Este test es informativo (no bloquea) y ejecuta solo el peor escenario.
    """
    if not settings.current_api_key:
        pytest.skip("No API key configured for the current LLM provider.")

    llm_service = LLMService()
    scoring_service = ScoringService(llm_service)

    # Ejecutar el escenario más crítico: ingeniero_a_veterinario
    scenario = SCENARIOS[0]

    result = await scoring_service.evaluate_candidate(
        candidate_data=scenario["candidate"],
        job_data=scenario["job"]
    )
    assert result is not None

    # Preparar data para el juez LLM
    judge_prompt = f"""
    Eres un Evaluador Experto de Calidad de Scoring (QA Judge).
    Tu tarea es evaluar si los scores generados por el motor de matching son
    PLAUSIBLES dado el perfil del candidato y el puesto.

    ESCENARIO: {scenario['description']}

    PUESTO: {json.dumps(scenario['job'], ensure_ascii=False)}
    CANDIDATO: {json.dumps(scenario['candidate'], ensure_ascii=False)}

    SCORES GENERADOS:
    {json.dumps(result.dict(), ensure_ascii=False, indent=2)}

    Evalúa usando la escala 1-5:
    5 = Perfectamente plausible y correcto
    4 = Bueno, con mínimas objeciones
    3 = Aceptable, pero hay inconsistencias notables
    2 = Malo, hay errores claros de matching
    1 = Crítico, el scoring es incorrecto
    """

    judge_result = await llm_service.call_agent_structured(
        prompt=judge_prompt,
        input_data="",
        response_model=ScoringJudgeScorecard,
        stage_name="SCORING_JUDGE",
        request_id="judge-scoring-01"
    )

    assert judge_result is not None

    print(f"\n====== 🧑‍⚖️ LLM-as-a-Judge: {scenario['name']} ======")
    print(f"  Education Accuracy: {judge_result.education_accuracy}/5")
    print(f"  Experience Accuracy: {judge_result.experience_accuracy}/5")
    print(f"  Overall Plausibility: {judge_result.overall_plausibility}/5")
    if judge_result.detected_bugs:
        print(f"  Bugs detectados: {judge_result.detected_bugs}")
    print(f"  Reasoning: {judge_result.reasoning[:500]}")

    # Advertencia si el juez detecta problemas
    if judge_result.overall_plausibility < 3:
        logger.warning(f"⚠️ LLM Judge found low plausibility ({judge_result.overall_plausibility}/5)")
