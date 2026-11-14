"""Tests TDD batch-fix 2026-08-25 — F1/F2/F3 (hallazgos diag-parvularia).

FIX 1 — Puente cultural_fit: las habilidades blandas DECLARADAS del CV entran al
         corpus literal y al set puenteable de cultural_fit. Campo OPCIONAL
         `RubricSkills.soft_skills` en StructuredRubric (retrocompatible).
FIX 2 — Filtro anti-soft determinista en la inyección parser→mandatory_skills;
         las blandas se redirigen a `skills.soft_skills`. Sin LLM.
FIX 3 — Expansión de sinónimos LADO RÚBRICA (léxico estático de dominio, CNEP
         primero) antes del cálculo de bandas. Sin LLM.

Todos los tests mockean el LLM (cero tokens reales). Imports de features nuevas
van DENTRO de cada test: el fallo inicial esperado es ImportError/AttributeError
(feature ausente) o assertion de comportamiento.
"""
import pytest
from unittest.mock import MagicMock

from app.models.dynamic_rubric import StructuredRubric
from app.services.scoring_service import ScoringService


# ══════════════════════════════════════════════════════════════════════════════
# Fixtures locales (patrón test_hotfix_parvularia: judge mockeado + sim tabular)
# ══════════════════════════════════════════════════════════════════════════════

def _scoring_fixture(judge_responses: dict, sim_table: dict):
    """ScoringService con LLM mockeado (judge) y similitud tabular determinista."""
    llm = MagicMock()
    judge_calls = {"n": 0}

    async def fake(prompt, input_data, stage_name, **kw):
        if stage_name == "SKILL_JUDGE":
            judge_calls["n"] += 1
            prompt_lower = str(prompt).lower()
            for key, resp in judge_responses.items():
                if key in prompt_lower:
                    return dict(resp)
            return {"score": 0.0, "evidence": None}
        return {"breakdown": {}, "strengths": [], "gaps": [], "summary": ""}

    llm.call_agent = fake  # type: ignore
    svc = ScoringService(llm_service=llm)

    async def fake_sim(a, b):
        return sim_table.get((str(a).lower(), str(b).lower()), 0.0)

    async def fake_emb(t):
        return [0.0] * 4

    svc.semantic_service.calculate_similarity = fake_sim  # type: ignore
    svc.semantic_service.get_text_embedding = fake_emb  # type: ignore
    return svc, judge_calls


def _rubric(mandatory, nice=None, soft=None):
    return StructuredRubric.model_validate({
        "education": {"required_degrees": [], "academic_level": "Universitario", "kill_clause": False},
        "experience": {"min_years": 0, "key_roles": ["rol x"]},
        "skills": {
            "mandatory_skills": mandatory,
            "nice_to_have_skills": nice or [],
            **({"soft_skills": soft} if soft is not None else {}),
        },
        "logistics": {"location": None, "modality": "Presencial"},
        "languages": {"required_languages": []},
        "certifications": {"mandatory_certs": []},
    })


def _candidate(blandas=None):
    return {
        "titular_profesional": {"titular": "T"},
        "datos_contacto": {"email": "a@b.cl"},
        "resumen_profesional": {"resumen": "texto contexto candidato"},
        "experiencia_laboral": [{"cargo": "Cargo", "empresa": "E", "responsabilidades": ["reuniones con apoderados y comunidad"]}],
        "habilidades": {
            "habilidades_tecnicas": [],
            "idiomas": [],
            "habilidades_blandas": list(blandas or []),
        },
        "formacion_academica": [],
    }


# ══════════════════════════════════════════════════════════════════════════════
# FIX 1a — Campo opcional soft_skills en RubricSkills (retrocompatibilidad total)
# ══════════════════════════════════════════════════════════════════════════════

def test_rubric_soft_skills_field_optional_and_retrocompatible():
    # Rúbrica persistida VIEJA (sin soft_skills) debe parsear igual que siempre
    old = StructuredRubric.model_validate({
        "education": {"required_degrees": [], "academic_level": "Universitario", "kill_clause": False},
        "experience": {"min_years": 0, "key_roles": ["rol x"]},
        "skills": {"mandatory_skills": ["a"], "nice_to_have_skills": []},
        "logistics": {"location": None, "modality": "Presencial"},
        "languages": {"required_languages": []},
        "certifications": {"mandatory_certs": []},
    })
    assert getattr(old.skills, "soft_skills", None) == [], (
        "Campo soft_skills ausente o no-default: rompe retrocompatibilidad"
    )
    # Rúbrica nueva con blandas del lado de la oferta
    new = StructuredRubric.model_validate({
        "education": {"required_degrees": [], "academic_level": "Universitario", "kill_clause": False},
        "experience": {"min_years": 0, "key_roles": ["rol x"]},
        "skills": {"mandatory_skills": ["a"], "nice_to_have_skills": [], "soft_skills": ["liderazgo"]},
        "logistics": {"location": None, "modality": "Presencial"},
        "languages": {"required_languages": []},
        "certifications": {"mandatory_certs": []},
    })
    assert new.skills.soft_skills == ["liderazgo"]


# ══════════════════════════════════════════════════════════════════════════════
# FIX 1b — Crédito LITERAL en cultural_fit vía blandas declaradas del CV
# ══════════════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_cultural_fit_literal_credit_from_declared_cv_soft_skill():
    """La oferta pide 'comunicación efectiva'; el CV la DECLARA en habilidades_blandas.
    Con sims en cero, el crédito debe ser literal (declaración del propio CV)."""
    svc, judge_calls = _scoring_fixture({}, {})
    cand = _candidate(blandas=["Comunicación efectiva"])
    scores = await svc._calculate_matrix_scores(
        cand, _rubric([]),
        expanded_skills=[],
        normalized_degrees=[], normalized_candidate_roles=["cargo"], normalized_rubric_roles=["rol x"],
        job_soft_skills=["comunicación efectiva"],
        job_title="puesto",
    )
    assert judge_calls["n"] == 0, "cultural_fit no tiene judge: crédito 100% determinista"
    assert scores["cultural_fit"] == 100.0, (
        f"Blanda DECLARADA por el CV invisible para cultural_fit: {scores['cultural_fit']} != 100 "
        f"(fuga F1 del diag-parvularia-techo-dimensional)"
    )


@pytest.mark.asyncio
async def test_cultural_fit_bridge_credit_via_declared_cv_soft_skill():
    """'trabajo en equipo' (oferta) vs 'Trabajo colaborativo con familias' (declarada):
    puente semántico documentado (sim 0.75 ≥ 0.65) contra la blandas declaradas."""
    svc, judge_calls = _scoring_fixture({}, {
        ("trabajo en equipo", "trabajo colaborativo con familias"): 0.75,
    })
    cand = _candidate(blandas=["Trabajo colaborativo con familias"])
    scores = await svc._calculate_matrix_scores(
        cand, _rubric([]),
        expanded_skills=[],  # sin técnicas ni latentes: SOLO la declarada puede salvar
        normalized_degrees=[], normalized_candidate_roles=["cargo"], normalized_rubric_roles=["rol x"],
        job_soft_skills=["trabajo en equipo"],
        job_title="puesto",
    )
    assert judge_calls["n"] == 0
    assert scores["cultural_fit"] == 100.0, (
        f"Puente F1 no opera contra blandas declaradas: {scores['cultural_fit']} != 100"
    )


@pytest.mark.asyncio
async def test_cultural_fit_honest_absence_stays_neutral_low():
    """Blanda genuinamente ausente NO se acredita (sin falsos positivos)."""
    svc, _ = _scoring_fixture({}, {})
    cand = _candidate(blandas=["Empatía"])
    scores = await svc._calculate_matrix_scores(
        cand, _rubric([]),
        expanded_skills=[],
        normalized_degrees=[], normalized_candidate_roles=["cargo"], normalized_rubric_roles=["rol x"],
        job_soft_skills=["liderazgo"],
        job_title="puesto",
    )
    assert scores["cultural_fit"] == 50.0, (
        f"Falso positivo cultural: {scores['cultural_fit']} != 50 (blanda ausente)"
    )


# ══════════════════════════════════════════════════════════════════════════════
# FIX 1c — El campo rubric.skills.soft_skills alimenta cultural_fit (sin cambiar
#          la firma de _calculate_matrix_scores ni el contrato HTTP)
# ══════════════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_cultural_fit_reads_rubric_soft_skills_field():
    svc, _ = _scoring_fixture({}, {
        ("trabajo en equipo", "trabajo colaborativo con familias"): 0.75,
    })
    cand = _candidate(blandas=["Trabajo colaborativo con familias"])
    scores = await svc._calculate_matrix_scores(
        cand, _rubric([], soft=["trabajo en equipo"]),
        expanded_skills=[],
        normalized_degrees=[], normalized_candidate_roles=["cargo"], normalized_rubric_roles=["rol x"],
        job_soft_skills=[],  # vacío: la fuente es la RÚBRICA estructurada
        job_title="puesto",
    )
    assert scores["cultural_fit"] == 100.0, (
        f"rubric.skills.soft_skills no alimenta cultural_fit: {scores['cultural_fit']} != 100"
    )


# ══════════════════════════════════════════════════════════════════════════════
# FIX 2 — Clasificador anti-soft determinista (sin LLM) + filtro en inyección
# ══════════════════════════════════════════════════════════════════════════════

def test_soft_skill_classifier_detects_blandas_and_respects_hard():
    from app.services.skill_classification import is_soft_skill
    # Blandas del hallazgo R3 (diag campana real)
    assert is_soft_skill("Proactividad")
    assert is_soft_skill("Creatividad")
    assert is_soft_skill("Resolución de desafíos pedagógicos")
    assert is_soft_skill("Liderazgo y coordinación de equipos")
    assert is_soft_skill("Trabajo en equipo")
    assert is_soft_skill("Comunicación efectiva")
    assert is_soft_skill("Relaciones efectivas con familias")
    # Técnicas/de-dominio que NO deben clasificarse como blandas
    assert not is_soft_skill("Currículum Nacional de Educación Parvularia")
    assert not is_soft_skill("herramientas tecnológicas básicas")
    assert not is_soft_skill("planificación educativa")
    assert not is_soft_skill("Excel avanzado")
    assert not is_soft_skill("Adaptaciones educativas")
    assert not is_soft_skill("Estrategias pedagógicas diferenciadas")
    assert not is_soft_skill("Comunicación oral y escrita"), (
        "'comunicación oral y escrita' es tratada como competencia evaluable por la "
        "rúbrica de campaña real; el léxico no debe capturarla"
    )
    assert not is_soft_skill("")
    assert not is_soft_skill(None)


@pytest.mark.asyncio
async def test_parser_injection_filters_soft_into_soft_bucket():
    """La inyección parser→mandatory NO puede colar blandas: se redirigen a
    rubric.skills.soft_skills. Determinista: cero llamadas LLM en el filtro."""
    from app.services.dynamic_rubric_service import DynamicRubricService

    llm = MagicMock()

    async def fake_structured(prompt, input_data, response_model=None, stage_name="", **kw):
        return StructuredRubric.model_validate({
            "education": {"required_degrees": ["Educadora de Párvulos"], "academic_level": "Universitario", "kill_clause": False},
            "experience": {"min_years": 0, "key_roles": ["Educadora de Párvulos"]},
            "skills": {"mandatory_skills": ["comunicación oral y escrita"], "nice_to_have_skills": []},
            "logistics": {"location": None, "modality": "Presencial"},
            "languages": {"required_languages": []},
            "certifications": {"mandatory_certs": []},
        })

    async def boom(*a, **kw):
        raise AssertionError("El filtro anti-soft debe ser 100% determinista (sin LLM)")

    llm.call_agent_structured = fake_structured  # type: ignore
    llm.call_agent = boom  # type: ignore

    svc = DynamicRubricService(llm_service=llm)
    parsed = {"requisitos": {"habilidades_requeridas": [
        "Currículum Nacional de Educación Parvularia",   # técnica nueva → mandatory
        "Proactividad",                                   # blanda → soft_skills
        "Creatividad",                                    # blanda → soft_skills
        "Resolución de desafíos pedagógicos",             # blanda → soft_skills
        "Liderazgo y coordinación de equipos",            # blanda → soft_skills
        "Comunicación oral y escrita",                    # ya estaba → dedup, sin duplicado
    ]}}

    rubric = await svc.generate_rubric("Educadora de Párvulos", "descripcion", parsed_data=parsed)

    low_mandatory = [str(s).lower() for s in rubric.skills.mandatory_skills]
    low_soft = [str(s).lower() for s in rubric.skills.soft_skills]

    # Las técnicas nuevas SÍ entran a mandatory
    assert "currículum nacional de educación parvularia" in low_mandatory
    # Las blandas NO pueden estar en mandatory (regla anti-soft del prompt de rúbrica)
    for soft in ("proactividad", "creatividad", "resolución de desafíos pedagógicos",
                 "liderazgo y coordinación de equipos"):
        assert soft not in low_mandatory, f"'{soft}' se coló en mandatory_skills"
        assert soft in low_soft, f"'{soft}' no fue redirigida a soft_skills"
    # Dedup: 'comunicación oral y escrita' aparece exactamente una vez
    assert low_mandatory.count("comunicación oral y escrita") == 1


# ══════════════════════════════════════════════════════════════════════════════
# FIX 3 — Expansión léxica lado-rúbrica (CNEP) antes del cálculo de bandas
# ══════════════════════════════════════════════════════════════════════════════

def test_domain_expansion_static_extensible_and_deterministic():
    from app.services.domain_expansion import DOMAIN_SKILL_RULES, expand_rubric_skill
    # Estructura extensible declarada (educación parvularia primero; salud/oficios después)
    domains = {r["domain"] for r in DOMAIN_SKILL_RULES}
    assert "educacion_parvularia" in domains
    # Expansión CNEP: lenguaje nativo del currículum
    probes = expand_rubric_skill("Currículum Nacional de Educación Parvularia")
    assert any("ambito" in p for p in probes), f"Sonda 'ámbitos' ausente: {probes}"
    assert any("nucleo" in p for p in probes), f"Sonda 'núcleos' ausente: {probes}"
    # Variante abreviada también dispara
    assert expand_rubric_skill("Manejo del CNEP")
    # Skill fuera de dominio → SIN expansión
    assert expand_rubric_skill("excel avanzado") == set()
    assert expand_rubric_skill("") == set()
    # Determinista (estático, sin LLM)
    assert expand_rubric_skill("Currículum Nacional de Educación Parvularia") == probes


@pytest.mark.asyncio
async def test_cnep_native_language_gets_literal_credit_before_bands():
    """Rúbrica exige CNEP; el CV habla lenguaje CNEP nativo ('planificación educativa
    por ámbitos') → crédito LITERAL 1.0 vía expansión lado-rúbrica, sin judge."""
    svc, judge_calls = _scoring_fixture({}, {})  # sims todas 0.0
    cand = _candidate(blandas=[])
    # El contexto del candidato contiene la frase nativa en responsabilidades
    cand["experiencia_laboral"][0]["responsabilidades"] = [
        "Gestión de curso de 25 párvulos con planificación educativa por ámbitos",
    ]
    scores = await svc._calculate_matrix_scores(
        cand, _rubric(["Currículum Nacional de Educación Parvularia"]),
        expanded_skills=[],
        normalized_degrees=[], normalized_candidate_roles=["cargo"], normalized_rubric_roles=["rol x"],
        job_soft_skills=[],
        job_title="puesto",
    )
    assert judge_calls["n"] == 0, "Con crédito literal por expansión NO debe gastarse judge"
    # 1/1 mandatory acreditado → coverage 100 → fórmula intocable: 100*0.8 = 80
    assert abs(scores["skills_match"] - 80.0) < 0.01, (
        f"Lenguaje CNEP nativo sin crédito (drift F3): skills_match={scores['skills_match']} != 80"
    )


@pytest.mark.asyncio
async def test_cnep_expansion_no_false_positive_without_native_language():
    """Sin lenguaje CNEP nativo en el CV, la expansión NO acredita: el requisito cae
    al judge (rol intacto) y queda en 0 si no hay evidencia."""
    svc, judge_calls = _scoring_fixture({}, {})
    cand = _candidate(blandas=[])
    cand["experiencia_laboral"][0]["responsabilidades"] = [
        "Ventas de retail y atención de caja",  # nada que ver
    ]
    scores = await svc._calculate_matrix_scores(
        cand, _rubric(["Currículum Nacional de Educación Parvularia"]),
        expanded_skills=[],
        normalized_degrees=[], normalized_candidate_roles=["cargo"], normalized_rubric_roles=["rol x"],
        job_soft_skills=[],
        job_title="puesto",
    )
    assert judge_calls["n"] == 1, "Sin expansión aplicable, la skill debe llegar al judge (rol intacto)"
    assert scores["skills_match"] == 0.0, f"Falso positivo CNEP: {scores['skills_match']}"


# ══════════════════════════════════════════════════════════════════════════════
# Regresión cruzada — los fixes no alteran bandas/pesos/judge existentes
# ══════════════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_regression_bands_and_formula_untouched_by_batchfix():
    """Réplica del test_skills_partial_credit_three_bands: las bandas 0.80/0.65,
    la fórmula 0.8/0.2 y el presupuesto del judge quedan intactos tras el batch."""
    mandatory = ["skill_exacta", "skill_sim_alta", "skill_sim_media", "skill_judge_ok", "skill_sin_evidencia"]
    expanded = ["skill_exacta", "cand_sim_alta", "cand_sim_media"]
    sim_table = {
        ("skill_sim_alta", "cand_sim_alta"): 0.85,
        ("skill_sim_media", "cand_sim_media"): 0.70,
    }
    judge_responses = {
        "skill_judge_ok": {"score": 1.0, "evidence": "reuniones con apoderados y comunidad"},
    }
    svc, judge_calls = _scoring_fixture(judge_responses, sim_table)
    scores = await svc._calculate_matrix_scores(
        _candidate(), _rubric(mandatory),
        expanded_skills=expanded,
        normalized_degrees=[], normalized_candidate_roles=["cargo"], normalized_rubric_roles=["rol x"],
        job_soft_skills=[], job_title="puesto",
    )
    assert abs(scores["skills_match"] - 56.0) < 0.01, f"skills_match={scores['skills_match']} != 56"
    assert judge_calls["n"] == 2
