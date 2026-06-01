# SDD: Edición de Campañas con Reevaluación de Candidatos

## Versión
**v1.0** — 01 Junio 2026

---

## Resumen Ejecutivo

Actualmente, una campaña con candidatos asociados no puede editarse bajo ninguna circunstancia (bloqueo total con `403 Forbidden`). Este SDD propone un mecanismo que permite la edición **con consecuencias controladas**: los scores existentes se invalidan, los candidatos se marcan para reevaluación, y el usuario puede disparar un rescore masivo o individual desde la UI.

---

## 1. Problema

### 1.1 Estado Actual

- **Backend** (`campaigns.service.ts:278-282`): Cualquier `PATCH /campaigns/:id` lanza `ForbiddenException` si `campaign._count.candidates > 0`.
- **Frontend** (`EditCampaign.tsx:699-714`): Solo deshabilita el paso de etapas (Step 4), pero los pasos 1-3 se ven editables y el usuario los llena... para recibir un 403 del backend.
- **Asimetría UX**: El frontend permite editar información básica, descripción y condiciones, pero el backend siempre rechaza el guardado.

### 1.2 Consecuencias

| Actor | Problema |
|-------|----------|
| Reclutador | No puede corregir errores en la descripción del cargo si ya llegaron postulantes |
| Reclutador | No puede ajustar requisitos o salario aunque el mercado haya cambiado |
| Sistema | No hay forma de mantener candidatos y actualizar su match con la nueva configuración |

---

## 2. Solución Propuesta

### 2.1 Principios de Diseño

1. **No perder datos de candidatos** — nombres, CVs, historial de proceso se conservan
2. **Transparencia** — el usuario entiende el impacto antes de editar
3. **Acción diferida** — el rescore no ocurre automaticamente al editar; el usuario decide cuándo
4. **Granularidad** — se puede reevaluar un candidato individual o todos a la vez

### 2.2 Flujo de Alto Nivel

```
[Editar campaña con candidatos]
        │
        ▼
[Modal de advertencia]
  "Esta campaña tiene X candidatos.
   Al editar: los scores se eliminarán
   y los candidatos quedarán marcados
   para reevaluación."
        │
   (acepta)
        ▼
[Backend: PATCH /campaigns/:id]
  1. Actualiza campos de la campaña
  2. Elimina CandidateScoring (todos)
  3. Candidate.scoringStatus = OUTDATED (todos)
  4. Invalida parsedJobData
        │
        ▼
[CandidatesManager muestra:]
  ⚠️ Banner naranjo: "X candidatos
     necesitan reevaluación"
     [ Reevaluar Todos ]
  
  Cada fila: badge "Score desactualizado"
     + botón [ Reevaluar ]
```

---

## 3. Diseño Detallado

### 3.1 Modelo de Datos

#### 3.1.1 Nuevo Enum `ScoringStatus`

```prisma
// prisma/schema.prisma
enum ScoringStatus {
  CURRENT
  OUTDATED
  PENDING
}
```

#### 3.1.2 Nuevo Campo en `Candidate`

```prisma
model Candidate {
  // ... campos existentes ...
  processingStatus ProcessingStatus @default(PENDING)
  scoringStatus    ScoringStatus    @default(CURRENT)  // NUEVO
  candidateStatus  CandidateStatus  @default(NEW)
  // ...
}
```

#### 3.1.3 Semántica de `ScoringStatus`

| Valor | Significado | UI |
|-------|-------------|----|
| `CURRENT` | Score válido y actualizado | Muestra score normalmente |
| `OUTDATED` | Score eliminado, esperando rescore | Badge "Score desactualizado", score oculto |
| `PENDING` | Rescore en progreso (transitorio) | Spinner o "Reevaluando..." |

---

### 3.2 Backend

#### 3.2.1 `campaigns.service.ts` — Modificación de `update()`

**Archivo:** `currify-back/src/campaigns/campaigns.service.ts`

**Cambios:**

1. **Remover bloqueo total** (eliminar líneas 277-282): En vez de lanzar `ForbiddenException`, permitir la edición.

2. **Validación selectiva de stages**: Solo bloquear `stageTemplates` si existen `processInstances` activas (candidatos en proceso), no por el mero hecho de tener candidatos.

3. **Invalidación de scores post-update**: Si `campaign._count.candidates > 0`, ejecutar después del update:
   ```typescript
   await this.prisma.candidateScoring.deleteMany({
     where: { candidate: { campaignId: id } }
   });
   await this.prisma.candidate.updateMany({
     where: { campaignId: id },
     data: { scoringStatus: 'OUTDATED' }
   });
   ```

4. **Respuesta extendida**: Devolver `scoringInvalidated: true` en el response para que el frontend muestre feedback.

```typescript
async update(id: string, userId: string, updateCampaignDto: UpdateCampaignDto) {
  const campaign = await this.prisma.campaign.findUnique({
    where: { id },
    include: { _count: { select: { candidates: true } } }
  });

  if (!campaign) throw new NotFoundException('Campaign not found');
  if (campaign.userId !== userId) throw new ForbiddenException('You can only update your own campaigns');

  const { stageTemplates, ...campaignData } = updateCampaignDto;
  const hasCandidates = campaign._count.candidates > 0;

  if (stageTemplates) {
    // Solo bloquear si hay procesos activos, no por tener candidatos
    if (hasCandidates) {
      const activeProcesses = await this.prisma.processInstance.count({
        where: { campaignId: id }
      });
      if (activeProcesses > 0) {
        throw new ForbiddenException('Cannot edit stages because candidates are already in a selection process.');
      }
    }
    // ... transacción existente para stages ...
  }

  const updated = /* update normal o con stages (según corresponda) */;

  // Post-update: invalidar scores si había candidatos
  if (hasCandidates) {
    await this.prisma.candidateScoring.deleteMany({
      where: { candidate: { campaignId: id } }
    });
    await this.prisma.candidate.updateMany({
      where: { campaignId: id },
      data: { scoringStatus: 'OUTDATED' }
    });
  }

  return { ...updated, scoringInvalidated: hasCandidates };
}
```

#### 3.2.2 `campaigns.service.ts` — Nuevo método `rescoreAll()`

```typescript
async rescoreAll(id: string, userId: string) {
  const campaign = await this.prisma.campaign.findUnique({
    where: { id },
    select: { userId: true }
  });
  if (!campaign) throw new NotFoundException();
  if (campaign.userId !== userId) throw new ForbiddenException();

  // Disparar rescore asíncrono en background
  this.scoringService.rescoreCampaign(id).catch(err =>
    this.logger.error(`rescoreAll failed for campaign ${id}:`, err)
  );

  return { message: 'Rescore iniciado', campaignId: id };
}
```

#### 3.2.3 `scoring.service.ts` — Modificación de `evaluateCandidate()`

**Archivo:** `currify-back/src/scoring/scoring.service.ts`

**Cambio clave**: El short-circuit actual (`if candidate.scoring`) debe respetar `scoringStatus`.

```typescript
async evaluateCandidate(candidateId: string) {
  const candidate = await this.prisma.candidate.findUnique({
    where: { id: candidateId },
    include: {
      campaign: { include: { user: true } },
      scoring: true,
      documents: { where: { processingStatus: 'COMPLETED' }, take: 1 }
    }
  });

  // ... validaciones existentes ...

  // Short-circuit solo si está CURRENT y ya tiene scoring
  if (candidate.scoring && candidate.scoringStatus === 'CURRENT') {
    return candidate.scoring;
  }

  // Si está OUTDATED, limpiar y marcar como PENDING
  if (candidate.scoringStatus === 'OUTDATED') {
    await this.prisma.candidateScoring.deleteMany({ where: { candidateId } });
    await this.prisma.candidate.update({
      where: { id: candidateId },
      data: { scoringStatus: 'PENDING' }
    });
  }

  // ... lógica existente de parseJobDescription, combineJobData, evaluate ...

  // Al finalizar exitosamente, marcar como CURRENT
  await this.prisma.candidate.update({
    where: { id: candidateId },
    data: { scoringStatus: 'CURRENT' }
  });

  return createdScoring;
}
```

#### 3.2.4 `scoring.service.ts` — Nuevo método `rescoreCampaign()`

```typescript
async rescoreCampaign(campaignId: string) {
  const candidates = await this.prisma.candidate.findMany({
    where: {
      campaignId,
      scoringStatus: 'OUTDATED',
      processingStatus: 'COMPLETED'
    },
    select: { id: true }
  });

  if (candidates.length === 0) return { total: 0, started: 0 };

  const semaphore = new Semaphore(3); // máx 3 concurrentes
  const promises = candidates.map(c =>
    semaphore.run(() => this.reevaluateCandidate(c.id))
  );

  await Promise.allSettled(promises);

  return { total: candidates.length, started: candidates.length };
}
```

#### 3.2.5 Nuevos Endpoints

**`campaigns.controller.ts`:**

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'RECRUITER')
@Post(':id/rescore-all')
rescoreAll(@Param('id') id: string, @Request() req: any) {
  return this.campaignsService.rescoreAll(id, req.user.id);
}
```

**`candidates.controller.ts`:**

```typescript
@UseGuards(JwtAuthGuard)
@Post(':id/rescore')
rescoreCandidate(@Param('id') id: string) {
  return this.scoringService.reevaluateCandidate(id);
}
```

> **Nota:** Verificar que `ScoringModule` esté importado en `CandidatesModule` para que la inyección de `ScoringService` funcione.

---

### 3.3 Frontend

#### 3.3.1 Tipos (`api.ts`)

```typescript
// Nuevo tipo
type ScoringStatus = 'CURRENT' | 'OUTDATED' | 'PENDING';

// Candidate modificado
interface Candidate {
  // ... campos existentes ...
  scoringStatus?: ScoringStatus;  // NUEVO
  scoring?: CandidateScoring | null;
}

// Campaign modificado
interface Campaign {
  // ... campos existentes ...
  scoringInvalidated?: boolean;   // NUEVO
}
```

Nuevos métodos en `ApiService`:

```typescript
async rescoreCampaign(campaignId: string): Promise<any> {
  return this.apiCall(`/campaigns/${campaignId}/rescore-all`, { method: 'POST' });
}

async rescoreCandidate(candidateId: string): Promise<any> {
  return this.apiCall(`/candidates/${candidateId}/rescore`, { method: 'POST' });
}
```

#### 3.3.2 Modal de Advertencia (`EditCampaign.tsx`)

**Trigger:** Usuario completa el formulario y hace clic en "Actualizar Campaña" mientras `candidateCount > 0`.

**Comportamiento:**
1. Mostrar modal con overlay (blur + semitransparente)
2. Título: "¿Editar campaña con candidatos?"
3. Mensaje: "Esta campaña tiene **X candidatos**. Al editar: los scores actuales se eliminarán y los candidatos quedarán marcados para reevaluación automática."
4. Botón "Cancelar" → cierra el modal, no edita
5. Botón "Entendido, editar de todas formas" → ejecuta `handleSubmit()`

**Después del submit exitoso:** Si `updatedCampaign.scoringInvalidated === true`, mostrar snackbar/alert informando.

```typescript
const [showRescoreWarning, setShowRescoreWarning] = useState(false);

const handleSubmitClick = () => {
  if (candidateCount > 0) {
    setShowRescoreWarning(true);
    return;
  }
  handleSubmit();
};

const handleSubmit = async () => {
  setSaving(true);
  try {
    const updated = await apiService.updateCampaign(campaignId, formData as any);
    if (updated.scoringInvalidated) {
      // Snackbar: "Campaña actualizada. Los candidatos necesitan reevaluación."
    }
    onCampaignUpdated(updated);
  } catch (err: any) {
    // ... manejo de errores ...
  } finally {
    setSaving(false);
  }
};
```

#### 3.3.3 Banner de Reevaluación (`CandidatesManagerNew.tsx`)

**Ubicación:** Entre el header de la campaña y la tabla de candidatos.

**Visibilidad:** Solo cuando `outdatedCount > 0` (candidatos con `scoringStatus === 'OUTDATED'`).

```tsx
{outdatedCount > 0 && (
  <div className="bg-orange-50 border-l-4 border-orange-400 p-4 mb-6 rounded-r-lg">
    <div className="flex items-center justify-between flex-wrap gap-3">
      <div className="flex items-center gap-2">
        <ExclamationTriangleIcon className="w-5 h-5 text-orange-500" />
        <p className="text-sm text-orange-800">
          <span className="font-semibold">{outdatedCount} candidatos</span> necesitan
          reevaluación tras los cambios en la campaña
        </p>
      </div>
      <button onClick={handleRescoreAll} disabled={rescoringAll}
        className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 text-white
                   rounded-lg hover:bg-orange-600 text-sm font-medium
                   disabled:opacity-50">
        <ArrowPathIcon className={`w-4 h-4 ${rescoringAll ? 'animate-spin' : ''}`} />
        {rescoringAll ? 'Reevaluando...' : 'Reevaluar Todos'}
      </button>
    </div>
  </div>
)}
```

#### 3.3.4 Badge y Botón por Candidato (`CandidatesManagerNew.tsx`)

**En la columna de score** (donde hoy se muestra el círculo de score):

```tsx
{candidate.scoringStatus === 'OUTDATED' ? (
  <div className="flex items-center gap-2">
    <span className="text-xs text-orange-700 font-medium bg-orange-50 
                    px-2 py-1 rounded-full border border-orange-200">
      Score desactualizado
    </span>
    <button onClick={() => rescoreSingle(candidate.id)}
            disabled={rescoresInProgress.has(candidate.id)}
            className="text-xs text-orange-600 hover:text-orange-800 underline">
      {rescoresInProgress.has(candidate.id) ? 'Reevaluando...' : 'Reevaluar'}
    </button>
  </div>
) : candidate.scoring?.overallScore ? (
  // ... círculo de score existente ...
) : (
  <span className="text-sm text-gray-400">—</span>
)}
```

**Métodos de acción:**

```typescript
const handleRescoreAll = async () => {
  setRescoringAll(true);
  try {
    await apiService.rescoreCampaign(campaignId);
    setSnackbarMessage('Reevaluación iniciada para todos los candidatos');
    setTimeout(loadData, 3000); // polling para obtener resultados
  } catch (err) {
    setSnackbarMessage('Error al iniciar reevaluación');
  } finally {
    setRescoringAll(false);
  }
};

const rescoreSingle = async (candidateId: string) => {
  setRescoresInProgress(prev => new Set(prev).add(candidateId));
  try {
    await apiService.rescoreCandidate(candidateId);
    setSnackbarMessage('Candidato reevaluado correctamente');
    loadData();
  } catch (err) {
    setSnackbarMessage('Error al reevaluar candidato');
  } finally {
    setRescoresInProgress(prev => {
      const next = new Set(prev);
      next.delete(candidateId);
      return next;
    });
  }
};
```

---

## 4. Especificación de la API

### 4.1 Modificación: `PATCH /api/campaigns/:id`

**Request:** Sin cambios (mismo `UpdateCampaignDto`)

**Response (cambio):**
```json
{
  "id": "...",
  "title": "...",
  "scoringInvalidated": true,
  "_count": { "candidates": 5 },
  "stageTemplates": [...]
}
```

**Nuevos códigos de error:**
- `403` — Solo si se intentan editar `stageTemplates` con procesos de selección activos

### 4.2 Nuevo: `POST /api/campaigns/:id/rescore-all`

**Auth:** JWT + Roles ADMIN/RECRUITER

**Response:**
```json
{
  "message": "Rescore iniciado",
  "campaignId": "abc123"
}
```

**Nota:** El rescore es asíncrono. El frontend debe hacer polling (`loadData()`) para ver los resultados.

### 4.3 Nuevo: `POST /api/candidates/:id/rescore`

**Auth:** JWT

**Response:** Mismo que `GET /api/candidates/:id/structured-data` con el nuevo scoring embebido.

---

## 5. Migración

### 5.1 Prisma Migration

```bash
npx prisma migrate dev --name add_scoring_status
```

Esto generará:
1. Nuevo enum `ScoringStatus` en PostgreSQL
2. Nueva columna `scoring_status` en `candidates` con default `CURRENT`
3. Todos los candidatos existentes heredan `CURRENT` (comportamiento correcto: sus scores son válidos hasta que se edite la campaña)

### 5.2 Rollback

```bash
npx prisma migrate dev --name rollback_add_scoring_status
```

O manualmente:

```sql
ALTER TABLE candidates DROP COLUMN scoring_status;
DROP TYPE "ScoringStatus";
```

---

## 6. Consideraciones Técnicas

### 6.1 Concurrencia

El `rescoreCampaign()` usa un semáforo con max 3 concurrentes para no saturar el LLM. Si hay muchos candidatos (>50), considerar una cola de trabajo (BullMQ) en una iteración futura.

### 6.2 Short-circuit de `evaluateCandidate()`

El short-circuit actual evita rescorear si ya existe scoring. Con el nuevo campo `scoringStatus`, la lógica cambia:
- `CURRENT` + tiene scoring → short-circuit (no rescorear)
- `OUTDATED` + tiene scoring → eliminar scoring y rescorear
- `OUTDATED` + no tiene scoring → rescorear directamente

### 6.3 StageTemplates con Procesos Activos

Si un candidato ya inició un proceso de selección, modificar las etapas podría romper el flujo. Por eso se bloquea solo cuando existen `processInstances`, no cuando hay candidatos sin proceso.

### 6.4 Costo de LLM

Rescorear N candidatos = N llamadas al LLM. El botón "Reevaluar Todos" debe ser consciente de esto. Considerar mostrar una advertencia si `outdatedCount > 10`.

---

## 7. UI/UX Specifications

### 7.1 Modal de Advertencia (EditCampaign)

```
┌──────────────────────────────────────────────┐
│  ⚠️  ¿Editar campaña con candidatos?         │
│                                              │
│  Esta campaña tiene 5 candidatos. Al         │
│  editar, los scores actuales se eliminarán   │
│  y los candidatos quedarán marcados para     │
│  reevaluación.                               │
│                                              │
│  Podrás reevaluarlos desde la vista de la    │
│  campaña cuando quieras.                     │
│                                              │
│         [Cancelar]   [Entendido, editar]     │
└──────────────────────────────────────────────┘
```

### 7.2 Banner en CandidatesManager

```
┌──────────────────────────────────────────────────────────────┐
│  ⚠️  3 candidatos necesitan reevaluación                     │
│      tras los cambios en la campaña                          │
│                                        [ Reevaluar Todos ]   │
└──────────────────────────────────────────────────────────────┘
```

### 7.3 Badge por Candidato

| Score normal | Score desactualizado |
|-------------|---------------------|
| 🟢 85 | 🔶 Score desactualizado [Reevaluar] |
| 🟡 62 | 🔶 Score desactualizado [Reevaluar] |
| 🔴 34 | 🔶 Score desactualizado [Reevaluar] |

---

## 8. Archivos a Modificar

| # | Archivo | Cambio |
|---|---------|--------|
| 1 | `currify-back/prisma/schema.prisma` | Nuevo enum `ScoringStatus`, campo en `Candidate` |
| 2 | `currify-back/src/campaigns/campaigns.service.ts` | Modificar `update()`, agregar `rescoreAll()` |
| 3 | `currify-back/src/campaigns/campaigns.controller.ts` | Agregar `POST :id/rescore-all` |
| 4 | `currify-back/src/candidates/candidates.controller.ts` | Agregar `POST :id/rescore` |
| 5 | `currify-back/src/scoring/scoring.service.ts` | Modificar `evaluateCandidate()`, agregar `rescoreCampaign()` |
| 6 | `currify-front/src/services/api.ts` | Tipos `ScoringStatus`, campos, métodos |
| 7 | `currify-front/src/components/campaigns/EditCampaign.tsx` | Modal de advertencia |
| 8 | `currify-front/src/components/candidates/CandidatesManagerNew.tsx` | Banner, badge, botones |
| 9 | `currify-front/src/components/candidates/CandidateDetail.tsx` (opcional) | Badge + botón rescore |
| 10 | `currify-front/src/components/candidates/CandidateDrawer.tsx` (opcional) | Badge + botón rescore |

---

## 9. Tiempo Estimado

| Fase | Esfuerzo |
|------|----------|
| Migración Prisma | 5 min |
| Backend (service + controller) | 45 min |
| Frontend tipos + API | 15 min |
| Frontend EditCampaign modal | 20 min |
| Frontend CandidatesManager | 30 min |
| Verificación + tests | 15 min |
| **Total** | **~2.5 horas** |

---

## 10. Próximas Iteraciones (Fuera de Scope)

- **Cola de trabajo**: BullMQ para rescore masivo con progreso real
- **Notificaciones**: Campanita in-app cuando el rescore masivo termine
- **Historial de reevaluaciones**: Auditoría de cuándo y por qué se invalidaron scores
- **Rescore automático**: Opción "reevaluar automáticamente al editar" en settings de la campaña
