"""Tests TDD Fase B (SDD Scoring Fase 2 §4.3/§7) — Re-clasificación mandatory/nice-to-have.

Capa 2 determinista: `app/services/rubric_tier_classifier.py`
  - classify_requirement_tier(texto) -> "mandatory"|"nice"|None
  - REGLA DE ORO: jamás promover a mandatory; solo degradar a nice CON evidencia léxica.
Post-procesado: DynamicRubricService.generate_rubric DESPUÉS del filtro anti-soft,
gated por feature flag RUBRIC_TIER_RECLASS (default OFF = comportamiento actual).
Observabilidad: log estructurado + evento {requisito_original, decisión, pista}.

Todos los tests mockean el LLM (cero tokens reales). Imports de features nuevas van
DENTRO de cada test: fallo inicial esperado = ImportError/ModuleNotFoundError.
"""
import json
import logging
from unittest.mock import MagicMock

import pytest

from app.models.dynamic_rubric import StructuredRubric
from app.core.config import settings


# ══════════════════════════════════════════════════════════════════════════════
# Helpers
# ══════════════════════════════════════════════════════════════════════════════

def _set_flag(value: bool):
    """Activa/desactiva el feature flag restaurándolo al terminar el test."""
    original = getattr(settings, "rubric_tier_reclass", False)
    settings.rubric_tier_reclass = value
    return original


@pytest.fixture
def flag_off():
    orig = _set_flag(False)
    yield
    settings.rubric_tier_reclass = orig


@pytest.fixture
def flag_on():
    orig = _set_flag(True)
    yield
    settings.rubric_tier_reclass = orig


def _make_llm(rubric_dict=None):
    """LLM mockeado que captura el prompt y devuelve una rúbrica fija."""
    llm = MagicMock()
    captured = {"prompt": None}

    async def fake_structured(prompt, input_data, response_model=None, stage_name="", **kw):
        captured["prompt"] = str(prompt)
        from app.models.dynamic_rubric import StructuredRubric as _SR
        return _SR.model_validate(rubric_dict or _DEFAULT_RUBRIC)

    llm.call_agent_structured = fake_structured  # type: ignore
    llm.captured = captured  # type: ignore
    return llm


_DEFAULT_RUBRIC = {
    "education": {"required_degrees": [], "academic_level": "Universitario", "kill_clause": False},
    "experience": {"min_years": 0, "key_roles": ["rol x"]},
    "skills": {
        "mandatory_skills": ["herramientas tecnológicas básicas"],
        "nice_to_have_skills": [],
    },
    "logistics": {"location": None, "modality": "Presencial"},
    "languages": {"required_languages": []},
    "certifications": {"mandatory_certs": []},
}


# ══════════════════════════════════════════════════════════════════════════════
# A. Clasificador puro — classify_requirement_tier (SDD §4.3.2)
# ══════════════════════════════════════════════════════════════════════════════

def test_contraejemplo_sdd_herramientas_tecnologicas_basicas_es_nice():
    """Contraejemplo OBLIGATORIO del SDD §4.3: 'Manejo de herramientas tecnológicas
    básicas' debe clasificar nice (costó 3.43 pts en campaña real como falso mandatory)."""
    from app.services.rubric_tier_classifier import classify_requirement_tier
    assert classify_requirement_tier("Manejo de herramientas tecnológicas básicas") == "nice"


def test_herramientas_basicas_orden_inverso_es_nice():
    from app.services.rubric_tier_classifier import classify_requirement_tier
    assert classify_requirement_tier("Herramientas básicas de oficina") == "nice"


def test_deseable_es_nice():
    from app.services.rubric_tier_classifier import classify_requirement_tier
    assert classify_requirement_tier("Conocimientos deseables de SQL") == "nice"


def test_se_valora_es_nice():
    from app.services.rubric_tier_classifier import classify_requirement_tier
    assert classify_requirement_tier("Se valora inglés avanzado") == "nice"


def test_valorable_es_nice():
    from app.services.rubric_tier_classifier import classify_requirement_tier
    assert classify_requirement_tier("Capacidad valorable de negociación") == "nice"


def test_ideal_es_nice():
    from app.services.rubric_tier_classifier import classify_requirement_tier
    assert classify_requirement_tier("Idealmente con postgrado en educación") == "nice"


def test_excluyente_es_mandatory():
    from app.services.rubric_tier_classifier import classify_requirement_tier
    assert classify_requirement_tier("Título profesional excluyente") == "mandatory"


def test_indispensable_es_mandatory():
    from app.services.rubric_tier_classifier import classify_requirement_tier
    assert classify_requirement_tier("Certificación SEC indispensable") == "mandatory"


def test_imprescindible_es_mandatory():
    from app.services.rubric_tier_classifier import classify_requirement_tier
    assert classify_requirement_tier("Imprescindible manejo de normativa educativa") == "mandatory"


def test_obligatorio_variante_genero_es_mandatory():
    from app.services.rubric_tier_classifier import classify_requirement_tier
    assert classify_requirement_tier("Licencia A4 obligatoria") == "mandatory"


def test_ambiguo_retorna_none_se_respeta_llm():
    """Sin pista léxica → None: se respeta la asignación del LLM."""
    from app.services.rubric_tier_classifier import classify_requirement_tier
    assert classify_requirement_tier("Java") is None
    assert classify_requirement_tier("Experiencia en liderazgo de equipos") is None


def test_vacio_o_none_retorna_none():
    from app.services.rubric_tier_classifier import classify_requirement_tier
    assert classify_requirement_tier("") is None
    assert classify_requirement_tier(None) is None


def test_tildes_y_mayusculas_normalizadas():
    from app.services.rubric_tier_classifier import classify_requirement_tier
    # Mayúsculas + tildes deben normalizarse (matching sin tildes)
    assert classify_requirement_tier("DESEABLE manejo de Excel") == "nice"
    assert classify_requirement_tier("OBLIGATORIO título universitario") == "mandatory"
    assert classify_requirement_tier("Herramientas Tecnológicas BÁSICAS") == "nice"


def test_precedencia_mandatory_fuerte_sobre_nice():
    """Si coexisten pista nice y cláusula excluyente explícita, gana mandatory-fuerte
    (la señal excluyente del empleador domina; degradar contradiría evidencia literal)."""
    from app.services.rubric_tier_classifier import classify_requirement_tier
    assert classify_requirement_tier("Manejo de herramientas básicas (excluyente)") == "mandatory"


def test_jamas_promueve_nice_a_mandatory_sin_pista_fuerte():
    """Un texto nice sin cláusula fuerte NUNCA retorna mandatory (regla de oro)."""
    from app.services.rubric_tier_classifier import classify_requirement_tier
    for texto in (
        "deseable",
        "se valora",
        "ideal",
        "herramientas tecnológicas básicas para la planificación",
    ):
        assert classify_requirement_tier(texto) != "mandatory"


# ══════════════════════════════════════════════════════════════════════════════
# B. Post-procesado en generate_rubric — flag + orden anti-soft + observabilidad
# ══════════════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_flag_off_comportamiento_identico_al_actual(flag_off):
    """Flag OFF (default): la rúbrica sale EXACTAMENTE igual que hoy — el requisito
    con pista nice permanece en mandatory (comportamiento actual preservado)."""
    from app.services.dynamic_rubric_service import DynamicRubricService
    llm = _make_llm()
    svc = DynamicRubricService(llm_service=llm)
    rubric = await svc.generate_rubric("Rol X", "descripcion")
    assert "herramientas tecnológicas básicas" in rubric.skills.mandatory_skills
    assert "herramientas tecnológicas básicas" not in rubric.skills.nice_to_have_skills


@pytest.mark.asyncio
async def test_flag_on_degrada_a_nice_con_evidencia_lexica(flag_on):
    """Flag ON: el requisito con pista nice explícita se mueve de mandatory a
    nice_to_have_skills."""
    from app.services.dynamic_rubric_service import DynamicRubricService
    llm = _make_llm()
    svc = DynamicRubricService(llm_service=llm)
    rubric = await svc.generate_rubric("Rol X", "descripcion")
    assert "herramientas tecnológicas básicas" not in rubric.skills.mandatory_skills
    assert "herramientas tecnológicas básicas" in rubric.skills.nice_to_have_skills


@pytest.mark.asyncio
async def test_flag_on_ambiguo_permance_en_mandatory(flag_on):
    """Flag ON: sin pista léxica (None) se respeta la salida del LLM — jamás promover
    ni degradar sin evidencia."""
    from app.services.dynamic_rubric_service import DynamicRubricService
    rubric_dict = {
        "education": {"required_degrees": [], "academic_level": "Universitario", "kill_clause": False},
        "experience": {"min_years": 0, "key_roles": ["rol x"]},
        "skills": {
            "mandatory_skills": ["Currículum Nacional de Educación Parvularia", "Java"],
            "nice_to_have_skills": [],
        },
        "logistics": {"location": None, "modality": "Presencial"},
        "languages": {"required_languages": []},
        "certifications": {"mandatory_certs": []},
    }
    llm = _make_llm(rubric_dict)
    svc = DynamicRubricService(llm_service=llm)
    rubric = await svc.generate_rubric("Rol X", "descripcion")
    assert "Currículum Nacional de Educación Parvularia" in rubric.skills.mandatory_skills
    assert "Java" in rubric.skills.mandatory_skills


@pytest.mark.asyncio
async def test_flag_on_dedup_case_insensitive_al_mover(flag_on):
    """Al degradar, si el requisito ya existe (case-insensitive) en nice_to_have,
    no se duplica."""
    from app.services.dynamic_rubric_service import DynamicRubricService
    rubric_dict = {
        "education": {"required_degrees": [], "academic_level": "Universitario", "kill_clause": False},
        "experience": {"min_years": 0, "key_roles": ["rol x"]},
        "skills": {
            "mandatory_skills": ["Herramientas Tecnológicas Básicas"],
            "nice_to_have_skills": ["herramientas tecnológicas básicas"],
        },
        "logistics": {"location": None, "modality": "Presencial"},
        "languages": {"required_languages": []},
        "certifications": {"mandatory_certs": []},
    }
    llm = _make_llm(rubric_dict)
    svc = DynamicRubricService(llm_service=llm)
    rubric = await svc.generate_rubric("Rol X", "descripcion")
    lower_nice = [s.lower() for s in rubric.skills.nice_to_have_skills]
    assert lower_nice.count("herramientas tecnológicas básicas") == 1
    assert rubric.skills.mandatory_skills == []


@pytest.mark.asyncio
async def test_anti_soft_ejecuta_antes_blanda_no_llega_como_mandatory(flag_on):
    """Orden SDD: anti-soft → tier-reclass. Una blanda inyectada desde el parser se
    redirige a skills.soft_skills y NUNCA pasa por el clasificador como mandatory
    (no termina en nice_to_have por culpa del tier-reclass)."""
    from app.services.dynamic_rubric_service import DynamicRubricService
    rubric_dict = {
        "education": {"required_degrees": [], "academic_level": "Universitario", "kill_clause": False},
        "experience": {"min_years": 0, "key_roles": ["rol x"]},
        "skills": {
            "mandatory_skills": [],
            "nice_to_have_skills": [],
            "soft_skills": [],
        },
        "logistics": {"location": None, "modality": "Presencial"},
        "languages": {"required_languages": []},
        "certifications": {"mandatory_certs": []},
    }
    llm = _make_llm(rubric_dict)
    svc = DynamicRubricService(llm_service=llm)
    parsed_data = {"requisitos": {"habilidades_requeridas": [
        "Liderazgo",                              # blanda → anti-soft la desvía
        "herramientas tecnológicas básicas",      # técnica con pista nice → tier-reclass
    ]}}
    rubric = await svc.generate_rubric("Rol X", "descripcion", parsed_data=parsed_data)
    assert "Liderazgo" in rubric.skills.soft_skills
    assert "Liderazgo" not in rubric.skills.mandatory_skills
    assert "Liderazgo" not in rubric.skills.nice_to_have_skills
    assert "herramientas tecnológicas básicas" in rubric.skills.nice_to_have_skills
    assert "herramientas tecnológicas básicas" not in rubric.skills.mandatory_skills


@pytest.mark.asyncio
async def test_flag_on_evento_observabilidad_con_pista(caplog, flag_on):
    """Cada re-clasificación emite log estructurado + evento con
    {requisito_original, decisión, pista_disparadora}."""
    from app.services.dynamic_rubric_service import DynamicRubricService
    from app.services import rubric_tier_classifier as rtc

    rtc.clear_reclass_events()
    llm = _make_llm()
    svc = DynamicRubricService(llm_service=llm)
    with caplog.at_level(logging.INFO, logger="app.services.dynamic_rubric_service"):
        await svc.generate_rubric("Rol X", "descripcion")

    events = rtc.get_recent_reclass_events()
    assert events, "No se registró ningún evento de re-clasificación"
    ev = events[-1]
    assert ev["requisito_original"] == "herramientas tecnológicas básicas"
    assert ev["decision"] == "nice"
    assert ev["pista_disparadora"], "El evento debe incluir la pista léxica disparadora"
    # Log estructurado con el payload JSON
    structured_logs = [r for r in caplog.records if "TIER-RECLASS" in r.getMessage()]
    assert structured_logs, "Falta el log estructurado de re-clasificación"
    payload = json.loads(structured_logs[-1].getMessage().split("[TIER-RECLASS]", 1)[1].strip())
    assert payload["requisito_original"] == "herramientas tecnológicas básicas"
    assert payload["decision"] == "nice"
    assert payload["pista_disparadora"]


# ══════════════════════════════════════════════════════════════════════════════
# C. Capa 1 — Few-shots de clasificación en el prompt RUBRIC_EXTRACTION (smoke)
# ══════════════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_prompt_rubric_incluye_criterios_clasificacion_y_contraejemplo(flag_off):
    """Prevención (cero costo LLM extra): el prompt de RUBRIC_EXTRACTION debe incluir
    criterios explícitos mandatory vs nice-to-have y el contraejemplo obligatorio."""
    from app.services.dynamic_rubric_service import DynamicRubricService
    llm = _make_llm()
    svc = DynamicRubricService(llm_service=llm)
    await svc.generate_rubric("Educadora de Párvulos", "descripcion campaña")
    prompt = llm.captured["prompt"]
    assert prompt, "El prompt no fue capturado"
    low = prompt.lower()
    # Criterios mandatory = condición excluyente
    assert "excluyente" in low or "exclusive" in low
    # Criterios nice = deseable/se valora/ideal/herramientas básicas
    assert "deseable" in low or "desirable" in low
    # Contraejemplo obligatorio del SDD presente en el prompt
    assert "herramientas tecnol" in low and "b" in low
