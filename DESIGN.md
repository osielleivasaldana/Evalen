---
name: Currify
description: AI-Powered Recruitment Platform
colors:
  deep-navy: "#0f172a"
  deep-teal: "#0d9488"
  deep-teal-hover: "#0f766e"
  pale-mint: "#f0fdfa"
  ink: "#0a0f1d"
  paper: "#ffffff"
  warm-amber: "#f59e0b"
  muted-slate: "#64748b"
  cool-border: "#e2e8f0"
  cool-surface: "#f1f5f9"
  signal-green: "#16a34a"
  signal-red: "#ef4444"
  signal-amber: "#d97706"
  glass-bg: "rgba(255, 255, 255, 0.8)"
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
    backgroundColor: "{colors.deep-teal}"
    textColor: "{colors.paper}"
    rounded: "{rounded.md}"
    padding: "16px 32px"
    typography: "{typography.label}"
  button-primary-hover:
    backgroundColor: "{colors.deep-teal-hover}"
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
  glass-card:
    backgroundColor: "{colors.glass-bg}"
    rounded: "{rounded.xl}"
  input-default:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.md}"
    padding: "10px 12px"
---

# Design System: Currify

## 1. Overview

**Creative North Star: "El Laboratorio de Talento"**

Currify es una plataforma de reclutamiento que combina precisión técnica con calidez humana. El diseño usa teal y ámbar — una combinación única en el espacio de HR tech que comunica confianza y crecimiento sin caer en los clichés del "AI SaaS" (indigo/púrpura, gradients, glassmorphism decorativo).

La interfaz es precisa como un instrumento de laboratorio pero acogedora como una conversación humana. Cada píxel existe para que el reclutador tome decisiones más rápidas y certeras — el diseño no compite con los datos, los sirve. Los colores son sólidos, no gradientes. La identidad está en el teal fresco y el ámbar cálido, no en efectos de superficie.

**Key Characteristics:**
- Colores sólidos, sin gradients decorativos en CTAs ni textos
- Teal como identidad de confianza; ámbar como chispa de calidez humana
- Neutros fríos (slate) para mantener profesionalismo
- Táctil y seguro: botones con peso visual, hover evidente, feedback inmediato
- Modo oscuro nativo

## 2. Colors: La Paleta Teal y Ámbar

La paleta se construye alrededor de dos colores que rara vez aparecen juntos en SaaS: teal (confianza, crecimiento) y ámbar (calidez, optimismo). Los neutros son fríos (slate) para mantener el tono profesional.

### Primary

- **Deep Teal** (`#0d9488`): El color principal de Currify. Aparece en botones primarios, links, y acentos de navegación. Es sólido — nunca en gradient. Comunica confianza, estabilidad y crecimiento.
- **Deep Teal Hover** (`#0f766e`): Variante más oscura para hover states de botones primarios y elementos interactivos.

### Secondary Accent

- **Warm Amber** (`#f59e0b`): El contrapunto cálido. Usado en badges, highlights, estrellas de testimonios, y acentos secundarios. Aporta la calidez humana que el teal frío equilibra.

### Neutral

- **Deep Navy** (`#0f172a`): Fondo en modo oscuro y foreground de alto contraste.
- **Ink** (`#0a0f1d`): Texto corporal en modo claro. Casi negro.
- **Paper** (`#ffffff`): Fondo principal en modo claro.
- **Pale Mint** (`#f0fdfa`): Fondo alternativo para secciones destacadas de la landing page.
- **Muted Slate** (`#64748b`): Texto secundario, placeholders, metadatos.
- **Cool Border** (`#e2e8f0`): Bordes de inputs, dividers.
- **Cool Surface** (`#f1f5f9`): Fondos secundarios, hover states.

### Semantic

- **Signal Green** (`#16a34a`): Éxito, completado.
- **Signal Red** (`#ef4444`): Error, destructivo.
- **Signal Amber** (`#d97706`): Advertencia (más oscuro que Warm Amber para contraste).

### Named Rules

**The Solid Color Rule.** Todos los botones, links y CTAs usan colores sólidos. Sin gradients, sin text-gradient, sin glassmorphism en elementos interactivos. La identidad está en el color teal mismo, no en un efecto sobre él.

**The Teal-Amber Axis.** El teal es el color dominante (60-70% de presencia cromática). El ámbar aparece dosificado (10-15%) como acento cálido en badges, highlights, y elementos de celebración/recomendación. Nunca compiten; el ámbar acentúa, no domina.

## 3. Typography

**Display & Body Font:** Plus Jakarta Sans (with -apple-system, BlinkMacSystemFont fallback stack)

Una sola familia versátil que cubre desde displays bold de 48px hasta labels de 13px. La elección de peso (300-800) y tracking crea la jerarquía sin necesidad de una segunda fuente.

**Character:** Geométrica pero humanista — técnica sin ser fría, redonda sin ser blanda. Las curvas abiertas (a, e, g) le dan la calidez que equilibra los colores fríos.

### Hierarchy

- **Display** (800, `clamp(2rem, 5vw, 3.5rem)`, 1.1, -0.03em): Hero de landing page y títulos de alto impacto. `text-wrap: balance`.
- **Headline** (700, `clamp(1.25rem, 3vw, 1.875rem)`, 1.2, -0.02em): Títulos de página interna. `text-wrap: balance`.
- **Title** (600, `1.125rem`, 1.3, -0.01em): Títulos de cards, headers de tabla.
- **Body** (400, `0.9375rem`, 1.6): Texto corrido. Máximo 75ch.
- **Label** (500, `0.8125rem`, 1.25, 0.02em): Botones, badges, inputs.

### Named Rules

**The One-Family Rule.** Plus Jakarta Sans en todos los roles. Sin segunda fuente display.

## 4. Elevation

Currify usa un sistema híbrido: sombras suaves para profundidad contextual (dropdowns, modales) y capas tonales para diferenciación de superficies en reposo.

### Shadow Vocabulary

- **Card Rest** (`0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)`): Cards en reposo.
- **Card Hover** (`0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)`): Hover de cards interactivas.
- **Dropdown** (`0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)`): Menús, popovers.
- **Modal** (`0 25px 50px -12px rgb(0 0 0 / 0.25)`): Modales.
- **Glow Teal** (`0 0 20px rgb(13 148 136 / 0.3)`): Glow en botones primarios hover.
- **Stat** (`0 4px 14px 0 rgb(13 148 136 / 0.25)`): Stat cards del dashboard.

### Named Rules

**The Flat-By-Default Rule.** Superficies planas en reposo. Sombras solo como respuesta a interacción.

**The Colored Shadow Rule.** Sombras con tinte solo en elementos que refuerzan la identidad de marca (teal glow, stat shadows).

## 5. Components

### Buttons

- **Shape:** 6px radius. Tamaño compacto (h-10 default).
- **Primary:** Fondo Deep Teal (`#0d9488`), texto blanco, padding 16px 32px. Hover: Deep Teal Hover (`#0f766e`) con teal glow. Focus: ring ink de 2px.
- **Secondary / Outline:** Borde Cool Border, fondo transparente, texto Ink. Hover: fondo Cool Surface.
- **Ghost:** Sin borde. Hover: fondo Cool Surface.
- **Destructive:** Fondo Signal Red, texto blanco.
- **Tamaños:** sm (h-9), default (h-10), lg (h-11), icon (h-10 w-10).
- **Estados:** Disabled = opacidad 50%. Transición 200ms.

### Cards / Containers

- **Shape:** 8px radius. Padding 24px.
- **Standard Card:** Fondo Paper, borde Cool Border, shadow card-rest.
- **Glass Card:** Fondo semitransparente, 16px radius, backdrop-blur. Solo landing page.
- **Stat Card:** Gradiente teal→teal más oscuro (opcional), 16px radius. Exclusivo del dashboard.

### Inputs / Fields

- **Shape:** 6px radius, borde Cool Border, fondo Paper, padding 10px 12px.
- **Focus:** Ring Ink de 2px con offset 2px.
- **Placeholder:** Muted Slate (`#64748b`).
- **Error:** Borde Signal Red.

### Badges / Chips

- **Shape:** Pill, padding 2.5px 10px, texto 13px semibold.
- **Variants:** default (Deep Navy), success (Signal Green), warning (Warm Amber), destructive (Signal Red).

### Navigation (App Shell)

- **Sticky top bar** (z-50), fondo Paper, borde inferior Cool Border.
- **Desktop:** Hover a Deep Teal. Upgrade CTA en teal sólido.
- **Mobile:** Hamburger con panel inferior slide-in.

## 6. Do's and Don'ts

### Do:

- **Do** usar Deep Teal (`#0d9488`) como color sólido en botones, links, y elementos interactivos principales.
- **Do** usar Warm Amber (`#f59e0b`) como acento cálido dosificado en badges, highlights, testimonios.
- **Do** mantener neutros fríos (slate) en lugar de cálidos.
- **Do** usar colores sólidos en CTAs — sin gradients, sin text-gradient.
- **Do** reservar el teal glow para hover de botones primarios y stat cards.
- **Do** mantener 8px de padding como estándar en cards.
- **Do** usar Signal Green / Red / Amber semánticos.

### Don't:

- **Don't** usar gradients en botones, CTAs, o texto (background-clip: text). Colores sólidos siempre.
- **Don't** usar indigo, púrpura, rosa, o fuchsia — esos son los clichés del "AI SaaS".
- **Don't** usar glassmorphism decorativo dentro del dashboard.
- **Don't** usar side-stripe borders como acento.
- **Don't** usar tiny uppercase tracked eyebrow sobre cada sección.
- **Don't** usar placeholders con bajo contraste.
- **Don't** superponer cards (nested cards).
