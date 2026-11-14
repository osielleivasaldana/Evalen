# Estado de candidato derivado del proceso (ETAPA, botón y tabs) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que el listado de candidatos y el drawer deriven el estado de proceso desde la existencia real del `ProcessInstance` (incluido en el backend) en vez de confiar en `candidateStatus`, corrigiendo ETAPA, el botón "Avanzar"→"Ver proceso" y los tabs excluyentes.

**Architecture:** El backend incluye `processInstances` (con la etapa ACTIVE) en el listado y detalle de candidatos. El frontend usa helpers puros (`hasCandidateProcess`, `getActiveStageName`) para decidir: filtro de tabs (exclusivos), columna ETAPA, stats, y el comportamiento del drawer.

**Tech Stack:** NestJS + Prisma (backend), React (CRA) + TypeScript (frontend). Hot reload activo en ambos contenedores Docker (`nest start --watch` / `npm start` con bind mount).

**Referencias:** Spec aprobado en `docs/superpowers/specs/2026-08-02-candidate-process-state-ui-design.md`.

**Nota sobre tests:** El entorno local no puede ejecutar `App.test.tsx` (fallo preexistente de resolución de `react-router-dom` — los node_modules viven en volumen Docker). Los tests de archivos aislados sí corren (ej. `LandingPage.test.tsx`). Por eso el único test automatizado es para el helper puro; el resto se verifica con `tsc --noEmit` + verificación manual.

---

### Task 1: Backend — incluir `processInstances` en el listado y detalle de candidatos

**Files:**
- Modify: `currify-back/src/candidates/candidates.service.ts:75-95` (`findAll`) y `:97-116` (`findOne`)

- [ ] **Step 1: Agregar el include en `findAll`**

En `findAll` (línea ~78), dentro del objeto `include`, agregar después de `scoring`:

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
        },
```

- [ ] **Step 2: Agregar el mismo include en `findOne`**

En `findOne` (línea ~100), dentro del objeto `include`, después de `scoring: true`:

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
        },
```

- [ ] **Step 3: Verificar compilación**

Run: `npm run build`
Expected: `Successfully compiled` / exit code 0 sin errores.

- [ ] **Step 4: Verificar respuesta del API (hot reload ya lo aplicó)**

Run (PowerShell, desde `C:\Users\osiel\Desktop\Currify`):

```powershell
docker exec currify-postgres psql -U postgres -d currify_db -c "SELECT id FROM candidates WHERE \"campaignId\"='cmrzfso7j0002pw1hvnec6r3o' LIMIT 1;"
```

Luego usar el id obtenido en el navegador (sesión iniciada en localhost:3001) — o, si no se dispone de token, verificar con `Invoke-RestMethod` tras obtener un token por `POST http://localhost:3001/auth/login` con credenciales del usuario. Expected: la respuesta de `GET /candidates?campaignId=cmrzfso7j0002pw1hvnec6r3o` incluye `processInstances` con la etapa ACTIVE para Marta (`cmrzhphp3000jpw1h3gko36jb`).

- [ ] **Step 5: Commit**

```bash
git add currify-back/src/candidates/candidates.service.ts
git commit -m "feat: incluir processInstances con etapa activa en listado y detalle de candidatos"
```

---

### Task 2: Frontend — tipos `CandidateProcessInfo` + helper puro con test

**Files:**
- Modify: `currify-front/src/services/api.ts` (interface `Candidate`, ~línea 384; después de `StageInstance`, ~línea 411)
- Create: `currify-front/src/utils/candidateProcess.ts`
- Create: `currify-front/src/utils/candidateProcess.test.ts`

- [ ] **Step 1: Escribir el test que falla**

Crear `currify-front/src/utils/candidateProcess.test.ts`:

```ts
import { hasCandidateProcess, getActiveStageName } from './candidateProcess';

describe('candidateProcess helpers', () => {
  const withProcess = {
    processInstances: [{
      id: 'p1',
      currentStageOrder: 2,
      stageInstances: [
        { id: 's1', status: 'ACCEPTED', stageTemplate: { id: 't1', name: 'Contactar', order: 1 } },
        { id: 's2', status: 'ACTIVE', stageTemplate: { id: 't2', name: 'Entrevista técnica', order: 2 } }
      ]
    }]
  } as any;

  it('detecta candidato con proceso', () => {
    expect(hasCandidateProcess(withProcess)).toBe(true);
    expect(hasCandidateProcess({ processInstances: [] } as any)).toBe(false);
    expect(hasCandidateProcess({} as any)).toBe(false);
  });

  it('devuelve el nombre de la etapa activa', () => {
    expect(getActiveStageName(withProcess)).toBe('Entrevista técnica');
  });

  it('devuelve null sin proceso', () => {
    expect(getActiveStageName({} as any)).toBeNull();
  });
});
```

- [ ] **Step 2: Ejecutar el test para verificar que falla**

Run (PowerShell):

```powershell
$env:CI="true"; npx react-scripts test --watchAll=false src/utils/candidateProcess.test.ts
```

Expected: FAIL con "Cannot find module './candidateProcess'" (el módulo aún no existe).

- [ ] **Step 3: Crear la interface en `api.ts`**

Insertar justo antes de `export interface ProcessInstance` (línea ~427), y agregar el campo a `Candidate` (después de `campaign?: Campaign;` en línea ~392):

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

En `Candidate`:

```ts
  campaign?: Campaign;
  processInstances?: CandidateProcessInfo[];
```

- [ ] **Step 4: Crear el helper puro**

Crear `currify-front/src/utils/candidateProcess.ts`:

```ts
import { Candidate, CandidateProcessInfo } from '../services/api';

export function getCandidateProcess(c: Pick<Candidate, 'processInstances'>): CandidateProcessInfo | undefined {
  return c.processInstances?.[0];
}

export function hasCandidateProcess(c: Pick<Candidate, 'processInstances'>): boolean {
  return !!getCandidateProcess(c);
}

export function getActiveStageName(c: Pick<Candidate, 'processInstances'>): string | null {
  const p = getCandidateProcess(c);
  if (!p) return null;
  const active = p.stageInstances.find(s => s.status === 'ACTIVE');
  return (active || p.stageInstances[0])?.stageTemplate?.name || null;
}
```

- [ ] **Step 5: Ejecutar el test para verificar que pasa**

Run:

```powershell
$env:CI="true"; npx react-scripts test --watchAll=false src/utils/candidateProcess.test.ts
```

Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add currify-front/src/services/api.ts currify-front/src/utils/candidateProcess.ts currify-front/src/utils/candidateProcess.test.ts
git commit -m "feat: tipos CandidateProcessInfo y helpers de proceso para candidatos"
```

---

### Task 3: Frontend — `CandidatesManagerNew.tsx`: tabs excluyentes, ETAPA real, stats y carga de proceso

**Files:**
- Modify: `currify-front/src/components/candidates/CandidatesManagerNew.tsx`

- [ ] **Step 1: Importar helpers**

Agregar a los imports (después de la línea 25 `import CandidateDrawer from './CandidateDrawer';`):

```ts
import { hasCandidateProcess, getActiveStageName } from '../../utils/candidateProcess';
```

- [ ] **Step 2: Filtros de tabs excluyentes**

Reemplazar el bloque `filteredCandidates` (líneas 180-205) por:

```ts
  const filteredCandidates = useMemo(() => {
    let result = [...candidates];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c =>
        c.name.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q)
      );
    }
    if (activeTabFilter === 'process') {
      result = result.filter(c => hasCandidateProcess(c) || c.candidateStatus === 'IN_PROCESS' || c.candidateStatus === 'SELECTED');
    } else if (activeTabFilter === 'top10') {
      result = result.filter(c => c.candidateStatus !== 'NOT_SELECTED' && !hasCandidateProcess(c))
        .sort((a, b) => calculateScore(b) - calculateScore(a))
        .slice(0, 10);
    } else if (activeTabFilter === 'new') {
      result = result.filter(c => c.candidateStatus === 'NEW');
    } else if (activeTabFilter === 'rejected') {
      result = result.filter(c => c.candidateStatus === 'NOT_SELECTED');
    } else if (activeTabFilter === 'all') {
      result = result.filter(c => c.candidateStatus !== 'NOT_SELECTED' && !hasCandidateProcess(c));
    }
    if (sortKey === 'match') result.sort((a, b) => calculateScore(b) - calculateScore(a));
    else if (sortKey === 'match-asc') result.sort((a, b) => calculateScore(a) - calculateScore(b));
    else if (sortKey === 'name') result.sort((a, b) => a.name.localeCompare(b.name, 'es'));
    return result;
  }, [candidates, activeTabFilter, searchQuery, sortKey, calculateScore]);
```

- [ ] **Step 3: Stats cards**

Reemplazar las líneas 449-452 por:

```ts
  const totalCandidates = candidates.filter(c => c.candidateStatus !== 'NOT_SELECTED').length;
  const inProcess = candidates.filter(c => hasCandidateProcess(c) || c.candidateStatus === 'IN_PROCESS' || c.candidateStatus === 'SELECTED').length;
  const toReview = candidates.filter(c => c.candidateStatus === 'NEW' && !hasCandidateProcess(c)).length;
  const rejected = candidates.filter(c => c.candidateStatus === 'NOT_SELECTED').length;
```

- [ ] **Step 4: Columna ETAPA en el listado**

Reemplazar el bloque del chip de etapa en el `li` del candidato (el bloque que contiene `stage.chip` dentro de la columna Stage, ~líneas 756-760) por:

```tsx
                  <div className="pl-14 md:pl-0">
                    {hasCandidateProcess(candidate) ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-goodt text-good px-2.5 py-1 font-mono text-[10.5px] font-medium uppercase tracking-wide t-goodt t-good">
                        <span className="h-1.5 w-1.5 rounded-full bg-good" />{getActiveStageName(candidate) || 'En proceso'}
                      </span>
                    ) : (
                      <span className={`inline-flex items-center gap-1.5 rounded-full ${stage.chip} px-2.5 py-1 font-mono text-[10.5px] font-medium uppercase tracking-wide`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${stage.dot}`} />{stage.label}
                      </span>
                    )}
                  </div>
```

- [ ] **Step 5: Cargar proceso en `handleCandidateSelect`**

Reemplazar la condición (línea ~228) de:

```ts
    if (candidate.candidateStatus === 'IN_PROCESS' || candidate.candidateStatus === 'SELECTED' || candidate.candidateStatus === 'NOT_SELECTED') {
```

por:

```ts
    if (hasCandidateProcess(candidate) || candidate.candidateStatus === 'IN_PROCESS' || candidate.candidateStatus === 'SELECTED' || candidate.candidateStatus === 'NOT_SELECTED') {
```

- [ ] **Step 6: Verificar compilación y tests**

Run:

```powershell
npx tsc --noEmit
$env:CI="true"; npx react-scripts test --watchAll=false src/utils/candidateProcess.test.ts
```

Expected: tsc sin errores; test PASS.

- [ ] **Step 7: Commit**

```bash
git add currify-front/src/components/candidates/CandidatesManagerNew.tsx
git commit -m "feat: tabs excluyentes, etapa real del proceso y stats en listado de candidatos"
```

---

### Task 4: Frontend — `CandidateDrawer.tsx`: botón "Ver proceso" y chip de etapa real

**Files:**
- Modify: `currify-front/src/components/candidates/CandidateDrawer.tsx`

- [ ] **Step 1: Importar helpers**

Agregar a los imports (después de la línea 5 `import { STAGES, mapStage } from '../../constants/stages';`):

```ts
import { hasCandidateProcess, getActiveStageName } from '../../utils/candidateProcess';
```

- [ ] **Step 2: Chip de etapa del header**

Reemplazar el bloque del chip de etapa (líneas 234-241) por:

```tsx
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10.5px] font-medium uppercase tracking-wide ${hasCandidateProcess(candidate) ? 'bg-goodt text-good t-goodt t-good' : stage.chip}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${hasCandidateProcess(candidate) ? 'bg-good' : stage.dot}`}></span>{hasCandidateProcess(candidate) ? (getActiveStageName(candidate) || 'En proceso') : stage.label}
                </span>
```

- [ ] **Step 3: Botón principal del footer**

Reemplazar el `onClick` del botón principal (líneas ~449-458) por:

```tsx
                <button type="button" onClick={() => {
                  if (hasCandidateProcess(candidate)) {
                    if (onViewProcess) {
                      onViewProcess(candidate);
                    } else {
                      onStartProcess(candidate);
                    }
                  } else if (candidate.candidateStatus === 'NOT_SELECTED') {
                    onStartProcess(candidate);
                  } else if (candidate.candidateStatus === 'NEW') {
                    onStartProcess(candidate);
                  } else if (onViewProcess) {
                    onViewProcess(candidate);
                  } else {
                    setAdvanceOpen(!advanceOpen);
                  }
                }}
```

Y reemplazar el label (línea ~460) por:

```tsx
                  <span>{hasCandidateProcess(candidate) ? 'Ver proceso' : candidate.candidateStatus === 'NOT_SELECTED' ? 'Reactivar candidato' : 'Avanzar en el proceso'}</span>
```

- [ ] **Step 4: Verificar compilación**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 5: Verificación manual en el navegador**

Abrir `http://localhost:3000/campaigns/cmrzfso7j0002pw1hvnec6r3o` (hot reload ya aplicó los cambios):
1. Marta aparece solo en el tab "En Proceso" con ETAPA = nombre de su etapa activa (no "En revisión").
2. Abrir el drawer de Marta → el botón dice "Ver proceso" y navega al panel de proceso.
3. Tab "Todos" ya no la muestra; los candidatos sin proceso siguen ahí con comportamiento actual.
4. Stats: "En proceso" = 1, "Por revisar" = 0 (Marta ya no cuenta como por revisar).

- [ ] **Step 6: Commit**

```bash
git add currify-front/src/components/candidates/CandidateDrawer.tsx
git commit -m "feat: drawer muestra Ver proceso y etapa activa real para candidatos con proceso"
```

---

## Self-Review

**Spec coverage:**
- [x] Backend incluye `processInstances` con etapa activa → Task 1
- [x] Tipos `CandidateProcessInfo` en api.ts → Task 2
- [x] Tabs excluyentes (Todos/Top10/En Proceso) → Task 3 Step 2
- [x] ETAPA = nombre real de la etapa activa → Task 3 Step 4 + Task 4 Step 2
- [x] Botón "Ver proceso" → Task 4 Step 3
- [x] Stats: En proceso / Por revisar derivados → Task 3 Step 3
- [x] `handleCandidateSelect` carga proceso con NEW + proceso → Task 3 Step 5
- [x] Fuera de alcance respetado (sin cambios en Dashboard/CandidateDetail/datos BD) ✓

**Placeholder scan:** Sin TBD/TODO; todo paso con código completo.

**Type consistency:** `CandidateProcessInfo` (api.ts) coincide en helper y componentes. `hasCandidateProcess`/`getActiveStageName` reciben `Pick<Candidate, 'processInstances'>` — `CandidateDrawer` usa `CandidateWithCampaign` que extiende `Candidate`, compatible. `onViewProcess` ya existe en las props del drawer.
