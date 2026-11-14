# Fase A — Logistics geográfico jerárquico (P1) + Trajectory por componentes (P2)

**Fecha:** 2026-08-26 · **Autor:** @core-expert · **SDD:** `docs/SDD Calidad de Scoring Fase 2 - Currify Core.md` §4.1, §4.2, §5, §6, §7, §8-Fase A
**Estado:** IMPLEMENTADA — TDD rojo→verde por punto, suite verde, diagnósticos re-ejecutados.
**Tests nuevos:** `currify-core/tests/test_logistics_geo.py` (20) · `currify-core/tests/test_trajectory_signal.py` (19).

---

## 1. Decisiones de diseño (ambigüedades resueltas — ninguna bloqueante)

### D1 — Ubicaciones multi-parte: matching por componentes, gana el mejor tier
El SDD no especifica cómo tratar `"Providencia, Santiago"` (dos lugares nombrados). Decisión:
cada parte se resuelve contra la jerarquía (comuna → provincia → región) y se compara contra
las partes/textos del CV; **gana el mejor tier encontrado entre todas las partes**.
Justificación: el requisito nombra literalmente la comuna Santiago; un candidato en
"Santiago, Chile" reside en una comuna nombrada por la campaña → comuna=100.
Es la lectura que hace alcanzable el objetivo S4 ≥85 del SDD §10 y es determinista y trazable.

### D2 — Homónimos comuna/provincia: resolución comuna-first
Chile tiene nombres que son comuna Y provincia a la vez (santiago, iquique, valparaíso,
concepción…). Al resolver una parte, se intenta comuna primero (tier más alto); si el CV
nombra otra comuna de esa provincia, cae a provincia=70. Cubre el caso "comuna homónima"
del SDD §7 sin ambigüedad.

### D3 — Campos de ubicación del candidato
Se consultan SOLO ubicaciones ya extraídas: `datos_contacto.{ubicacion, ciudad, comuna,
provincia, region}`. NO se busca en el texto crudo completo del CV (riesgo de falsos
positivos tipo "Disponibilidad para trabajar en regiones"); el SDD §4.1.3 ya prohíbe
re-extraer. `ubicacion` extraída por regex de contacto (p.ej. "Santiago, Chile") entra completa.

### D4 — Ramas de trajectory preservadas fuera del alcance del SDD
El SDD §4.2 reemplaza el hardcode 70 del branch "rol matcheado". Las ramas existentes
`roles_mismatch→30` y `datos insuficientes→50` NO están identificadas como problema en §2
y se PRESERVAN intactas (cambio mínimo; evita inflar trayectorias irrelevantes).
Test de regresión dedicado: `test_trajectory_roles_mismatch_penalizacion_preservada`.

### D5 — Progresión descendente/zigzag → insuficiente (60)
El SDD define ascendente/lateral/insuficiente. Secuencias no-monótonas o descendentes se
mapean a insuficiente=60 (lectura conservadora: señal no clara nunca premia).

### D6 — Fechas: parseo estricto, anti-invención
Solo se usan fechas YA reparadas por el hotfix (`YYYY`, `YYYY-MM`, "Presente/Actual").
Entradas sin fechas parseables quedan fuera de tenencia/promedio; si NINGUNA parsea →
fallback 70 preservado. Nunca se inventan años (coherente con §9.1 del SKILL).

### D7 — Cobertura de la tabla geo: 344/346 comunas
La tabla versionada `GEO_CHILE_VERSION="2026.08"` cubre 344 de las 346 comunas oficiales
(brecha documentada: 1 comuna en Cardenal Caro, 1 en Ñuble — partición interna de estas
provincias es la zona de menor certeza de fuentes públicas consolidadas). Impacto acotado:
el match comuna-exacto (100) no depende del padre; un error de provincia dentro de la misma
región degrada 70→50 como máximo. **Proceso de actualización:** añadir la comuna bajo su
provincia en `GEO_CHILE`, bump de `GEO_CHILE_VERSION`, correr `tests/test_logistics_geo.py`
(el test de integridad valida estructura y cobertura ≥340).

---

## 2. Evidencia rojo→verde

| Punto | RED | GREEN |
|---|---|---|
| P1 unidad (`resolve_geo_match`) | 20 failed (`ModuleNotFoundError: geo_chile`) | 20 passed |
| P1 integración matriz | incluidas arriba (kill binario activo) | logistics por escalera + traza |
| P2 componentes+matriz | 17 failed (`ImportError` símbolos ausentes) | 19 passed |

Correcciones durante GREEN (defectos de TEST, no de diseño): clave normalizada vs cruda en
test de datos geo; tenencias sub-anuales necesitaban precisión mensual; caso "lateral" original
contenía keyword de tier (`senior`) → era ascendente bajo el léxico del SDD.

## 3. Suite completa

```
tests/ + evals/test_cv_parvularia_15y.py  → 173 passed, 2 failed (PRE-EXISTENTES), 6 skipped
Obligatorias: test_hotfix_parvularia.py 21 ✓ · test_batchfix_f1_f2_f3.py 11 ✓ · eval parvularia ✓
```

Fallos pre-existentes (NO regresiones de Fase A):
- `test_pipeline.py::test_cv_sin_titles_usa_education` — documentado en SDD §2 (alcance P4c).
- `test_detail_extraction.py::test_detail_extraction` — aserción de EXTRACCIÓN
  (`len(responsabilidades)>=3`); el archivo solo importa `app.models.resume`, capa intocada
  por Fase A. Pre-existente en el working tree compartido.

## 4. Deltas medidos vs baseline (diagnósticos re-ejecutados post-cambio)

### diag_parvularia_ceiling (baseline capturado HOY antes del cambio)
| Escenario | Antes | Después | Δ |
|---|---|---|---|
| S1 baseline golden | 85.0 | **86.1** | +1.1 |
| S2 stress +2 mandatory | 81.57 | **82.67** | +1.1 |
| S3 cultural job-side | 92.5 | **93.6** | +1.1 |
| **S4 kill-clause logistics** | **75.0** | **86.1** | **+11.1 — objetivo ≥85 ✓** |
| S5 expansión | 85.0 | **86.1** | +1.1 |
| S3b cultural-full | 92.5 | **93.6** | +1.1 |

S4: logistics 0→100 (comuna compartida "Santiago") + trajectory 70→92 ⇒ +11.1.
Ningún escenario cae; todos suben exactamente el delta de trajectory (+1.1 = (92−70)·0.05).

### diag_campana_real
| Escenario | Antes | Después | Δ |
|---|---|---|---|
| R1 piso | 69.57 | **70.67** | +1.1 |
| R2 blandas sin puente | 70.82 | **71.92** | +1.1 |
| R3 inyección parser | 70.51 | **71.61** | +1.1 |
| **R4 réplica CAL (primario)** | **72.07** | **73.17** | **+1.1 — ≥72.07 sin retroceder ✓** |
| R5 F1-fix | 72.07 | **73.17** | +1.1 |
| R6 judge dominante | 72.54 | **73.64** | +1.1 |

Trajectory del fixture: **70 constante → 92** (years_c=100 · stability_c=100 [tenencia prom.
52m] · progression_c=60 [cargos sin keywords de tier]) — deja de ser constante ✓.

## 5. Confirmación de restricciones (SDD §6)

1. Pesos `ScoringRubric.WEIGHTS` INTOCABLES ✓ (no tocados).
2. Overall determinista Σ ponderada ✓ (`_parse_llm_response` intacto).
3. Judge→matriz, máx 6, evidencia literal, cache intactos ✓ (sin cambios).
4. CERO llamadas LLM nuevas ✓ (P1/P2 100% deterministas; verificado: judge_calls idénticos en diags).
5. Semáforos y caches intactos ✓.
6. Bandas 0.80/0.65 sin mover ✓.
7. Sin cambios endpoints/HTTP ✓ (trazas `_logistics_geo`/`_trajectory_components` son claves
   aditivas internas de la matriz; los consumidores iteran WEIGHTS y no llegan a la red).
8. Tests existentes NO editados ✓ (solo se corrigieron defectos de MIS tests nuevos durante
   su propio ciclo rojo→verde; los 2 fallos de suite son pre-existentes y están documentados).

## 6. Archivos

| Archivo | Cambio |
|---|---|
| `currify-core/app/services/geo_chile.py` | NUEVO — jerarquía versionada + `resolve_geo_match` |
| `currify-core/app/services/scoring_service.py` | import geo; constantes centralizadas P2; funciones puras timeline/years/stability/progression/trajectory_signal; sección logistics por escalera trazable; years por fechas reales+min_years; trajectory calculada con traza |
| `currify-core/tests/test_logistics_geo.py` | NUEVO — 20 tests |
| `currify-core/tests/test_trajectory_signal.py` | NUEVO — 19 tests |
| `docs/contracts/core/scoring_contract.md` | invariantes P1/P2 + fuentes de dimensiones |
| `.agents/skills/core/currify-llm-pipelines/SKILL.md` | §11 completa |
| `dev/diag_parvularia_results.json`, `dev/diag_campana_real_results.json` | artefactos re-generados |
