#!/usr/bin/env python3

import asyncio
import logging
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent))

from app.services.robust_extraction_service import RobustExtractionService
from app.services.llm_service import LLMService
from app.models.resume import ResumeExtractionRequest

# Configure logging to capture specific info
logging.basicConfig(level=logging.INFO, format='%(message)s')

async def simple_debug():
    """Simple debug to find why titular is lost"""

    llm_service = LLMService()
    robust_service = RobustExtractionService(llm_service)

    # Short CV to avoid chunking
    cv_text = """Osiel Leiva Saldaña
Ingeniero Informático
Email: osiel@gmail.com

EXPERIENCIA LABORAL
QA Engineer - Company (2024)
- Test automation

FORMACIÓN COMPLEMENTARIA
- Certificación AWS
"""

    print(f"CV length: {len(cv_text)} chars")
    print(f"Max length: {robust_service.max_text_length}")
    print("Will chunk?" + (" YES" if len(cv_text) > robust_service.max_text_length else " NO"))

    request = ResumeExtractionRequest(
        archivo_contenido=cv_text,
        tipo_archivo="txt",
        nombre_archivo="simple.txt"
    )

    try:
        result = await robust_service.extract_from_text(request)
        print("Results:")
        print(f"  Titular: {result.datos_cv.titular_profesional.titular}")
        print(f"  Email: {result.datos_cv.datos_contacto.email}")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(simple_debug())