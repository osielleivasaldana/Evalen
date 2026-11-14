# Diagnóstico: Techo dimensional caso parvularia (overall 36→60)

**Fecha:** 2026-08-25 · **Autor:** @core-expert · **Tipo:** solo lectura (sin cambios en `app/**`)
**Script:** `currify-core/dev/diag_parvularia_ceiling.py` · **Resultados crudos:** `currify-core/dev/diag_parvularia_results.json`
**Método:** ruta REAL `RobustExtractionService` → `ScoringService._calculate_matrix_scores` sobre fixture `cv_parvularia_15y`, mocks LLM deterministas idénticos al eval oficial. Instrumentación por observación (wrappers), costo 0 tokens.

## Baseline (rúbrica golden representativa del rol): overall 85.0 strong_fit

| Dimensión | Score | Peso | Aporte | Perdidos* |
|---|---|---|---|---|
| skills_match | 80 | 30 | 24.00 | 6.00 |
| experience | 100 | 25 | 25.00 | 0.00 |
| education | 100 | 15 | 15.00 | 0.00 |
| cultural_fit | **50** | 15 | 7.50 | **7.50** |
| logistics | 100 | 10 | 10.00 | 0.00 |
| career_trajectory | **70** | 5 | 3.50 | **1.50** |

\* perdidos = (100−score)·peso/100.

## Hallazgos clave

1. **Skills (80/100):** 5/5 mandatory con crédito LITERAL (3 vía set expandido = lista de skills del propio CV; 2 vía substring de responsabilidades). **Judge: 0 llamadas** (presupuesto 6 intacto). Los 20 pts perdidos son ESTRUCTURALES: fórmula `mandatory*0.8 + nice_bonus*0.2` → mandatory perfecto techo 80; `inglés básico` (nice-to-have) genuinamente ausente (idiomas=[]) → techo de esta rúbrica = 82.
2. **Experience (100/100):** 3 bloques re-enrutados, fechas reparadas (2018–2023), roles normalizados vía cluster sin LLM (`educadora de párvulos`), current-role match exacto. Nada sin contar.
3. **Cultural_fit (50/100) — mayor fuga:** con `parsedJobData.habilidades_blandas=[]` la dimensión queda en neutral 50 PLANO. Además **ignora completamente `habilidades.habilidades_blandas` del CV** (solo mira resumen+responsabilidades literal + semántica vs set expandido).
4. **Career_trajectory (70/100):** hardcode 70 cuando el rol matchea; no analiza progresión real.
5. **Techo absoluto hoy sin tocar pesos/código = 93.1** (skills 82·0.30 + exp 25 + edu 15 + cultural 15 + log 10 + traj 70·0.05). Un match PERFECTO no puede pasar de ~93.

## Sensibilidades (escenarios, pesos intactos)

| Escenario | Overall | Δ | Lectura |
|---|---|---|---|
| S2 +2 mandatory ausentes en CV (drift rúbrica) | 78.14 | −6.86 | Judge las rechazó con evidencia null (anti-alucinación OK). Costo ≈ −3.4 pt/skill ausente |
| S3 solo job blandas pobladas | 85.0 | 0 | Palanca cultural REQUIERE además el puente semántico |
| S3b job blandas + puente semántico | **92.5** | **+7.5** | Cadena completa de la palanca cultural |
| S4 ubicación requerida no contenida | 75.0 | −10.0 | Kill-clause binario de logistics |
| S5 expansión semántica enriquecida | 85.0 | 0 | SEMANTIC_EXPANSION no mueve nada aquí (todo mandatory ya literal) |

## Fugas documentadas (no bloqueantes)

- **F1:** cultural_fit no consulta `habilidades_blandas` declaradas del CV.
- **F2:** trajectory hardcodeada (70/30/50), no usa fechas ni cargos.
- **F3:** sub-score `years` de experience cuenta ENTRADAS (≥2→100), ignora `rubric.min_years` y las fechas reales parseadas.
- **F4:** `normalize_job_titles` retorna orden sorted-unique → la correspondencia posicional con `experiencia_laboral` (usada para "current role" = índice 0) es frágil cuando hay títulos distintos. En este fixture no afectó (coincidió).
- **F5:** split 80/20 de skills + trajectory 70 ⇒ overall matemáticamente ≤93.1 incluso con match perfecto (calibrar expectativas del semáforo strong_fit≥80 contra este techo).

## Bandas 0.80/0.65

Sin evidencia de falsos negativos: 0 skills cayeron entre bandas, judge sin uso. **No mover.**

## Veredicto

Con rúbrica representativa, este CV mide **85**: el hotfix mide bien la clase. El 60 de producción implica ~25 pts de drag específico de producción (drift de rúbrica real, cultural-flat −7.5, posible kill de logistics −10, embeddings reales). Es una **mezcla**: parte techo correcto (inglés/requisitos que el CV no tiene) + parte error de medición residual identificado y cuantificado (cultural-flat es el mayor, 100% plumbing job-side/CV-side).
