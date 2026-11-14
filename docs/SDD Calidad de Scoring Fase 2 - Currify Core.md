# SDD: Calidad de Scoring Fase 2 — Logistics Geográfico, Trayectoria Real, Re-clasificación de Rúbrica e Higiene Técnica

**Versión:** 1.0.0
**Fecha:** 2026-08-25
**Autor:** Tech Lead — Evalen (diseño; implementación delegada a @core-expert)
**Estado:** Draft — Pendiente aprobación e implementación
**Evidencia base:** `docs/debug/diag-parvularia-techo-dimensional-2026-08-25.md`, `docs/debug/diag-parvularia-campana-real-2026-08-25.md`

---

## Tabla de Contenidos

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [Estado Actual y Evidencia](#2-estado-actual-y-evidencia)
3. [Alcance y No-Objetivos](#3-alcance-y-no-objetivos)
4. [Diseño Detallado](#4-diseño-detallado)
5. [Modelos de Datos](#5-modelos-de-datos)
6. [Invariantes Transversales](#6-invariantes-transversales)
7. [Estrategia de Pruebas](#7-estrategia-de-pruebas)
8. [Plan de Implementación por Fases](#8-plan-de-implementación-por-fases)
9. [Rollout y Feature Flags](#9-rollout-y-feature-flags)
10. [Métricas de Éxito](#10-métricas-de-éxito)
11. [Riesgos y Mitigaciones](#11-riesgos-y-mitigaciones)

---

## 1. Resumen Ejecutivo

Este documento especifica el diseño de los 4 pendientes agendados tras el hotfix parvularia (36→60) y el batch-fix de medición residual (67.39→72.07 en réplica de campaña real):

| # | Pendiente | Tipo | Ganancia esperada | Riesgo |
|---|---|---|---|---|
| P1 | Logistics geográfico jerárquico (comuna→provincia→región) | Corrección de medición | Elimina kill silencioso de −10 | Bajo |
| P2 | career_trajectory con señal real (+ cierre de fuga `min_years`) | Corrección de medición | +0 a +1.5, y honestidad dimensional | Bajo |
| P3 | Re-clasificación mandatory/nice-to-have | Calidad de rúbrica (producto) | +2 a +3.4 por falsos mandatory | Medio |
| P4 | Higiene técnica (tipado estático, Pydantic V2, test roto, tests ambientales) | Deuda técnica | Mantenibilidad, cero impacto en scores | Bajo |

**Principio rector:** corregir medición, nunca inflar puntajes. Todo lo anterior opera dentro del techo estructural actual (~93.1) sin tocar pesos, semáforos, caches ni contratos HTTP.

---

## 2. Estado Actual y Evidencia

Medido sobre fixture `cv_parvularia_15y` con ruta real de extracción+scoring (scripts re-ejecutables en `currify-core/dev/`):

| Dimensión | Score actual | Problema identificado |
|---|---|---|
| skills_match | 28.57–80 según rúbrica | Falsos mandatory (ej. "herramientas tecnológicas básicas") |
| experience / education | 100 | — |
| logistics | 100 o **kill binario −10** | Si la campaña exige comuna y el CV la nombra distinto a su ciudad, −10 silencioso |
| cultural_fit | 58.33–66.67 | Corregido en batch-fix; monitorear |
| career_trajectory | **70 hardcode** | No analiza progresión; sub-score `years` ignora `rubric.min_years` y fechas reales |

Deuda técnica inventariada: errores de tipado estático pre-existentes (`resume.py`, `robust_extraction_service.py`, `section_extractor.py`), warnings Pydantic V2 (`parse_obj`/`.dict()`), test pre-existente fallando (`test_cv_sin_titles_usa_education`), 4 tests ambientales que fallan sin API key.

---

## 3. Alcance y No-Objetivos

### En alcance
- Módulo `currify-core/**` exclusivamente (servicios, modelos, prompts, tests, scripts dev).
- Contrato interno `docs/contracts/core/scoring_contract.md` (documentación de invariantes).

### Fuera de alcance (No-Objetivos)
- ❌ Modificar pesos de `ScoringRubric.WEIGHTS`, bandas 0.80/0.65, presupuesto del judge (máx 6), semáforos o caches.
- ❌ Cambiar endpoints o códigos HTTP (`docs/api-standards.md` §2 intacto).
- ❌ Tocar `currify-back` / `currify-front`.
- ❌ Elevar el techo estructural de skills (split 80/20) — decisión de producto separada.

---

## 4. Diseño Detallado

### 4.1 P1 — Logistics geográfico jerárquico

**Problema:** hoy logistics es auto-100 salvo kill binario: si la campaña menciona una comuna y el texto del CV no la contiene literalmente → −10, aunque el candidato esté en la misma ciudad o región.

**Diseño:**

1. Nuevo módulo de datos estáticos `currify-core/app/services/geo_chile.py`:
   - Jerarquía Chile: `COMUNA → PROVINCIA → REGIÓN` como constante versionada (`GEO_CHILE_VERSION = "2026.08"`), claves normalizadas (lowercase, sin tildes, sin puntuación).
   - Función pura `resolve_geo_match(campaign_location: str, cv_location_texts: list[str]) -> GeoMatchResult` con resultado `{tier, matched_on, score}`.
2. Escalera de matching (determinista, cero LLM):

| Coincidencia | Score logistics |
|---|---|
| Comuna exacta (normalizada) | 100 |
| Misma provincia | 70 |
| Misma región | 50 |
| Sin coincidencia | 0 |
| Campaña SIN requisito de ubicación | 100 (dimensión no aplica — comportamiento actual) |
| Campaña CON ubicación y CV sin ubicación detectable | 50 neutral + reason trazable en la matriz (prohibido el silencio) |

3. La ubicación del candidato se busca sobre los campos de ubicación ya extraídos + texto crudo (reutiliza normalizaciones existentes; no re-extrae nada).
4. Trazabilidad: cada score logistics debe registrar en la matriz qué tier matcheó y contra qué texto.

**Archivos:** crear `app/services/geo_chile.py`; modificar sección logistics de `app/services/scoring_service.py`; test nuevo `tests/test_logistics_geo.py`.

---

### 4.2 P2 — career_trajectory con señal real

**Problema:** trajectory es 70 hardcode cuando el rol matchea; el sub-score `years` cuenta *entradas* (≥2→100) ignorando `rubric.min_years` y las fechas reales ya reparadas por el hotfix.

**Diseño — fórmula determinista (sin LLM):**

```
trajectory = round(0.50·years_c + 0.30·stability_c + 0.20·progression_c)
```

| Componente | Regla | Valores |
|---|---|---|
| `years_c` | Si `rubric.min_years > 0` y hay fechas parseadas: `min(100, años_reales/min_years·100)` | Si no aplica → fallback lógica actual por entradas |
| `stability_c` | Tenencia promedio por empleo | ≥24 meses → 100 · 12–24 → 70 · <12 → 40 |
| `progression_c` | Progresión léxica de niveles entre empleadores (tiers ordenados: asistente/ayudante < profesional/titulado < coordinador/encargado/jefe) usando clusters de dominio existentes | Progresión ascendente → 100 · lateral → 70 · insuficiente → 60 |

**Fallback:** <1 entrada o fechas no parseables → mantener 70 actual (comportamiento preservado).

**Cierre de fuga colateral:** el sub-score `years` de experience pasa a usar fechas reales + `min_years` cuando exista (misma función de años, única fuente de verdad).

**Constantes:** todas las constantes anteriores centralizadas y documentadas en un solo lugar del servicio; prohibido dispersar números mágicos.

**Archivos:** modificar `app/services/scoring_service.py` (secciones trajectory y years); test nuevo `tests/test_trajectory_signal.py`.

---

### 4.3 P3 — Re-clasificación mandatory/nice-to-have

**Problema:** RUBRIC_EXTRACTION clasificó "Manejo de herramientas tecnológicas básicas" como mandatory (costó 3.43 pts en campaña real). Es un problema de calidad de rúbrica que afecta TODAS las campañas.

**Diseño — dos capas, cero llamadas LLM netas nuevas:**

1. **Capa prompt (prevención):** few-shots de clasificación en el prompt de RUBRIC_EXTRACTION (`app/core/job_parsing_prompts.py` u equivalente) con criterios explícitos y contraejemplos:
   - Mandatory = condición excluyente ("Requisito:", título obligatorio, certificación legal).
   - Nice-to-have = "deseable", "se valora", "ideal", capacidades complementarias, herramientas básicas.
2. **Capa determinista (corrección):** nuevo módulo `app/services/rubric_tier_classifier.py` con `classify_requirement_tier(texto_requisito) -> "mandatory"|"nice"|None`:
   - Pistas nice: `deseable, valorable, valora, ideal, deseablemente, básic(o/a)s herramientas` (léxico extensible, normalizado sin tildes).
   - Pistas mandatory fuerte: `excluyente, imprescindible, obligatorio, indispensable`.
   - Retorno `None` → se respeta la asignación del LLM (jamás promover a mandatory por defecto; solo degradar a nice con evidencia léxica).
   - Aplicar como post-procesado en `dynamic_rubric_service.generate_rubric` después de la inyección anti-soft existente.
3. **Observabilidad:** cada re-clasificación se registra (log estructurado + evento a analytics) con requisito original, decisión y pista que la disparó — insumo para revisión de producto.
4. **Feature flag:** `RUBRIC_TIER_RECLASS` (env, default `off`). Ver §9.

**Guardarraíl (obligatorio):** harness de regresión de rúbricas — correr todos los fixtures + goldens JSON antes/después; criterio: ningún golden cae >2 pts de overall y el caso parvularia-campaña-real mejora ≥2 pts.

**Archivos:** crear `app/services/rubric_tier_classifier.py`; modificar prompt de rúbrica y `dynamic_rubric_service.py`; test nuevo `tests/test_rubric_tier_classifier.py` + script harness en `dev/`.

---

### 4.4 P4 — Higiene técnica

| Sub-punto | Diseño | Criterio de aceptación |
|---|---|---|
| **4a Tipado estático** | Corregir inventario LSP conocido SOLO en `app/**` primero: narrowing de `fecha_inicio/fecha_fin` opcionales en `resume.py` (L691–697), firmas con `= None` implícito en `robust_extraction_service.py` (L1751, L1842), `Match.group` en L899/L1966, narrowing del `gather` en `section_extractor.py` L674. **Regla dura:** cero cambios de comportamiento; los tests existentes deben pasar SIN editarse. Si algún error de tipo revela un bug real → ESCALAR al Tech Lead antes de tocar semántica | Chequeador estático limpio en módulos tocados; suite verde intacta |
| **4b Pydantic V2** | Sweep mecánico: `parse_obj(` → `model_validate(`, `.dict()` → `.model_dump()` en `currify-core` (inventario por grep; incluye `scoring_service.py:171` y tests) | Cero warnings `PydanticDeprecatedSince20` en la suite |
| **4c Test roto** | Triage con debugging sistemático de `test_cv_sin_titles_usa_education`: reproducir → causa raíz documentada en `docs/debug/2026-MM-DD-triage-sin-titles.md` → fix mínimo O eliminación justificada (si el comportamiento que testa ya no existe por diseño) | Test verde o eliminado con acta; nunca skip silencioso |
| **4d Tests ambientales** | Los 4 tests de `test_retry_validation_fix` que exigen API key real → marcador condicional de omisión cuando no haya key (patrón skipif), dejando el motivo en el nombre/mensaje | Suite completa reporta 0 failed fuera de ambiente con key |

---

## 5. Modelos de Datos

Cambios **aditivos y retrocompatibles** únicamente:

| Modelo | Cambio | Retrocompatibilidad |
|---|---|---|
| `GeoMatchResult` (nuevo, en `geo_chile.py`) | `{tier: str, matched_on: str|null, score: int}` | Nuevo, sin impacto |
| Constantes de trajectory (en `scoring_service.py`) | Pesos 0.50/0.30/0.20 y umbrales de tenencia/niveles como constantes nombradas | Sin impacto |
| Salida de matriz | Campos nuevos informativos: `logistics.geo_tier`, `trajectory.componentes` | Additivo; consumidores actuales ignoran campos extra |
| Env var `RUBRIC_TIER_RECLASS` | Configuración, no contrato | Default off |

Sin cambios en endpoints, DTOs de red ni esquemas de DB.

---

## 6. Invariantes Transversales (no negociables)

1. Pesos de scoring INTOCABLES (`ScoringRubric.WEIGHTS`).
2. Overall = Σ ponderada determinista; el LLM jamás pisa scores.
3. Judge: alimenta matriz, nunca score; máx 6 llamadas; evidencia literal; cache intacto.
4. Presupuesto: ≤ +2 llamadas LLM netas típicas — P1, P2 y P3 son deterministas/lexicales: **cero llamadas nuevas**.
5. Semáforos y caches existentes intactos.
6. Bandas 0.80/0.65 sin mover.
7. Sin cambios de endpoints/códigos HTTP (`api-standards.md` §2).
8. Metodología: TDD (rojo→verde por unidad) + debugging sistemático; sin fixes improvisados.

---

## 7. Estrategia de Pruebas

| Punto | Tests nuevos (mockeados, deterministas) | Casos críticos |
|---|---|---|
| P1 | `tests/test_logistics_geo.py` — tabla-driven ≥12 casos | Comuna exacta · misma provincia · misma región · sin match · CV sin ubicación · campaña sin ubicación · tildes/mayúsculas · comuna homónima |
| P2 | `tests/test_trajectory_signal.py` — ≥10 casos | min_years cumplido/no · tenencias mixtas · progresión ascendente/lateral · fallback 70 · fechas N/A reparadas · un solo empleo |
| P3 | `tests/test_rubric_tier_classifier.py` — ≥12 casos + harness `dev/` | "herramientas tecnológicas básicas"→nice · "excluyente"→mandatory · ambiguo→None · flag off = comportamiento actual |
| P4 | Suite existente debe pasar SIN ediciones (excepto 4c/4d justificados) | Cero warnings deprecación · checker estático limpio en módulos tocados |
| Integración | Re-ejecutar `dev/diag_parvularia_ceiling.py` y `dev/diag_campana_real.py` | Ver §10 deltas objetivo |

---

## 8. Plan de Implementación por Fases

Cada fase termina en commit(s) atómicos y suite verde. Orden recomendado: **A → B → C** (C paralelizable tras A).

### Fase A — Fidelidad de medición (P1 + P2) · Estimación: M
1. Test rojo logistics (tabla-driven) → implementar `geo_chile.py` + integración en scoring → verde → commit.
2. Test rojo trajectory (componentes + fallback) → implementar fórmula + constantes → verde → commit.
3. Cierre de fuga `years`/`min_years` con test dedicado → commit.
4. Re-ejecutar diagnósticos → reportar deltas → commit de artefactos.

### Fase B — Calidad de rúbrica (P3) · Estimación: M
1. Test rojo clasificador → implementar `rubric_tier_classifier.py` → verde → commit.
2. Few-shots de clasificación en prompt de rúbrica (con eval de humo mockeado) → commit.
3. Post-procesado en `generate_rubric` tras anti-soft + observabilidad → commit.
4. Harness de goldens (baseline vs post) → adjuntar resultados al PR → commit.
5. Activación detrás de flag (default off) → commit.

### Fase C — Higiene técnica (P4) · Estimación: S/M
1. 4b sweep Pydantic V2 (mecánico, bajo riesgo) → commit.
2. 4d marcadores ambientales → commit.
3. 4a tipado estático módulo por módulo (resume → robust_extraction → section_extractor) → commit por módulo.
4. 4c triage documentado + resolución → commit.

---

## 9. Rollout y Feature Flags

| Paso | Acción |
|---|---|
| 1 | Fases A y C salgan siempre activas (son corrección de medición/higiene pura) |
| 2 | Fase B sale con `RUBRIC_TIER_RECLASS=off`; se activa en staging → validación con harness → activación en prod por el Tech Lead |
| 3 | Tras cada deploy del core: re-ejecutar ambos diagnósticos en CI/dev y comparar contra baseline de este documento |
| 4 | Monitoreo post-deploy: distribución de scores logistics (detección de kills residuales) y eventos de re-clasificación en analytics |

---

## 10. Métricas de Éxito

| Métrica | Baseline (2026-08-25) | Objetivo |
|---|---|---|
| Escenario kill-clause S4 (`diag_parvularia_ceiling`) | 75.0 | ≥85 (match provincial/regional deja de matar) |
| Trajectory en fixture con progresión real | 70 constante | Calculada por componentes; delta overall +0 a +1.5 |
| Campaña real R4 (`diag_campana_real`) | 72.07 | ≥74 con P3 activado |
| Clasificación "herramientas tecnológicas básicas" | mandatory (error) | nice en harness de rúbricas |
| Warnings Pydantic en suite | ~48 | 0 |
| Errores estático en módulos tocados | inventario LSP conocido | 0 |
| Fallos de suite no ambientales | 1 (sin-titles) + 4 (API key) | 0 (ambientales quedan skipif) |
| Regresión en goldens | — | Ningún golden cae >2 pts |

---

## 11. Riesgos y Mitigaciones

| Riesgo | Prob. | Impacto | Mitigación |
|---|---|---|---|
| Tabla geo desactualizada/incompleta (346 comunas) | Media | Medio | Datos versionados + test de cobertura mínima + proceso de actualización documentado |
| Sobre-degradación a nice-to-have | Media | Alto | Solo degradar con pista léxica explícita; jamás promover; flag default off; harness de goldens bloqueante |
| Tipado revela bug real de comportamiento | Baja | Medio | Protocolo de escalado al Tech Lead; prohibido cambiar semántica en el mismo commit |
| Trajectory penaliza carreras no lineales legítimas | Media | Medio | Fallback conservador 70; constantes centralizadas ajustables con evidencia; observabilidad de componentes |
| Flag activado sin harness verde | Baja | Alto | Checklist de deploy: harness bloqueante antes de flip |

---

*Aprobación de este documento habilita la delegación por fases a @core-expert bajo el protocolo estándar (TDD, ping-pong de errores vía `docs/debug/`, registro en `docs/ready-implementations/`).*
