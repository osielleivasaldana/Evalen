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