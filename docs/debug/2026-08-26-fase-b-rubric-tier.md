# Fase B — Re-clasificación mandatory/nice-to-have (P3) + few-shots de rúbrica

**Fecha:** 2026-08-26 · **Autor:** @core-expert · **SDD:** `docs/SDD Calidad de Scoring Fase 2 - Currify Core.md` §4.3, §5, §6, §7, §8-Fase B, §9
**Estado:** IMPLEMENTADA — TDD rojo→verde por capa, suite verde sin regresiones, diagnósticos flag OFF idénticos a baseline Fase A.
**Tests nuevos:** `currify-core/tests/test_rubric_tier_classifier.py` (22 casos).
**Harness:** `currify-core/dev/harness_rubric_tier.py` → artefacto `dev/harness_tier_reclass_results.json`.

---

## 1. Decisiones de diseño (ambigüedades resueltas — ninguna bloqueante)

### D1 — Precedencia mandatory-fuerte > nice cuando coexisten pistas
El SDD no define qué pasa si un requisito contiene pista nice Y cláusula excluyente
(ej. "Manejo de herramientas básicas (excluyente)"). Decisión: gana **mandatory-fuerte**.
Justificación: la regla de oro prohíbe *promover*; mantener en mandatory un requisito que
el empleador marcó explícitamente como excluyente no es promoción sino confirmación.
Degradarlo ignoraría evidencia literal del lado oferta. Test:
`test_precedencia_mandatory_fuerte_sobre_nice`.

### D2 — Pista "básic(o/a)s herramientas": co-ocurrencia, no bigrama literal
El bigrama normalizado "basicas herramientas" NO aparece en el contraejemplo obligatorio
"herramientas tecnológicas **básicas**" (orden invertido). Decisión: la pista se implementa
como **co-ocurrencia** de un token con raíz `herram*` y una variante `basic[oa]s?` en el
texto normalizado. Es la lectura mínima que hace pasar el contraejemplo del SDD sin
sobre-degradar (un "básico" suelto sin herramientas NO clasifica). Tests:
`test_contraejemplo_sdd_herramientas_tecnologicas_basicas_es_nice`,
`test_herramientas_basicas_orden_inverso_es_nice`.

### D3 — Alcance del post-procesado
Opera sobre `rubric.skills.mandatory_skills` FINAL (post anti-soft), moviendo a
`nice_to_have_skills` con dedup case-insensitive y preservando el texto original.
Nunca toca `soft_skills` ni entradas ya-nice (jamás promueve). Clasificación
"mandatory" o None ⇒ el requisito permanece intacto.

### D4 — Observabilidad sin cambios HTTP
Cada re-clasificación emite: (a) log estructurado `[TIER-RECLASS] {json}` desde
DynamicRubricService; (b) evento `{requisito_original, decision, pista_disparadora,
destino}` en buffer acotado (500) del módulo clasificador (`get_recent_reclass_events`);
(c) mirror best-effort a `analytics_storage["rubric_tier_reclass"]` (lazy import,
try/except — nunca rompe scoring; expuesto por la infraestructura /analytics existente
sin tocar endpoints).

### D5 — Flag leído en runtime
`settings.rubric_tier_reclass: bool = False` (env `RUBRIC_TIER_RECLASS`, pydantic-settings
case-insensitive), leído con `getattr(settings, ...)` en cada llamada — permite activación
por entorno y override en tests/harness sin reiniciar proceso. Default OFF = comportamiento
actual byte-a-byte (demostrado §3).

---

## 2. Evidencia rojo→verde

| Capa | RED | GREEN |
|---|---|---|
| Clasificador puro (`classify_requirement_tier`) | 15 failed (`ModuleNotFoundError: rubric_tier_classifier`) | 15 passed |
| Post-procesado + flag + anti-soft + observabilidad | 6 errors (fixture flag ausente) + fallos de aserción | passed |
| Few-shots prompt (smoke captura prompt) | failed (criterios ausentes) | passed |

Correcciones durante GREEN (defectos de TEST, no de diseño): (1) el test de observabilidad
asertaba clave `pista` en vez de la canónica `pista_disparadora`; (2) parseo del log
estructurado dejaba el prefijo `] ` antes del JSON (`split("[TIER-RECLASS]")` correcto).

Suite final nueva: **22 passed** (SDD §7 exige ≥12).

## 3. Flag OFF ≡ baseline Fase A (demostración)

Diagnósticos re-ejecutados SIN tocar entorno (flag default OFF):

| Diagnóstico | Baseline Fase A | Flag OFF post-Fase B | Δ |
|---|---|---|---|
| diag_campana_real R1 | 70.67 | 70.67 | 0 |
| diag_campana_real R2 | 71.92 | 71.92 | 0 |
| diag_campana_real R3 | 71.61 | 71.61 | 0 |
| **diag_campana_real R4 (primario)** | **73.17** | **73.17** | **0 ✓** |
| diag_campana_real R5 | 73.17 | 73.17 | 0 |
| diag_campana_real R6 | 73.64 | 73.64 | 0 |
| diag_parvularia_ceiling S1 | 86.1 | 86.1 | 0 |
| diag_parvularia_ceiling S2 | 82.67 | 82.67 | 0 |
| diag_parvularia_ceiling S3/S3b | 93.6 | 93.6 | 0 |
| **diag_parvularia_ceiling S4** | **86.1** | **86.1** | **0 ✓** |
| diag_parvularia_ceiling S5 | 86.1 | 86.1 | 0 |

## 4. Harness guardarraíl (flag ON) — resultados vs criterios

| Escenario | flag OFF | flag ON | Δ | Requisitos re-clasificados |
|---|---|---|---|---|
| parvularia_golden_job | 86.1 | 86.1 | 0.0 | — |
| **parvularia_campana_real_R4 [PRIMARIO]** | **73.17** | **74.60** | **+1.43** | `herramientas tecnológicas básicas` |
| qa_lead_golden_job | 87.3 | 87.3 | 0.0 | — |

| Criterio | Resultado |
|---|---|
| BLOQUEANTE: ningún golden cae >2 pts overall | ✓ CUMPLE (ningún escenario cae) |
| ÉXITO SDD §10: R4 ≥ 74 con P3 activado | ✓ CUMPLE (**74.60**) |
| Estimación SDD §4.3: R4 mejora ≥ +2 pts | ✗ NO ALCANZADO (+1.43) — ver hallazgo F1 |

### Hallazgo F1 — Delta medido (+1.43) vs estimación SDD (+2 a +3.4)
La estimación del SDD §1/§4.3 asumía un costo residual mayor de falsos mandatory. Medición
exacta: la rúbrica de ESTA campaña contiene exactamente UN falso mandatory
("herramientas tecnológicas básicas") cuyo crédito real era 0 (JUDGE 0.0). Degradarlo mueve
el denominador de cobertura 7→6: skills_match 28.57→33.33 (+4.76) ⇒ overall
+4.76 × peso 0.30 = **+1.43**. El objetivo OPERATIVO del SDD §10 ("R4 ≥74") SÍ se cumple
(74.60). No hay más falsos mandatory con pista léxica en esta campaña sin inflar puntajes
(prohibido §6). **Se reporta al Tech Lead:** si se requiere cerrar la brecha hacia +2,
la palanca es ampliar el léxico nice (ej. "capacidad para", formulaciones complementarias)
con evidencia de producto — decisión de producto, no de implementación.

## 5. Confirmación de restricciones (SDD §6)

1. Pesos `ScoringRubric.WEIGHTS` INTOCABLES ✓ (no tocados).
2. Overall determinista Σ ponderada ✓ (matriz y `_parse_llm_response` intactos).
3. Judge→matriz, máx 6, evidencia literal, cache INTACTOS ✓ (judge_calls idénticos OFF/ON en harness).
4. CERO llamadas LLM nuevas ✓ (few-shots van EN el prompt existente de RUBRIC_EXTRACTION;
   clasificador 100% léxico; verificado: judge_calls=4 en R4 ambos modos).
5. Semáforos y caches intactos ✓.
6. Bandas 0.80/0.65 sin mover ✓.
7. Sin cambios endpoints/HTTP ✓ (evento analytics es best-effort sobre storage existente;
   ninguna firma de endpoint ni DTO modificados).
8. TDD rojo→verde por unidad ✓ (§2); tests existentes NO editados ✓ (los 2 defectos
   corregidos son de MIS tests nuevos dentro de su propio ciclo).

## 6. Archivos

| Archivo | Cambio |
|---|---|
| `currify-core/app/services/rubric_tier_classifier.py` | NUEVO — léxico estático + `classify_requirement_tier` + eventos observabilidad |
| `currify-core/app/core/config.py` | flag `rubric_tier_reclass: bool = False` (env `RUBRIC_TIER_RECLASS`) |
| `currify-core/app/services/dynamic_rubric_service.py` | few-shots clasificación en prompt RUBRIC_EXTRACTION (Capa 1) + post-procesado tier-reclass tras anti-soft gated por flag (Capa 2) |
| `currify-core/tests/test_rubric_tier_classifier.py` | NUEVO — 22 tests |
| `currify-core/dev/harness_rubric_tier.py` | NUEVO — harness guardarraíl re-ejecutable |
| `currify-core/dev/harness_tier_reclass_results.json` | NUEVO — artefacto comparativo OFF/ON |
| `docs/contracts/core/scoring_contract.md` | invariante P3 + flag |
| `.agents/skills/core/currify-llm-pipelines/SKILL.md` | §12 completa |
