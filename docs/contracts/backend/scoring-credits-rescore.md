# Backend Contract: Scoring Module — Consumo de Créditos + Límite por Operación + Progreso de Rescore

## 📋 Overview

Este documento especifica los cambios realizados en el módulo de Scoring/Campaigns para implementar:
1. Consumo de 1 crédito CV por cada candidato rescoreado exitosamente
2. Límite de máximo 100 candidatos por operación de rescore masivo
3. Nuevo endpoint de progreso para que el frontend pueda mostrar avance

## 🔗 API Endpoints

### `POST /api/candidates/:id/rescore`
- **Purpose:** Re-evalúa un candidato individual (ya existente)
- **Guard:** `JwtAuthGuard`
- **Request:** Autenticación JWT (Bearer token)
- **Response:** Objeto de scoring
- **Creditos:** Consume 1 crédito CV si el rescore es exitoso
- **Error 402:** `"Créditos insuficientes para reevaluar candidato. Adquiere más créditos para continuar."`

### `POST /api/campaigns/:id/rescore-all`
- **Purpose:** Dispara rescore asíncrono de todos los candidatos OUTDATED de una campaña
- **Guard:** `JwtAuthGuard` + `RolesGuard('ADMIN', 'RECRUITER')`
- **Request:** Autenticación JWT (Bearer token)
- **Response:** `{ message: "Rescore iniciado", campaignId: string }`
- **Limit:** Máximo 100 candidatos procesados por operación
- **Creditos:** Consume 1 crédito CV por cada candidato rescoreado exitosamente
- **Nota:** El rescore corre en background. Si un candidato individual falla (ej. créditos insuficientes), los demás continúan.

### `GET /api/campaigns/:id/rescore-status`
- **Purpose:** Obtiene el estado actual del rescore de una campaña (conteo por scoringStatus)
- **Guard:** `JwtAuthGuard`
- **Request:** Autenticación JWT (Bearer token)
- **Response:**
```json
{
  "total": 150,
  "current": 50,
  "outdated": 97,
  "pending": 3
}
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `total` | number | Total de candidatos en la campaña |
| `current` | number | Candidatos con scoring actualizado |
| `outdated` | number | Candidatos con scoring desactualizado (requieren rescore) |
| `pending` | number | Candidatos en proceso de evaluación |

## 💳 Política de Créditos

### Reglas de consumo
1. **Verificación previa:** Se verifica que el usuario tenga `cvCredits > 0` ANTES de comenzar el rescore
2. **Deducción post-éxito:** El crédito SOLO se descuenta si el rescore es EXITOSO (dentro del `try`, no en `finally` ni `catch`)
3. **Error 402 Payment Required:** Si el usuario no tiene créditos, se lanza `HttpException` con `status: 402`
4. **Batch continúa:** Si un rescore individual falla por créditos insuficientes dentro de `rescoreCampaign`, los demás candidatos continúan procesándose normalmente

### Códigos de error
| Status | Código | Mensaje |
|--------|--------|---------|
| 402 | `PAYMENT_REQUIRED` | "Créditos insuficientes para reevaluar candidato. Adquiere más créditos para continuar." |

## 📐 Arquitectura

### Flujo de `rescoreCampaign()`
```
rescoreCampaign(campaignId, userId)
  → Buscar candidatos OUTDATED + COMPLETED
  → Limitar a MAX_RESCORE=100 si excede
  → Por cada candidato (semáforo de 3 concurrentes):
      → reevaluateCandidate(candidate.id, userId)
          → Verificar cvCredits > 0 (si no → 402, pero batch continúa)
          → deleteMany scoring antiguo
          → evaluateCandidate()
          → Si éxito: decrementar cvCredits en 1
          → Si falla: NO descontar crédito, error se loggea pero batch continúa
  → Retorna { total, started, limited }
```

### Flujo de `rescoreAll()` en campaigns.service
```
rescoreAll(id, userId)
  → Validar que campaña existe y pertenece al usuario
  → Llamar this.scoringService.rescoreCampaign(id, userId) en background (.catch)
  → Retornar inmediatamente { message: 'Rescore iniciado', campaignId }
```

## 📁 Archivos Modificados/Creados

| Archivo | Estado | Propósito |
|---------|--------|-----------|
| `src/scoring/scoring.service.ts` | Modificado | `reevaluateCandidate()` ahora acepta `userId` y verifica/descuna créditos. `rescoreCampaign()` acepta `userId`, limita a 100 candidatos, retorna `limited`. |
| `src/scoring/scoring.service.spec.ts` | **NEW** | 8 tests unitarios: créditos insuficientes, consumo post-éxito, no consumo en fallo, límite 100, batch continúa en fallo. |
| `src/campaigns/campaigns.service.ts` | Modificado | `rescoreAll()` pasa `userId`. Nuevo método `getRescoreStatus()`. |
| `src/campaigns/campaigns.controller.ts` | Modificado | `rescoreAll()` extrae `userId` del request. Nuevo endpoint `GET :id/rescore-status`. |
| `src/candidates/candidates.controller.ts` | Modificado | `rescoreCandidate()` pasa `req.user.id` al servicio. |

## 🧪 Tests

| Archivo | Tests | Coverage |
|---------|-------|----------|
| `src/scoring/scoring.service.spec.ts` | 8 | `reevaluateCandidate()` (5 tests), `rescoreCampaign()` (3 tests) |

**Tests incluidos:**
1. ✅ `reevaluateCandidate` → throw 404 si usuario no existe
2. ✅ `reevaluateCandidate` → throw 402 si créditos = 0
3. ✅ `reevaluateCandidate` → throw 402 si créditos negativos
4. ✅ `reevaluateCandidate` → consume 1 crédito solo tras éxito
5. ✅ `reevaluateCandidate` → NO consume crédito si falla
6. ✅ `rescoreCampaign` → limited=false cuando no hay candidatos
7. ✅ `rescoreCampaign` → limita a 100 cuando hay más
8. ✅ `rescoreCampaign` → continúa procesando si un candidato falla

**Total suite: 67 tests, 7 suites — All passing ✅**

## 🔧 Notas de Migración

### Firma cambiada: `reevaluateCandidate()`
```typescript
// Antes
async reevaluateCandidate(candidateId: string): Promise<any>

// Después
async reevaluateCandidate(candidateId: string, userId: string): Promise<any>
```

### Firma cambiada: `rescoreCampaign()`
```typescript
// Antes
async rescoreCampaign(campaignId: string): Promise<{ total: number; started: number }>

// Después
async rescoreCampaign(campaignId: string, userId: string): Promise<{ total: number; started: number; limited: boolean }>
```

### Nuevo: `getRescoreStatus()`
```typescript
async getRescoreStatus(id: string, userId: string): Promise<{
  total: number;
  current: number;
  outdated: number;
  pending: number;
}>
```
