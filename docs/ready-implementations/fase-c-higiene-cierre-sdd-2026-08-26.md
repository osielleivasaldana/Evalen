# Fase C SDD Scoring Fase 2 — Higiene Técnica (P4) + Cierre del SDD

**Fecha:** 2026-08-26
**Estado:** ✅ Implementado, verificado y cerrado — SDD Calidad de Scoring Fase 2 COMPLETO
**Responsable técnico:** @core-expert (dos sesiones: la primera terminó sin reportar; la segunda auditó, completó y reportó)
**Especificación:** `docs/SDD Calidad de Scoring Fase 2 - Currify Core.md` §4.4, §8-Fase C
**Actas:** `currify-core/docs/debug/2026-08-26-fase-c-higiene.md` · `currify-core/docs/debug/2026-08-26-triage-sin-titles.md`

---

## 1. Implementado

| Paso | Solución | Resultado |
|---|---|---|
| 4b Sweep Pydantic V2 | `parse_obj`→`model_validate`, `.dict()`→`.model_dump()` en llamadas de modelos Pydantic | **0 warnings** `PydanticDeprecatedSince20` en suite |
| 4d Tests ambientales | skip-if-no-key con motivo en mensaje (4 tests de API key) | Suite honesta: skipped, no failed |
| 4a Tipado estático | Casts/guards/narrowing SOLO de tipos en `resume.py`, `robust_extraction_service.py`, `section_extractor.py`; cero semántica | **Pyright 0 errores, 0 warnings** en los 3 módulos |
| 4c Triage test roto | `test_cv_sin_titles_usa_education`: causa raíz git documentada → eliminación justificada (obsoleto desde commit `8f8f5e5`); `test_detail_extraction.py` también obsoleto por diseño | Suite sin fallos |

## 2. Verificación del Lead

- **Suite completa:** `194 passed, 10 skipped, 0 failed` (ejecutado por Lead) ✓
- **S4=86.1 confirmado por ejecución propia** — la higiene no movió ningún score ✓
- R4 flag OFF=73.17 reportado inmutable ✓
- SKILL.md §13 (13.1 sweep · 13.2 política de tipos · 13.3 triage) ✓
- Nota menor: las actas de Fase C quedaron en `currify-core/docs/debug/` (las previas están en `docs/debug/` raíz) — inconsistencia cosmética documentada aquí.

## 3. Escalados y resolución del Tech Lead

1. 🔴 **Bug latente confirmado:** `get_años_experiencia()` crashea (`AttributeError`) si `periodo=None`. El cast de Fase C preserva el crash byte-a-byte por regla dura. **Pendiente de decisión:** se recomienda guard defensivo (retornar 0 para entradas sin periodo) como micro-fix delegado — requiere aprobación del usuario.
2. 🟡 Headline senior: grado vs cargo — **ratificado diseño vigente** (headline > education-junior, coherente con `aabd949`).
3. ⚪ Backlog tipado fuera del inventario SDD (tests/*, file_parser_service.py) — queda en backlog documentado (acta §5).

## 4. Restricciones confirmadas

Pesos intocables · overall determinista · judge/semáforos/caches intactos · cero llamadas LLM nuevas · bandas fijas · sin cambios HTTP · back/front intocados · tests existentes sin editar salvo eliminaciones justificadas de 4c con acta.

---

# 🏁 CIERRE DEL SDD CALIDAD DE SCORING FASE 2

| Fase | Alcance | Resultado clave |
|---|---|---|
| A | P1 logistics geo + P2 trajectory real | Kill silencioso eliminado: S4 75→**86.1**; trajectory 70→92 |
| B | P3 re-clasificación mandatory/nice | R4 73.17→**74.60** con flag ON (OFF = idéntico); harness guardarraíl operativo |
| C | P4 higiene técnica | Suite **0 failed**, 0 warnings Pydantic, pyright limpio en módulos tocados |

**Salud final del pipeline:** techo estructural ~93.1 · fixture parvularia 86.1 strong_fit · campaña real réplica 74.6 (flag ON) · producción validada 36→60→(~65 esperado post-deploy Fases A+B).
