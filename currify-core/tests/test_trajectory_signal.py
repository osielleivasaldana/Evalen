"""Tests TDD Fase A P2 — career_trajectory con señal real (SDD §4.2, §7).

Fórmula EXACTA del SDD §4.2 (determinista, sin LLM):
    trajectory = round(0.50·years_c + 0.30·stability_c + 0.20·progression_c)

Componentes:
    years_c       : min(100, años_reales/min_years·100) si min_years>0 y hay fechas;
                    si no aplica -> fallback lógica actual por entradas (≥2→100/1→60/0→0)
    stability_c   : tenencia promedio ≥24m→100 · 12–24m→70 · <12m→40
    progression_c : tiers léxicos ascendente→100 · lateral→70 · insuficiente→60

Fallback: <1 entrada o fechas no parseables -> 70 (comportamiento preservado).
Cierre de fuga colateral: sub-score `years` de experience usa fechas reales +
rubric.min_years cuando exista (única fuente de verdad para años).
"""
import pytest
from unittest.mock import MagicMock

from app.models.dynamic_rubric import StructuredRubric
from app.services.scoring_service import ScoringService


def _exp(cargo, inicio=None, fin=None, empresa="E"):
    periodo = None
    if inicio or fin:
        periodo = {"fecha_inicio": inicio, "fecha_fin": fin}
    return {"cargo": cargo, "empresa": empresa, "periodo": periodo, "responsabilidades": ["tareas"]}


# ══════════════════════════════════════════════════════════════════════════════
# 1) Componentes puros (única fuente de verdad para años)
# ══════════════════════════════════════════════════════════════════════════════

def test_total_real_years_sums_parsed_periods():
    """Fixture parvularia-like: 2018–2023 + 2010–2017 + 2009–2010 = 13 años reales."""
    from app.services.scoring_service import compute_timeline_months, total_real_years
    exps = [_exp("Educadora", "2018", "2023"),
            _exp("Educadora Nivel Medio", "2010", "2017"),
            _exp("Educadora comunitaria", "2009", "2010")]
    timeline = compute_timeline_months(exps)
    assert len(timeline) == 3
    assert total_real_years(timeline) == pytest.approx(13.0)


def test_years_component_min_years_cumplido():
    from app.services.scoring_service import compute_timeline_months, years_component
    exps = [_exp("A", "2018", "2023"), _exp("B", "2010", "2017"), _exp("C", "2009", "2010")]
    assert years_component(5, compute_timeline_months(exps)) == 100  # 13y >= 5y


def test_years_component_min_years_no_cumplido():
    from app.services.scoring_service import compute_timeline_months, years_component
    exps = [_exp("A", "2022", "2023")]  # 1 año real
    assert years_component(10, compute_timeline_months(exps)) == 10  # 1/10·100


def test_years_component_fallback_por_entradas_sin_min_years():
    """min_years<=0 -> fallback lógica actual por entradas (≥2→100 · 1→60 · 0→0)."""
    from app.services.scoring_service import compute_timeline_months, years_component
    tres = [_exp("A", "2018", "2023"), _exp("B", "2010", "2017"), _exp("C", "2009", "2010")]
    una = [_exp("A")]
    assert years_component(0, compute_timeline_months(tres)) == 100
    assert years_component(0, compute_timeline_months(una)) == 60
    assert years_component(0, compute_timeline_months([])) == 0


@pytest.mark.parametrize("cid,rangos,esperado", [
    ("tenencia_larga_100", [("2015-01", "2018-01"), ("2019-01", "2022-01")], 100),  # 36m prom
    ("tenencia_media_70", [("2015-01", "2016-07"), ("2018-01", "2019-07")], 70),    # 18m prom
    ("tenencia_corta_40", [("2015-01", "2015-07"), ("2018-01", "2018-07")], 40),    # 6m prom
], ids=["tenencia_larga_100", "tenencia_media_70", "tenencia_corta_40"])
def test_stability_component_thresholds(cid, rangos, esperado):
    from app.services.scoring_service import compute_timeline_months, stability_component
    exps = [_exp(f"Cargo {i}", ini, fin) for i, (ini, fin) in enumerate(rangos)]
    assert stability_component(compute_timeline_months(exps)) == esperado


@pytest.mark.parametrize("cid,cargos,esperado", [
    ("ascendente_100", [("Asistente Administrativo", "2015", "2017"),
                        ("Jefe de Sucursal", "2018", "2023")], 100),
    ("lateral_70", [("Asistente Administrativo", "2015", "2017"),
                    ("Asistente Contable", "2018", "2023")], 70),
    ("insuficiente_60_sin_tiers", [("Educadora de Párvulos", "2015", "2017"),
                                   ("Educadora", "2018", "2023")], 60),
    ("insuficiente_60_un_solo_tier", [("Jefe de Sucursal", "2015", "2023")], 60),
], ids=["ascendente", "lateral", "sin_palabras_nivel", "un_empleo"])
def test_progression_component_lexical_tiers(cid, cargos, esperado):
    from app.services.scoring_service import compute_timeline_months, progression_component
    exps = [_exp(c, i, f) for c, i, f in cargos]
    assert progression_component(compute_timeline_months(exps)) == esperado


def test_trajectory_formula_exacta():
    """round(0.50·100 + 0.30·70 + 0.20·100) = round(91.0) = 91."""
    from app.services.scoring_service import trajectory_signal
    exps = [_exp("Asistente Administrativo", "2015", "2017"),   # 24m
            _exp("Jefe de Sucursal", "2018", "2019")]           # 12m → prom 18m → 70
    score, comp = trajectory_signal(2, exps)                    # 3y reales / 2 → 100
    assert comp["years"] == 100 and comp["stability"] == 70 and comp["progression"] == 100
    assert score == 91


def test_fallback_sin_experiencia_preserva_70():
    from app.services.scoring_service import trajectory_signal
    score, comp = trajectory_signal(5, [])
    assert score == 70
    assert comp.get("reason") == "sin_experiencia"


def test_fallback_fechas_no_parseables_preserva_70():
    from app.services.scoring_service import trajectory_signal
    exps = [_exp("Cargo A"), _exp("Cargo B")]  # sin periodo
    score, comp = trajectory_signal(5, exps)
    assert score == 70
    assert comp.get("reason") == "fechas_no_parseables"


def test_empleo_unico_largo_hasta_presente_se_calcula():
    """Un solo empleo 2015–Presente: hay señal real (no fallback 70)."""
    from app.services.scoring_service import trajectory_signal
    score, comp = trajectory_signal(0, [_exp("Gerente", "2015", "Presente")])
    assert score != 70 or comp.get("reason") is None
    assert comp["stability"] == 100  # >10 años de tenencia
    assert comp["progression"] == 60  # un solo tier → insuficiente


# ══════════════════════════════════════════════════════════════════════════════
# 2) Integración en la matriz (_calculate_matrix_scores)
# ══════════════════════════════════════════════════════════════════════════════

def _scoring_fixture(sim_value=0.0):
    llm = MagicMock()

    async def fake(prompt, input_data, stage_name, **kw):
        return {"breakdown": {}, "strengths": [], "gaps": [], "summary": ""}

    llm.call_agent = fake  # type: ignore
    svc = ScoringService(llm_service=llm)

    async def fake_sim(a, b):
        return sim_value

    async def fake_emb(t):
        return [0.0] * 4

    svc.semantic_service.calculate_similarity = fake_sim  # type: ignore
    svc.semantic_service.get_text_embedding = fake_emb  # type: ignore
    return svc


def _rubric(min_years=0):
    return StructuredRubric.model_validate({
        "education": {"required_degrees": [], "academic_level": "Universitario", "kill_clause": False},
        "experience": {"min_years": min_years, "key_roles": ["rol x"]},
        "skills": {"mandatory_skills": [], "nice_to_have_skills": []},
        "logistics": {"location": None, "modality": "Presencial"},
        "languages": {"required_languages": []},
        "certifications": {"mandatory_certs": []},
    })


def _candidate(exps):
    return {
        "titular_profesional": {"titular": "T"},
        "datos_contacto": {"email": "a@b.cl"},
        "resumen_profesional": {"resumen": "texto contexto candidato"},
        "experiencia_laboral": exps,
        "habilidades": {"habilidades_tecnicas": [], "idiomas": [], "habilidades_blandas": []},
        "formacion_academica": [],
    }


@pytest.mark.asyncio
async def test_experience_years_usa_fechas_reales_y_min_years():
    """Fuga F3 cerrada: con min_years>0 el sub-score years refleja los años REALES,
    no el conteo de entradas (1 entrada con 1 año ≠ 60 por entrada)."""
    svc = _scoring_fixture()
    kwargs = dict(expanded_skills=[], normalized_degrees=[],
                  normalized_candidate_roles=["rol x"], normalized_rubric_roles=["rol x"],
                  job_soft_skills=[], job_title="puesto")
    # A: 1 entrada SIN fechas, min_years=0 → fallback por entradas = 60
    a = await svc._calculate_matrix_scores(
        _candidate([_exp("rol x")]), _rubric(min_years=0), **kwargs)
    # B: 1 entrada CON 1 año real, min_years=10 → years_c = 10 (no 60)
    b = await svc._calculate_matrix_scores(
        _candidate([_exp("rol x", "2022", "2023")]), _rubric(min_years=10), **kwargs)
    exp_a, exp_b = a["experience"], b["experience"]
    # experience = roles*0.5 + years*0.3 + industry*0.2 → A: 88, B: 73
    assert abs(exp_a - 88.0) < 0.01, f"experience A={exp_a} != 88"
    assert abs(exp_b - 73.0) < 0.01, (
        f"Fuga F3: years={exp_b} ignora fechas reales + min_years (esperado 73)")


@pytest.mark.asyncio
async def test_trajectory_en_matriz_calculada_con_progresion_y_trazable():
    """Rol matcheado + progresión ascendente → trajectory calculada (≠ hardcode 70)
    con componentes trazables en la matriz."""
    svc = _scoring_fixture()
    scores = await svc._calculate_matrix_scores(
        _candidate([_exp("Asistente Administrativo", "2015", "2017"),
                    _exp("Jefe de Sucursal", "2018", "2023")]),
        _rubric(min_years=0),
        expanded_skills=[], normalized_degrees=[],
        normalized_candidate_roles=["jefe de sucursal"], normalized_rubric_roles=["jefe de sucursal"],
        job_soft_skills=[], job_title="puesto",
    )
    assert scores["career_trajectory"] == 100, (
        f"trajectory={scores['career_trajectory']} sigue hardcodeada"
    )
    comp = scores.get("_trajectory_components")
    assert comp and comp["years"] == 100 and comp["stability"] == 100 and comp["progression"] == 100


@pytest.mark.asyncio
async def test_trajectory_fallback_70_preservado_en_matriz():
    """<1 entrada o fechas no parseables → 70 (comportamiento actual preservado)."""
    svc = _scoring_fixture()
    scores = await svc._calculate_matrix_scores(
        _candidate([_exp("rol x")]),  # sin fechas parseables
        _rubric(),
        expanded_skills=[], normalized_degrees=[],
        normalized_candidate_roles=["rol x"], normalized_rubric_roles=["rol x"],
        job_soft_skills=[], job_title="puesto",
    )
    assert scores["career_trajectory"] == 70


@pytest.mark.asyncio
async def test_trajectory_roles_mismatch_penalizacion_preservada():
    """Ramas existentes intactas: roles_mismatch → 30 (SDD solo reemplaza el 70 hardcode)."""
    svc = _scoring_fixture()
    scores = await svc._calculate_matrix_scores(
        _candidate([_exp("Contador Auditor", "2010", "2023")]),
        _rubric(),
        expanded_skills=[], normalized_degrees=[],
        normalized_candidate_roles=["contador auditor"], normalized_rubric_roles=["medico veterinario"],
        job_soft_skills=[], job_title="Médico Veterinario",
    )
    assert scores["career_trajectory"] == 30
