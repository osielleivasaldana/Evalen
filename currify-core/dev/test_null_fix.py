#!/usr/bin/env python3

import asyncio
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent))

from app.services.robust_extraction_service import RobustExtractionService
from app.services.llm_service import LLMService
from app.models.resume import ResumeExtractionRequest

async def test_null_fix():
    """Test to verify null values don't override valid data"""

    llm_service = LLMService()
    robust_service = RobustExtractionService(llm_service)

    # CV text long enough to trigger chunking
    long_cv_text = """
    Osiel Leiva Saldaña
    Ingeniero Informático Senior
    Email: osiel.leiva@ejemplo.com
    Teléfono: +56 967891153
    LinkedIn: linkedin.com/in/osielleiva

    RESUMEN PROFESIONAL
    Profesional con más de 15 años de experiencia en el área de TI, enfocado en la automatización de pruebas de software y la integración de BDD en proyectos. Apasionado por la mejora continua y la implementación de soluciones innovadoras.

    EXPERIENCIA LABORAL

    QA Test Lead Automation Engineer
    Kibernum S.A
    Enero 2024 - Actualidad
    - Automaticé pruebas para flujos críticos en un proyecto interno de Citi Bank, reduciendo los errores en ambientes de pruebas en más de un 50%. Utilicé Selenium, Java, Cucumber y Selenium Grid desplegados en Jenkins.
    - Aumenté la cobertura de planes de pruebas manuales a todas las historias de usuario de frontend y backend no contempladas en la automatización con el objetivo de garantizar que todas las funcionalidades cumplieran con los requisitos establecidos.
    - Participé en la planificación y análisis de nuevas funcionalidades con equipos multinacionales.

    QA Test Lead Automation Engineer
    Zippy SpA
    Marzo 2021 - Noviembre 2023
    - Desarrollé y ejecuté la automatización de pruebas para flujos críticos utilizando Selenium, Java y Cucumber, integrados con BrowserStack. Esta implementación nos permitió verificar la compatibilidad de nuestra interfaz de usuario en una amplia variedad de dispositivos.
    - Utilizando Appium, desarrollé un plan completo de pruebas para la nueva aplicación de la compañía. Se realizaron pruebas tanto en diferentes modelos de dispositivos Android como iPhone, asegurando la cobertura de escenarios críticos en múltiples plataformas.
    - Lideré la integración de BDD para unificar el entendimiento del comportamiento esperado de cada funcionalidad utilizando el lenguaje de dominio Gherkin.
    - Diseñé planes de pruebas de las historias de usuario utilizando Zephyr, esto con el fin de abordar casos bordes no especificados en las automatizaciones.
    - Implementé un flujo completo de pruebas de regresión utilizando Postman integrado con CI/CD, ejecutándose después de cada despliegue.

    QA Test Automation Engineer
    23People
    Octubre 2019 - Marzo 2021
    - Diseñé y ejecuté planes de pruebas para historias de usuario utilizando Zephyr y Microsoft Azure, permitiendo abordar tanto los casos especificados como aquellos no contemplados en los criterios de aceptación.
    - Administré y configuré mi entorno de pruebas en Azure Deployment Environments, lo que me permitió obtener independencia y control total sobre las pruebas.
    - Participé en un proceso integral de pruebas de regresión utilizando Postman en un proyecto de Telefónica y en otro de la Asociación Chilena de Seguridad.

    Jefe del departamento TI
    Coopeserau
    Abril 2014 - Marzo 2017
    - Diseñé e implementé estándares de IT en la organización para asegurar la consistencia y la eficiencia en las operaciones tecnológicas.
    - Dirigí proyectos de infraestructura y software con el objetivo de optimizar los sistemas y procesos tecnológicos.
    - Colaboré con stakeholders para alinear las estrategias de IT con los objetivos del negocio.

    FORMACIÓN ACADÉMICA

    Ingeniería en Sistemas
    Universidad Nacional
    2016 - 2020
    Grado académico obtenido con distinción en área de desarrollo de software.

    FORMACIÓN COMPLEMENTARIA

    Certificación en Big Data y Analytics en Cisco Networking Academy
    Diplomado en Inteligencia Artificial en la Pontificia Universidad Católica de Valparaíso
    Diplomado en IoT y Ciudades Inteligentes en la Universidad de la Frontera

    HABILIDADES TÉCNICAS

    Java, Selenium, Cucumber, Jenkins, BrowserStack, Appium, Postman, K6, Zephyr, Azure, JavaScript, Python, Node.js, Spring Boot, Docker, Kubernetes, Git, JIRA, Confluence, TestRail, SoapUI, RestAssured, Maven, Gradle, IntelliJ IDEA, Eclipse, Visual Studio Code, SQL, MongoDB, PostgreSQL, MySQL, Linux, Windows, MacOS, Agile, Scrum, Kanban, TDD, BDD, CI/CD, DevOps

    IDIOMAS

    Español (Nativo)
    Inglés (Intermedio - Avanzado)
    """

    print(f"CV length: {len(long_cv_text)} chars (max: {robust_service.max_text_length})")
    print("Will chunk:", "YES" if len(long_cv_text) > robust_service.max_text_length else "NO")

    request = ResumeExtractionRequest(
        archivo_contenido=long_cv_text,
        tipo_archivo="txt",
        nombre_archivo="test_long.txt"
    )

    try:
        result = await robust_service.extract_from_text(request)

        print("\n============================================")
        print("RESULTS WITH NULL-PROTECTION:")
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
    asyncio.run(test_null_fix())