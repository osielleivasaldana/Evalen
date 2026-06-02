"""
Tests de integración para el pipeline completo de extracción por secciones.

TODOS los tests mockean el LLMService para evitar gasto de tokens reales.
"""
import asyncio
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.models.resume import (
    SectionType, SectionDetection, ResumeData, ResumeExtractionRequest,
    ProfessionalTitle, ContactInfo, Skills, AdditionalTraining,
)
from app.services.section_extractor import SectionResult


# ═══════════════════════════════════════════════════════════════════════════════
# Fixtures
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.fixture
def sample_cv_text() -> str:
    """CV de prueba con todas las secciones estándar."""
    return """Juan Pérez González
Email: juan.perez@example.com
Tel: +56 9 1234 5678
Santiago, Chile

PERFIL PROFESIONAL
Profesional con más de 10 años de experiencia en gestión de proyectos TI
y liderazgo de equipos multidisciplinarios.

EXPERIENCIA LABORAL
Gerente de Proyectos TI
Empresa Tecnológica S.A.
Enero 2020 - Presente
- Lideré proyectos de transformación digital
- Gestión de equipos de hasta 15 personas
- Implementación de metodologías ágiles

Analista Senior
Consultora IT Ltda.
Marzo 2015 - Diciembre 2019
- Análisis de requerimientos
- Desarrollo de soluciones

TÍTULOS
Ingeniero Civil en Computación
Universidad de Chile
2010 - 2015

FORMACIÓN
Magíster en Gestión de Tecnología
Universidad Católica
2018 - 2020

HABILIDADES
Python, Java, SQL, AWS, Docker, Metodologías Ágiles
Liderazgo, Trabajo en equipo, Comunicación efectiva

IDIOMAS
Inglés Avanzado - TOEFL 100
Español Nativo

CERTIFICACIONES
Scrum Master Professional, 2021
AWS Solutions Architect, 2022

PROYECTOS
Sistema de Gestión Documental - Arquitecto de Software
"""


@pytest.fixture
def cv_with_competencias_diferenciales() -> str:
    """CV con sección 'Competencias Diferenciales' que debe ir a otros_antecedentes."""
    return """María López
Email: maria@example.com

EXPERIENCIA
Coordinadora de Ventas, Retail S.A.
2018 - 2023

COMPETENCIAS TÉCNICAS Y DIFERENCIALES
Microsoft Office Avanzado
Gestión de equipos multidisciplinarios
Orientación a resultados y servicio al cliente
Manejo de conflictos y negociación

EDUCACIÓN
Ingeniería Comercial, Universidad Diego Portales
2010 - 2015
"""


@pytest.fixture
def cv_with_otros_antecedentes() -> str:
    """CV con sección 'Otros Antecedentes'."""
    return """Carlos Ruiz
Email: carlos@example.com

EXPERIENCIA
Jefe de Operaciones, Logística Express
2016 - 2023

OTROS ANTECEDENTES
Disponibilidad para viajar
Licencia de conducir clase B
Movilidad propia

INFORMACIÓN ADICIONAL
Participación en congresos internacionales de logística
Voluntariado en Techo Chile 2019-2021
"""


@pytest.fixture
def mock_section_extractor():
    """Mock de SectionExtractor completo."""
    extractor = MagicMock()
    extractor.extract_all = AsyncMock()
    extractor.extract_section = AsyncMock()
    return extractor


@pytest.fixture
def setup_section_results_all_sections() -> dict:
    """Resultados mock para todas las secciones de un CV completo."""
    return {
        "summary": SectionResult(
            section_type="summary", success=True,
            data={"resumen": "Profesional con más de 10 años de experiencia en gestión de proyectos TI"},
            method="llm", processing_time_ms=1250.0
        ),
        "experience": SectionResult(
            section_type="experience", success=True,
            data={"experiencias": [
                {"cargo": "Gerente de Proyectos TI", "empresa": "Empresa Tecnológica S.A.",
                 "periodo": {"fecha_inicio": "2020-01", "fecha_fin": "Presente", "texto_original": "Enero 2020 - Presente"},
                 "responsabilidades": ["Lideré proyectos de transformación digital"]}
            ]},
            method="llm", processing_time_ms=2100.0
        ),
        "education": SectionResult(
            section_type="education", success=True,
            data={"formacion": [
                {"titulo": "Magíster en Gestión de Tecnología", "institucion": "Universidad Católica",
                 "periodo": {"fecha_inicio": "2018", "fecha_fin": "2020"}}
            ]},
            method="llm", processing_time_ms=1800.0
        ),
        "titles": SectionResult(
            section_type="titles", success=True,
            data={"titulo_profesional": "Ingeniero Civil en Computación",
                  "formacion": [
                      {"titulo": "Ingeniero Civil en Computación", "institucion": "Universidad de Chile",
                       "periodo": {"fecha_inicio": "2010", "fecha_fin": "2015"}}
                  ]},
            method="llm", processing_time_ms=1900.0
        ),
        "skills": SectionResult(
            section_type="skills", success=True,
            data={"habilidades_tecnicas": [
                {"skill": "Python", "level": "Avanzado"},
                {"skill": "Java", "level": "Intermedio"},
            ], "habilidades_blandas": ["Liderazgo", "Trabajo en equipo"],
             "idiomas": [{"idioma": "Inglés", "nivel": "Avanzado", "certificacion": "TOEFL 100"}]},
            method="llm", processing_time_ms=1500.0
        ),
        "projects": SectionResult(
            section_type="projects", success=True,
            data={"items": ["Sistema de Gestión Documental - Arquitecto de Software"]},
            method="llm", processing_time_ms=1100.0
        ),
        "certifications": SectionResult(
            section_type="certifications", success=True,
            data={"items": ["Scrum Master Professional, 2021", "AWS Solutions Architect, 2022"]},
            method="heuristic", processing_time_ms=5.0
        ),
    }


# ═══════════════════════════════════════════════════════════════════════════════
# Tests: Pipeline integration
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_full_pipeline_all_sections(sample_cv_text, setup_section_results_all_sections):
    """CV completo con todas las secciones → ResumeData válido."""
    from app.services.robust_extraction_service import RobustExtractionService

    # Mock del LLMService
    mock_llm = MagicMock()
    mock_llm.call_agent = AsyncMock()
    mock_llm.call_agent_structured = AsyncMock()

    svc = RobustExtractionService(mock_llm)

    # Mock del SectionExtractor
    svc.section_extractor = MagicMock()
    svc.section_extractor.extract_all = AsyncMock(
        return_value=setup_section_results_all_sections
    )

    # Mock del profile_detector
    svc.profile_detector.detect_profile_type = MagicMock(return_value={"type": "standard"})

    # Ejecutar _extract_by_sections
    section_results = await svc._extract_by_sections(sample_cv_text, "test-001")
    assert section_results is not None
    assert len(section_results) >= 5  # al menos 5 secciones

    # Ejecutar merge
    merged = svc._merge_section_results(section_results, sample_cv_text, "test-001")

    # Verificar estructura completa
    assert "datos_contacto" in merged
    assert merged["datos_contacto"]["email"] == "juan.perez@example.com"
    assert merged["datos_contacto"]["nombre_completo"] == "Juan Pérez González"

    assert "titular_profesional" in merged
    assert "Ingeniero" in merged["titular_profesional"]["titular"]

    assert "resumen_profesional" in merged
    assert len(merged["resumen_profesional"]["resumen"]) > 10

    assert len(merged["experiencia_laboral"]) >= 1
    assert merged["experiencia_laboral"][0]["cargo"] == "Gerente de Proyectos TI"

    assert len(merged["formacion_academica"]) >= 1

    assert "habilidades" in merged
    assert len(merged["habilidades"]["habilidades_tecnicas"]) >= 1

    assert len(merged.get("formacion_complementaria", {}).get("certificaciones_cursos", [])) >= 1

    # Verificar que los datos son compatibles con ResumeData
    try:
        resume_data = ResumeData(**merged)
        assert resume_data.titular_profesional.titular != "No extraído"
        assert resume_data.datos_contacto.email != "no-extraido@example.com"
    except Exception as e:
        pytest.fail(f"ResumeData validation failed: {e}")


@pytest.mark.asyncio
async def test_cv_sin_titles_usa_education():
    """CV sin sección titles → titular desde education."""
    from app.services.robust_extraction_service import RobustExtractionService

    cv_text = """Pedro Ramírez
Email: pedro@test.com

EXPERIENCIA
Desarrollador Senior, TechCo
2020 - 2023

FORMACIÓN
Magíster en Ciencias de la Computación
Universidad de Chile
2018 - 2020
"""

    section_results = {
        "education": SectionResult(
            section_type="education", success=True,
            data={"formacion": [
                {"titulo": "Magíster en Ciencias de la Computación",
                 "institucion": "Universidad de Chile",
                 "periodo": {"fecha_inicio": "2018", "fecha_fin": "2020"}}
            ]},
            method="llm"
        ),
        "experience": SectionResult(
            section_type="experience", success=True,
            data={"experiencias": [
                {"cargo": "Desarrollador Senior", "empresa": "TechCo",
                 "periodo": {"fecha_inicio": "2020", "fecha_fin": "2023"},
                 "responsabilidades": []}
            ]},
            method="llm"
        ),
    }

    mock_llm = MagicMock()
    svc = RobustExtractionService(mock_llm)
    merged = svc._merge_section_results(section_results, cv_text, "test-002")

    # Sin titles, debe usar el título de education
    assert "Magíster" in merged["titular_profesional"]["titular"] or \
           merged["titular_profesional"]["titular"] == "Magíster en Ciencias de la Computación"


@pytest.mark.asyncio
async def test_competencias_diferenciales_other(cv_with_competencias_diferenciales):
    """Sección 'Competencias Técnicas y Diferenciales' → otros_antecedentes."""
    from app.services.robust_extraction_service import RobustExtractionService

    section_results = {
        "experience": SectionResult(
            section_type="experience", success=True,
            data={"experiencias": [
                {"cargo": "Coordinadora de Ventas", "empresa": "Retail S.A.",
                 "periodo": {"fecha_inicio": "2018", "fecha_fin": "2023"},
                 "responsabilidades": []}
            ]},
            method="llm"
        ),
        "other": SectionResult(
            section_type="other", success=True,
            data={"section_name": "COMPETENCIAS TÉCNICAS Y DIFERENCIALES",
                  "items": ["Microsoft Office Avanzado", "Gestión de equipos multidisciplinarios"]},
            method="heuristic"
        ),
        "education": SectionResult(
            section_type="education", success=True,
            data={"formacion": [
                {"titulo": "Ingeniería Comercial", "institucion": "Universidad Diego Portales",
                 "periodo": {"fecha_inicio": "2010", "fecha_fin": "2015"}}
            ]},
            method="llm"
        ),
    }

    mock_llm = MagicMock()
    svc = RobustExtractionService(mock_llm)
    merged = svc._merge_section_results(section_results, cv_with_competencias_diferenciales, "test-003")

    # La sección other debe poblar otros_antecedentes
    assert len(merged.get("otros_antecedentes", [])) >= 2
    assert any("Microsoft" in item for item in merged["otros_antecedentes"])


@pytest.mark.asyncio
async def test_simulate_llm_failure_one_section(sample_cv_text):
    """Simular fallo LLM en 1 sección → resto OK."""
    from app.services.robust_extraction_service import RobustExtractionService

    section_results = {
        "summary": SectionResult(
            section_type="summary", success=True,
            data={"resumen": "Profesional con experiencia"},
            method="llm"
        ),
        "experience": SectionResult(
            section_type="experience", success=False,  # FALLÓ
            data={"experiencias": []},
            error="Timeout after 30s",
            method="default",
            processing_time_ms=30100.0
        ),
        "education": SectionResult(
            section_type="education", success=True,
            data={"formacion": [
                {"titulo": "Ingeniería", "institucion": "U. de Chile",
                 "periodo": {"fecha_inicio": "2010", "fecha_fin": "2015"}}
            ]},
            method="llm"
        ),
        "skills": SectionResult(
            section_type="skills", success=True,
            data={"habilidades_tecnicas": [{"skill": "Python", "level": "Avanzado"}],
                  "idiomas": [], "habilidades_blandas": []},
            method="llm"
        ),
    }

    mock_llm = MagicMock()
    svc = RobustExtractionService(mock_llm)
    merged = svc._merge_section_results(section_results, sample_cv_text, "test-004")

    # Experience falló → lista vacía
    assert merged["experiencia_laboral"] == []

    # Las otras secciones deben estar OK
    assert len(merged["resumen_profesional"]["resumen"]) > 0
    assert len(merged["formacion_academica"]) >= 1
    assert len(merged["habilidades"]["habilidades_tecnicas"]) >= 1

    # No debe lanzar excepción al crear ResumeData
    try:
        resume_data = ResumeData(**merged)
        assert resume_data.habilidades.habilidades_tecnicas[0].skill == "Python"
    except Exception as e:
        pytest.fail(f"ResumeData should not fail with partial data: {e}")


@pytest.mark.asyncio
async def test_otros_antecedentes_captured(cv_with_otros_antecedentes):
    """CV con 'Otros Antecedentes' e 'Información Adicional' → otros_antecedentes poblado."""
    from app.services.robust_extraction_service import RobustExtractionService

    section_results = {
        "experience": SectionResult(
            section_type="experience", success=True,
            data={"experiencias": [
                {"cargo": "Jefe de Operaciones", "empresa": "Logística Express",
                 "periodo": {"fecha_inicio": "2016", "fecha_fin": "2023"},
                 "responsabilidades": []}
            ]},
            method="llm"
        ),
        "other": SectionResult(
            section_type="other", success=True,
            data={"section_name": "OTROS ANTECEDENTES",
                  "items": ["Disponibilidad para viajar", "Licencia de conducir clase B", "Movilidad propia"]},
            method="heuristic"
        ),
    }

    mock_llm = MagicMock()
    svc = RobustExtractionService(mock_llm)
    merged = svc._merge_section_results(section_results, cv_with_otros_antecedentes, "test-005")

    assert len(merged.get("otros_antecedentes", [])) >= 3
    assert any("Licencia" in item for item in merged["otros_antecedentes"])


# ═══════════════════════════════════════════════════════════════════════════════
# Tests: Contact extraction (sync)
# ═══════════════════════════════════════════════════════════════════════════════

def test_extract_contact_info():
    """Extracción heurística de datos de contacto."""
    from app.services.robust_extraction_service import RobustExtractionService

    mock_llm = MagicMock()
    svc = RobustExtractionService(mock_llm)

    cv_text = """Osiel González
Email: osiel@currify.com
Teléfono: +56 9 8765 4321
Santiago, Chile
"""

    contact = svc._extract_contact_info(cv_text)
    assert contact["email"] == "osiel@currify.com"
    assert contact["telefono"] == "+56 9 8765 4321"
    assert contact["nombre_completo"] == "Osiel González"
    assert contact["ubicacion"] == "Santiago, Chile"


def test_extract_contact_info_partial():
    """CV con datos de contacto parciales."""
    from app.services.robust_extraction_service import RobustExtractionService

    mock_llm = MagicMock()
    svc = RobustExtractionService(mock_llm)

    cv_text = "Nombre Genérico\nEmail: alguien@gmail.com"

    contact = svc._extract_contact_info(cv_text)
    assert contact["email"] == "alguien@gmail.com"
    assert contact["telefono"] is None
    assert contact["nombre_completo"] != "No extraído"


# ═══════════════════════════════════════════════════════════════════════════════
# Tests: Merge edge cases
# ═══════════════════════════════════════════════════════════════════════════════

def test_merge_empty_sections():
    """Merge con secciones vacías → estructura mínima válida."""
    from app.services.robust_extraction_service import RobustExtractionService

    mock_llm = MagicMock()
    svc = RobustExtractionService(mock_llm)

    merged = svc._merge_section_results({}, "CV vacío", "test-empty")

    assert merged["experiencia_laboral"] == []
    assert merged["formacion_academica"] == []
    assert merged["titular_profesional"]["titular"] == "No extraído"
    assert merged["datos_contacto"]["email"] == "no-extraido@example.com"


def test_merge_duplicate_education():
    """Formación duplicada de titles y education → solo una entrada."""
    from app.services.robust_extraction_service import RobustExtractionService

    section_results = {
        "titles": SectionResult(
            section_type="titles", success=True,
            data={"titulo_profesional": "Ingeniero Civil",
                  "formacion": [
                      {"titulo": "Ingeniería Civil", "institucion": "Universidad de Chile",
                       "periodo": {"fecha_inicio": "2010", "fecha_fin": "2015"}}
                  ]},
            method="llm"
        ),
        "education": SectionResult(
            section_type="education", success=True,
            data={"formacion": [
                {"titulo": "Ingeniería Civil", "institucion": "Universidad de Chile",
                 "periodo": {"fecha_inicio": "2010", "fecha_fin": "2015"}}  # DUPLICADO
            ]},
            method="llm"
        ),
    }

    mock_llm = MagicMock()
    svc = RobustExtractionService(mock_llm)
    merged = svc._merge_section_results(section_results, "CV test", "test-dup")

    # Solo 1 entrada (sin duplicados)
    assert len(merged["formacion_academica"]) == 1
    assert merged["formacion_academica"][0]["institucion"] == "Universidad de Chile"
