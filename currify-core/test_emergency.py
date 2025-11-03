#!/usr/bin/env python3

import asyncio
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent))

from app.services.robust_extraction_service import RobustExtractionService
from app.services.llm_service import LLMService
from app.models.resume import ResumeExtractionRequest

async def test_emergency():
    """Test emergency recovery system"""

    llm_service = LLMService()
    robust_service = RobustExtractionService(llm_service)

    # CV that might trigger the bug
    cv_text = """
    OSIEL LEIVA SALDAÑA
    INGENIERO INFORMÁTICO
    osielleivasaldana@gmail.com
    +56 967891153
    linkedin.com/in/osielleiva

    EXPERIENCIA PROFESIONAL
    QA Test Lead Automation Engineer - Kibernum S.A (Enero 2024 - Actualidad)
    - Automatización de pruebas para flujos críticos en un proyecto interno de Citi Bank
    - Reducción de errores en ambientes de pruebas en más de un 50%
    - Uso de Selenium, Java, Cucumber y Selenium Grid desplegados en Jenkins
    - Aumento de cobertura de planes de pruebas manuales a todas las historias de usuario
    - Planificación y análisis de nuevas funcionalidades con equipos multinacionales

    QA Test Lead Automation Engineer - Zippy SpA (Marzo 2021 - Noviembre 2023)
    - Desarrollo y ejecución de automatización de pruebas para flujos críticos utilizando Selenium
    - Integración con BrowserStack para verificar compatibilidad de interfaz de usuario
    - Desarrollo de plan completo de pruebas para nueva aplicación con Appium
    - Liderazgo en integración de BDD para unificar entendimiento de comportamiento esperado
    - Implementación de flujo completo de pruebas de regresión utilizando Postman integrado con CI/CD

    FORMACIÓN COMPLEMENTARIA
    - Certificación en Big Data y Analytics en Cisco Networking Academy (2023)
    - Diplomado en Inteligencia Artificial en la Pontificia Universidad Católica de Valparaíso (2022)
    - Diplomado en IoT y Ciudades Inteligentes en la Universidad de la Frontera (2021)

    HABILIDADES TÉCNICAS
    Java, Selenium, Cucumber, Jenkins, BrowserStack, Appium, Postman, K6, Zephyr, Azure
    JavaScript, Python, Node.js, Spring Boot, Docker, Kubernetes, Git, JIRA, Confluence
    TestRail, SoapUI, RestAssured, Maven, Gradle, SQL, MongoDB, PostgreSQL, MySQL
    Linux, Windows, MacOS, Agile, Scrum, Kanban, TDD, BDD, CI/CD, DevOps
    """

    print(f"CV length: {len(cv_text)} chars")

    request = ResumeExtractionRequest(
        archivo_contenido=cv_text,
        tipo_archivo="txt",
        nombre_archivo="emergency_test.txt"
    )

    try:
        print("Starting extraction with emergency system...")
        result = await robust_service.extract_from_text(request)

        print("\n" + "="*60)
        print("EMERGENCY TEST RESULTS:")
        print(f"Confidence: {result.confianza_general}")
        print(f"Email: {result.datos_cv.datos_contacto.email}")
        print(f"Titular: {result.datos_cv.titular_profesional.titular}")
        print(f"Advertencias: {result.advertencias}")

        if result.datos_cv.formacion_complementaria:
            cursos = result.datos_cv.formacion_complementaria.certificaciones_cursos
            print(f"Formacion complementaria: {len(cursos)} cursos")

    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_emergency())