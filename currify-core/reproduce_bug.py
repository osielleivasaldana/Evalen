#!/usr/bin/env python3

import asyncio
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent))

from app.services.robust_extraction_service import RobustExtractionService
from app.services.llm_service import LLMService
from app.models.resume import ResumeExtractionRequest

async def reproduce_bug():
    """Try to reproduce the exact bug: confidence 0.95 with empty data"""

    llm_service = LLMService()
    robust_service = RobustExtractionService(llm_service)

    # Create a CV that might cause the exact bug
    cv_text = """
    Osiel Leiva Saldaña
    Ingeniero Informático
    osielleivasaldana@gmail.com
    +56 967891153
    LinkedIn: linkedin.com/in/osielleiva

    RESUMEN PROFESIONAL
    Profesional con más de 15 años de experiencia en el área de TI, enfocado en la automatización de pruebas de software y la integración de BDD en proyectos. Apasionado por la mejora continua y la implementación de soluciones innovadoras que optimizan los procesos de desarrollo y testing.

    EXPERIENCIA LABORAL

    QA Test Lead Automation Engineer
    Kibernum S.A
    Enero 2024 - Actualidad
    • Automaticé pruebas para flujos críticos en un proyecto interno de Citi Bank, reduciendo los errores en ambientes de pruebas en más de un 50%. Utilicé Selenium, Java, Cucumber y Selenium Grid desplegados en Jenkins.
    • Aumenté la cobertura de planes de pruebas manuales a todas las historias de usuario de frontend y backend no contempladas en la automatización con el objetivo de garantizar que todas las funcionalidades cumplieran con los requisitos establecidos.
    • Participé en la planificación y análisis de nuevas funcionalidades con equipos multinacionales, aportando perspectivas técnicas que mejoraron la calidad del producto final.

    QA Test Lead Automation Engineer
    Zippy SpA
    Marzo 2021 - Noviembre 2023
    • Desarrollé y ejecuté la automatización de pruebas para flujos críticos utilizando Selenium, Java y Cucumber, integrados con BrowserStack. Esta implementación nos permitió verificar la compatibilidad de nuestra interfaz de usuario en una amplia variedad de dispositivos, asegurando una experiencia consistente y libre de errores.
    • Utilizando Appium, desarrollé un plan completo de pruebas para la nueva aplicación de la compañía. Se realizaron pruebas tanto en diferentes modelos de dispositivos Android como iPhone, asegurando la cobertura de escenarios críticos en múltiples plataformas.
    • Lideré la integración de BDD para unificar el entendimiento del comportamiento esperado de cada funcionalidad utilizando el lenguaje de dominio Gherkin, lo cual disminuyó los errores de comprensión de las historias por parte del equipo y agilizó la automatización de pruebas.

    QA Test Automation Engineer
    23People
    Octubre 2019 - Marzo 2021
    • Diseñé y ejecuté planes de pruebas para historias de usuario utilizando Zephyr y Microsoft Azure, permitiendo abordar tanto los casos especificados como aquellos no contemplados en los criterios de aceptación.
    • Administré y configuré mi entorno de pruebas en Azure Deployment Environments, lo que me permitió obtener independencia y control total sobre las pruebas.
    • Participé en un proceso integral de pruebas de regresión utilizando Postman en un proyecto de Telefónica y en otro de la Asociación Chilena de Seguridad.

    Full Stack Developer Engineer
    Ticblue
    Mayo 2018 - Abril 2019
    • Diseñé y desarrollé servicios de API REST en Java Spring Boot para proyectos financieros y gubernamentales, asegurando la seguridad y escalabilidad de las soluciones implementadas.
    • Desarrollé aplicaciones completas en Laravel y Node.js, desde la concepción hasta la implementación, trabajando tanto en el frontend como en el backend.
    • Participé en la planificación y análisis de nuevas funcionalidades con stakeholders, traduciendo requisitos de negocio en soluciones técnicas efectivas.

    Ingeniero de Sistemas
    Ingesmart
    Agosto 2017 - Abril 2018
    • Trabajé en el despliegue de Microsoft Active Directory para gestionar dominios y servicios de directorio, centralizando la administración de usuarios y recursos de la red.
    • Esta implementación mejoró significativamente la seguridad y eficiencia de la infraestructura, facilitando el control de acceso y la auditoría.

    Jefe del departamento TI
    Coopeserau
    Abril 2014 - Marzo 2017
    • Diseñé e implementé estándares de IT en la organización para asegurar la consistencia y la eficiencia en las operaciones tecnológicas.
    • Dirigí proyectos de infraestructura y software con el objetivo de optimizar los sistemas y procesos tecnológicos, mejorando significativamente la estabilidad y el rendimiento.
    • Colaboré con stakeholders para alinear las estrategias de IT con los objetivos del negocio, garantizando que las soluciones tecnológicas apoyaran las metas empresariales.

    FORMACIÓN ACADÉMICA

    Ingeniería en Sistemas
    Universidad Nacional de Costa Rica
    2010 - 2014
    Grado académico obtenido con distinción en el área de desarrollo de software y sistemas de información.

    FORMACIÓN COMPLEMENTARIA

    • Certificación en Big Data y Analytics en Cisco Networking Academy (2023)
    • Diplomado en Inteligencia Artificial en la Pontificia Universidad Católica de Valparaíso (2022)
    • Diplomado en IoT y Ciudades Inteligentes en la Universidad de la Frontera (2021)

    HABILIDADES TÉCNICAS

    Lenguajes de Programación: Java, JavaScript, Python, PHP
    Frameworks y Librerías: Spring Boot, Node.js, Laravel, React, Angular
    Herramientas de Testing: Selenium, Cucumber, Appium, Postman, K6, Zephyr, TestRail
    Plataformas en la Nube: Azure, AWS, BrowserStack
    Bases de Datos: MySQL, PostgreSQL, MongoDB, SQL Server
    Herramientas de Desarrollo: Git, Jenkins, Docker, Kubernetes, Maven, Gradle
    Metodologías: Agile, Scrum, Kanban, TDD, BDD, CI/CD, DevOps

    IDIOMAS

    Español (Nativo)
    Inglés (Intermedio - Avanzado)
    """ * 2  # Duplicate to make it long enough to trigger chunking

    print(f"CV length: {len(cv_text)} chars (target: >4000 for chunking)")

    request = ResumeExtractionRequest(
        archivo_contenido=cv_text,
        tipo_archivo="txt",
        nombre_archivo="reproduce_bug.txt"
    )

    try:
        print("Starting extraction to reproduce bug...")
        result = await robust_service.extract_from_text(request)

        print("\n" + "="*60)
        print("BUG REPRODUCTION RESULTS:")
        print(f"Confidence: {result.confianza_general}")
        print(f"Email: {result.datos_cv.datos_contacto.email}")
        print(f"Titular: {result.datos_cv.titular_profesional.titular}")
        print(f"Advertencias: {result.advertencias}")
        print(f"Processing time: {result.tiempo_procesamiento:.2f}s")

        # Check if we hit the bug
        if (result.confianza_general > 0.8 and
            result.datos_cv.titular_profesional.titular == "No extraído"):
            print("\n🚨 BUG REPRODUCED! High confidence with empty titular")
        else:
            print("\n✅ Bug not reproduced in this test")

    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(reproduce_bug())