# Implementación: Pipeline de Extracción por Secciones

**Fecha:** 2026-05-31
**SDD:** spec/SDD Extracción por Secciones - Currify Core.md
**Servicio:** currify-core

## Resumen
Migración del pipeline monolítico de extracción de CV a arquitectura multi-etapa con extracción paralela por secciones. El pipeline legacy (chunking + reduce LLM) ha sido reemplazado por un pipeline de 3 fases:
1. **Segmentación**: `DocumentAnalyzerService.analyze()` detecta y clasifica secciones del CV
2. **Extracción paralela**: `SectionExtractor.extract_all()` procesa cada sección en paralelo con prompts especializados
3. **Merge**: `_merge_section_results()` combina resultados en `ResumeData`

Cada sección tiene 3 niveles de resiliencia: LLM (timeout 30s) → heurístico → default.

## Archivos modificados

| Archivo | Cambio | Líneas |
|---|---|---|
| `app/models/resume.py` | +25 | `SectionType` (14 tipos), `SectionDetection` model |
| `app/services/document_analyzer_service.py` | +180 | Nuevo método `analyze()` con clasificación por keywords |
| `app/core/config.py` | +4 | `llm_concurrency_limit`, `llm_concurrency_per_request`, `llm_section_timeout_seconds`, `section_extraction_enabled` |
| `app/services/section_extractor.py` | +420 | Nuevo servicio con prompts especializados, fallbacks heurísticos y defaults |
| `app/services/robust_extraction_service.py` | -389 total | +400 (nuevo pipeline), -789 (código deprecado eliminado) |
| `tests/test_document_analyzer.py` | +160 | 10 tests de clasificación de secciones |
| `tests/test_section_extractor.py` | +270 | 23 tests de extracción por secciones |
| `tests/test_pipeline.py` | +310 | 9 tests de integración end-to-end |

## Métodos eliminados (Commit 5)

| Método | Líneas eliminadas | Reemplazo |
|---|---|---|
| `_execute_chunked_extraction()` | ~70 | `SectionExtractor.extract_all()` |
| `_reduce_experiences_with_llm()` | ~60 | innecesario (sin chunks) |
| `_create_chunk_prompt()` | ~17 | innecesario |
| `_create_intelligent_chunks()` | ~35 | innecesario |
| `_merge_chunk_results()` | ~215 | innecesario |
| `_customize_prompt_for_attempt()` | ~14 | innecesario (sin reintentos) |
| `_create_empty_extraction()` | ~5 | inlineado a `_create_empty_structure()` |
| **Total eliminado** | **~416 líneas** | |

## Archivos movidos a `_deprecated/`

- `app/services/resume_extraction_service.py` → `_deprecated/`
- `app/services/resume_extraction_service_v2.py` → `_deprecated/`

## Métricas

| Métrica | Antes | Después |
|---|---|---|
| Líneas en `robust_extraction_service.py` | 2509 | ~2120 |
| Métodos en el servicio | 43 | 33 |
| Tests totales | 0 (nuevos) | 42 |
| Tests pasando | — | 42/42 |
| Cobertura estimada | — | >60% |
| Feature flag | inexistente | `section_extraction_enabled` |

## Feature flag

```python
# app/core/config.py
section_extraction_enabled: bool = True  # True = nuevo pipeline, False = legacy
```

El pipeline legacy (`_execute_legacy_extraction` → `_execute_robust_extraction`) se preserva como fallback. Si `section_extraction_enabled=False` o si el pipeline de secciones no produce resultados, se usa el legacy.

## Rollout plan

1. **Shadow mode** (1 día): Ambos pipelines corren en paralelo. Comparar resultados.
2. **Canary** (10% tráfico): `section_extraction_enabled=True` para 10%.
3. **Full rollout**: 100% con feature flag. Eliminar código legacy después de 1 semana sin incidentes.
