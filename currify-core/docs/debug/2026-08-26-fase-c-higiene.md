# Acta Fase C — Higiene técnica (SDD §4.4 / §8-Fase C)

**Fecha:** 2026-08-26 · **Módulo:** `currify-core` · **Autor:** @core-expert
**Contexto:** continuación de sesión previa que terminó SIN REPORTAR y con trabajo parcial. Esta sesión AUDITÓ primero, completó lo faltante y verificó con números.

---

## 1. Auditoría inicial (estado encontrado, sin tocar nada)

| Paso SDD | Estado auditado | Evidencia |
|---|---|---|
| **4b** sweep Pydantic V2 | ✅ HECHO (sesión previa o anterior) | `grep parse_obj(` → 0 resultados; `grep .dict()` → 0 resultados en currify-core; suite baseline con **0 warnings `PydanticDeprecatedSince20`** |
| **4d** marcadores ambientales | ✅ HECHO | `tests/test_retry_validation_fix.py`: 4 skipped con motivo en el mensaje ("Requiere API key real del proveedor LLM…") |
| **4a** tipado estático | ⚠️ PARCIAL | `resume.py`: casts presentes (~L693–698) pero citaban acta INEXISTENTE; pyright: resume.py=0 err · robust_extraction_service.py=9 err · section_extractor.py=1 err |
| **4c** triage test roto | ❌ NO INICIADO | `test_cv_sin_titles_usa_education` seguía fallando; sin acta |
| Actas | ❌ FALTANTES | `docs/debug/2026-08-26-fase-c-higiene.md` y `2026-08-26-triage-sin-titles.md` no existían |
| §13 SKILL.md | ❌ FALTANTE | `.agents/skills/core/currify-llm-pipelines/SKILL.md` terminaba en §12 |

**Hallazgo adicional fuera del estado conocido:** la suite baseline reportaba **2 failed**, no 1:
`test_pipeline.py::test_cv_sin_titles_usa_education` (conocido) + `tests/test_detail_extraction.py::test_detail_extraction` (no reportado). Ambos triageados abajo.

**Baseline exacta (antes):** `2 failed, 194 passed, 10 skipped, 3 warnings` — warnings: FutureWarning google-generativeai (lib externa), DeprecationWarning `datetime.utcnow` (security.py), RuntimeWarning coroutine never awaited (artefacto de test). **Cero PydanticDeprecated.**

## 2. Trabajo realizado esta sesión

### 2.1 Completar 4a — tipado estático (solo tipos, cero semántica)

Checker: **pyright 1.1.411** (`--level error`). Fixes aplicados:

**`app/services/robust_extraction_service.py`** (9 errores → 0):
| Línea | Error | Fix (tipo-only) |
|---|---|---|
| ~L126, ~L2458 | `str` → parámetro `timestamp: datetime` | `datetime.now().isoformat()` → `datetime.now()` (valor idéntico tras coerción Pydantic) |
| ~L153, ~L2459 | falta `request_id` (falso positivo pyright ≤1.1.411 con `Field(None,...)`) | `request_id=None` explícito + comentario (idéntico al default omitido) |
| ~L900, ~L1967 | `.group` sobre `Match` dinámico (`type('Match',(),{...})`) | `cast(Any, phone_match/match_phone)` |
| ~L1752, ~L1843 | `cv_text: str = None` implícito | `cv_text: Optional[str] = None` |
| ~L1832 | propagación Optional a `_ensure_required_fields(raw_text: str)` | `cast(str, cv_text)` (None fluye igual que hoy) |
| ~L2365–2383 | faltan `telefono` / `referencias` / `metadata_procesamiento` (mismo falso positivo) | explícitos `=None` (idénticos a defaults) |

**`app/services/section_extractor.py`** (1 error → 0):
| Línea | Error | Fix |
|---|---|---|
| ~L674 | `gather(return_exceptions=True)` → `SectionResult \| BaseException` en rama else | `cast(SectionResult, result)` tras el `isinstance(result, Exception)` |

Import: se añadió `cast` a `typing` en ambos archivos.

**Resultado:** pyright `0 errors, 0 warnings` en los 3 módulos del inventario LDD. Suite intacta tras los fixes (`2 failed, 194 passed, 10 skipped` — idéntica a baseline).

### 2.2 Resolución 4c — dos tests, dos actas

**(a) `test_cv_sin_titles_usa_education`** → ELIMINADO con justificación.
Causa raíz: testeaba la cadena de titular PRE-`aabd949`; el diseño vigente (headline > titles > education-junior-fallback) está cubierto por `tests/test_titular_fix.py`. Detalle completo → `docs/debug/2026-08-26-triage-sin-titles.md`.

**(b) `test_detail_extraction`** (hallazgo de auditoría) → ARCHIVO ELIMINADO (`tests/test_detail_extraction.py`, contenía un único test).
Causa raíz: testeaba la normalización model-level `descripcion → responsabilidades` de `WorkExperience`, **eliminada por diseño** en `8f8f5e5` (refactor que centralizó normalización en `_normalize_common_root_fields`; hoy ni siquiera existe campo `descripcion` en `WorkExperience`). La extracción de responsabilidades vive ahora en la capa de pipeline: prompts (`resume_prompts.py` L44/L72/L130: captura multi-línea como responsabilidades) + heurísticas (`section_extractor.py` L210–229 bullets; `robust_extraction_service.py` L831–835 absorción de viñetas). Ningún prompt pide `descripcion` para experiencias → el mapeo model-level es código muerto por diseño. Restaurarlo sería re-introducir semántica revertiendo un refactor deliberado (prohibido).

### 2.3 Bug latente confirmado y ESCALADO (sin corregir)

`ResumeData.get_años_experiencia()` crashea cuando una experiencia tiene `periodo=None`:

```
Repro (2026-08-26): ResumeData(experiencia_laboral=[{'cargo':'Dev','empresa':'X'}])
  → rd.get_años_experiencia()
  AttributeError: 'NoneType' object has no attribute 'fecha_inicio'
```

El cast en `resume.py` (~L698) preserva el comportamiento byte-a-byte INCLUYENDO el crash path (regla dura 4a). El riesgo real depende de si algún llamador puede alcanzar el estado `periodo=None` (p.ej. scoring sobre datos parciales). **Decisión de corrección (guard vs. validador vs. contrato) → Tech Lead.**

## 3. Verificación final (números exactos)

| Métrica | Antes | Después | Objetivo SDD |
|---|---|---|---|
| Suite completa | 2 failed · 194 passed · 10 skipped | **0 failed · 194 passed · 10 skipped** | 0 failed no justificados ✓ |
| Warnings `PydanticDeprecatedSince20` | 0 | **0** | 0 ✓ |
| `parse_obj(` / `.dict()` residuales | 0 / 0 | **0 / 0** | 0 ✓ |
| Pyright (3 módulos LDD) | 10 errores | **0 errores, 0 warnings** | limpio ✓ |
| `dev/diag_parvularia_ceiling.py` S4 | 86.1 | **86.1** | inmutable ✓ |
| `dev/harness_rubric_tier.py` flag OFF R4 | 73.17 | **73.17** (exit 0) | inmutable ✓ |

Skips (10): 4× retry-validation (API key), 5× scoring_judge (API key), 1× llm_judge (API key) — todos ambientales con motivo.
Warnings restantes (3): externos/pre-existentes, ninguno Pydantic.

## 4. Archivos modificados

| Archivo | Cambio |
|---|---|
| `app/services/robust_extraction_service.py` | 10 fixes solo-tipos (§2.1); import `cast` |
| `app/services/section_extractor.py` | narrowing gather con `cast`; import `cast` |
| `tests/test_pipeline.py` | eliminado `test_cv_sin_titles_usa_education` + nota referencial |
| `tests/test_detail_extraction.py` | **ELIMINADO** (único test obsoleto por diseño) |
| `docs/debug/2026-08-26-fase-c-higiene.md` | este acta (nuevo) |
| `docs/debug/2026-08-26-triage-sin-titles.md` | acta triage 4c (nuevo) |
| `.agents/skills/core/currify-llm-pipelines/SKILL.md` | §13 invariantes de higiene (nuevo) |

**No tocado:** pesos, overall determinista, judge/semáforos/caches, bandas, HTTP/endpoints, currify-back/front, prompts, `resume.py` (ya estaba correcto).

## 5. Hallazgos fuera de alcance (para backlog del Tech Lead)

Errores pyright pre-existentes detectados en archivos NO incluidos en el inventario SDD §4.4 (no se tocaron):
`tests/reproduce_cascade.py`, `tests/test_skills_schema_fix.py`, `tests/test_layout_filter.py`, `tests/test_recovery_nondestructivo.py`, `app/services/file_parser_service.py` (imports no resueltos en este entorno: `docx`, `striprtf`). Mismo patrón de falso positivo `Field(None,...)` en varios casos.

## 6. Escalados

1. **Bug latente `periodo=None`** en `get_años_experiencia()` (§2.3) — requiere decisión de corrección.
2. **Decisión de producto titular** (si grado académico debería superar al cargo en seniors) — recomendación: mantener diseño vigente (`aabd949`).
3. **Backlog tipado fuera de inventario** (§5).
