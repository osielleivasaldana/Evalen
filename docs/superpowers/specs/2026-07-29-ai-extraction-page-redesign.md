# AI Extraction Page — Redesign Spec

## Goal
Adapt the candidate AI analysis page (`/campaigns/:campaignId/candidate/:candidateId`) to match the mockup at `spec/mockup/ai-extaction.html` exactly — pixel-perfect copy, no differences.

## Scope
- Rewrite `CandidateDetail.tsx` entirely
- Add ~20 CSS animation rules to `index.css`
- Keep existing `Layout`, `NavBar`, `FooterFinal` (already match mockup theme)
- Keep existing `api.ts` data contracts
- Keep existing router (`AppRouter.tsx`)

## Architecture

```
Layout (NavBar + FooterFinal)
  └── CandidateDetail (rewrite)
        ├── Breadcrumb
        ├── Cover section (2-col grid)
        │   ├── Identity (badge, name, title, contact, match bar)
        │   └── Veredicto (quote, highlights, strengths/gaps)
        ├── Metrics strip (4-column row)
        ├── Banda del juicio (2-col grid)
        │   ├── Criteria Accordion (6 criteria, expandable, "ver en el CV")
        │   └── Strengths & Gaps sidebar
        ├── Sticky Expediente Index (scrollspy nav)
        └── Expediente sections
            ├── Resumen (professional summary with quote)
            ├── Experiencia (timeline with 7 roles)
            ├── Formación (degree + certifications)
            └── Habilidades (tag clouds with colored dots)
```

Sub-components may be inlined or extracted at discretion; aim for a single file unless it exceeds ~600 lines.

## Data Mapping

| Mockup Element | API Source | Notes |
|---|---|---|
| "Análisis IA" badge | Static | Always shown |
| Date "Generado 18 mar 2026" | `candidate.createdAt` | Format with `es-ES` locale |
| Confidence % (92%) | `cvData.confianza_general * 100` | Integer floor |
| Candidate name | `candidate.name` | |
| Professional title | `getTitularProfesional().titular` | |
| Email | `candidate.email` or `datos_contacto.email` | |
| Phone | `candidate.phone` or `datos_contacto.telefono` | |
| Match score (63) | `candidate.scoring.overallScore` | Integer |
| Match tone (media) | `>= 80 ? 'good' : >= 60 ? 'mid' : 'low'` | |
| Veredicto quote | `candidate.scoring.summary` | |
| "Lo que suma" | `scoring.strengths[0]` + `scoring.strengths[1]` | First 2 items |
| "Lo que falta" | `scoring.gaps[0]` + `scoring.gaps[1]` | First 2 items |
| Metrics strip | Derived: criteria count, experience years, skill count, education count | |
| Criteria accordion | `scoring.breakdown` — map to 6 criteria labels | Best-effort mapping: education→Educación, experience→Experiencia, skills→Skills Match. Remaining (Logística, Cultural Fit, Career Trajectory) use defaults with score 0 if not present |
| "ver en el CV" targets | Static mapping: education→formacion, logistics→resumen, experience→experiencia, cultural_fit→resumen, skills→habilidades, career→experiencia | |
| Strengths list | `scoring.strengths` | |
| Gaps list | `scoring.gaps` | |
| Resumen | `getResumenProfesional().resumen` | |
| Experiencia | `getExperienciaLaboral()` | Timeline format |
| Formación | `getFormacionAcademica()` + `getFormacionComplementaria()` | |
| Habilidades | `getHabilidades().habilidades_tecnicas` + `.idiomas` | Tag clouds |

## CSS Additions (to `index.css`)

All classes from mockup's `<style>` block that don't already exist in `index.css`. Key additions:

- `@keyframes rise`, `.rise` — entrance animation
- `@keyframes spotdrift`, `.animate-spotdrift` — background drift
- `@keyframes pulsering`, `.animate-pulsering` — pulse ring
- `@keyframes nodepulse`, `.animate-nodepulse` — node pulse
- `@keyframes hlwipe`, `.hl`, `.hl-fill`, `.hl-ink` — highlight wipe
- `@keyframes flashpulse`, `.sec-flash` — section flash on jump
- `@keyframes popin` — menu animation (may already exist)
- `.matchbar-fill` — match bar width transition
- `.bar-fill` — criteria bar fill transition
- `.reveal` / `.reveal.in` — scroll reveal
- `.crit-row`, `.crit-row:hover` — criteria row hover
- `.acc`, `.acc-body`, `.acc-chev`, `.acc.open` — accordion
- `.tl`, `.tl-item`, `.tl-item.is-current` — timeline
- `.ix-link`, `.ix-link[aria-current="true"]` — index nav
- `.spotlight` — radial gradient overlay
- `.report-watermark` — SVG watermark
- `.no-scrollbar` — hide scrollbar
- `@media (prefers-reduced-motion: reduce)` — respect motion preferences

## Behavior / Interactivity

All mockup JS behaviors converted to React:

1. **Match bar animation** — On mount, animate width from 0 to score% after a RAF delay
2. **Bar-fill animation** — On scroll into view, animate criteria bars with RAF
3. **Accordion** — Click to toggle `.open` class on each `.acc` row
4. **"ver en el CV"** — Click scrolls to target section, adds `sec-flash` animation
5. **Scrollspy** — `IntersectionObserver` on CV sections, updates `aria-current` on index links
6. **Reveal on scroll** — `IntersectionObserver` adds `.in` class to `.reveal` elements
7. **Theme toggle** — Already in NavBar; sync with `data-theme` on `<html>`
8. **Toast** — Simple state-based notification; auto-dismiss after 3.2s
9. **Grain overlay** — Static `div` with `bg-grain` mix-blend

## Files Changed

| File | Change |
|---|---|
| `currify-front/src/index.css` | Add ~60 lines of CSS (animations, layouts from mockup) |
| `currify-front/src/components/candidates/CandidateDetail.tsx` | Full rewrite (~700 lines) |

## Constraints
- Must match mockup pixel-perfect on desktop (1240px max-width)
- Must be responsive down to mobile
- Must respect `prefers-reduced-motion`
- Must handle null/empty data gracefully (fallback text)
- Must keep dark mode support via existing `data-theme` mechanism