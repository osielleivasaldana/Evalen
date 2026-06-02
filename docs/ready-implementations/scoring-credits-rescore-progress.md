# Implementación: Créditos de Rescore + Indicador de Progreso

**Fecha:** 2026-06-01
**Estado:** ✅ Completado

## Resumen

Implementación de consumo de créditos CV por rescore de candidatos, límite de seguridad por operación, endpoint de progreso en backend e indicador visual de progreso con modal de confirmación en frontend.

## Cambios Realizados

### Backend (4 archivos modificados)

| Archivo | Cambio |
|---------|--------|
| `src/scoring/scoring.service.ts` | `reevaluateCandidate()` ahora acepta `userId`, verifica créditos (402 si <= 0), descuenta 1 crédito solo tras éxito. `rescoreCampaign()` acepta `userId`, limita a 100 candidatos por operación, retorna `{ total, started, limited }`. |
| `src/campaigns/campaigns.service.ts` | `rescoreAll()` pasa `userId`. Nuevo método `getRescoreStatus()` con conteo agrupado por `scoringStatus`. |
| `src/campaigns/campaigns.controller.ts` | Nuevo endpoint `GET :id/rescore-status`. |
| `src/candidates/candidates.controller.ts` | `POST :id/rescore` ahora pasa `req.user.id`. |

### Frontend (2 archivos modificados)

| Archivo | Cambio |
|---------|--------|
| `src/services/api.ts` | Nuevo tipo `RescoreStatus`, nuevo método `getRescoreStatus()`. |
| `src/components/candidates/CandidatesManagerNew.tsx` | Modal de confirmación con costo estimado, barra de progreso con polling, manejo de error 402. |

## Contrato de API

### `GET /api/campaigns/:id/rescore-status`

```json
{
  "total": 29,
  "current": 5,
  "outdated": 22,
  "pending": 2
}
```

### `POST /api/campaigns/:id/rescore-all`

```json
Response: { "message": "Rescore iniciado", "campaignId": "..." }
```

### Errores

| Código | Significado |
|--------|-------------|
| `402` | Payment Required — Créditos insuficientes |
| `403` | Forbidden — No eres el dueño de la campaña |
| `404` | Not Found — Campaña no existe |

## Reglas de Negocio

1. **1 crédito CV por candidato rescoreado** (todos los planes: FREE, PRO, ENTERPRISE)
2. **El crédito solo se descuenta si el rescore es exitoso** (si falla el LLM, no se cobra)
3. **Máximo 100 candidatos por operación de rescore masivo** (los restantes quedan como OUTDATED)
4. **El batch continúa aunque un candidato individual falle** (no aborta todo)
5. **El rescore individual también consume créditos** (POST /candidates/:id/rescore)

## UX

1. **Modal de confirmación** con costo, créditos disponibles y advertencia si consume >50% del saldo
2. **Barra de progreso animada** con polling cada 2s a `rescore-status`
3. **Mensaje de finalización** "¡N/N reevaluados!" al completar
4. **Timeout de 60s** con mensaje "El proceso continúa en segundo plano"
5. **Snackbar de error 402** en rescore individual
6. **Banner de advertencia** si créditos ≤ 0 y hay candidatos OUTDATED
