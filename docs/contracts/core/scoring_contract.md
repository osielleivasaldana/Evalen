# Scoring Contract

`POST /scoring/evaluate` -> `ScoringResponse { overall_score: 0-100, recommendation: strong_fit|moderate_fit|weak_fit, breakdown: Dict[str, DimensionScore], strengths: List[str], gaps: List[str], summary: str }`

## Invariantes

- **Breakdown por-dimensión graceful**: cada dimensión (`skills_match`, `experience`, `education`, `cultural_fit`, `logistics`, `career_trajectory`) calcula score determinista independiente; si falta dato, dimensión = `0` sin contaminar otras (ej. `education=0` si `formacion_academica` vacía, `logistics=0` si `ubicacion` vacía)
- **Overall determinista**: `overall = Σ(score*weight/100)` desde `deterministic_scores`; pesos fijos `skills 30, experience 25, education 15, cultural 15, logistics 10, trajectory 5` (suman 100); thresholds `≥80 strong_fit, ≥60 moderate_fit, <60 weak_fit`
- **overall ≠ 0 si parcial**: nunca `0` si existe al menos `experiencia_laboral` o `habilidades` (tecnicas/blandas/idiomas) o `formacion_academica` o `contacto email válido`; solo `0.0` si `exp+skills+edu+contact` vacíos (guardrail)
- **LLM solo reasoning**: `SCORING_EVALUATION` (temp 0.0) redacta `reasoning` por dimensión y `strengths/gaps/summary`; NUNCA decide `scores` ni `overall`
- **Puente cultural_fit (batch-fix 2026-08-25)**: la dimensión consulta las blandas DECLARADAS del CV (`habilidades.habilidades_blandas`) en corpus literal y set puenteable; fuentes job-side = `parsedJobData.habilidades_blandas` + campo OPCIONAL `RubricSkills.soft_skills` (retrocompatible, default `[]`, sin cambios HTTP). Evidencia trazable: declaración literal o similitud ≥0.65 documentada
- **Filtro anti-soft**: en la inyección parser→rúbrica, una entrada clasificable como blanda (`skill_classification.is_soft_skill`, léxico estático sin LLM) NUNCA entra a `mandatory_skills`; se redirige a `skills.soft_skills`
- **Expansión lado-rúbrica**: antes de las bandas, cada mandatory skill se expande con sondas de dominio estáticas (`domain_expansion.expand_rubric_skill`, CNEP primero, NUNCA LLM); bandas 0.80/0.65 y judge (<0.65, evidencia literal, cache, máx 6) intactos
- **Status por dimensión**: `status = calculated|insufficient_data` (opcional en `api/scoring.py`) según disponibilidad de datos
- **Recovery**: scoring parcial con dimensiones disponibles; embedding/normalización cacheados (`_embedding_cache`, `parsedJobData`); fallback `0` por dimensión no excepción global
- **Indent fix**: `_calculate_matrix_scores` a nivel clase correctamente indentado; `deterministic_scores.get(dim, 0.0)` evita `None`

## Invariantes Fase A — Logistics geográfico + Trajectory por componentes (SDD Scoring Fase 2, 2026-08-25)

### P1 — Logistics geográfico jerárquico
- **Escalera determinista (cero LLM)**: comuna exacta normalizada=`100` · misma provincia=`70` · misma región=`50` · sin coincidencia=`0` · campaña SIN requisito de ubicación=`100` (dimensión no aplica) · campaña CON ubicación y CV sin ubicación detectable=`50` neutral + reason trazable. El kill binario por substring queda ELIMINADO; el `0` solo procede cuando hay requerimiento y el CV ubica en otra región.
- **Fuente**: `app/services/geo_chile.py` — jerarquía estática versionada (`GEO_CHILE_VERSION="2026.08"`), claves normalizadas (lowercase, sin tildes NFD, sin puntuación). Función pura `resolve_geo_match(campaign_location, cv_location_texts) -> GeoMatchResult {tier, matched_on, score}`.
- **Ubicaciones multi-parte**: `"Providencia, Santiago"` se resuelve parte a parte contra la jerarquía y gana el MEJOR tier; un componente compartido a nivel comuna con el CV (`"Santiago, Chile"`) acredita comuna=100. Nombres homónimos comuna/provincia (santiago, iquique, valparaíso…) se resuelven comuna-first. Decisión documentada en `docs/debug/2026-08-25-fase-a-logistics-trajectory.md`.
- **Campos consultados del candidato**: únicamente ubicaciones YA extraídas (`datos_contacto.ubicacion/ciudad/comuna/provincia/region`); no re-extrae nada.
- **Trazabilidad obligatoria**: la matriz registra siempre `_logistics_geo = {geo_version, tier, matched_on, score}` — prohibido un resultado sin explicación. Campos aditivos: los consumidores iteran `WEIGHTS`, así que no hay cambios HTTP.

### P2 — career_trajectory por componentes (señal real)
- **Fórmula exacta**: `trajectory = round(0.50·years_c + 0.30·stability_c + 0.20·progression_c)`. Constantes nombradas centralizadas en un único bloque de `scoring_service.py` (prohibidos números mágicos dispersos).
- **years_c**: `min(100, años_reales/min_years·100)` si `rubric.experience.min_years > 0` y hay fechas parseadas; si no aplica → fallback lógica actual por entradas (`≥2→100 · 1→60 · 0→0`).
- **stability_c**: tenencia promedio por empleo `≥24m→100 · 12–24m→70 · <12m→40`.
- **progression_c**: tiers léxicos ordenados cronológicamente (asistente/ayudante < profesional/titulado < coordinador/encargado/jefe): ascendente→`100` · lateral→`70` · insuficiente o descendente→`60`.
- **Fallback preservado**: `<1` entrada o fechas no parseables → `70`. Ramas existentes intactas: `roles_mismatch→30` · datos insuficientes→`50`.
- **Cierre de fuga colateral (F3)**: el sub-score `years` de experience usa la MISMA función de años (fechas reales reparadas + `rubric.min_years` cuando exista) — única fuente de verdad; se conserva el halving por roles_mismatch.
- **Trazabilidad**: la matriz registra `_trajectory_components = {years, stability, progression, years_total, min_years}` (o `{reason}` en fallback). Aditivo, sin cambios HTTP.

## Invariantes Fase B — Re-clasificación mandatory/nice-to-have (SDD Scoring Fase 2, 2026-08-26)

### P3 — Calidad de rúbrica (dos capas, cero llamadas LLM nuevas)
- **Capa 1 (prevención, prompt)**: el prompt de RUBRIC_EXTRACTION incluye few-shots de clasificación con criterios explícitos — Mandatory = condición EXCLUYENTE ("Requisito:", título obligatorio, certificación legal); Nice-to-Have = "deseable/se valora/valorable/ideal", capacidades complementarias y herramientas básicas — incluido el contraejemplo obligatorio "Manejo de herramientas tecnológicas básicas" → NICE-TO-HAVE. Mismo costo: una sola llamada RUBRIC_EXTRACTION.
- **Capa 2 (corrección determinista)**: `app/services/rubric_tier_classifier.py` — `classify_requirement_tier(texto) -> "mandatory"|"nice"|None`, léxico estático normalizado sin tildes/puntuación. Pistas nice: `deseable(s), deseablemente, valorable(s), valora, ideal(es), idealmente, se valora, se agradece, no excluyente` + co-ocurrencia `herram* × basic[oa]s?`. Pistas mandatory fuerte: `excluyente(s), imprescindible(s), obligatorio/a(s), indispensable(s)`. Precedencia: mandatory-fuerte > nice.
- **REGLA DE ORO**: JAMÁS promover a mandatory. Solo degradar a nice CON evidencia léxica explícita; retorno None ⇒ se respeta la salida del LLM.
- **Orden de post-procesado en `generate_rubric`**: anti-soft → tier-reclass (una blanda ya desviada a `soft_skills` NUNCA llega al clasificador como mandatory). Degradación mueve mandatory→`nice_to_have_skills` con dedup case-insensitive.
- **Feature flag**: env `RUBRIC_TIER_RECLASS` (default **OFF** = comportamiento actual byte-a-byte; activación en prod SOLO del Tech Lead tras harness verde). Flag OFF verificado: diagnósticos idénticos a baseline Fase A (R4=73.17, S4=86.1).
- **Observabilidad**: cada re-clasificación emite log estructurado `[TIER-RECLASS] {json}` + evento `{requisito_original, decision, pista_disparadora, destino}` (buffer acotado + mirror best-effort a analytics_storage, sin cambios HTTP).
- **Guardarraíl**: harness `dev/harness_rubric_tier.py` (re-ejecutable, artefacto JSON comparativo OFF/ON). Bloqueante: NINGÚN golden cae >2 pts overall. Medido flag ON: R4 campaña real 73.17→**74.60** (≥74 objetivo §10 ✓); único requisito re-clasificado: "herramientas tecnológicas básicas". Detalle y hallazgo delta vs estimación: `docs/debug/2026-08-26-fase-b-rubric-tier.md`.

## Hotfix 408 — Timeout Scoring (2026-08-26, currify-core)

Timeout 408 reportado por `currify-back/src/scoring/scoring.service.ts:355-361` (`axios timeout 120s` a `POST /scoring/evaluate`). Causa: bucle judge secuencial (`scoring_service.py:699` `for req_l in pending_judge: await _judge_single_skill()`) con `MAX_SKILL_JUDGE_CALLS=6` × `timeout_seconds` (hasta 30s) → muro 180s solo en judges + backoff 429 (`llm_service.py:278` max_retries=10 backoff 2→60s) + contención semáforo global LLM.

### Fix — solo `scoring_service.py` L695-715
- **Paralelización acotada máx 3 concurrentes**: separa cache-hits (0 LLM) de cache-misses; encola solo misses hasta presupuesto restante; ejecuta misses con `asyncio.Semaphore(3)` + `asyncio.gather`. `sorted(mandatory)` preserva prioridad alfabética determinista (primeras 6 si >6 pendientes).
- **Presupuesto intacto**: `MAX_SKILL_JUDGE_CALLS=6` check antes de encolar; cache `_skill_judge_cache` por `(skill_norm, hash(contexto))`; validación evidencia literal (`SkillJudgeResult` — sin evidencia → score 0); suma `total_credit` conmutativa y determinista; log `⚖️ Skill Judge` por resultado y `judge_used` trazable.
- **Observabilidad (sin cambio HTTP)**: log `⏱️ Skill Judge bloque wall-time: X.XXXs | pending=... hits=... misses=... skipped_budget=...` al cierre del bloque; no altera `docs/api-standards.md` §2 ni códigos HTTP.
- **Cero llamadas netas nuevas**: reduce wall-time; semáforos globales y caches intactos; bandas `0.80/0.65` y pesos intocables; `currify-back/front` intocados; tests existentes sin editar.

### Verificación
- **Rojo→verde** (`tests/test_hotfix_timeout_core.py` 5 tests): crédito y evidencias idénticos secuencial vs paralelo; presupuesto y cache respetados; `max_concurrent<=3` y `>1` para 6 tareas.
- **Suite verde**: `test_hotfix_parvularia` 21 · `test_batchfix_f1_f2_f3` 11 · `test_logistics_geo` 20 · `test_trajectory_signal` 19 · `test_rubric_tier_classifier` 22 · `evals/test_cv_parvularia_15y` 1.
- **Wall-time mockeado** (cada judge 0.1s, 6 tasks): **antes ~0.60-0.66s secuencial → después ~0.20-0.24s con 3-concurrent** (threshold <0.40s); `max_concurrent==3` verificado.

## Telemetría y facturación (Token Tracking) — obligatorio

Todo endpoint LLM (`/scoring/evaluate`, `/resume/extract`, `/scoring/parse-job`) intercepta metadata y expone `usage` para descuento de créditos. Contrato:

- **Headers** (actual): `X-LLM-Prompt-Tokens`, `X-LLM-Completion-Tokens`, `X-LLM-Model` agregados desde `token_usage_var` (acumulador por request).
- **Bloque JSON `usage` (requerido por monetización)**: cuando el backend lo reenvía al frontend, la respuesta debe incluir:
```json
{
  "overall_score": 72.5,
  "recommendation": "moderate_fit",
  "breakdown": { "...": {"score": 85, "weight": 30, "weighted_score": 25.5, "reasoning": "..."} },
  "strengths": ["..."], "gaps": ["..."], "summary": "...",
  "usage": {"prompt_tokens": 1234, "completion_tokens": 567, "total_tokens": 1801, "model": "gemini-2.5-flash"}
}
```
El `llm_service._save_usage` ya captura `prompt_tokens/completion_tokens/total_tokens/model` por proveedor (OpenAI/Anthropic/Google) y lo acumula en `token_usage_var`; el backend traduce `504 Gateway Timeout`→`503` según `docs/api-standards.md` §2 sin alterar códigos del core.

## Pesos y dimensiones

| Dimensión | Peso | Fuente |
|-----------|------|--------|
| skills_match | 30 | `habilidades_tecnicas` + `SemanticService.expand_skills` + `extract_skills_from_description`; rúbrica depurada por anti-soft + tier-reclass (P3, flag `RUBRIC_TIER_RECLASS`); **judge paralelizado 3-concurrent, 6 max, cache+evidencia literal** |
| experience | 25 | `experiencia_laboral[].responsabilidades` + `normalize_job_titles` + `calculate_similarity` |
| education | 15 | `formacion_academica` + `normalize_degrees` + `infer_degree_from_title` |
| cultural_fit | 15 | `habilidades_blandas` (job + declaradas del CV) + `RubricSkills.soft_skills` + `DynamicRubric` |
| logistics | 10 | `datos_contacto.ubicacion` + `geo_chile.resolve_geo_match` (jerarquía comuna→provincia→región versionada) |
| career_trajectory | 5 | `experiencia_laboral` fechas reales + tenencia + tiers léxicos (`trajectory_signal`, fallback 70) |

## Ejemplo

```json
{
  "overall_score": 72.5,
  "recommendation": "moderate_fit",
  "breakdown": {
    "skills_match": {"score": 85, "reasoning": "Selenium + Java match exacto", "status": "calculated"},
    "experience": {"score": 80, "reasoning": "3y QA Lead", "status": "calculated"},
    "education": {"score": 0, "reasoning": "sin formación registrada", "status": "insufficient_data"},
    "cultural_fit": {"score": 70, "reasoning": "Liderazgo evidenciado", "status": "calculated"},
    "logistics": {"score": 60, "reasoning": "Santiago match", "status": "calculated"},
    "career_trajectory": {"score": 65, "reasoning": "trayectoria ascendente", "status": "calculated"}
  },
  "strengths": ["Automatización Selenium"],
  "gaps": ["Falta Inglés Avanzado"],
  "summary": "Candidato QA sólido, fit moderado."
}
```
