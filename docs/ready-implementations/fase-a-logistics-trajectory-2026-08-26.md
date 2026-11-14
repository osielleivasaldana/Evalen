# Fase A SDD Scoring Fase 2 — Logistics Geográfico Jerárquico + Trajectory por Componentes

**Fecha:** 2026-08-26
**Estado:** ✅ Implementado, verificado y ratificado
**Responsable técnico:** @core-expert (delegado por Tech Lead)
**Especificación:** `docs/SDD Calidad de Scoring Fase 2 - Currify Core.md` §4.1, §4.2, §8-Fase A
**Acta de decisiones:** `docs/debug/2026-08-25-fase-a-logistics-trajectory.md` (D1–D7 ratificadas por Tech Lead)

---

## 1. Implementado

| Punto | Solución | Archivo(s) |
|---|---|---|
| P1 | Escalera geográfica comuna(100)→provincia(70)→región(50)→sin match(0); campaña sin requisito=100; CV sin ubicación=50 neutral con traza. Tabla geo versionada `GEO_CHILE_VERSION="2026.08"` (344/346 comunas, brecha documentada en D7 con proceso de actualización) | `app/services/geo_chile.py` (nuevo), `scoring_service.py` |
| P2 | `trajectory = round(0.50·years_c + 0.30·stability_c + 0.20·progression_c)` con constantes centralizadas y fallback 70 preservado; ramas roles_mismatch→30 / insuficiente→50 intactas (D4) | `scoring_service.py` |
| Fuga years | Sub-score `years` de experience ahora usa fechas reales reparadas + `rubric.min_years` | `scoring_service.py` |

Decisiones ratificadas: D1 matching multi-parte por componentes (mejor tier gana) · D2 comuna-first en homónimos · D3 solo campos de ubicación extraídos (sin texto crudo) · D5 zigzag→insuficiente(60) · D6 fechas estrictas anti-invención.

## 2. Verificación del Lead

- **Tests nuevos:** `test_logistics_geo.py` (20) + `test_trajectory_signal.py` (19) → ejecutados junto a obligatorias: **71 passed** (20+19+21+11) ✓
- **Eval parvularia:** passed ✓
- **Suite completa reportada:** 173 passed, 2 fallos pre-existentes ajenos (P4c/P4d los abordan), 6 skipped
- **Diagnóstico re-ejecutado por Lead:** S3=93.6 confirma patrón de deltas del acta ✓

## 3. Deltas vs baseline (SDD §10)

| Métrica | Baseline | Resultado | Objetivo |
|---|---|---|---|
| S4 kill-clause | 75.0 | **86.1** (+11.1) | ≥85 ✅ |
| R4 campaña real | 72.07 | **73.17** (+1.1) | sin retroceder ✅ |
| Trajectory fixture | 70 constante | **92** (señal real) | no constante ✅ |
| Resto de escenarios | — | todos +1.1, ninguno cae | >−2 pts prohibido ✅ |

## 4. Restricciones confirmadas

Pesos intocables · overall determinista · judge intacto · **cero llamadas LLM nuevas** · semáforos/caches intactos · bandas fijas · sin cambios HTTP · tests existentes sin editar.

## 5. Documentación viva

- `.agents/skills/core/currify-llm-pipelines/SKILL.md` §11 (logistics jerárquico, trajectory por componentes, deltas)
- `docs/contracts/core/scoring_contract.md` (invariantes P1/P2)

## 6. Pendiente

- Fase B (P3 re-clasificación mandatory/nice tras flag + harness goldens)
- Fase C (P4 higiene: Pydantic V2, tipado estático, triage test roto, skipif ambientales)
