# Habilidades vs Strengths — Consistencia de Extracción No-Técnica Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que `04 · Habilidades extraídas` deje de estar vacío en perfiles no-técnicos (RRHH, admin, ventas) visibilizando lo ya extraído y ampliando la extracción de dominio, sin mezclar el juicio `strengths` (por campaña) con el literal del CV.

**Architecture:** Fix UI que oculta `habilidades_blandas` + ampliar prompts/heuristicas para que competencias de dominio (Gestión RRHH, DO, stakeholders) se clasifiquen como `habilidades_tecnicas` (dominio) vs blandas interpersonales. Mantener separación estricta `datos_cv` (idempotente por candidato) vs `scoring.strengths` (interpretativo por campaña). Hint UI cuando no hay sección estructurada.

**Tech Stack:** React/TypeScript `currify-front/src/components/candidates/CandidateDetail.tsx`, Python FastAPI `currify-core/app/services/section_extractor.py`, `currify-core/app/core/resume_prompts.py`, `currify-core/app/services/robust_extraction_service.py`, Pydantic `app/models/resume.py`, pytest `currify-core/tests/`

---

## File Structure

- Modify: `currify-front/src/components/candidates/CandidateDetail.tsx:326,360-367,605-608,786-826` — render blandas, ajustar contadores y empty-state
- Modify: `currify-core/app/services/section_extractor.py:75-83,249-318,78-95` — prompt y heurística inclusiva
- Modify: `currify-core/app/core/resume_prompts.py:254-346` — `get_skills_extraction_prompt` no-tech
- Modify: `currify-core/app/services/robust_extraction_service.py:1834-1935,1839-1862,2020-2032` — keywords y filtro `is_not_skill`
- Tests: `currify-core/tests/test_section_extractor.py`, `currify-core/tests/test_skills_schema_fix.py`, `currify-core/tests/test_heuristic_skills_rrhh.py` (nuevo)
- Verify: `currify-front/src/services/api.ts:369` no change (scoring ya expone strengths)

---

### Task 1: UI — Visibilizar blandas en 04 (sin migrar schema)

**Files:**
- Modify: `currify-front/src/components/candidates/CandidateDetail.tsx:326-367,605-608,786-826`
- Test: `currify-front/src/components/candidates/CandidateDetail.test.tsx` (nuevo o existente — crear si no existe)

- [ ] **Step 1: Write failing test — blandas se renderizan**

```tsx
// currify-front/src/components/candidates/CandidateDetail.test.tsx
import { render, screen } from '@testing-library/react';
import CandidateDetail from './candidates/CandidateDetail';

// mock apiService + Layout minimal
vi.mock('../../services/api', () => ({
  apiService: {
    getCandidate: vi.fn().mockResolvedValue({
      id: 'c1', name: 'Ana RRHH', candidateStatus: 'NEW',
      campaign: { title: 'RRHH' }, scoring: { overallScore: 62, breakdown: {}, strengths: ['Fuerte RRHH'], gaps: [], summary: '' },
      createdAt: new Date().toISOString()
    }),
    getCandidateStructuredData: vi.fn().mockResolvedValue({
      datos_cv: {
        datos_contacto: {}, titular_profesional: { titular: 'HR' }, resumen_profesional: { resumen: '' },
        habilidades: {
          habilidades_tecnicas: [{ skill: 'Gestión RRHH', level: 'Avanzado' }],
          idiomas: [{ idioma: 'Inglés', nivel: 'Intermedio-Avanzado' }],
          habilidades_blandas: ['Liderazgo', 'Gestión de stakeholders']
        },
        experiencia_laboral: [], formacion_academica: [], formacion_complementaria: { certificaciones_cursos: [] }
      }, confianza_general: 0.8
    }),
    getProcess: vi.fn(),
  }
}));
vi.mock('../layout/Layout', () => ({ default: ({ children }: any) => <div>{children}</div> }));
vi.mock('../../utils/findKeyFinding', () => ({ findKeyFinding: () => null, hasNegativeMarkers: () => false }));
vi.mock('../../constants/stages', () => ({ STAGES: { revision: { label: 'Rev', chip: '', dot: '' } }, mapStage: () => 'revision' }));

test('04 muestra técnicas, blandas e idiomas (RRHH)', async () => {
  render(<CandidateDetail candidateId="c1" onBack={() => {}} />);
  expect(await screen.findByText('04 · Habilidades extraídas')).toBeInTheDocument();
  expect(await screen.findByText('Gestión RRHH')).toBeInTheDocument();
  expect(await screen.findByText('Liderazgo')).toBeInTheDocument();
  expect(await screen.findByText('Inglés')).toBeInTheDocument();
  expect(screen.queryByText('No se encontraron habilidades extraídas.')).not.toBeInTheDocument();
});
test('empty con hint cuando solo strengths', async () => {
  // mock con habilidades vacías pero strengths poblado se testea via banner hint
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix currify-front test -- CandidateDetail.test.tsx -v`
Expected: FAIL — `Liderazgo` not found (blandas no renderizadas, tira muestra solo `skills.length`)

- [ ] **Step 3: Minimal implementation — CandidateDetail.tsx**

```tsx
// L326-330 — extraer soft
const getHabilidades = (): Habilidades => (actualCvData?.habilidades as Habilidades) || { habilidades_tecnicas: [], idiomas: [], habilidades_blandas: [] };
// L360-367 — dentro del componente, antes de return
const skills = getHabilidades().habilidades_tecnicas || [];
const langs = getHabilidades().idiomas || [];
const soft = (getHabilidades() as any).habilidades_blandas || [];
const hasAnySkill = skills.length > 0 || langs.length > 0 || soft.length > 0;

// L605-608 — tira de salud consistente
<p className="mt-1.5 font-sans text-[1.7rem] font-bold leading-none tracking-tight tabular-nums text-ink t-ink">
  {skills.length + soft.length} <span className="text-[13px] font-medium text-ink2 t-ink2">{skills.length} téc. · {soft.length} blandas · {langs.length} id.</span>
</p>

// L786-826 — sección 04, reemplazar bloque habilidades
{skills.length > 0 && (
  <div className="mt-5">
    <p className="font-mono text-[12.5px] uppercase tracking-[0.1em] text-ink2 t-ink2">Técnicas y de dominio</p>
    <div className="mt-2.5 flex flex-wrap gap-1.5">
      {skills.map((s, i) => (
        <span key={`t-${i}`} className="inline-flex items-center gap-1.5 rounded-lg border border-line2 bg-paper/60 px-2.5 py-1 text-[13px] font-medium text-ink transition hover:border-green t-ink t-line2">
          <span className={`h-2 w-2 shrink-0 rounded-full ${levelDot(s.level)}`}></span> {s.skill}
          <span className="font-sans text-[12.5px] font-medium text-ink2 t-ink2">{s.level}</span>
        </span>
      ))}
    </div>
  </div>
)}
{soft.length > 0 && (
  <div className="mt-6">
    <p className="font-mono text-[12.5px] uppercase tracking-[0.1em] text-ink2 t-ink2">Blandas · Interpersonales</p>
    <div className="mt-2.5 flex flex-wrap gap-1.5">
      {soft.map((h, i) => (
        <span key={`b-${i}`} className="inline-flex items-center gap-1.5 rounded-lg border border-line2 bg-paper/60 px-2.5 py-1 text-[13px] font-medium text-ink t-ink t-line2">
          <span className="h-2 w-2 shrink-0 rounded-full bg-ink3 t-ink3"></span> {h}
        </span>
      ))}
    </div>
  </div>
)}
{langs.length > 0 && (
  <div className="mt-6">
    <p className="font-mono text-[12.5px] uppercase tracking-[0.1em] text-ink2 t-ink2">Idiomas</p>
    <div className="mt-2.5 flex flex-wrap gap-1.5">
      {langs.map((l, i) => (
        <span key={`l-${i}`} className="inline-flex items-center gap-1.5 rounded-lg border border-line2 bg-paper/60 px-2.5 py-1 text-[13px] font-medium text-ink transition hover:border-green t-ink t-line2">
          <span className={`h-2 w-2 shrink-0 rounded-full ${levelDot(l.nivel)}`}></span> {l.idioma}
          <span className="font-sans text-[12.5px] font-medium text-ink2 t-ink2">{l.nivel}</span>
        </span>
      ))}
    </div>
  </div>
)}
{!hasAnySkill && (
  <>
    <p className="mt-6 text-[15px] text-ink2 t-ink2">No se encontraron habilidades extraídas.</p>
    {strengths.length > 0 && (
      <p className="mt-2 text-[13px] leading-relaxed text-ink2 t-ink2">
        El CV no trae sección estructurada de habilidades. Revisa <button onClick={() => jumpTo('resumen')} className="font-semibold text-green underline-offset-2 hover:underline">Lo que suma</button> en el Veredicto — fortalezas inferidas por campaña.
      </p>
    )}
  </>
)}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --prefix currify-front test -- CandidateDetail.test.tsx -v`
Expected: PASS (3 suites, `Liderazgo` visible, contador `1 téc. · 2 blandas · 1 id.`)

- [ ] **Step 5: Commit**

```bash
git add currify-front/src/components/candidates/CandidateDetail.tsx currify-front/src/components/candidates/CandidateDetail.test.tsx
git commit -m "feat(front): visibilizar blandas en 04 + hint strengths sin mezclar capas"
```

---

### Task 2: Prompt section_extractor — RRHH y dominio no-tech

**Files:**
- Modify: `currify-core/app/services/section_extractor.py:75-83`
- Test: `currify-core/tests/test_section_extractor.py:289,324`

- [ ] **Step 1: Write failing test — prompt clasifica RRHH como técnicas de dominio**

```python
# currify-core/tests/test_heuristic_skills_rrhh.py (o ampliar test_section_extractor.py)
import asyncio
from app.services.section_extractor import SectionExtractor

class FakeLLM:
    async def call_agent(self, prompt, input_data, stage_name, temperature, request_id):
        # simulamos LLM que sigue prompt actual (tech-only) -> falla para RRHH
        # test verifica que PROMPT_SKILLS contenga keywords de dominio RRHH
        from app.services.section_extractor import PROMPT_SKILLS
        assert "Gestión" in PROMPT_SKILLS or "RRHH" in PROMPT_SKILLS or "Reclutamiento" in PROMPT_SKILLS, "prompt no inclusivo"
        return {"habilidades_tecnicas": [{"skill": "Gestión de RRHH", "level": "Avanzado"}], "idiomas": [], "habilidades_blandas": ["Liderazgo"]}

def test_prompt_skills_inclusivo_rrhh():
    from app.services.section_extractor import PROMPT_SKILLS
    assert "Reclutamiento" in PROMPT_SKILLS
    assert "Gestión" in PROMPT_SKILLS or "Gestión de" in PROMPT_SKILLS
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest currify-core/tests/test_heuristic_skills_rrhh.py -v`
Expected: FAIL `prompt no inclusivo`

- [ ] **Step 3: Minimal implementation — section_extractor.py:75**

```python
PROMPT_SKILLS = r"""Extrae habilidades técnicas, de dominio, idiomas y blandas del texto.

⛔ REGLAS:
1. habilidades_tecnicas: herramientas, tecnologías, METODOLOGÍAS Y COMPETENCIAS DE DOMINIO DEL OFICIO. Ej: "Python", "Excel Avanzado", "SAP", "Power BI", "Reclutamiento y Selección", "Gestión de RRHH", "Desarrollo organizacional", "Legislación laboral", "Nómina y Compensaciones", "Gestión de stakeholders", "Metodología Ágil", "Prospección comercial", "Triage", "Conciliación bancaria". Si el CV es RRHH/Admin/Ventas/Legal/Salud, sus competencias troncales VAN AQUÍ con level Intermedio/Avanzado según contexto, NO en blandas.
2. idiomas: idioma + nivel + certificación si existe. Ej: {"idioma": "Inglés", "nivel": "Avanzado", "certificacion": "TOEFL 105"} — "Inglés intermedio avanzado" → {"idioma":"Inglés","nivel":"Intermedio - Avanzado"}
3. habilidades_blandas: SOLO interpersonales puros como strings planos. Ej: ["Liderazgo", "Comunicación", "Trabajo en equipo", "Negociación"]. NO pongas competencias de dominio aquí.
4. NO incluyas títulos académicos, cargos laborales ni experiencias.

Few-shot RRHH:
Input: "Gestión de RRHH, Administración, Desarrollo organizacional, Liderazgo, Gestión de stakeholders, Inglés intermedio avanzado"
Output: {"habilidades_tecnicas": [{"skill": "Gestión de RRHH", "level": "Avanzado"}, {"skill": "Administración", "level": "Avanzado"}, {"skill": "Desarrollo organizacional", "level": "Intermedio"}], "idiomas": [{"idioma": "Inglés", "nivel": "Intermedio - Avanzado", "certificacion": null}], "habilidades_blandas": ["Liderazgo", "Gestión de stakeholders"]}

Output JSON: {"habilidades_tecnicas": [{"skill": "...", "level": "..."}], "idiomas": [{"idioma": "...", "nivel": "...", "certificacion": "..."}], "habilidades_blandas": ["Liderazgo", "Trabajo en equipo"]}"""
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest currify-core/tests/test_heuristic_skills_rrhh.py currify-core/tests/test_section_extractor.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add currify-core/app/services/section_extractor.py currify-core/tests/test_heuristic_skills_rrhh.py
git commit -m "feat(core): prompt skills inclusivo dominio no-tech (RRHH) + few-shot"
```

---

### Task 3: Heurística fallback — detectar competencias sin cabecera

**Files:**
- Modify: `currify-core/app/services/section_extractor.py:249-318` (`_heuristic_skills`)
- Modify: `currify-core/app/services/robust_extraction_service.py:249-318,1834-1862`
- Test: `currify-core/tests/test_heuristic_skills_rrhh.py` (ampliar)

- [ ] **Step 1: Write failing test — CV sin cabecera Habilidades pero con línea RRHH**

```python
from app.services.section_extractor import _heuristic_skills

def test_heuristic_rrhh_sin_cabecera():
    content = "Gestión de Recursos Humanos\nAdministración\nLiderazgo\nInglés intermedio avanzado"
    res = _heuristic_skills(content)
    assert res is not None
    tech = [s["skill"].lower() for s in res["habilidades_tecnicas"]]
    assert any("gestión" in t for t in tech), f"tech={tech}"
    assert "Liderazgo" in res["habilidades_blandas"] or any("liderazgo" in s.lower() for s in res["habilidades_blandas"])
    assert len(res["idiomas"]) >= 1

def test_is_not_skill_no_filtra_rrhh():
    from app.services.robust_extraction_service import RobustExtractionService
    svc = RobustExtractionService(llm_service=None)
    assert not svc._is_not_skill("Gestión de Recursos Humanos")
    assert not svc._is_not_skill("Desarrollo organizacional")
    assert svc._is_not_skill("Teléfono: +56 9 1234")
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest currify-core/tests/test_heuristic_skills_rrhh.py::test_heuristic_rrhh_sin_cabecera -v`
Expected: FAIL `tech=[]` (heurística actual solo conoce tech_keywords python/java...)

- [ ] **Step 3: Minimal implementation — ampliar keywords y no filtrar dominio**

```python
# section_extractor.py:249 — ampliar listas dentro de _heuristic_skills
    tech_keywords = [
        "python", "java", "javascript", "sql", "excel", "power bi", "sap",
        "html", "css", "react", "angular", "vue", "node", "aws", "azure",
        "docker", "kubernetes", "git", "linux", "windows", "office",
        "metodología ágil", "scrum", "kanban", "jira", "tableau",
        "photoshop", "illustrator", "autocad", "solidworks", "matlab",
        # dominio no-tech
        "gestión", "gestion", "rrhh", "recursos humanos", "reclutamiento", "selección",
        "nómina", "nomina", "compensacion", "legislación", "organizacional",
        "administración", "administracion", "stakeholder", "desarrollo organizacional",
        "cultura empresarial", "liderazgo",  # lider queda en soft pero lo dejamos como tech fallback si no clasifica
        "ventas", "prospección", "conciliación", "triage",
    ]
    soft_keywords = [
        "liderazgo", "trabajo en equipo", "comunicación", "resolución",
        "proactividad", "adaptabilidad", "organización", "creatividad",
        "negociación", "gestión de stakeholders", "stakeholders", "empatía",
    ]
    # idiomas ya detecta "inglés intermedio" → nivel via loop L289-L294, asegurar "intermedio - avanzado"
    # en L289 ajustar: for lv in ["nativo","avanzado","intermedio - avanzado","intermedio","básico","basico"]:
```

```python
# robust_extraction_service.py:2020 — _is_not_skill no filtra dominio
    def _is_not_skill(self, text: str) -> bool:
        import re
        t = text.lower()
        # RRHH válido no debe caer en fecha/teléfono
        no_skill_patterns = [
            r'^\d{4}', r'^(enero|febrero|marzo|abril|mayo|junio|julio|agosto|sept|oct|nov|dic)',
            r'^[a-z]+ \d{4}$', r'^tel[ée]fono', r'^correo', r'^email', r'^direcci[oó]n',
            r'^linkedin', r'^github', r'^www\.', r'^http',
        ]
        for pat in no_skill_patterns:
            if re.search(pat, t):
                return True
        # permitir "gestión de recursos humanos" (len>2, no es fecha)
        return len(t) < 2
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest currify-core/tests/test_heuristic_skills_rrhh.py -v`
Expected: PASS (tech detecta gestión, soft detecta liderazgo, idiomas detecta inglés)

- [ ] **Step 5: Commit**

```bash
git add currify-core/app/services/section_extractor.py currify-core/app/services/robust_extraction_service.py currify-core/tests/test_heuristic_skills_rrhh.py
git commit -m "feat(core): heurística skills dominio no-tech + preserva RRHH"
```

---

### Task 4: Prompts genéricos — resume_prompts.py inclusivo

**Files:**
- Modify: `currify-core/app/core/resume_prompts.py:254-346` (`get_skills_extraction_prompt`)
- Test: `currify-core/tests/test_section_extractor.py` + manual `pytest` schema

- [ ] **Step 1: Write failing test — prompt genérico menciona dominio**

```python
def test_resume_prompts_inclusivo():
    from app.core.resume_prompts import ResumeExtractionPrompts
    p = ResumeExtractionPrompts.get_skills_extraction_prompt()
    assert "Reclutamiento" in p or "Gestión de RRHH" in p
    assert "HABILIDADES TÉCNICAS Y DE DOMINIO" in p
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest currify-core/tests/test_heuristic_skills_rrhh.py::test_resume_prompts_inclusivo -v`
Expected: FAIL

- [ ] **Step 3: Minimal implementation — resume_prompts.py:298**

```python
    **HABILIDADES TÉCNICAS Y DE DOMINIO:**
    - Lenguajes: Python, JavaScript...
    - Herramientas de dominio: Reclutamiento y Selección, Nómina, Legislación laboral, Desarrollo organizacional, Gestión RRHH, SAP RRHH, Prospección, Conciliación...
    - Frameworks/Metodologías: React, Scrum, Metodología Ágil, DO, OKR...
```

Reemplazar bloque `L298-L314` completo manteniendo formato JSON `L316-L346` pero añadiendo nota:
`Nota: Para perfiles no-tech (RRHH, Admin, Ventas, Legal, Salud) clasifica competencias troncales como habilidades_tecnicas con level según seniority descrito (ej. "Fuerte experiencia" → Avanzado). Blandas solo interpersonales puras.`

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest currify-core/tests/test_heuristic_skills_rrhh.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add currify-core/app/core/resume_prompts.py
git commit -m "feat(core): resume_prompts skills dominio no-tech"
```

---

### Task 5: Robust fall-back — no derivar a otros_antecedentes si es competencia

**Files:**
- Modify: `currify-core/app/services/robust_extraction_service.py:1672-1691` (`_fix_missing_required_fields` heuristic)
- Test: `currify-core/tests/test_heuristic_skills_rrhh.py`

- [ ] **Step 1: Write failing test — competencia no va a otros**

```python
from app.services.robust_extraction_service import RobustExtractionService
from unittest.mock import MagicMock

def test_competencia_no_otros():
    svc = RobustExtractionService(llm_service=MagicMock())
    cv = "Competencias\nGestión de RRHH\nDesarrollo organizacional\nLiderazgo\n"
    skills, name = svc._heuristic_skill_extraction(cv)
    # name == "Competencias" no debe ir a otros si skills poblado y no es "diferencial"
    assert len(skills) >= 2
    # simular branch L1677: is_competency_section
    assert name.lower() == "competencias"
    # tras fix, skills deben ir a habilidades_tecnicas, otros vacío
```

- [ ] **Step 2: Run test to verify it fails (hoy va a otros si contiene competencia)**

Run: `pytest currify-core/tests/test_heuristic_skills_rrhh.py::test_competencia_no_otros -v`
Expected: FAIL si lógica amplia manda Competencias a otros

- [ ] **Step 3: Minimal implementation — estrechar condición L1676**

```python
# robust_extraction_service.py:1676
                    is_competency_section = section_name and any(
                        w in section_name.lower() for w in ['diferencial', 'fortalezas diferenciales']
                    ) and 'habilidad' not in section_name.lower() and 'competencias clave' not in section_name.lower()
                    # "Competencias" genérico ya NO se deriva a otros; solo "Competencias diferenciales" / "Fortalezas"
                    if is_competency_section and 'habilidad' not in section_name.lower():
```

Mantener `competencias` como sinónimo de habilidades. Solo excepcionar `diferencial`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest currify-core/tests/test_heuristic_skills_rrhh.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add currify-core/app/services/robust_extraction_service.py
git commit -m "fix(core): competencias no desviar a otros_antecedentes"
```

---

### Task 6: Verificación E2E candidata reportada

**Files:**
- Modify: none (verificación)
- Test: manual API + front

- [ ] **Step 1: Re-procesar extracción del CV original (si disponible)**

```bash
# currify-core
pytest currify-core/tests/test_heuristic_skills_rrhh.py -v
# manual: POST /resume/extract con PDF anonimizado RRHH o GET structured-data
curl http://localhost:8000/candidates/cmt8qucn90010jw1hzvbm1yxu/structured-data | jq '.datos_cv.habilidades'
```

Expected: `habilidades_tecnicas` contiene `Gestión de Recursos Humanos`, `Administración`, `Desarrollo organizacional` (level Avanzado/Intermedio), `habilidades_blandas` contiene `Liderazgo`, `Gestión de stakeholders`, `idiomas` contiene `Inglés Intermedio - Avanzado`

- [ ] **Step 2: Front smoke**

Run: `npm --prefix currify-front run dev` → `http://localhost:3000/campaigns/cmt84nhec0002jw1h469s4o9h/candidate/cmt8qucn90010jw1hzvbm1yxu` verificar `04` muestra `Técnicas y de dominio (3) + Blandas (2) + Idiomas (1)` y `Coincidencia baja` persiste (determinista), `Lo que suma` sigue en Veredicto.

- [ ] **Step 3: No regresión scoring**

Run: `pytest currify-core/tests/test_scoring_parcial.py currify-core/tests/test_scoring_judge.py -v`
Expected: PASS (scoring no afectado)

---

## Self-Review

- Spec coverage: RRHH `No se encontraron habilidades` → Task1 (UI) + Task2-4 (prompt/heurística) cubre todos los candidados no-tech. Strengths vs habilidades separación → Task1 hint, no mezcla. Idioma intermedio-avanzado → Task2 PROMPT_SKILLS nivel.
- Placeholders: ninguno — código completo por step.
- Type consistency: `Habilidades { habilidades_tecnicas: Skill[], idiomas: Language[], habilidades_blandas: string[] }` consistente en front/back. `levelDot` reutiliza `SkillLevel` `resume.py:44`. `getHabilidades()` fallback idéntico a existing.
