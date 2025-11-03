#!/usr/bin/env python3

import asyncio
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent))

from app.services.robust_extraction_service import RobustExtractionService
from app.services.llm_service import LLMService
from app.models.resume import ResumeExtractionRequest

async def debug_test():
    """Debug test to see what happens with titular during chunk processing"""

    print("Initializing services...")
    llm_service = LLMService()
    robust_service = RobustExtractionService(llm_service)

    # CV text similar to what Osiel has
    osiel_cv_text = """
    Osiel Leiva Saldaña
    Ingeniero Informático
    Email: osielleivasaldana@gmail.com
    Teléfono: +56 967891153
    LinkedIn: linkedin.com/in/osielleiva

    EXPERIENCIA LABORAL

    QA Test Lead Automation Engineer
    Kibernum S.A
    Enero 2024 - Actualidad

    Automaticé pruebas para flujos críticos en un proyecto interno de Citi Bank, reduciendo los errores en ambientes de pruebas en más de un 50%. Utilicé Selenium, Java, Cucumber y Selenium Grid desplegados en Jenkins.

    QA Test Lead Automation Engineer
    Zippy SpA
    Marzo 2021 - Noviembre 2023

    Desarrollé y ejecuté la automatización de pruebas para flujos críticos utilizando Selenium, Java y Cucumber, integrados con BrowserStack.

    FORMACIÓN COMPLEMENTARIA

    Certificación en Big Data y Analytics en Cisco Networking Academy
    Diplomado en Inteligencia Artificial en la Pontificia Universidad Católica de Valparaíso
    Diplomado en IoT y Ciudades Inteligentes en la Universidad de la Frontera

    HABILIDADES TÉCNICAS

    Java, Selenium, Cucumber, Jenkins, BrowserStack, Appium, Postman, K6, Zephyr, Azure
    """

    print("Testing with Osiel-like CV...")
    print(f"CV text length: {len(osiel_cv_text)}")

    # Check if text will be chunked
    if len(osiel_cv_text) > robust_service.max_text_length:
        print(f"⚠️ Text will be chunked (length {len(osiel_cv_text)} > max {robust_service.max_text_length})")
    else:
        print(f"✅ Text will NOT be chunked (length {len(osiel_cv_text)} <= max {robust_service.max_text_length})")

    request = ResumeExtractionRequest(
        archivo_contenido=osiel_cv_text,
        tipo_archivo="txt",
        nombre_archivo="osiel_debug.txt"
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
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(debug_test())