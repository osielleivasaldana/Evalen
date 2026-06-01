#!/usr/bin/env python3

import asyncio
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent))

from app.services.robust_extraction_service import RobustExtractionService
from app.services.llm_service import LLMService
from app.models.resume import ResumeExtractionRequest

async def simple_test():
    """Simple test for titular extraction"""

    # Initialize services
    print("Initializing services...")
    llm_service = LLMService()
    robust_service = RobustExtractionService(llm_service)

    # Very simple CV text with clear titular
    sample_cv_text = """
    OSIEL LEIVA SALDANA
    Email: osiel.leiva@ejemplo.com

    TITULAR PROFESIONAL:
    Ingeniero Informatico Senior

    EXPERIENCIA LABORAL:
    Software Developer - Tech Company (2020-2023)
    - Desarrollo de aplicaciones web

    FORMACION COMPLEMENTARIA:
    - Curso de Python (2021)
    - Certificacion AWS (2022)
    """

    print("Testing extraction...")

    request = ResumeExtractionRequest(
        archivo_contenido=sample_cv_text,
        tipo_archivo="txt",
        nombre_archivo="simple_test.txt"
    )

    try:
        result = await robust_service.extract_from_text(request)

        print("============================================")
        print("RESULTS:")
        print(f"CONFIDENCE: {result.confianza_general}")
        print(f"EMAIL: {result.datos_cv.datos_contacto.email}")
        print(f"TITULAR: {result.datos_cv.titular_profesional.titular}")

        cursos = result.datos_cv.formacion_complementaria.certificaciones_cursos
        print(f"FORMACION COMPLEMENTARIA: {len(cursos)} cursos")
        for i, curso in enumerate(cursos, 1):
            print(f"  {i}. {curso}")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(simple_test())