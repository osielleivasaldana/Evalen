---
name: Evalen
description: AI-Powered Recruitment Platform
colors:
  ink: "#0a0f1d"
  paper: "#ffffff"
  paper-alt: "#f8fafc"
  navy: "#0f172a"
  brand: "#4f46e5"
  brand-hover: "#4338ca"
  brand-soft: "#eef2ff"
  brand-foreground: "#a5b4fc"
  accent: "#9333ea"
  accent-soft: "#f3e8ff"
  muted-slate: "#64748b"
  cool-border: "#e2e8f0"
  cool-surface: "#f1f5f9"
  signal-green: "#16a34a"
  signal-red: "#ef4444"
  signal-amber: "#d97706"
  oklch:
    brand: "oklch(0.55 0.22 277)"
    brand-hover: "oklch(0.52 0.22 277)"
    accent: "oklch(0.55 0.28 301)"
    brand-soft: "oklch(0.97 0.02 277)"
typography:
  display:
    fontFamily: '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "clamp(2rem, 5vw, 3.5rem)"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.03em"
  headline:
    fontFamily: '"Plus Jakarta Sans", sans-serif'
    fontSize: "clamp(1.25rem, 3vw, 1.875rem)"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  title:
    fontFamily: '"Plus Jakarta Sans", sans-serif'
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  body:
    fontFamily: '"Plus Jakarta Sans", sans-serif'
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  label:
    fontFamily: '"Plus Jakarta Sans", sans-serif'
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: 1.25
    letterSpacing: "0.02em"
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
  xl: "16px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  2xl: "48px"
components:
  button-primary:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.paper}"
    rounded: "{rounded.md}"
    padding: "16px 32px"
    typography: "{typography.label}"
  button-primary-hover:
    backgroundColor: "{colors.brand-hover}"
    textColor: "{colors.paper}"
    rounded: "{rounded.md}"
    padding: "16px 32px"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "14px 30px"
  card-default:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "{spacing.lg}"
  input-default:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.md}"
    padding: "10px 12px"
---

# Design System: Evalen

## 1. Overview

**Creative North Star: "Talento en evidencia"**

Evalen es una plataforma de reclutamiento que pone al candidato y al reclutador frente a datos, no frente a effects. La identidad visual es indigo y púrpura — una elección que rompe con el azul-corporativo del HR-tech heredado de LinkedIn y con el verde-IA que saturó el mercado en 2024-2025. Indigo comunica precisión técnica (es el color del instrumento, del IDE); púrpura aporta el contrapunto de singularidad (no es工作中的 "otro SaaS").

La interfaz es precisa como un instrumento y honesta como una tabla de datos. Cada píxel existe para que el reclutador decida más rápido y con menos sesgo — el diseño no compite con los datos, los sirve. Los colores son sólidos; la identidad no necesita gradients ni glassmorphism decorativo. El mayor momento de marca en toda la landing no es un efecto: es el parser procesando un CV real frente al usuario.

**Key Characteristics:**
- Colores sólidos, sin gradients decorativos en CTAs, textos, o borders.
- Indigo (`#4f46e5`) como color dominante (60-70% de presencia cromática); púrpura (`#9333ea`) como acento dosificado (10-15%) en highlights, badges diferenciadores, y un momento editorial por página.
- Neutros fríos (slate) sobre fondos paper true white (no cream/sand warm-neutral) — el "AI default 2026" queda prohibido.
- Táctil y seguro: botones con peso visual, hover evidente con indigo glow, feedback inmediato.
- Modo oscuro nativo con navy `#0f172a` y foreground indigo `#a5b4fc`.
- TypeScript color tokens vía OKLCH en CSS custom properties — todos los componentes referencian `--brand`, no hex.

## 2. Colors: La Paleta Indigo y Púrpura

La paleta se construye alrededor de indigo (precisión, confianza técnica) y púrpura (singularidad, diferenciación). Los neutros son fríos (slate) sobre paper true white — `#fdfdfd` y `#fafbfc` (off-whites cálidos) están prohibidos explícitamente por ser el "AI default 2026".

### Primary

- **Brand Indigo** (`#4f46e5`, `oklch(0.55 0.22 277)`): El color principal de Evalen. Aparece en botones primarios, links, acentos de navegación, y elementos focus. Es sólido — nunca en gradient. Comunica precisión técnica y confianza.
- **Brand Indigo Hover** (`#4338ca`, `oklch(0.52 0.22 277)`): Variante más profunda para hover states de botones primarios y elementos interactivos. Acompañado de `0 0 25px rgba(79, 70, 229, 0.35)` (indigo glow).

### Secondary Accent

- **Accent Purple** (`#9333ea`, `oklch(0.55 0.28 301)`): El contrapunto de singularidad. Usado dosificado (10-15%) en: badges diferenciadores ("Top Match"), highlights únicos por sección, y un momento editorial por página. **No en CTAs primarios** (indigo domina la acción). **No en gradient backgrounds.**

### Neutral

- **Navy** (`#0f172a`): Fondo en modo oscuro y foreground de alto contraste.
- **Ink** (`#0a0f1d`): Texto corporal en modo claro. Casi negro con tinte frío.
- **Paper** (`#ffffff`): Fondo principal en modo claro. **True white, no off-white.** El warm-neutral cream/sand (`#fdfdfd`, `#fafbfc`, `#f8f5f0`) está prohibido por ser el AI-default.
- **Paper Alt** (`#f8fafc`, `oklch(0.98 0.005 250)`): Fondo alternativo para secciones destacadas, con tinte frío mínimo hacia el propio hue de la marca (no hacia warm-by-default).
- **Brand Soft** (`#eef2ff`, `oklch(0.97 0.02 277)`): Fondo tint-indigo para highlights editorialles, badges suaves, fondos de cards activas.
- **Muted Slate** (`#64748b`): Texto secundario, placeholders, metadatos.
- **Cool Border** (`#e2e8f0`): Bordes de inputs, dividers.
- **Cool Surface** (`#f1f5f9`): Fondos secundarios, hover states de superficies neutral.

### Dark Mode Brand Foreground

- **Brand Foreground** (`#a5b4fc`, `oklch(0.78 0.08 277)`): Indigo-claro para texto de marca y acentos sobre fondos oscuros. Reemplaza al `#2dd4bf` teal anterior.

### Semantic

- **Signal Green** (`#16a34a`): Éxito, completado.
- **Signal Red** (`#ef4444`): Error, destructivo.
- **Signal Amber** (`#d97706`): Advertencia.

### Named Rules

**The Solid Color Rule.** Todos los botones, links, CTAs, badges y borders de cards usan colores sólidos. Sin gradients en background, sin `background-clip: text` con gradient, sin glassmorphism en elementos interactivos. La identidad está en el color indigo mismo, no en un efecto sobre él.

**The Indigo-Purple Axis.** El indigo es dominante (60-70% de presencia cromática). El púrpura aparece dosificado (10-15%) como acento en badges diferenciadores, highlights únicos, y un momento editorial por página. Nunca compiten; el púrpura acentúa, no domina. **Stars de testimonios** usan púrpura-claro en dark y púrpura sólido en light — no amber.

**The True White Rule.** El fondo de cualquier superficie clara es `#ffffff` (paper) o como mucho `#f8fafc` (paper-alt, tinte frío mínimo hacia el hue de la marca). Nunca `#fdfdfd`, `#fafbfc`, `#f8f5f0`, ni ningún warm-neutral off-white. Esa banda es el AI-default de 2026.

## 3. Typography

**Display & Body Font:** Plus Jakarta Sans (with -apple-system, BlinkMacSystemFont fallback stack)

Una sola familia versátil que cubre desde displays bold de 48px hasta labels de 13px. La elección de peso (300-800) y tracking crea la jerarquía sin necesidad de una segunda fuente.

**Character:** Geométrica pero humanista — técnica sin ser fría, redonda sin ser blanda. Las curvas abiertas (a, e, g) le dan la calidez que equilibra el indigo frío.

### Hierarchy

- **Display** (800, `clamp(2rem, 5vw, 3.5rem)`, 1.1, -0.03em): Hero de landing page y títulos de alto impacto. `text-wrap: balance`.
- **Headline** (700, `clamp(1.25rem, 3vw, 1.875rem)`, 1.2, -0.02em): Títulos de página interna. `text-wrap: balance`.
- **Title** (600, `1.125rem`, 1.3, -0.01em): Títulos de cards, headers de tabla.
- **Body** (400, `0.9375rem`, 1.6): Texto corrido. Máximo 75ch.
- **Label** (500, `0.8125rem`, 1.25, 0.02em): Botones, badges, inputs.

### Named Rules

**The One-Family Rule.** Plus Jakarta Sans en todos los roles. Sin segunda fuente display.

**The Minimum Size Rule.** Texto en mockups y data-dense surfaces mínimo `text-xs` (12px) en desktop; mínimo `text-[11px]` en mobile. Nunca `text-[9px]` ni `text-[10px]` para información que el reclutador necesita leer (nombres de candidatos, scores, badges).

## 4. Elevation

Evalen usa un sistema híbrido: sombras suaves para profundidad contextual (dropdowns, modales) y capas tonales para diferenciación de superficies en reposo.

### Shadow Vocabulary

- **Card Rest** (`0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)`): Cards en reposo.
- **Card Hover** (`0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)`): Hover de cards interactivas.
- **Dropdown** (`0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)`): Menús, popovers.
- **Modal** (`0 25px 50px -12px rgb(0 0 0 / 0.25)`): Modales.
- **Indigo Glow** (`0 0 25px rgb(79 70 229 / 0.35)`): Glow en botones primarios hover.
- **Stat** (`0 4px 14px 0 rgb(79 70 229 / 0.25)`): Stat cards del dashboard.

### Named Rules

**The Flat-By-Default Rule.** Superficies planas en reposo. Sombras solo como respuesta a interacción.

**The Colored Shadow Rule.** Sombras con tinto solo en elementos que refuerzan la identidad de marca (indigo glow en hover de botones primarios, indigo stat shadows en dashboard). Ningún otro elemento usa sombra tintada.

## 5. Components

### Buttons

- **Shape:** 6px radius. Tamaño compacto (h-10 default).
- **Primary:** Fondo Brand Indigo (`#4f46e5`), texto blanco, padding 16px 32px. Hover: Brand Indigo Hover (`#4338ca`) con indigo glow. Focus: ring ink de 2px.
- **Secondary / Outline:** Borde Cool Border, fondo transparente, texto Ink. Hover: fondo Cool Surface.
- **Ghost:** Sin borde. Hover: fondo Cool Surface.
- **Destructive:** Fondo Signal Red, texto blanco.
- **Tamaños:** sm (h-9), default (h-10), lg (h-11), icon (h-10 w-10).
- **Estados:** Disabled = opacidad 50%. Transición 200ms.

### Cards / Containers

- **Shape:** 8px radius. Padding 24px.
- **Standard Card:** Fondo Paper, borde Cool Border, shadow card-rest.
- **Stat Card:** Bordered sólido `ring-2 ring-brand` o sin ring con shadow-stat. 16px radius. Exclusivo del dashboard.
- **No Glass Cards.** El componente anterior "Glass Card" (`backdrop-blur` + `rgba(255,255,255,0.8)`) queda retirado del design system porque era glassmorphism decorativo sin función.

### Inputs / Fields

- **Shape:** 6px radius, borde Cool Border, fondo Paper, padding 10px 12px.
- **Focus:** Ring Indigo de 2px con offset 2px (`#4f46e5`).
- **Placeholder:** Muted Slate (`#64748b`) — verificar contraste 4.5:1.
- **Error:** Borde Signal Red.

### Badges / Chips

- **Shape:** Pill, padding 2.5px 10px, texto 13px semibold. Mínimo text-xs (12px) si el contexto aprieta — nunca 9-10px.
- **Variants:** default (Navy), success (Signal Green), warning (Signal Amber), destructive (Signal Red), **brand** (Indigo sobre Brand Soft bg), **accent** (Purple sobre Accent Soft bg).

### Navigation (App Shell)

- **Sticky top bar** (z-50), fondo Paper sólido (no glass blur sobre content). Borde inferior Cool Border cuando scrolled; transparente en top.
- **Desktop:** Hover a Brand Indigo. CTA primario en indigo sólido.
- **Mobile:** Hamburger con panel slide-in sólido (no `backdrop-blur-3xl` sobre page).

## 6. Do's and Don'ts

### Do:

- **Do** usar Brand Indigo (`#4f46e5`) como color sólido en botones, links, focus rings, y elementos interactivos principales.
- **Do** usar Accent Purple (`#9333ea`) como acento dosificado (10-15%) en badges diferenciadores, highlights únicos, y un momento editorial por página.
- **Do** mantener neutros fríos (slate) sobre paper true white `#ffffff` o `#f8fafc`.
- **Do** usar colores sólidos en CTAs — sin gradients, sin text-gradient, sin gradient borders.
- **Do** reservar el indigo glow solo para hover de botones primarios y stat cards del dashboard.
- **Do** mantener 8px de padding como estándar en cards.
- **Do** usar Signal Green / Red / Amber semánticos para estados (no para decoración).
- **Do** mostrar el producto real funcionando: el hero de la landing procesa un CV live contra el backend, no un loop animado.

### Don't:

- **Don't** usar gradients en botones, CTAs, texto (`background-clip: text`), o borders (1px gradient wrappers). Colores sólidos siempre, `ring-2 ring-brand` para destacar.
- **Don't** usar teal, amber, ni la combinación teal+ámbar como paleta de marca — fue la paleta anterior y caía en el SaaS-look que queremos romper. Tampoco azul-corporativo (`#0072EF`-style), ni verde-IA. La diferenciación es indigo/púrpura.
- **Don't** usar glassmorphism decorativo (`backdrop-blur` sobre superficies que no necesitan leer a través). La navbar y el mobile menu usan bg sólido.
- **Don't** usar side-stripe borders (`border-l`, `border-r`, o top-stripe `border-t` de >1px) como acento de cards o callouts. Bordes uniformes o nada.
- **Don't** usar tiny uppercase tracked eyebrow (`text-xs uppercase tracking-wider`) como cadencia por defecto sobre cada sección. Un eyebrow deliberado como sistema de marca, en una sola sección de la página, es voz; el eyebrow en cada sección es AI grammar.
- **Don't** usar numbered "01/02/03" section markers como scaffolding automático. Los números ganan su lugar cuando la sección ES una secuencia (3-pasos de un workflow, timeline ordenado); uno deliberado por página ok, en cada sección no.
- **Don't** usar `text-[9px]` ni `text-[10px]` en mockups, badges, o cualquier texto que el reclutador necesita leer. Mínimo `text-xs` (12px).
- **Don't** usar placeholders con bajo contraste (gray-pálido sobre warm-neutral).
- **Don't** superponer cards (nested cards).
- **Don't** usar grain overlay / SVG noise como textura "AI-quality" en la landing.
- **Don't** usar aurora orbs (`blur-100px animate-orb`) como background del hero.
- **Don't** usar logos de empresas que no son clientes (Stripe, Spotify, Notion, etc.), ni métricas inventadas, ni testimonials con nombres genéricos en empresas-fake ("TechCorp", "FutureLabs"). Si no hay prueba real, omitir la sección.