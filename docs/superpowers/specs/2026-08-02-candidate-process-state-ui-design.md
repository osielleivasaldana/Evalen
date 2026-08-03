# Spec: Estado de candidato derivado del proceso (ETAPA, botón y tabs)

**Fecha:** 2026-08-02
**Estado:** Aprobado por el usuario

## Contexto

En el listado de candidatos de una campaña (`CandidatesManagerNew`), un candidato con un proceso ya iniciado aparece como "En revisión" cuando su `candidateStatus` en BD está desactualizado (caso real: candidata "Marta George Quiroz" con `candidateStatus = NEW` pero un `process_instances` activo en etapa 2).

El frontend hoy solo conoce el estado del proceso a través de `candidateStatus`, y el backend no incluye información de procesos en el listado de candidatos. Esto produce tres síntomas:

1. La columna **ETAPA** muestra "En revisión" en vez de la etapa real del proceso.
2. El botón del drawer muestra **"Avanzar en el proceso"** (abre el modal de iniciar proceso) en vez de **"Ver proceso"**, fallando silenciosamente porque el backend rechaza duplicados.
3. El candidato no aparece en el tab **"En Proceso"** (el filtro depende de `candidateStatus`).

## Objetivo

Que la UI derive el estado de proceso desde la existencia real del `ProcessInstance`, no del `candidateStatus` (que puede estar desactualizado).

## Cambios

### 1. Backend — `currify-back/src/candidates/candidates.service.ts`

Incluir el proceso con su etapa activa en:

- `findAll` (GET /candidates?campaignId=…) — usado por el listado.
- `findOne` (GET /candidates/:id) — usado por el drawer.

Include a agregar:

```ts
processInstances: {
  select: {
    id: true,
    currentStageOrder: true,
    endDate: true,
    stageInstances: {
      where: { status: 'ACTIVE' },
      select: { id: true, status: true, stageTemplate: { select: { id: true, name: true, order: true } } }
    }
  }
}
```

No requiere migración (relación Prisma existente).

### 2. Frontend — tipos en `currify-front/src/services/api.ts`

```ts
export interface CandidateProcessInfo {
  id: string;
  currentStageOrder: number;
  endDate?: string;
  stageInstances: {
    id: string;
    status: StageStatus;
    stageTemplate: { id: string; name: string; order: number };
  }[];
}
```

Agregar campo opcional `processInstances?: CandidateProcessInfo[]` a la interface `Candidate`.

### 3. Frontend — `CandidatesManagerNew.tsx` (listado)

- Helper `hasProcess(c: Candidate): boolean` → `c.processInstances?.length > 0`.
- Helper `getActiveStageName(c: Candidate): string | null` → nombre del `stageTemplate` de la etapa `ACTIVE` (o primera) del primer proceso.
- **Tabs excluyentes** (cada candidato pertenece a un solo tab):
  - `Todos` (`all`): sin proceso y `candidateStatus !== 'NOT_SELECTED'`.
  - `Top 10` (`top10`): mismo pool que `Todos`, rankeado por score, slice 10.
  - `En Proceso` (`process`): con proceso o `candidateStatus` en `IN_PROCESS`/`SELECTED`.
  - `Descartados` (`rejected`): `NOT_SELECTED` (sin cambio).
- **Columna ETAPA:** si `hasProcess` → nombre real de la etapa activa con estilo de chip "en proceso" (tonos good); si no → mapeo `mapStage` actual.
- **Stats cards:**
  - Total: candidatos no descartados (incluye en proceso). Sin cambio.
  - En proceso: cantidad con `hasProcess`.
  - Por revisar: `candidateStatus === 'NEW'` y sin proceso.
  - Descartados: sin cambio.
- **`handleCandidateSelect`:** cargar el proceso (`getProcess`) también cuando `candidateStatus === 'NEW'` pero el candidato tiene proceso.

### 4. Frontend — `CandidateDrawer.tsx` (sidebar)

- Botón principal del footer:
  - Con proceso (`candidate.processInstances?.length > 0`): label **"Ver proceso"** → `onViewProcess(candidate)`. Si `onViewProcess` no está disponible (Dashboard), fallback al comportamiento actual.
  - `NEW` sin proceso: "Avanzar en el proceso" → `onStartProcess` (modal). Sin cambio.
  - `NOT_SELECTED` sin proceso: "Reactivar candidato" → `onStartProcess`. Sin cambio.
- Chip de etapa del header: si hay proceso → nombre real de la etapa activa; si no → mapeo actual.

## Fuera de alcance

- No se corrige el dato histórico de BD (candidateStatus de Marta). La UI lo maneja derivando del proceso.
- No se cambia `Dashboard.tsx` (sus datos no incluyen `processInstances`; el drawer degrada al comportamiento actual sin romperse).
- No se toca `CandidateDetail.tsx` ni el backend de procesos.

## Verificación

- `npx tsc --noEmit` en `currify-front` sin errores.
- Hot reload activo en ambos contenedores (`start:dev` / `npm start`).
- Prueba manual en `localhost:3000/campaigns/cmrzfso7j0002pw1hvnec6r3o`:
  - Marta aparece solo en tab "En Proceso" con ETAPA = nombre de su etapa activa.
  - El drawer de Marta muestra "Ver proceso" y navega al panel de proceso.
  - Los candidatos sin proceso siguen en "Todos" con comportamiento actual.
