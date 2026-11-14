"""Tests TDD Fase A P1 — Logistics geográfico jerárquico (SDD §4.1, §7).

Escalera EXACTA del SDD §4.1 (determinista, cero LLM):
  comuna exacta (normalizada)            -> 100
  misma provincia                        -> 70
  misma región                           -> 50
  sin coincidencia                       -> 0
  campaña SIN requisito de ubicación     -> 100 (dimensión no aplica)
  campaña CON ubicación y CV sin ubicación -> 50 neutral + trazabilidad

Tabla-driven ≥12 casos + integración con la matriz de scoring.
Prohibido resultado sin explicación: todo score registra tier + texto matcheado.
"""
import pytest
from unittest.mock import MagicMock

from app.models.dynamic_rubric import StructuredRubric
from app.services.scoring_service import ScoringService


# ══════════════════════════════════════════════════════════════════════════════
# 1) Unidad pura: resolve_geo_match (tabla-driven, SDD §7)
# ══════════════════════════════════════════════════════════════════════════════

GEO_TABLE = [
    # (id, campaign_location, cv_location_texts, expected_score, expected_tier)
    ("comuna_exacta", "Providencia", ["Providencia, Chile"], 100, "comuna"),
    ("comuna_tildes_mayusculas", "CONCEPCIÓN", ["concepcion, biobio"], 100, "comuna"),
    ("misma_provincia_comunas_distintas", "Melipilla", ["Curacaví, Chile"], 70, "provincia"),
    ("misma_region_provincias_distintas", "Valdivia", ["La Unión, Chile"], 50, "region"),
    ("sin_match", "Antofagasta", ["Punta Arenas, Chile"], 0, "no_match"),
    ("campana_sin_ubicacion_none", None, ["Santiago, Chile"], 100, "campaign_no_requirement"),
    ("campana_sin_ubicacion_vacia", "   ", [], 100, "campaign_no_requirement"),
    ("cv_sin_ubicacion", "Providencia", [], 50, "cv_location_unknown"),
    ("cv_ubicacion_blanca", "Providencia", ["   ", None], 50, "cv_location_unknown"),
    ("normalizacion_puntuacion", "ÑUÑOA", ["Ñuñoa., Santiago"], 100, "comuna"),
    ("homonima_comuna_provincia_santiago", "Santiago", ["Santiago, Chile"], 100, "comuna"),
    ("multiparte_componente_compartido", "Providencia, Santiago", ["Santiago, Chile"], 100, "comuna"),
    ("provincia_homonima_vs_comuna_misma_provincia", "Iquique", ["Alto Hospicio"], 70, "provincia"),
    ("region_explicita_en_campana", "Región Metropolitana", ["Providencia, Chile"], 50, "region"),
    ("cv_multisegmento_provincia", "Cerrillos", ["Maipú, Región Metropolitana, Chile"], 70, "provincia"),
]


@pytest.mark.parametrize("cid,campaign,cv_texts,expected_score,expected_tier", GEO_TABLE,
                         ids=[c[0] for c in GEO_TABLE])
def test_resolve_geo_match_ladder(cid, campaign, cv_texts, expected_score, expected_tier):
    from app.services.geo_chile import resolve_geo_match, GeoMatchResult, GEO_CHILE_VERSION

    res = resolve_geo_match(campaign, cv_texts)
    assert isinstance(res, GeoMatchResult)
    assert res.score == expected_score, (
        f"[{cid}] score={res.score} != {expected_score} (tier={res.tier}, matched_on={res.matched_on})"
    )
    assert res.tier == expected_tier, (
        f"[{cid}] tier={res.tier} != {expected_tier}"
    )
    # Trazabilidad obligatoria: si hubo match, matched_on registra el texto contra el que matcheó
    if expected_score in (100, 70, 50) and expected_tier in ("comuna", "provincia", "region"):
        assert res.matched_on, f"[{cid}] match sin explicación (matched_on vacío)"
    else:
        assert res.matched_on is None, f"[{cid}] matched_on debe ser None sin match real"


def test_geo_versioned_static_data():
    """Datos versionados + integridad estructural mínima (SDD §11 riesgo tabla geo)."""
    from app.services.geo_chile import (
        GEO_CHILE_VERSION, GEO_CHILE, COMUNA_TO_PROVINCIA, PROVINCIA_TO_REGION,
        normalize_geo_key,
    )
    assert GEO_CHILE_VERSION == "2026.08"
    # Estructura región -> provincia -> comunas
    assert "metropolitana" in GEO_CHILE
    assert "santiago" in GEO_CHILE["metropolitana"]
    prov_comunas = {normalize_geo_key(c) for c in GEO_CHILE["metropolitana"]["santiago"]}
    assert "providencia" in prov_comunas
    # Índices derivados consistentes con la jerarquía
    assert COMUNA_TO_PROVINCIA["providencia"] == "santiago"
    assert PROVINCIA_TO_REGION["santiago"] == "metropolitana"
    # Cobertura mínima: Chile tiene 346 comunas oficiales; la tabla versionada
    # debe cubrir prácticamente la totalidad (brecha documentada en docs/debug).
    assert len(COMUNA_TO_PROVINCIA) >= 340, (
        f"Cobertura geo insuficiente: {len(COMUNA_TO_PROVINCIA)} comunas"
    )
    # Cada comuna mapea a una provincia conocida y cada provincia a una región conocida
    for comuna, prov in COMUNA_TO_PROVINCIA.items():
        assert prov in PROVINCIA_TO_REGION, f"Comuna {comuna} apunta a provincia desconocida {prov}"
    for prov, reg in PROVINCIA_TO_REGION.items():
        assert reg in GEO_CHILE, f"Provincia {prov} apunta a región desconocida {reg}"


# ══════════════════════════════════════════════════════════════════════════════
# 2) Integración: sección logistics de _calculate_matrix_scores
# ══════════════════════════════════════════════════════════════════════════════

def _scoring_fixture():
    llm = MagicMock()

    async def fake(prompt, input_data, stage_name, **kw):
        return {"breakdown": {}, "strengths": [], "gaps": [], "summary": ""}

    llm.call_agent = fake  # type: ignore
    svc = ScoringService(llm_service=llm)

    async def fake_sim(a, b):
        return 0.0

    async def fake_emb(t):
        return [0.0] * 4

    svc.semantic_service.calculate_similarity = fake_sim  # type: ignore
    svc.semantic_service.get_text_embedding = fake_emb  # type: ignore
    return svc


def _rubric(location=None):
    return StructuredRubric.model_validate({
        "education": {"required_degrees": [], "academic_level": "Universitario", "kill_clause": False},
        "experience": {"min_years": 0, "key_roles": ["rol x"]},
        "skills": {"mandatory_skills": [], "nice_to_have_skills": []},
        "logistics": {"location": location, "modality": "Presencial"},
        "languages": {"required_languages": []},
        "certifications": {"mandatory_certs": []},
    })


def _candidate(ubicacion=None):
    cand = {
        "titular_profesional": {"titular": "T"},
        "datos_contacto": {"email": "a@b.cl"},
        "resumen_profesional": {"resumen": "texto contexto candidato"},
        "experiencia_laboral": [{"cargo": "rol x", "empresa": "E",
                                 "responsabilidades": ["tareas"]}],
        "habilidades": {"habilidades_tecnicas": [], "idiomas": [], "habilidades_blandas": []},
        "formacion_academica": [],
    }
    if ubicacion is not None:
        cand["datos_contacto"]["ubicacion"] = ubicacion
    return cand


@pytest.mark.asyncio
async def test_matrix_logistics_comuna_match_deja_de_matar():
    """Campaña 'Providencia, Santiago' × CV 'Santiago, Chile': componente compartido
    a nivel comuna -> 100 (antes: kill binario -10 por substring fallido)."""
    svc = _scoring_fixture()
    scores = await svc._calculate_matrix_scores(
        _candidate(ubicacion="Santiago, Chile"), _rubric("Providencia, Santiago"),
        expanded_skills=[], normalized_degrees=[],
        normalized_candidate_roles=["rol x"], normalized_rubric_roles=["rol x"],
        job_soft_skills=[], job_title="puesto",
    )
    assert scores["logistics"] == 100, f"logistics={scores['logistics']} (deja de matar)"
    trace = scores.get("_logistics_geo")
    assert trace and trace["tier"] == "comuna" and trace["matched_on"], (
        f"Trazabilidad geo ausente: {trace}"
    )


@pytest.mark.asyncio
async def test_matrix_logistics_no_match_kill_preservado():
    """Sin coincidencia geográfica real -> 0 (kill clause intacto, ahora trazable)."""
    svc = _scoring_fixture()
    scores = await svc._calculate_matrix_scores(
        _candidate(ubicacion="Santiago, Chile"), _rubric("Antofagasta"),
        expanded_skills=[], normalized_degrees=[],
        normalized_candidate_roles=["rol x"], normalized_rubric_roles=["rol x"],
        job_soft_skills=[], job_title="puesto",
    )
    assert scores["logistics"] == 0
    trace = scores.get("_logistics_geo")
    assert trace and trace["tier"] == "no_match" and trace["matched_on"] is None


@pytest.mark.asyncio
async def test_matrix_logistics_cv_sin_ubicacion_neutral_50_trazable():
    """Campaña CON ubicación y CV sin ubicación detectable -> 50 neutral + reason."""
    svc = _scoring_fixture()
    scores = await svc._calculate_matrix_scores(
        _candidate(ubicacion=None), _rubric("Providencia"),
        expanded_skills=[], normalized_degrees=[],
        normalized_candidate_roles=["rol x"], normalized_rubric_roles=["rol x"],
        job_soft_skills=[], job_title="puesto",
    )
    assert scores["logistics"] == 50
    trace = scores.get("_logistics_geo")
    assert trace and trace["tier"] == "cv_location_unknown", f"reason trazable ausente: {trace}"


@pytest.mark.asyncio
async def test_matrix_logistics_sin_requisito_auto100():
    """Campaña SIN ubicación -> 100 (comportamiento actual preservado)."""
    svc = _scoring_fixture()
    scores = await svc._calculate_matrix_scores(
        _candidate(ubicacion="Santiago, Chile"), _rubric(None),
        expanded_skills=[], normalized_degrees=[],
        normalized_candidate_roles=["rol x"], normalized_rubric_roles=["rol x"],
        job_soft_skills=[], job_title="puesto",
    )
    assert scores["logistics"] == 100
    trace = scores.get("_logistics_geo")
    assert trace and trace["tier"] == "campaign_no_requirement"
