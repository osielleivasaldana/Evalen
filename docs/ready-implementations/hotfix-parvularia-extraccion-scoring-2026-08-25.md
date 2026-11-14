# Hotfix Parvularia — Extracción + Scoring para CVs No-Tech

**Fecha:** 2026-08-25
**Estado:** ✅ Implementado y verificado
**Responsable técnico:** @core-expert (delegado por Tech Lead)
**Módulo:** currify-core
**Eval de referencia:** `evals/test_cv_parvularia_15y.py`

---

## 1. Problema

CVs no-tech (caso reportado: Educadora de Párvulos, ~15 años exp.) fallaban en calidad de extracción y scoring:

1. **BUG 1 (fechas):** Línea `Fundación San Carlos de Maipo | 2018 – 2023` se extraía como `N/A – 2023`.
2. **BUG 2 (enrute):** Bloques laborales caían en `otros_antecedentes`.
3. **BUG 3 (skills=0):** Terminología pedagógica no matcheaba exacto contra rúbrica → mandatory skills en 0.
4. **BUG 4 (roles no-tech):** `normalize_job_titles` dependía solo de embeddings → títulos de educación/salud sin normalizar.

## 2. Solución (genérica, agnóstica al dominio)

| Bug | Fix | Archivo(s) |
|---|---|---|
| 1a | Few-shots pipe/en-dash en prompt de experience + prohibición de `N/A` | `app/services/section_extractor.py` |
| 1b | Repair determinista post-LLM: regex de rangos de años anclada a línea de empresa (`_repair_missing_dates_from_text`, `_find_company_context_line`). Nunca inventa años ni pisa valores válidos | `app/services/robust_extraction_service.py` |
| 1c | Validador Pydantic + retry acotado por entrada (máx 1) cuando `fecha_inicio=N/A` y el texto contiene `\d{4}` | `app/models/resume.py`, `robust_extraction_service.py` |
| 2 | Re-enrute estructural genérico (`_reroute_work_blocks`): rango-años + lexicón de roles; absorbe viñetas como responsabilidades; excluye voluntariados/cursos. Sin empresas hardcodeadas | `robust_extraction_service.py` |
| 3 | Tres bandas mandatory skills (≥0.80→1.0 / ≥0.65→0.5 / <0.65→judge) + `SkillJudgeResult` con evidencia literal obligatoria (anti-alucinación: substring literal) + cache (skill+hash candidato) + `MAX_SKILL_JUDGE_CALLS=6`. Judge alimenta la MATRIZ, nunca el score | `scoring_service.py`, `app/models/scoring.py` |
| 3b | `LATENT_SKILL_EXTRACTION` multi-industria | `semantic_service.py` |
| 4 | Match exacto normalizado ANTES de embeddings + clusters de dominio (educación/salud/oficios/tech, extensible) | `semantic_service.py` |

## 3. Restricciones verificadas

- Pesos de scoring intocables (`docs/contracts/core/scoring_contract.md`) ✓
- Overall = Σ ponderada determinista (test dedicado: LLM no puede pisar scores) ✓
- Presupuesto LLM: ≤ +2 llamadas netas por evaluación en caso típico (judge cacheado) ✓
- Semáforos y caches existentes intactos ✓
- Sin cambios de contrato HTTP ni endpoints (`docs/api-standards.md` §2 intacto) ✓
- currify-back / currify-front intocados ✓

## 4. Evidencia de verificación

- **TDD:** test rojo inicial (17 fallos por feature ausente + eval con `fecha_inicio N/A`) → verde.
- **Unitarios:** `currify-core/tests/test_hotfix_parvularia.py` — **21 passed** (verificado por Tech Lead).
- **Eval:** `evals/test_cv_parvularia_15y.py` — **passed**: skills_match=80 (≥60), experience=100 (≥60), fechas 2018–2023 parseadas, 3 experiencias re-enrutadas, judge ≤6 llamadas.
- **Regresiones:** cero introducidas. Único fallo de batería (`test_cv_sin_titles_usa_education`) es pre-existente, confirmado contra baseline con `git stash`.

## 5. Fixture

`evals/cvs_fixture/cv_parvularia_15y.{txt,pdf}` + `cv_parvularia_15y_golden.json` — sintético/anonimizado, representa la CLASE de CVs no-tech chilenos (layout pipe/en-dash, bloques colados bajo "Otros Antecedentes", skills pedagógicas).

## 6. Documentación viva

Invariantes nuevas registradas en `.agents/skills/core/currify-llm-pipelines/SKILL.md` §9:
9.1 Repair determinista de fechas · 9.2 Re-enrute estructural · 9.3 Crédito parcial + judge acotado · 9.4 Match exacto antes de embeddings + clusters de dominio.

## 7. Validación en producción (2026-08-25)

Confirmado por el usuario tras redeploy del core: el CV real del caso reportado subió de **overall 36 → 60** con llamadas LLM reales (no mocks). Consistente con la corrección de medición predicha: skills y experiencia que antes aportaban ~0 ahora entran a la matriz. Sin reportes de efectos adversos en otros perfiles.

## 8. Deuda técnica observada (no bloqueante)

- Warnings Pydantic V2 (`parse_obj`/`.dict()` deprecados) en tests y `scoring_service.py:171` — migrar a `model_validate`/`model_dump` en futura pasada de limpieza.
- Test pre-existente fallando `test_cv_sin_titles_usa_education` — fuera del alcance de este hotfix, requiere triage propio.
