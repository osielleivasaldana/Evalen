#!/usr/bin/env python3

import asyncio
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent))

from app.services.robust_extraction_service import RobustExtractionService
from app.services.llm_service import LLMService
from app.models.resume import ResumeExtractionRequest

async def test_titular_fix():
    """Test the fixed titular identification"""

    llm_service = LLMService()
    robust_service = RobustExtractionService(llm_service)

    # CV with the exact structure of Osiel's CV
    cv_text = """
    Osiel Leiva Saldaña
    Ingeniero Informático
    osielleivasaldana@gmail.com
    +56 967891153
    linkedin.com/in/osielleiva

    EXPERIENCIA LABORAL

    QA Test Lead Automation Engineer
    Kibernum S.A
    Enero 2024 - Actualidad
    - Automatización de pruebas para flujos críticos

    QA Test Lead Automation Engineer
    Zippy SpA
    Marzo 2021 - Noviembre 2023
    - Desarrollo y ejecución de automatización de pruebas

    Full Stack Developer Engineer
    Ticblue
    Mayo 2018 - Abril 2019
    - Diseño y desarrollo de servicios de API REST

    FORMACIÓN COMPLEMENTARIA
    - Certificación en Big Data y Analytics
    - Diplomado en Inteligencia Artificial
    """

    print("Testing titular identification fix...")

    request = ResumeExtractionRequest(
        archivo_contenido=cv_text,
        tipo_archivo="txt",
        nombre_archivo="titular_fix_test.txt"
    )

    try:
        result = await robust_service.extract_from_text(request)

        print("\n" + "="*60)
        print("TITULAR IDENTIFICATION TEST:")
        print(f"Email: {result.datos_cv.datos_contacto.email}")
        print(f"Titular: '{result.datos_cv.titular_profesional.titular}'")
        print(f"Confidence: {result.confianza_general}")

        # Check if we got the correct titular
        expected_titular = "Ingeniero Informático"
        actual_titular = result.datos_cv.titular_profesional.titular

        if actual_titular == expected_titular:
            print(f"\n✅ SUCCESS: Correct titular identified!")
            print(f"   Expected: '{expected_titular}'")
            print(f"   Got:      '{actual_titular}'")
        else:
            print(f"\n❌ FAILED: Incorrect titular identification!")
            print(f"   Expected: '{expected_titular}'")
            print(f"   Got:      '{actual_titular}'")

            # Check if it confused it with experience titles
            experience_titles = [
                "QA Test Lead Automation Engineer",
                "Full Stack Developer Engineer"
            ]
            if actual_titular in experience_titles:
                print(f"   ⚠️  Confused titular with experience cargo: '{actual_titular}'")

    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_titular_fix())