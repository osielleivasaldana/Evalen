# Batch-Fix Medición Residual — Puente cultural_fit + Anti-soft + Expansión CNEP

**Fecha:** 2026-08-25
**Estado:** ✅ Implementado y verificado
**Responsable técnico:** @core-expert (delegado por Tech Lead)
**Módulo:** currify-core
**Origen:** Diagnósticos `docs/debug/diag-parvularia-techo-dimensional-2026-08-25.md` y `docs/debug/diag-parvularia-campana-real-2026-08-25.md`

---

## 1. Problema

Tras el hotfix parvularia (overall 36→60 en producción), el diagnóstico dimensional identificó error de medición residual:

1. **F1:** cultural_fit ignoraba las habilidades blandas declaradas por el candidato (flat-50).
2. **F2:** la inyección parser→mandatory colaba habilidades blandas como mandatory.
3. **F3:** drift conceptual CNEP — requisito "Currículum Nacional" vs CV con lenguaje nativo CNEP ("ámbitos de aprendizaje") → 0.00 injusto.

## 2. Solución

| Fix | Implementación | Archivo(s) |
|---|---|---|
| F1 | Campo opcional retrocompatible `RubricSkills.soft_skills` + blandas declaradas del CV incorporadas al corpus literal/puente de cultural_fit | `app/models/dynamic_rubric.py`, `scoring_service.py` |
| F2 | Clasificador anti-soft determinista (`is_soft_skill()`, léxico sin LLM); blanda → redirigida a su bucket | `app/services/skill_classification.py` (nuevo), `dynamic_rubric_service.py` |
| F3 | Expansión léxica lado-rúbrica pre-bandas (`DOMAIN_SKILL_RULES`, CNEP primero, extensible a salud/oficios; estático, cero LLM) | `app/services/domain_expansion.py` (nuevo), `scoring_service.py` |

## 3. Restricciones verificadas

Pesos intocables · overall determinista · judge→matriz (rol/umbral/cache/máx-6 intactos) · **cero llamadas LLM nuevas** (de hecho −1 en campaña real: CNEP ya no consume judge) · semáforos/caches intactos · bandas 0.80/0.65 sin mover · sin cambios HTTP/endpoints · currify-back/front intocados.

## 4. Evidencia de verificación

- **TDD:** rojo por fix (AttributeError/ModuleNotFoundError/fuga F1 medida) → verde.
- **Unitarios:** `tests/test_batchfix_f1_f2_f3.py` — **11 passed** (4 F1 + 2 F2 + 3 F3 + 2 guardarraíles). Verificado por Tech Lead junto con hotfix previo: **32 passed**.
- **Eval:** `evals/test_cv_parvularia_15y.py` — passed (verificado por Tech Lead).
- **Suite completa:** 134 passed, 6 fallos pre-existentes ajenos (ambientales/import), 6 skipped — cero regresiones.
- **Deltas medidos re-ejecutando diagnósticos:**
  - Campaña real R4 primario: **67.39 → 72.07 (+4.68 ≈ objetivo +4.8)**; cultural_fit 58.33→66.67; skills 17.14→28.57.
  - R3 inyección: mandatory 11→7, sin budget starvation del judge.
  - Techo genérico: baseline 85.0 y techo estructural 93.1 intactos; S2 78.14→81.57 (CNEP acredita legítimamente).

## 5. Documentación viva

- `.agents/skills/core/currify-llm-pipelines/SKILL.md` §10 (10.1 puente cultural · 10.2 anti-soft · 10.3 expansión lado-rúbrica · 10.4 presupuesto/efecto).
- `docs/contracts/core/scoring_contract.md` actualizado (fuente de cultural_fit + invariantes).

## 6. Expectativa de producción

Casos de la clase parvularia/no-tech deberían ganar ~+4–5 pts de overall respecto al deploy anterior (60 observado → ~64–65 esperable con la misma campaña/CV), más hasta +7.5 adicionales en CVs ricos en blandas declaradas. La primera evaluación por candidato puede usar menos llamadas de judge que antes.

## 7. Pendientes agendados (no bloqueantes)

- Re-clasificación automática mandatory/nice-to-have (decisión de producto, requiere diseño propio).
- Logistics comuna→ciudad antes del kill-clause binario (−10 potencial).
- career_trajectory con señal real (fechas/cargos) en vez de hardcode 70.
- Deuda técnica heredada: tipado estático, Pydantic V2, test pre-existente fallando.
