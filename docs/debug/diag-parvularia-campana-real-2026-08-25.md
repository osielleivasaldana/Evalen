# Diagnóstico 2: Réplica campaña REAL "Educadora de Párvulos" × fixture cv_parvularia_15y

**Fecha:** 2026-08-25 · **Autor:** @core-expert · **Tipo:** solo lectura (sin cambios en `app/**`)
**Script:** `currify-core/dev/diag_campana_real.py` · **Resultados:** `currify-core/dev/diag_campana_real_results.json` · **Rúbrica:** `currify-core/dev/diag_campana_real_rubrica.json`
**Precedencia:** `docs/debug/diag-parvularia-techo-dimensional-2026-08-25.md` (baseline golden = 85.0, techo estructural 93.1, fugas F1–F5).

## Método y declaración de mocks

- **Candidato:** fixture `evals/cvs_fixture/cv_parvularia_15y.txt` vía ruta REAL `RobustExtractionService.extract_from_text` → `ScoringService.evaluate_candidate` (matriz determinista `_calculate_matrix_scores` ejecutada, no mockeada). Mocks de extracción idénticos al diag 1. Costo: **0 tokens**.
- **RUBRIC_EXTRACTION sobre el texto real de la campaña:** **NO hay API key en el entorno** → se usó **MOCK DETERMINISTA DECLARADO** (`MOCK_RUBRIC` en el script). Lo que SÍ corrió real: `DynamicRubricService.generate_rubric` completo (validación Pydantic + post-procesamiento de inyección), mockeando solo `llm.call_agent_structured`.
- **Similitud semántica:** dos regímenes declarados — `zero` (embeddings nulos = piso pesimista) y `cal` (proxy determinista: jaccard de conceptos + regla head-noun 0.75; aproximación de embeddings reales, sin parámetros ocultos).
- **Skill Judge mock:** política conservadora declarada — solo acredita con evidencia LITERAL del contexto (`comunicación oral y escrita` → 0.5 con cita literal; resto 0.0). Anti-alucinación del pipeline valida la cita.
- Los scores son 100% deterministas (el LLM de `SCORING_EVALUATION` solo redacta reasoning), por lo que el overall replicado depende únicamente de: rúbrica × extracción × puente semántico × judge.

---

## 1) Rúbrica extraída de la campaña real (mock determinista + post-procesamiento real)

| Requisito del texto | Bucket rúbrica | Observación |
|---|---|---|
| Título Educadora de Párvulos reconocido Mineduc (req 1) | `education.required_degrees=["Educadora de Párvulos"]`, nivel Universitario, kill_clause=True | Correcto |
| Experiencia comprobable en CNEP (req 2) | skill mandatory `currículum nacional de educación parvularia`; `experience.min_years=0` | Sin número en el texto → no inferible (F3: los años ni siquiera pueden expresarse) |
| Adaptaciones educativas + estrategias diferenciadas (req 3) | mandatory ×2 | Correcto como técnicas |
| Liderazgo y coordinación de equipos (req 4) | mandatory `liderazgo de equipos` | Correcto |
| Comunicación oral y escrita + relaciones con familias (req 5) | mandatory `comunicación oral y escrita`; la parte relacional cae a blandas job-side | Correcto |
| Proactividad, creatividad, resolución de desafíos (req 6) | **NO en mandatory** (regla anti-soft del prompt) → `parsedJobData.habilidades_blandas` | Depende 100% del parser del backend; la rúbrica estructurada **no tiene campo para blandas** |
| Compromiso respeto/inclusión/desarrollo integral (req 7) | blandas job-side (`inclusión`) | Ídem |
| Herramientas tecnológicas básicas (req 8) | ⚠️ **mandatory** | **Error de clasificación de la rúbrica misma**: ítem "básico" de gestión, no define-idoneidad; debería ser nice_to_have. Costo para un CV sin tech: 3.43 pts overall (si fuese nice: +0.86) |
| Planificar/implementar/evaluar experiencias (intro) | mandatory `planificación educativa` | Correcto |
| Contrato Indefinido / Presencial / sin ciudad | `logistics.location=None`, modality Presencial | **Sin kill-clause geográfico → logistics auto-100** |
| nice_to_have | **[]** | La campaña no declara deseables ⇒ sin colchón de bonus: techo skills = cobertura_mandatory×80 exacto |

**Hallazgo estructural nuevo:** `StructuredRubric` no posee campo de habilidades blandas — las blandas de la oferta viven exclusivamente en `parsedJobData.habilidades_blandas`. La calidad del cultural_fit queda acoplada al parser del backend, fuera del contrato de la rúbrica.

---

## 2) Tabla dimensional — escenario primario R4 (rúbrica campaña + blandas pobladas + puente CAL)

**Overall 67.39 · moderate_fit** (baseline golden diag 1: 85.0 strong_fit)

| Dimensión | Score crudo/máx* | Peso | Aporte | Perdidos | Causa dominante |
|---|---|---|---|---|---|
| skills_match | 17.14 / 80 | 30 | 5.14 | **24.86** | 5/7 mandatory sin crédito (ver mapa §3) |
| experience | 100 / 100 | 25 | 25.00 | 0.00 | Rol normalizado match exacto + 3 entradas |
| education | 100 / 100 | 15 | 15.00 | 0.00 | Campo exacto (nivel 0⇒req_level 0 ⇒ 100) |
| cultural_fit | 58.33 / ~83† | 15 | 8.75 | **6.25** | 4/6 blandas honestamente ausentes + fuga F1 |
| logistics | 100 / 100 | 10 | 10.00 | 0.00 | Campaña sin ciudad → auto-100 |
| career_trajectory | 70 / 70‡ | 5 | 3.50 | 1.50 | Hardcode 70 con rol matcheado (F2) |

\* máx efectivo de esta rúbrica: skills 80 (split 80/20, nice vacío); † techo cultural con las 6 blandas = 50+50=100 teórico, realista ~83 si el CV declarara todo; ‡ techo real por hardcode.

**Desglose de los 32.61 perdidos por causa:** TECHO_HONESTO **20.22** · DRIFT_VOCABULARIO corregible **5.14** · ERROR_MEDICION (F1) **1.25** · ESTRUCTURAL split 80/20 **6.00** (presente incluso con match perfecto).

### Sensibilidad (pesos intactos)

| Escenario | Overall | Δ vs R4 | Lectura |
|---|---|---|---|
| R1 piso (blandas vacías + sims 0) [hipótesis producción-flat] | 66.14 | −1.25 | Judge base rescata comunicación 0.5 |
| R2 blandas SIN puente | 66.14 | −1.25 | **≡ R1**: poblar blandas del job sin embeddings = 0 efecto |
| R3 inyección parser→mandatory (11 items) | 64.27 | −3.12 | Blandas inyectadas como técnicas + **judge budget starvation** |
| **R4 réplica CAL (primario)** | **67.39** | — | Banda SIM captura comunicación (0.75→0.5) |
| R5 F1-FIX (blandas del CV en el puente) | 68.64 | **+1.25** | Cuantificación exacta de la fuga F1 |
| R6 sin embeddings + judge generoso (1.0) | 67.86 | +0.47 | El judge NO rescata cultural_fit (no tiene judge) |

---

## 3) Mapa de acreditación requisito-por-requisito (R4)

Valor de cada crédito: 1.0 mandatory = 3.43 overall · 0.5 = 1.71 · 1 blanda cultural = 1.25.

| # | Requisito campaña | Bucket | Banda obtenida | Evidencia / razón de fallo | Pérdida | Clasificación |
|---|---|---|---|---|---|---|
| 1 | Título Educadora de Párvulos (Mineduc) | education | **100 ✓** | Campo exacto `educadora de párvulos` | 0 | — |
| 2 | Manejo Currículum Nacional Párvulos | mandatory | JUDGE(0.0) | CV nunca lo nombra… **pero usa lenguaje CNEP nativo**: "planificación educativa por ámbitos de aprendizaje" | 3.43 | **DRIFT_VOCABULARIO conceptual** (requiere expansión/juez con conocimiento de dominio) |
| 3a | Adaptaciones educativas | mandatory | JUDGE(0.0) | CV no menciona adaptaciones/diversidad/NEE | 3.43 | TECHO_HONESTO |
| 3b | Estrategias pedagógicas diferenciadas | mandatory | JUDGE(0.0) | "Metodologías lúdicas" es evidencia adyacente débil | 3.43 | TECHO_HONESTO (frontera 0.5 discutible) |
| 4 | Liderazgo/coordinación de equipos | mandatory | JUDGE(0.0) | CV no acredita jefatura de técnicos/asistentes | 3.43 | TECHO_HONESTO |
| 5 | Comunicación oral y escrita | mandatory | **SIM 0.75 → banda 0.5** | Puente vs "comunicación con apoderados"; evidencia literal "Reuniones periódicas con apoderados…" | 1.71 | DRIFT_VOCABULARIO **resuelto** por banda (piso: judge 0.5; techo: 1.0) |
| 6 | Proactividad/creatividad/resolución | blandas job | 3 fallos | Ausentes en CV | 3.75 | TECHO_HONESTO (creatividad: "metodologías lúdicas" adyacente, sin judge en cultural) |
| 7 | Respeto/inclusión/desarrollo integral | blandas job | fallo (`inclusión`) | No declarado | 1.25 | TECHO_HONESTO |
| 8 | Herramientas tecnológicas básicas | mandatory ⚠️ | JUDGE(0.0) | CV sin mención tech | 3.43 | TECHO_HONESTO del CV **+ ERROR_CLASIFICACIÓN_RÚBRICA** (debería ser nice_to_have) |
| 9 | Planificar experiencias educativas | mandatory | **LITERAL 1.0 ✓** | "planificación educativa por ámbitos" ⊂ responsabilidades | 0 | — |
| — | Relaciones efectivas con familias (parte req 5) | blanda `trabajo en equipo` | **FALLO** pese a que el CV declara **literalmente** "Trabajo colaborativo con familias" | El corpus/puente de cultural_fit ignora `habilidades.habilidades_blandas` del CV | 1.25 | **ERROR_MEDICION (F1)** |
| — | Experiencia comprobable (años) | experience.min_years | 100 ✓ (accidental) | min_years=0; sub-score years cuenta ENTRADAS (≥2→100), no los 15 años reales | 0 | OK aquí, F3 latente |

**Sin falsos negativos de bandas:** 0 skills cayeron entre 0.65–0.80 sin crédito o >0.80 sin crédito pleno; judge sin evidencia inventada (anti-alucinación OK). Bandas 0.80/0.65: **no mover**.

---

## 4) Cultural_fit con esta campaña real — cuantificación exacta de la fuga F1

La dimensión construye corpus = `resumen+responsabilidades` y puente semántico = `expanded_skills` (técnicas+latentes). **Nunca consulta `habilidades.habilidades_blandas` del CV** (`["Trabajo colaborativo con familias", "Empatía", "Comunicación efectiva"]`).

| Blanda job | R4 (código actual) | R5 (contrafactual F1-fix) |
|---|---|---|
| comunicación efectiva | ✓ puente vs técnica "comunicación con apoderados" (0.75) | ✓ (ahora también literal vs declarada, sim 1.0) |
| trabajo en equipo | ✗ mejor puente 0.0 — **el CV la declara literal y es invisible** | ✓ vs "Trabajo colaborativo con familias" (0.75) |
| liderazgo / proactividad / creatividad / inclusión | ✗ ×4 | ✗ ×4 (honestas) |
| **Score cultural** | **58.33** | **66.67** |

**Fuga F1 exacta con ESTA rúbrica: Δ8.34 en cultural_fit = Δ+1.25 overall** (verificado ejecutando ambos caminos por la ruta real; R5 inyecta las blandas declaradas al set puenteable vía `LATENT_SKILL_EXTRACTION`, sin tocar código).

Matiz importante: aquí F1 es *pequeña porque 4/6 blandas de la campaña son genuinamente ausentes en el CV*. En campañas people-facing donde las blandas sí existen en el CV, el mismo bug escala hasta +7.5 (caso S3b del diag 1). Además, **cultural_fit no tiene judge**: su cadena de fallback es literal→puente (2 capas) vs skills literal→bandas→judge (3 capas). Con embeddings caídos, cultural queda en 50 plano aunque el parser haya hecho bien su trabajo (R2≡R1).

---

## 5) Veredicto de réplica

**Overall esperado fixture×campaña-real: 63.2 – 68.6 (central 67.39, moderate_fit)** vs **60 observado en producción con el CV real**.

Descomposición del gap **85 (baseline golden) → 67.39 (réplica central):**
- **−18.86 skills**: la rúbrica real trae 7 mandatory (vs 5/5 acreditables en la golden) de las cuales el CV acredita 1.5 → de estos, **~13.7 techo honesto**, **~5.14 drift corregible** (CNEP 1.71 + mitad comunicación 1.71 + estrategias-frontera 1.71).
- **+1.25 cultural**: blandas pobladas + puente parcial mejoran levemente vs el 50 flat de la golden.
- (−6.00 estructurales del split 80/20 ya existían en el baseline.)

Gap restante **67.39 → 60 (−7.39)** atribuible a:
1. **Varianza fixture ≠ CV real** (componente dominante, no medible desde aquí): el fixture fue diseñado para pasar el eval (tiene "planificación educativa" literal y 3 bloques bien enrutados); el CV real puede carecer de ese ancla literal → hasta −3.4 por mandatory que pierda crédito.
2. **Hipótesis producción no reproducibles desde el texto**: si el payload real llevaba ubicación (el texto no tiene ciudad), el kill-clause de logistics cuesta **−10.0** y explica casi todo el residuo; si el parser inyectó más bullets a mandatory (ruta R3), hasta −3.1 adicionales.

**¿Vale la pena el fix cultural_fit (F1)?** **Sí, pero como batch, no como hotfix solo.** Aquí vale **+1.25 exactos** (58.33→66.67); es barato (incluir `habilidades.habilidades_blandas` en el corpus directo y en el set puenteable de la dimensión), riesgo nulo de falsos positivos (son declaraciones del propio CV) y escala a +7.5 en campañas ricas en blandas coincidentes. Solo, no cambia semáforo. El batch recomendado por ROI medido: **F1 (+1.25 aquí) + filtro anti-soft en la inyección de parser (+1.87 aquí, R3 vs R2) + expansión de dominio CNEP (+1.71 aquí)** ≈ **+4.8 pts** en este caso, sin tocar pesos ni semáforos.

**Hallazgos emergentes no visibles en el diagnóstico genérico:**
1. **R2≡R1**: poblar `habilidades_blandas` del job SIN puente semántico produce 0.0 cambio — la palanca cultural es de dos partes (job-side Y bridge-side); con embeddings degradados el cultural es 50 plano aunque el parser sea perfecto.
2. **Judge budget starvation bajo inyección de parser (R3)**: con 11 mandatory, 6 llamadas se agotan y 4 skills quedan en 0 **sin juzgar, por orden alfabético** — penalización opaca y orden-dependiente que castiga justo a las últimas (las blandas inyectadas).
3. **La inyección de parser viola la regla anti-soft del prompt de rúbrica**: `proactividad/creatividad/resolución` entran como mandatory "técnicas" — el post-procesamiento de `DynamicRubricService` no filtra blandas.
4. **nice_to_have vacío ⇒ techo skills = cobertura×80** sin colchón: campañas sin deseables son estructuralmente más duras que la golden del eval (sesgo optimista del eval cuantificado).
5. **Brecha CNEP**: el CV habla el idioma nativo del Currículum Nacional ("ámbitos de aprendizaje") y recibe 0.00 — ni bandas ni judge genérico tienen conocimiento de dominio; requiere expansión de sinónimos por sector.
6. **Logistics auto-100 por ausencia de ciudad**: toda campaña sin ciudad regala 10 pts; a la inversa, una sola ciudad en el payload real activa kill-clause de −10.0 — candidato principal a explicar el residuo hacia 60.

**No bloqueos.** Sin cambios en pesos, semáforos, caches ni contratos HTTP. Los archivos modificados preexistentes en `app/**` pertenecen al hotfix parvularia anterior (working tree compartido); esta tarea solo agregó `dev/diag_campana_real*.py|.json` y este informe.
