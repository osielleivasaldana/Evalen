"""
Tests para DocumentAnalyzerService — detección y clasificación de secciones.
"""
import pytest
from app.models.resume import SectionType, SectionDetection
from app.services.document_analyzer_service import DocumentAnalyzerService


# ──────────────────────────────────────────────────────────────────────────────
# Fixtures
# ──────────────────────────────────────────────────────────────────────────────

@pytest.fixture
def analyzer():
    return DocumentAnalyzerService()


# ──────────────────────────────────────────────────────────────────────────────
# Tests: classification
# ──────────────────────────────────────────────────────────────────────────────

def test_classify_titles(analyzer):
    """La sección 'TÍTULOS' debe clasificarse como SectionType.TITLES."""
    cv_text = """ROCIO JIL GARCIA
Email: rocio@example.com
Tel: +56 9 1234 5678

TÍTULOS
Licenciada en Educación y Filosofía
Profesora de Filosofía

EXPERIENCIA LABORAL
Gerente de Sucursal Valdivia
Banco Santander
Enero 2019 - A la fecha
Gestión comercial y administrativa de la sucursal
"""
    detections = analyzer.analyze(cv_text)
    titles = [d for d in detections if d.section_type == SectionType.TITLES]
    assert len(titles) >= 1, f"Expected TITLES section, got: {[d.section_type.value for d in detections]}"


def test_classify_competencias_tecnicas_y_diferenciales(analyzer):
    """'Competencias Técnicas y Diferenciales' debe clasificarse como OTHER."""
    cv_text = """NOMBRE APELLIDO
email@example.com

COMPETENCIAS TÉCNICAS Y DIFERENCIALES
Microsoft Office Avanzado
Gestión de equipos multidisciplinarios
Orientación a resultados
"""
    detections = analyzer.analyze(cv_text)
    section_types = {d.section_type for d in detections}
    # Should NOT be SKILLS
    assert SectionType.SKILLS not in {d.section_type for d in detections if "diferenciales" in d.section_name.lower()}, \
        f"'Competencias Técnicas y Diferenciales' should be OTHER, not SKILLS. Got: {[(d.section_name, d.section_type.value) for d in detections]}"
    # Should be OTHER
    other_sections = [d for d in detections if d.section_type == SectionType.OTHER]
    has_diferenciales = any("diferenciales" in d.section_name.lower() for d in other_sections)
    assert has_diferenciales, \
        f"Expected OTHER section for 'Competencias Técnicas y Diferenciales', got: {[(d.section_name, d.section_type.value) for d in detections]}"


def test_classify_experiencia_laboral(analyzer):
    """'Experiencia Laboral' debe clasificarse como EXPERIENCE."""
    cv_text = """JUAN PEREZ
Email: juan@example.com

EXPERIENCIA LABORAL
Gerente de Proyectos, Empresa XYZ
2020-01 - 2023-06
Lideré proyectos de transformación digital

EDUCACIÓN
Ingeniería Civil, Universidad de Chile
2010 - 2015
"""
    detections = analyzer.analyze(cv_text)
    exp_sections = [d for d in detections if d.section_type == SectionType.EXPERIENCE]
    assert len(exp_sections) >= 1, \
        f"Expected EXPERIENCE section, got: {[(d.section_name, d.section_type.value) for d in detections]}"


def test_multiple_sections_detected(analyzer):
    """Un CV con múltiples secciones debe detectarlas todas."""
    cv_text = """PERFIL PROFESIONAL
Profesional con 15 años de experiencia en gestión comercial.

EXPERIENCIA
Gerente de Sucursal, Banco Estado
Enero 2019 - Presente

FORMACIÓN
Ingeniería Comercial, Universidad de Chile
2005 - 2010

HABILIDADES
Excel Avanzado, SAP, Power BI

IDIOMAS
Inglés Avanzado, Español Nativo

CERTIFICACIONES
Diplomado en Finanzas, 2022
"""
    detections = analyzer.analyze(cv_text)
    found_types = {d.section_type for d in detections}
    expected = {SectionType.SUMMARY, SectionType.EXPERIENCE, SectionType.EDUCATION,
                SectionType.SKILLS, SectionType.LANGUAGES, SectionType.CERTIFICATIONS}
    assert len(found_types.intersection(expected)) >= 4, \
        f"Expected at least 4 sections, got: {found_types}"


def test_section_boundaries(analyzer):
    """Las secciones deben tener start_line y end_line correctos."""
    cv_text = """NOMBRE APELLIDO

PERFIL
Profesional con experiencia.

EXPERIENCIA LABORAL
Cargo 1
Cargo 2

EDUCACIÓN
Universidad X
"""
    detections = analyzer.analyze(cv_text)
    assert len(detections) >= 2

    for d in detections:
        assert d.start_line >= 0
        assert d.end_line > d.start_line, \
            f"end_line ({d.end_line}) must be > start_line ({d.start_line}) for {d.section_type.value}"


def test_empty_text(analyzer):
    """Texto vacío debe devolver lista vacía."""
    assert analyzer.analyze("") == []
    assert analyzer.analyze("   ") == []


def test_ambiguity_titulos_y_certificaciones(analyzer):
    """'Títulos y Certificaciones' → TITLES (titles tiene prioridad)."""
    cv_text = """TÍTULOS Y CERTIFICACIONES
Ingeniero Civil, Universidad Católica
Certificación PMP, 2020
"""
    detections = analyzer.analyze(cv_text)
    titles_found = [d for d in detections if d.section_type == SectionType.TITLES]
    assert len(titles_found) >= 1, \
        f"'Títulos y Certificaciones' should be TITLES. Got: {[(d.section_name, d.section_type.value) for d in detections]}"


def test_ambiguity_formacion_y_cursos(analyzer):
    """'Formación y Cursos' → EDUCATION."""
    cv_text = """FORMACIÓN Y CURSOS
Magíster en Finanzas, Universidad de Chile
Curso de Excel Avanzado
"""
    detections = analyzer.analyze(cv_text)
    edu_found = [d for d in detections if d.section_type == SectionType.EDUCATION]
    assert len(edu_found) >= 1, \
        f"'Formación y Cursos' should be EDUCATION. Got: {[(d.section_name, d.section_type.value) for d in detections]}"


def test_competencias_tecnicas_is_skills(analyzer):
    """'Competencias Técnicas' (sin 'diferenciales') → SKILLS."""
    cv_text = """COMPETENCIAS TÉCNICAS
Python, Java, SQL, Docker
"""
    detections = analyzer.analyze(cv_text)
    skills_found = [d for d in detections if d.section_type == SectionType.SKILLS]
    assert len(skills_found) >= 1, \
        f"'Competencias Técnicas' should be SKILLS. Got: {[(d.section_name, d.section_type.value) for d in detections]}"


def test_unknown_section_is_other(analyzer):
    """Una sección no reconocida debe clasificarse como OTHER."""
    cv_text = """PUBLICACIONES
Artículo 1: Journal of Something, 2020
Artículo 2: Conference Proceedings, 2021
"""
    detections = analyzer.analyze(cv_text)
    assert len(detections) >= 1, f"Expected at least 1 section, got {len(detections)}"
    # Either OTHER or it might not be detected as a header at all
    if detections:
        assert all(d.section_type in [SectionType.OTHER, SectionType.AWARDS] for d in detections), \
            f"Unknown section should be OTHER, got: {[(d.section_name, d.section_type.value) for d in detections]}"
