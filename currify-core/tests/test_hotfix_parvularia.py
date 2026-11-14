"""Tests TDD hotfix parvularia — 4 bugs (fechas, re-enrute, crédito parcial skills, roles no-tech).

Todos los tests mockean el LLM (cero tokens reales).
Imports de features nuevas van DENTRO de cada test: el fallo inicial esperado es
ImportError/AttributeError (feature ausente) o assertion de comportamiento.
"""
import pytest
from unittest.mock import MagicMock

from app.models.resume import ResumeData
from app.services.section_extractor import SectionResult
from app.services.robust_extraction_service import RobustExtractionService
from app.services.scoring_service import ScoringService


def _make_svc(llm=None) -> RobustExtractionService:
    return RobustExtractionService(llm_service=llm or MagicMock())


# ══════════════════════════════════════════════════════════════════════════════
# BUG 1a — Few-shots pipe/en-dash en prompt de experience
# ══════════════════════════════════════════════════════════════════════════════

def test_prompt_experience_covers_pipe_endash_layouts():
    from app.services.section_extractor import PROMPT_EXPERIENCE
    p = PROMPT_EXPERIENCE.lower()
    # Layout pipe con rango de años
    assert "empresa | 2018 - 2023" in p or "| 2018" in p, "Falta few-shot 'Empresa | 2018 - 2023'"
    # Layout guión-corta doble
    assert "–" in p or ("2018–2023" in p), "Falta few-shot en-dash 'Empresa – 2018–2023'"
    # Layout pipe con mes-año abreviado
    assert "ene 2018" in p, "Falta few-shot 'Empresa | ene 2018 - dic 2023'"
    # Prohibición explícita de N/A en fechas
    assert "n/a" in p, "El prompt debe prohibir explícitamente N/A en fechas"


# ══════════════════════════════════════════════════════════════════════════════
# BUG 1b — Capa determinista post-LLM anclada a la línea de la empresa
# ══════════════════════════════════════════════════════════════════════════════

CV_ANCHOR = """Candidata Test
EXPERIENCIA LABORAL
Fundación San Carlos de Maipo | 2018 - 2023
Educadora de Párvulos
• Tarea 1
"""


def test_deterministic_date_repair_anchored_to_company_line():
    svc = _make_svc()
    data = {
        "experiencia_laboral": [
            {
                "cargo": "Educadora de Párvulos",
                "empresa": "Fundación San Carlos de Maipo",
                "periodo": {"fecha_inicio": None, "fecha_fin": "2023", "texto_original": "N/A - 2023"},
                "responsabilidades": [],
            }
        ]
    }
    out = svc._repair_missing_dates_from_text(data, CV_ANCHOR)
    p = out["experiencia_laboral"][0]["periodo"]
    assert p["fecha_inicio"] and str(p["fecha_inicio"]).startswith("2018"), f"inicio no reparado: {p}"
    assert p["fecha_fin"] and str(p["fecha_fin"]).startswith("2023"), f"fin incorrecto: {p}"


def test_deterministic_date_repair_month_year_anchor():
    svc = _make_svc()
    cv = "Empresa X | ene 2018 - dic 2023\nCargo Y"
    data = {"experiencia_laboral": [
        {"cargo": "Cargo Y", "empresa": "Empresa X",
         "periodo": {"fecha_inicio": None, "fecha_fin": None, "texto_original": "N/A"}, "responsabilidades": []}
    ]}
    out = svc._repair_missing_dates_from_text(data, cv)
    p = out["experiencia_laboral"][0]["periodo"]
    assert str(p["fecha_inicio"]).startswith("2018")
    assert str(p["fecha_fin"]).startswith("2023")


def test_deterministic_date_repair_never_invents_years():
    svc = _make_svc()
    data = {"experiencia_laboral": [
        {"cargo": "Cargo", "empresa": "Empresa Inexistente S.A.",
         "periodo": {"fecha_inicio": None, "fecha_fin": None, "texto_original": None}, "responsabilidades": []}
    ]}
    out = svc._repair_missing_dates_from_text(data, CV_ANCHOR)
    p = out["experiencia_laboral"][0]["periodo"]
    assert p["fecha_inicio"] is None, "NUNCA inventar años fuera del texto"


def test_deterministic_date_repair_respects_existing_values():
    svc = _make_svc()
    data = {"experiencia_laboral": [
        {"cargo": "Educadora", "empresa": "Fundación San Carlos de Maipo",
         "periodo": {"fecha_inicio": "2017-03", "fecha_fin": "Presente", "texto_original": "Mar 2017 - Presente"},
         "responsabilidades": []}
    ]}
    out = svc._repair_missing_dates_from_text(data, CV_ANCHOR)
    p = out["experiencia_laboral"][0]["periodo"]
    assert p["fecha_inicio"] == "2017-03" and p["fecha_fin"] == "Presente", "No pisar valores válidos existentes"


# ══════════════════════════════════════════════════════════════════════════════
# BUG 1c — Validador Pydantic + retry acotado (máx 1 por entrada)
# ══════════════════════════════════════════════════════════════════════════════

def test_period_repair_detector_flags_recoverable_entries():
    from app.models.resume import period_has_recoverable_years
    assert period_has_recoverable_years({"fecha_inicio": "N/A", "texto_original": "N/A - 2023"}) is True
    assert period_has_recoverable_years({"fecha_inicio": None, "texto_original": "ene 2018 - dic 2023"}) is True
    assert period_has_recoverable_years({"fecha_inicio": "2018", "texto_original": "x"}) is False
    assert period_has_recoverable_years(None) is False
    assert period_has_recoverable_years({"fecha_inicio": None, "texto_original": "sin años aquí"}) is False


@pytest.mark.asyncio
async def test_bounded_date_retry_repairs_and_caps_one_call_per_entry():
    llm = MagicMock()
    calls = {"n": 0}

    async def fake(prompt, input_data, stage_name, **kw):
        if stage_name == "date_repair_retry":
            calls["n"] += 1
            return {"fecha_inicio": "2018-01", "fecha_fin": "2023-12"}
        return None

    llm.call_agent = fake  # type: ignore
    svc = _make_svc(llm)

    rd = ResumeData(experiencia_laboral=[
        {"cargo": "A", "empresa": "B", "periodo": {"texto_original": "ene 2018 - dic 2023"}},
    ])
    out = await svc._repair_dates_with_bounded_retry(rd, "", request_id="t1")
    assert out.experiencia_laboral[0].periodo.fecha_inicio == "2018-01"
    assert calls["n"] == 1, "Debe ser exactamente 1 retry para esta entrada"

    # Segunda pasada sobre la misma entrada ya reparada → sin llamadas nuevas
    out2 = await svc._repair_dates_with_bounded_retry(out, "", request_id="t2")
    assert calls["n"] == 1, "Entrada válida no debe disparar más retries"


@pytest.mark.asyncio
async def test_bounded_date_retry_rejects_years_outside_context():
    llm = MagicMock()

    async def fake(prompt, input_data, stage_name, **kw):
        if stage_name == "date_repair_retry":
            return {"fecha_inicio": "1999", "fecha_fin": "2005"}  # años NO presentes en contexto
        return None

    llm.call_agent = fake  # type: ignore
    svc = _make_svc(llm)

    rd = ResumeData(experiencia_laboral=[
        {"cargo": "A", "empresa": "B", "periodo": {"texto_original": "referencia 2018"}},
    ])
    out = await svc._repair_dates_with_bounded_retry(rd, "", request_id="t3")
    assert out.experiencia_laboral[0].periodo.fecha_inicio is None, "No aceptar años fuera del contexto"


@pytest.mark.asyncio
async def test_bounded_date_retry_graceful_on_junk_llm_output():
    llm = MagicMock()

    async def fake(prompt, input_data, stage_name, **kw):
        if stage_name == "date_repair_retry":
            return "respuesta basura no JSON"
        return None

    llm.call_agent = fake  # type: ignore
    svc = _make_svc(llm)

    rd = ResumeData(experiencia_laboral=[
        {"cargo": "A", "empresa": "B", "periodo": {"texto_original": "algo 2018"}},
    ])
    out = await svc._repair_dates_with_bounded_retry(rd, "", request_id="t4")  # no debe lanzar
    assert out.experiencia_laboral[0].periodo.fecha_inicio is None


# ══════════════════════════════════════════════════════════════════════════════
# BUG 2 — Re-enrute estructural de bloques laborales colados
# ══════════════════════════════════════════════════════════════════════════════

COLADED_ITEMS = [
    "Corporación Educacional B | 2010 - 2017 Educadora de Párvulos Nivel Medio",
    "Junta de Vecinos Los Aromos | 2009 - 2010 Educadora en programa comunitario",
    "Disponibilidad para trabajar en regiones",
    "Licencia de conducir clase B",
    "Voluntariado en Techo Chile 2019 - 2021",
]


def test_reroute_moves_work_blocks_and_keeps_genuine_items():
    svc = _make_svc()
    remaining, exps = svc._reroute_work_blocks(COLADED_ITEMS)
    assert len(exps) == 2, f"Deben moverse 2 bloques laborales, se movieron {len(exps)}: {exps}"
    by_empresa = {str(e.get("empresa", "")).lower(): e for e in exps}
    corp = next((v for k, v in by_empresa.items() if "corporación educacional b" in k), None)
    assert corp is not None, f"Falta Corporación Educacional B: {by_empresa}"
    assert corp["cargo"] and "educadora" in str(corp["cargo"]).lower()
    assert str(corp["periodo"]["fecha_inicio"]).startswith("2010")
    assert str(corp["periodo"]["fecha_fin"]).startswith("2017")
    # Items genuinos permanecen
    low = [str(x).lower() for x in remaining]
    assert any("disponibilidad" in x for x in low)
    assert any("licencia" in x for x in low)
    # Voluntariado con rango de años NO es bloque laboral
    assert any("voluntariado" in x for x in low)


def test_reroute_handles_cargo_empresa_without_dates():
    svc = _make_svc()
    remaining, exps = svc._reroute_work_blocks(["Vendedora de Tienda | Retail X"])
    assert len(exps) == 1
    assert exps[0]["cargo"].lower().startswith("vendedora")
    assert "retail x" in str(exps[0]["empresa"]).lower()


def test_reroute_absorbs_following_bullets_as_responsibilities():
    svc = _make_svc()
    items = [
        "Corporación Educacional B | 2010 - 2017 Educadora de Párvulos Nivel Medio",
        "• Gestión de curso de 25 párvulos con planificación educativa por ámbitos",
        "• Aplicación de primeros auxiliares pediátricos y protocolos de emergencia",
        "Disponibilidad para trabajar en regiones",
    ]
    remaining, exps = svc._reroute_work_blocks(items)
    assert len(exps) == 1
    resps = [str(r).lower() for r in exps[0]["responsabilidades"]]
    assert any("gestión de curso" in r for r in resps), f"Viñeta no absorbida: {resps}"
    assert any("primeros auxiliares" in r for r in resps), f"Viñeta no absorbida: {resps}"
    # El item no-bullet posterior NO se absorbe
    low_remaining = [str(x).lower() for x in remaining]
    assert any("disponibilidad" in x for x in low_remaining)


def test_merge_section_results_applies_reroute():
    svc = _make_svc()
    section_results = {
        "other": SectionResult(
            section_type="other", success=True,
            data={"section_name": "OTROS ANTECEDENTES", "items": COLADED_ITEMS},
            method="heuristic",
        ),
    }
    merged = svc._merge_section_results(section_results, "cv crudo", "test-reroute")
    assert len(merged["experiencia_laboral"]) == 2
    assert len(merged["otros_antecedentes"]) == 3
    assert any("voluntariado" in str(i).lower() for i in merged["otros_antecedentes"])


# ══════════════════════════════════════════════════════════════════════════════
# BUG 3 — Crédito parcial skills (bandas) + judge acotado
# ══════════════════════════════════════════════════════════════════════════════

def _scoring_fixture(judge_responses: dict, sim_table: dict):
    """Arma ScoringService con LLM mockeado (judge) y similitud tabular."""
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


def _rubric(mandatory, nice=None):
    from app.models.dynamic_rubric import StructuredRubric
    return StructuredRubric.model_validate({
        "education": {"required_degrees": [], "academic_level": "Universitario", "kill_clause": False},
        "experience": {"min_years": 0, "key_roles": ["rol x"]},
        "skills": {"mandatory_skills": mandatory, "nice_to_have_skills": nice or []},
        "logistics": {"location": None, "modality": "Presencial"},
        "languages": {"required_languages": []},
        "certifications": {"mandatory_certs": []},
    })


_CAND_MIN = {
    "titular_profesional": {"titular": "T"},
    "datos_contacto": {"email": "a@b.cl"},
    "resumen_profesional": {"resumen": "texto contexto candidato"},
    "experiencia_laboral": [{"cargo": "Cargo", "empresa": "E", "responsabilidades": ["reuniones con apoderados y comunidad"]}],
    "habilidades": {"habilidades_tecnicas": [], "idiomas": [], "habilidades_blandas": []},
    "formacion_academica": [],
}


@pytest.mark.asyncio
async def test_skill_judge_result_schema_forces_zero_without_evidence():
    from app.models.scoring import SkillJudgeResult
    ok = SkillJudgeResult(skill="x", score=1.0, evidence="texto literal del cv")
    assert ok.score == 1.0
    no_ev = SkillJudgeResult(skill="x", score=1.0, evidence=None)
    assert no_ev.score == 0.0, "Sin evidencia literal → score forzado a 0"
    empty_ev = SkillJudgeResult(skill="x", score=0.5, evidence="   ")
    assert empty_ev.score == 0.0


@pytest.mark.asyncio
async def test_skills_partial_credit_three_bands():
    mandatory = ["skill_exacta", "skill_sim_alta", "skill_sim_media", "skill_judge_ok", "skill_sin_evidencia"]
    expanded = ["skill_exacta", "cand_sim_alta", "cand_sim_media"]
    sim_table = {
        ("skill_sim_alta", "cand_sim_alta"): 0.85,   # banda 1.0 (≥0.80)
        ("skill_sim_media", "cand_sim_media"): 0.70,  # banda 0.5 (≥0.65)
    }
    judge_responses = {
        "skill_judge_ok": {"score": 1.0, "evidence": "reuniones con apoderados y comunidad"},
    }
    svc, judge_calls = _scoring_fixture(judge_responses, sim_table)

    scores = await svc._calculate_matrix_scores(
        dict(_CAND_MIN), _rubric(mandatory),
        expanded_skills=expanded,
        normalized_degrees=[], normalized_candidate_roles=["cargo"], normalized_rubric_roles=["rol x"],
        job_soft_skills=[], job_title="puesto",
    )
    # Crédito: 1.0(exacta) + 1.0(sim≥0.80) + 0.5(sim≥0.65) + 1.0(judge c/ evidencia) + 0.0(sin evidencia)
    #          = 3.5/5 = 70
    # Fórmula final EXISTENTE (intocable): min(100, mandatory*0.8 + nice_bonus*0.2) = 70*0.8 = 56
    assert abs(scores["skills_match"] - 56.0) < 0.01, f"skills_match={scores['skills_match']} != 56"
    assert judge_calls["n"] == 2, f"Solo 2 skills debían llegar al judge, fueron {judge_calls['n']}"


@pytest.mark.asyncio
async def test_skill_judge_budget_capped_at_six_calls():
    mandatory = [f"skill_desconocida_{i}" for i in range(8)]
    svc, judge_calls = _scoring_fixture({}, {})
    scores = await svc._calculate_matrix_scores(
        dict(_CAND_MIN), _rubric(mandatory),
        expanded_skills=["otra cosa"],
        normalized_degrees=[], normalized_candidate_roles=["cargo"], normalized_rubric_roles=["rol x"],
        job_soft_skills=[], job_title="puesto",
    )
    assert judge_calls["n"] <= 6, f"Judge excedió presupuesto: {judge_calls['n']}"


@pytest.mark.asyncio
async def test_skill_judge_cache_avoids_repeat_calls():
    mandatory = ["skill_a", "skill_b", "skill_c"]
    svc, judge_calls = _scoring_fixture({}, {})
    kwargs = dict(
        expanded_skills=["nada"],
        normalized_degrees=[], normalized_candidate_roles=["cargo"], normalized_rubric_roles=["rol x"],
        job_soft_skills=[], job_title="puesto",
    )
    await svc._calculate_matrix_scores(dict(_CAND_MIN), _rubric(mandatory), **kwargs)
    first = judge_calls["n"]
    assert first > 0
    await svc._calculate_matrix_scores(dict(_CAND_MIN), _rubric(mandatory), **kwargs)
    assert judge_calls["n"] == first, "Segunda evaluación del mismo candidato debe venir 100% de cache"


@pytest.mark.asyncio
async def test_judge_feeds_matrix_not_final_score():
    """El judge solo refina matching de skills (matriz); overall sigue siendo Σ ponderada determinista."""
    svc, _ = _scoring_fixture({"skill_x": {"score": 1.0, "evidence": "reuniones con apoderados y comunidad"}}, {})
    deterministic = {"skills_match": 40.0, "experience": 50.0, "education": 0.0,
                     "cultural_fit": 50.0, "logistics": 100.0, "career_trajectory": 70.0}
    llm_result = {
        # El LLM intenta (ilegítimamente) imponer scores → deben ignorarse
        "breakdown": {k: {"reasoning": "r", "score": 100} for k in deterministic},
        "strengths": [], "gaps": [], "summary": "s",
    }
    resp = svc._parse_llm_response(llm_result, deterministic_scores=deterministic)
    expected_overall = sum(deterministic[k] * w / 100 for k, w in {
        "skills_match": 30, "experience": 25, "education": 15,
        "cultural_fit": 15, "logistics": 10, "career_trajectory": 5,
    }.items())
    assert abs(resp.overall_score - expected_overall) < 0.01
    assert resp.breakdown["skills_match"].score == 40.0


# ══════════════════════════════════════════════════════════════════════════════
# BUG 4 — normalize_job_titles: match exacto antes de embeddings + clusters dominio
# ══════════════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_normalize_job_titles_exact_match_no_llm_call():
    from app.services.semantic_service import SemanticService
    llm = MagicMock()

    async def boom(*a, **kw):
        raise AssertionError("ROLE_NORMALIZATION no debe llamarse cuando hay match exacto en clusters")

    llm.call_agent = boom  # type: ignore
    svc = SemanticService(llm_service=llm)

    out = await svc.normalize_job_titles(["Educadora de Párvulos", "educadora nivel medio"])
    assert out == ["educadora de párvulos", "educadora de párvulos"], f"clusters educación: {out}"

    out2 = await svc.normalize_job_titles(["Enfermera Clínica", "enfermero"])
    assert all("enfermer" in t for t in out2), f"clusters salud: {out2}"


@pytest.mark.asyncio
async def test_normalize_job_titles_pending_titles_go_to_llm():
    from app.services.semantic_service import SemanticService
    captured = {}

    async def fake(prompt, input_data, stage_name, **kw):
        captured["prompt"] = prompt
        return ["cargo inexistente xyz"]

    llm = MagicMock()
    llm.call_agent = fake  # type: ignore
    svc = SemanticService(llm_service=llm)

    out = await svc.normalize_job_titles(["Educadora de Párvulos", "Cargo Inexistente XYZ"])
    prompt_lower = captured["prompt"].lower()
    # Solo el título pendiente fue al LLM (el resuelto por cluster NO aparece en el prompt)
    assert "cargo inexistente xyz" in prompt_lower, "El título pendiente debe ir al LLM"
    assert "educadora de párvulos" not in prompt_lower, (
        f"El título resuelto por cluster NO debe enviarse al LLM. Prompt: {prompt_lower[:300]}"
    )
    by_value = {v for v in out}
    assert "educadora de párvulos" in by_value, f"Cluster educación: {out}"
    assert "cargo inexistente xyz" in by_value, f"Pending normalizado por LLM: {out}"


# ══════════════════════════════════════════════════════════════════════════════
# BUG 3 (prompt) — LATENT_SKILL_EXTRACTION agnóstica al dominio
# ══════════════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_latent_skill_extraction_prompt_domain_agnostic():
    from app.services.semantic_service import SemanticService
    captured = {}

    async def fake(prompt, input_data, stage_name, **kw):
        captured["prompt"] = prompt
        return []

    llm = MagicMock()
    llm.call_agent = fake  # type: ignore
    svc = SemanticService(llm_service=llm)

    text = ("Diseñé proyectos pedagógicos para párvulos y apliqué primeros auxiliares. " * 3)
    await svc.extract_skills_from_description(text)

    p = captured["prompt"].lower()
    # Multi-dominio explícito
    assert any(kw in p for kw in ("education", "educación", "healthcare", "salud")), (
        "El prompt debe declarar cobertura multi-industria (educación, salud, oficios...)"
    )
    assert "pedagog" in p or "parvul" in p, "Debe incluir ejemplo no-tech (pedagogía)"
    # Sin sesgo tech exclusivo
    assert "technical recruiter" not in p, "Quitar framing tech-only ('Technical Recruiter')"
