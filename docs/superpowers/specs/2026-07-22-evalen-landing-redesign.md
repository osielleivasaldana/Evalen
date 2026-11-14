# Evalen Landing Page — Redesign

## Goal
Replace the current Evalen landing page (React + Tailwind) with the exact design from `spec/mockup/new-landing.html`, preserving button functionality (routing with plan params to `/login`).

## Design Source
`spec/mockup/new-landing.html` — full HTML/CSS/JS mockup with Fraunces/Instrument Sans/IBM Plex Mono fonts, green/warm-paper palette, and editorial layout.

## Approach (A): Exact CSS + React wrappers
- Keep mockup CSS verbatim in a standalone file (`landing-new.css`)
- Create React TSX components that mirror the exact HTML structure and classNames
- Convert vanilla JS interactions to React hooks (identical behavior/timing)
- Mixes Tailwind (existing app) with plain CSS (new landing) — acceptable for this single page

## CSS strategy
- Extract `<style>` block from mockup (~492 lines) to `src/landing/landing-new.css`
- No translation to Tailwind — guarantees pixel-perfect match
- CSS custom properties control light/dark theme via `[data-theme]` selector

## Theme migration
- Switch from `class="dark"` + `evalen-landing-theme` to `data-theme` attribute + `evalen-theme` localStorage key
- Update `ThemeContext.tsx` and `public/index.html` inline script
- Users lose saved preference once (migration event)

## Component structure (new files replace old)
| File | Role |
|---|---|
| `src/landing/landing-new.css` | Exact mockup CSS |
| `src/landing/LandingPage.tsx` | Orchestrator (rewrite) |
| `src/landing/components/LandingNavbar.tsx` | Topbar + Nav (rewrite) |
| `src/landing/components/HeroSection.tsx` | Hero + ticker (rewrite) |
| `src/landing/components/DemoSection.tsx` | Demo mockup + expandable candidates (new) |
| `src/landing/components/PricingSection.tsx` | Pricing cards (rewrite) |
| `src/landing/components/FAQSection.tsx` | FAQ accordion (new) |
| `src/landing/components/LandingFooter.tsx` | Footer + sticky CTA (rewrite) |

## Sections (in order)
1. TopBar (announcement bar)
2. Navbar (sticky, theme toggle, mobile menu)
3. Hero (headline, subtitle, CTA, ticker, photo frame, float card)
4. Marquee (infinite scroll brand bar)
5. Problem (02: pain points + bridge quote)
6. How it works (3 steps)
7. Demo (mockup with 4 expandable candidate rows)
8. Benefits (4 cards: semantic match, rubric, explanations, pipeline)
9. Time band (conversion stat)
10. Testimonials (3 quotes with avatars)
11. Pricing (3 plans: Starter $0, EvalenPro $49, Enterprise)
12. FAQ (7 accordion items)
13. Final CTA (background image + gradient overlay)
14. Footer (4-column grid + bottom bar)
15. Sticky Mobile CTA (fixed bottom bar)

## Interactions (JS → React Hooks)
| Mockup | React |
|---|---|
| Theme toggle + `localStorage` | Updated `ThemeContext` + `data-theme` attr |
| Nav scroll state + topbar collapse | `useState` + `useEffect` passive scroll |
| Sticky CTA visibility | Scroll threshold logic |
| Mobile menu toggle | `useState` + `aria-expanded` |
| Ticker text rotation | `useState` + `setInterval` 3.6s |
| Scroll reveal (IntersectionObserver) | Custom `useScrollReveal` hook |
| Candidate accordion (single open) | `useState` with candidate ID key |
| Bar animation on open | `useRef` + `requestAnimationFrame` |
| FAQ accordion (multi-open) | `useState<Set<number>>` |
| Year in footer | `new Date().getFullYear()` |

## Button mapping (preserved functionality)
| Visual text | Target URL | Plan param |
|---|---|---|
| Starter "Empezar gratis" | `/login?plan=free` | free |
| EvalenPro "Probar EvalenPro" | `/login?plan=pro` | pro |
| Enterprise "Hablar con ventas" | `/login?plan=enterprise` | enterprise |
| Nav "Empezar gratis" | `/login?plan=free` | free |
| Nav "Iniciar Sesión" | `/login` | — |
| Sticky CTA "Empezar gratis" | `/login?plan=free` | free |
| Final CTA "Empezar gratis — sin tarjeta" | `/login?plan=free` | free |
| Footer "Empezar gratis" / "Probar EvalenPro" / "Hablar con ventas" | `/login?plan=free\|pro\|enterprise` | per plan |

## Nav links (smooth scroll)
- `#como-funciona`, `#producto`, `#voces`, `#precios`, `#preguntas` → `scrollIntoView({ behavior: 'smooth' })`

## Images (from mockup)
All image URLs from `https://image.qwenlm.ai/...` kept as-is. No local assets needed.

## Files to delete (old components)
- `src/landing/components/FeaturesSection.tsx`
- `src/landing/components/GallerySection.tsx`
- `src/landing/components/BackToTop.tsx`
- `src/landing/components/demo-data.ts`
- `src/landing/components/DemoInputPhase.tsx`
- `src/landing/components/DemoModal.tsx`
- `src/landing/components/DemoProcessingPhase.tsx`
- `src/landing/components/DemoResultsPhase.tsx`

## Files to modify
- `src/contexts/ThemeContext.tsx` — migrate to `data-theme` + `evalen-theme`
- `public/index.html` — update inline theme script
- `src/index.tsx` or `src/index.css` — add font imports if needed

## Files untouched
- `src/components/AppRouter.tsx` (landing wrapper logic stays)
- All auth, dashboard, billing, campaign components
