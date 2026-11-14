---
name: currify-llm-pipelines
description: Mapa vivo de las cadenas LLM de extracción de CVs y scoring/match de currify-core. Consultar SIEMPRE antes de tocar prompts, secciones, scoring, caches o costos.
---

# Currify LLM Pipelines

## 1) Extracción
Flujo: upload (back) → magic bytes → FileParserService (pdfplumber/docx/striprtf/bs4; OCR pytesseract si <100 chars) → ProfileDetector + DocumentAnalyzer (secciones por headers, SectionType) → SectionExtractor (asyncio.gather, Semaphore(3)) → por sección: LLM (Gemini 2.5 Flash + instructor, temp 0.0, timeout 30s) → heurístico regex → default → _merge_section_results + regex contacto → Pydantic ResumeData → Candidate.structuredData + Document COMPLETED.

Conteo de llamadas LLM:
- 1 por SectionType detectada.
- CV típico ≈ 5 (experience, education, titles, skills, summary).
- CV completo 7–10. Vacío/atípico 1–2.
- Legacy monolítico (fallback/flag off): 1–2.

## 2) Scoring / Match
POST /scoring/evaluate {candidate, job} → overall 0–100 + breakdown 6 dimensiones + recommendation + strengths/gaps/summary.
Pesos fijos (suman 100): skills 30, experience 25, education 15, cultural 15, logistics 10, trajectory 5.
Thresholds: ≥80 strong_fit, ≥60 moderate_fit, <60 weak_fit.
Scores 100% deterministas (matriz). El LLM (SCORING_EVALUATION, temp 0.0) SOLO redacta reasoning; overall = Σ(score*weight/100) desde deterministic_scores.

Llamadas LLM por evaluate (7–9 + embeddings cacheados):
1 LATENT_SKILL_EXTRACTION · 2 SEMANTIC_EXPANSION · 3 ROLE_NORMALIZATION (candidato) · 4 SEMANTIC_NORMALIZATION (degrees) · 5 RUBRIC_EXTRACTION · 6 INFER_DEGREE_FROM_TITLE (cond.) · 7 ROLE_NORMALIZATION (rúbrica) · 8 TRANSFERABILITY_CHECK (cond.) · 9 SCORING_EVALUATION.
+ N get_text_embedding (cache _embedding_cache).
+ Back: JOB_PARSING 1 vez, cacheado en Campaign.parsedJobData (MD5).

## 3) Archivos clave
Extracción: robust_extraction_service.py, section_extractor.py, file_parser/document_analyzer/profile_detector.
Scoring: scoring_service.py, core/scoring_rubric.py, dynamic_rubric_service.py, semantic_service.py, api/scoring.py.
Back (contexto, no editar): scoring.service.ts, documents.service.ts, campaigns.service.ts, schema.prisma.

## 4) Invariantes (no negociables)
- No romper fallback LLM→heurístico→default ni Semaphore(3)/semáforo global 6.
- ResumeData Pydantic valida siempre antes de persistir.
- Scoring: el LLM NUNCA decide scores ni overall.
- Caches sagradas: parsedJobData, _embedding_cache, scoring CURRENT, job parsing MD5.
- Créditos: upload −1 inmediato; rescore solo descuenta si éxito; 402 si ≤0; MAX_RESCORE 100.
- Campaña editada → deleteMany scorings + OUTDATED + parsedJobData=null + rescore-all (sem 3, max 100).

## 5) Playbooks
A. Nueva sección: SectionType → detección → prompt → schema Pydantic → heurística → default → merge → ResumeData → fixture → reportar “+1 llamada/CV”.
B. Extracción fallida: status Document → texto crudo → secciones detectadas → ¿falló LLM/timeout/schema/heurística/merge? → LlmUsageLog → reproducir con fixture → fix mínimo.
C. Scoring inconsistente: ¿CURRENT o recalculado? → parsedJobData → rúbrica → deterministic_scores por dimensión → overall vs Σ ponderada → ¿LLM pisó scores? → normalizaciones/embeddings → fixture candidato+job.
D. Costo: contar llamadas por flujo → cacheables → condicionales → agrupar secciones pequeñas (languages+certifications+awards) solo si contenido <N tokens → medir antes/después.

## 6) Reconocimiento rápido
rg -n "call_agent|call_agent_structured" currify-core/app
rg -n "Semaphore|concurrency" currify-core/app
rg -n "parsedJobData|scoringStatus|cvCredits" currify-back/src prisma/schema.prisma

## Contratos Pydantic (no negociables)

Cada sección debe validararse contra su schema antes del merge final. Inconsistencias comunes a evitar:

- `habilidades_tecnicas`: `list[SkillWithLevel]` (dict con skill+level)
- `habilidades_blandas`: MISMO formato que técnicas, O `list[str]`, pero consistente entre prompt y schema
- `idiomas`: `list[Language]` (idioma + nivel + certificacion)
- `experiencia_laboral[].periodo`: debe parsear fechas, NO dejar strings raw
- `proyectos.proyectos`: `list[Project]` con campos estructurados, NO líneas sueltas
- `titular_profesional.titular`: headline profesional (NO título académico)

Si el LLM devuelve formato inconsistente con el schema:
1. NO descartar todo el CV
2. Reintentar con schema estricto + few-shot
3. Si falla de nuevo, sanitizar solo el campo problemático y marcar como `low_confidence`

## Regla anti-contaminación de layout/OCR

El FileParserService y DocumentAnalyzer NO deben pasar a las secciones:
- `"--- LAYOUT CONTEXT (PAGE N) ---"` o variantes
- Encabezados/pies de página repetidos
- Números de página aislados
- Marcas de agua

Filtro obligatorio en FileParserService antes de segmentación:
- Regex para eliminar `--- .* ---`
- Eliminar líneas < 3 caracteres que no sean bullets
- Eliminar texto duplicado entre páginas (headers/footers)

Si el detector de secciones asigna layout a una sección, marcar como `contaminated` y reintentar con heurística.

## Recovery no destructivo (OBLIGATORIO)

NUNCA descartar un CV completo por un fallo parcial. Jerarquía de recovery:

1. **Nivel 1 - Sanitización**: intentar corregir campos inválidos (ej: convertir dict a string, filtrar layout)
2. **Nivel 2 - Retry con few-shot**: reenviar solo la sección fallida con ejemplos del formato esperado
3. **Nivel 3 - Fallback heurístico**: usar regex/parser tradicional para la sección problemática
4. **Nivel 4 - Marcar como parcial**: persistir con `confidence_reducida` y campos faltantes en null, NO respuesta mínima

Prohibido:
- Devolver `ResumeData` con todos los campos vacíos cuando el LLM sí extrajo datos
- Trigger de emergency recovery que descarte datos válidos

## Scoring con datos parciales

Si la extracción falla parcialmente, scoring DEBE calcular score parcial con lo disponible:

- Si hay `experiencia_laboral` y `habilidades` → calcular `experience`, `skills`, `trajectory`
- Si falta `formacion_academica` → dimensión `education` = 0 (no todo el score)
- Si falta `ubicacion` → `logistics` = 0 (no todo el score)
- Solo devolver `overall = 0` si NO hay datos mínimos de contacto + experiencia

Marcar en `ScoringResponse` qué dimensiones se calcularon y cuáles están en null por datos faltantes.

Prohibido: devolver `0.0/100` a un candidato con experiencia y skills válidas solo porque falló Pydantic en otra sección.

## 7) Invariantes Contratos Pydantic (FIX 1)
- SectionResult validar contra schema parcial antes de merge. habilidades_blandas list[str] consistente. proyectos filtrar LAYOUT.

## 8) Invariantes Anti-contaminación y Recovery (FIX 2,4,5,6)
- FileParser regex LAYOUT obligatorio. DocumentAnalyzer flag contaminated. Recovery jerarquía sanitizar->retry->heurístico->parcial confidence*0.7. Scoring overall=0 solo si exp+skills+edu vacíos. Detector compara structured_data vs resume_data.

## 9) Invariantes Hotfix Parvularia (2026-08-25) — CVs no-tech

### 9.1 Repair determinista de fechas (3 capas defensivas)
- **Capa (a) Prompt:** `PROMPT_EXPERIENCE` incluye few-shots de layouts pipe/en-dash (`Empresa | 2018 - 2023`, `Empresa – 2018–2023`, `Empresa | ene 2018 - dic 2023`) y PROHIBE `N/A` en fechas cuando el año está en el texto.
- **Capa (b) Determinista post-LLM:** `RobustExtractionService._repair_missing_dates_from_text(data, cv_text)` busca rangos `\d{4}[-–]\d{4|Presente}` ANCLADOS a la línea/contexto del nombre de empresa (`_find_company_context_line`, firma = primeras 4 palabras normalizadas sin tildes). NUNCA inventa años fuera del texto; NUNCA pisa valores válidos existentes. Se ejecuta en `_structure_final_data` DESPUÉS de `_post_process_dates` y ANTES de `_deduplicate_experiences` (para que las claves empresa|fecha fusionen bien).
- **Capa (c) Retry acotado por entrada:** detector Pydantic `period_has_recoverable_years()` (resume.py) + `_repair_dates_with_bounded_retry()` tras `_create_validated_response`. Dispara SOLO si fecha_inicio sigue ausente y texto_original contiene años. Schema `PeriodRepairResult`; acepta únicamente años presentes en el contexto (anti-alucinación). MÁXIMO 1 retry POR ENTRADA — path excepcional, no cuenta contra presupuesto típico.

### 9.2 Regla de re-enrute estructural (bloques colados)
- `_reroute_work_blocks()` en merge: item en otros_antecedentes con (empresa+rango fechas) O (cargo+empresa, separados por `|`/`·`) se MUEVE a experiencia_laboral.
- Regla 100% estructural: regex de rango de años + lexicón genérico de roles (vocabulario, NO empresas hardcodeadas).
- Exclusiones genéricas: items que empiezan con voluntariado/curso/certificación/capacitación/diplomado/taller permanecen en otros_antecedentes aunque tengan años.
- Las viñetas (•,-,✓) inmediatamente siguientes a un bloque movido se ABSORBEN como responsabilidades de esa experiencia (preserva texto literal para scoring).

### 9.3 Crédito parcial skills + Judge LLM acotado
- Tres bandas sobre mandatory_skills: similitud ≥0.80 → 1.0; ≥0.65 → 0.5; <0.65 → elegible para judge. Match literal (en expanded set o substring del contexto) → 1.0 instantáneo.
- **Skill Judge** (`_judge_single_skill`, stage `SKILL_JUDGE`, temp 0.0): SOLO para skills que quedaron en 0 tras similitud. Schema Pydantic `SkillJudgeResult` (app/models/scoring.py): exige evidencia LITERAL citada del CV — sin evidencia → score forzado 0; anti-alucinación: la evidencia devuelta debe ser substring literal del contexto.
- **Presupuesto:** máximo `MAX_SKILL_JUDGE_CALLS = 6` llamadas por evaluación; cache `_skill_judge_cache` por (skill_normalizada + hash contexto candidato) → segunda evaluación del mismo candidato = 0 llamadas. Presupuesto neto típico ≤ +2 llamadas LLM/evaluación.
- **El judge alimenta la MATRIZ** (crédito de matching → deterministic_scores), NUNCA el score final. Overall sigue siendo Σ(score*peso/100) determinista.

### 9.4 Match exacto antes de embeddings + clusters de dominio (roles)
- `normalize_job_titles()` resuelve PRIMERO por match exacto contra `_JOB_TITLE_DOMAIN_CLUSTERS` (título normalizado: lowercase, sin tildes/puntuación vía `_normalize_title_key`). Solo los títulos pendientes van al LLM (ROLE_NORMALIZATION) → ahorra llamadas y estabiliza roles no-tech.
- Clusters incluidos: educación (educadora de párvulos y variantes nivel medio/transición), salud (enfermera/o, médico, auxiliar paramédico, matrona, kinesiólogo, dentista), oficios (electricista, gasfíter, carpintero), tech (desarrollador, QA). Extensible: agregar dominio = añadir entradas canonical→aliases al dict.

### 9.5 Fixture de regresión
- `evals/test_cv_parvularia_15y.py` + `evals/cvs_fixture/cv_parvularia_15y.{txt,pdf}` + `cv_parvularia_15y_golden.json`: clase de CVs no-tech chilenos (layout pipe/en-dash, bloques colados bajo Otros Antecedentes, skills pedagógicas). Asserts: fechas 2018–2023 parseadas, ≥3 experiencias re-enrutadas, skills_match≥60, experience≥60, judge ≤6 llamadas. Tests unitarios: `currify-core/tests/test_hotfix_parvularia.py`.

## 10) Invariantes Batch-fix F1/F2/F3 (2026-08-25) — puente cultural, anti-soft, expansión dominio

### 10.1 Puente cultural_fit (F1)
- cultural_fit consulta SIEMPRE las habilidades blandas DECLARADAS del CV (`habilidades.habilidades_blandas`, formatos str|dict): entran al corpus literal Y al set puenteable junto a `expanded_skills`. Evidencia trazable: declaración literal del propio CV o similitud ≥0.65 documentada (umbral cultural intacto).
- Campo OPCIONAL `RubricSkills.soft_skills` en `StructuredRubric`: blandas del lado de la oferta. Retrocompatibilidad TOTAL (default `[]`; rúbricas persistidas parsean igual; sin cambios de contrato HTTP). Fuentes de cultural = parámetro legacy `parsedJobData.habilidades_blandas` + `rubric.skills.soft_skills`, dedup case-insensitive.
- Sin falsos positivos: blanda genuinamente ausente en el CV → sin crédito (base neutral 50 intacta). Tests: `currify-core/tests/test_batchfix_f1_f2_f3.py`.

### 10.2 Filtro anti-soft en inyección parser→mandatory (F2)
- En `DynamicRubricService.generate_rubric`, la inyección de `requisitos.habilidades_requeridas` pasa por `is_soft_skill()` (`app/services/skill_classification.py`; léxico estático, SIN LLM). Entrada clasificable como blanda → NUNCA entra a mandatory_skills; se redirige a `skills.soft_skills`. Técnicas nuevas → mandatory con dedup intacto.
- Léxico extensible: `SOFT_SKILL_PHRASES` / `SOFT_SKILL_WORDS` (normalizadas sin tildes, matching con bordes de palabra — evita falsos positivos tipo 'responsabilidades'/'adaptaciones'). 'Comunicación oral y escrita' NO clasifica como blanda (la rúbrica de campaña real la trata como competencia evaluable).

### 10.3 Expansión léxica LADO RÚBRICA antes de bandas (F3)
- Cada mandatory skill se expande con sondas de dominio vía `expand_rubric_skill()` (`app/services/domain_expansion.py`) ANTES del cálculo de bandas. 100% estático/determinista, NUNCA vía LLM (presupuesto). CNEP primero (triggers `curriculum nacional*`/`cnep` → sondas nativas: ámbitos/núcleos de aprendizaje, por ámbitos); estructura lista para salud/oficios (añadir entrada a `DOMAIN_SKILL_RULES`).
- Las sondas alimentan la banda literal instantánea (skills expandidas o texto de contexto, comparación normalizada sin tildes) y las bandas de similitud (mejor sonda). El judge mantiene rol exacto: solo <0.65 tras sondas, evidencia literal, cache, máximo 6 llamadas.
- Bandas 0.80/0.65, split 80/20, pesos, semáforos y caches: INTOCABLES.

### 10.4 Presupuesto y efecto medido
- Los 3 fixes son deterministas: CERO llamadas LLM nuevas en el camino feliz. En campaña real el judge consume −1 llamada (CNEP deja de juzgarse por crédito literal).
- Deltas medidos post-fix (diag_campana_real re-ejecutado): R4 primario 67.39→72.07 (+4.68≈objetivo +4.8); R2>R1 (cultural deja de ser flat-50 cuando el CV declara blandas); techo dimensional S1 85.0 y S4 kill-clause 75.0 intactos.

## 11) Invariantes Fase A SDD Scoring Fase 2 (2026-08-25) — logistics jerárquico + trajectory por componentes

### 11.1 Logistics geográfico jerárquico (P1)
- `app/services/geo_chile.py`: jerarquía estática versionada (`GEO_CHILE_VERSION="2026.08"`) comuna→provincia→región; claves normalizadas (lowercase, sin tildes NFD, sin puntuación); índices derivados `COMUNA_TO_PROVINCIA` / `PROVINCIA_TO_REGION` / `REGION_ALIASES` (+ alias de variantes gráficas tipo llay-llay/marchigue/treguaco).
- `resolve_geo_match(campaign_location, cv_location_texts) -> GeoMatchResult{tier, matched_on, score}`: función PURA, cero LLM. Escalera EXACTA: comuna=100 · provincia=70 · región=50 · sin match=0 · campaña sin requisito=100 (no aplica) · CV sin ubicación con requisito=50 neutral trazable.
- Ubicación del candidato: SOLO campos ya extraídos (`datos_contacto.ubicacion/ciudad/comuna/provincia/region`) — no re-extrae nada. Multi-parte: cada parte de la campaña se resuelve contra la jerarquía y gana el MEJOR tier; componente compartido a nivel comuna ("Providencia, Santiago" × "Santiago, Chile") acredita comuna. Homónimos comuna/provincia se resuelven comuna-first.
- La matriz registra SIEMPRE `_logistics_geo={geo_version, tier, matched_on, score}`: prohibido resultado sin explicación. Kill binario por substring eliminado; `0` solo con requerimiento y CV en otra región.
- Tests: `tests/test_logistics_geo.py` (20 casos: tabla-driven SDD §7 + integración matriz).

### 11.2 Trajectory por componentes + cierre de fuga years (P2)
- Fórmula determinista SIN LLM: `round(0.50·years_c + 0.30·stability_c + 0.20·progression_c)`; constantes nombradas centralizadas en un único bloque de `scoring_service.py` (prohibidos mágicos dispersos).
- `years_c`: fechas reales reparadas vs `rubric.experience.min_years` → `min(100, años/min·100)`; fallback por entradas (≥2→100/1→60/0→0) si min_years≤0 o sin fechas. `stability_c`: tenencia promedio ≥24m→100 · 12–24m→70 · <12m→40. `progression_c`: tiers léxicos cronológicos (asistente/ayudante < profesional/titulado < coordinador/encargado/jefe): ascendente→100 · lateral→70 · insuficiente/descendente→60.
- Fallback 70 PRESERVADO (<1 entrada o fechas no parseables); ramas roles_mismatch→30 e insuficiente→50 intactas (el SDD solo reemplaza el hardcode 70 del branch "rol matcheado").
- **ÚNICA FUENTE DE VERDAD para años**: el sub-score `years` de experience usa la misma función (`compute_timeline_months` + `years_component`) → cierra la fuga F3 (contaba ENTRADAS ignorando min_years y fechas reparadas). Halving por mismatch conservado.
- Traza `_trajectory_components={years, stability, progression, years_total, min_years|reason}` en la matriz (aditiva, sin cambios HTTP).
- Tests: `tests/test_trajectory_signal.py` (19 casos: componentes puros + integración).

### 11.3 Efecto medido (deltas vs baseline SDD §10)
- diag_parvularia_ceiling: **S4 kill-clause 75.0→86.1 (objetivo ≥85 ✓)**; S1 85.0→86.1; S2 81.57→82.67; S3 y S3b 92.5→93.6; S5 85.0→86.1.
- diag_campana_real: **R4 primario 72.07→73.17 (sin retroceder ✓)**; R1 69.57→70.67; R2 70.82→71.92; R3 70.51→71.61; R5=R4+0; R6 72.54→73.64.
- trajectory del fixture: 70 constante → **92** (years 100 · stability 100 · progression 60). CERO llamadas LLM nuevas (P1/P2 deterministas). Pesos, bandas 0.80/0.65, judge (máx 6, evidencia literal), caches y semáforos INTACTOS.

## 12) Invariantes Fase B SDD Scoring Fase 2 (2026-08-26) — re-clasificación mandatory/nice-to-have (P3)

### 12.1 Dos capas, cero llamadas LLM nuevas
- **Capa 1 (prevención)**: few-shots de clasificación EN el prompt de RUBRIC_EXTRACTION (`DynamicRubricService.generate_rubric`, prompt inline): Mandatory = condición EXCLUYENTE ("Requisito:", título obligatorio, certificación legal); Nice-to-Have = "deseable/se valora/valorable/ideal", capacidades complementarias, herramientas básicas. Contraejemplo obligatorio incluido: "Manejo de herramientas tecnológicas básicas" → NICE-TO-HAVE. Mismo costo (1 llamada).
- **Capa 2 (corrección determinista)**: `app/services/rubric_tier_classifier.py` — `classify_requirement_tier(texto) -> "mandatory"|"nice"|None`. Léxico estático normalizado sin tildes (mismo patrón que `skill_classification.py`): nice = `deseable(s)/deseablemente/valorable(s)/valora/ideal(es)/idealmente/se valora/se agradece/no excluyente` + co-ocurrencia `herram* × basic[oa]s?` (cubre "herramientas tecnológicas básicas" Y "básicas herramientas"); mandatory-fuerte = `excluyente(s)/imprescindible(s)/obligatorio|a|os|as/indispensable(s)` con PRECEDENCIA sobre nice.

### 12.2 Regla de oro + orden + flag
- **JAMÁS promover a mandatory**; solo degradar a nice CON evidencia léxica explícita; None ⇒ se respeta la salida del LLM.
- Orden en `generate_rubric`: **anti-soft → tier-reclass** (una blanda ya desviada a soft_skills NUNCA llega al clasificador como mandatory). Degradación mueve mandatory→nice_to_have_skills con dedup case-insensitive.
- Feature flag env `RUBRIC_TIER_RECLASS` (**default OFF** = comportamiento actual byte-a-byte; leído en runtime vía getattr para override en tests/harness). Activación en prod SOLO del Tech Lead tras harness verde.
- Observabilidad por re-clasificación: log estructurado `[TIER-RECLASS] {json}` + evento `{requisito_original, decision, pista_disparadora, destino}` en buffer acotado (`get_recent_reclass_events`) + mirror best-effort a `analytics_storage["rubric_tier_reclass"]` (sin cambios HTTP).

### 12.3 Guardarraíl y efecto medido
- Harness bloqueante `dev/harness_rubric_tier.py` (re-ejecutable, artefacto `dev/harness_tier_reclass_results.json`): corre TODOS los fixtures+goldens OFF vs ON. Criterio bloqueante: NINGÚN golden cae >2 pts overall.
- Medido flag ON: parvularia_golden Δ=0 · qa_lead_golden Δ=0 · **R4 campaña real 73.17→74.60 (+1.43, ≥74 objetivo §10 ✓)**; único re-clasificado: "herramientas tecnológicas básicas" (denominador mandatory 7→6 ⇒ skills_match 28.57→33.33). Flag OFF verificado IDÉNTICO a baseline Fase A (R4=73.17, S4=86.1). Hallazgo delta vs estimación §4.3 (+2): documentado en `docs/debug/2026-08-26-fase-b-rubric-tier.md` (F1).
- Tests: `tests/test_rubric_tier_classifier.py` (22 casos). Pesos, bandas 0.80/0.65, judge (máx 6, evidencia literal, cache), semáforos y caches INTACTOS.

## 13) Invariantes Higiene técnica Fase C SDD (2026-08-26) — sweep Pydantic V2, política de tipos, triage

### 13.1 Sweep Pydantic V2 (4b)
- PROHIBIDO en código nuevo/migrado: `Model.parse_obj(` → usar `Model.model_validate(`; `model.dict()` → `model.model_dump()`; `model.json()` → `model.model_dump_json()`. NUNCA tocar el built-in `dict()` (solo llamadas sobre instancias/clases Pydantic cuentan).
- Criterio de aceptación permanente: **cero warnings `PydanticDeprecatedSince20` en la suite** (`python -m pytest tests/ -q` desde currify-core). Verificado 2026-08-26: 0 ocurrencias de `parse_obj(`/`.dict()` residual y 0 warnings.
- Al serializar para logs/persistencia preferir `model_dump(mode="json")` cuando se necesite JSON-safe.

### 13.2 Política de tipado estático (4a)
- Checker: `pyright --level error` sobre módulos tocados; criterio: **0 errores**. Estado verificado 2026-08-26 en los 3 módulos del inventario LDD (`app/models/resume.py`, `app/services/robust_extraction_service.py`, `app/services/section_extractor.py`): 0 errores / 0 warnings.
- Regla dura: fixes SOLO de tipos (`Optional[str] = None` en vez de `str = None`, `cast(...)` puntuales, narrowing explícito). **Cero cambios de semántica**: un `cast` no altera el valor en runtime; explicitar `=None` en constructores solo cuando es idéntico al default omitido.
- Falso positivo conocido de pyright ≤1.1.411: trata `Field(None, ...)` como parámetro requerido en constructores (reportCallIssue "Argument missing"). Solución permitida: pasar explícitamente el valor default (`telefono=None`, `request_id=None`) con comentario `# solo-tipos`; NUNCA "aprovechar" para enviar un valor distinto del default (eso sería semántica).
- Patrón `type('Match', (), {...})` dinámico → acceder a sus métodos vía `cast(Any, obj)`.
- `asyncio.gather(..., return_exceptions=True)` → rama no-Exception tipar con `cast(SectionResult, result)` tras el `isinstance(result, Exception)`.
- Bug latente documentado (NO corregir sin decisión del Tech Lead): `ResumeData.get_años_experiencia()` crashea con `AttributeError` si `experiencia_laboral[i].periodo is None` (reproducido 2026-08-26; el cast en resume.py ~L698 preserva el comportamiento byte-a-byte incluido el crash path). Acta: `docs/debug/2026-08-26-fase-c-higiene.md`.

### 13.3 Triage de tests rotos (4c)
- Prohibido skip silencioso. Ante test fallando: reproducir → causa raíz con evidencia (git log -S, blame, commit que introdujo/cambió el comportamiento) → acta en `docs/debug/YYYY-MM-DD-triage-*.md` → fix mínimo O eliminación justificada.
- Eliminación procede SOLO si el comportamiento testeado ya no existe POR DISEÑO (commit deliberado + tests nuevos que cubren el contrato vigente). Ejemplo resuelto 2026-08-26: `test_cv_sin_titles_usa_education` testeaba la cadena de titular pre-`aabd949`; el contrato vigente lo cubre `tests/test_titular_fix.py`.
- Si el test codifica una decisión de producto aún vigente pero el código la violó → escalar al Tech Lead con recomendación ANTES de tocar semántica.
- Suite objetivo permanente: **0 failed no justificados** (ambientales con skipif+motivo; ver §9.x marcadores de `test_retry_validation_fix.py`).