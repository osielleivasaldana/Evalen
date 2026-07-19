# Demo Cinematográfica Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite `DemoModal.tsx` as a 3-phase cinematic demo (input → processing → results).

**Architecture:** Single orchestrator `DemoModal.tsx` manages a `DemoPhase` state machine and renders one of three child phase components inside a shared backdrop. Data lives in a shared `SAMPLE` constant exported from a data file. Phase components are pure presentational.

**Tech Stack:** React, motion/react, @phosphor-icons/react, Tailwind CSS (no new deps).

---

## File Structure

```
src/landing/
├── components/
│   ├── DemoModal.tsx          ← orchestrator (phase machine, backdrop, close logic)
│   ├── DemoInputPhase.tsx     ← Fase 0: CV PDF render + campaign card + "Iniciar demo"
│   ├── DemoProcessingPhase.tsx ← Fase 1: scanline overlay + 5 progressive messages
│   └── DemoResultsPhase.tsx   ← Fase 2: scoring conic circle + breakdown + extraction
├── LandingPage.test.tsx       ← update tests
```

### Data flow

```
                    ┌──────────────────────┐
                    │     DemoModal.tsx      │
                    │  phase: DemoPhase      │
                    │  SAMPLE (imported)     │
                    └───┬───────┬──────┬────┘
                        │       │      │
                   ┌────┘  ┌────┘  ┌──┘
                   ▼       ▼       ▼
            InputPhase Processing ResultsPhase
                    Phase     Phase
               (all receive SAMPLE + callbacks)
```

---

### Task 1: Create data file with enhanced SAMPLE

**Files:**
- Create: `src/landing/components/demo-data.ts`

This extracts the SAMPLE data from DemoModal.tsx into its own file and adds `matchTooltip` to each breakdown item.

- [ ] **Step 1: Create demo-data.ts**

```ts
// src/landing/components/demo-data.ts

export interface BreakdownItem {
  dim: string;
  label: string;
  score: number;
  weight: string;
  matchTooltip: string;
}

export interface DemoFile {
  name: string;
  sizeLabel: string;
}

export interface DemoContacto {
  nombre_completo: string;
  email: string;
  telefono: string;
  ubicacion: string;
  linkedin: string;
  github: string;
}

export interface DemoExperiencia {
  cargo: string;
  empresa: string;
  ubicacion: string;
  periodo: string;
  responsabilidades: string[];
}

export interface DemoFormacion {
  titulo: string;
  institucion: string;
  periodo: string;
  detalle: string;
}

export interface DemoHabilidades {
  tecnicas: string[];
  blandas: string[];
  idiomas: { idioma: string; nivel: string }[];
}

export interface DemoCampaign {
  titulo: string;
  modalidad: string;
  experiencia_minima: string;
  habilidades_requeridas: string[];
  habilidades_deseables: string[];
  nivel_educacion: string;
  idiomas: string[];
}

export interface DemoScoring {
  overall_score: number;
  recommendation: string;
  recommendation_label: string;
  summary: string;
  breakdown: BreakdownItem[];
  strengths: string[];
  gaps: string[];
}

export interface DemoData {
  file: DemoFile;
  cvText: string;
  extraction: {
    contacto: DemoContacto;
    titular_profesional: { titular: string };
    resumen_profesional: { resumen: string };
    experiencia_laboral: DemoExperiencia[];
    formacion_academica: DemoFormacion[];
    habilidades: DemoHabilidades;
    certificaciones: { nombre: string; año: string }[];
    perfiles_online: string[];
    confianza_general: number;
    advertencias: string[];
  };
  campaign: DemoCampaign;
  scoring: DemoScoring;
}

export const SAMPLE: DemoData = {
  file: {
    name: 'cv-ana-maria-alarcon.pdf',
    sizeLabel: '312 KB',
  },
  cvText: `ANA MARÍA ALARCÓN VERGARA
Santiago, Chile | +56 9 8765 4321 | ana.alarcon@email.com
linkedin.com/in/anaalarcon | github.com/anaalarcon

BACKEND DEVELOPER
Backend Developer con 5 años de experiencia en Python, FastAPI y arquitecturas distribuidas.
Experiencia en empresas de alto volumen como PayPal LatAm y MercadoLibre Chile.
Enfocada en sistemas escalables, event-driven architecture y mentoring técnico.

EXPERIENCIA LABORAL

Senior Backend Developer
PayPal LatAm | Remoto
Marzo 2022 — Presente
• Diseñé la arquitectura event-driven del nuevo checkout usando Kafka y FastAPI, procesando 2M+ transacciones/día.
• Lideré la migración de un monolito Flask a microservicios, reduciendo latencia p95 de 800ms a 120ms.
• Mentoré a 3 desarrolladores junior en buenas prácticas Python.

Backend Developer
MercadoLibre Chile | Santiago
Enero 2020 — Febrero 2022
• Implementé 15+ endpoints REST con FastAPI y PostgreSQL sirviendo a la app móvil (4M MAU).
• Optimicé queries SQL reduciendo tiempo de respuesta en 60%.
• Diseñé el sistema de caché con Redis para catálogo de productos.

FORMACIÓN ACADÉMICA

Ingeniería Civil en Informática
Universidad de Chile | 2015 — 2019
Tesis: "Optimización de consultas en bases de datos distribuidas"

HABILIDADES TÉCNICAS
Python, FastAPI, PostgreSQL, Redis, Docker, Kafka, SQL, TypeScript, Node.js, AWS

IDIOMAS
Español (Nativo), Inglés (Avanzado C1), Portugués (Intermedio B1)

CERTIFICACIONES
AWS Certified Solutions Architect — Associate (2023)
Google Cloud Professional Cloud Developer (2022)`,
  extraction: {
    contacto: {
      nombre_completo: 'Ana María Alarcón Vergara',
      email: 'ana.alarcon@email.com',
      telefono: '+56 9 8765 4321',
      ubicacion: 'Santiago, Chile',
      linkedin: 'linkedin.com/in/anaalarcon',
      github: 'github.com/anaalarcon',
    },
    titular_profesional: { titular: 'Backend Developer' },
    resumen_profesional: {
      resumen: 'Backend Developer con 5 años de experiencia en Python, FastAPI y arquitecturas distribuidas. Experiencia en empresas de alto volumen como PayPal LatAm y MercadoLibre Chile. Enfocada en sistemas escalables, event-driven architecture y mentoring técnico.',
    },
    experiencia_laboral: [
      {
        cargo: 'Senior Backend Developer',
        empresa: 'PayPal LatAm',
        ubicacion: 'Remoto',
        periodo: 'Marzo 2022 — Presente',
        responsabilidades: [
          'Diseñé la arquitectura event-driven del nuevo checkout usando Kafka y FastAPI, procesando 2M+ transacciones/día.',
          'Lideré la migración de un monolito Flask a microservicios, reduciendo latencia p95 de 800ms a 120ms.',
          'Mentoré a 3 desarrolladores junior en buenas prácticas Python.',
        ],
      },
      {
        cargo: 'Backend Developer',
        empresa: 'MercadoLibre Chile',
        ubicacion: 'Santiago',
        periodo: 'Enero 2020 — Febrero 2022',
        responsabilidades: [
          'Implementé 15+ endpoints REST con FastAPI y PostgreSQL sirviendo a la app móvil (4M MAU).',
          'Optimicé queries SQL reduciendo tiempo de respuesta en 60%.',
          'Diseñé el sistema de caché con Redis para catálogo de productos.',
        ],
      },
    ],
    formacion_academica: [
      {
        titulo: 'Ingeniería Civil en Informática',
        institucion: 'Universidad de Chile',
        periodo: '2015 — 2019',
        detalle: 'Tesis: "Optimización de consultas en bases de datos distribuidas"',
      },
    ],
    habilidades: {
      tecnicas: ['Python', 'FastAPI', 'PostgreSQL', 'Redis', 'Docker', 'Kafka', 'SQL', 'TypeScript', 'Node.js', 'AWS'],
      blandas: ['Liderazgo técnico', 'Mentoring', 'Comunicación efectiva', 'Trabajo en equipo', 'Resolución de problemas'],
      idiomas: [
        { idioma: 'Español', nivel: 'nativo' },
        { idioma: 'Inglés', nivel: 'avanzado C1' },
        { idioma: 'Portugués', nivel: 'intermedio B1' },
      ],
    },
    certificaciones: [
      { nombre: 'AWS Certified Solutions Architect — Associate', año: '2023' },
      { nombre: 'Google Cloud Professional Cloud Developer', año: '2022' },
    ],
    perfiles_online: ['linkedin.com/in/anaalarcon', 'github.com/anaalarcon'],
    confianza_general: 0.94,
    advertencias: [],
  },
  campaign: {
    titulo: 'Senior Python Developer',
    modalidad: 'Remoto Global',
    experiencia_minima: '3 años',
    habilidades_requeridas: ['Python', 'FastAPI', 'PostgreSQL', 'Docker'],
    habilidades_deseables: ['Kafka', 'AWS', 'TypeScript'],
    nivel_educacion: 'Ingeniería o título técnico afín',
    idiomas: ['Español', 'Inglés'],
  },
  scoring: {
    overall_score: 96,
    recommendation: 'strong_fit',
    recommendation_label: 'Compatibilidad alta',
    summary: 'Candidata sólida con experiencia probada en el stack exacto del puesto. Supera los requisitos mínimos de experiencia y presenta certificaciones cloud relevantes.',
    breakdown: [
      { dim: 'skills', label: 'Skills técnicos', score: 98, weight: '30%', matchTooltip: 'Requerido: Python, FastAPI, PostgreSQL, Docker — Tiene: Python, FastAPI, PostgreSQL, Docker + TypeScript, Node.js, AWS' },
      { dim: 'experience', label: 'Experiencia', score: 95, weight: '25%', matchTooltip: 'Requerido: 3 años — Tiene: 5 años' },
      { dim: 'education', label: 'Educación', score: 88, weight: '15%', matchTooltip: 'Requerido: Ingeniería o título técnico — Tiene: Ingeniería Civil Informática (U. de Chile)' },
      { dim: 'cultural_fit', label: 'Fit cultural', score: 92, weight: '15%', matchTooltip: 'Requerido: Remoto Global — Tiene: experiencia remota en PayPal LatAm' },
      { dim: 'logistics', label: 'Logística', score: 100, weight: '10%', matchTooltip: 'Requerido: sin restricciones horarias — Tiene: huso horario GMT-3 compatible' },
      { dim: 'trajectory', label: 'Trayectoria', score: 90, weight: '5%', matchTooltip: 'Tiene: experiencia en startup (MercadoLibre Chile) + big tech (PayPal LatAm)' },
    ],
    strengths: [
      '5 años de experiencia con Python y FastAPI, supera el mínimo de 3 años.',
      'Experiencia directa con Kafka y arquitectura event-driven, alineada con el stack del puesto.',
      'Certificaciones AWS y GCP validan conocimiento en cloud.',
      'Inglés C1 cumple requisito de comunicación para modalidad remoto global.',
    ],
    gaps: [
      'No menciona experiencia explícita con CI/CD pipelines (se asume por AWS cert pero no está declarado).',
    ],
  },
};

export const REQUIRED_MATCH = new Set(SAMPLE.campaign.habilidades_requeridas);

export function isSkillMatch(skill: string): boolean {
  return REQUIRED_MATCH.has(skill);
}
```

- [ ] **Step 2: Verify build**

Run: `cd currify-front && npx tsc --noEmit src/landing/components/demo-data.ts 2>&1`
Expected: No output (types compile cleanly).

- [ ] **Step 3: Commit**

```bash
git add src/landing/components/demo-data.ts
git commit -m "feat: extract demo data to shared module with enhanced types"
```

---

### Task 2: Create DemoInputPhase (Fase 0)

**Files:**
- Create: `src/landing/components/DemoInputPhase.tsx`

Renders the two-column layout: CV as rendered PDF (left) + Campaign card (right) + "Iniciar demo" button.

- [ ] **Step 1: Write DemoInputPhase.tsx**

```tsx
import React, { useMemo } from 'react';
import { FileText, MapPin, Briefcase, Clock, GraduationCap, Globe } from '@phosphor-icons/react';
import { SAMPLE, isSkillMatch } from './demo-data';

interface DemoInputPhaseProps {
  onStart: () => void;
}

const DemoInputPhase: React.FC<DemoInputPhaseProps> = ({ onStart }) => {
  const { extraction: e, campaign: c } = SAMPLE;

  const campaignSkills = useMemo(() => {
    const req = new Set(c.habilidades_requeridas);
    const des = new Set(c.habilidades_deseables);
    return { req, des };
  }, [c]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 min-h-0">
        {/* ── Columna izquierda: CV renderizado como PDF ── */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          {/* Simula hoja de papel */}
          <div className="flex-1 overflow-y-auto p-6 font-serif text-slate-800 space-y-5">
            {/* Header */}
            <div className="text-center border-b border-slate-200 pb-4 mb-4">
              <h2 className="text-xl font-bold text-slate-900 uppercase tracking-wider">
                {e.contacto.nombre_completo}
              </h2>
              <p className="text-base font-semibold text-[#4f46e5] mt-1">
                {e.titular_profesional.titular}
              </p>
              <p className="text-xs text-slate-500 mt-2">
                {e.contacto.ubicacion} · {e.contacto.telefono} · {e.contacto.email}
              </p>
            </div>

            {/* Resumen */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Extracto Profesional</h3>
              <p className="text-sm leading-relaxed">{e.resumen_profesional.resumen}</p>
            </div>

            {/* Experiencia */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Experiencia Laboral</h3>
              {e.experiencia_laboral.map((exp, i) => (
                <div key={i} className="mb-3 last:mb-0">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-bold text-slate-900">{exp.cargo}</p>
                      <p className="text-xs text-slate-500">{exp.empresa} · {exp.ubicacion}</p>
                    </div>
                    <p className="text-[11px] text-slate-400 whitespace-nowrap ml-2">{exp.periodo}</p>
                  </div>
                  <ul className="mt-1 space-y-0.5">
                    {exp.responsabilidades.map((r, j) => (
                      <li key={j} className="text-xs text-slate-600 flex items-start gap-1.5">
                        <span className="text-slate-300 mt-0.5">•</span>
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Formación */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Formación</h3>
              {e.formacion_academica.map((f, i) => (
                <div key={i}>
                  <p className="text-sm font-bold text-slate-900">{f.titulo}</p>
                  <p className="text-xs text-slate-500">{f.institucion} · {f.periodo}</p>
                  {f.detalle && <p className="text-xs text-slate-500 italic">{f.detalle}</p>}
                </div>
              ))}
            </div>

            {/* Habilidades técnicas con badges de match */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Habilidades Técnicas</h3>
              <div className="flex flex-wrap gap-1.5">
                {e.habilidades.tecnicas.map((h, i) => (
                  <span
                    key={i}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${
                      isSkillMatch(h)
                        ? 'bg-green-100 text-green-800 ring-1 ring-green-300'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {h}
                    {isSkillMatch(h) && <span className="text-[10px] text-green-600 font-bold">✓</span>}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Columna derecha: Campaña ── */}
        <div className="flex flex-col gap-4">
          <div className="bg-gradient-to-br from-[#eef2ff] to-white dark:from-[#1e1b4b] dark:to-slate-900 rounded-xl border border-[#4f46e5]/20 dark:border-[#a5b4fc]/20 p-6 flex-1">
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-5 h-5 text-[#4f46e5]" weight="fill" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{c.titulo}</h3>
              <span className="ml-auto text-[10px] font-semibold text-[#4f46e5] bg-[#4f46e5]/10 px-2 py-0.5 rounded-full">Campaña</span>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <Briefcase className="w-4 h-4 text-[#4f46e5]" weight="duotone" />
                  <span>{c.modalidad}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <Clock className="w-4 h-4 text-[#4f46e5]" weight="duotone" />
                  <span>Mín. {c.experiencia_minima}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <GraduationCap className="w-4 h-4 text-[#4f46e5]" weight="duotone" />
                  <span className="truncate">{c.nivel_educacion}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <Globe className="w-4 h-4 text-[#4f46e5]" weight="duotone" />
                  <span>{c.idiomas.join(' · ')}</span>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">Requeridas</p>
                <div className="flex flex-wrap gap-1.5">
                  {c.habilidades_requeridas.map((h, i) => (
                    <span key={i} className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#4f46e5] text-white">
                      {h}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">Deseables</p>
                <div className="flex flex-wrap gap-1.5">
                  {c.habilidades_deseables.map((h, i) => (
                    <span key={i} className="px-2.5 py-1 rounded-lg text-xs font-semibold border border-[#9333ea] text-[#9333ea] dark:text-[#d8b4fe] dark:border-[#d8b4fe]">
                      {h}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* CTA */}
          <button
            type="button"
            onClick={onStart}
            className="group w-full inline-flex items-center justify-center gap-2 bg-[#4f46e5] text-white px-6 py-3 rounded-xl text-base font-bold transition-all duration-300 hover:bg-[#4338ca] hover:shadow-[0_0_30px_rgba(79,70,229,0.3)] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4f46e5]"
          >
            <Sparkle className="w-5 h-5" weight="fill" />
            Iniciar demo
          </button>
        </div>
      </div>
    </div>
  );
};

export default DemoInputPhase;
```

Note: Add `Sparkle` and `Target` icon imports at the top.

- [ ] **Step 2: Verify it compiles**

Run: `cd currify-front && npx tsc --noEmit src/landing/components/DemoInputPhase.tsx 2>&1`
Expected: clean compile (or no output).

- [ ] **Step 3: Commit**

```bash
git add src/landing/components/DemoInputPhase.tsx
git commit -m "feat: add demo input phase with PDF-style CV and campaign card"
```

---

### Task 3: Create DemoProcessingPhase (Fase 1)

**Files:**
- Create: `src/landing/components/DemoProcessingPhase.tsx`

Scanline overlay + 5 progressive messages with timed reveal (3s intervals, 15s total). Calls `onComplete` when done.

- [ ] **Step 1: Write DemoProcessingPhase.tsx**

```tsx
import React, { useEffect, useRef, useState } from 'react';
import { Check, Spinner } from '@phosphor-icons/react';

interface DemoProcessingPhaseProps {
  onComplete: () => void;
}

const MESSAGES = [
  { text: 'Conectando con el parser de Evalen...', key: 'connect' },
  { text: 'Extrayendo información personal...', key: 'personal' },
  { text: 'Extrayendo experiencia laboral...', key: 'experience' },
  { text: 'Extrayendo formación y habilidades...', key: 'skills' },
  { text: 'Comparando contra campaña...', key: 'campaign' },
  { text: 'Generando evaluación de compatibilidad...', key: 'scoring' },
];

const INTERVAL_MS = 3000;

const DemoProcessingPhase: React.FC<DemoProcessingPhaseProps> = ({ onComplete }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const scanRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeIndex >= MESSAGES.length) {
      onComplete();
      return;
    }
    const timer = setTimeout(() => setActiveIndex((i) => i + 1), INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [activeIndex, onComplete]);

  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#0f172a]/80 backdrop-blur-sm">
      {/* Scanline */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          ref={scanRef}
          className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#4f46e5]/60 to-transparent"
          style={{
            animation: 'scanline 3s linear infinite',
          }}
        />
      </div>

      {/* Messages */}
      <div className="relative z-10 space-y-4 text-center max-w-md">
        {MESSAGES.map((msg, i) => {
          const isActive = i === activeIndex;
          const isDone = i < activeIndex;
          return (
            <div
              key={msg.key}
              className={`flex items-center gap-3 transition-all duration-500 ${
                isActive
                  ? 'opacity-100 translate-y-0'
                  : isDone
                  ? 'opacity-40 translate-y-0'
                  : 'opacity-0 translate-y-4 hidden'
              }`}
            >
              <span className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">
                {isDone ? (
                  <Check className="w-5 h-5 text-[#22c55e]" weight="bold" />
                ) : (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                )}
              </span>
              <span
                className={`text-lg font-medium ${
                  isActive ? 'text-white' : isDone ? 'text-white/60' : 'text-white/20'
                }`}
              >
                {msg.text}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DemoProcessingPhase;
```

- [ ] **Step 2: Add scanline keyframe**

Add to `src/index.css`:

```css
@keyframes scanline {
  0%, 100% { top: 0; }
  50% { top: 100%; }
}
```

- [ ] **Step 3: Verify it compiles**

```bash
cd currify-front && npx tsc --noEmit src/landing/components/DemoProcessingPhase.tsx 2>&1
```

- [ ] **Step 4: Commit**

```bash
git add src/landing/components/DemoProcessingPhase.tsx src/index.css
git commit -m "feat: add demo processing phase with scanline and timed messages"
```

---

### Task 4: Create DemoResultsPhase (Fase 2)

**Files:**
- Create: `src/landing/components/DemoResultsPhase.tsx`

Two-column layout. Left (~1/3): scoring card with conic gradient circle, breakdown bars with tooltips, strengths, gaps. Right (~2/3): extraction display matching CandidateDetail.tsx patterns.

- [ ] **Step 1: Write DemoResultsPhase.tsx**

```tsx
import React, { useEffect, useState } from 'react';
import {
  CheckCircle,
  Warning,
  EnvelopeSimple,
  Phone,
  MapPin,
  LinkedinLogo,
  GithubLogo,
  Sparkle,
  User,
  Briefcase,
  GraduationCap,
  Code,
  Globe,
} from '@phosphor-icons/react';
import { SAMPLE, isSkillMatch } from './demo-data';
import { useReducedMotion } from 'motion/react';

const DemoResultsPhase: React.FC = () => {
  const { extraction: e, scoring: s, campaign: c } = SAMPLE;
  const prefersReduced = useReducedMotion();
  const [animated, setAnimated] = useState(prefersReduced);

  useEffect(() => {
    if (prefersReduced) {
      setAnimated(true);
      return;
    }
    const t = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(t);
  }, [prefersReduced]);

  const circleSize = 128;
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (circumference * s.overall_score) / 100;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
          {/* ── Left column: Scoring (1/3) ── */}
          <div className="lg:col-span-1 space-y-5">
            {/* Scoring card */}
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl overflow-hidden">
              <div className="bg-gradient-to-r from-[#ea580c] to-[#dc2626] px-6 py-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Sparkle className="h-6 w-6" weight="fill" />
                  Análisis de Compatibilidad
                </h2>
              </div>
              <div className="p-6 space-y-6">
                {/* Score circle */}
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-32 h-32 mb-4">
                    <svg width={circleSize} height={circleSize} className="-rotate-90">
                      <circle
                        cx={circleSize / 2}
                        cy={circleSize / 2}
                        r={radius}
                        fill="none"
                        stroke="#e5e7eb"
                        strokeWidth="8"
                      />
                      <circle
                        cx={circleSize / 2}
                        cy={circleSize / 2}
                        r={radius}
                        fill="none"
                        stroke={s.overall_score >= 90 ? '#10b981' : s.overall_score >= 70 ? '#f59e0b' : '#ef4444'}
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={animated ? offset : circumference}
                        style={{ transition: 'stroke-dashoffset 800ms cubic-bezier(0.32, 0.72, 0, 1)' }}
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center">
                      <span className={`text-4xl font-bold ${s.overall_score >= 90 ? 'text-green-700 dark:text-green-400' : s.overall_score >= 70 ? 'text-orange-700 dark:text-orange-400' : 'text-red-700 dark:text-red-400'}`}>
                        {s.overall_score}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">de 100</span>
                    </div>
                  </div>
                  <p className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">{s.recommendation_label}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed text-left">{s.summary}</p>
                </div>

                {/* Breakdown */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Desglose de Evaluación</h3>
                  {s.breakdown.map((b) => (
                    <div key={b.dim} className="space-y-1 group relative">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{b.label}</span>
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{b.score}/100</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-700 ease-out ${
                            b.score >= 90 ? 'bg-green-500' : b.score >= 70 ? 'bg-orange-500' : 'bg-red-500'
                          }`}
                          style={{ width: animated ? `${b.score}%` : '0%', transitionDelay: '200ms' }}
                        />
                      </div>
                      {/* Tooltip */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-1 left-0 -translate-y-full bg-slate-900 dark:bg-slate-700 text-white text-[11px] px-3 py-1.5 rounded-lg shadow-lg whitespace-nowrap z-10 pointer-events-none">
                        {b.matchTooltip}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Strengths */}
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" weight="fill" />
                    Fortalezas
                  </h3>
                  <ul className="space-y-2">
                    {s.strengths.map((st, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
                        <span>{st}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Gaps */}
                {s.gaps.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                      <Warning className="w-5 h-5 text-orange-600" weight="fill" />
                      Áreas de Mejora
                    </h3>
                    <ul className="space-y-2">
                      {s.gaps.map((g, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                          <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1.5 flex-shrink-0" />
                          <span>{g}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Right column: Extraction (2/3) ── */}
          <div className="lg:col-span-2 space-y-5">
            {/* Contacto */}
            <InfoCard title="Contacto" gradient="from-[#4f46e5] to-[#6366f1]" icon={<User className="w-5 h-5" />}>
              <div className="grid grid-cols-2 gap-3">
                <InfoItem icon={<User className="w-4 h-4" />} label="Nombre" value={e.contacto.nombre_completo} />
                <InfoItem icon={<EnvelopeSimple className="w-4 h-4" />} label="Email" value={e.contacto.email} />
                <InfoItem icon={<Phone className="w-4 h-4" />} label="Teléfono" value={e.contacto.telefono} />
                <InfoItem icon={<MapPin className="w-4 h-4" />} label="Ubicación" value={e.contacto.ubicacion} />
                <InfoItem icon={<LinkedinLogo className="w-4 h-4" />} label="LinkedIn" value={e.contacto.linkedin} />
                <InfoItem icon={<GithubLogo className="w-4 h-4" />} label="GitHub" value={e.contacto.github} />
              </div>
            </InfoCard>

            {/* Resumen */}
            <InfoCard title="Resumen Profesional" gradient="from-[#2563eb] to-[#3b82f6]" icon={<Sparkle className="w-5 h-5" />}>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{e.resumen_profesional.resumen}</p>
            </InfoCard>

            {/* Experiencia */}
            <InfoCard title="Experiencia Laboral" gradient="from-[#0891b2] to-[#06b6d4]" icon={<Briefcase className="w-5 h-5" />}>
              <div className="space-y-4">
                {e.experiencia_laboral.map((exp, i) => (
                  <div key={i} className="border-l-2 border-[#0891b2]/30 pl-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{exp.cargo}</p>
                        <p className="text-xs text-slate-500">{exp.empresa} · {exp.ubicacion}</p>
                      </div>
                      <p className="text-[11px] text-slate-400 whitespace-nowrap">{exp.periodo}</p>
                    </div>
                    <ul className="mt-1 space-y-0.5">
                      {exp.responsabilidades.map((r, j) => (
                        <li key={j} className="text-xs text-slate-600 dark:text-slate-400 flex gap-1.5">
                          <span className="text-slate-300 mt-1">•</span>
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </InfoCard>

            {/* Habilidades */}
            <InfoCard title="Habilidades" gradient="from-[#d97706] to-[#f59e0b]" icon={<Code className="w-5 h-5" />}>
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Técnicas</p>
                  <div className="flex flex-wrap gap-1.5">
                    {e.habilidades.tecnicas.map((h, i) => (
                      <span
                        key={i}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium ${
                          isSkillMatch(h)
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 ring-1 ring-green-300 dark:ring-green-700'
                            : 'bg-[#eef2ff] text-[#4f46e5] dark:bg-[#4f46e5]/20 dark:text-[#a5b4fc]'
                        }`}
                      >
                        {h}
                        {isSkillMatch(h) && <span className="text-[10px] text-green-600 dark:text-green-400 font-bold">✓ Match</span>}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Blandas</p>
                  <div className="flex flex-wrap gap-1.5">
                    {e.habilidades.blandas.map((h, i) => (
                      <span key={i} className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {h}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </InfoCard>

            {/* Idiomas */}
            <InfoCard title="Idiomas" gradient="from-[#9333ea] to-[#a855f7]" icon={<Globe className="w-5 h-5" />}>
              <div className="flex flex-wrap gap-2">
                {e.habilidades.idiomas.map((idioma, i) => (
                  <div key={i} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 rounded-lg px-3 py-2">
                    <Globe className="w-4 h-4 text-[#9333ea]" weight="duotone" />
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{idioma.idioma}</p>
                      <p className="text-[11px] text-slate-500">{idioma.nivel}</p>
                    </div>
                  </div>
                ))}
              </div>
            </InfoCard>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Sub-components ──

interface InfoCardProps {
  title: string;
  gradient: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

const InfoCard: React.FC<InfoCardProps> = ({ title, gradient, icon, children }) => (
  <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl overflow-hidden">
    <div className={`bg-gradient-to-r ${gradient} px-6 py-3`}>
      <h3 className="text-base font-bold text-white flex items-center gap-2">{icon} {title}</h3>
    </div>
    <div className="p-5">{children}</div>
  </div>
);

interface InfoItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

const InfoItem: React.FC<InfoItemProps> = ({ icon, label, value }) => (
  <div className="flex items-center gap-2.5">
    <span className="text-[#4f46e5] dark:text-[#a5b4fc] flex-shrink-0">{icon}</span>
    <div className="min-w-0">
      <p className="text-[11px] text-slate-500 dark:text-slate-400">{label}</p>
      <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{value}</p>
    </div>
  </div>
);

export default DemoResultsPhase;
```

**Important:** The SVG score circle needs to be wrapped in a `relative` div so the absolute-positioned text overlays correctly. Let me fix — the outer `div.inline-flex` needs `relative`:

In the code above, change:
```tsx
<div className="inline-flex items-center justify-center w-32 h-32 mb-4">
```
to:
```tsx
<div className="inline-flex items-center justify-center w-32 h-32 mb-4 relative">
```

- [ ] **Step 2: Verify compilation**

```bash
cd currify-front && npx tsc --noEmit src/landing/components/DemoResultsPhase.tsx 2>&1
```

- [ ] **Step 3: Commit**

```bash
git add src/landing/components/DemoResultsPhase.tsx
git commit -m "feat: add demo results phase with scoring and extraction"
```

---

### Task 5: Rewrite DemoModal orchestrator

**Files:**
- Modify: `src/landing/components/DemoModal.tsx` (rewrite)
- Modify: `src/landing/components/HeroSection.tsx` (add `Sparkle` icon to imports if not already there)

- [ ] **Step 1: Rewrite DemoModal.tsx**

Replace the entire file. The new orchestrator manages `phase` state, renders the shared backdrop/modal shell, and switches between the three phase components.

```tsx
import React, { useCallback, useEffect, useState } from 'react';
import { X } from '@phosphor-icons/react';
import { AnimatePresence, motion } from 'motion/react';
import DemoInputPhase from './DemoInputPhase';
import DemoProcessingPhase from './DemoProcessingPhase';
import DemoResultsPhase from './DemoResultsPhase';

type DemoPhase = 'input' | 'processing' | 'results';

interface DemoModalProps {
  open: boolean;
  onClose: () => void;
}

const DemoModal: React.FC<DemoModalProps> = ({ open, onClose }) => {
  const [phase, setPhase] = useState<DemoPhase>('input');

  // Reset phase on open
  useEffect(() => {
    if (open) setPhase('input');
  }, [open]);

  // Close on Escape
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, handleKeyDown]);

  // Lock body scroll
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Modal panel */}
          <motion.div
            className="relative w-full max-w-[1400px] h-[90vh] max-h-[900px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
            role="dialog"
            aria-modal="true"
            aria-label="Demostración de Evalen"
          >
            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 z-30 w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4f46e5]"
              aria-label="Cerrar demo"
            >
              <X className="w-5 h-5 text-slate-600 dark:text-slate-300" weight="bold" />
            </button>

            {/* Phase renderer */}
            <div className="flex-1 relative min-h-0">
              <AnimatePresence mode="wait">
                {phase === 'input' && (
                  <motion.div
                    key="input"
                    className="absolute inset-0"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <DemoInputPhase onStart={() => setPhase('processing')} />
                  </motion.div>
                )}
                {phase === 'processing' && (
                  <motion.div
                    key="processing"
                    className="absolute inset-0"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <DemoProcessingPhase onComplete={() => setPhase('results')} />
                  </motion.div>
                )}
                {phase === 'results' && (
                  <motion.div
                    key="results"
                    className="absolute inset-0"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <DemoResultsPhase />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default DemoModal;
```

- [ ] **Step 2: Verify the orchestrator compiles**

```bash
cd currify-front && npx tsc --noEmit src/landing/components/DemoModal.tsx 2>&1
```

- [ ] **Step 3: Commit**

```bash
git add src/landing/components/DemoModal.tsx
git commit -m "feat: rewrite DemoModal as 3-phase orchestrator"
```

---

### Task 6: Update LandingPage tests

**Files:**
- Modify: `src/landing/LandingPage.test.tsx`

- [ ] **Step 1: Update LandingPage.test.tsx**

Remove old tests that reference the 4-step static flow. Add new tests:

```tsx
import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import LandingPage from './LandingPage';

// ── Mocks ──
jest.mock('../services/api', () => ({
  apiService: { isAuthenticated: jest.fn().mockResolvedValue(false) },
}));
jest.mock('../contexts/ThemeContext', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useTheme: () => ({ theme: 'light', toggleTheme: jest.fn() }),
}));
jest.mock('./hooks/useCarousel', () => ({
  __esModule: true,
  default: () => ({ currentSlide: 0, goToSlide: jest.fn(), totalSlides: 3 }),
}));

beforeAll(() => {
  global.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as any;
});

describe('LandingPage', () => {
  it('renders without crashing', () => {
    render(<LandingPage />);
    expect(screen.getAllByText(/Evalen/i).length).toBeGreaterThan(0);
  });

  it('renders the navbar with Evalen branding', () => {
    render(<LandingPage />);
    expect(screen.getByText('Evalen')).toBeInTheDocument();
  });

  describe('Hero demo', () => {
    it('renders the hero with the main heading', () => {
      render(<LandingPage />);
      expect(screen.getByText(/Reclutamiento inteligente/i)).toBeInTheDocument();
    });

    it('renders the demo CTA button and preview card', () => {
      render(<LandingPage />);
      expect(screen.getByRole('button', { name: /Ver demo en vivo/i })).toBeInTheDocument();
      expect(screen.getByText(/Ver el flujo completo/i)).toBeInTheDocument();
    });

    it('opens the DemoModal when the CTA button is clicked', () => {
      render(<LandingPage />);
      const cta = screen.getByRole('button', { name: /Ver demo en vivo/i });
      fireEvent.click(cta);
      expect(screen.getByRole('dialog', { name: /Demostración de Evalen/i })).toBeInTheDocument();
    });

    it('shows the input phase with CV and campaign data', () => {
      render(<LandingPage />);
      fireEvent.click(screen.getByRole('button', { name: /Ver demo en vivo/i }));
      expect(screen.getByText(/Ana María Alarcón/i)).toBeInTheDocument();
      expect(screen.getByText(/Senior Python Developer/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Iniciar demo/i })).toBeInTheDocument();
    });

    it('starts processing phase on "Iniciar demo" click', () => {
      render(<LandingPage />);
      fireEvent.click(screen.getByRole('button', { name: /Ver demo en vivo/i }));
      fireEvent.click(screen.getByRole('button', { name: /Iniciar demo/i }));
      expect(screen.getByText(/Conectando con el parser/i)).toBeInTheDocument();
    });

    it('closes the modal on backdrop click', () => {
      render(<LandingPage />);
      fireEvent.click(screen.getByRole('button', { name: /Ver demo en vivo/i }));
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      // Click the backdrop (the outer overlay div)
      const dialog = screen.getByRole('dialog');
      const backdrop = dialog.parentElement!.querySelector('[aria-hidden="true"]');
      if (backdrop) fireEvent.click(backdrop);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('renders the features section', () => {
    render(<LandingPage />);
    expect(screen.getByText(/Tu flujo de trabajo/i)).toBeInTheDocument();
  });

  it('renders the pricing section', () => {
    render(<LandingPage />);
    expect(screen.getByText(/Planes para cada/i)).toBeInTheDocument();
  });

  it('renders the "Cómo funciona" walkthrough', () => {
    render(<LandingPage />);
    expect(screen.getByText('01')).toBeInTheDocument();
    expect(screen.getByText('02')).toBeInTheDocument();
    expect(screen.getByText('03')).toBeInTheDocument();
  });

  it('surfaces the "Sin sesgos" claim', () => {
    render(<LandingPage />);
    expect(screen.getByText(/Sin sesgos de género ni edad/i)).toBeInTheDocument();
  });

  it('renders the footer with copyright', () => {
    render(<LandingPage />);
    expect(screen.getByText(/Todos los derechos reservados/i)).toBeInTheDocument();
  });

  it('does not ship fake "TrustedBy" company logos', () => {
    render(<LandingPage />);
    expect(screen.queryByText(/Empresas que confían/i)).not.toBeInTheDocument();
  });

  it('does not ship fabricated metrics', () => {
    render(<LandingPage />);
    expect(screen.queryByText(/10\.000/i)).not.toBeInTheDocument();
  });

  it('does not show the "Smart Match Engine V2" dev-jargon eyebrow', () => {
    render(<LandingPage />);
    expect(screen.queryByText(/Smart Match Engine/i)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run new tests**

```bash
cd currify-front && npx react-scripts test src/landing --watchAll=false --forceExit 2>&1
```

Expected: 16+ tests pass (new tests added).

- [ ] **Step 3: If tests fail, fix issues. If tests pass, commit.**

```bash
git add src/landing/LandingPage.test.tsx
git commit -m "test: update landing tests for cinematic demo flow"
```

---

### Task 7: Full integration check

**Files:** Check all modified files compile and tests pass together.

- [ ] **Step 1: Full type check**

```bash
cd currify-front && npx tsc --noEmit 2>&1
```
Expect: 0 errors.

- [ ] **Step 2: Full test run**

```bash
cd currify-front && npx react-scripts test src/landing --watchAll=false --forceExit 2>&1
```
Expect: All tests pass.

- [ ] **Step 3: Cleanup old imports**

Check that `src/landing/components/HeroSection.tsx` doesn't import anything from the old `demo-data`-like patterns (it shouldn't — it only uses `SAMPLE_FILE` local constant and renders `DemoModal`).

- [ ] **Step 4: Commit final cleanup**

```bash
git add -A
git commit -m "chore: finalize cinematic demo integration"
```
