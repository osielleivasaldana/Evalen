# AI Extraction Page — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rewrite CandidateDetail.tsx to match spec/mockup/ai-extaction.html pixel-perfect.

**Architecture:** Keep existing Layout/NavBar/FooterFinal. Add CSS animations to index.css. Full rewrite of CandidateDetail.tsx with sub-components extracted where needed.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Heroicons

## Global Constraints

- Must match mockup pixel-perfect on desktop (1240px max-width)
- Must be responsive down to mobile
- Must respect prefers-reduced-motion
- Must handle null/empty data gracefully with fallback text
- Must keep dark mode support via existing data-theme mechanism
- Best-effort mapping from API scoring.breakdown to 6 criteria labels

---

### Task 1: Add CSS animations from mockup to index.css

**Files:**
- Modify: `currify-front/src/index.css` — append before `@media (prefers-reduced-motion: reduce)`

**Interfaces:**
- Consumes: existing CSS variables (`--paper`, `--ink`, `--green`, etc.)
- Produces: CSS classes used by CandidateDetail.tsx

- [ ] **Step 1: Append mockup CSS classes**

Append to `index.css` all the keyframes and utility classes from the mockup that don't exist yet. These include:

```css
/* AI Extraction page — animations & layout utilities */
@keyframes rise { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:none; } }
@keyframes spotdrift { 0% { transform:translate3d(0,0,0) scale(1); } 100% { transform:translate3d(-3%,4%,0) scale(1.08); } }
@keyframes pulsering { 0% { box-shadow:0 0 0 0 rgba(28,91,68,.5); } 70% { box-shadow:0 0 0 7px rgba(28,91,68,0); } 100% { box-shadow:0 0 0 0 rgba(28,91,68,0); } }
@keyframes nodepulse { 0%,100% { opacity:.14; } 50% { opacity:.5; } }
@keyframes popin { from { opacity:0; transform:scale(.96) translateY(-4px); } to { opacity:1; transform:none; } }
@keyframes flashpulse {
  0%   { background: rgba(243,233,78,.34); box-shadow: 0 0 0 6px rgba(243,233,78,.12); }
  60%  { background: rgba(243,233,78,.10); box-shadow: 0 0 0 6px rgba(243,233,78,0); }
  100% { background: transparent; box-shadow: 0 0 0 0 rgba(243,233,78,0); }
}
@keyframes hlwipe { from { transform: scaleX(0); } to { transform: scaleX(1); } }
.animate-spotdrift { animation: spotdrift 17s ease-in-out infinite alternate; }
.animate-pulsering { animation: pulsering 2.2s infinite; }
.animate-nodepulse { animation: nodepulse 3.8s ease-in-out infinite; }
.report-watermark { color: var(--ink); }
.spotlight { background: radial-gradient(58% 78% at 76% 40%, rgba(243,233,78,.18), rgba(243,233,78,0) 70%); }
.hl { position: relative; padding: 0 .06em; border-radius: 2px; }
.hl-ink { position: relative; z-index: 1; color: #15261E; }
.hl-fill {
  position: absolute; inset: .12em -.02em .06em; z-index: 0;
  background: var(--yellow); border-radius: 3px;
  transform: scaleX(1); transform-origin: left center;
  animation: hlwipe .72s cubic-bezier(.22,.7,.2,1) both;
  animation-delay: .5s;
}
.matchbar-fill { width: 0; transition: width 1.05s cubic-bezier(.2,.7,.2,1); }
.rise { opacity: 0; animation: rise .62s cubic-bezier(.2,.7,.2,1) both; }
.bar-fill { width:0; transition: width 1s cubic-bezier(.2,.7,.2,1); }
.crit-row { transition: border-color .2s ease, background-color .2s ease; }
.crit-row:hover { background-color: color-mix(in srgb, var(--paper2) 45%, transparent); }
.crit-row:hover .bar-fill { filter: brightness(1.06) saturate(1.05); }
.acc-body { display:grid; grid-template-rows:0fr; transition:grid-template-rows .32s ease; }
.acc.open .acc-body { grid-template-rows:1fr; }
.acc-body > div { overflow:hidden; }
.acc .acc-chev { transition:transform .3s ease; }
.acc.open .acc-chev { transform:rotate(180deg); }
.tl { position:relative; padding-left:26px; }
.tl::before { content:""; position:absolute; left:6px; top:9px; bottom:9px; width:2px; background:var(--line2); }
.tl-item { position:relative; }
.tl-item::before { content:""; position:absolute; left:-26px; top:7px; width:14px; height:14px; border-radius:50%; background:var(--card); border:2px solid var(--green); transition: transform .2s ease, box-shadow .2s ease; }
.tl-item:hover::before { transform: scale(1.22); }
.tl-item.is-current::before { background:var(--green); box-shadow:0 0 0 4px var(--greentint); }
.tl-item.is-current:hover::before { box-shadow:0 0 0 6px var(--greentint); }
.bullet { margin-top: .62em; }
.ix-link { position:relative; color:var(--ink2); transition: color .2s ease; }
.ix-link:hover { color:var(--ink); }
.ix-link[aria-current="true"] { color:var(--ink); }
.ix-link::after { content:""; position:absolute; left:0; right:0; bottom:-1px; height:2px; border-radius:2px; background:var(--cta); transform:scaleX(0); transform-origin:left; transition: transform .28s cubic-bezier(.2,.7,.2,1); }
.ix-link[aria-current="true"]::after { transform:scaleX(1); }
.sec-flash { animation: flashpulse 1.5s ease; border-radius:12px; }
.reveal { opacity:0; transform:translateY(18px); transition:opacity .6s ease, transform .6s ease; }
.reveal.in { opacity:1; transform:none; }
.no-scrollbar { -ms-overflow-style:none; scrollbar-width:none; }
.no-scrollbar::-webkit-scrollbar { display:none; }

@media (prefers-reduced-motion: reduce){
  *{animation:none!important; transition:none!important}
  .reveal{opacity:1;transform:none}
  .bar-fill,.matchbar-fill{transition:none}
  .hl-fill{transform:scaleX(1)!important}
  .rise{opacity:1!important;transform:none!important}
}
```

- [ ] **Step 2: Verify CSS builds**

Run: `cd currify-front && npx tailwindcss -i src/index.css -o /dev/null --dry-run`  
Expected: No errors.

---

### Task 2: Rewrite CandidateDetail.tsx

**Files:**
- Modify: `currify-front/src/components/candidates/CandidateDetail.tsx` (full rewrite)
- Consumes: API data from `api.ts` (`Candidate`, `CVData`, `CandidateScoring`)
- Consumes: `Layout` from `layout/Layout.tsx`

**Interfaces:**
- Props: `{ candidateId: string; onBack: () => void }` (unchanged)

- [ ] **Step 1: Write the new component**

The file is a full rewrite (~700 lines). See the spec document for the complete data mapping.

Key sections to implement:
1. `useState`/`useEffect` data loading (same pattern as current)
2. Loading/error/empty states with Evalen theme instead of gradients
3. Breadcrumb
4. Cover section (identity + veredicto with match bar)
5. Metrics strip
6. Banda del juicio (criteria accordion + strengths/gaps)
7. Index scrollspy nav
8. Expediente sections (resumen, experiencia, formacion, habilidades)
9. Toast notification

- [ ] **Step 2: Verify the component compiles**

Run: `cd currify-front && npx react-scripts build 2>&1 | head -50`  
Expected: Build succeeds with no errors.

---

### Task 3: Visual verification

- [ ] **Step 1: Start the dev server**

Run: `cd currify-front && npm start` (in background)
Open `http://localhost:3000/campaigns/:campaignId/candidate/:candidateId`

- [ ] **Step 2: Compare with mockup**

Open `spec/mockup/ai-extaction.html` in browser and visually compare section by section.