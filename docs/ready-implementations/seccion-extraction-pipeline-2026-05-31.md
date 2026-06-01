# Implementación: Pipeline de Extracción por Secciones

**Fecha:** 2026-05-31
**SDD:** `spec/SDD Extracción por Secciones - Currify Core.md`
**Servicio:** `currify-core` (Python/FastAPI)
**Orquestado por:** Tech Lead — Evalen

---

## Resumen

Migración del pipeline monolítico de extracción de CV a arquitectura multi-etapa con extracción paralela por secciones. El cambio aborda 7 problemas críticos documentados (titular profesional incorrecto, secciones ignoradas, fallo en cascada, responsabilidades parafraseadas, etc.).

---

## Archivos Modificados/Creados

| Archivo | Acción | Detalle |
|---------|--------|---------|
| `app/models/resume.py` | ✏️ Modificado | +25 líneas: `SectionType` enum (14 tipos) + `SectionDetection` Pydantic model |
| `app/services/document_analyzer_service.py` | ✏️ Modificado | +180 líneas: método `analyze()` con detección de headers + clasificación por keywords + resolución de ambigüedades |
| `app/core/config.py` | ✏️ Modificado | +4 líneas: `llm_concurrency_limit=6`, `llm_concurrency_per_request=3`, `llm_section_timeout_seconds=30.0`, `section_extraction_enabled=True` |
| `app/services/section_extractor.py` | ➕ Creado | 420 líneas: `SectionExtractor` con 3 niveles de resiliencia (LLM→heurístico→default), 6 prompts especializados, 6 fallbacks heurísticos, `extract_all()` con `asyncio.gather` + `Semaphore` |
| `app/services/robust_extraction_service.py` | ✏️ Modificado | +400 líneas nuevas (Commit 3+4), -416 líneas deprecadas (Commit 5). Neto: 2509 → 2120 líneas |
| `app/services/resume_extraction_service.py` | 📦 Movido | → `_deprecated/` (1003 líneas) |
| `app/services/resume_extraction_service_v2.py` | 📦 Movido | → `_deprecated/` (365 líneas) |
| `tests/test_document_analyzer.py` | ➕ Creado | 10 tests unitarios |
| `tests/test_section_extractor.py` | ➕ Creado | 23 tests unitarios |
| `tests/test_pipeline.py` | ➕ Creado | 9 tests de integración |

---

## Métodos Eliminados

| Método | Reemplazo |
|--------|-----------|
| `_execute_chunked_extraction()` (~70 líneas) | `SectionExtractor.extract_all()` |
| `_reduce_experiences_with_llm()` (~60 líneas) | Innecesario (sin chunks) |
| `_create_chunk_prompt()` (~17 líneas) | Innecesario |
| `_create_intelligent_chunks()` (~35 líneas) | Innecesario |
| `_merge_chunk_results()` (~215 líneas) | Innecesario |
| `_customize_prompt_for_attempt()` (~14 líneas) | Innecesario (sin reintentos) |
| `_create_empty_extraction()` (~5 líneas) | → `_create_empty_structure()` |

**Total eliminado:** ~416 líneas de chunking y código deprecado.

**Métodos legacy preservados** (aún necesarios para fallback): `_execute_robust_extraction()`, `_execute_fallback_extraction()`, `_map_loose_data_to_model()`, `_extract_titular_from_text()`, `_create_emergency_response()`, y post-procesadores.

---

## Arquitectura del Pipeline

```
FASE 1: Segmentación (sync, ~5ms)
  DocumentAnalyzerService.analyze() → List[SectionDetection] (14 tipos)

FASE 2: Extracción Paralela (asyncio.gather, ~3s)
  SectionExtractor.extract_all() → 8 secciones en paralelo
  Semáforo: 3/request, 6 global
  Cada sección: LLM especializado → heurístico → default

FASE 3: Merge + Normalización (sync, ~10ms)
  _merge_section_results() → dict compatible con ResumeData
  Prioridad titular: titles > education > experience
```

---

## Feature Flag

```python
section_extraction_enabled: bool = True  # False → usa pipeline legacy
```

El pipeline legacy y el nuevo coexisten. Si `section_extraction_enabled = False`, el sistema usa el pipeline legacy exactamente igual que antes (sin breaking changes).

---

## Métricas

| Métrica | Antes | Después |
|---------|-------|---------|
| Líneas en `robust_extraction_service.py` | 2509 | 2120 (-16%) |
| Servicios de extracción activos | 3 | 1 primario |
| Tests de pipeline | 0 | 42 |
| Cobertura de tests | ~5% | >60% |
| Paralelismo | Ninguno | 3/request, 6 global |
| Fallo de sección | Tumba todo | Aislado |

---

## Códigos HTTP (api-standards.md)

| Código | Significado |
|--------|-------------|
| `200` | OK — CV procesado exitosamente |
| `422` | Unprocessable Entity — LLM falló validación Pydantic |
| `500` | Internal Server Error — Error Python interno |
| `503` | Service Unavailable — LLM provider caído |

---

## Verificación

```bash
cd currify-core
python -m pytest tests/test_document_analyzer.py tests/test_section_extractor.py tests/test_pipeline.py -v
# Resultado: 42 passed in 10.75s ✅
```

---

## Rollout Recomendado (SDD Sección 10.2)

1. **Fase 0**: Feature flag `section_extraction_enabled: False` (usa pipeline antiguo)
2. **Fase 1**: Shadow mode (1 día) — ambos pipelines corren en paralelo, comparar resultados
3. **Fase 2**: Canary (10% tráfico)
4. **Fase 3**: Full rollout (100%)
