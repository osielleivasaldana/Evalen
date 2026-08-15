# Spec: Vista de Etapas del Proceso — Rediseño (steps.html) + Sandbox + Guía IA

**Fecha:** 2026-08-15
**Estado:** Aprobado por el usuario (secciones 1–5 aprobadas individualmente)

## Contexto

`CandidateProcessPanel.tsx` (ruta `/campaigns/:campaignId/candidates/:candidateId/process`) sigue con el diseño legado (azul índigo, grises, Heroicons) y nunca se adaptó al tema Evalen. El mockup `spec/mockup/steps.html` define el nuevo diseño completo: acta del proceso con timeline, progreso segmentado, mesa de la etapa activa con guía de entrevista IA con procedencia, feedback obligatorio y estados terminales.

El rediseño se acompaña de una decisión de privacidad del usuario: **cada etapa es un sandbox**. El responsable de una etapa solo puede ver su propia etapa (ni títulos, ni feedback, ni progreso de las demás); el dueño de la campaña (reclutador) ve el proceso completo con acceso total.

La guía de entrevista IA no existe hoy en ninguna capa: currify-core no tiene endpoint de preguntas. Se implementa de punta a punta (core → back → front), dirigida por la etapa y la campaña (técnica → deep-dive; psicológica → estándar conductual; etc.), con preguntas de brechas del CV y procedencia persistida.

## Objetivo

1. Rediseñar la vista de etapas **exactamente** como `spec/mockup/steps.html` (tema Evalen, dark mode, toasts, SVG inline), manteniendo la ruta actual.
2. Aplicar el **sandbox por rol** a nivel API: la privacidad no es solo visual.
3. Implementar la **guía de entrevista IA** real (nuevo endpoint en currify-core + persistencia en currify-back) con notas por pregunta.
4. Completar el **ciclo de vida**: estado `OMITTED` al rechazar y endpoint `reopen`.

## Cambios

### 1. currify-core — Endpoint de guía de entrevista

**Nuevo archivo `app/api/interview.py`** (patrón de `app/api/scoring.py`):

- `POST /interview/questions` → `InterviewGuideResponse`
- Modelos Pydantic en `app/models/interview.py`:
  - `InterviewGuideRequest`: `campaign { title, description, requirements }`, `stage { name, description }`, `candidate_cv` (resumen profesional, habilidades técnicas, experiencia, brechas del scoring), `rubric_criteria` (opcional)
  - `InterviewGuideResponse`: `[{ question: string, source: 'rubrica' | 'perfil' | 'brecha' | 'estandar' }]`
- Prompt en `app/core/interview_prompts.py`:
  - Clasifica el tipo de etapa por su nombre/descripción: técnica → deep-dive del stack del cargo; psicológica → estándar conductual (SHAR/STAR); cultural → valores y colaboración; etc.
  - Genera 5 preguntas, cada una con `source`:
    - `rubrica`: derivada de un criterio de la rúbrica del cargo
    - `perfil`: derivada de los requisitos/descripción de la campaña
    - `brecha`: derivada de una brecha del CV del candidato
    - `estandar`: pregunta conductual estándar de la disciplina de la etapa
  - **Anti-fuga (regla del prompt):** nunca recibe ni menciona feedback, notas, decisiones o información de otras etapas; tampoco información sensible. Solo candidate + campaign + stage + rúbrica.
- Autenticación igual que `/scoring` (JWT login con credenciales del servicio).
- Tests Pytest: clasificación de etapa, `source` correcto por pregunta, 200 con JSON válido, 401 sin token.

### 2. currify-back — Schema y endpoints de procesos

**Migración Prisma (1 migración):**

| Cambio | Detalle |
|---|---|
| `StageStatus` enum | + `OMITTED` |
| `StageInstance` | + `guideJson Json?` — última guía generada y persistida |
| `StageInstance` | + `notesJson Json?` — notas del entrevistador por pregunta de la guía |

**`getProcessByCandidate` — scoping por rol (modificado):**

| Rol | Respuesta |
|---|---|
| Dueño de campaña / ADMIN | Payload completo (todas las stages, feedback, decidedAt, audit) + `viewer: 'OWNER'` + `sensitive` derivado del candidato (pretensiones salariales desde `expectedSalary`, modalidad) — sin campo nuevo en BD |
| Responsable de alguna etapa de esa campaña | Solo su StageInstance (la suya: status, feedback propio, template, responsable, su guía/notas) + `viewer: 'STAGE_RESPONSIBLE'`. Sin hermanas, sin `totalStages`, sin audit del proceso |
| Cualquier otro | 403 (comportamiento actual extendido: hoy un responsable ve todo) |

`sensitive` derivado (no persiste): `{ salary: candidate.expectedSalary, workType: candidate.workType?, modality }` — se compone al vuelo solo para el dueño.

**`updateStageDecision` (modificado, solo rama REJECTED):**
- Además del comportamiento actual (candidato `NOT_SELECTED`, `endDate`), marcar las `StageInstance` posteriores con `status = 'PENDING'` → `'OMITTED'`.

**Endpoints nuevos:**

| Endpoint | Roles | Comportamiento |
|---|---|---|
| `POST /processes/:processId/reopen` | dueño / ADMIN | Etapa `REJECTED` → `ACTIVE` (limpia `feedback`, `decision`, `decidedAt`); etapas `OMITTED` → `PENDING`; `endDate = null`; candidato → `IN_PROCESS`; audit + notificación al responsable de la etapa reactivada |
| `POST /processes/:processId/stages/:stageId/guide` | dueño de la campaña o responsable de esa etapa | Arma payload (candidate + campaign + stage + rúbrica; **sin** feedback de otras etapas), llama a core `POST /interview/questions` (axios + JWT, patrón de `scoring.service.ts`), persiste `guideJson`, devuelve la guía |
| `PATCH /processes/:processId/stages/:stageId/notes` | dueño de la campaña o responsable de esa etapa | Guarda `notesJson` (notas por pregunta de la guía actual) |

Config: reusar `SCORING_SERVICE_URL` (mismo host core). Sin secretos nuevos.

**Tests Jest:** scoping por rol (dueño / responsable / tercero → 403), reject → OMITTED, reopen (estados + candidato + endDate), guía (payload armado nunca incluye feedback de otras etapas — test de anti-fuga), notas (solo dueño/responsable).

### 3. currify-front — `CandidateProcessPanel.tsx` (rewrite completo)

Misma ruta, tema Evalen completo: `bg-paper`, `bg-card`, ink/green/cta, Fraunces + Instrument Sans, IBM Plex Mono, dark mode vía `data-theme` (`t-*` classes como el resto de componentes migrados), grain overlay, toast system, SVG inline (sin Heroicons), animaciones del mockup (`pulsering`, `rise`, `fade-in`, `shake`).

**Modo dueño (`viewer: 'OWNER'`):**

```
← Volver | breadcrumb: Campaña · Proceso de selección
Candidato (h1 sans bold) · [● En proceso] · Inicio <fecha> · [Match X · ver análisis →]
PROGRESO DEL PROCESO                    Etapa N de M
[segmentos coloreados: aprobada=good, activa=cta(pulso), omitida=line2, pendiente=paper2]
grid lg:cols-[0.9fr_1.5fr]
├── ACTA DEL PROCESO (timeline vertical)
│   ● etapa aprobada: check verde · nombre · chip [Aprobada]
│      Decidido el <fecha> · <responsable>
│      "feedback" (comillas tipográficas)
│      🔒 <sensitive derivado>
│   ◉ etapa activa: anillo cta pulsante · chip [Activa]
│   ○ etapa pendiente/omitida
│   (click en etapa → mesa en modo lectura: contexto + guía + notas, sin botones)
└── MESA DE LA ETAPA ACTIVA (cards bg-card shadow-card)
    Contexto de etapas anteriores (cards bg-paper/60 con feedback, solo dueño)
    ⭐ Guía de entrevista
      [Generar preguntas con IA] / [Regenerar] · chips "Ya preguntado antes"
      (preguntas idénticas a guías persistidas de etapas decididas anteriores)
      preguntas enumeradas (rábrica numérica bg-greendeep), chip de procedencia por source,
      <details> "＋ añadir nota de la respuesta" → textarea → PATCH notes
    Retroalimentación de tu decisión (textarea, obligatoria al rechazar + shake + error)
    [Aprobar etapa] [Rechazar etapa]
```

- Chip "Ya preguntado antes": se deriva localmente del historial de preguntas de guías ANTERIORES de otras etapas decididas (solo dueño), o se omite si no hay contexto. En modo responsable no se muestra.
- Estados terminales (dueño): "Candidata seleccionada" (proceso completo) / "Proceso terminado" (rechazo) + botón **Reabrir proceso** (POST reopen). Acta conserva cada decisión.
- Responsive: en móvil la **mesa primero**, acta debajo (el que decide no scrollea).

**Modo responsable (`viewer: 'STAGE_RESPONSIBLE'`) — sandbox:**

```
← Volver | "Mi etapa asignada"
<Nombre etapa> · Candidato: <nombre> · Campaña: <título>
<iniciales avatar> · <responsable> · <rol/descripción>
─────────────────────────────────────────────
⭐ Guía de entrevista (generar/regenerar, notas)   ← de su etapa
Retroalimentación de tu decisión
[Aprobar etapa] [Rechazar etapa]
```

- Sin acta, sin progreso, sin "Etapa X de Y", sin match del candidato, sin info sensible, sin feedback de otras etapas.
- Reglas de decisión: solo si su etapa está `ACTIVE` y es el responsable (reuso de `canDecideStage`).
- Muestra el encabezado del candidato (solo nombre + campaña, contexto necesario para entrevistar).

**Mesa en modo lectura (dueño, etapa no activa):** contexto, guía persistida y notas visibles; botones de decidir deshabilitados.

**Integración de datos:** `apiService.getProcess` ahora devuelve `viewer` y `sensitive` (tipos nuevos en `api.ts`); `apiService.generateStageGuide(processId, stageId)`, `apiService.updateStageNotes(processId, stageId, notes)`, `apiService.reopenProcess(processId)`.

**Tests Vitest + RTL:** render modo dueño vs modo responsable (sandbox: sin acta, sin progreso, sin "Etapa X de Y"), generar/regenerar guía (loading skeleton → lista con chips), guardar notas vía PATCH, validación feedback obligatoria al rechazar (shake + mensaje), reopen desde estado terminal, flujo seleccionada/no seleccionada, dark mode y toasts.

## Fuera de alcance

- No se genera la guía automáticamente al activar la etapa (solo botón, control de costos LLM).
- No se permite al dueño generar guía con contexto de feedback de otras etapas por ahora (el chip "Etapa anterior" del mockup queda sin efecto real).
- No se toca `CandidateDrawer.tsx` ni `CandidatesManagerNew.tsx` (ya migrados; el botón "Ver proceso" ya navega a esta ruta).
- No se agrega campo de "nota sensible editable" por etapa (la info sensible se deriva del candidato).
- No se cambian las notificaciones/emails existentes.

## Verificación

- `npx tsc --noEmit` en `currify-front` sin errores; `npm test` / `jest` en back y front con la nueva cobertura green.
- Pytest en currify-core para el endpoint nuevo.
- Manual:
  1. `npm start` / `start:dev` compilan; `/process` fiel al mockup en light y dark.
  2. Sandbox real: usuario responsable — en la pestaña Network, el GET `/processes/...` **no** incluye las etapas hermanas.
  3. Ciclo completo: aprobar → siguiente etapa activa; rechazar → etapas posteriores omitidas + acta correcta; reabrir → estados y candidato restaurados (IN_PROCESS).
  4. Guía: generar (skeleton), regenerar (reemplaza), notas por pregunta persistidas y visibles en acta para el dueño.