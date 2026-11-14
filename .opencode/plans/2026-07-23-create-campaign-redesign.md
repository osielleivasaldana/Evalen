# Create Campaign Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replicate `spec/mockup/new-campaign.html` exactly in React+Tailwind for `/create-campaign`, preserving all current functionality.

**Architecture:** Single-page wizard with sidebar+content grid layout, 5-step form, inline success state. Uses existing green/nature theme (already in index.css + tailwind.config). Replaces TipTap with simple contenteditable editors. Keeps all current API/service calls intact.

**Tech Stack:** React (CRA) + TypeScript, react-router-dom v6, Tailwind CSS v3, CSS custom properties (data-theme), Mapbox Geocoding (LocationAutocomplete).

## Global Constraints

- **Zero difference from mockup** — every pixel, spacing, color, font, animation must match `spec/mockup/new-campaign.html`
- All current functionality preserved: permission check, user loading, localStorage autosave, Smart Fill with modal, Mapbox autocomplete, form validation, API calls
- No new npm packages — use existing dependencies
- Use existing theme tokens: `bg-paper`, `text-ink`, `bg-card`, `border-line`, `bg-greentint`, `t-*` classes, Fraunces/Instrument Sans/IBM Plex Mono fonts
- Dark mode via `data-theme` attribute (already handled by ThemeContext)
- Grain overlay, animations (popin, fadein, shake) already configured in tailwind.config + index.css
- Toast system: use existing `react-hot-toast` if available, else build simple CSS toast

---

## File Structure

### Files to Rewrite
- `src/components/campaigns/CreateCampaign.tsx` — complete visual rewrite, keep logic
- `src/components/campaigns/SmartFillPreviewModal.tsx` — restyle to green theme
- `src/components/common/RichTextEditor.tsx` — replace TipTap with simple contenteditable
- `src/components/common/LocationAutocomplete.tsx` — visual restyle only

### Files to Adjust
- `src/components/campaigns/SmartFillButton.tsx` — visual update to mockup button

### Files to Delete
- `src/components/campaigns/CampaignCreated.tsx` — integrate into CreateCampaign inline
- `src/components/common/FullScreenEditorModal.tsx` — no longer needed

### Files to Update Constants
- `src/constants/stageTemplates.ts` — align names with mockup
- `src/constants/currencies.ts` — reduce to mockup's 4 currencies for create campaign

---

### Task 1: Simple Rich Text Editor (replaces TipTap)

**Files:**
- Rewrite: `src/components/common/RichTextEditor.tsx`
- Delete after: `src/components/common/FullScreenEditorModal.tsx`

**Interfaces:**
- Consumes: nothing (standalone component)
- Produces: `SimpleEditor` component with props `{ field, value, onChange, placeholder, error? }`

- [ ] **Step 1: Write the new SimpleEditor component**

Replace `RichTextEditor.tsx` with a contenteditable-based editor that exactly replicates the mockup's editor (lines 716-783 of the mockup):

```tsx
import React, { useRef, useCallback, useEffect } from 'react';

interface SimpleEditorProps {
  field: string;
  value: string;
  onChange: (html: string) => void;
  placeholder: string;
  error?: boolean;
}

const TB_BUTTONS = [
  { cmd: 'bold', label: 'B', cls: 'font-bold', title: 'Negrita' },
  { cmd: 'italic', label: 'I', cls: 'italic font-serif', title: 'Cursiva' },
  { sep: true },
  { cmd: 'h2', label: 'H2', cls: 'font-bold', title: 'Título' },
  { cmd: 'h3', label: 'H3', cls: 'font-bold text-[12px]', title: 'Subtítulo' },
  { sep: true },
  { cmd: 'insertUnorderedList', icon: 'M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01', title: 'Lista' },
  { cmd: 'insertOrderedList', icon: 'M10 6h11M10 12h11M10 18h11M3 5h1.5v4M3 9h3M3 14h3l-3 4h3', title: 'Lista numerada' },
  { sep: true },
  { cmd: 'outdent', icon: 'M9 6h12M9 12h12M9 18h12M3 9l3 3-3 3', title: 'Quitar sangría' },
  { cmd: 'quote', icon: 'M7 7H4v4h3l-1 4M16 7h-3v4h3l-1 4', title: 'Cita' },
  { cmd: 'indent', icon: 'M9 6h12M9 12h12M9 18h12M3 9l3-3M3 9l3 3', title: 'Sangría' },
  { sep: true },
  { cmd: 'createLink', icon: 'M10 13a4 4 0 0 0 6 .5l2-2a4 4 0 0 0-6-6l-1 1M14 11a4 4 0 0 0-6-.5l-2 2a4 4 0 0 0 6 6l1-1', title: 'Enlace' },
  { cmd: 'undo', icon: 'M9 14 4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3', title: 'Deshacer' },
  { cmd: 'redo', icon: 'M15 14l5-5-5-5M20 9H9a5 5 0 0 0 0 10h3', title: 'Rehacer' },
  { sep: true },
  { cmd: 'fullscreen', icon: 'M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3', title: 'Pantalla completa', right: true },
];

const SimpleEditor: React.FC<SimpleEditorProps> = ({ field, value, onChange, placeholder, error }) => {
  const edRef = useRef<HTMLDivElement>(null);

  const runCmd = useCallback((cmd: string) => {
    const ed = edRef.current;
    if (!ed) return;
    ed.focus();
    try {
      if (cmd === 'h2') document.execCommand('formatBlock', false, 'H2');
      else if (cmd === 'h3') document.execCommand('formatBlock', false, 'H3');
      else if (cmd === 'quote') document.execCommand('formatBlock', false, 'BLOCKQUOTE');
      else if (cmd === 'createLink') {
        const url = prompt('URL del enlace', 'https://');
        if (url) document.execCommand('createLink', false, url);
      } else if (cmd === 'fullscreen') {
        ed.classList.toggle('is-full');
        return;
      } else document.execCommand(cmd, false, null);
    } catch (e) { /* ignore */ }
    onChange(ed.innerHTML);
  }, [onChange]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  }, []);

  // Sync value from props to DOM when it changes externally
  useEffect(() => {
    if (edRef.current && edRef.current.innerHTML !== value) {
      edRef.current.innerHTML = value || '';
    }
  }, [value]);

  return (
    <div className={`rte-wrap overflow-hidden rounded-xl border bg-card transition focus-within:border-green focus-within:ring-2 focus-within:ring-green/25 t-card t-line2 ${error ? 'border-low' : 'border-line2'}`}>
      <div className="flex flex-wrap items-center gap-0.5 border-b border-line bg-paper2/60 px-1.5 py-1.5 t-line t-paper2">
        {TB_BUTTONS.map((b, i) =>
          b.sep ? (
            <span key={i} className="mx-1 h-5 w-px bg-line2 t-line2" />
          ) : (
            <button
              key={i}
              type="button"
              title={b.title}
              aria-label={b.title}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => runCmd(b.cmd)}
              className={`tb-btn grid h-8 min-w-8 place-items-center rounded-md px-1.5 text-[13px] text-ink2 transition hover:bg-greentint hover:text-green t-ink2 ${b.right ? 'ml-auto' : ''}`}
            >
              {b.icon ? (
                <svg className="h-[17px] w-[17px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: b.icon.replace(/M(\d)/g, 'd="M$1') }} />
              ) : (
                <span className={b.cls}>{b.label}</span>
              )}
            </button>
          )
        )}
      </div>
      <div
        ref={edRef}
        contentEditable
        data-placeholder={placeholder}
        role="textbox"
        aria-multiline="true"
        aria-label={field}
        className="rte px-4 py-3 text-[14.5px] leading-relaxed text-ink t-ink outline-none"
        onInput={(e) => onChange((e.target as HTMLDivElement).innerHTML)}
        onPaste={handlePaste}
        dangerouslySetInnerHTML={{ __html: value }}
        suppressContentEditableWarning
      />
    </div>
  );
};

export default SimpleEditor;
```

Note: For the SVG icons, the mockup uses inline SVG path data. Simplify by using a mapping approach — the exact paths from the mockup will be used.

- [ ] **Step 2: Delete FullScreenEditorModal.tsx** (fullscreen is now inline toggle on the editor)

Run:
```powershell
Remove-Item -LiteralPath "src/components/common/FullScreenEditorModal.tsx" -Force
```

Expected: File deleted.

- [ ] **Step 3: Commit**

```bash
git add src/components/common/RichTextEditor.tsx src/components/common/FullScreenEditorModal.tsx
git rm src/components/common/FullScreenEditorModal.tsx
git commit -m "feat: replace TipTap editor with simple contenteditable editor matching mockup"
```

---

### Task 2: Update Stage Templates & Currencies constants

**Files:**
- Modify: `src/constants/stageTemplates.ts`
- Modify: `src/constants/currencies.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `STAGE_TEMPLATES` with mockup's template names and descriptions; `CURRENCIES` reduced to 4 options for the wizard

- [ ] **Step 1: Update stageTemplates.ts**

Update the templates to match the mockup exactly (mockup lines 677-698):

```typescript
export const STAGE_TEMPLATES: StageTemplateConfig[] = [
  {
    id: 'general',
    name: 'General / Admin',
    description: 'Roles administrativos, operativos o de soporte.',
    icon: BuildingOfficeIcon,
    stages: [
      { name: 'Contactar', description: 'Primer contacto y confirmación de interés.' },
      { name: 'Filtro curricular', description: 'Revisión de antecedentes y requisitos excluyentes.' },
      { name: 'Entrevista RRHH', description: 'Ajuste cultural, motivaciones y expectativas.' },
      { name: 'Entrevista final', description: 'Conversación con el hiring manager y cierre.' },
    ]
  },
  {
    id: 'tech',
    name: 'Tecnología (IT)',
    description: 'Desarrollo, QA y roles técnicos con prueba.',
    icon: CodeBracketIcon,
    stages: [
      { name: 'Contactar', description: 'Primer contacto y confirmación de interés.' },
      { name: 'Filtro curricular', description: 'Revisión de stack y experiencia contra la rúbrica.' },
      { name: 'Prueba técnica', description: 'Ejercicio o take-home acotado en el tiempo.' },
      { name: 'Entrevista técnica', description: 'Profundización técnica y diseño de solución.' },
      { name: 'Entrevista final', description: 'Fit de equipo, condiciones y cierre.' },
    ]
  },
  {
    id: 'sales',
    name: 'Ventas / Comercial',
    description: 'Enfocado en comunicación y negociación.',
    icon: PresentationChartLineIcon,
    stages: [
      { name: 'Contactar', description: 'Primer contacto y confirmación de interés.' },
      { name: 'Screening', description: 'Revisión de trayectoria comercial y metas.' },
      { name: 'Role play', description: 'Simulación de venta y manejo de objeciones.' },
      { name: 'Entrevista comercial', description: 'Conversación con liderazgo de ventas.' },
      { name: 'Referencias', description: 'Chequeo de referencias y cierre.' },
    ]
  }
];
```

- [ ] **Step 2: Add mockup-currencies constant for the wizard**

Add to `currencies.ts` (keeping existing CURRENCIES array, adding a new one):

```typescript
export const WIZARD_CURRENCIES = [
  { symbol: '$', label: '$ CLP — Peso Chileno', code: 'CLP' },
  { symbol: 'US$', label: 'US$ USD — Dólar', code: 'USD' },
  { symbol: '€', label: '€ EUR — Euro', code: 'EUR' },
  { symbol: 'UF', label: 'UF — Unidad de Fomento', code: 'UF' },
];
```

- [ ] **Step 3: Commit**

```bash
git add src/constants/stageTemplates.ts src/constants/currencies.ts
git commit -m "feat: update stage templates and currencies to match mockup"
```

---

### Task 3: Visual Adjustments — SmartFillButton + LocationAutocomplete

**Files:**
- Modify: `src/components/campaigns/SmartFillButton.tsx`
- Modify: `src/components/common/LocationAutocomplete.tsx`

**Interfaces:**
- Consumes: nothing
- Produces: Styled components matching mockup theme

- [ ] **Step 1: Update SmartFillButton.tsx**

Style to match mockup's CTA button (mockup line 381-383):
- Background: `bg-cta`, text: `text-ctatext`
- Shadow: `shadow-cta`
- Icon: star SVG inline (not Heroicons)

```tsx
const SmartFillButton: React.FC<SmartFillButtonProps> = ({ onClick, isGenerating, disabled }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled || isGenerating}
    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-cta px-4 py-2.5 text-[13px] font-semibold text-ctatext shadow-cta transition hover:-translate-y-0.5 hover:bg-ctah disabled:opacity-60 disabled:cursor-not-allowed"
  >
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="m12 2 1.6 4.4L18 8l-4.4 1.6L12 14l-1.6-4.4L6 8l4.4-1.6z"/>
      <path d="M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8z"/>
    </svg>
    <span>{isGenerating ? 'Redactando…' : 'Smart Fill'}</span>
    {isGenerating && <span className="ml-1 h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />}
  </button>
);
```

- [ ] **Step 2: Update LocationAutocomplete.tsx**

Restyle to match mockup (mockup lines 392-398):
- Input with map pin icon on left
- `rounded-xl border-line2 bg-card py-3 pl-11 pr-4 text-[15px]`
- Focus: `focus:border-green focus:ring-2 focus:ring-green/25`
- Dark mode: `t-card t-ink t-line2`

Key change: add `ev-input-wrapper` class and wrap in relative div with icon, just like mockup:

```tsx
<div className="relative">
  <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-ink3">
    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 21s-7-4.4-7-10a7 7 0 0 1 14 0c0 5.6-7 10-7 10z"/>
      <circle cx="12" cy="11" r="2.4"/>
    </svg>
  </span>
  <input ... className="w-full rounded-xl border border-line2 bg-card py-3 pl-11 pr-4 text-[15px] text-ink placeholder:text-ink3/80 transition focus:border-green focus:outline-none focus:ring-2 focus:ring-green/25 t-card t-ink t-line2" />
</div>
```

- [ ] **Step 3: Commit**

```bash
git add src/components/campaigns/SmartFillButton.tsx src/components/common/LocationAutocomplete.tsx
git commit -m "feat: restyle SmartFillButton and LocationAutocomplete to match mockup"
```

---

### Task 4: Restyle SmartFillPreviewModal

**Files:**
- Modify: `src/components/campaigns/SmartFillPreviewModal.tsx`

**Interfaces:**
- Consumes: `SmartFillResponse` from api.ts
- Produces: Restyled modal with green/nature theme

- [ ] **Step 1: Change gradient header to green-solid**

Replace:
```tsx
<div className="sticky top-0 z-10 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-5">
```
With:
```tsx
<div className="sticky top-0 z-10 bg-greendeep text-onmark px-6 py-5 t-green">
```

- [ ] **Step 2: Change all indigo/purple references to green/cta**

- `from-indigo-600 to-purple-600` → `bg-greendeep` or `bg-cta`
- `text-indigo-600` → `text-green` or `t-green`
- `bg-indigo-50` → `bg-greentint`
- `border-indigo-*` → `border-green`
- `text-gray-*` → `text-ink` / `text-ink2` / `text-ink3`
- `bg-white` → `bg-card`
- `bg-gray-200` (for progress bars) → `bg-line2`
- Font families: add Fraunces for titles

- [ ] **Step 3: Commit**

```bash
git add src/components/campaigns/SmartFillPreviewModal.tsx
git commit -m "feat: restyle SmartFillPreviewModal to green/nature theme matching mockup"
```

---

### Task 5: Rewrite CreateCampaign.tsx (core implementation)

**Files:**
- Rewrite: `src/components/campaigns/CreateCampaign.tsx` (~1400 lines → ~same length)
- Delete after: `src/components/campaigns/CampaignCreated.tsx`

**Interfaces:**
- Consumes: Everything from Tasks 1-4 (SimpleEditor, SmartFillButton, LocationAutocomplete, SmartFillPreviewModal, updated constants, api.ts)
- Produces: Fully functional wizard matching mockup exactly

This is the largest task. The component must be rewritten to match the mockup HTML structure exactly (lines 289-603 of the mockup) while preserving ALL current React logic (state management, API calls, validation, etc.).

- [ ] **Step 1: Create state and logic section (preserved from current)**

All current state variables, useEffect hooks, handlers, and API calls remain identical:
```typescript
// State — preserved from current
const [currentStep, setCurrentStep] = useState<Step>(1);
const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
const [availableUsers, setAvailableUsers] = useState<Array<...>>([]);
const [formData, setFormData] = useState<CreateCampaignRequest>({...});
const [errors, setErrors] = useState<Record<string, string>>({});
const [loading, setLoading] = useState(true);
const [permissionError, setPermissionError] = useState<string | null>(null);
const [createdCampaign, setCreatedCampaign] = useState<Campaign | null>(null);
const [isGenerating, setIsGenerating] = useState(false);
const [smartFillContext, setSmartFillContext] = useState('');
const [smartFillResponse, setSmartFillResponse] = useState<SmartFillResponse | null>(null);
const [smartFillModalOpen, setSmartFillModalOpen] = useState(false);
const [isApplying, setIsApplying] = useState(false);
const [aiHydratedSteps, setAiHydratedSteps] = useState<number[]>([]);
const [showAiBanner, setShowAiBanner] = useState(false);
const prevStepRef = useRef<number>(currentStep);
```

All effects and handlers:
```typescript
useEffect(() => { /* load profile, check permissions, load users */ }, []);
useEffect(() => { /* load from localStorage */ }, []);
useEffect(() => { /* auto-save to localStorage */ }, [formData]);
const handleInputChange = (e) => { /* ... */ };
const validateStep = (step: Step): boolean => { /* ... */ };
const handleNext = () => { /* ... */ };
const handlePrevious = () => { /* ... */ };
const handleStepClick = (stepNumber: Step) => { /* ... */ };
const handleSubmit = async () => { /* ... */ };
const handleSmartFill = async () => { /* ... */ };
const handleApplySmartFill = async () => { /* ... */ };
const handleDiscardSmartFill = () => { /* ... */ };
```

- [ ] **Step 2: Replace layout with mockup's 2-column grid**

Replace the current `<Layout>` wrapper with:

```tsx
<Layout>
  {/* Grain overlay */}
  <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[60] bg-grain opacity-[0.045] mix-blend-overlay" />

  <main className="mx-auto max-w-[1240px] px-4 pb-24 pt-7 sm:px-6 lg:px-8">
    {/* Breadcrumb */}
    <div className="mb-5 flex flex-wrap items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ink3 t-ink3">
      <a href="#" className="transition hover:text-ink2">Campañas</a>
      <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="m9 18 6-6-6-6"/></svg>
      <span className="text-ink2 t-ink2">Nueva campaña</span>
    </div>

    {/* Wizard shell */}
    {!createdCampaign ? (
      <div id="wizard" className="overflow-hidden rounded-3xl border border-line bg-card shadow-card t-card t-line">
        <div id="wizardGrid" className="grid grid-cols-1 lg:grid-cols-[300px_1fr]">
          
          {/* ===== SIDEBAR ===== */}
          <aside className="border-b border-line bg-paper/60 p-6 lg:border-b-0 lg:border-r lg:bg-paper/40 t-line t-paper">
            {/* Stepper vertical (desktop) */}
            <ol id="stepperV" className="hidden lg:block" aria-label="Progreso del formulario">
              {STEPS_CONFIG.map(renderVerticalStep)}
            </ol>

            {/* Stepper horizontal (mobile) */}
            <div className="lg:hidden">
              <ol className="flex items-center">
                {STEPS_CONFIG.map(renderHorizontalStep)}
              </ol>
              <p className="mt-3 text-[13px] text-ink2 t-ink2">
                <span className="font-semibold text-ink t-ink">Paso {currentStep} de 5</span>
                <span> · </span>
                <span>{STEP_NAMES[currentStep - 1]}</span>
              </p>
            </div>

            {/* Live summary (desktop) */}
            <LiveSummaryCard formData={formData} />
          </aside>

          {/* ===== CONTENT ===== */}
          <div className="p-6 sm:p-8 lg:p-10">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-green t-green">Nueva campaña</p>
                <h1 className="mt-1.5 font-serif text-[1.7rem] font-semibold leading-[1.08] tracking-tight text-ink sm:text-[2rem] t-ink">
                  Crea tu oferta en 5 pasos
                </h1>
              </div>
              <CancelButton onCancel={onCancel} />
            </div>

            <form id="wizForm" className="mt-7" noValidate>
              {renderCurrentStep()}
            </form>

            {/* Footer */}
            <WizardFooter ... />
          </div>
        </div>
      </div>
    ) : (
      /* Success state — inline */
      <SuccessView ... />
    )}
  </main>
</Layout>
```

- [ ] **Step 3: Implement render functions for each step**

Each step maps to a section in the mockup:

**Step 1** (mockup lines 357-434):
- Section with icon + title "Lo esencial del cargo"
- Title input with label
- Smart Fill card (bg-greentint, border-line2, star icon, credits, context input, CTA button)
- Location (using restyled LocationAutocomplete)
- Grid 3 cols: Job Type, Modality, Duration (selects)
- Inclusion checkbox
- Consejo card (border-l-2 border-cta)

**Step 2** (mockup lines 438-458):
- Section with icon + title "Describe el puesto como a un colega"
- Two SimpleEditor instances (description + requirements)
- Consejo card

**Step 3** (mockup lines 462-496):
- Section with icon + title "Qué ofreces a cambio"
- SimpleEditor for benefits
- Salary card (bg-greentint): currency select + amount input + public checkbox
- Consejo card

**Step 4** (mockup lines 499-551):
- Section with icon + title "Cómo vas a decidir" + "Agregar etapa" button
- Nota info card
- Template selection (3 cards: General/Admin, Tecnología, Ventas)
- Separator "o personalízalo"
- "Crear desde cero" button
- Stage list with reorder/delete buttons
- Empty state message

**Step 5** (mockup lines 553-567):
- Section with icon + title "Revisa antes de publicar"
- Review cards for each section with Edit buttons
- Security info card

- [ ] **Step 4: Implement side effects matching mockup's JavaScript**

The mockup's JavaScript (lines 611-1087) shows specific behaviors to replicate:

- **Theme sync**: already handled by ThemeContext
- **Nav scroll shadow**: NavBar already handles this
- **Toast system**: the mockup uses a simple CSS toast (lines 605-662)
- **Rich text editor builder**: handled by SimpleEditor component
- **Stage management**: add/remove/reorder stages with renderStages() emulation
- **Smart Fill**: handle credits, context input, inline fill behavior
- **Validation**: shake animation on error fields (animate-shake class already exists)
- **Stepper click navigation**: completed steps are clickable
- **Keyboard navigation**: Enter advances step (except in textarea/contenteditable)
- **Form state sync**: syncFieldsFromDOM() equivalent via controlled components

- [ ] **Step 5: Build the success inline view**

Replace current `<CampaignCreated>` rendering with inline success (mockup lines 584-603):

```tsx
{createdCampaign && (
  <div id="createSuccess" className="flex flex-col items-center py-10 text-center">
    <span className="flex h-16 w-16 items-center justify-center rounded-full bg-green text-onmark animate-popin t-good">
      <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6 9 17l-5-5"/>
      </svg>
    </span>
    <h2 className="mt-5 font-serif text-[1.8rem] font-semibold tracking-tight text-ink t-ink">Campaña creada</h2>
    <p id="successTitle" className="mt-2 max-w-[44ch] text-[15px] text-ink2 t-ink2">
      <b className="text-ink t-ink">{createdCampaign.title}</b> · {createdCampaign.stageTemplates?.length || 0} etapas. Evalen ya generó la rúbrica; sube los CVs y la IA los puntúa contra ella.
    </p>
    <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
      <button onClick={onGoToDashboard} className="inline-flex items-center gap-2 rounded-xl bg-cta px-5 py-3 text-[14px] font-semibold text-ctatext shadow-cta transition hover:-translate-y-0.5 hover:bg-ctah">
        Ir al dashboard
        <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
      </button>
      <button onClick={() => onManageCandidates(createdCampaign.id)} className="inline-flex items-center gap-2 rounded-xl border border-line2 bg-card px-5 py-3 text-[14px] font-semibold text-ink transition hover:-translate-y-0.5 hover:border-ink t-card t-ink t-line2">
        Subir los primeros CVs
      </button>
    </div>
  </div>
)}
```

- [ ] **Step 6: Delete CampaignCreated.tsx**

```powershell
Remove-Item -LiteralPath "src/components/campaigns/CampaignCreated.tsx" -Force
```

Note: The import of CampaignCreated in CreateCampaign.tsx must be removed (the success is now inline).

- [ ] **Step 7: Commit**

```bash
git add src/components/campaigns/CreateCampaign.tsx src/components/campaigns/CampaignCreated.tsx
git rm src/components/campaigns/CampaignCreated.tsx
git commit -m "feat: rewrite CreateCampaign with mockup design (green theme, sidebar, inline success)"
```

---

## Verification

After all tasks:

1. Run `npm start --prefix currify-front` and navigate to `http://localhost:3000/create-campaign`
2. Compare visually with `spec/mockup/new-campaign.html` — every element, spacing, color, and font must match
3. Test dark mode toggle
4. Test all 5 steps: fill fields, validate, navigate back/forth
5. Test Smart Fill (click button, verify modal opens, verify fill works)
6. Test stage templates (select each, verify stage cards appear)
7. Test stage reorder (up/down buttons, delete)
8. Test form submission (mock API or real backend)
9. Test success view appears after create
10. Test location autocomplete (Mapbox)
11. Test keyboard navigation (Enter advances)
12. Verify no console errors

## Self-Review Checklist

- [ ] All mockup sections present? (breadcrumb, sidebar, stepper, live summary, 5 steps, success)
- [ ] Theme colors from mockup used? (ink, paper, green, cta, etc.)
- [ ] Fonts from mockup? (Fraunces for titles, Instrument Sans for body, IBM Plex Mono for labels)
- [ ] Animations from mockup? (popin, fadein, shake)
- [ ] Grain overlay present?
- [ ] Toast system functional?
- [ ] Dark mode via data-theme works?
- [ ] Rich text editor matches mockup toolbar exactly?
- [ ] Stage templates match mockup names exactly?
- [ ] Currency options match mockup?
- [ ] Smart Fill modal restyled to green theme?
- [ ] No indigo/purple colors remaining in create-campaign flow?
- [ ] All API calls preserved? (getProfile, getUsersByCompany, generateCampaignDraft, createCampaign)
- [ ] All props interface unchanged? (CreateCampaignProps)
- [ ] Routing unchanged? (AppRouter.tsx)
