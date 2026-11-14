# Acta de Triage — `test_cv_sin_titles_usa_education` (SDD §4.4 / 4c)

**Fecha:** 2026-08-26 · **Módulo:** `currify-core` · **Autor:** @core-expert
**Metodología:** debugging sistemático (reproducir → causa raíz → resolución documentada). Prohibido skip silencioso.

---

## 1. Síntoma

```
FAILED tests/test_pipeline.py::test_cv_sin_titles_usa_education
AssertionError: assert ('Magíster' in 'Desarrollador Senior, TechCo' or ...)
```

El test construía un CV **sin sección titles** pero CON experiencia y educación, y esperaba que
`merged["titular_profesional"]["titular"]` saliera de EDUCATION (`"Magíster en Ciencias de la Computación"`).
Obtenía en su lugar `'Desarrollador Senior, TechCo'`.

## 2. Reproducción

Determinista, sin LLM (`RobustExtractionService(mock_llm)._merge_section_results(...)`). Falla siempre.

## 3. Causa raíz (con evidencia)

La cadena de prioridad vigente en `_merge_section_results` (`app/services/robust_extraction_service.py` ~L519–547) es:

1. `titles.titulo_profesional` (con override headline si es grado académico)
2. **headline heurística del texto** (`_extract_titular_from_text`) ← dispara aquí: "Desarrollador Senior, TechCo"
3. education **SOLO como fallback junior** (`if not experience_data_raw`, comentario literal "Solo usar educación si no hay experiencia (junior)")

Historia (git):
- El test pertenece al diseño PRE-`aabd949`.
- `git log -S "junior fallback"` → commit **`aabd949` "fix: titular headline vs academic with conditional fallback (bug 3)"** introdujo deliberadamente la cadena actual y añadió `tests/test_titular_fix.py`.

## 4. Contradicción con el contrato vigente

`tests/test_titular_fix.py` (contrato ACTUAL) prueba exactamente lo inverso:

| Test vigente | Assert |
|---|---|
| `test_titular_headline_preferred_over_master` | headline gana; `"Magíster" NOT IN titular` |
| `test_titular_fallback_for_junior_without_experience` | education solo aplica SIN experiencia |

El test eliminado exigía education-gana-aun-con-experiencia → contradice el diseño deliberado de `aabd949`.

## 5. Resolución

**ELIMINACIÓN JUSTIFICADA** (criterio SDD 4c: "eliminación justificada — si el comportamiento que testa ya no existe por diseño").

- Se eliminó la función `test_cv_sin_titles_usa_education` de `tests/test_pipeline.py`, dejando nota con referencias a este acta.
- NO se tocó código de producción (la prioridad headline>education es comportamiento diseñado y testeado).
- No hay pérdida de cobertura: el contrato vigente está cubierto por `tests/test_titular_fix.py` (2 casos).

## 6. Escalamiento (decisión de producto residual)

Si producto deseara que un grado académico distintivo (Magíster/Doctorado) supere al cargo actual en el titular
de candidatos SENIOR, eso es un cambio de diseño posterior a `aabd949`: requiere decisión explícita del Tech Lead,
nueva cadena de prioridad y nuevos tests. **Recomendación: mantener diseño vigente** (el cargo describe mejor el
perfil profesional que el grado; el grado ya vive en `formacion_academica`).

## 7. Verificación

Suite completa post-resolución: **194 passed, 10 skipped, 0 failed** (2026-08-26).
