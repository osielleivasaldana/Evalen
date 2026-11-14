# Fase B SDD Scoring Fase 2 — Re-clasificación Mandatory/Nice-to-Have (P3)

**Fecha:** 2026-08-26
**Estado:** ✅ Implementado, verificado y ratificado — flag `RUBRIC_TIER_RECLASS` en OFF pendiente de activación por Tech Lead tras validación en staging
**Responsable técnico:** @core-expert (delegado por Tech Lead)
**Especificación:** `docs/SDD Calidad de Scoring Fase 2 - Currify Core.md` §4.3, §8-Fase B, §9
**Acta de decisiones:** `docs/debug/2026-08-26-fase-b-rubric-tier.md` (D1–D5 ratificadas)

---

## 1. Implementado

| Capa | Solución | Archivo(s) |
|---|---|---|
| 1 · Prompt | Few-shots de clasificación + contraejemplo obligatorio ("herramientas tecnológicas básicas"→nice) en RUBRIC_EXTRACTION | `dynamic_rubric_service.py` |
| 2 · Clasificador | Léxico puro determinista: solo DEGRADA a nice con evidencia explícita; jamás promueve; precedencia mandatory-fuerte>nice (D1); pista básicas-herramientas por co-ocurrencia (D2) | `app/services/rubric_tier_classifier.py` (nuevo) |
| Post-procesado | Tras anti-soft, gated por flag env `RUBRIC_TIER_RECLASS` default OFF (byte-a-byte idéntico demostrado) | `dynamic_rubric_service.py`, `config.py` |
| Observabilidad | Log `[TIER-RECLASS]` + buffer de eventos + mirror best-effort a analytics sin cambios HTTP (D4) | clasificador |
| Guardarraíl | Harness re-ejecutable todos los fixtures+goldens OFF vs ON con exit code | `dev/harness_rubric_tier.py` |

## 2. Verificación del Lead

- **Tests:** 93 passed en los 5 archivos obligatorios (22 nuevos + 71 previos) ✓ · eval parvularia y qa_lead verdes según reporte de suite (196 passed global, fallos pre-existentes documentados)
- **Flag OFF ≡ baseline Fase A:** R4=73.17 / S4=86.1 dígito a dígito ✓
- **Skill §12** documentada ✓ · Acta D1–D5 ratificada ✓

## 3. Resultados harness (flag ON)

| Escenario | OFF | ON | Δ |
|---|---|---|---|
| parvularia_golden_job | 86.1 | 86.1 | 0 |
| **parvularia_campana_real_R4** | 73.17 | **74.60** | **+1.43** |
| qa_lead_golden_job | 87.3 | 87.3 | 0 |

Criterios bloqueantes: ningún golden cae >2 pts ✓ · objetivo SDD §10 (R4 ≥74) **cumplido** ✓

## 4. Resolución Tech Lead del hallazgo F1

El acta escala que la estimación "+2 pts" no se alcanzó (+1.43): la campaña tiene exactamente UN falso mandatory con crédito 0; degradarlo mueve el denominador 7→6 ⇒ +1.43 exactos.

**Resolución: NO se amplía el léxico nice en esta fase.**
1. El criterio normativo es SDD §10 (R4 ≥74): **cumplido**. El "+2" era estimación de §4.3, no compromiso.
2. Ampliar léxico sin evidencia de producto arriesga sobre-degradación transversal — justo lo que el guardarraíl protege.
3. Los eventos de observabilidad (D4) acumularán frases reales candidatas; una expansión futura será data-driven con su propio harness.

## 5. Restricciones confirmadas

Pesos intocables · overall determinista · judge intacto (judge_calls idénticos OFF/ON) · cero llamadas LLM nuevas · semáforos/caches intactos · bandas fijas · sin cambios HTTP · tests existentes sin editar.

## 6. Pendiente

- **Ops:** activación de `RUBRIC_TIER_RECLASS` en staging → checklist deploy SDD §9 → flip en prod (decisión del Tech Lead con usuario).
- Fase C (P4 higiene técnica).
