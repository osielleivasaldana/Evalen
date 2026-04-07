# 🎨 Evalen Design Tokens — Fuente de la Verdad Visual

> **Documento Maestro de Design Tokens para toda la plataforma Currify-Front**  
> Última actualización: Abril 2026  
> Estado: ✅ Activo — Referencia obligatoria para nuevos componentes  
> Alcance: Landing · Auth · Dashboard · UI Kit (shadcn/ui)

---

## Tabla de Contenidos

1. [Mapa de Contextos Visuales](#1-mapa-de-contextos-visuales)
2. [Contexto Landing](#2-contexto-landing)
3. [Contexto Auth (Login/Register)](#3-contexto-auth-loginregister)
4. [Contexto Dashboard (Post-Login)](#4-contexto-dashboard-post-login)
5. [Contexto UI Kit (shadcn/ui)](#5-contexto-ui-kit-shadcnui)
6. [Design Tokens Unificados — Tabla Maestra](#6-design-tokens-unificados--tabla-maestra)
7. [Mapa de Inconsistencias](#7-mapa-de-inconsistencias)
8. [Patrones Reutilizables Documentados](#8-patrones-reutilizables-documentados)
9. [Recomendaciones de Unificación](#9-recomendaciones-de-unificación)

---

## 1. Mapa de Contextos Visuales

| Contexto | Ruta | ThemeProvider | Modo Oscuro | Estrategia de Color | Estado |
|---|---|---|---|---|---|
| **Landing** | `/` (LandingPage.tsx) | ✅ `ThemeContext` propio | ✅ `dark:` classes | Hardcodeado Tailwind (`indigo-600`, `gray-900`, etc.) | ⚠️ Desconectado del UI Kit |
| **Auth** | `/login`, `/register` | ❌ Ninguno | ❌ No soportado | Mix: Tailwind (Login) + inline styles (Register) | 🔴 Crítico — Register usa estilos inline |
| **Dashboard** | `/dashboard` (Layout.tsx) | ❌ Ninguno | ❌ No soportado | Hardcodeado Tailwind + gradientes decorativos | ⚠️ Desconectado del UI Kit |
| **UI Kit** | `src/components/ui/*` | ✅ Variables CSS (`:root` / `.dark`) | ✅ Vía `.dark` class | Variables HSL (`--primary`, `--background`, etc.) | ✅ Sistema base, pero no se consume |

### Resumen de Desconexión

```
┌─────────────────────────────────────────────────────────────┐
│                    EVALEN PLATFORM                          │
├──────────────┬──────────────┬──────────────┬────────────────┤
│   LANDING    │    AUTH      │  DASHBOARD   │    UI KIT      │
│              │              │              │   (shadcn)     │
│ ThemeContext │  Sin theme   │  Sin theme   │  Variables CSS │
│ dark: classes│  Mix styles  │  Hardcoded   │  :root/.dark   │
│ indigo-600   │  violet-600  │  indigo-500  │  --primary     │
│ gray-900     │  slate-900   │  gray-50     │  --background  │
│              │              │              │                │
│  ❌ NO usa   │  ❌ NO usa   │  ❌ NO usa   │  ✅ Sistema    │
│  variables   │  variables   │  variables   │  de referencia │
└──────────────┴──────────────┴──────────────┴────────────────┘
```

---

## 2. Contexto Landing

### 2.1 Paleta de Colores Light Mode

| Token | Valor Tailwind | Hex Aprox. | Uso |
|---|---|---|---|
| `landing-bg` | `bg-white` | `#ffffff` | Fondo principal de página |
| `landing-surface` | `bg-gray-50` | `#f9fafb` | Secciones alternas, cards normales |
| `landing-text-primary` | `text-gray-900` | `#111827` | Headings, texto principal |
| `landing-text-secondary` | `text-gray-600` | `#4b5563` | Descripciones, body text |
| `landing-text-muted` | `text-gray-500` | `#6b7280` | Texto secundario, notas al pie |
| `landing-border` | `border-gray-200` | `#e5e7eb` | Bordes de navbar, cards |
| `landing-brand-primary` | `indigo-600` | `#4f46e5` | Logo, CTAs, links hover |
| `landing-brand-secondary` | `purple-600` | `#9333ea` | Gradiente del logo |
| `landing-accent-warm` | `amber-400 → orange-400` | `#fbbf24 → #fb923c` | Badge "Recomendado" |

### 2.2 Paleta de Colores Dark Mode

| Token | Valor Tailwind | Hex Aprox. | Uso |
|---|---|---|---|
| `landing-bg` | `dark:bg-gray-900` | `#111827` | Fondo principal |
| `landing-surface` | `dark:bg-gray-800` | `#1f2937` | Cards normales |
| `landing-text-primary` | `dark:text-white` | `#ffffff` | Headings |
| `landing-text-secondary` | `dark:text-gray-300` | `#d1d5db` | Descripciones |
| `landing-text-muted` | `dark:text-gray-400` | `#9ca3af` | Notas al pie |
| `landing-border` | `dark:border-gray-700` | `#374151` | Bordes |
| `landing-brand-primary` | `dark:text-indigo-400` | `#818cf8` | Links hover, acentos |
| `landing-brand-secondary` | `dark:from-indigo-400 dark:to-purple-400` | `#818cf8 → #c084fc` | Gradiente logo footer |

### 2.3 Gradientes

| Nombre | Clases Tailwind | Hex Values | Uso |
|---|---|---|---|
| `brand-gradient` | `from-indigo-600 to-purple-600` | `#4f46e5 → #9333ea` | Logo (navbar), heading span |
| `brand-gradient-footer` | `from-indigo-400 to-purple-400` | `#818cf8 → #c084fc` | Logo (footer) |
| `pricing-featured` | `from-indigo-600 to-purple-600` | `#4f46e5 → #9333ea` | Card featured de pricing |
| `badge-recommended` | `from-amber-400 to-orange-400` | `#fbbf24 → #fb923c` | Badge "Recomendado" |

### 2.4 Tipografía

| Elemento | Clase | Tamaño | Peso |
|---|---|---|---|
| Logo | `text-2xl font-bold` | 24px | 700 |
| Heading sección | `text-3xl sm:text-4xl font-bold` | 30-36px | 700 |
| Precio | `text-4xl font-extrabold` | 36px | 800 |
| Nombre plan | `text-xl font-bold` | 20px | 700 |
| Body | `text-lg` | 18px | 400 |
| Nota al pie | `text-sm` | 14px | 400 |
| Label footer | `text-sm font-semibold uppercase tracking-wider` | 14px | 600 |

### 2.5 Espaciado

| Contexto | Patrón |
|---|---|
| Sección padding vertical | `py-24` (96px) |
| Container max-width | `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8` |
| Grid pricing | `grid-cols-1 md:grid-cols-3 gap-8 lg:gap-6` |
| Footer grid | `grid-cols-1 md:grid-cols-4 gap-8` |
| Card padding | `p-8` (32px) |

### 2.6 Componentes Específicos

#### Navbar
```
fixed top-0 z-50
bg-white/80 dark:bg-gray-900/80 backdrop-blur-md
border-b border-gray-200 dark:border-gray-700
h-16
```

#### Pricing Card Normal
```
bg-gray-50 dark:bg-gray-800
border border-gray-200 dark:border-gray-700
rounded-2xl p-8
```

#### Pricing Card Featured
```
bg-gradient-to-br from-indigo-600 to-purple-600
text-white
shadow-2xl shadow-indigo-500/30
scale-105 z-10
rounded-2xl p-8
```

#### CTA Featured (invertido)
```
bg-white text-indigo-600 hover:bg-indigo-50
shadow-lg rounded-xl
```

#### CTA Normal
```
bg-indigo-600 text-white hover:bg-indigo-700
shadow-sm rounded-xl
```

#### Footer
```
bg-gray-900 dark:bg-gray-950
text-white
border-t border-gray-800
```

### 2.7 Toggle de Tema (ThemeProvider)

| Propiedad | Valor |
|---|---|
| Archivo | `src/contexts/ThemeContext.tsx` |
| Estrategia | Clase `dark` en `document.documentElement` |
| Persistencia | `localStorage` key: `evalen-landing-theme` |
| Detección inicial | `prefers-color-scheme` media query |
| Valores | `'light'` | `'dark'` |
| Hook | `useTheme()` → `{ theme, toggleTheme }` |
| ⚠️ Limitación | **Solo funciona dentro de LandingPage**. Dashboard y Auth NO tienen acceso. |

---

## 3. Contexto Auth (Login/Register)

### 3.1 Login — Panel Izquierdo (Branding)

| Token | Valor | Hex | Uso |
|---|---|---|---|
| `auth-panel-bg` | `from-[#7E3AF2] via-[#6D28D9] to-[#5C60F5]` | `#7E3AF2 → #6D28D9 → #5C60F5` | Fondo panel izquierdo |
| `auth-panel-text` | `text-white` | `#ffffff` | Texto principal |
| `auth-panel-text-muted` | `text-white/70` | `rgba(255,255,255,0.7)` | Descripción |
| `auth-panel-text-dim` | `text-white/55` | `rgba(255,255,255,0.55)` | Subtítulos de features |
| `auth-panel-text-faint` | `text-white/40` | `rgba(255,255,255,0.4)` | Trust badge |
| `auth-glass-icon` | `bg-white/10 backdrop-blur-md border border-white/20` | — | Iconos de features |
| `auth-glass-icon-hover` | `bg-white/20` | — | Hover de iconos |
| `auth-orb-1` | `bg-white/20 blur-[180px]` | — | Gradiente orb superior |
| `auth-orb-2` | `bg-purple-300/20 blur-[160px]` | — | Gradiente orb inferior |
| `auth-orb-3` | `bg-indigo-300/15 blur-[100px]` | — | Gradiente orb lateral |
| `auth-pattern` | SVG diagonal lines `opacity-[0.04]` | — | Patrón de fondo |

#### Gradientes del Login
| Nombre | Clases | Hex | Uso |
|---|---|---|---|
| `auth-headline` | `from-white via-white to-purple-200` | `#fff → #fff → #e9d5ff` | Headline principal |
| `auth-headline-accent` | `from-purple-200 to-white` | `#e9d5ff → #fff` | Segunda línea headline |
| `auth-logo-gradient` | SVG: `#ffffff → #e0e7ff` | `#fff → #e0e7ff` | Logo SVG en panel |

### 3.2 Login — Panel Derecho (Formulario)

| Token | Valor | Hex | Uso |
|---|---|---|---|
| `auth-form-bg` | `bg-white` | `#ffffff` | Fondo formulario |
| `auth-form-heading` | `text-slate-900` | `#0f172a` | Título "Bienvenido" |
| `auth-form-subtext` | `text-slate-500` | `#64748b` | Subtítulo |
| `auth-form-label` | `text-slate-700` | `#334155` | Labels de inputs |
| `auth-input-bg` | `bg-slate-50` | `#f8fafc` | Fondo de inputs |
| `auth-input-bg-focus` | `focus:bg-white` | `#ffffff` | Input al hacer focus |
| `auth-input-border` | `border-slate-200` | `#e2e8f0` | Borde de inputs |
| `auth-input-focus-ring` | `focus:ring-violet-500/20 focus:border-violet-500` | `#8b5cf6` | Focus ring |
| `auth-input-placeholder` | `placeholder-slate-400` | `#94a3b8` | Placeholder text |
| `auth-link` | `text-violet-600 hover:text-violet-700` | `#7c3aed → #6d28d9` | Links, forgot password |
| `auth-btn-gradient` | `from-violet-600 to-indigo-600` | `#7c3aed → #4f46e5` | Botón submit |
| `auth-btn-gradient-hover` | `from-violet-700 to-indigo-700` | `#6d28d9 → #4338ca` | Hover submit |
| `auth-btn-shadow` | `shadow-lg shadow-violet-500/25` | — | Sombra del botón |
| `auth-btn-shadow-hover` | `shadow-xl shadow-violet-500/30` | — | Hover sombra |
| `auth-divider` | `border-slate-200` | `#e2e8f0` | Línea divisoria |
| `auth-divider-text` | `text-slate-400` | `#94a3b8` | Texto "o ingresa con email" |
| `auth-error-bg` | `bg-red-50` | `#fef2f2` | Fondo error |
| `auth-error-text` | `text-red-600` | `#dc2626` | Texto error |
| `auth-error-border` | `border-red-100` | `#fee2e2` | Borde error |
| `auth-google-border` | `border-slate-200` | `#e2e8f0` | Borde botón Google |
| `auth-google-hover` | `hover:bg-slate-50 hover:border-slate-300` | `#f8fafc → #cbd5e1` | Hover Google |

### 3.3 Register — Estilos Inline (⚠️ LEGADO)

> **Estado crítico:** Register.tsx usa **100% inline styles** en lugar de Tailwind. Esto es una deuda técnica importante.

| Token | Valor Inline | Hex | Uso |
|---|---|---|---|
| `reg-container-bg` | `backgroundColor: 'white'` | `#ffffff` | Fondo card |
| `reg-container-border` | `border: '1px solid #e1e5e9'` | `#e1e5e9` | Borde card |
| `reg-container-shadow` | `boxShadow: '0 4px 20px rgba(0,0,0,0.1)'` | — | Sombra card |
| `reg-heading` | `color: '#2c3e50'` | `#2c3e50` | Título |
| `reg-subtext` | `color: '#7f8c8d'` | `#7f8c8d` | Subtítulo |
| `reg-label` | `color: '#2c3e50'` | `#2c3e50` | Labels |
| `reg-input-border` | `border: '2px solid #e1e5e9'` | `#e1e5e9` | Borde inputs |
| `reg-input-focus` | `borderColor: '#3498db'` | `#3498db` | Focus input |
| `reg-btn-bg` | `backgroundColor: '#3498db'` | `#3498db` | Botón submit |
| `reg-btn-hover` | `backgroundColor: '#2980b9'` | `#2980b9` | Hover submit |
| `reg-btn-disabled` | `backgroundColor: '#bdc3c7'` | `#bdc3c7` | Disabled |
| `reg-error-bg` | `backgroundColor: '#fdf2f2'` | `#fdf2f2` | Fondo error |
| `reg-error-border` | `border: '1px solid #f5c6cb'` | `#f5c6cb` | Borde error |
| `reg-error-text` | `color: '#e74c3c'` | `#e74c3c` | Texto error |
| `reg-link` | `color: '#3498db'` | `#3498db` | Link "Iniciar Sesión" |

### 3.4 AuthContainer (wrapper no usado activamente)

| Token | Valor | Hex | Uso |
|---|---|---|---|
| `auth-container-bg` | `linear-gradient(135deg, #667eea 0%, #764ba2 100%)` | `#667eea → #764ba2` | Fondo gradiente |

> ⚠️ **Nota:** `AuthContainer` existe pero **no se usa** en el routing actual. Login tiene su propio layout de dos paneles.

---

## 4. Contexto Dashboard (Post-Login)

### 4.1 Layout Base

| Token | Valor | Hex | Uso |
|---|---|---|---|
| `dash-bg` | `bg-gray-50` | `#f9fafb` | Fondo principal (Layout.tsx) |
| `dash-container` | `max-w-7xl mx-auto px-4 py-8` | — | Container principal |
| `dash-heading` | `text-gray-900` | `#111827` | Títulos principales |
| `dash-subtext` | `text-gray-600` | `#4b5563` | Subtítulos |
| `dash-card-bg` | `bg-white` | `#ffffff` | Cards base |
| `dash-card-border` | `border-gray-200` | `#e5e7eb` | Bordes de cards |
| `dash-hover` | `hover:bg-gray-50` | `#f9fafb` | Hover en filas |
| `dash-divider` | `divide-gray-200` | `#e5e7eb` | Divisores |

### 4.2 Gradientes de Stat Cards

| # | Nombre | Clases Tailwind | Hex Values | Icono | Dato |
|---|---|---|---|---|---|
| 1 | `stat-campaigns` | `from-indigo-500 to-purple-600` | `#6366f1 → #9333ea` | BriefcaseIcon | Total Campañas |
| 2 | `stat-active` | `from-pink-500 to-rose-600` | `#ec4899 → #e11d48` | ArrowTrendingUpIcon | Campañas Activas |
| 3 | `stat-candidates` | `from-cyan-500 to-blue-600` | `#06b6d4 → #2563eb` | UserGroupIcon | Total Candidatos |
| 4 | `stat-recent` | `from-pink-400 to-yellow-400` | `#f472b6 → #facc15` | UserPlusIcon | Nuevos esta semana |

#### Patrón Stat Card
```
relative overflow-hidden rounded-2xl
bg-gradient-to-br from-{color}-500 to-{color}-600
text-white
Decorador: absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16
Icono bg: bg-white bg-opacity-20 backdrop-blur-md w-12 h-12 rounded-xl
```

### 4.3 Glassmorphism

| Patrón | Clases Tailwind | Uso |
|---|---|---|
| `glass-icon` | `bg-white bg-opacity-20 backdrop-blur-md` | Iconos dentro de stat cards |
| `glass-card` | `bg-white/80 backdrop-blur-md border border-white` | Candidate cards |
| `glass-badge` | `bg-white/60 backdrop-blur-sm border border-indigo-100` | Badges en Top Talent |
| `glass-nav` | `bg-white/80 backdrop-blur-md` | Landing navbar |
| `glass-modal-icon` | `bg-white/20` | Iconos en modales con gradiente |

### 4.4 Aurora Effects

| Nombre | Clases Tailwind | Posición | Uso |
|---|---|---|---|
| `aurora-top-right` | `absolute -top-24 -right-24 w-96 h-96 bg-purple-200/30 rounded-full blur-3xl` | Esquina superior derecha | Top Talent section |
| `aurora-bottom-left` | `absolute -bottom-24 -left-24 w-96 h-96 bg-blue-200/30 rounded-full blur-3xl` | Esquina inferior izquierda | Top Talent section |
| `aurora-fade-top` | `absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-white/60 to-transparent` | Borde superior | Fade-in de sección |

### 4.5 Top Talent Section

| Token | Valor | Hex | Uso |
|---|---|---|---|
| `talent-bg` | `from-violet-50 via-indigo-50 to-blue-50` | `#f5f3ff → #eef2ff → #eff6ff` | Fondo de sección |
| `talent-border` | `border-indigo-100` | `#e0e7ff` | Borde de sección |
| `talent-shadow` | `shadow-lg shadow-indigo-100/50` | — | Sombra decorativa |
| `talent-heading` | `text-slate-800` | `#1e293b` | Título de sección |
| `talent-subtext` | `text-slate-500` | `#64748b` | Descripción |
| `talent-brand-text` | `from-indigo-600 to-violet-600` (bg-clip-text) | `#4f46e5 → #7c3aed` | "TALENTOS DESTACADOS" |
| `talent-icon` | `text-indigo-600` | `#4f46e5` | SparklesIcon |

### 4.6 Candidate Cards

| Token | Valor | Hex | Uso |
|---|---|---|---|
| `candidate-bg` | `bg-white/80 backdrop-blur-md` | — | Fondo card |
| `candidate-border` | `border border-white` | — | Borde base |
| `candidate-hover-bg` | `hover:bg-white` | — | Hover fondo |
| `candidate-hover-border` | `hover:border-indigo-300` | `#a5b4fc` | Hover borde |
| `candidate-hover-shadow` | `hover:shadow-xl hover:-translate-y-1` | — | Hover elevación |
| `candidate-selected` | `ring-2 ring-indigo-500 bg-white scale-105 shadow-xl` | — | Estado seleccionado |
| `candidate-top-bar` | `h-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-t-2xl opacity-0 group-hover:opacity-100` | — | Barra superior hover |
| `candidate-width` | `w-[280px] flex-shrink-0` | — | Ancho fijo |
| `candidate-avatar-bg` | `from-indigo-100 to-violet-100` | `#e0e7ff → #ede9fe` | Fondo avatar |
| `candidate-avatar-text` | `text-indigo-600` | `#4f46e5` | Iniciales |
| `candidate-name` | `text-slate-800` | `#1e293b` | Nombre |
| `candidate-role` | `text-slate-500` | `#64748b` | Rol/cargo |
| `candidate-insight-bg` | `bg-slate-50 border border-slate-100` | `#f8fafc → #f1f5f9` | Caja de insight IA |
| `candidate-insight-text` | `text-slate-600` | `#475569` | Texto insight |
| `candidate-cta` | `bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200` | `#4f46e5 → #4338ca` | Botón "Ver Perfil" |
| `candidate-context-badge` | `bg-indigo-100/90 backdrop-blur-sm border border-indigo-200` | — | Badge de campaña |

### 4.7 Score Circle (SVG)

| Score Range | Color Stroke | Hex | Significado |
|---|---|---|---|
| ≥ 80% | `#10b981` | Emerald 500 | Excelente match |
| ≥ 60% | `#f59e0b` | Amber 500 | Buen match |
| < 60% | `#f43f5e` | Rose 500 | Match bajo |
| Background | `text-indigo-100` | `#e0e7ff` | Círculo de fondo |

### 4.8 Campaign Section

| Token | Valor | Hex | Uso |
|---|---|---|---|
| `campaign-header` | `bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-t-2xl` | `#6366f1 → #9333ea` | Header de sección |
| `campaign-card` | `bg-white rounded-2xl border border-gray-200` | — | Card contenedora |
| `campaign-row-hover` | `hover:bg-gray-50` | `#f9fafb` | Hover en fila |
| `campaign-icon-active` | `bg-green-100 text-green-600` | `#dcfce7 → #16a34a` | Icono campaña activa |
| `campaign-icon-inactive` | `bg-gray-200 text-gray-500` | `#e5e7eb → #6b7280` | Icono campaña inactiva |
| `campaign-title-hover` | `hover:text-indigo-600` | `#4f46e5` | Hover título |
| `campaign-link` | `text-indigo-600 hover:text-indigo-700` | `#4f46e5 → #4338ca` | Links de acción |
| `campaign-pause-btn` | `bg-yellow-50 text-yellow-600 hover:bg-yellow-100` | `#fefce8 → #ca8a04` | Botón pausar |
| `campaign-resume-btn` | `bg-green-50 text-green-600 hover:bg-green-100` | `#f0fdf4 → #16a34a` | Botón reactivar |

### 4.9 Status Badges (Campañas)

| Estado | Fondo | Texto | Hex BG | Hex Text |
|---|---|---|---|---|
| `ACTIVE` | `bg-green-100` | `text-green-800` | `#dcfce7` | `#166534` |
| `DRAFT` | `bg-yellow-100` | `text-yellow-800` | `#fef9c3` | `#854d0e` |
| `PAUSED` | `bg-red-100` | `text-red-800` | `#fee2e2` | `#991b1b` |
| `CLOSED` | `bg-gray-100` | `text-gray-800` | `#f3f4f6` | `#1f2937` |

### 4.10 Modals

#### Pause Modal
| Token | Valor | Hex | Uso |
|---|---|---|---|
| `modal-backdrop` | `bg-black/60 backdrop-blur-sm` | — | Overlay |
| `modal-bg` | `bg-white rounded-2xl shadow-2xl` | — | Contenedor |
| `modal-header` | `bg-gradient-to-r from-yellow-500 to-orange-500 rounded-t-2xl text-white` | `#eab308 → #f97316` | Header gradiente |
| `modal-icon-bg` | `bg-white/20 rounded-full` | — | Icono en header |
| `modal-warning-bg` | `bg-yellow-50 border-2 border-yellow-300` | `#fefce8 → #fde047` | Caja de advertencia |
| `modal-warning-text` | `text-yellow-900 / text-yellow-800` | `#713f12 / #854d0e` | Texto advertencia |
| `modal-cancel-btn` | `bg-gray-200 text-gray-700 hover:bg-gray-300` | `#e5e7eb → #374151` | Botón cancelar |
| `modal-confirm-btn` | `bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600` | `#eab308 → #f97316` | Botón confirmar |

#### Start Process Modal
| Token | Valor | Hex | Uso |
|---|---|---|---|
| `modal-icon-circle` | `bg-indigo-50 text-indigo-600 rounded-full` | `#eef2ff → #4f46e5` | Icono play |
| `modal-heading` | `text-slate-900` | `#0f172a` | Título |
| `modal-subtext` | `text-slate-500` | `#64748b` | Descripción |
| `modal-cancel-btn` | `text-slate-500 hover:bg-slate-50` | `#64748b` | Cancelar |
| `modal-confirm-btn` | `bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200` | `#4f46e5` | Confirmar |

### 4.11 Botones y CTAs del Dashboard

| Botón | Clases | Uso |
|---|---|---|
| `dash-cta-primary` | `bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200` | Botones principales |
| `dash-cta-secondary` | `bg-white text-indigo-600 hover:bg-gray-100 shadow-lg` | CTA en header gradiente |
| `dash-cta-ghost` | `text-indigo-600 hover:text-indigo-700 font-medium` | Links de acción |
| `dash-fab` | `bg-indigo-600 hover:bg-indigo-700 w-14 h-14 rounded-full shadow-lg` | Mobile FAB |
| `dash-menu-item` | `text-gray-700 hover:bg-gray-100` | Items de dropdown |
| `dash-menu-destructive` | `text-red-600 hover:bg-red-50` | Item eliminar |

### 4.12 Snackbar / Toast

| Token | Valor | Hex | Uso |
|---|---|---|---|
| `snackbar-bg` | `bg-slate-800` | `#1e293b` | Fondo |
| `snackbar-text` | `text-white` | `#ffffff` | Texto |
| `snackbar-icon` | `text-green-400` | `#4ade80` | Icono check |
| `snackbar-position` | `fixed bottom-4 right-4 z-50` | — | Posición |

### 4.13 Dashboard NavBar

| Token | Valor | Hex | Uso |
|---|---|---|---|
| `nav-bg` | `bg-white` | `#ffffff` | Fondo navbar |
| `nav-border` | `border-gray-200` | `#e5e7eb` | Borde inferior |
| `nav-text` | `text-gray-700` | `#374151` | Texto links |
| `nav-hover` | `hover:bg-blue-500 hover:text-white` | `#3b82f6` | Hover links |
| `nav-disabled` | `text-slate-400 bg-slate-50 cursor-not-allowed` | `#94a3b8` | Link deshabilitado |
| `nav-logo-gradient` | SVG: `#4F6BF6 → #8B5CF6` | `#4f6bf6 → #8b5cf6` | Logo "E" |
| `nav-logo-text` | `#18181b` | `#18181b` | Logo "valen" |
| `nav-user-btn` | `bg-blue-600 text-white hover:bg-blue-700` | `#2563eb → #1d4ed8` | Botón usuario |
| `nav-credits-bg` | `bg-slate-50 border border-slate-200` | `#f8fafc → #e2e8f0` | Badge créditos |
| `nav-credits-hover` | `hover:bg-indigo-50 hover:border-indigo-200` | `#eef2ff → #c7d2fe` | Hover créditos |
| `nav-upgrade-btn` | `from-indigo-600 to-purple-600 text-white` | `#4f46e5 → #9333ea` | Botón "Subir a PRO" |
| `nav-pro-text` | `from-amber-300 via-yellow-500 to-amber-600` | `#fcd34d → #eab308 → #d97706` | Texto "Pro" |
| `nav-credits-remaining` | `text-emerald-500` | `#10b981` | Créditos disponibles |
| `nav-credits-exhausted` | `text-red-500` | `#ef4444` | Créditos agotados |

### 4.14 Dashboard Footer

| Token | Valor | Hex | Uso |
|---|---|---|---|
| `footer-bg` | `bg-white` | `#ffffff` | Fondo |
| `footer-border` | `border-gray-200` | `#e5e7eb` | Borde superior |
| `footer-text` | `text-gray-600` | `#4b5563` | Texto copyright |
| `footer-link` | `text-gray-600 hover:text-blue-600` | `#4b5563 → #2563eb` | Links |
| `footer-logo-gradient` | SVG: `#4F6BF6 → #8B5CF6` | `#4f6bf6 → #8b5cf6` | Logo "E" |

### 4.15 Error Banner

| Token | Valor | Hex | Uso |
|---|---|---|---|
| `error-bg` | `bg-red-50` | `#fef2f2` | Fondo |
| `error-border` | `border-red-200` | `#fecaca` | Borde |
| `error-text` | `text-red-800` | `#991b1b` | Texto |
| `error-close` | `text-red-600 hover:text-red-800` | `#dc2626 → #991b1b` | Botón cerrar |

---

## 5. Contexto UI Kit (shadcn/ui)

> **Referencia completa:** Ver `docs/ui-specs/evalen-ui-kit.md`

### 5.1 Variables CSS Principales (Light Mode)

| Variable | Valor HSL | Clase Tailwind | Uso |
|---|---|---|---|
| `--background` | `0 0% 100%` | `bg-background` | Fondo app |
| `--foreground` | `222.2 84% 4.9%` | `text-foreground` | Texto principal |
| `--primary` | `222.2 47.4% 11.2%` | `bg-primary` | Botones principales |
| `--primary-foreground` | `210 40% 98%` | `text-primary-foreground` | Texto sobre primary |
| `--card` | `0 0% 100%` | `bg-card` | Fondo tarjetas |
| `--muted` | `210 40% 96.1%` | `bg-muted` | Fondos suaves |
| `--muted-foreground` | `215.4 16.3% 46.9%` | `text-muted-foreground` | Texto secundario |
| `--border` | `214.3 31.8% 91.4%` | `border-border` | Bordes |
| `--destructive` | `0 84.2% 60.2%` | `bg-destructive` | Errores |
| `--ring` | `222.2 84% 4.9%` | `ring-ring` | Focus ring |

### 5.2 Componentes UI Kit

| Componente | Archivo | Variantes |
|---|---|---|
| `Button` | `src/components/ui/button.tsx` | default, destructive, success, outline, ghost, link |
| `Card` | `src/components/ui/card.tsx` | Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter |
| `Badge` | `src/components/ui/badge.tsx` | default, secondary, destructive, success, warning, info, outline |
| `Input` | `src/components/ui/input.tsx` | Con soporte de error |
| `Label` | `src/components/ui/label.tsx` | Label estándar |
| `Spinner` | `src/components/ui/spinner.tsx` | sm, md, lg |
| `Skeleton` | `src/components/ui/skeleton.tsx` | Genérico con animate-pulse |

### 5.3 Colores Hardcodeados en UI Kit (⚠️ Deuda)

| Componente | Color Hardcodeado | Debería ser |
|---|---|---|
| `Button` default | `bg-blue-500` | `bg-primary` |
| `Button` destructive | `bg-red-500` | `bg-destructive` |
| `Card` | `border-gray-200 bg-white` | `border-border bg-card` |
| `CardDescription` | `text-gray-500` | `text-muted-foreground` |
| `Badge` default | `bg-gray-900` | `bg-primary` |
| `Badge` secondary | `bg-gray-100` | `bg-muted` |

---

## 6. Design Tokens Unificados — Tabla Maestra

### 6.1 Gradientes

| Token Name | Clases Tailwind | Hex Values | Contextos | Uso |
|---|---|---|---|---|
| `gradient-brand` | `from-indigo-600 to-purple-600` | `#4f46e5 → #9333ea` | Landing, Dashboard | Logo, CTAs, headers |
| `gradient-brand-light` | `from-indigo-400 to-purple-400` | `#818cf8 → #c084fc` | Landing (footer) | Logo footer |
| `gradient-brand-nav` | SVG: `#4F6BF6 → #8B5CF6` | `#4f6bf6 → #8b5cf6` | Dashboard (nav, footer) | Logo "E" |
| `gradient-stat-1` | `from-indigo-500 to-purple-600` | `#6366f1 → #9333ea` | Dashboard | Stat: Total Campañas |
| `gradient-stat-2` | `from-pink-500 to-rose-600` | `#ec4899 → #e11d48` | Dashboard | Stat: Campañas Activas |
| `gradient-stat-3` | `from-cyan-500 to-blue-600` | `#06b6d4 → #2563eb` | Dashboard | Stat: Total Candidatos |
| `gradient-stat-4` | `from-pink-400 to-yellow-400` | `#f472b6 → #facc15` | Dashboard | Stat: Nuevos semana |
| `gradient-auth-panel` | `from-[#7E3AF2] via-[#6D28D9] to-[#5C60F5]` | `#7E3AF2 → #6D28D9 → #5C60F5` | Auth (Login) | Panel izquierdo |
| `gradient-auth-btn` | `from-violet-600 to-indigo-600` | `#7c3aed → #4f46e5` | Auth (Login) | Botón submit |
| `gradient-auth-headline` | `from-white via-white to-purple-200` | `#fff → #fff → #e9d5ff` | Auth (Login) | Headline |
| `gradient-warning` | `from-yellow-500 to-orange-500` | `#eab308 → #f97316` | Dashboard | Modal pause header |
| `gradient-badge-warm` | `from-amber-400 to-orange-400` | `#fbbf24 → #fb923c` | Landing | Badge "Recomendado" |
| `gradient-talent-text` | `from-indigo-600 to-violet-600` (bg-clip-text) | `#4f46e5 → #7c3aed` | Dashboard | "TALENTOS DESTACADOS" |
| `gradient-candidate-bar` | `from-indigo-500 to-purple-500` | `#6366f1 → #a855f7` | Dashboard | Top bar candidate card |
| `gradient-pro-badge` | `from-amber-300 via-yellow-500 to-amber-600` | `#fcd34d → #eab308 → #d97706` | Dashboard (nav) | Badge "Pro" |
| `gradient-auth-container` | `linear-gradient(135deg, #667eea, #764ba2)` | `#667eea → #764ba2` | Auth (no usado) | AuthContainer bg |

### 6.2 Sombras Decorativas

| Token Name | Clases Tailwind | Contextos | Uso |
|---|---|---|---|
| `shadow-card` | `shadow-sm` | UI Kit | Cards base |
| `shadow-featured` | `shadow-2xl shadow-indigo-500/30` | Landing | Pricing card featured |
| `shadow-cta-lg` | `shadow-lg` | Landing, Dashboard | Botones CTA |
| `shadow-cta-sm` | `shadow-sm` | Landing | Botones secundarios |
| `shadow-talent` | `shadow-lg shadow-indigo-100/50` | Dashboard | Top Talent section |
| `shadow-indigo-btn` | `shadow-lg shadow-indigo-200` | Dashboard | Candidate CTA |
| `shadow-violet-btn` | `shadow-lg shadow-violet-500/25` | Auth | Login submit button |
| `shadow-violet-btn-hover` | `shadow-xl shadow-violet-500/30` | Auth | Login submit hover |
| `shadow-slate-btn` | `shadow-lg shadow-slate-200` | Dashboard | "Gestionar Candidato" |
| `shadow-fab` | `shadow-lg` | Dashboard | Mobile FAB |
| `shadow-modal` | `shadow-2xl` | Dashboard | Modales |
| `shadow-badge` | `shadow-lg` | Landing | Badge "Recomendado" |
| `shadow-nav-upgrade` | `shadow-md` | Dashboard | Botón "Subir a PRO" |
| `shadow-credits` | `shadow-sm` | Dashboard | Badge créditos |

### 6.3 Glassmorphism

| Token Name | Patrón de Clases | Contextos | Uso |
|---|---|---|---|
| `glass-navbar` | `bg-white/80 backdrop-blur-md` | Landing | Navbar |
| `glass-stat-icon` | `bg-white bg-opacity-20 backdrop-blur-md` | Dashboard | Iconos en stat cards |
| `glass-candidate` | `bg-white/80 backdrop-blur-md border border-white` | Dashboard | Candidate cards |
| `glass-badge-sm` | `bg-white/60 backdrop-blur-sm border border-indigo-100` | Dashboard | Badges Top Talent |
| `glass-modal-icon` | `bg-white/20` | Dashboard | Iconos en modal headers |
| `glass-auth-icon` | `bg-white/10 backdrop-blur-md border border-white/20` | Auth | Feature icons |
| `glass-backdrop` | `bg-black/60 backdrop-blur-sm` | Dashboard | Modal backdrops |

### 6.4 Aurora / Background Effects

| Token Name | Patrón | Contextos | Uso |
|---|---|---|---|
| `aurora-purple` | `absolute -top-24 -right-24 w-96 h-96 bg-purple-200/30 rounded-full blur-3xl` | Dashboard | Top Talent |
| `aurora-blue` | `absolute -bottom-24 -left-24 w-96 h-96 bg-blue-200/30 rounded-full blur-3xl` | Dashboard | Top Talent |
| `aurora-fade` | `absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-white/60 to-transparent` | Dashboard | Fade superior |
| `auth-orb-white` | `absolute bg-white/20 blur-[180px]` | Auth | Panel izquierdo orb 1 |
| `auth-orb-purple` | `absolute bg-purple-300/20 blur-[160px]` | Auth | Panel izquierdo orb 2 |
| `auth-orb-indigo` | `absolute bg-indigo-300/15 blur-[100px]` | Auth | Panel izquierdo orb 3 |
| `auth-pattern` | SVG diagonal lines `opacity-[0.04]` | Auth | Patrón de fondo |
| `auth-particles` | `w-1~2 h-1~2 bg-white/20~40 rounded-full animate-pulse` | Auth | Partículas flotantes |

### 6.5 Status Colors

| Token Name | Clases Tailwind | Hex BG | Hex Text | Contextos | Uso |
|---|---|---|---|---|---|
| `status-active` | `bg-green-100 text-green-800` | `#dcfce7` | `#166534` | Dashboard | Campaña activa |
| `status-draft` | `bg-yellow-100 text-yellow-800` | `#fef9c3` | `#854d0e` | Dashboard | Campaña borrador |
| `status-paused` | `bg-red-100 text-red-800` | `#fee2e2` | `#991b1b` | Dashboard | Campaña pausada |
| `status-closed` | `bg-gray-100 text-gray-800` | `#f3f4f6` | `#1f2937` | Dashboard | Campaña cerrada |
| `score-excellent` | `stroke: #10b981` | — | `#10b981` | Dashboard | Score ≥ 80% |
| `score-good` | `stroke: #f59e0b` | — | `#f59e0b` | Dashboard | Score ≥ 60% |
| `score-low` | `stroke: #f43f5e` | — | `#f43f5e` | Dashboard | Score < 60% |
| `credits-available` | `text-emerald-500` | — | `#10b981` | Dashboard | Créditos disponibles |
| `credits-exhausted` | `text-red-500` | — | `#ef4444` | Dashboard | Créditos agotados |

### 6.6 Brand Colors (Consolidados)

| Token | Landing | Auth | Dashboard | UI Kit | Hex |
|---|---|---|---|---|---|
| **Primary** | `indigo-600` | `violet-600` | `indigo-600` | `--primary` (navy) | `#4f46e5` / `#7c3aed` |
| **Primary Hover** | `indigo-700` | `violet-700` | `indigo-700` | — | `#4338ca` / `#6d28d9` |
| **Secondary** | `purple-600` | `indigo-600` | `purple-600` | `--secondary` | `#9333ea` / `#4f46e5` |
| **Accent** | `amber-400` | — | `amber-300` | `--accent` | `#fbbf24` / `#fcd34d` |
| **Success** | — | — | `green-100/800` | `green-500` | `#dcfce7` / `#22c55e` |
| **Warning** | — | — | `yellow-100/800` | `orange-500` | `#fef9c3` / `#f97316` |
| **Error** | — | `red-600` | `red-100/800` | `--destructive` | `#dc2626` / `#ef4444` |

> ⚠️ **Nota crítica:** El color "primary" varía entre contextos: Landing usa `indigo-600`, Auth usa `violet-600`, y el UI Kit define `--primary` como un azul marino oscuro (`222.2 47.4% 11.2%`).

---

## 7. Mapa de Inconsistencias

### 7.1 Landing → UI Kit (Colores hardcodeados que NO usan variables CSS)

| Hardcodeado en Landing | Variable CSS Equivalente | Archivo | Línea aprox. | Severidad |
|---|---|---|---|---|
| `bg-white dark:bg-gray-900` | `bg-background` | LandingPage.tsx | 14 | 🟡 Media |
| `bg-gray-50 dark:bg-gray-800` | `bg-secondary` / `bg-muted` | LandingPricing.tsx | 77 | 🟡 Media |
| `text-gray-900 dark:text-white` | `text-foreground` | LandingPricing.tsx | 61 | 🟡 Media |
| `text-gray-600 dark:text-gray-300` | `text-muted-foreground` | LandingPricing.tsx | 64 | 🟡 Media |
| `text-gray-500 dark:text-gray-400` | `text-muted-foreground` | LandingPricing.tsx | 99 | 🟢 Baja |
| `border-gray-200 dark:border-gray-700` | `border-border` | LandingNavbar.tsx | 18 | 🟡 Media |
| `bg-gray-100 dark:bg-gray-800` | `bg-muted` | LandingNavbar.tsx | 55 | 🟢 Baja |
| `text-gray-700 dark:text-gray-200` | `text-foreground` | LandingNavbar.tsx | 76 | 🟡 Media |
| `bg-gray-900 dark:bg-gray-950` | `bg-background` (dark) | LandingFooter.tsx | 5 | 🟡 Media |
| `text-gray-300 hover:text-white` | `text-muted-foreground` → `text-foreground` | LandingFooter.tsx | 40 | 🟢 Baja |
| `text-gray-400` | `text-muted-foreground` | LandingFooter.tsx | 14 | 🟢 Baja |
| `border-gray-800` | `border-border` (dark) | LandingFooter.tsx | 83 | 🟢 Baja |

### 7.2 Dashboard → UI Kit (Colores hardcodeados que NO usan variables CSS)

| Hardcodeado en Dashboard | Variable CSS Equivalente | Archivo | Severidad |
|---|---|---|---|
| `bg-gray-50` | `bg-background` / `bg-secondary` | Layout.tsx | 🟡 Media |
| `bg-white` | `bg-card` | Dashboard.tsx (múltiples) | 🟡 Media |
| `border-gray-200` | `border-border` | Dashboard.tsx | 🟡 Media |
| `text-gray-900` | `text-foreground` | Dashboard.tsx | 🟡 Media |
| `text-gray-600` | `text-muted-foreground` | Dashboard.tsx | 🟡 Media |
| `text-gray-500` | `text-muted-foreground` | Dashboard.tsx | 🟢 Baja |
| `divide-gray-200` | `border-border` | Dashboard.tsx | 🟢 Baja |
| `hover:bg-gray-50` | `hover:bg-accent` | Dashboard.tsx | 🟢 Baja |
| `bg-slate-800` (snackbar) | No existe equivalente | Dashboard.tsx | 🔴 Alta |
| `text-slate-800` | `text-foreground` | Dashboard.tsx | 🟡 Media |
| `text-slate-500` | `text-muted-foreground` | Dashboard.tsx | 🟡 Media |
| `bg-slate-50` | `bg-muted` | Dashboard.tsx | 🟢 Baja |
| `border-slate-100` | `border-border` | Dashboard.tsx | 🟢 Baja |
| `bg-red-50 border-red-200 text-red-800` | `bg-destructive/10 border-destructive/20 text-destructive` | Dashboard.tsx | 🟡 Media |

### 7.3 Gradientes que NO existen en el UI Kit

| Gradiente | Contexto | Recomendación |
|---|---|---|
| `from-indigo-600 to-purple-600` | Landing, Dashboard | Crear variable CSS `--gradient-brand` |
| `from-indigo-500 to-purple-600` | Dashboard stat card 1 | Crear `--gradient-stat-primary` |
| `from-pink-500 to-rose-600` | Dashboard stat card 2 | Crear `--gradient-stat-active` |
| `from-cyan-500 to-blue-600` | Dashboard stat card 3 | Crear `--gradient-stat-candidates` |
| `from-pink-400 to-yellow-400` | Dashboard stat card 4 | Crear `--gradient-stat-recent` |
| `from-[#7E3AF2] via-[#6D28D9] to-[#5C60F5]` | Auth Login panel | Crear `--gradient-auth-panel` |
| `from-violet-600 to-indigo-600` | Auth Login botón | Crear `--gradient-auth-btn` |
| `from-yellow-500 to-orange-500` | Dashboard modal pause | Crear `--gradient-warning` |
| `from-amber-400 to-orange-400` | Landing badge | Crear `--gradient-accent-warm` |

### 7.4 Inconsistencias Cross-Contexto

| Elemento | Landing | Auth | Dashboard | UI Kit | Problema |
|---|---|---|---|---|---|
| **Color primario** | `indigo-600` | `violet-600` | `indigo-600` | `--primary` (navy) | 🔴 4 valores distintos |
| **Fondo app** | `white/gray-900` | `white` | `gray-50` | `--background` | 🟡 3 valores distintos |
| **Texto principal** | `gray-900` | `slate-900` | `gray-900` | `--foreground` | 🟡 gray vs slate |
| **Texto secundario** | `gray-600` | `slate-500` | `gray-600` | `--muted-foreground` | 🟡 gray vs slate |
| **Bordes** | `gray-200` | `slate-200` | `gray-200` | `--border` | 🟡 gray vs slate |
| **Logo gradiente** | `indigo→purple` | `white→indigo` (SVG) | `#4F6BF6→#8B5CF6` (SVG) | — | 🔴 3 gradientes distintos |
| **Modo oscuro** | ✅ Soportado | ❌ No soportado | ❌ No soportado | ✅ Soportado | 🔴 Inconsistente |
| **Register styles** | Tailwind | **Inline styles** | Tailwind | Tailwind | 🔴 Register es deuda técnica |

---

## 8. Patrones Reutilizables Documentados

### 8.1 StatCard con Gradiente

```tsx
import { ReactNode } from 'react';

interface StatCardProps {
  value: string | number;
  label: string;
  icon: ReactNode;
  gradient: string; // e.g. "from-indigo-500 to-purple-600"
}

export function StatCard({ value, label, icon, gradient }: StatCardProps) {
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} text-white`}>
      {/* Decorative circle */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16" />
      
      <div className="relative p-6">
        <div className="bg-white bg-opacity-20 backdrop-blur-md w-12 h-12 rounded-xl flex items-center justify-center mb-4">
          {icon}
        </div>
        <p className="text-3xl font-extrabold mb-1">{value}</p>
        <p className="text-sm font-medium opacity-90">{label}</p>
      </div>
    </div>
  );
}

// Uso:
// <StatCard value={stats.totalCampaigns} label="Total Campañas" icon={<BriefcaseIcon />} gradient="from-indigo-500 to-purple-600" />
```

### 8.2 GlassCard (Glassmorphism)

```tsx
import { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'candidate' | 'badge';
  onClick?: () => void;
}

export function GlassCard({ children, className, variant = 'default', onClick }: GlassCardProps) {
  const variants = {
    default: 'bg-white/80 backdrop-blur-md border border-white',
    candidate: 'bg-white/80 backdrop-blur-md rounded-2xl border border-white shadow-sm',
    badge: 'bg-white/60 backdrop-blur-sm border border-indigo-100 rounded-full px-3 py-0.5',
  };

  return (
    <div
      className={cn(variants[variant], className)}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {children}
    </div>
  );
}
```

### 8.3 AuroraBackground

```tsx
import { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface AuroraBackgroundProps {
  children: ReactNode;
  className?: string;
  header?: ReactNode;
}

export function AuroraBackground({ children, className, header }: AuroraBackgroundProps) {
  return (
    <div className={cn(
      'bg-gradient-to-r from-violet-50 via-indigo-50 to-blue-50',
      'rounded-2xl border border-indigo-100',
      'shadow-lg shadow-indigo-100/50',
      'relative overflow-hidden',
      className
    )}>
      {/* Aurora effects */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-purple-200/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-blue-200/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-white/60 to-transparent pointer-events-none" />
      
      {header && (
        <div className="p-8 border-b border-indigo-50 relative z-10">
          {header}
        </div>
      )}
      
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
```

### 8.4 CandidateCard

```tsx
import { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface CandidateCardProps {
  name: string;
  initials: string;
  role?: string;
  score: number;
  insight: string;
  campaignTitle?: string;
  isSelected?: boolean;
  onClick: () => void;
  actionLabel?: string;
  actionIcon?: ReactNode;
}

export function CandidateCard({
  name, initials, role, score, insight,
  campaignTitle, isSelected, onClick,
  actionLabel = 'Ver Perfil Completo', actionIcon
}: CandidateCardProps) {
  const scoreColor = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#f43f5e';
  const circumference = 125.6;
  const offset = circumference - (score / 100 * circumference);

  return (
    <div
      onClick={onClick}
      className={cn(
        'group relative w-[280px] flex-shrink-0 bg-white/80 backdrop-blur-md rounded-2xl border border-white p-5',
        'hover:bg-white hover:border-indigo-300 hover:shadow-xl hover:-translate-y-1',
        'transition-all duration-300 cursor-pointer shadow-sm snap-center',
        isSelected && 'ring-2 ring-indigo-500 bg-white scale-105 shadow-xl'
      )}
    >
      {/* Top gradient bar on hover */}
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-t-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
      
      {/* Context badge */}
      {campaignTitle && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-indigo-100/90 backdrop-blur-sm border border-indigo-200 rounded-full px-3 py-0.5 z-20 shadow-sm opacity-0 group-hover:opacity-100 transition-all duration-300">
          <p className="text-[10px] font-bold text-indigo-800 truncate max-w-[180px]">
            Postula a: {campaignTitle}
          </p>
        </div>
      )}
      
      {/* Score circle */}
      <div className="absolute top-4 right-4">
        <div className="relative w-12 h-12 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90">
            <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-indigo-100" />
            <circle
              cx="24" cy="24" r="20"
              stroke={scoreColor}
              strokeWidth="4" fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <span className="absolute text-xs font-bold text-slate-700">{Math.round(score)}%</span>
        </div>
      </div>
      
      {/* Avatar & Info */}
      <div className="flex flex-col items-center text-center mt-6 mb-4">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 p-1 mb-3 shadow-md">
          <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-xl font-bold text-indigo-600">
            {initials}
          </div>
        </div>
        <h3 className="text-lg font-bold text-slate-800 truncate w-full px-2">{name}</h3>
        {role && (
          <p className="text-slate-500 text-xs font-medium mt-1 truncate w-full px-4">{role}</p>
        )}
      </div>
      
      {/* AI Insight */}
      <div className="bg-slate-50 rounded-xl p-3 mb-4 text-xs text-slate-600 text-center border border-slate-100 min-h-[64px] flex items-center justify-center">
        <p className="line-clamp-3 leading-relaxed">{insight}</p>
      </div>
      
      {/* Action */}
      <button className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-colors shadow-lg shadow-indigo-200 flex items-center justify-center gap-2">
        {actionIcon}
        {actionLabel}
      </button>
    </div>
  );
}
```

### 8.5 GradientHeader (para modals/secciones)

```tsx
import { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface GradientHeaderProps {
  children: ReactNode;
  variant?: 'brand' | 'warning' | 'campaign';
  className?: string;
  actions?: ReactNode;
}

export function GradientHeader({ children, variant = 'brand', className, actions }: GradientHeaderProps) {
  const variants = {
    brand: 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white',
    warning: 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white',
    campaign: 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-t-2xl',
  };

  return (
    <div className={cn('p-6 flex justify-between items-center', variants[variant], className)}>
      <div>{children}</div>
      {actions && <div>{actions}</div>}
    </div>
  );
}
```

### 8.6 ScoreCircle (SVG circular)

```tsx
import { cn } from '../../lib/utils';

interface ScoreCircleProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showLabel?: boolean;
}

export function ScoreCircle({ score, size = 'md', className, showLabel = true }: ScoreCircleProps) {
  const sizes = {
    sm: { container: 'w-10 h-10', text: 'text-[10px]', radius: 16, strokeWidth: 3 },
    md: { container: 'w-12 h-12', text: 'text-xs', radius: 20, strokeWidth: 4 },
    lg: { container: 'w-16 h-16', text: 'text-sm', radius: 28, strokeWidth: 4 },
  };

  const { container, text, radius, strokeWidth } = sizes[size];
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(score, 100) / 100 * circumference);
  
  const strokeColor = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#f43f5e';

  return (
    <div className={cn('relative flex items-center justify-center', container, className)}>
      <svg className="w-full h-full transform -rotate-90">
        <circle
          cx={radius + strokeWidth / 2}
          cy={radius + strokeWidth / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="text-indigo-100"
        />
        <circle
          cx={radius + strokeWidth / 2}
          cy={radius + strokeWidth / 2}
          r={radius}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
          strokeLinecap="round"
        />
      </svg>
      {showLabel && (
        <span className={cn('absolute font-bold text-slate-700', text)}>
          {Math.round(score)}%
        </span>
      )}
    </div>
  );
}
```

---

## 9. Recomendaciones de Unificación

### Fase 1: Fundamentos (Prioridad 🔴 Alta)

| # | Acción | Archivos Afectados | Impacto | Esfuerzo |
|---|---|---|---|---|
| 1.1 | **Migrar Register.tsx de inline styles a Tailwind** | `Register.tsx` | Elimina deuda técnica crítica, habilita dark mode | Medio |
| 1.2 | **Unificar color primario**: elegir `indigo-600` como brand primary y crear variable CSS `--brand-primary` | Todos los contextos | Consistencia visual inmediata | Bajo |
| 1.3 | **Crear variables CSS para gradientes** en `index.css`: `--gradient-brand`, `--gradient-warning`, `--gradient-stat-*` | `index.css`, `tailwind.config.js` | Centraliza gradientes | Bajo |
| 1.4 | **Extender ThemeContext al Dashboard**: envolver Layout con ThemeProvider o crear un `AppThemeProvider` global | `App.tsx`, `Layout.tsx` | Habilita dark mode en dashboard | Medio |

### Fase 2: Componentes Compartidos (Prioridad 🟡 Media)

| # | Acción | Archivos Afectados | Impacto | Esfuerzo |
|---|---|---|---|---|
| 2.1 | **Crear `StatCard` como componente reutilizable** (ver patrón 8.1) | `Dashboard.tsx` | Reduce duplicación, facilita nuevos stats | Bajo |
| 2.2 | **Crear `GlassCard` como componente reutilizable** (ver patrón 8.2) | `Dashboard.tsx`, `LandingNavbar.tsx` | Unifica glassmorphism | Bajo |
| 2.3 | **Crear `AuroraBackground` como componente** (ver patrón 8.3) | `Dashboard.tsx` | Encapsula aurora effects | Bajo |
| 2.4 | **Crear `CandidateCard` como componente** (ver patrón 8.4) | `Dashboard.tsx` | Reduce complejidad del Dashboard | Medio |
| 2.5 | **Crear `ScoreCircle` como componente** (ver patrón 8.6) | `Dashboard.tsx` | Reutilizable en otros contextos | Bajo |
| 2.6 | **Crear `GradientHeader` como componente** (ver patrón 8.5) | `Dashboard.tsx` | Unifica headers con gradiente | Bajo |

### Fase 3: Sistema de Tokens (Prioridad 🟡 Media)

| # | Acción | Archivos Afectados | Impacto | Esfuerzo |
|---|---|---|---|---|
| 3.1 | **Migrar colores hardcodeados de Landing a variables CSS** | `LandingPage.tsx`, `LandingNavbar.tsx`, `LandingPricing.tsx`, `LandingFooter.tsx` | Consistencia con UI Kit | Alto |
| 3.2 | **Migrar colores hardcodeados de Dashboard a variables CSS** | `Dashboard.tsx`, `Layout.tsx`, `NavBar.tsx`, `FooterFinal.tsx` | Consistencia con UI Kit | Alto |
| 3.3 | **Unificar logo SVG**: un solo componente `EvalenLogo` con variantes (light, dark, gradient) | Todos los archivos con logo | Elimina 4+ definiciones duplicadas | Medio |
| 3.4 | **Crear archivo de tokens**: `src/tokens/design-tokens.ts` con constantes tipadas | Nuevo archivo | Fuente de verdad programática | Bajo |

### Fase 4: Dark Mode Global (Prioridad 🟢 Baja)

| # | Acción | Archivos Afectados | Impacto | Esfuerzo |
|---|---|---|---|---|
| 4.1 | **Implementar dark mode en Dashboard** | `Dashboard.tsx`, `Layout.tsx`, `NavBar.tsx` | Experiencia consistente | Alto |
| 4.2 | **Implementar dark mode en Auth** | `Login.tsx`, `Register.tsx` | Experiencia consistente | Alto |
| 4.3 | **Unificar ThemeContext**: un solo provider global en `App.tsx` | `App.tsx`, `ThemeContext.tsx` | Elimina duplicación | Medio |

### Roadmap Visual

```
FASE 1 (Semana 1-2)          FASE 2 (Semana 2-3)          FASE 3 (Semana 3-5)          FASE 4 (Semana 5-7)
┌─────────────────────┐      ┌─────────────────────┐      ┌─────────────────────┐      ┌─────────────────────┐
│ 🔴 Register → TW    │      │ 🟡 StatCard comp.   │      │ 🟡 Landing → vars   │      │ 🟢 Dashboard dark   │
│ 🔴 Brand primary    │      │ 🟡 GlassCard comp.  │      │ 🟡 Dashboard → vars │      │ 🟢 Auth dark mode   │
│ 🔴 CSS gradients    │      │ 🟡 AuroraBg comp.   │      │ 🟡 Unificar logo    │      │ 🟢 ThemeProvider    │
│ 🔴 ThemeContext global│    │ 🟡 CandidateCard    │      │ 🟡 Tokens .ts file  │      │    global unificado │
│                     │      │ 🟡 ScoreCircle comp.│      │                     │      │                     │
│                     │      │ 🟡 GradientHeader   │      │                     │      │                     │
└─────────────────────┘      └─────────────────────┘      └─────────────────────┘      └─────────────────────┘
```

---

## Apéndice A: Mapa de Archivos por Contexto

| Contexto | Archivos |
|---|---|
| **Landing** | `src/landing/LandingPage.tsx`, `src/landing/components/LandingNavbar.tsx`, `src/landing/components/LandingPricing.tsx`, `src/landing/components/LandingFooter.tsx`, `src/landing/components/HeroSection.tsx`, `src/landing/components/FeaturesSection.tsx`, `src/landing/components/HowItWorks.tsx`, `src/landing/components/DemoSection.tsx` |
| **Auth** | `src/components/auth/Login.tsx`, `src/components/auth/Register.tsx`, `src/components/auth/AuthContainer.tsx`, `src/components/auth/AuthCallback.tsx`, `src/components/auth/EvalenAuth.tsx`, `src/components/auth/ActivateAccount.tsx` |
| **Dashboard** | `src/components/dashboard/Dashboard.tsx`, `src/components/layout/Layout.tsx`, `src/components/layout/NavBar.tsx`, `src/components/layout/FooterFinal.tsx`, `src/components/dashboard/DashboardActivation.tsx`, `src/components/dashboard/DashboardUploadModal.tsx` |
| **UI Kit** | `src/components/ui/button.tsx`, `src/components/ui/card.tsx`, `src/components/ui/badge.tsx`, `src/components/ui/input.tsx`, `src/components/ui/label.tsx`, `src/components/ui/spinner.tsx`, `src/components/ui/skeleton.tsx` |
| **Theme** | `src/contexts/ThemeContext.tsx` |

## Apéndice B: Animaciones Personalizadas

| Clase | Duración | Easing | Descripción | Contextos |
|---|---|---|---|---|
| `animate-slide-up` | `0.3s` | `ease-out` | Slide up con fade-in | UI Kit (modals/toasts) |
| `animate-gradient-xy` | `15s` | `ease infinite` | Gradiente animado | Landing (hero) |
| `animate-pulse-slow` | Custom | `ease` | Pulso lento | Dashboard (SparklesIcon) |
| `animate-float` | Custom | `ease` | Flotación suave | Dashboard (score badges) |
| `animate-fade-in-up` | Custom | `ease-out` | Fade in desde abajo | Dashboard (snackbar, modals) |
| `animate-fade-in-right` | Custom | `ease-out` | Fade in desde derecha | Dashboard (vista rápida) |
| `animate-modal-in` | Custom | `ease-out` | Entrada de modal | Dashboard (pause modal) |
| `animate-[shake_0.5s]` | `0.5s` | `ease-in-out` | Shake de error | Auth (Login error) |

---

> **Mantenimiento:** Este documento debe actualizarse cada vez que se añadan nuevos componentes, se modifiquen colores o se cambien las directrices de diseño.  
> **Responsable:** Frontend Tech Lead — Evalen (currify-front)  
> **Documento relacionado:** `docs/ui-specs/evalen-ui-kit.md` (UI Kit shadcn/ui)
