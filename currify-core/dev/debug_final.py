#!/usr/bin/env python3

import asyncio
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent))

from app.services.robust_extraction_service import RobustExtractionService
from app.services.llm_service import LLMService
from app.models.resume import ResumeExtractionRequest

async def debug_final():
    """Final debug to see where data is lost"""

    llm_service = LLMService()
    robust_service = RobustExtractionService(llm_service)

    # CV that should trigger chunking and the null issue
    cv_text = """
    Osiel Leiva Saldaña
    Email: osielleivasaldana@gmail.com
    Teléfono: +56 967891153

    TITULAR PROFESIONAL
    Ingeniero Informático Senior

    EXPERIENCIA LABORAL

    QA Test Lead Automation Engineer
    Kibernum S.A
    Enero 2024 - Actualidad
    - Automatización de pruebas para flujos críticos en un proyecto interno de Citi Bank
    - Reducción de errores en ambientes de pruebas en más de un 50%
    - Uso de Selenium, Java, Cucumber y Selenium Grid desplegados en Jenkins
    - Aumento de cobertura de planes de pruebas manuales
    - Planificación y análisis de nuevas funcionalidades con equipos multinacionales

    QA Test Lead Automation Engineer
    Zippy SpA
    Marzo 2021 - Noviembre 2023
    - Desarrollo y ejecución de automatización de pruebas para flujos críticos
    - Uso de Selenium, Java y Cucumber, integrados con BrowserStack
    - Verificación de compatibilidad de interfaz de usuario en amplia variedad de dispositivos
    - Desarrollo de plan completo de pruebas para nueva aplicación con Appium
    - Pruebas en diferentes modelos de dispositivos Android e iPhone
    - Liderazgo en integración de BDD para unificar entendimiento de comportamiento
    - Uso del lenguaje de dominio Gherkin para disminuir errores de comprensión
    - Automatización de pruebas con Selenium con cobertura de 60% de historias de usuario
    - Diseño de planes de pruebas de historias de usuario utilizando Zephyr
    - Implementación de flujo completo de pruebas de regresión con Postman y CI/CD
    - Identificación de cuellos de botella en servicios críticos mediante pruebas de performance con K6

    QA Test Automation Engineer
    23People
    Octubre 2019 - Marzo 2021
    - Diseño y ejecución de planes de pruebas para historias de usuario
    - Uso de Zephyr y Microsoft Azure
    - Administración y configuración de entorno de pruebas en Azure Deployment Environments
    - Participación en proceso integral de pruebas de regresión utilizando Postman
    - Trabajo en proyectos de Telefónica y Asociación Chilena de Seguridad

    FORMACIÓN COMPLEMENTARIA

    Certificación en Big Data y Analytics en Cisco Networking Academy
    Diplomado en Inteligencia Artificial en la Pontificia Universidad Católica de Valparaíso
    Diplomado en IoT y Ciudades Inteligentes en la Universidad de la Frontera

    HABILIDADES TÉCNICAS

    Java, Selenium, Cucumber, Jenkins, BrowserStack, Appium, Postman, K6, Zephyr, Azure
    JavaScript, Python, Node.js, Spring Boot, Docker, Kubernetes, Git, JIRA, Confluence
    TestRail, SoapUI, RestAssured, Maven, Gradle, IntelliJ IDEA, Eclipse, Visual Studio Code
    SQL, MongoDB, PostgreSQL, MySQL, Linux, Windows, MacOS, Agile, Scrum, Kanban
    TDD, BDD, CI/CD, DevOps, REST APIs, SOAP, JSON, XML, HTML, CSS
    """

    print(f"CV length: {len(cv_text)} chars")

    request = ResumeExtractionRequest(
        archivo_contenido=cv_text,
        tipo_archivo="txt",
        nombre_archivo="debug_final.txt"
    )

    try:
        print("Starting extraction...")
        result = await robust_service.extract_from_text(request)

        print("\n" + "="*60)
        print("FINAL RESULTS:")
        print(f"Confidence: {result.confianza_general}")
        print(f"Email: {result.datos_cv.datos_contacto.email}")
        print(f"Titular: {result.datos_cv.titular_profesional.titular}")
        print(f"Missing fields: {result.campos_faltantes}")

    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(debug_final())