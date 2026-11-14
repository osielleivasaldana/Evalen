# 📋 Evalen — Vista de Etapas del Proceso (Modo Dueño) — Task 11

> **Estado:** ✅ Implementado y compilado (`tsc --noEmit` limpio)
> **Fecha:** 2026-08-15
> **Commit:** `f5eb5cf` — `feat(front): rewrite de vista de etapas con modo dueño (acta + mesa + guía IA)`
> **Fuente de verdad visual:** `spec/mockup/steps.html` (vista dueño)
> **Framework:** React 18 + CRA + Tailwind CSS v3.4 + tokens Evalen (`index.css`)

---

## 1. Componente y Ruta

| Ítem | Detalle |
|------|---------|
| **Archivo** | `currify-front/src/components/processes/CandidateProcessPanel.tsx` (rewrite total, 639 ins / 402 del) |
| **Ruta** | `/campaigns/:campaignId/candidates/:candidateId/process` (montado en `AppRouter.tsx` bajo `ProtectedRoute`) |
| **Layout** | `<Layout>` (NavBar existente) — el topbar del mockup NO se portó |
| **Datos** | `apiService.getProcess(campaignId, candidateId)` + `getCampaign` + `getCandidate` en `Promise.all` |

## 2. Estructura del JSX (fiel al mockup)

```
Layout
└─ div.min-h-screen.bg-paper + overlay grain (z-[60])
   └─ main.max-w-[1240px]
      ├─ identidad: botón back + eyebrow "Campaña {título} · Proceso de selección"
      │              + h1 nombre candidato + meta row (statusChip · Inicio {fecha} · Match link)
      ├─ progreso: label "Progreso del proceso" + "Etapa N de M" + barra segmentada (segColor)
      └─ grid lg:grid-cols-[0.9fr_1.5fr]
         ├─ ACTA (order-2 lg:order-1): header + timeline (dots SVG, conector, título
         │   "Etapa N: {nombre}", chip estado, responsable, detalle decidido con candado sensible)
         └─ MESA (order-1 lg:order-2): card shadow-card
            ├─ eyebrow + h3 "Etapa N: {nombre}" + chip + avatar responsable
            ├─ contexto de etapas anteriores (cards con feedback + candado)
            ├─ guía de entrevista (skeleton / CTA generar / preguntas con procedencia + notas)
            └─ feedback + Aprobar/Rechazar (solo mesa activa)
└─ toast id="toastItem" (patrón CandidateDetail + mockup)
```

## 3. Estados y Manejo

| Estado | Uso |
|--------|-----|
| `process / campaign / candidate` | Datos cargados (campaign/candidate tipados `any` — interfaces no exportadas en api.ts) |
| `selectedStageId` | Etapa seleccionada en el acta → mesa en lectura (dueño) |
| `guide` | `'loading' \| GuideQuestion[] \| null` — guía IA de la mesa |
| `notes` | `Record<string,string>` por índice de pregunta, autosave debounce 700ms (`updateStageNotes`) |
| `feedback / feedbackErr` | Textarea de decisión; error → `animate-shake` + borde `var(--low)` |
| `busy` | Bloqueo de botones durante decide/reopen |
| `toast` | Toast auto-hide 3200ms (iconos ok/info/warn del mockup) |

**Flujos clave:**
- **Carga:** `loadData` (useCallback) → skeleton con pulso (`bg-paper2 animate-pulse`), error → card + botón Reintentar.
- **Mesa activa:** guía generable (`generateStageGuide(processPk, stageId)`), notas editables con guardado diferido, botones Aprobar/Rechazar (`updateStageDecision` — feedback obligatorio al rechazar).
- **Mesa en lectura** (etapa decidida seleccionada en el acta): decisión + feedback + candado, guía persistida (`guideJson`) y notas SOLO lectura, sin botones de decidir.
- **Terminal:** `candidate.candidateStatus` (`SELECTED`/`NOT_SELECTED`) → card "Candidata seleccionada" / "Proceso terminado" + botón "Reabrir proceso" (`reopenProcess`). Fallback: `process.endDate` si `candidateStatus` no existe.
- **"Ya preguntado antes":** preguntas de `guideJson` de etapas decididas (distintas de la mesa actual) como chips con check.
- **Info sensible:** candado con `Pretensiones: {salary}` y `Modalidad: {modality}` de `process.sensitive` (solo dueño, etapas decididas).

## 4. Adaptaciones al mockup (documentadas)

| Mockup | Adaptación | Razón |
|--------|-----------|-------|
| `.dot-active` (pulso cta) | `animate-pulsering` (pulso verde de la app) | Clase no existe en `index.css`; solo se commiteó el componente |
| `.seg` | `transition-colors duration-500` | Equivalente Tailwind |
| `.fade-in` | `rise` (misma keyframe, clase de la app) | Idem |
| `.shake` | `animate-shake` (config Tailwind) | Idem |
| `details.qnote` | Toggle con estado React `openNote` (botón "＋ añadir nota…" → textarea) | Patrón React sin dependencia CSS |
| `border-good` / `border-low` / `focus:border-green` | `style={{ borderColor: 'var(--good'/'var(--low)' }}` + `focus:ring-2 focus:ring-green/25` | Clases no definidas en la app; vars CSS son theme-aware |
| `text-yellow` (sparkle) | `style={{ color: 'var(--yellow)' }}` | Solo existe variante dark en la app |
| `Match 74 · ver análisis →` | `Match {scoring.overallScore} · ver análisis →` (Link a `/campaigns/:id/candidate/:candidateId`) | `Candidate` no tiene `matchScore`; usa `scoring.overallScore` |
| Rol del responsable ("· RRHH") | Solo nombre (`responsible.name`) | El tipo `responsible` no tiene campo `role` |
| Numeración contexto | Índice real en `stageInstances` (no índice filtrado) | Más correcto con etapas omitidas |
| Chip "Activa" (`bg-midt` en mockup) | `bg-cta text-ctatext` + dot pulsante | Instrucción explícita del plan Task 11 |
| Botón "Reabrir proceso" | Visible en ambos estados terminales | El código del mockup lo renderiza incondicionalmente |
| `setProcess` tras generar guía | Actualiza `guideJson` en memoria | Evita perder la guía generada al cambiar de etapa en el acta |
| `setFeedback('')` tras decidir | Limpia el textarea | El mockup re-renderiza el textarea vacío |

## 5. Verificación

- `npx tsc --noEmit` → **0 errores** (baseline previo también limpio).
- `react-scripts test --testPathPattern=CandidateProcessPanel` → "No tests found" (los tests llegan en Task 12; no había test viejo que romper).
- `npm run build` → **falla PRE-EXISTENTE** no relacionada: `src/index.tsx` importa `@fontsource-variable/fraunces/full.css` y el paquete no está instalado (WIP de otra rama). No toca este componente.

## 6. Notas para Task 12 (sandbox)

- El render ya lee `viewer`: `isOwner` / `isResponsible`; `mesaStage` en sandbox cae a `allStages[0]` y `processPk` usa `process.processId`.
- `canDecide` ya está calculado (mesa ACTIVE) y se usa como guard del bloque de decisión.
- El acta muestra "Acceso limitado · tu etapa" cuando no es dueño.