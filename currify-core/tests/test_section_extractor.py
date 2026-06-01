"""
Tests para SectionExtractor — extracción por secciones con LLM + fallback + default.

TODOS los tests mockean el LLMService para evitar gasto de tokens reales.
"""
import asyncio
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.models.resume import SectionType, SectionDetection
from app.services.section_extractor import (
    SectionExtractor,
    SectionResult,
    _heuristic_experience,
    _heuristic_titles,
    _heuristic_skills,
    _heuristic_education,
    _heuristic_summary,
    _heuristic_other,
    _heuristic_references,
    _default_experience,
    _default_titles,
    _default_skills,
    _default_education,
    _default_summary,
    _default_other,
    _default_references,
)


# ──────────────────────────────────────────────────────────────────────────────
# Fixtures
# ──────────────────────────────────────────────────────────────────────────────

@pytest.fixture
def mock_llm_service():
    """Mock de LLMService para pruebas — sin llamadas reales al LLM."""
    svc = MagicMock()
    svc.call_agent = AsyncMock(return_value=None)  # default: falla
    return svc


@pytest.fixture
def extractor(mock_llm_service):
    return SectionExtractor(mock_llm_service)


def make_section(section_type: SectionType, name: str, start: int = 0, end: int = 10) -> SectionDetection:
    """Helper: crea una SectionDetection de prueba."""
    return SectionDetection(
        section_type=section_type,
        section_name=name,
        start_line=start,
        end_line=end,
    )


# ──────────────────────────────────────────────────────────────────────────────
# Tests: LLM success
# ──────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_extract_experience_with_llm(extractor, mock_llm_service):
    """Extracción de experiencia laboral vía LLM (mockeado)."""
    mock_llm_service.call_agent.return_value = {
        "experiencias": [
            {
                "cargo": "Gerente de Sucursal Valdivia",
                "empresa": "Banco Santander",
                "periodo": {
                    "fecha_inicio": "2019-01",
                    "fecha_fin": "Presente",
                    "texto_original": "Enero 2019 - A la fecha"
                },
                "responsabilidades": [
                    "Gestión comercial y administrativa de la sucursal"
                ]
            }
        ]
    }

    section = make_section(SectionType.EXPERIENCE, "EXPERIENCIA LABORAL")
    content = "Gerente de Sucursal Valdivia\nBanco Santander\nEnero 2019 - A la fecha"

    result = await extractor.extract_section(section, content, "test-001")

    assert result.success is True
    assert result.method == "llm"
    assert result.section_type == "experience"
    assert len(result.data["experiencias"]) == 1
    assert result.data["experiencias"][0]["cargo"] == "Gerente de Sucursal Valdivia"
    assert result.processing_time_ms >= 0


@pytest.mark.asyncio
async def test_extract_titles_with_llm(extractor, mock_llm_service):
    """Extracción de títulos vía LLM (mockeado)."""
    mock_llm_service.call_agent.return_value = {
        "titulo_profesional": "Ingeniero Civil",
        "formacion": [
            {
                "titulo": "Ingeniería Civil",
                "institucion": "Universidad Católica",
                "periodo": {"fecha_inicio": "2010", "fecha_fin": "2015"}
            }
        ]
    }

    section = make_section(SectionType.TITLES, "TÍTULOS")
    content = "Ingeniero Civil\nUniversidad Católica\n2010 - 2015"

    result = await extractor.extract_section(section, content, "test-002")

    assert result.success is True
    assert result.method == "llm"
    assert result.data["titulo_profesional"] == "Ingeniero Civil"
    assert len(result.data["formacion"]) == 1


# ──────────────────────────────────────────────────────────────────────────────
# Tests: Timeout → heuristic → default cascade
# ──────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_timeout_falls_to_heuristic(extractor, mock_llm_service):
    """Timeout del LLM → fallback heurístico."""
    async def slow_response(*args, **kwargs):
        await asyncio.sleep(999)  # nunca termina
        return {"data": "never"}
    mock_llm_service.call_agent.side_effect = slow_response

    section = make_section(SectionType.TITLES, "TÍTULOS")
    content = "Ingeniero Civil en Computación\nUniversidad de Chile"

    # Patch asyncio.wait_for timeout to 0.1s for fast test
    with patch('asyncio.wait_for', side_effect=asyncio.TimeoutError()):
        result = await extractor.extract_section(section, content, "test-003")

    # Should fallback to heuristic or default
    assert result.method in ("heuristic", "default")
    assert result.section_type == "titles"


@pytest.mark.asyncio
async def test_llm_error_falls_to_heuristic(extractor, mock_llm_service):
    """Error del LLM → fallback heurístico."""
    mock_llm_service.call_agent.side_effect = Exception("API Error 500")

    section = make_section(SectionType.SUMMARY, "PERFIL")
    content = "Profesional con 15 años de experiencia en gestión comercial y liderazgo de equipos."

    result = await extractor.extract_section(section, content, "test-004")

    assert result.method in ("heuristic", "default")
    assert result.section_type == "summary"
    # Heurístico de summary devuelve el texto completo
    if result.method == "heuristic":
        assert len(result.data.get("resumen", "")) > 10


@pytest.mark.asyncio
async def test_llm_none_falls_to_default(extractor, mock_llm_service):
    """LLM devuelve None → heurístico falla → default."""
    mock_llm_service.call_agent.return_value = None

    # Content that won't match heuristic patterns
    section = make_section(SectionType.EXPERIENCE, "EXPERIENCIA")
    content = "x y z"  # too short for heuristic

    result = await extractor.extract_section(section, content, "test-005")

    assert result.method in ("heuristic", "default")
    if result.method == "default":
        assert result.data == {"experiencias": []}
        assert result.error is not None


# ──────────────────────────────────────────────────────────────────────────────
# Tests: extract_all (parallel)
# ──────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_extract_all_parallel(extractor, mock_llm_service):
    """asyncio.gather con múltiples secciones en paralelo."""
    call_count = 0

    async def mock_call(*args, **kwargs):
        nonlocal call_count
        call_count += 1
        await asyncio.sleep(0.01)  # simular latencia
        return {"resumen": "Perfil profesional de prueba"}

    mock_llm_service.call_agent.side_effect = mock_call

    sections = [
        make_section(SectionType.SUMMARY, "PERFIL"),
        make_section(SectionType.EXPERIENCE, "EXPERIENCIA"),
        make_section(SectionType.EDUCATION, "EDUCACIÓN"),
        make_section(SectionType.SKILLS, "HABILIDADES"),
    ]
    sections_content = {
        "summary": "Perfil profesional de prueba",
        "experience": "Experiencia laboral variada",
        "education": "Formación académica",
        "skills": "Python, SQL, Docker",
    }

    result_dict = await extractor.extract_all(
        sections, sections_content, "test-006", max_concurrent=3
    )

    assert len(result_dict) == 4
    assert call_count == 4  # todas las secciones invocaron al LLM
    for key, result in result_dict.items():
        assert isinstance(result, SectionResult)
        assert result.section_type == key


@pytest.mark.asyncio
async def test_extract_all_with_exception(extractor, mock_llm_service):
    """Una sección lanza excepción → las otras siguen funcionando."""
    async def flaky_call(*args, **kwargs):
        await asyncio.sleep(0.01)
        stage = kwargs.get("stage_name", "")
        if "experience" in stage:
            raise Exception("LLM crash on experience")
        return {"resumen": "ok"}

    mock_llm_service.call_agent.side_effect = flaky_call

    sections = [
        make_section(SectionType.SUMMARY, "PERFIL"),
        make_section(SectionType.EXPERIENCE, "EXPERIENCIA"),
    ]
    sections_content = {"summary": "Perfil", "experience": "Exp content"}

    result_dict = await extractor.extract_all(
        sections, sections_content, "test-007"
    )

    assert len(result_dict) == 2
    # Summary should succeed (llm or heuristic)
    assert result_dict["summary"].method in ("llm", "heuristic")
    # Experience should fail gracefully (heuristic or default)
    assert result_dict["experience"].method in ("heuristic", "default", "exception")


# ──────────────────────────────────────────────────────────────────────────────
# Tests: Heuristic fallbacks (sync unit tests)
# ──────────────────────────────────────────────────────────────────────────────

def test_heuristic_experience_basic():
    """Heurístico de experiencia con fechas y cargo."""
    content = """Enero 2019 - Diciembre 2020
Gerente de Proyectos
Empresa XYZ
Gestión de proyectos estratégicos"""
    result = _heuristic_experience(content)
    assert result is not None
    assert len(result["experiencias"]) >= 1


def test_heuristic_experience_empty():
    """Heurístico sin contenido suficiente."""
    assert _heuristic_experience("") is None
    assert _heuristic_experience("x y z") is None


def test_heuristic_titles_finds_ingeniero():
    """Heurístico detecta 'Ingeniero Civil'."""
    result = _heuristic_titles("Ingeniero Civil en Computación, Universidad de Chile")
    assert result is not None
    assert "Ingeniero" in result["titulo_profesional"]


def test_heuristic_titles_no_match():
    """Heurístico sin título profesional."""
    result = _heuristic_titles("Experiencia en ventas y marketing")
    assert result is None


def test_heuristic_skills_parse():
    """Heurístico de skills detecta habilidades."""
    content = """Python, SQL, Docker
Liderazgo, Trabajo en equipo
Inglés Avanzado"""
    result = _heuristic_skills(content)
    assert result is not None
    assert len(result.get("habilidades_tecnicas", [])) + len(result.get("habilidades_blandas", [])) >= 1


def test_heuristic_education():
    """Heurístico de educación con universidad."""
    result = _heuristic_education("Universidad de Chile\nIngeniería Civil\n2010 - 2015")
    assert result is not None
    assert len(result["formacion"]) >= 1


def test_heuristic_summary():
    """Heurístico de summary devuelve texto completo."""
    result = _heuristic_summary("Profesional con amplia experiencia")
    assert result is not None
    assert len(result["resumen"]) > 10


def test_heuristic_other():
    """Heurístico other devuelve items."""
    result = _heuristic_other("Línea 1\nLínea 2\nLínea 3")
    assert result is not None
    assert len(result["items"]) == 3


# ──────────────────────────────────────────────────────────────────────────────
# Tests: Default values
# ──────────────────────────────────────────────────────────────────────────────

def test_default_experience():
    assert _default_experience() == {"experiencias": []}

def test_default_titles():
    assert _default_titles() == {"titulo_profesional": "No extraído", "formacion": []}

def test_default_skills():
    assert _default_skills() == {"habilidades_tecnicas": [], "idiomas": [], "habilidades_blandas": []}

def test_default_education():
    assert _default_education() == {"formacion": []}

def test_default_summary():
    assert _default_summary() == {"resumen": ""}

def test_default_other():
    assert _default_other() == {"section_name": "", "items": []}


# ──────────────────────────────────────────────────────────────────────────────
# Tests: SectionResult dataclass
# ──────────────────────────────────────────────────────────────────────────────

def test_section_result_defaults():
    sr = SectionResult(section_type="experience", success=True)
    assert sr.data is None
    assert sr.error is None
    assert sr.method == "llm"

def test_section_result_error():
    sr = SectionResult(
        section_type="education",
        success=False,
        error="Timeout after 30s",
        method="default"
    )
    assert sr.success is False
    assert sr.error == "Timeout after 30s"


# ──────────────────────────────────────────────────────────────────────────────
# Tests: References heuristic and default
# ──────────────────────────────────────────────────────────────────────────────

def test_heuristic_references_basic():
    """Heurístico de referencias con nombre, cargo y teléfono."""
    content = """Ricardo de Pablo
Gerente General
(+56) 9 34293844"""
    result = _heuristic_references(content)
    assert result is not None
    assert "referencias" in result
    assert len(result["referencias"]) >= 1
    assert result["referencias"][0]["nombre"] == "Ricardo de Pablo"


def test_heuristic_references_multiple():
    """Heurístico de referencias con múltiples personas."""
    content = """Ricardo de Pablo
Gerente General
(+56) 9 34293844
Gioconda Gatica
Directora de RRHH
(+56) 9 87654321"""
    result = _heuristic_references(content)
    assert result is not None
    assert len(result["referencias"]) >= 2


def test_heuristic_references_empty():
    """Heurístico de referencias sin contenido suficiente."""
    assert _heuristic_references("") is None
    assert _heuristic_references("x y z") is None


def test_default_references():
    """Default de referencias es lista vacía."""
    assert _default_references() == {"referencias": []}
