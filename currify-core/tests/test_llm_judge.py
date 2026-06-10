"""
LLM-as-a-Judge evaluation test.
Uses an LLM to evaluate the structured extraction output of a CV against the original raw CV text.
"""
import pytest
import os
import json
import logging
from pydantic import BaseModel, Field
from typing import List, Optional
from app.services.llm_service import LLMService
from app.services.robust_extraction_service import RobustExtractionService
from app.core.config import settings

logger = logging.getLogger(__name__)

class JudgeScorecard(BaseModel):
    reasoning: str = Field(description="Explicación detallada paso a paso sobre completitud, exactitud fáctica y cumplimiento de formato.")
    completeness_score: int = Field(description="Puntaje de 1 a 5 para completitud (¿se extrajo toda la información relevante?).")
    accuracy_score: int = Field(description="Puntaje de 1 a 5 para exactitud fáctica (¿hay alucinaciones o datos inventados?).")
    formatting_score: int = Field(description="Puntaje de 1 a 5 para cumplimiento de formato (¿sigue las restricciones de campos?).")
    overall_score: int = Field(description="Puntaje general del 1 al 5.")
    missed_details: List[str] = Field(description="Lista de detalles o secciones omitidas del CV original.")
    hallucinations_detected: List[str] = Field(description="Lista de datos en la extracción que no estaban en el CV original.")

@pytest.mark.asyncio
async def test_llm_as_a_judge_on_extraction():
    # Only run if API Key is configured
    if not settings.current_api_key:
        pytest.skip("No API key configured for the current LLM provider. Skipping LLM-as-a-Judge test.")

    # 1. Sample CV Input
    raw_cv_text = """
    OSIEL LEIVA SALDAÑA
    Ingeniero de Software y QA Automation Engineer
    Santiago, Chile | osiel@example.com | +56967891153

    RESUMEN PROFESIONAL
    Ingeniero Informático con 15 años de experiencia en desarrollo de software y aseguramiento de calidad (QA).
    Especialista en automatización de pruebas e integración continua.

    EXPERIENCIA LABORAL

    Gerente de QA | Tech Solutions (Enero 2021 - Presente)
    - Lideré la automatización de pruebas E2E con Selenium y Python, logrando reducir los bugs en producción en un 40%.
    - Diseñé estrategias de QA para proyectos de e-commerce a gran escala.

    Desarrollador Full Stack | Web Agencies (Marzo 2018 - Diciembre 2020)
    - Desarrollo de portales web utilizando React, Node.js y bases de datos PostgreSQL.
    - Integración de pasarelas de pago y optimización de rendimiento.

    EDUCACIÓN

    Ingeniería en Informática (2010 - 2015)
    Universidad de Chile, Graduado.
    """

    # 2. Run the actual extraction service
    from app.models.resume import ResumeExtractionRequest
    llm_service = LLMService()
    extraction_service = RobustExtractionService(llm_service)
    
    logger.info("Executing extraction on CV sample...")
    request = ResumeExtractionRequest(
        archivo_contenido=raw_cv_text,
        tipo_archivo="txt",
        nombre_archivo="cv_test.txt"
    )
    extraction_response = await extraction_service.extract_from_text(request, request_id="judge-test-01")
    assert extraction_response is not None, "Extraction response was None"
    extraction_result = extraction_response.datos_cv
    
    # Convert extracted data to JSON string for the Judge
    try:
        extracted_data_json = json.dumps(extraction_result.dict(), ensure_ascii=False, indent=2)
    except AttributeError:
        extracted_data_json = json.dumps(extraction_result, ensure_ascii=False, indent=2)

    # 3. Define the Judge Prompt
    judge_prompt = """
    Eres un Evaluador Experto de Calidad de Extracción de Datos (QA Judge).
    Tu tarea es evaluar la calidad de una extracción estructurada en formato JSON comparándola con el texto original del CV.

    Evalúa la extracción en base a:
    1. **Completitud (Completeness)**: ¿Se extrajeron todos los trabajos, empresas, fechas, educación y habilidades del texto original?
    2. **Exactitud Fáctica (Accuracy)**: ¿Hay alucinaciones, datos inventados o tergiversados?
    3. **Cumplimiento de Formato (Formatting)**: ¿Se omitió información no deseada en los campos (ej. RUT en el nombre)?

    Usa la siguiente escala del 1 al 5 para asignar puntajes:
    - **5 (Perfecto)**: 100% de la información crítica extraída, sin errores, sin alucinaciones, formato impecable.
    - **4 (Bueno)**: Mínimas omisiones (ej. una habilidad menor omitida), pero todo lo demás correcto y preciso.
    - **3 (Aceptable)**: Faltan detalles secundarios o hay pequeñas inconsistencias de formato, pero sin errores fácticos graves.
    - **2 (Malo)**: Faltan secciones enteras (ej. un trabajo completo) o contiene alucinaciones leves.
    - **1 (Crítico/Fallo)**: La extracción está vacía, es completamente incorrecta o contiene alucinaciones severas.
    
    Debes razonar paso a paso tu decisión (pensar en voz alta) antes de asignar los puntajes finales.
    """

    judge_input_data = f"""
    === TEXTO ORIGINAL DEL CV ===
    {raw_cv_text}
    =============================

    === EXTRACCIÓN ESTRUCTURADA ===
    {extracted_data_json}
    ===============================
    """

    # 4. Call the Judge LLM
    logger.info("Calling LLM-as-a-Judge to evaluate extraction...")
    judge_response: Optional[JudgeScorecard] = await llm_service.call_agent_structured(
        prompt=judge_prompt,
        input_data=judge_input_data,
        response_model=JudgeScorecard,
        stage_name="LLM_AS_A_JUDGE",
        request_id="judge-test-01"
    )

    assert judge_response is not None, "LLM-as-a-Judge failed to return structured response"

    # 5. Output results
    print("\n\n====== LLM-AS-A-JUDGE EVALUATION RESULTS ======")
    print(f"Completeness Score: {judge_response.completeness_score}/5")
    print(f"Accuracy Score:     {judge_response.accuracy_score}/5")
    print(f"Formatting Score:   {judge_response.formatting_score}/5")
    print(f"Overall Score:      {judge_response.overall_score}/5")
    print(f"Reasoning:\n{judge_response.reasoning}")
    if judge_response.missed_details:
        print(f"Missed Details: {judge_response.missed_details}")
    if judge_response.hallucinations_detected:
        print(f"Hallucinations: {judge_response.hallucinations_detected}")
    print("================================================\n")

    # 6. Basic Structure and Range Assertions
    # We assert that the judge successfully generated scores within the valid range.
    # We print warnings for low quality instead of failing the test suite, allowing optimization.
    assert 1 <= judge_response.overall_score <= 5, f"Invalid overall score: {judge_response.overall_score}"
    assert 1 <= judge_response.completeness_score <= 5
    assert 1 <= judge_response.accuracy_score <= 5
    assert 1 <= judge_response.formatting_score <= 5

    if judge_response.overall_score < 4:
        logger.warning(f"⚠️ Prompt evaluation score is low: {judge_response.overall_score}/5. Prompt optimization is recommended.")
