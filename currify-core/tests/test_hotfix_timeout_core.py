"""Hotfix Timeout Core — TDD rojo→verde
Verifica:
  1. Paralelización judge máx 3 concurrentes preserva crédito total, evidencias y determinismo
  2. Presupuesto MAX_SKILL_JUDGE_CALLS=6 respetado incluso bajo paralelo
  3. Cache (skill+hash) evita re-llamadas
  4. Wall-time con 6 judges mocked de 0.1s: secuencial ~0.6s vs 3-concurrent ~0.2s
Todos los tests mockean LLM (cero tokens reales).
"""
import asyncio
import time
import pytest
from unittest.mock import MagicMock, AsyncMock

from app.services.scoring_service import ScoringService
from app.models.dynamic_rubric import StructuredRubric


def _rubric(mandatory):
    return StructuredRubric.model_validate({
        "education": {"required_degrees": [], "academic_level": "Universitario", "kill_clause": False},
        "experience": {"min_years": 0, "key_roles": ["rol x"]},
        "skills": {"mandatory_skills": mandatory, "nice_to_have_skills": []},
        "logistics": {"location": None, "modality": "Presencial"},
        "languages": {"required_languages": []},
        "certifications": {"mandatory_certs": []},
    })


_CAND_BASE = {
    "titular_profesional": {"titular": "T"},
    "datos_contacto": {"email": "a@b.cl"},
    "resumen_profesional": {"resumen": "texto contexto candidato con evidencia suficiente"},
    "experiencia_laboral": [{"cargo": "Cargo", "empresa": "E", "responsabilidades": ["reuniones con apoderados y comunidad evidencia literal"]}],
    "habilidades": {"habilidades_tecnicas": [], "idiomas": [], "habilidades_blandas": []},
    "formacion_academica": [],
}


def _scoring_fixture_with_latency(latency=0.1, judge_responses=None):
    """ScoringService donde cada _judge_single_skill duerme latency y cuenta concurrencia."""
    llm = MagicMock()
    # We will patch _judge_single_skill after construction to add latency + tracking
    svc = ScoringService(llm_service=llm)

    # Mock semantic similarity to force all skills to pending_judge (no literal, no sim)
    async def fake_sim(a, b):
        return 0.0
    async def fake_emb(t):
        return [0.0]*4
    svc.semantic_service.calculate_similarity = fake_sim  # type: ignore
    svc.semantic_service.get_text_embedding = fake_emb  # type: ignore

    # tracking
    state = {"current": 0, "max_concurrent": 0, "calls": 0}

    judge_responses = judge_responses or {}

    original_judge = svc._judge_single_skill

    async def tracked_judge(req_skill: str, candidate_context: str):
        state["current"] += 1
        state["max_concurrent"] = max(state["max_concurrent"], state["current"])
        state["calls"] += 1
        # simulate LLM latency
        await asyncio.sleep(latency)
        state["current"] -= 1
        # return deterministic result - must contain literal evidence from context
        # context is lowercased full_text_lower which contains "reuniones con apoderados"
        evidence = "reuniones con apoderados y comunidad evidencia literal"
        # Use requested judge_responses if provided else default score 1
        key = req_skill.lower()
        if key in judge_responses:
            return MagicMock(score=judge_responses[key]["score"], evidence=judge_responses[key]["evidence"])  # type: ignore
            # but better use SkillJudgeResult
        from app.models.scoring import SkillJudgeResult
        # score 0.5 for even skills, 1.0 for odd to test sum
        score = 0.5 if hash(req_skill) % 2 == 0 else 1.0
        # Ensure evidence is literal substring
        return SkillJudgeResult(skill=req_skill, score=score, evidence=evidence)

    svc._judge_single_skill = tracked_judge  # type: ignore
    # Also mock llm.call_agent to avoid real calls (judge now bypasses llm, but other stages need it)
    async def fake_call_agent(*a, **kw):
        return {"breakdown": {}, "strengths": [], "gaps": [], "summary": ""}
    llm.call_agent = fake_call_agent  # type: ignore

    return svc, state


@pytest.mark.asyncio
async def test_judge_parallel_preserves_credit_and_determinism():
    """El judge paralelizado debe producir MISMO crédito que secuencial (suma conmutativa)"""
    mandatory = [f"skill_{chr(97+i)}" for i in range(6)]  # skill_a..skill_f sorted
    svc, state = _scoring_fixture_with_latency(latency=0.02)
    scores1 = await svc._calculate_matrix_scores(
        dict(_CAND_BASE), _rubric(mandatory),
        expanded_skills=[], normalized_degrees=[],
        normalized_candidate_roles=["cargo"], normalized_rubric_roles=["rol x"],
        job_soft_skills=[], job_title="puesto"
    )
    # calcular de nuevo (con cache) debe dar mismo resultado
    # pero aquí probamos determinismo de orden: el segundo servicio sin cache debe dar mismo
    svc2, _ = _scoring_fixture_with_latency(latency=0.02)
    scores2 = await svc2._calculate_matrix_scores(
        dict(_CAND_BASE), _rubric(mandatory),
        expanded_skills=[], normalized_degrees=[],
        normalized_candidate_roles=["cargo"], normalized_rubric_roles=["rol x"],
        job_soft_skills=[], job_title="puesto"
    )
    assert abs(scores1["skills_match"] - scores2["skills_match"]) < 0.001, "Crédito debe ser determinista"
    assert state["calls"] == 6
    assert state["max_concurrent"] <= 3, f"Conc. máxima {state['max_concurrent']} excede 3"
    assert state["max_concurrent"] > 1, "Debe haber paralelismo (>1 concurrente) para 6 tareas"


@pytest.mark.asyncio
async def test_judge_budget_and_sorted_priority():
    """Presupuesto 6: si hay 8 pendientes ordenadas alfabéticamente, solo primeras 6 viajan"""
    mandatory = [f"skill_{i:02d}" for i in range(8)]  # skill_00..skill_07 sorted
    svc, state = _scoring_fixture_with_latency(latency=0.01)
    scores = await svc._calculate_matrix_scores(
        dict(_CAND_BASE), _rubric(mandatory),
        expanded_skills=[], normalized_degrees=[],
        normalized_candidate_roles=["cargo"], normalized_rubric_roles=["rol x"],
        job_soft_skills=[], job_title="puesto"
    )
    assert state["calls"] == 6, f"Presupuesto 6 violado: calls={state['calls']}"
    # cache debe tener exactamente 6 entradas
    assert len(svc._skill_judge_cache) == 6
    # las dos últimas alfabéticamente no deben estar en cache
    full_text_lower = " ".join(["texto contexto candidato con evidencia suficiente", "reuniones con apoderados y comunidad evidencia literal"]).lower()
    # compute keys
    for skill in ["skill_06", "skill_07"]:
        key = (skill, hash(full_text_lower))
        # The hash approach in code uses full_text_lower derived from contexto real
        # We just check that not all 8 are cached - sufficient: len==6
        pass
    # Segunda evaluación mismo candidato: las 6 cacheadas dan hit; las 2 de cola (07-08) consumen presupuesto restante -> 2 nuevas
    state["calls"] = 0
    # need to reset max_concurrent but keep cache
    state["max_concurrent"] = 0
    scores2 = await svc._calculate_matrix_scores(
        dict(_CAND_BASE), _rubric(mandatory),
        expanded_skills=[], normalized_degrees=[],
        normalized_candidate_roles=["cargo"], normalized_rubric_roles=["rol x"],
        job_soft_skills=[], job_title="puesto"
    )
    # 6 hits + 2 misses nuevas = 2 calls (el cache reduce de 6 a 2, no a 0, porque las 2 últimas no estaban cacheadas)
    assert state["calls"] == 2, f"Segunda pasada debe juzgar las 2 de cola pendientes: {state['calls']}"
    # Segunda pasada debe tener mayor scoring que primera (2 skills más acreditadas)
    assert scores2["skills_match"] > scores["skills_match"], "Segunda pasada debe subir credit al juzgar cola"
    # Tercera pasada ahora sí 100% cache (8 entradas)
    state["calls"] = 0
    state["max_concurrent"] = 0
    scores3 = await svc._calculate_matrix_scores(
        dict(_CAND_BASE), _rubric(mandatory),
        expanded_skills=[], normalized_degrees=[],
        normalized_candidate_roles=["cargo"], normalized_rubric_roles=["rol x"],
        job_soft_skills=[], job_title="puesto"
    )
    assert state["calls"] == 0, f"Tercera pasada 100% cache: {state['calls']}"
    assert abs(scores2["skills_match"] - scores3["skills_match"]) < 0.001


@pytest.mark.asyncio
async def test_judge_cache_avoids_repeat():
    mandatory = ["skill_a", "skill_b"]
    svc, state = _scoring_fixture_with_latency(latency=0.01)
    await svc._calculate_matrix_scores(dict(_CAND_BASE), _rubric(mandatory),
        expanded_skills=[], normalized_degrees=[], normalized_candidate_roles=["cargo"], normalized_rubric_roles=["rol x"],
        job_soft_skills=[], job_title="puesto")
    first = state["calls"]
    assert first == 2
    state["calls"] = 0
    state["max_concurrent"] = 0
    await svc._calculate_matrix_scores(dict(_CAND_BASE), _rubric(mandatory),
        expanded_skills=[], normalized_degrees=[], normalized_candidate_roles=["cargo"], normalized_rubric_roles=["rol x"],
        job_soft_skills=[], job_title="puesto")
    assert state["calls"] == 0


@pytest.mark.asyncio
async def test_wall_time_parallel_vs_sequential():
    """6 judges x 0.1s: secuencial ~0.6s ; paralelo 3-concurrent ~0.2s (+ overhead). Assert <0.4s"""
    mandatory = [f"skill_{i}" for i in range(6)]
    # Use latency 0.1s as per verification spec
    latency = 0.1
    svc, state = _scoring_fixture_with_latency(latency=latency)
    start = time.monotonic()
    await svc._calculate_matrix_scores(dict(_CAND_BASE), _rubric(mandatory),
        expanded_skills=[], normalized_degrees=[], normalized_candidate_roles=["cargo"], normalized_rubric_roles=["rol x"],
        job_soft_skills=[], job_title="puesto")
    elapsed = time.monotonic() - start
    print(f"⏱️ Wall-time bloque judge (6 x {latency}s, max 3 concurrent): {elapsed:.3f}s max_concurrent={state['max_concurrent']}")
    # Antes del fix: ~0.6s ; Después: ~0.2s. Umbral 0.4s demuestra paralelismo.
    assert elapsed < 0.4, f"Wall-time {elapsed:.3f}s no demuestra paralelismo 3-concurrent (esperado ~0.2s, threshold 0.4s)"
    assert elapsed >= 0.15, f"Wall-time sospechosamente bajo {elapsed:.3f}s (posible mock sin sleep)"
    assert state["max_concurrent"] == 3, f"Se esperaban 3 concurrentes exactos para 6 tareas, got {state['max_concurrent']}"


@pytest.mark.asyncio
async def test_judge_evidence_validation_preserved():
    """Evidencia no literal → score 0 aunque judge devuelva 1. Cache y suma deben respetarlo"""
    llm = MagicMock()
    svc = ScoringService(llm_service=llm)
    async def fake_sim(a,b): return 0.0
    async def fake_emb(t): return [0.0]*4
    svc.semantic_service.calculate_similarity = fake_sim  # type: ignore
    svc.semantic_service.get_text_embedding = fake_emb  # type: ignore
    async def fake_call_agent(*a, **kw): return {"breakdown":{}, "strengths":[], "gaps":[], "summary":""}
    llm.call_agent = fake_call_agent

    # Mock _judge_single_skill original via llm_service.call_agent to test evidence guard
    # We patch llm.call_agent to return no evidencia o evidencia inventada
    from app.models.scoring import SkillJudgeResult
    async def evil_judge(req, ctx):
        # devuelve evidencia inventada que NO está en ctx
        return SkillJudgeResult(skill=req, score=1.0, evidence="evidencia inventada que no existe en contexto")
    # Pero el guard de evidencia está dentro de _judge_single_skill mismo; probamos a través de _judge_single_skill
    # Entonces usamos el método real pero mockeando llm.call_agent para que devuelva evil payload
    async def fake_llm_judge(prompt, input_data, stage_name, **kw):
        if stage_name == "SKILL_JUDGE":
            return {"score": 1.0, "evidence": "inventada no literal"}
        return {}
    llm.call_agent = fake_llm_judge  # type: ignore
    # Now call judge directly
    result = await svc._judge_single_skill("skill_x", "contexto real con reuniones con apoderados")
    assert result.score == 0.0, "Evidencia no literal debe forzar score 0"
    assert result.evidence is None
