# 🎨 Evalen Landing Page — Design System v3.0 "Aurora Glassmorphism"

> **Estado:** ✅ Implementado y compilado exitosamente
> **Fecha:** 2026-04-06
> **Framework:** React 18 + Create React App + Tailwind CSS v3.4

---

## 1. Design System v3.0 — Aurora Glassmorphism

### 1.1 Filosofía Visual
Estética **neo-glassmorphism** con orbes de luz aurora animados como fondo activo. Transición fluida entre modo día (blanco perla) y noche (azul profundo). Tipografía bold con tracking ajustado para un look "brutalista-elegante".

### 1.2 Paleta de Colores

| Token | Dark Mode | Light Mode |
|-------|-----------|------------|
| **Fondo principal** | `#030014` | `#fdfdfd` |
| **Texto principal** | `text-slate-50` | `text-slate-900` |
| **Texto secundario** | `text-slate-400` | `text-slate-500` |
| **Texto muted** | `text-slate-500` | `text-slate-400` |

#### Gradientes Aurora (Orbes)
| Color | Dark Mode | Light Mode |
|-------|-----------|------------|
| Orbe 1 | `bg-fuchsia-600` | `bg-rose-400` |
| Orbe 2 | `bg-cyan-500` | `bg-blue-400` |
| Orbe 3 | `bg-violet-600` | `bg-amber-300` |

#### Gradiente CTA Principal
`bg-gradient-to-r from-rose-500 via-fuchsia-500 to-violet-600`

### 1.3 Tipografía
- **Familia:** Plus Jakarta Sans (configurada en `index.css`)
- **H1/H2:** `font-black tracking-tighter` (900, -0.05em)
- **Títulos sección:** `font-bold` (700)
- **Texto base:** `font-medium` (500)

### 1.4 Clases CSS Personalizadas (inyectadas en `index.css`)

| Clase | Descripción |
|-------|-------------|
| `.animate-blob` | Animación de orbes de fondo (10s infinite alternate) |
| `.animation-delay-2000` | Delay de 2s para animación blob |
| `.animation-delay-4000` | Delay de 4s para animación blob |
| `.glass-effect` | `backdrop-filter: blur(16px)` — efecto cristal |
| `.text-gradient-vibrant` | Texto con gradiente animado (rose→violet→cyan) |
| `.animate-fade-in-up` | Fade-in con desplazamiento vertical (scroll reveal) |
| `.animate-float` | Animación flotante para annotations |

---

## 2. Estructura de Archivos

```
currify-front/src/landing/
├── LandingPage.tsx                    ← Componente principal (orquestador)
├── components/
│   ├── LandingNavbar.tsx              ← Navbar glass con mobile menu
│   ├── HeroSection.tsx                ← Hero con carousel + aurora bg
│   ├── LogoCloud.tsx                  ← Social proof (5 empresas)
│   ├── FeaturesSection.tsx            ← 3 glass cards con iconos
│   ├── DemoSection.tsx                ← Mockup dashboard glass
│   ├── HowItWorks.tsx                 ← 3 pasos con línea conectora
│   ├── Testimonials.tsx               ← 3 testimonios glass
│   ├── LandingPricing.tsx             ← 3 planes (Starter/Pro/Enterprise)
│   ├── CTABanner.tsx                  ← Banner CTA final glass
│   └── LandingFooter.tsx              ← Footer 4 columnas glass
└── hooks/
    ├── useCarousel.ts                 ← Auto-rotate carousel
    ├── useCarousel.test.ts            ← Tests del hook
    ├── useScrollAnimation.ts          ← Intersection Observer reveal
    └── useScrollAnimation.test.tsx    ← Tests del hook
```

---

## 3. Componentes y Props

### 3.1 LandingNavbar
- **Props:** Ninguno (usa `useTheme` internamente)
- **Features:** Glass navbar, mobile menu toggle, dark mode toggle, auth-aware
- **Enlaces:** `/login?plan=free` (ambos botones CTA)

### 3.2 HeroSection
- **Props:** Ninguno
- **Features:** Aurora background, neon badge, carousel 3 slides, CTA dual
- **Hook:** `useCarousel(3, 4000)`
- **Enlaces:** `/login?plan=free` (primario y secundario)

### 3.3 LogoCloud
- **Props:** Ninguno
- **Features:** 5 logos con iconos Lucide, hover effects
- **Optimización:** `React.memo`

### 3.4 FeaturesSection
- **Props:** Ninguno
- **Features:** 3 glass cards, iconos con gradiente, hover glow
- **Hook:** `useScrollAnimation` por card

### 3.5 DemoSection
- **Props:** Ninguno
- **Features:** Mockup browser glass, upload zone, candidate match bars, floating annotation
- **Hook:** `useScrollAnimation`

### 3.6 HowItWorks
- **Props:** Ninguno
- **Features:** 3 glass step cards, línea conectora gradiente aurora
- **Hook:** `useScrollAnimation` por step
- **Enlace:** `/login?plan=free`

### 3.7 Testimonials
- **Props:** Ninguno
- **Features:** 3 glass cards, estrellas, avatares con gradiente
- **Hook:** `useScrollAnimation` por card

### 3.8 LandingPricing
- **Props:** Ninguno
- **Features:** 3 planes glass, plan Pro destacado con gradiente, badge "Recomendado"
- **Hook:** `useScrollAnimation` por card
- **Enlaces:**
  - Starter → `/login?plan=free`
  - Pro → `/login?plan=pro`
  - Enterprise → `/login?plan=enterprise`

### 3.9 CTABanner
- **Props:** Ninguno
- **Features:** Glass container con aurora corners, CTA dual
- **Optimización:** `React.memo`
- **Enlaces:** `/login?plan=free` y `/login?plan=pro`

### 3.10 LandingFooter
- **Props:** Ninguno
- **Features:** 4 columnas (Brand, Producto, Legal, CTA), social icons
- **Optimización:** `React.memo`
- **Enlace CTA:** `/login?plan=free`

---

## 4. Hooks Reutilizables

### 4.1 `useCarousel(totalSlides, intervalMs)`
```ts
interface UseCarouselReturn {
  currentSlide: number;
  goToSlide: (index: number) => void;
  totalSlides: number;
}
```
- Auto-rotate cada `intervalMs` (default: 4000ms)
- Soporte para navegación manual con `goToSlide`

### 4.2 `useScrollAnimation(threshold)`
```ts
interface UseScrollAnimationReturn {
  ref: React.RefObject<HTMLDivElement | null>;
  isVisible: boolean;
}
```
- Intersection Observer con `threshold` configurable (default: 0.1)
- Unobserve automático después de animar
- Asigna `ref` al elemento y usa `isVisible` para condicional

---

## 5. Manejo de Estados

### 5.1 Dark Mode
- **Contexto:** `ThemeContext` (`src/contexts/ThemeContext.tsx`)
- **Hook:** `const { theme, toggleTheme } = useTheme()`
- **Detección:** `const isDark = theme === 'dark'`
- **Persistencia:** `localStorage` con key `evalen-landing-theme`
- **System preference:** Detecta `prefers-color-scheme: dark`

### 5.2 Scroll Animations
- Cada sección usa `useScrollAnimation` para fade-in-up al entrar en viewport
- Animación se ejecuta una sola vez (unobserve después de activar)
- Staggered delays con `animationDelay` inline style

### 5.3 Carousel
- Auto-advance cada 4 segundos
- Indicadores clickeables (dots con transición de ancho)
- Key-based re-render para animación de entrada por slide

---

## 6. Iconografía (Lucide React)

Todos los SVG inline fueron reemplazados por componentes de `lucide-react`:

| Componente | Iconos usados |
|------------|---------------|
| LandingNavbar | `Sun`, `Moon`, `Menu`, `X` |
| HeroSection | `ArrowRight`, `Play` |
| FeaturesSection | `FileText`, `Zap`, `BarChart3` |
| DemoSection | `ArrowDown` |
| HowItWorks | `UserPlus`, `Upload`, `Sparkles`, `ArrowRight` |
| Testimonials | `Star` (fill) |
| LandingPricing | `Check` |
| CTABanner | `ArrowRight`, `Sparkles` |
| LandingFooter | `ArrowRight` + SVG inline para X/Twitter y LinkedIn |
| LogoCloud | `Building2`, `Cpu`, `FlaskConical`, `Database`, `Cloud` |

> **Nota:** `Twitter` y `Linkedin` no están disponibles en lucide-react v1.7.0, se implementaron como componentes SVG inline en `LandingFooter.tsx`.

---

## 7. Responsive Breakpoints

Todos los componentes siguen el enfoque mobile-first de Tailwind:

| Breakpoint | Target |
|------------|--------|
| `sm:` (640px) | Tablets pequeñas |
| `md:` (768px) | Tablets |
| `lg:` (1024px) | Desktop |

- Navbar: Mobile menu con toggle, desktop con links horizontales
- Grids: `grid-cols-1` → `md:grid-cols-3`
- CTAs: `flex-col sm:flex-row`
- Tipografía: `text-5xl sm:text-6xl lg:text-[72px]`

---

## 8. Verificación

- ✅ **TypeScript:** `npx tsc --noEmit` — 0 errores
- ✅ **Build:** `npm run build` — compilado exitosamente (solo warnings pre-existentes)
- ✅ **Tests:** Hooks testeados con Jest (`useCarousel.test.ts`, `useScrollAnimation.test.tsx`)
- ✅ **Enlaces funcionales:** Todos los CTAs apuntan a rutas correctas con query params
- ✅ **Dark mode:** Toggle funcional con persistencia en localStorage
- ✅ **Animaciones:** Carousel auto-rotate, scroll reveal, blob animation, float
