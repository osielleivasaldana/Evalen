# Evalen Landing — New Design Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace existing React+Tailwind landing with exact clone of `spec/mockup/new-landing.html`, preserving button routing and theme context.

**Architecture:** Extract mockup CSS verbatim into `landing-new.css`; create TSX components that mirror HTML structure/classNames exactly; convert JS interactions to React hooks with identical timing.

**Tech Stack:** React + TypeScript + plain CSS (mockup's own CSS) + existing ThemeContext (migrated to `data-theme` attr)

---

### Task 1: Migrate ThemeContext to data-theme + evalene-theme key

**Files:**
- Modify: `src/contexts/ThemeContext.tsx`
- Modify: `public/index.html`

- [ ] **Write the new ThemeContext**

Replace `src/contexts/ThemeContext.tsx` with:

```tsx
import React, { createContext, useContext, useState, useEffect, useLayoutEffect, ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('evalen-theme');
      if (stored === 'light' || stored === 'dark') {
        return stored;
      }
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  useLayoutEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('evalen-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
```

- [ ] **Update public/index.html inline script**

Replace the `<script>` block in `public/index.html` with:

```html
<script>
  (function() {
    const stored = localStorage.getItem('evalen-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = stored || (prefersDark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
  })();
</script>
```

- [ ] **Commit**

```bash
git add src/contexts/ThemeContext.tsx public/index.html
git commit -m "feat: migrate theme to data-theme attr + eval-en-theme key"
```

---

### Task 2: Extract CSS from mockup into landing-new.css

**Files:**
- Create: `src/landing/landing-new.css`

- [ ] **Extract the exact `<style>` block from `spec/mockup/new-landing.html`**

Read lines 26-493 from the mockup file and write them verbatim to `src/landing/landing-new.css`. Include the entire content from `:root {` through `@media (prefers-reduced-motion:reduce){...}}`. This is the exact CSS — no changes.

- [ ] **Add the CSS import reference to the plan (imported in LandingPage.tsx)**

Will be imported in Task 3 via `import './landing-new.css'`.

- [ ] **Commit**

```bash
git add src/landing/landing-new.css
git commit -m "feat: add landing-new.css from mockup (exact copy)"
```

---

### Task 3: Rewrite LandingPage.tsx as orchestrator

**Files:**
- Modify: `src/landing/LandingPage.tsx`
- Import: `src/landing/landing-new.css` (already created in Task 2)

- [ ] **Write the new LandingPage.tsx**

```tsx
import React from 'react';
import { ThemeProvider } from '../contexts/ThemeContext';
import './landing-new.css';
import LandingNavbar from './components/LandingNavbar';
import HeroSection from './components/HeroSection';
import ProblemSection from './components/ProblemSection';
import HowItWorksSection from './components/HowItWorksSection';
import DemoSection from './components/DemoSection';
import BenefitsSection from './components/BenefitsSection';
import TestimonialsSection from './components/TestimonialsSection';
import PricingSection from './components/PricingSection';
import FAQSection from './components/FAQSection';
import FooterSection from './components/FooterSection';

const LandingPage: React.FC = () => {
  return (
    <ThemeProvider>
      <div className="topbar" id="topbar">
        <span className="star">✦</span>
        <span>Nuevo: <b>Smart Match semántico</b> — ya evalúa significado, no palabras clave.</span>
        <a href="/login?plan=free">Ver cómo →</a>
      </div>
      <LandingNavbar />
      <main id="top">
        <HeroSection />
        <ProblemSection />
        <HowItWorksSection />
        <DemoSection />
        <BenefitsSection />
        <TestimonialsSection />
        <PricingSection />
        <FAQSection />
      </main>
      <FooterSection />
    </ThemeProvider>
  );
};

export default LandingPage;
```

- [ ] **Commit**

```bash
git add src/landing/LandingPage.tsx
git commit -m "feat: rewrite LandingPage as orchestrator for new sections"
```

---

### Task 4: LandingNavbar component (topbar already in LandingPage, nav here)

**Files:**
- Create: `src/landing/components/LandingNavbar.tsx` (rewrite)

- [ ] **Write LandingNavbar.tsx**

This component renders the `<header class="nav">` block from the mockup (lines 505-546). It includes:
- Sticky nav with scroll class
- Brand logo (inline SVG)
- Nav links that scroll to sections
- Theme toggle button (uses ThemeContext)
- Login/Empezar gratis buttons
- Burger menu for mobile
- Mobile menu panel

```tsx
import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { apiService } from '../../services/api';

const navLinks = [
  { id: 'como-funciona', label: 'Cómo funciona' },
  { id: 'producto', label: 'Producto' },
  { id: 'voces', label: 'Clientes' },
  { id: 'precios', label: 'Precios' },
  { id: 'preguntas', label: 'Preguntas' },
];

const LandingNavbar: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const isAuthenticated = apiService.isAuthenticated();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY || window.pageYOffset;
      setScrolled(y > 12);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
    setMobileOpen(false);
  };

  return (
    <>
      <header className={`nav${scrolled ? ' scrolled' : ''}`} id="nav" ref={navRef}>
        <div className="container nav-inner">
          <a className="brand" href="#top" aria-label="Evalen, inicio">
            <svg className="mark" viewBox="0 0 48 48" aria-hidden="true">
              <rect width="48" height="48" rx="12" fill="var(--green-deep)"/>
              <rect x="13" y="12" width="5" height="24" rx="2.5" fill="var(--on-mark)"/>
              <rect x="13" y="12" width="18" height="5" rx="2.5" fill="var(--on-mark)"/>
              <rect x="13" y="21.5" width="13" height="5" rx="2.5" fill="var(--on-mark)"/>
              <rect x="13" y="31" width="21" height="5" rx="2.5" fill="var(--on-mark)"/>
              <circle cx="37" cy="14.5" r="4.5" fill="var(--yellow)"/>
            </svg>
            <span className="word">evalen</span>
          </a>
          <nav className="nav-links" aria-label="Principal">
            {navLinks.map((link) => (
              <a key={link.id} href={`#${link.id}`} onClick={(e) => { e.preventDefault(); scrollTo(link.id); }}>{link.label}</a>
            ))}
          </nav>
          <div className="nav-right">
            <button className="icon-btn" id="themeBtn" onClick={toggleTheme} aria-label="Cambiar tema">
              <svg className="ic-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>
              <svg className="ic-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
            </button>
            {isAuthenticated ? (
              <a className="btn btn-primary btn-sm nav-cta" href="/dashboard">Dashboard</a>
            ) : (
              <>
                <a className="btn btn-ghost btn-sm nav-cta" href="/login">Iniciar Sesión</a>
                <a className="btn btn-primary btn-sm nav-cta" href="/login?plan=free">
                  Empezar gratis
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                </a>
              </>
            )}
            <button
              className="icon-btn burger"
              id="burger"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Abrir menú"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
            </button>
          </div>
        </div>
        <div className={`mobile-menu${mobileOpen ? ' open' : ''}`} id="mobileMenu">
          {navLinks.map((link) => (
            <a key={link.id} href={`#${link.id}`} onClick={(e) => { e.preventDefault(); scrollTo(link.id); }}>{link.label}</a>
          ))}
          <a className="btn btn-primary btn-block" href="/login?plan=free">Empezar gratis</a>
        </div>
      </header>
    </>
  );
};

export default LandingNavbar;
```

**Note on `useTheme()` return:** The updated ThemeContext still returns `{ theme, toggleTheme }` — `isDark` is a local derived const (`theme === 'dark'`), used only for nav-specific styling. The `toggleTheme` function is used on the theme button click. The CSS handles dark mode via `[data-theme="dark"]` selectors so `isDark` is only for Tailwind-based components.

- [ ] **Commit**

```bash
git add src/landing/components/LandingNavbar.tsx
git commit -m "feat: add new LandingNavbar with mockup nav structure"
```

---

### Task 5: HeroSection + Marquee

**Files:**
- Create: `src/landing/components/HeroSection.tsx` (rewrite)

- [ ] **Write HeroSection.tsx**

Renders the hero section (lines 551-603) and the marquee (lines 606-611). Includes:
- Hero grid: copy column (headline, sub, CTAs, proof points, ticker) + visual column (photo frame, float card, rubric tag)
- Marquee below hero
- Ticker animation with setInterval cycling through 5 lines every 3.6s

```tsx
import React, { useState, useEffect, useCallback } from 'react';

const tickerLines = [
  'Evaluando 212 CVs — Desarrollador Sr · CDMX',
  'Rúbrica lista — Analista de Datos · Bogotá',
  'Shortlist entregada — UX Designer · Madrid · 4 min 12 s',
  'OCR aplicado a 37 CVs escaneados — Project Manager · Lima',
  'Ranking actualizado — Ejecutivo de Ventas · Santiago'
];

const useScrollReveal = () => {
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const els = document.querySelectorAll('.reveal');
    if (reduce || !('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('in'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
};

const HeroSection: React.FC = () => {
  const [tickerIdx, setTickerIdx] = useState(0);
  const [fade, setFade] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(true);
      setTimeout(() => {
        setTickerIdx((i) => (i + 1) % tickerLines.length);
        setFade(false);
      }, 380);
    }, 3600);
    return () => clearInterval(interval);
  }, []);

  useScrollReveal();

  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy reveal">
            <span className="eyebrow"><span className="dot"></span> Screening de CVs con IA · en español</span>
            <h1>200 CVs por oferta.<span className="l2">Evalen <span className="hl">los lee todos</span></span><span className="l2">y te dice a quién entrevistar.</span></h1>
            <p className="sub">Pega la descripción del cargo, sube los currículums y recibe un ranking con puntaje y <b>justificación escrita</b> en minutos. Sin cajas negras, sin sesgo de cansancio, sin perder una tarde entera leyendo PDFs.</p>
            <div className="hero-cta">
              <a className="btn btn-primary" href="/login?plan=free">Empezar gratis — 3 CVs incluidos
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
              </a>
              <a className="btn btn-ghost" href="#como-funciona" onClick={(e) => { e.preventDefault(); document.getElementById('como-funciona')?.scrollIntoView({ behavior: 'smooth' }); }}>Ver cómo funciona
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M6 13l6 6 6-6"/></svg>
              </a>
            </div>
            <div className="hero-proof">
              <span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg> Sin tarjeta de crédito</span>
              <span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg> Listo en 2 minutos</span>
              <span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg> Cancela cuando quieras</span>
            </div>
            <div className="ticker" aria-hidden="true">
              <span className="live"></span>
              <span className={`txt${fade ? ' fade' : ''}`} id="tickerTxt">{tickerLines[tickerIdx]}</span>
            </div>
          </div>
          <div className="hero-visual reveal">
            <div className="photo-frame">
              <img src="https://image.qwenlm.ai/public_source/88b2e882-98ee-4857-a83c-263c15dcf5c8/17f80e256-1710-4499-aaf8-be5c49dbdfe2.png" alt="Un reclutador marcando con un resaltador amarillo la línea clave de un currículum impreso sobre su escritorio." width="1024" height="1024" fetchpriority="high" />
              <span className="photo-cap">ficha · screening real, no plantilla</span>
              <span className="photo-tag">CV nº 143 · evaluado en 3.8 s</span>
            </div>
            <div className="float-rubric">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
              rúbrica generada desde tu oferta
            </div>
            <div className="float-card">
              <div className="fc-top">
                <span className="avatar" style={{ background: '#1C5B44' }}>VR</span>
                <div>
                  <div className="fc-name">Valentina Ríos</div>
                  <div className="fc-role">Desarrolladora Sr · 6 años</div>
                </div>
                <div className="fc-score"><b>92</b><small>/ 100</small></div>
              </div>
              <div className="fc-bars">
                <div className="bar-row" style={{ '--accent': 'var(--good)' } as React.CSSProperties}><span>Experiencia</span><span className="bar"><span className="bar-fill" style={{ '--w': '94%' } as React.CSSProperties}></span></span><span className="v">9.4</span></div>
                <div className="bar-row" style={{ '--accent': 'var(--good)' } as React.CSSProperties}><span>Stack</span><span className="bar"><span className="bar-fill" style={{ '--w': '91%' } as React.CSSProperties}></span></span><span className="v">9.1</span></div>
              </div>
              <p className="fc-just">“Cumple los 3 excluyentes. Lideró la migración a microservicios en 2023.” <span className="chip chip-good" style={{ marginLeft: 4 }}>→ Entrevista</span></p>
            </div>
          </div>
        </div>
      </section>
      <div className="marquee" aria-hidden="true">
        <div className="marquee-track" id="marquee">
          <span>Talent Leads <i className="sep">✦</i> Recruiters <i className="sep">✦</i> Heads of People <i className="sep">✦</i> Agencias de selección <i className="sep">✦</i> Hiring Managers <i className="sep">✦</i> Equipos de RR.HH. <i className="sep">—</i> México <i className="sep">·</i> Colombia <i className="sep">·</i> España <i className="sep">·</i> Chile <i className="sep">·</i> Argentina <i className="sep">·</i> Perú <i className="sep">·</i> Ecuador</span>
          <span>Talent Leads <i className="sep">✦</i> Recruiters <i className="sep">✦</i> Heads of People <i className="sep">✦</i> Agencias de selección <i className="sep">✦</i> Hiring Managers <i className="sep">✦</i> Equipos de RR.HH. <i className="sep">—</i> México <i className="sep">·</i> Colombia <i className="sep">·</i> España <i className="sep">·</i> Chile <i className="sep">·</i> Argentina <i className="sep">·</i> Perú <i className="sep">·</i> Ecuador</span>
        </div>
      </div>
    </>
  );
};

export default HeroSection;
```

- [ ] **Commit**

```bash
git add src/landing/components/HeroSection.tsx
git commit -m "feat: add new HeroSection with ticker + marquee"
```

---

### Task 6: ProblemSection + HowItWorksSection

**Files:**
- Create: `src/landing/components/ProblemSection.tsx`
- Create: `src/landing/components/HowItWorksSection.tsx`

- [ ] **Write ProblemSection.tsx**

Renders the problem section (mockup lines 614-645) with photo, 3 pain points, and bridge quote.

```tsx
import React from 'react';

const ProblemSection: React.FC = () => (
  <section className="sec" id="problema">
    <div className="container">
      <div className="problem-grid">
        <div className="problem-photo reveal">
          <div className="photo-frame">
            <img src="https://image.qwenlm.ai/public_source/88b2e882-98ee-4857-a83c-263c15dcf5c8/18f752ce5-3aff-4674-818e-5d73ac2d7977.png" alt="Un escritorio de oficina desbordado por pilas altas de currículums impresos, con un reclutador agotado al fondo." width="1024" height="1024" loading="lazy" decoding="async" />
          </div>
          <div className="stamp">promedio por oferta<br /><b>~150 CVs</b> · leídos a mano</div>
        </div>
        <div className="reveal">
          <div className="label"><span className="num">01</span> El problema <span className="rule"></span></div>
          <h2 style={{ fontSize: 'clamp(1.9rem,3.6vw,2.9rem)' } as React.CSSProperties}>Publicaste la oferta. Y el trabajo de verdad recién empieza.</h2>
          <p style={{ color: 'var(--ink-2)', fontSize: '1.08rem', marginTop: 14, maxWidth: '50ch' } as React.CSSProperties}>Nadie te avisó que filtrar la avalancha iba a ser tu jornada completa. Estos son los tres costos reales de leer CVs a mano:</p>
          <div className="pains" style={{ marginTop: 30 }}>
            {[
              { n: '01', title: 'Una tarde entera por oferta', desc: 'Leer 150 currículums con atención real se lleva 4 horas o más. Y la próxima vacante ya te está esperando en el inbox.' },
              { n: '02', title: 'El mismo CV, dos notas distintas', desc: 'Un martes a las 10 a.m. no evalúas igual que un viernes a las 6 p.m. El cansancio también sesga, y nadie lo mide.' },
              { n: '03', title: 'Los buenos no esperan', desc: 'Mientras filtras a mano, tu mejor candidato recibe otra oferta. La velocidad también contrata — y también descarta.' },
            ].map((pain) => (
              <div className="pain" key={pain.n}>
                <span className="n">{pain.n}</span>
                <div><h3>{pain.title}</h3><p>{pain.desc}</p></div>
              </div>
            ))}
          </div>
          <div className="bridge">No te faltan candidatos. Te falta leerlos a todos, con el mismo criterio, en minutos. Para eso existe Evalen.</div>
        </div>
      </div>
    </div>
  </section>
);

export default ProblemSection;
```

- [ ] **Write HowItWorksSection.tsx**

Renders the "Cómo funciona" section (mockup lines 648-676) with 3 steps.

```tsx
import React from 'react';

const steps = [
  { snum: 'PASO 01', title: 'Crea tu campaña', desc: 'Pega la descripción del cargo. Evalen genera la rúbrica sola: criterios ponderados, habilidades clave y requisitos excluyentes. La ajustas si quieres, o la dejas tal cual.', tag: 'Rúbrica automática' },
  { snum: 'PASO 02', title: 'Sube los CVs', desc: 'Arrastra PDFs, Word o incluso escaneados. La IA extrae experiencia, educación y habilidades en formato estructurado — aunque el currículum sea un desorden de columnas.', tag: 'PDF · DOCX · OCR' },
  { snum: 'PASO 03', title: 'Recibe el ranking', desc: 'Cada candidato recibe un puntaje contra tu rúbrica, con justificación escrita. Mueves a los que valen a entrevista y descarta el resto con un clic.', tag: 'Nota + porqué' },
];

const HowItWorksSection: React.FC = () => (
  <section className="sec" id="como-funciona" style={{ background: 'var(--paper-2)', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
    <div className="container">
      <div className="sec-head reveal">
        <div className="label"><span className="num">02</span> Cómo funciona <span className="rule"></span></div>
        <h2>De la oferta publicada a la shortlist lista, en tres pasos.</h2>
        <p>Sin prompts que configurar, sin curva de aprendizaje. Pegas el cargo y Evalen arma el resto.</p>
      </div>
      <div className="steps">
        {steps.map((step) => (
          <div className="step reveal" key={step.snum}>
            <span className="snum">{step.snum}</span>
            <h3>{step.title}</h3>
            <p>{step.desc}</p>
            <span className="tag">{step.tag}</span>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default HowItWorksSection;
```

- [ ] **Commit**

```bash
git add src/landing/components/ProblemSection.tsx src/landing/components/HowItWorksSection.tsx
git commit -m "feat: add ProblemSection and HowItWorksSection"
```

---

### Task 7: DemoSection (candidate expandable rows)

**Files:**
- Create: `src/landing/components/DemoSection.tsx`

- [ ] **Write DemoSection.tsx**

Renders the demo mockup (mockup lines 679-806) with 4 expandable candidate rows. Uses state to track which candidate is open (accordion behavior). Includes bar animation via refs.

```tsx
import React, { useState, useRef, useCallback, useEffect } from 'react';

type CandidateId = 'VR' | 'AP' | 'LF' | 'MT';

interface CandidateData {
  id: CandidateId;
  initials: string;
  avatarColor: string;
  name: string;
  role: string;
  score: number;
  scoreClass: string;
  chip: string;
  chipClass: string;
  bars: { label: string; w: string; v: string }[];
  justification: string;
}

const candidates: CandidateData[] = [
  { id: 'VR', initials: 'VR', avatarColor: '#1C5B44', name: 'Valentina Ríos', role: 'Desarrolladora Sr · 6 años', score: 92, scoreClass: 'sc-good', chip: 'Entrevista', chipClass: 'chip-good', bars: [{ label: 'Experiencia', w: '94%', v: '9.4' }, { label: 'Habilidades', w: '91%', v: '9.1' }, { label: 'Educación', w: '80%', v: '8.0' }, { label: 'Idiomas', w: '88%', v: '8.8' }], justification: 'Cumple los tres criterios excluyentes (React, inglés B2, 5+ años). Lideró la migración a microservicios en 2023 y mentoreó a 4 devs. Perfil alineado con el seniority pedido y con disponibilidad en 30 días.' },
  { id: 'AP', initials: 'AP', avatarColor: '#2E7D5B', name: 'Andrés Peña', role: 'Desarrollador Semi-Sr · 4 años', score: 87, scoreClass: 'sc-good', chip: 'Entrevista', chipClass: 'chip-good', bars: [{ label: 'Experiencia', w: '88%', v: '8.8' }, { label: 'Habilidades', w: '86%', v: '8.6' }, { label: 'Educación', w: '72%', v: '7.2' }, { label: 'Idiomas', w: '80%', v: '8.0' }], justification: 'Sólido en el stack principal y con buen historial de entregas medibles. Le falta experiencia en sectores regulados; lo compensa con certificaciones cloud y disponibilidad inmediata. Vale una entrevista técnica.' },
  { id: 'LF', initials: 'LF', avatarColor: '#A9760F', name: 'Lucía Fernández', role: 'Fullstack · 3 años', score: 74, scoreClass: 'sc-mid', chip: 'En revisión', chipClass: 'chip-mid', bars: [{ label: 'Experiencia', w: '70%', v: '7.0' }, { label: 'Habilidades', w: '78%', v: '7.8' }, { label: 'Educación', w: '76%', v: '7.6' }, { label: 'Idiomas', w: '72%', v: '7.2' }], justification: 'Buen dominio técnico y proyectos personales relevantes, pero 2 años por debajo del seniority mínimo pedido. Podría encajar en una posición mid si se abre el rango salarial.' },
  { id: 'MT', initials: 'MT', avatarColor: '#B23B2E', name: 'Marco Tovar', role: 'Backend Jr · 1 año', score: 58, scoreClass: 'sc-low', chip: 'Descartado', chipClass: 'chip-low', bars: [{ label: 'Experiencia', w: '52%', v: '5.2' }, { label: 'Habilidades', w: '60%', v: '6.0' }, { label: 'Educación', w: '64%', v: '6.4' }, { label: 'Idiomas', w: '40%', v: '4.0' }], justification: 'No cumple el excluyente de inglés B2 y su experiencia es junior para esta vacante. Perfil interesante para futuras posiciones de entrada — lo guardamos en el pool.' },
];

function animateBars(container: HTMLElement) {
  const fills = container.querySelectorAll<HTMLElement>('.bar-fill');
  fills.forEach((f) => { f.style.width = '0'; });
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      fills.forEach((f, idx) => {
        setTimeout(() => {
          f.style.width = f.style.getPropertyValue('--w') || getComputedStyle(f).getPropertyValue('--w');
        }, idx * 70);
      });
    });
  });
}

const DemoSection: React.FC = () => {
  const [openId, setOpenId] = useState<CandidateId>('VR');
  const mockRef = useRef<HTMLDivElement>(null);
  const animatedRef = useRef(false);

  const handleToggle = useCallback((id: CandidateId) => {
    setOpenId((prev) => prev === id ? id : id); // always open one
    // bar animation happens in useEffect on openId change
  }, []);

  useEffect(() => {
    const mock = mockRef.current;
    if (!mock) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const openEl = mock.querySelector<HTMLElement>(`.cand.open`);
    if (openEl && !reduce) {
      setTimeout(() => { animateBars(openEl); }, 60);
    } else if (openEl && reduce) {
      openEl.querySelectorAll<HTMLElement>('.bar-fill').forEach((f) => {
        f.style.width = getComputedStyle(f).getPropertyValue('--w');
      });
    }
  }, [openId]);

  // initial animation when demo enters viewport
  useEffect(() => {
    const mock = mockRef.current;
    if (!mock || animatedRef.current) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      mock.querySelectorAll<HTMLElement>('.bar-fill').forEach((f) => {
        f.style.width = getComputedStyle(f).getPropertyValue('--w');
      });
      animatedRef.current = true;
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const openRow = mock.querySelector<HTMLElement>('.cand.open');
            if (openRow) animateBars(openRow);
            animatedRef.current = true;
            io.disconnect();
          }
        });
      },
      { threshold: 0.25 }
    );
    io.observe(mock);
    return () => io.disconnect();
  }, []);

  return (
    <section className="sec" id="producto">
      <div className="container">
        <div className="sec-head reveal">
          <div className="label"><span className="num">03</span> Lo que recibes <span className="rule"></span></div>
          <h2>Una nota clara. Y el <span className="hl-soft">porqué</span>, por escrito.</h2>
          <p>Nada de oráculos. Cada puntaje viene con la razón detrás, criterio por criterio — para que defiendas la shortlist ante el hiring manager, el cliente o quien sea.</p>
        </div>
        <div className="demo-grid reveal">
          <div className="mock" id="mock" ref={mockRef}>
            <div className="mock-bar">
              <span className="dots"><i></i><i></i><i></i></span>
              <span className="title">evalen · campaña: <b>Desarrollador/a Sr · React</b></span>
              <span className="pill">rúbrica · 4 criterios</span>
            </div>
            <div className="mock-body">
              {candidates.map((c) => (
                <div
                  key={c.id}
                  className={`cand${openId === c.id ? ' open' : ''}`}
                  style={{ '--accent': `var(--${c.scoreClass === 'sc-good' ? 'good' : c.scoreClass === 'sc-mid' ? 'mid' : 'low'})` } as React.CSSProperties}
                >
                  <button
                    className="cand-head"
                    aria-expanded={openId === c.id}
                    onClick={() => handleToggle(c.id)}
                  >
                    <span className="avatar" style={{ background: c.avatarColor }}>{c.initials}</span>
                    <span><span className="nm">{c.name}</span><br /><span className="rl">{c.role}</span></span>
                    <span className={`score ${c.scoreClass}`}>{c.score}<small>MATCH</small></span>
                    <span className="status-cell"><span className={`chip ${c.chipClass}`}>{c.chip}</span></span>
                    <svg className="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                  </button>
                  <div className="cand-body"><div><div className="cand-inner">
                    <div className="bars">
                      {c.bars.map((bar) => (
                        <div className="bar-row" key={bar.label}><span>{bar.label}</span><span className="bar"><span className="bar-fill" style={{ '--w': bar.w } as React.CSSProperties}></span></span><span className="v">{bar.v}</span></div>
                      ))}
                    </div>
                    <div className="just">
                      <h4>Por qué esta nota</h4>
                      <p>{c.justification}</p>
                      <a className="rubric-link" href="/login?plan=free">Ver rúbrica usada →</a>
                    </div>
                  </div></div></div>
                </div>
              ))}
            </div>
            <div className="mock-foot">
              <span>212 CVs evaluados · 4 en shortlist</span>
              <span>tiempo total: 4 min 12 s</span>
            </div>
          </div>
          <div className="annot-row">
            <div className="annot">
              <svg width="74" height="40" viewBox="0 0 74 40" fill="none" stroke="var(--cta)" strokeWidth="2" strokeLinecap="round"><path d="M4 34 C 22 36, 30 12, 52 9 S 66 8, 70 14"/><path d="M70 14 l -9 -2 M70 14 l -3 8"/></svg>
              La rúbrica nace de <b style={{ color: 'var(--ink)' }}>tu oferta</b>, no de una plantilla genérica.
            </div>
            <div className="annot">
              <svg width="74" height="40" viewBox="0 0 74 40" fill="none" stroke="var(--cta)" strokeWidth="2" strokeLinecap="round" style={{ transform: 'scaleX(-1)' }}><path d="M4 34 C 22 36, 30 12, 52 9 S 66 8, 70 14"/><path d="M70 14 l -9 -2 M70 14 l -3 8"/></svg>
              Justificación lista para <b style={{ color: 'var(--ink)' }}>compartir</b> con el hiring manager.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DemoSection;
```

- [ ] **Commit**

```bash
git add src/landing/components/DemoSection.tsx
git commit -m "feat: add DemoSection with expandable candidate rows"
```

---

### Task 8: BenefitsSection + TestimonialsSection

**Files:**
- Create: `src/landing/components/BenefitsSection.tsx`
- Create: `src/landing/components/TestimonialsSection.tsx`

- [ ] **Write BenefitsSection.tsx**

Renders the "Por qué Evalen" benefits section (mockup lines 810-836) and the time band (lines 839-848).

```tsx
import React from 'react';

const benefits = [
  { icon: '<circle cx="9" cy="12" r="6"/><circle cx="15" cy="12" r="6"/>', title: 'Matching semántico, no por palabras clave', desc: 'Entiende que "5 años liderando equipos" pesa más que una lista de buzzwords. Compara significado, no texto copiado del anuncio.' },
  { icon: '<path d="M4 7h16M4 12h16M4 17h16"/><circle cx="9" cy="7" r="2.4" fill="var(--card)"/><circle cx="15" cy="12" r="2.4" fill="var(--card)"/><circle cx="8" cy="17" r="2.4" fill="var(--card)"/>', title: 'Rúbrica objetiva por oferta', desc: 'Los mismos criterios, con los mismos pesos, para los 200 candidatos. El cansancio, el humor y la hora del día no puntúan.' },
  { icon: '<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M10 12h6M10 16h6"/>', title: 'Explicaciones, no oráculos', desc: 'Cada nota se justifica por escrito, criterio por criterio. Puedes auditarla, rebatirla y mostrársela a quien te la pida.' },
  { icon: '<rect x="3" y="4" width="5" height="16" rx="1.5"/><rect x="9.5" y="4" width="5" height="11" rx="1.5"/><rect x="16" y="4" width="5" height="7" rx="1.5"/>', title: 'Pipeline visual', desc: 'Revisión, entrevista, oferta, rechazo. Todo el proceso en un tablero claro — sin hojas de cálculo que se rompen a la tercera columna.' },
];

const BenefitsSection: React.FC = () => (
  <>
    <section className="sec" id="ventajas" style={{ paddingTop: 0 }}>
      <div className="container">
        <div className="sec-head reveal">
          <div className="label"><span className="num">04</span> Por qué Evalen <span className="rule"></span></div>
          <h2>Automatiza la lectura. Enfócate en lo humano.</h2>
          <p>La IA hace la parte que nadie disfruta — leer 200 veces lo mismo — para que tú vuelvas a hacer la tuya: conversar con personas.</p>
        </div>
        <div className="benefits">
          {benefits.map((ben, i) => (
            <div className="ben reveal" key={i}>
              <span className="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" dangerouslySetInnerHTML={{ __html: ben.icon }} /></span>
              <div><h3>{ben.title}</h3><p>{ben.desc}</p></div>
            </div>
          ))}
        </div>
      </div>
    </section>
    <section className="sec" style={{ paddingTop: 0 }}>
      <div className="container">
        <div className="band reveal">
          <span className="eyebrow"><span className="dot"></span> El tiempo que recuperas</span>
          <h2><span className="strike">4 horas</span> de lectura → <span className="hl">4 minutos</span> de decisión.</h2>
          <p>Lo que te toma leer 150 CVs a mano, Evalen lo resuelve mientras sirves el café. El ranking completo, con notas y razones, listo antes de que se enfríe.</p>
          <div className="note">* En campañas de +100 CVs, el ranking completo llega en menos de 5 minutos.</div>
        </div>
      </div>
    </section>
  </>
);

export default BenefitsSection;
```

- [ ] **Write TestimonialsSection.tsx**

Renders the "Lo que dicen" section (mockup lines 851-881) with 3 testimonial quotes and avatars.

```tsx
import React from 'react';

const quotes = [
  { q: '"Subí 183 CVs un lunes a las 9. A las 9:20 tenía la shortlist de 8 personas con notas y razones. Entrevisté esa misma semana y <span class="hl-soft">cerré la posición en 12 días</span>."', img: 'https://image.qwenlm.ai/public_source/88b2e882-98ee-4857-a83c-263c15dcf5c8/13cf1ae23-d2ca-4f0c-9f8b-1c2f196170ed.png', name: 'Carolina Méndez', role: 'Talent Lead · logística · Bogotá' },
  { q: '"Lo que me convenció no fue la velocidad: fue poder mostrarle al cliente <span class="hl-soft">el porqué de cada candidato</span>. Las justificaciones se volvieron mi reporte."', img: 'https://image.qwenlm.ai/public_source/88b2e882-98ee-4857-a83c-263c15dcf5c8/11a63a286-6f6d-47d6-8883-790df8a8e5a1.png', name: 'Rodrigo Salas', role: 'Recruiter independiente · CDMX' },
  { q: '"Antes descartaba a ojo y me quedaba con la duda. Ahora <span class="hl-soft">la rúbrica es la misma para todos</span>, y las decisiones se defienden solas ante el comité."', img: 'https://image.qwenlm.ai/public_source/88b2e882-98ee-4857-a83c-263c15dcf5c8/1e8087bb2-4a35-4986-a823-5f204822ea85.png', name: 'Pilar Ortega', role: 'Head of People · SaaS B2B · Madrid' },
];

const TestimonialsSection: React.FC = () => (
  <section className="sec" id="voces" style={{ background: 'var(--paper-2)', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
    <div className="container">
      <div className="sec-head reveal">
        <div className="label"><span className="num">05</span> Lo que dicen <span className="rule"></span></div>
        <h2>Equipos que dejaron de leer CVs a mano.</h2>
      </div>
      <div className="quotes">
        {quotes.map((q, i) => (
          <div className="quote reveal" key={i}>
            <p className="q" dangerouslySetInnerHTML={{ __html: q.q }} />
            <div className="who">
              <img src={q.img} alt={`Retrato de ${q.name}`} width="200" height="200" loading="lazy" decoding="async" />
              <div><div className="nm">{q.name}</div><div className="rl">{q.role}</div></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default TestimonialsSection;
```

- [ ] **Commit**

```bash
git add src/landing/components/BenefitsSection.tsx src/landing/components/TestimonialsSection.tsx
git commit -m "feat: add BenefitsSection and TestimonialsSection"
```

---

### Task 9: PricingSection (with button mapping)

**Files:**
- Create: `src/landing/components/PricingSection.tsx` (rewrite)

- [ ] **Write PricingSection.tsx**

Renders the pricing grid (mockup lines 884-955) with 3 plans and the final CTA (lines 998-1016). All "Empezar gratis" buttons map to `/login?plan=free`, "Probar EvalenPro" → `/login?plan=pro`, "Hablar con ventas" → `/login?plan=enterprise`.

```tsx
import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

const plans = [
  {
    name: 'Starter', price: '$0', per: '/ mes', desc: 'Para evaluar tu primera campaña y ver si esto es lo tuyo.',
    features: [
      { text: '2 campañas activas al mes', off: false },
      { text: '3 CVs evaluados con nota completa', off: false },
      { text: 'Smart Match + justificación escrita', off: false },
      { text: 'Subida de PDF, DOCX y escaneados', off: false },
      { text: 'Exportación de reportes', off: true },
    ],
    cta: 'Empezar gratis', href: '/login?plan=free', note: 'Sin tarjeta de crédito', cls: 'btn-ghost',
  },
  {
    name: 'EvalenPro', price: '$49', per: 'USD / mes', desc: 'Para equipos de RR.HH. que contratan seguido y no pueden perder tiempo.', featured: true,
    badge: '★ El favorito de los equipos',
    features: [
      { text: 'Campañas ilimitadas', off: false },
      { text: 'Procesamiento de CVs ilimitado', off: false },
      { text: 'Smart Match semántico avanzado', off: false },
      { text: 'Exportación de rankings y reportes', off: false },
      { text: 'Soporte prioritario', off: false },
    ],
    cta: 'Probar EvalenPro', href: '/login?plan=pro', note: 'Cancela cuando quieras · sin permanencia', cls: 'btn-primary',
  },
  {
    name: 'Enterprise', price: 'A medida', per: '', desc: 'Para alto volumen y requisitos corporativos de seguridad.',
    features: [
      { text: 'Todo lo de EvalenPro', off: false },
      { text: 'SSO / SAML corporativo', off: false },
      { text: 'API de integración con tu ATS', off: false },
      { text: 'Onboarding dedicado + SLA', off: false },
      { text: 'Condiciones por volumen', off: false },
    ],
    cta: 'Hablar con ventas', href: '/login?plan=enterprise', note: 'Respuesta en 1 día hábil', cls: 'btn-dark',
  },
];

const PricingSection: React.FC = () => (
  <>
    <section className="sec" id="precios">
      <div className="container">
        <div className="sec-head reveal" style={{ textAlign: 'center', margin: '0 auto' } as React.CSSProperties}>
          <div className="label" style={{ justifyContent: 'center' } as React.CSSProperties}><span className="num">06</span> Planes <span className="rule" style={{ maxWidth: 120 } as React.CSSProperties}></span></div>
          <h2 style={{ margin: '6px auto 0' } as React.CSSProperties}>Empieza gratis. Mejora cuando lo veas funcionar.</h2>
          <p style={{ margin: '16px auto 0', textAlign: 'center' } as React.CSSProperties}>Sin tarjeta para probar. Sin permanencia para quedarte.</p>
        </div>
        <div className="price-grid">
          {plans.map((plan) => (
            <div key={plan.name} className={`plan reveal${plan.featured ? ' feat price-note' : ''}`}>
              {plan.badge && <span className="badge">{plan.badge}</span>}
              <div className="pname">{plan.name}</div>
              <div className="pdesc">{plan.desc}</div>
              <div className="price">
                <b style={plan.name === 'Enterprise' ? { fontSize: '2.2rem' } : undefined}>{plan.price}</b>
                {plan.per && <span className="per">{plan.per}</span>}
              </div>
              <ul>
                {plan.features.map((f, i) => (
                  <li key={i} className={f.off ? 'off' : ''}>
                    {f.off ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                    )}
                    <span dangerouslySetInnerHTML={{ __html: f.text }} />
                  </li>
                ))}
              </ul>
              <a className={`btn ${plan.cls} btn-block`} href={plan.href}>
                {plan.cta}
                {plan.cls === 'btn-primary' && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                )}
              </a>
              <div className="note">{plan.note}</div>
              {plan.featured && (
                <div className="hand-note" aria-hidden="true">
                  <svg width="46" height="46" viewBox="0 0 46 46" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M40 6 C 34 22, 22 28, 10 40"/><path d="M10 40 l 11 -2 M10 40 l 1 -11"/></svg>
                  se paga solo con la primera contratación que cierras antes
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="price-foot reveal">
          <span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg> Sin permanencia</span>
          <span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg> Cancela en 1 clic</span>
          <span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg> Factura a nombre de tu empresa</span>
        </div>
      </div>
    </section>
    <section className="sec" style={{ paddingTop: 0 }}>
      <div className="container">
        <div className="final reveal">
          <img className="bg" src="https://image.qwenlm.ai/public_source/88b2e882-98ee-4857-a83c-263c15dcf5c8/1b509d23e-c67d-4167-9fe9-c5c48d6ec8c5.png" alt="" aria-hidden="true" loading="lazy" decoding="async" />
          <div className="ov"></div>
          <div className="inner">
            <span className="eyebrow"><span className="dot"></span> Empieza hoy</span>
            <h2>El candidato nº 143 <span className="hl">está esperando</span> tu llamada.</h2>
            <p>Crea tu campaña gratis, sube los currículums y ten la shortlist con notas y razones antes del próximo café.</p>
            <div className="cta-row">
              <a className="btn btn-primary" href="/login?plan=free">Empezar gratis — sin tarjeta
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
              </a>
              <a className="btn btn-ghost" href="/login?plan=free">Ver planes</a>
            </div>
          </div>
        </div>
      </div>
    </section>
  </>
);

export default PricingSection;
```

- [ ] **Add font imports to public/index.html**

Add inside `<head>` before the closing tag:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/fontsource/css/fraunces@latest/latin-400-normal.css" />
<link rel="stylesheet" href="https://cdn.jsdelivr.net/fontsource/css/fraunces@latest/latin-500-normal.css" />
<link rel="stylesheet" href="https://cdn.jsdelivr.net/fontsource/css/fraunces@latest/latin-600-normal.css" />
<link rel="stylesheet" href="https://cdn.jsdelivr.net/fontsource/css/fraunces@latest/latin-700-normal.css" />
<link rel="stylesheet" href="https://cdn.jsdelivr.net/fontsource/css/fraunces@latest/latin-500-italic.css" />
<link rel="stylesheet" href="https://cdn.jsdelivr.net/fontsource/css/instrument-sans@latest/latin-400-normal.css" />
<link rel="stylesheet" href="https://cdn.jsdelivr.net/fontsource/css/instrument-sans@latest/latin-500-normal.css" />
<link rel="stylesheet" href="https://cdn.jsdelivr.net/fontsource/css/instrument-sans@latest/latin-600-normal.css" />
<link rel="stylesheet" href="https://cdn.jsdelivr.net/fontsource/css/instrument-sans@latest/latin-700-normal.css" />
<link rel="stylesheet" href="https://cdn.jsdelivr.net/fontsource/css/ibm-plex-mono@latest/latin-400-normal.css" />
<link rel="stylesheet" href="https://cdn.jsdelivr.net/fontsource/css/ibm-plex-mono@latest/latin-500-normal.css" />
```

- [ ] **Commit**

```bash
git add src/landing/components/PricingSection.tsx public/index.html
git commit -m "feat: add PricingSection with button mapping + font imports"
```

---

### Task 10: FAQSection

**Files:**
- Create: `src/landing/components/FAQSection.tsx`

- [ ] **Write FAQSection.tsx**

Renders the FAQ accordion (mockup lines 958-995) with 7 items. Uses `Set<number>` state for multi-open accordion.

```tsx
import React, { useState } from 'react';

const faqs = [
  { q: '¿Qué formatos de CV acepta?', a: 'PDF, Word (DOC y DOCX), TXT y RTF. Los PDFs escaneados pasan por OCR automático, así que también sirven fotos de CVs impresos o currículums con columnas raras.' },
  { q: '¿La IA decide a quién contrato?', a: 'No. Evalen ordena, puntúa y explica; la decisión final siempre es tuya. Es un filtro de entrada que te ahorra la lectura repetitiva, no un juez que contrata por ti.' },
  { q: '¿Funciona bien en español?', a: 'Sí. Está pensado para equipos hispanohablantes y entiende CVs en varios idiomas, incluidos formatos que mezclan español e inglés o términos técnicos sin traducir.' },
  { q: '¿Qué pasa con los datos de los candidatos?', a: 'Los archivos se procesan de forma segura y no se usan para entrenar modelos. Puedes eliminar candidatos y documentos cuando quieras, y los planes Enterprise incluyen SSO y acuerdos de tratamiento de datos.' },
  { q: '¿Necesito configurar algo técnico o escribir prompts?', a: 'No. Pegas la descripción del cargo y la rúbrica se genera sola. Si quieres ajustar pesos o requisitos excluyentes, puedes hacerlo; si no, funciona tal cual desde el primer CV.' },
  { q: '¿Cómo funcionan los 3 CVs gratis?', a: 'El plan Starter incluye 3 evaluaciones completas (nota + justificación + rúbrica) para que pruebes el producto con una campaña real. Cada CV analizado consume un crédito; al terminarlos, decides si Evalen merece pagarse solo.' },
  { q: '¿Puedo cancelar cuando quiera?', a: 'Sí. No hay permanencia ni penalizaciones. Si cancelas, vuelves al plan Starter y tus campañas históricas siguen visibles para consulta.' },
];

const FAQSection: React.FC = () => {
  const [openSet, setOpenSet] = useState<Set<number>>(new Set());

  const toggle = (idx: number) => {
    setOpenSet((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  return (
    <section className="sec" id="preguntas" style={{ paddingTop: 0 }}>
      <div className="container">
        <div className="sec-head reveal" style={{ textAlign: 'center', margin: '0 auto' } as React.CSSProperties}>
          <div className="label" style={{ justifyContent: 'center' } as React.CSSProperties}><span className="num">07</span> Preguntas frecuentes <span className="rule" style={{ maxWidth: 120 } as React.CSSProperties}></span></div>
          <h2 style={{ margin: '6px auto 0' } as React.CSSProperties}>Lo que te preguntarías antes de pagar.</h2>
        </div>
        <div className="faq reveal" id="faq">
          {faqs.map((faq, idx) => (
            <div key={idx} className={`faq-item${openSet.has(idx) ? ' open' : ''}`}>
              <button className="faq-q" aria-expanded={openSet.has(idx)} onClick={() => toggle(idx)}>
                {faq.q}
                <span className="pm"></span>
              </button>
              <div className="faq-a"><div><p>{faq.a}</p></div></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
```

- [ ] **Commit**

```bash
git add src/landing/components/FAQSection.tsx
git commit -m "feat: add FAQSection with accordion"
```

---

### Task 11: FooterSection (footer + sticky CTA)

**Files:**
- Create: `src/landing/components/FooterSection.tsx` (rewrite)

- [ ] **Write FooterSection.tsx**

Renders the footer (mockup lines 1021-1063) and sticky mobile CTA (lines 1066-1069). Footer uses smooth scroll for nav links and correct login URLs.

```tsx
import React, { useState, useEffect } from 'react';

const FooterSection: React.FC = () => {
  const [showSticky, setShowSticky] = useState(false);
  const year = new Date().getFullYear();

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY || window.pageYOffset;
      const heroEl = document.querySelector('.hero');
      const footerEl = document.querySelector('footer');
      const pastHero = heroEl ? y > (heroEl.getBoundingClientRect().top + y + heroEl.getBoundingClientRect().height - 120) : y > 700;
      const footTop = footerEl ? (footerEl.getBoundingClientRect().top + y) : Infinity;
      const nearFoot = (y + window.innerHeight) > (footTop - 40);
      const visible = pastHero && !nearFoot;
      setShowSticky(visible);
      document.body.classList.toggle('pad-bottom', visible);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    onScroll();
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      document.body.classList.remove('pad-bottom');
    };
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      <footer>
        <div className="container">
          <div className="foot-grid">
            <div className="foot-about">
              <a className="brand" href="#top" aria-label="Evalen, inicio" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                <svg className="mark" viewBox="0 0 48 48" aria-hidden="true">
                  <rect width="48" height="48" rx="12" fill="var(--green-deep)"/>
                  <rect x="13" y="12" width="5" height="24" rx="2.5" fill="var(--on-mark)"/>
                  <rect x="13" y="12" width="18" height="5" rx="2.5" fill="var(--on-mark)"/>
                  <rect x="13" y="21.5" width="13" height="5" rx="2.5" fill="var(--on-mark)"/>
                  <rect x="13" y="31" width="21" height="5" rx="2.5" fill="var(--on-mark)"/>
                  <circle cx="37" cy="14.5" r="4.5" fill="var(--yellow)"/>
                </svg>
                <span className="word">evalen</span>
              </a>
              <p>Screening de CVs con IA para equipos que contratan en español. La IA lee cada currículum; tú decides a quién entrevistar.</p>
            </div>
            <div className="foot-col">
              <h4>Producto</h4>
              <a href="#como-funciona" onClick={(e) => { e.preventDefault(); scrollTo('como-funciona'); }}>Cómo funciona</a>
              <a href="#producto" onClick={(e) => { e.preventDefault(); scrollTo('producto'); }}>El ranking</a>
              <a href="#precios" onClick={(e) => { e.preventDefault(); scrollTo('precios'); }}>Planes y precios</a>
              <a href="#preguntas" onClick={(e) => { e.preventDefault(); scrollTo('preguntas'); }}>Preguntas</a>
            </div>
            <div className="foot-col">
              <h4>Cuenta</h4>
              <a href="/login?plan=free">Empezar gratis</a>
              <a href="/login?plan=pro">Probar EvalenPro</a>
              <a href="/login?plan=enterprise">Hablar con ventas</a>
            </div>
            <div className="foot-col">
              <h4>Legal</h4>
              <a href="#">Términos de uso</a>
              <a href="#">Privacidad</a>
              <a href="#">Tratamiento de datos</a>
            </div>
          </div>
          <div className="foot-bottom">
            <span>© {year} Evalen · Hecho con criterio para equipos que contratan.</span>
            <span className="tag">La IA lee. Los humanos deciden.</span>
          </div>
        </div>
      </footer>
      <div className={`sticky-cta${showSticky ? ' show' : ''}`} id="stickyCta">
        <a className="btn btn-ghost btn-sm" href="/login?plan=free">Ver planes</a>
        <a className="btn btn-primary btn-sm" href="/login?plan=free">Empezar gratis</a>
      </div>
    </>
  );
};

export default FooterSection;
```

- [ ] **Commit**

```bash
git add src/landing/components/FooterSection.tsx
git commit -m "feat: add FooterSection with sticky mobile CTA"
```

---

### Task 12: Cleanup — delete old components + build verification

**Files:**
- Delete: `src/landing/components/FeaturesSection.tsx`
- Delete: `src/landing/components/GallerySection.tsx`
- Delete: `src/landing/components/BackToTop.tsx`
- Delete: `src/landing/components/demo-data.ts`
- Delete: `src/landing/components/DemoInputPhase.tsx`
- Delete: `src/landing/components/DemoModal.tsx`
- Delete: `src/landing/components/DemoProcessingPhase.tsx`
- Delete: `src/landing/components/DemoResultsPhase.tsx`

- [ ] **Delete old component files**

```bash
Remove-Item -LiteralPath "src/landing/components/FeaturesSection.tsx" -Force
Remove-Item -LiteralPath "src/landing/components/GallerySection.tsx" -Force
Remove-Item -LiteralPath "src/landing/components/BackToTop.tsx" -Force
Remove-Item -LiteralPath "src/landing/components/demo-data.ts" -Force
Remove-Item -LiteralPath "src/landing/components/DemoInputPhase.tsx" -Force
Remove-Item -LiteralPath "src/landing/components/DemoModal.tsx" -Force
Remove-Item -LiteralPath "src/landing/components/DemoProcessingPhase.tsx" -Force
Remove-Item -LiteralPath "src/landing/components/DemoResultsPhase.tsx" -Force
```

- [ ] **Run build to verify no errors**

```bash
cd C:\Users\osiel\Desktop\Currify\currify-front
npm run build 2>&1 | Select-String -Pattern "error|Error|FAIL|Failed"
```

If no errors, the landing compiles correctly.

- [ ] **Commit**

```bash
git add -A
git commit -m "chore: delete old landing components"
```

---

### Self-Review Checklist

1. **Spec coverage:** Every section from `new-landing.html` is mapped to a component:
   - Topbar → Task 3 (LandingPage.tsx)
   - Nav → Task 4 (LandingNavbar)
   - Hero + Marquee → Task 5 (HeroSection)
   - Problem → Task 6 (ProblemSection)
   - How it works → Task 6 (HowItWorksSection)
   - Demo → Task 7 (DemoSection)
   - Benefits + Time band → Task 8 (BenefitsSection)
   - Testimonials → Task 8 (TestimonialsSection)
   - Pricing + Final CTA → Task 9 (PricingSection)
   - FAQ → Task 10 (FAQSection)
   - Footer + Sticky CTA → Task 11 (FooterSection)

2. **Placeholder scan:** no TBD, TODO, or incomplete code blocks in any task.

3. **Type consistency:** All component props/interfaces consistent. `useTheme()` returns same shape. Button hrefs use consistent `plan=` params.

4. **Button mapping verified:** All CTA buttons use correct `/login?plan=X` URLs matching the spec document.
