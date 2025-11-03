#!/usr/bin/env python3

import asyncio
import logging
import os
import sys
from pathlib import Path

# Add the app directory to the Python path
sys.path.append(str(Path(__file__).parent))

from app.services.robust_extraction_service import RobustExtractionService
from app.services.llm_service import LLMService
from app.models.resume import ResumeExtractionRequest

# Configure logging to show everything
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)

async def test_extraction():
    """Test CV extraction with enhanced logging for titular and formacion complementaria"""

    # Initialize services
    print("Initializing services...")
    llm_service = LLMService()
    robust_service = RobustExtractionService(llm_service)

    # Sample text for testing (simulating a CV)
    sample_cv_text = """
    OSIEL LEIVA SALDAÑA
    Ingeniero en Sistemas y Desarrollador Full Stack
    Email: osiel.leiva@ejemplo.com
    Teléfono: +506 8888-9999

    TITULAR PROFESIONAL:
    Ingeniero en Sistemas con especialización en Desarrollo Full Stack

    EXPERIENCIA LABORAL:
    Software Developer - Tech Company (2020-2023)
    - Desarrollo de aplicaciones web con React y Node.js
    - Implementación de APIs REST

    FORMACIÓN ACADÉMICA:
    Ingeniería en Sistemas - Universidad Nacional (2016-2020)

    FORMACIÓN COMPLEMENTARIA:
    - Curso de React Avanzado (2021)
    - Certificación AWS Solutions Architect (2022)
    - Diplomado en DevOps (2023)

    HABILIDADES TÉCNICAS:
    JavaScript, Python, React, Node.js, AWS
    """

    print("Testing extraction with sample text...")
    print(f"Text length: {len(sample_cv_text)} characters")

    # Create request object
    request = ResumeExtractionRequest(
        archivo_contenido=sample_cv_text,
        tipo_archivo="txt",
        nombre_archivo="test_cv.txt"
    )

    # Extract data
    result = await robust_service.extract_from_text(request)

    print("\n" + "="*60)
    print("EXTRACTION RESULTS")
    print("="*60)

    print(f"CONFIDENCE: {result.confianza_general}")
    print(f"EMAIL: {result.datos_cv.datos_contacto.email}")
    print(f"TITULAR: {result.datos_cv.titular_profesional.titular}")

    # Detailed formacion complementaria analysis
    cursos = result.datos_cv.formacion_complementaria.certificaciones_cursos

    print(f"FORMACION COMPLEMENTARIA: {len(cursos)} cursos encontrados")

    if cursos:
        print("\nCursos/Certificaciones encontrados:")
        for i, curso in enumerate(cursos, 1):
            print(f"   {i}. {curso}")
    else:
        print("No se encontraron cursos/certificaciones")

    print("\n" + "="*60)
    print("DETAILED ANALYSIS")
    print("="*60)

    # Show detailed sections for debugging
    print(f"\nEXPERIENCIA LABORAL: {len(result.datos_cv.experiencia_laboral)} items")
    print(f"FORMACION ACADEMICA: {len(result.datos_cv.formacion_academica)} items")
    print(f"HABILIDADES TECNICAS: {len(result.datos_cv.habilidades.habilidades_tecnicas)} items")

if __name__ == "__main__":
    asyncio.run(test_extraction())