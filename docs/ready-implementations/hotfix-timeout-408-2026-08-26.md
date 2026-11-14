# Hotfix Timeout 408 — Judge Paralelizado + Timeout Configurable

**Fecha:** 2026-08-26
**Estado:** ✅ Implementado y verificado (CORE + BACKEND)
**Incidente:** `HttpException: Scoring service timeout. The evaluation is taking too long.` (408) en `documents.service.ts:181 → scoring.service.ts:355-361`
**Evidencia previa:** `POST /scoring/evaluate` con `timeout: 120000` rígido (2 min) + `ETIMEDOUT/ECONNABORTED → 408`

---

## 1. Causa raíz

120s rígidos desalineados con la latencia de cola del pipeline del core:

| Fuente | Evidencia | Peso en latencia |
|---|---|---|
| Judge secuencial (hotfix parvularia) | `scoring_service.py:699` loop secuencial | Hasta 6 × 30s ≈ 180s solo en judges |
| Backoff exponencial | `llm_service.py:278` `max_retries=10`, waits 2→60s | Una etapa bajo 429 puede quemar minutos |
| Semáforo global LLM | `llm_service.py:33` contención entre extracción/scoring concurrentes | Multiplica lo anterior |

El caso típico cabe en 120s; el p99 bajo provider lento/rate-limit ya no.

## 2. Solución (sin cambios de contrato HTTP)

| Fase | Cambio | Archivo |
|---|---|---|
| CORE | Judge paralelizado máx 3 concurrentes con `Semaphore(3)` + `gather`; presupuesto `MAX=6`, cache `(skill,hash)`, evidencia literal y `sorted` prioridad intactos; log `⏱️` wall-time por bloque | `currify-core/app/services/scoring_service.py` |
| BACKEND | `SCORING_TIMEOUT_MS` configurable via `ConfigService` (env, default `180000` = 3 min, guarda contra NaN/≤0) + log `in Xms (timeout Yms)` en éxito y `after Xms` en error | `currify-back/src/scoring/scoring.service.ts`, `.env.example` |

## 3. Verificación del Lead

- **CORE:** `test_hotfix_timeout_core.py` 5 passed (max_concurrent=3, wall-time 0.20-0.24s vs 0.60-0.66s secuencial, cache y presupuesto intactos) · suite obligatoria `21+5=26 passed` re-ejecutada ✅
- **BACKEND:** `scoring.service.spec.ts` 8 passed · build Nest OK · evidencia env: default 180000, custom 250000, invalid→180000, cascada `ECONNRESET→503 / error.response→status / ETIMEDOUT→408` preservada ✅
- **Operación:** flag de medición `RUBRIC_TIER_RECLASS` (Fase B) ya está env-guarded; el timeout solo es infra y no toca `docs/api-standards.md` §1/§2.

## 4. Despliegue

```bash
# En currify-back agregar si se quiere tunear; sin env, default 180s
SCORING_TIMEOUT_MS=180000
# En currify-core no hay env nuevo — el fix es de concurrencia local
```

Recomendación: observar los nuevos logs `Scoring service responded ... in Xms (timeout Yms)` y `⏱️ Skill Judge bloque wall-time` para ajustar fino si tu proveedor tiene p99 >3 min (sube a 240000). La reducción de muro del judge es ~−65% (-0.42s por 6 judges mockeados), así que sin rate-limit extremo la Fase CORE ya evita la mayoría de 408.
