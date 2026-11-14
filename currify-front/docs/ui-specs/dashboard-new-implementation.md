# DashboardNew Implementation

> **Entrega:** Dashboard ultra-rápido con funnel visual, decisiones en línea y carrusel de candidatos.

## Archivos modificados/creados

### Modificados:
- `src/services/api.ts` — +5 interfaces (`DashboardFunnel`, `DashboardCampaign`, `DashboardDecisionCandidate`, `DashboardTopCandidate`, `DashboardSummary`) y método `getDashboardSummary()` en ApiService
- `src/components/AppRouter.tsx` — import `Dashboard` → `DashboardNew`

### Creados:
- `src/components/dashboard/DashboardNew.tsx` — ~640 líneas, componente principal del dashboard (reemplaza Dashboard.tsx)

## Componentes DashboardNew

### Estructura
```
Layout
└── DashboardNew
    ├── PageHeader (saludo dinámico, fecha español, contador decisiones, botones)
    ├── StatsRow (4 cards con sparklines SVG inline)
    ├── MainGrid (xl:col-span-2 + xl:col-span-1)
    │   ├── CampaignList → CampaignRow (filtro búsqueda, funnel bar, kebab menu)
    │   └── Sidebar
    │       ├── DecisionQueue (check/X, empty state)
    │       └── AdviceBlock (consejo semana, link)
    ├── CandidatesCarousel (scroll horizontal, filter chips, CandidateCards)
    ├── DashboardUploadModal (reutilizado)
    ├── CandidateDrawer (reutilizado)
    ├── Pause confirm modal
    └── Snackbar
```

### Estados cubiertos
- **Loading:** Skeletons con `Skeleton` de `src/components/ui/skeleton.tsx`
- **Error:** Banner rojo con botón "Reintentar" que llama `loadDashboardData()`
- **Empty (sin campañas):** `DashboardActivation` reutilizado
- **Empty (búsqueda sin resultados):** Texto informativo
- **Empty (decisiones):** CheckCircleIcon + "Sin decisiones pendientes"

### Responsividad (mobile-first)
- Stats: 1 col móvil → 2 tablet → 4 desktop
- MainGrid: 1 col móvil/tablet → 3 cols desktop (2:1)
- Carousel: scroll horizontal con snap
- Botones header: icon-only en móvil, con texto en desktop

### Dark mode
- Todas las cards, fondos y textos con variante `dark:`
- Colores exactos del mockup para dark mode

### Sparklines SVG inline
- Función `renderSparkline(vals, color, w, h)` dentro del componente
- Datos generados con `sparkData(base, variance, len)` — random seed por render

## Próximos pasos
- Conectar `getDashboardSummary()` con backend real cuando esté disponible
- Agregar tests unitarios con Vitest/React Testing Library
