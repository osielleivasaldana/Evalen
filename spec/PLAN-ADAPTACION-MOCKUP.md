# Plan de Adaptación — Candidates Mockup

## Objetivo
Adaptar la vista `/campaigns/:id` del sistema **exactamente** como se ve en `spec/mockup/candidates.html`, manteniendo toda la funcionalidad existente (rescore, modales, snackbar, start process, dismiss/undo, export).

---

## Arquitectura

### Archivos a modificar
| Archivo | Cambio |
|---|---|
| `currify-front/src/components/candidates/CandidatesManagerNew.tsx` | **Reemplazo visual completo** (manteniendo lógica) |
| `currify-front/src/components/candidates/CandidateDrawer.tsx` | **Reemplazo visual completo** |
| `currify-front/src/index.css` | **Agregar ~10 clases CSS** del mockup |

### Archivos NO modificar
- `NavBar.tsx` — ya está en Evalen brand ✓
- `Layout.tsx`, `FooterFinal.tsx` — sin cambios ✓
- `AppRouter.tsx` — sin cambios ✓
- `tailwind.config.js` — ya tiene ev-* colors y fonts ✓
- `api.ts` y servicios — sin cambios ✓
- Tipos e interfaces — sin cambios ✓

---

## Fase 1: CSS (`index.css`)

Agregar estas clases (extraídas del mockup):

| Clase | Propósito |
|---|---|
| `.camp-glow` | Transición de opacidad en glows del banner |
| `.camp-banner:hover .camp-glow` | Hover effect en banner |
| `.camp-desc` | Descripción clamp 2 líneas |
| `.camp-desc.expanded` | Expandir descripción |
| `.ring-track` | Track gris del score ring SVG |
| `.tab-underline` | Underline animado en tabs del drawer |
| `.tab-underline[aria-selected="true"]::after` | Línea verde bajo tab activo |
| `.tl` | Timeline container (padding-left + línea vertical) |
| `.tl-item` | Item de timeline con círculo verde |
| `.tl-item:first-child::before` | Primer item con fondo verde |
| `.acc-body` | Acordeón con grid-rows 0fr→1fr |
| `.acc.open .acc-body` | Expandir acordeón |
| `.acc-chev` | Rotación del chevron en acordeón |
| `#overlay / #drawer` | Transiciones slide + opacity |
| `body.drawer-open` | Overflow hidden |

---

## Fase 2: `CandidateDrawer.tsx` — Rediseño completo

### Estructura del drawer
```
┌─────────────────────────────────────┐
│ [X] close button (sticky)          │
├─────────────────────────────────────┤
│        Score Ring (92px)            │
│        Avatar CENTRADO dentro       │
│        Match badge flotante         │
│        Name (h2)                    │
│        Title (mono)                 │
│        Email (copiable)             │
│        Phone (copiable con badge)   │
├─────────────────────────────────────┤
│  Insight IA (card greentint)        │
│  "cita en serif italic"             │
├─────────────────────────────────────┤
│  [Stage Chip]  [Level Chip]         │
├─────────────────────────────────────┤
│  Resumen │ Experiencia (tabs)       │
├─────────────────────────────────────┤
│  Puntaje por criterio               │
│  ───────────────                    │
│  Experiencia  ████████░░ 9.4        │
│  Stack técnico ████████░ 9.2        │
│  ...                                │
│  [Ver el porqué (desglose IA)]      │
│  ─── acordeón con detalle ───       │
│                                     │
│  Habilidades clave                  │
│  [React] [TypeScript] [Node] [+8]  │
│                                     │
│  ┌──────────┐ ┌──────────┐         │
│  │ Educación│ │ Actual   │         │
│  │ Ing ...  │ │ Tech ... │         │
│  │ USACH    │ │ NotCo    │         │
│  └──────────┘ └──────────┘         │
│                                     │
│  [Por contactar] ¿Cómo contactas?   │
│  ┌──────────┐ ┌──────────┐         │
│  │ WhatsApp │ │  Email   │         │
│  └──────────┘ └──────────┘         │
├─────────────────────────────────────┤
│  [Experiencia tab]                  │
│  Trayectoria (timeline)             │
│  ● Tech Lead Frontend · NotCo       │
│  │  2022 - Presente                 │
│  │  • Lideró migración...           │
│  ● Full Stack · Cornershop          │
│    ...                              │
├─────────────────────────────────────┤
│  Footer fijo:                       │
│  [Descargar CV] [Análisis IA]       │
│  [🗑️] [Avanzar en el proceso ▼]    │
│       ┌─────────────────────┐       │
│       │ Marcar contactado   │       │
│       │ Mover a Entrevista  │       │
│       │ Mover a Oferta      │       │
│       │ ─────────────────   │       │
│       │ Marcar contratado   │       │
│       └─────────────────────┘       │
└─────────────────────────────────────┘
```

### Mantener de la versión actual:
- Props interface (`CandidateDrawerProps`)
- `handleDownloadCV`, `handleCopyPhone`
- `onClose`, `onDismiss`, `onStartProcess`, `onViewAIAnalysis`, `onViewProcess`
- Estados: `activeTab`, `showResultPopover`, `downloading`, `copied`
- Efectos: Escape key, focus management
- Cálculos: `calculateScore`, `getAIInsight`, `getInitials`, `getCandidatePosition`
- Llamadas API: `downloadDocument`

### Cambiar completamente:
- **Score ring**: SVG inline con `var(--good/mid/low)` + avatar dentro del ring (92px total, ring stroke 7, avatar inset 10px)
- **Match badge**: flotante debajo del ring, color según tone (goodt/yellow/lowt)
- **Email/Phone**: botones con `data-copy`, SVG inline (no Heroicons)
- **Insight**: card `bg-greentint` con borde `var(--green)` translucent, texto en Fraunces italic
- **Stage chip**: colores según `STAGE` map mockup (bg-midt/midt, bg-goodt/good, bg-lowt/low)
- **Level chip**: bg-goodt/good (alto), bg-midt/mid (medio), bg-lowt/low (bajo)
- **Tabs**: clase `tab-underline` con `::after` green línea
- **Resumen panel**: criterios con barra de progreso en `bg-paper2` + fill colored, acordeón de rúbrica con `.acc` clase, skills en `bg-greentint`, grid educación/actual, contacto WhatsApp+Email
- **Experiencia panel**: timeline con clases `.tl` / `.tl-item`, puntos verdes
- **Footer**: grid 2 columnas para Descargar+Análisis, luego discard + advance con dropdown menu
- **Advance dropdown**: 4 opciones (contactar/entrevista/oferta/contratado) + divider + contratado
- **No Heroicons**: todos los SVG van inline como en el mockup

---

## Fase 3: `CandidatesManagerNew.tsx` — Rediseño visual

### Estructura del render (de arriba a abajo)

```
┌─────────────────────────────────────────────┐
│ Grain overlay (fixed, pointer-events-none)  │
├─────────────────────────────────────────────┤
│ Breadcrumb: Campañas > Título (mono)        │
├─────────────────────────────────────────────┤
│ Back button + Title (Fraunces semibold)     │
│ Meta: creada • 8 candidatos • 100% remoto   │
├─────────────────────────────────────────────┤
│ ┌─────────────── BANNER ─────────────────┐  │
│ │ Deep green bg + glows + network SVG   │  │
│ │ [● Activa] Rúbrica generada · 4 crit. │  │
│ │ Descripción... [Leer más]             │  │
│ │ [Exportar] [Copiar enlace] [Ver form.] │  │
│ └────────────────────────────────────────┘  │
├─────────────────────────────────────────────┤
│ 4 STAT CARDS (clickeables → filtro)         │
│ ┌────┐ ┌────┐ ┌───────┐ ┌────┐            │
│ │Total│ │En  │ │Por    │ │Des-│            │
│ │ 8   │ │proc│ │revisar│ │car-│            │
│ │     │ │ 3  │ │  3    │ │ta2 │            │
│ └────┘ └────┘ └───────┘ └────┘            │
├─────────────────────────────────────────────┤
│ [Banners funcionales: rescore, outdated]    │
│ (re-estilizados con fondo/tipografía Evalen)│
├─────────────────────────────────────────────┤
│ Tab pills [Todos] [Top 10] [En proc] [Desc] │
│ Search input + Sort button (Match↓/↑/Nombre)│
├─────────────────────────────────────────────┤
│ Grid header: Candidato | Skills | Match |   │
│             Etapa | Acciones                │
├─────────────────────────────────────────────┤
│ Candidate rows (CSS Grid, no table)         │
│ ┌─────────────────────────────────────────┐ │
│ │ [avatar] Nombre    │React  │◉ 91│[En  │ │
│ │         Title      │TS     │    │entre]│ │
│ │                    │Node+3 │    │👁👍👎│ │
│ └─────────────────────────────────────────┘ │
│ ... (paginado, 5 per page)                  │
├─────────────────────────────────────────────┤
│ Empty state (hidden si hay datos)           │
├─────────────────────────────────────────────┤
│ Pagination: Mostrando 1-5 de 8 │ ◀ 1/2 ▶ │
├─────────────────────────────────────────────┤
│ [Modales re-estilizados]                    │
│ ┌─── Start Process ───┐                    │
│ │ (bg-card, diseño     │                    │
│ │  Evalen)             │                    │
│ └──────────────────────┘                    │
│ ┌─── Rescore Confirm ──┐                    │
│ │ (bg-card, diseño     │                    │
│ │  Evalen)             │                    │
│ └──────────────────────┘                    │
├─────────────────────────────────────────────┤
│ Snackbar (toast Evalen)                     │
└─────────────────────────────────────────────┘
```

### Mantener de la versión actual:
- Toda la lógica de estado (useState, useEffect)
- `loadData`, `handleCandidateSelect`, `handleCloseDrawer`
- `handleDismissCandidate` con undo
- `handleStartProcess`, `handleRescoreAll`, `rescoreSingle`
- `handleExportCandidates`, `handleCopyLink`
- `calculateScore`, `getInitials`, `getCandidatePosition`, `formatDate`, `getAIInsight`
- Filtering logic (`filteredCandidates`)
- Pagination logic (`paginatedCandidates`, `currentPage`, `itemsPerPage`)
- Polling for rescore progress
- Processing message rotation

### Cambiar completamente (JSX visual):
- Eliminar todo el JSX actual que usa clases `bg-indigo-*`, `text-slate-*`, `from-indigo-500`, etc.
- Reemplazar con clases Evalen: `bg-paper`, `bg-card`, `text-ink`, `text-ink2`, `text-ink3`, `bg-greendeep`, `bg-green`, `bg-cta`, etc.
- Agregar breadcrumb al inicio
- Banner de campaña: fondo `bg-greendeep` con glow effects, network SVG, badge "Activa", descripción con `.camp-desc` expandible, 3 botones de acción
- Stats cards: 4 cards como en mockup (3 bg-card normales, 1 bg-greendeep destacada)
- Tab pills: con SVGs inline (no emojis ni Heroicons)
- Tabla como CSS Grid en vez de HTML `<table>`
- Score ring SVG con variables CSS `var(--good/mid/low)` + ring-track
- Stage chip con colores según mapa `STAGE` del mockup
- 3 action buttons inline (eye SVG, thumbs-up SVG, thumbs-down SVG)
- Paginación 5 por página (no 10)
- Modales re-estilizados con `bg-card` y tipografía Evalen
- Snackbar con estilo mockup (position fixed, border, translate-y animation)

---

## Fase 4: Funcionalidades existentes (re-estilizadas)

### Banners de rescore
Actualmente: `bg-indigo-50 border-l-4 border-indigo-400`
Nuevo estilo: `bg-midt/50 border-l-4 border-mid` con texto `text-mid`

### Modal Start Process
Actualmente: `bg-white rounded-2xl` con indigo
Nuevo estilo: `bg-card rounded-2xl` con green/cta

### Modal Rescore Confirm
Actualmente: `bg-white rounded-2xl` con orange
Nuevo estilo: `bg-card rounded-2xl` con mid/low

### Snackbar
Actualmente: `bg-slate-900 text-white` con UNDO button
Nuevo estilo: `bg-card border border-line2` con sombra y translate-y animado (como el mockup)

---

## Orden de ejecución

1. CSS → index.css (clases base necesarias para drawer y tabla)
2. CandidateDrawer.tsx (componente independiente, se puede probar solo)
3. CandidatesManagerNew.tsx (depende del drawer, reemplazo completo)
4. Verificación: compilar y probar en localhost

## Verificación

- `npm start` debe compilar sin errores
- Navegar a `/campaigns/:id` debe mostrar la UI idéntica al mockup
- Las funciones deben operar: clic en candidato → drawer, dismiss, like, rescore, export, etc.