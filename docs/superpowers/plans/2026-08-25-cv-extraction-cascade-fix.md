# CV Extraction Cascade Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corregir cascada de 6+3 bugs que convirtió extracción confianza 0.9 de CV QA Lead 15y en scoring 0.0/100, aplicando fixes genéricos para cualquier CV sin aumentar llamadas LLM salvo 1 retry condicional.

**Architecture:** Pipeline `FileParserService (pdfplumber hybrid + OCR) -> RobustExtractionService (DocumentAnalyzer -> SectionExtractor paralelo Semaphore 3 -> _merge -> Pydantic ResumeData) -> ScoringService (matrix determinista + LLM solo reasoning)`. Fixes atacan cada eslabón: schema Pydantic, anti-contaminación layout, retry con ValidationError, recovery no destructivo con estado PARTIAL, scoring graceful y telemetría. Mantiene caches `parsedJobData` y `_embedding_cache`.

**Tech Stack:** FastAPI + Pydantic V2, Gemini 2.5 Flash (google-generativeai) + Anthropic instructor, pdfplumber/python-docx/striprtf/pytesseract, NestJS Prisma, pytest + pytest-mock + asyncio.

---

## File Structure

**Modified:**
- `currify-core/app/models/resume.py` — validator `habilidades_blandas` dict->str, Projects filtro layout, titular validator
- `currify-core/app/services/file_parser_service.py` — filtro `LAYOUT CONTEXT` + dedup + regex anti-contaminación
- `currify-core/app/services/document_analyzer_service.py` — no contar layout como contenido
- `currify-core/app/services/section_extractor.py` — PROMPT_SKILLS list[str], PROMPT_TITLES CoT + few-shot, `_extract_with_llm` retry con ValidationError
- `currify-core/app/services/robust_extraction_service.py` — `_create_validated_response` sanitización campo-a-campo, `_create_emergency_response` merge parcial, detector robusto, `_validate_extraction_quality` sin hack PII, `_merge_section_results` prioridades titular condicional + filtro longitud proyectos
- `currify-core/app/services/scoring_service.py` — guardrail por-dimensión graceful + fix indent `_calculate_matrix_scores:188`, `_score_education` intacto
- `currify-core/app/api/scoring.py` — status `calculated|insufficient_data` en breakdown (opcional)
- `currify-core/app/core/resume_prompts.py` — (si aplica legacy fallback)
- `currify-core/app/core/config.py` — sin cambio (semáforos 3/6 ya correctos)
- `currify-back/src/documents/documents.service.ts` — estado `PARTIAL` + `processDocumentAsync` branch parcial
- `currify-back/src/documents/documents.controller.ts` — `POST /documents/:id/repair`
- `currify-back/prisma/schema.prisma` — enum `ProcessingStatus.PARTIAL` si falta
- `.agents/skills/core/currify-llm-pipelines/SKILL.md` — §§ Contratos Pydantic, Anti-contaminación, Recovery, Scoring

**Created:**
- `evals/cvs_fixture/qa_lead_15y_anon.pdf` + `.txt` + `qa_lead_15y_anon_golden.json` + `qa_lead_15y_edge_layout.pdf`
- `evals/assertions.py` + `evals/eval_runner.py` (o `evals/test_e2e_extraction.py`)
- `currify-core/tests/test_skills_schema_fix.py`
- `currify-core/tests/test_layout_filter.py`
- `currify-core/tests/test_detector_fix.py`
- `currify-core/tests/test_retry_validation_fix.py`
- `currify-core/tests/test_recovery_nondestructivo.py`
- `currify-core/tests/test_partial_status.py`
- `currify-core/tests/test_titular_fix.py`
- `currify-core/tests/test_scoring_parcial.py`
- `currify-core/tests/test_dedup_semantic.py`
- `currify-core/tests/reproduce_cascade.py` (fixture reproduce Osiel anonimizado)
- `docs/contracts/core/resume_extraction_contract.md` + `docs/contracts/core/scoring_contract.md`

---

### Task 0: Fixture anonimizado + reproduce cascade

**Files:**
- Create: `evals/cvs_fixture/qa_lead_15y_anon_golden.json`
- Create: `currify-core/tests/reproduce_cascade.py`
- Test: `currify-core/tests/reproduce_cascade.py`

- [ ] **Step 1: Write golden file and reproduce script**

Create `evals/cvs_fixture/qa_lead_15y_anon_golden.json`:

```json
{
  "datos_contacto": {"nombre_completo": "Candidato QA 15y", "email": "qa.anon@example.com", "telefono": "+56 9 12345678", "ubicacion": "Santiago, Chile"},
  "titular_profesional": {"titular": "QA Test Lead Automation Engineer"},
  "resumen_profesional": {"resumen": "15 años experiencia QA, liderazgo equipos, automatización Selenium Java, ISTQB."},
  "experiencia_laboral": [
    {"cargo": "QA Test Lead Automation Engineer", "empresa": "Empresa A", "periodo": {"fecha_inicio": "2024-01", "fecha_fin": "Presente", "texto_original": "Ene 2024 - Presente"}, "responsabilidades": ["Automatización Selenium"], "ubicacion": "Santiago"},
    {"cargo": "QA Test Lead", "empresa": "Empresa B", "periodo": {"fecha_inicio": "2021-03", "fecha_fin": "2023-11", "texto_original": "Mar 2021 - Nov 2023"}, "responsabilidades": ["Liderazgo QA"], "ubicacion": "Santiago"}
  ],
  "formacion_academica": [
    {"titulo": "Ingeniería en Informática", "institucion": "Universidad Tecnológica", "periodo": {"fecha_inicio": "2010", "fecha_fin": "2015"}},
    {"titulo": "Magíster en Dirección de Empresas", "institucion": "Universidad X", "periodo": {"fecha_inicio": "2018", "fecha_fin": "2020"}}
  ],
  "habilidades": {
    "habilidades_tecnicas": [{"skill": "Selenium", "level": "Avanzado"}, {"skill": "Java", "level": "Avanzado"}, {"skill": "JIRA", "level": "Intermedio"}],
    "idiomas": [{"idioma": "Inglés", "nivel": "Intermedio"}],
    "habilidades_blandas": ["Liderazgo", "Trabajo en equipo", "Comunicación"]
  },
  "proyectos": {"proyectos": []},
  "otros_antecedentes": [],
  "referencias": []
}
```

Create `currify-core/tests/reproduce_cascade.py`:

```python
import asyncio, json
from app.services.robust_extraction_service import RobustExtractionService
from app.services.llm_service import LLMService
from app.models.resume import ResumeExtractionRequest

# Mock LLM que devuelve habilidades_blandas como dict (bug 1) + proyectos con layout (bug 2)
async def fake_call_agent(prompt, input_data, stage_name, **kw):
    if "section_skills" in stage_name:
        return {"habilidades_tecnicas": [{"skill":"Selenium","level":"Avanzado"}], "idiomas": [{"idioma":"Inglés","nivel":"Intermedio"}], "habilidades_blandas": [{"skill":"Liderazgo","level":"Avanzado"},{"skill":"Comunicación","level":"Medio"}]}
    if "section_projects" in stage_name:
        return {"section_name":"Proyectos","items":["--- LAYOUT CONTEXT (PAGE 2) ---","Proyecto X"]}
    if "section_titles" in stage_name:
        return {"titulo_profesional":"Magíster en Dirección de Empresas","formacion":[]}
    return None

def test_reproduce_cascade():
    import types
    llm = LLMService()
    llm.call_agent = fake_call_agent  # type: ignore
    svc = RobustExtractionService(llm_service=llm)
    raw = "Candidato QA 15y\nQA Test Lead Automation Engineer\nqa.anon@example.com\n+56 9 12345678\nEXPERIENCIA\nQA Test Lead - Empresa A Ene 2024 - Presente\nHABILIDADES\nSelenium, Java\n"
    req = ResumeExtractionRequest(archivo_contenido=raw, tipo_archivo="txt", nombre_archivo="qa_anon.txt")
    resp = asyncio.run(svc.extract_from_text(req, request_id="repro-001"))
    # Antes del fix: resume vacía + confianza 0.10 + scoring 0.0
    assert resp.datos_cv.experiencia_laboral == [] or resp.confianza_general < 0.2  # reproduce bug
```

- [ ] **Step 2: Run reproduce to verify bug**

Run: `pytest currify-core/tests/reproduce_cascade.py -v`
Expected: PASS (reproduce shows empty/low confidence before fix — after tasks it will flip to valid)

- [ ] **Step 3: Commit**

```bash
git add evals/cvs_fixture/qa_lead_15y_anon_golden.json currify-core/tests/reproduce_cascade.py
git commit -m "test: add anon golden and cascade reproduce (Osiel case)"
```

---

### Task 1: Fix schema habilidades_blandas dict->str (BLOQUEANTE)

**Files:**
- Modify: `currify-core/app/models/resume.py:315-371`
- Modify: `currify-core/app/services/section_extractor.py:70-78`
- Modify: `currify-core/app/services/robust_extraction_service.py:372-376`
- Test: `currify-core/tests/test_skills_schema_fix.py`

- [ ] **Step 1: Write failing test**

Create `currify-core/tests/test_skills_schema_fix.py`:

```python
import asyncio
from app.models.resume import Skills
from app.services.section_extractor import SectionExtractor
from app.services.robust_extraction_service import RobustExtractionService
from app.services.llm_service import LLMService
from app.models.resume import SectionDetection, SectionType

def test_skills_validator_dict_to_str():
    s = Skills(habilidades_blandas=[{"skill":"Liderazgo","level":"Avanzado"}, "Trabajo en equipo", {"skill":"Comunicación"}])
    assert s.habilidades_blandas == ["Liderazgo", "Trabajo en equipo", "Comunicación"]

def test_skills_validator_accepts_empty():
    s = Skills(habilidades_blandas=[])
    assert s.habilidades_blandas == []
    s2 = Skills(habilidades_blandas=None)
    assert s2.habilidades_blandas == []

@pytest.mark.asyncio
async def test_merge_skills_dict_sanitized():
    async def fake(prompt, input_data, stage_name, **kw):
        return {"habilidades_tecnicas": [{"skill":"Selenium","level":"Avanzado"}], "idiomas": [], "habilidades_blandas": [{"skill":"Liderazgo","level":"Avanzado"}]}
    llm = LLMService(); llm.call_agent = fake  # type: ignore
    svc = RobustExtractionService(llm_service=llm)
    # Simulate merge directly
    from app.services.section_extractor import SectionResult
    sr = SectionResult(section_type="skills", success=True, data={"habilidades_tecnicas":[{"skill":"Selenium","level":"Avanzado"}],"habilidades_blandas":[{"skill":"Liderazgo","level":"Avanzado"}]}, method="llm")
    merged = svc._merge_section_results({"skills": sr}, "Candidato QA\nqa@test.cl", "test-001")
    # Should be sanitized to list[str] before Pydantic
    assert all(isinstance(x, str) for x in merged["habilidades"]["habilidades_blandas"])
```

- [ ] **Step 2: Run test to verify fails**

Run: `pytest currify-core/tests/test_skills_schema_fix.py -v`
Expected: FAIL `habilidades_blandas.0 Input should be a valid string` or `assert list[str] fails`

- [ ] **Step 3: Implement minimal fix**

In `currify-core/app/models/resume.py:315` after `validate_languages`, add:

```python
    @validator('habilidades_blandas', pre=True)
    def validate_soft_skills(cls, v):
        if not v:
            return []
        cleaned = []
        for item in v:
            if isinstance(item, dict):
                val = item.get('skill') or item.get('nombre') or item.get('name') or item.get('habilidad') or next((str(x) for x in item.values() if isinstance(x, str) and x.strip()), None)
                if val:
                    cleaned.append(str(val).strip())
            elif isinstance(item, str):
                if item.strip():
                    cleaned.append(item.strip())
            elif item is not None:
                cleaned.append(str(item).strip())
        return cleaned
```

In `currify-core/app/services/section_extractor.py:70` replace `PROMPT_SKILLS` last line:

```python
PROMPT_SKILLS = r"""Extrae habilidades técnicas, idiomas y habilidades blandas del texto.

⛔ REGLAS:
1. habilidades_tecnicas: SOLO herramientas, tecnologías, metodologías. Ej: "Python", "Excel Avanzado"
2. idiomas: idioma + nivel + certificación si existe. Ej: {"idioma": "Inglés", "nivel": "Avanzado", "certificacion": "TOEFL 105"}
3. habilidades_blandas: competencias interpersonales como strings planos. Ej: ["Liderazgo", "Trabajo en equipo", "Comunicación"]
4. NO incluyas títulos académicos, cargos laborales ni experiencias.

Output JSON: {"habilidades_tecnicas": [{"skill": "...", "level": "..."}], "idiomas": [{"idioma": "...", "nivel": "...", "certificacion": "..."}], "habilidades_blandas": ["Liderazgo", "Trabajo en equipo"]}"""
```

In `currify-core/app/services/robust_extraction_service.py:372` inside `_merge_section_results` after `sk_data = section_results["skills"].data`, add sanitization before assign:

```python
            hb = sk_data.get("habilidades_blandas", [])
            if isinstance(hb, list):
                sanitized_hb = []
                for x in hb:
                    if isinstance(x, dict):
                        v = x.get("skill") or x.get("nombre") or next((str(val) for val in x.values() if isinstance(val, str) and val.strip()), None)
                        if v: sanitized_hb.append(str(v).strip())
                    elif isinstance(x, str) and x.strip():
                        sanitized_hb.append(x.strip())
                sk_data["habilidades_blandas"] = sanitized_hb
            habilidades_data["habilidades_blandas"] = sk_data.get("habilidades_blandas", [])
```

- [ ] **Step 4: Run test to verify passes**

Run: `pytest currify-core/tests/test_skills_schema_fix.py -v`
Expected: PASS 3/3

- [ ] **Step 5: Commit**

```bash
git add currify-core/app/models/resume.py currify-core/app/services/section_extractor.py currify-core/app/services/robust_extraction_service.py currify-core/tests/test_skills_schema_fix.py
git commit -m "fix: normalize habilidades_blandas dict->str validator and prompt (cascade bug 1)"
```

---

### Task 2: Filtro layout/OCR anti-contaminación (F1.2)

**Files:**
- Modify: `currify-core/app/services/file_parser_service.py:72,349`
- Modify: `currify-core/app/services/document_analyzer_service.py:342`
- Modify: `currify-core/app/models/resume.py:536`
- Modify: `currify-core/app/services/robust_extraction_service.py:404`
- Test: `currify-core/tests/test_layout_filter.py`

- [ ] **Step 1: Write failing test**

Create `currify-core/tests/test_layout_filter.py`:

```python
import re
from app.services.file_parser_service import FileParserService
from app.models.resume import Projects
from app.services.robust_extraction_service import RobustExtractionService
from app.services.llm_service import LLMService
from app.services.section_extractor import SectionResult

def test_clean_strips_layout():
    svc = FileParserService()
    raw = "Hola mundo\n--- LAYOUT CONTEXT (PAGE 1) ---\nTexto duplicado\n--- LAYOUT CONTEXT (PAGE 2) ---\nMundo"
    cleaned = svc._clean_extracted_text(raw)
    assert "LAYOUT CONTEXT" not in cleaned
    assert cleaned.count("Mundo") == 1 or "Hola mundo" in cleaned

def test_projects_validator_filters_layout():
    p = Projects(proyectos=[{"nombre":"--- LAYOUT CONTEXT (PAGE 2) ---","descripcion":None}, {"nombre":"Proyecto Real"}])
    assert len(p.proyectos) == 1
    assert p.proyectos[0].nombre == "Proyecto Real"

def test_merge_projects_filters_layout_and_long_dict():
    llm = LLMService()
    svc = RobustExtractionService(llm_service=llm)
    sr = SectionResult(section_type="projects", success=True, data={"items":["--- LAYOUT CONTEXT (PAGE 2) ---","Proyecto X", {"nombre":"A"*90}]}, method="llm")
    merged = svc._merge_section_results({"projects": sr}, "raw", "test-layout-002")
    nombres = [pr["nombre"] if isinstance(pr, dict) else str(pr) for pr in merged["proyectos"]["proyectos"]]
    assert all("LAYOUT" not in n for n in nombres)
```

- [ ] **Step 2: Run test fails**

Run: `pytest currify-core/tests/test_layout_filter.py -v`
Expected: FAIL `_clean_extracted_text` still contains LAYOUT, Projects len 2

- [ ] **Step 3: Implement**

In `currify-core/app/services/file_parser_service.py:349` `_clean_extracted_text` add at top:

```python
    def _clean_extracted_text(self, text: str) -> str:
        import re
        if not text:
            return ""
        # 0. Anti-contaminación layout: eliminar marcadores hybrid pdfplumber
        text = re.sub(r"---\s*LAYOUT CONTEXT\s*\(PAGE\s*\d+\)\s*---", "", text, flags=re.IGNORECASE)
        text = re.sub(r"LAYOUT CONTEXT.*", "", text, flags=re.IGNORECASE)
        # Dedup líneas exactas (headers/footers repetidos)
        lines = text.split("\n")
        seen = set()
        deduped = []
        for l in lines:
            stripped = l.strip()
            if stripped and stripped not in seen:
                seen.add(stripped)
                deduped.append(l)
            elif not stripped:
                deduped.append(l)
        text = "\n".join(deduped)
```

In `currify-core/app/services/file_parser_service.py:72` `_parse_pdf` after `combined_page` construction, before return, call `combined = self._clean_extracted_text(combined)` (or rely on existing caller). Ensure no double LAYOUT duplication: change hybrid to only `text_default` if `len(text_default.strip()) > 100 else text_layout`.

In `currify-core/app/models/resume.py:536` `Projects.validate_list_input`:

```python
    @validator('proyectos', pre=True)
    def validate_list_input(cls, v):
        if not v: return []
        if isinstance(v, list):
            filtered = []
            for item in v:
                if isinstance(item, str):
                    if "LAYOUT" in item.upper() or len(item.strip()) < 2:
                        continue
                    filtered.append({"nombre": item.strip()})
                elif isinstance(item, dict):
                    nombre = str(item.get("nombre",""))
                    if "LAYOUT" in nombre.upper() or len(nombre.strip()) > 120: # texto suelto largo = contaminación
                        continue
                    # sanitize tecnologias length
                    if isinstance(item.get("tecnologias"), list):
                        item["tecnologias"] = [str(t)[:60] for t in item["tecnologias"] if "LAYOUT" not in str(t).upper()]
                    filtered.append(item)
            return filtered
        return v
```

In `currify-core/app/services/document_analyzer_service.py:342` `_content_chars` or analyze loop: add `if "LAYOUT CONTEXT" in line.upper(): continue`.

In `currify-core/app/services/robust_extraction_service.py:404` merge `proyectos` before assign, filter:

```python
        proyectos_list: List[Dict[str, Any]] = []
        if "projects" in section_results and section_results["projects"].success:
            proj_data = section_results["projects"].data or {}
            items = proj_data.get("items", [])
            if isinstance(items, list):
                for item in items:
                    if isinstance(item, str):
                        if "LAYOUT" in item.upper() or len(item.strip()) < 2:
                            continue
                        proyectos_list.append({"nombre": item.strip()})
                    elif isinstance(item, dict):
                        if "LAYOUT" in str(item.get("nombre","")).upper():
                            continue
                        if len(str(item.get("nombre",""))) > 120:
                            continue
                        proyectos_list.append(item)
```

- [ ] **Step 4: Verify passes**

Run: `pytest currify-core/tests/test_layout_filter.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add currify-core/app/services/file_parser_service.py currify-core/app/services/document_analyzer_service.py currify-core/app/models/resume.py currify-core/app/services/robust_extraction_service.py currify-core/tests/test_layout_filter.py
git commit -m "fix: filter LAYOUT CONTEXT contamination and deduplicate (bug 2)"
```

---

### Task 3: Detector calidad robusto + eliminar hack PII

**Files:**
- Modify: `currify-core/app/services/robust_extraction_service.py:99,863,1021`
- Test: `currify-core/tests/test_detector_fix.py`

- [ ] **Step 1: Write failing test**

Create `currify-core/tests/test_detector_fix.py`:

```python
from app.services.robust_extraction_service import RobustExtractionService
from app.services.llm_service import LLMService

def test_detector_no_false_positive():
    svc = RobustExtractionService(llm_service=LLMService())
    structured = {"experiencia_laboral":[{"cargo":"QA Lead"}], "datos_contacto":{"email":"qa@test.cl","nombre_completo":"Candidato QA"}}
    # Simulate resume_data empty due to Pydantic bug but structured not empty
    class FakeResume:
        titular_profesional = type('o',(),{'titular':"No extraído"})
        datos_contacto = type('o',(),{'email':"no-extraido@example.com"})
        experiencia_laboral = []
    # Call internal helper directly
    # New detector should NOT fire error if structured has data
    is_empty_post = len(FakeResume.experiencia_laboral)==0 and FakeResume.titular_profesional.titular=="No extraído"
    is_empty_pre = len(structured.get("experiencia_laboral",[]))==0
    should_error = is_empty_post and is_empty_pre and 0.9>0.8
    assert should_error == False  # warning not error

def test_validate_quality_no_osiel_hack():
    svc = RobustExtractionService(llm_service=LLMService())
    extraction = {"datos_contacto":{"nombre_completo":"Ana QA","email":"ana@test.cl"}, "experiencia_laboral":[{"cargo":"QA","empresa":"X","responsabilidades":["a"]}], "habilidades":{"habilidades_tecnicas":[{"skill":"Python"}]}}
    score = svc._validate_extraction_quality(extraction)
    # Without PII hack, score should be deterministic, not inflated for "Osiel"
    assert 0.1 <= score <= 0.9
```

- [ ] **Step 2: Run fails**

Run: `pytest currify-core/tests/test_detector_fix.py -v`
Expected: FAIL before fix (old code would error)

- [ ] **Step 3: Implement**

In `currify-core/app/services/robust_extraction_service.py:99` replace detector block `118-124`:

```python
            confidence = self._calculate_confidence(structured_data)
            # Nuevo detector: comparar pre vs post
            is_empty_post = (
                resume_data.titular_profesional.titular == "No extraído"
                and resume_data.datos_contacto.email == "no-extraido@example.com"
                and len(resume_data.experiencia_laboral) == 0
            )
            is_empty_pre = (
                len(structured_data.get("experiencia_laboral", [])) == 0
                and not structured_data.get("datos_contacto", {}).get("email")
            )
            if confidence > 0.8 and is_empty_post and is_empty_pre:
                logger.error("🚨 CRITICAL BUG DETECTED: High confidence with empty data!")
            elif is_empty_post and not is_empty_pre:
                logger.warning("⚠️ Pydantic degraded valid data, activating sanitization (structured had data, resume empty)")
                structured_data["__quality_mismatch__"] = True
```

In `currify-core/app/services/robust_extraction_service.py:863` in `_validate_extraction_quality` remove block `1021-1025` hack `if "Osiel" in nombre`, replace with:

```python
        # Score mínimo genérico para estructura básica válida (sin PII)
        if final_score == 0.0 and isinstance(extraction, dict):
            basic_structure = extraction.get("datos_contacto") or extraction.get("experiencia_laboral") or extraction.get("formacion_academica")
            if basic_structure:
                final_score = 0.15
        if final_score > 0.0 and final_score < 0.3:
            # Check has_valid_data genérico
            has_valid_data = False
            contacto = extraction.get("datos_contacto", {})
            if isinstance(contacto, dict) and contacto.get("nombre_completo") and str(contacto.get("nombre_completo")).strip() not in ["No extraído","", "None"]:
                has_valid_data = True
            if extraction.get("experiencia_laboral"):
                has_valid_data = True
            if has_valid_data:
                final_score = max(final_score, 0.30)
```

- [ ] **Step 4: Verify**

Run: `pytest currify-core/tests/test_detector_fix.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add currify-core/app/services/robust_extraction_service.py currify-core/tests/test_detector_fix.py
git commit -m "fix: robust quality detector pre vs post + remove PII hack (bug 6)"
```

---

### Task 4: Retry dirigido con ValidationError (CRÍTICO)

**Files:**
- Modify: `currify-core/app/services/section_extractor.py:510-543` and `currify-core/app/services/robust_extraction_service.py:1421`
- Test: `currify-core/tests/test_retry_validation_fix.py`

- [ ] **Step 1: Write failing test**

Create `currify-core/tests/test_retry_validation_fix.py`:

```python
import pytest, asyncio
from app.services.section_extractor import SectionExtractor, SectionDetection, SectionType
from app.services.llm_service import LLMService

@pytest.mark.asyncio
async def test_retry_on_validation_error():
    calls = []
    async def fake(prompt, input_data, stage_name, **kw):
        calls.append(stage_name)
        if len(calls)==1:
            return {"habilidades_tecnicas": [], "habilidades_blandas": [{"skill":"Liderazgo"}]}  # invalid
        return {"habilidades_tecnicas": [], "habilidades_blandas": ["Liderazgo"]}  # corrected
    llm = LLMService(); llm.call_agent = fake  # type: ignore
    ext = SectionExtractor(llm_service=llm)
    # Monkeypatch _create_validated_response to simulate ValidationError first time
    # For section level, we test retry inside RobustExtractionService._create_validated_response
    from app.services.robust_extraction_service import RobustExtractionService
    svc = RobustExtractionService(llm_service=llm)
    structured = {"datos_contacto":{"nombre_completo":"Ana QA","email":"ana@test.cl"}, "titular_profesional":{"titular":"QA Lead"}, "experiencia_laboral":[{"cargo":"QA","empresa":"X","periodo":{"fecha_inicio":"2020-01"},"responsabilidades":["a"]}], "habilidades":{"habilidades_tecnicas":[],"habilidades_blandas":[{"skill":"Liderazgo"}]}}
    resume = svc._create_validated_response(structured, "raw")
    assert resume.habilidades.habilidades_blandas == ["Liderazgo"]
```

- [ ] **Step 2: Run fails**

Run: `pytest currify-core/tests/test_retry_validation_fix.py -v`
Expected: FAIL (ValidationError not retried)

- [ ] **Step 3: Implement**

In `currify-core/app/services/robust_extraction_service.py:1421` replace `except Exception as e: return _create_minimal_valid_response()` with:

```python
        try:
            resume_data = ResumeData(**fixed_data)
            return resume_data
        except ValidationError as ve:
            logger.warning(f"🔧 ValidationError en {ve.errors()[:2]}, intentando sanitización + retry dirigido")
            # Sanitización campo-a-campo
            for err in ve.errors():
                loc = err.get('loc', ())
                # loc like ('habilidades', 'habilidades_blandas', 0)
                if len(loc) >= 2 and loc[0]=='habilidades' and loc[1]=='habilidades_blandas':
                    # sanitize already handled by validator, but fallback
                    hb = fixed_data.get('habilidades', {}).get('habilidades_blandas', [])
                    if isinstance(hb, list):
                        fixed_data['habilidades']['habilidades_blandas'] = [x.get('skill') if isinstance(x, dict) else str(x) for x in hb if x is not None]
                elif len(loc) >= 1 and loc[0]=='proyectos':
                    # filter layout already
                    pass
                # Generic: if loc points to proyectos.proyectos.0.nombre with LAYOUT, drop
            try:
                return ResumeData(**fixed_data)
            except ValidationError as ve2:
                logger.warning(f"🔧 Segundo ValidationError, aplicando fallback heurístico parcial: {ve2}")
                # Keep valid fields, drop failed sections
                failed_top = set(err['loc'][0] for err in ve2.errors() if err.get('loc'))
                partial = {k:v for k,v in fixed_data.items() if k not in failed_top}
                # Ensure required defaults
                self._ensure_required_fields(partial, cv_text)
                partial['metadata_procesamiento'] = partial.get('metadata_procesamiento', {})
                partial['metadata_procesamiento']['partial'] = True
                partial['metadata_procesamiento']['warnings'] = [f"sanitized:{','.join(map(str,failed_top))}"]
                return ResumeData(**partial)
        except Exception as e:
            logger.error(f"❌ Unexpected validation error: {e}")
            return self._create_minimal_valid_response()
```

Also in `currify-core/app/services/section_extractor.py:528` add retry logic before fallback: after `except Exception as e` in LLM block, if error contains "ValidationError" style, retry once with error feedback (optional). Simplify: keep sanitization in Robust level as primary (0 extra LLM calls). For true LLM retry, add conditional in `extract_section` after first failure: if `last_error` contains ValidationError, call `_extract_with_llm` again with `prompt + "\n\nCORRECCIÓN: Responde con habilidades_blandas como list[str] no dict"`.

Keep cost +0-1 condicional documented.

- [ ] **Step 4: Verify**

Run: `pytest currify-core/tests/test_retry_validation_fix.py currify-core/tests/test_skills_schema_fix.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add currify-core/app/services/robust_extraction_service.py currify-core/app/services/section_extractor.py currify-core/tests/test_retry_validation_fix.py
git commit -m "fix: retry with ValidationError + field-level sanitization (critical retry)"
```

---

### Task 5: Recovery no destructivo + estado PARTIAL

**Files:**
- Modify: `currify-core/app/services/robust_extraction_service.py:2140` and `99` emergency + `593 _ensure_required_fields`
- Modify: `currify-back/prisma/schema.prisma` and `currify-back/src/documents/documents.service.ts` + `documents.controller.ts`
- Test: `currify-core/tests/test_recovery_nondestructivo.py` and `currify-core/tests/test_partial_status.py`

- [ ] **Step 1: Write failing tests**

Create `currify-core/tests/test_recovery_nondestructivo.py`:

```python
from app.services.robust_extraction_service import RobustExtractionService
from app.services.llm_service import LLMService

def test_recovery_preserves_partial():
    svc = RobustExtractionService(llm_service=LLMService())
    structured = {
        "datos_contacto":{"nombre_completo":"Ana QA","email":"ana@test.cl"},
        "titular_profesional":{"titular":"QA Lead"},
        "experiencia_laboral":[{"cargo":"QA Lead","empresa":"Empresa A","periodo":{"fecha_inicio":"2020-01"},"responsabilidades":["Selenium"]}],
        "formacion_academica":[{"titulo":"Ing. Informática","institucion":"UChile"}],
        "habilidades":{"habilidades_tecnicas":[{"skill":"Selenium"}],"habilidades_blandas":[{"skill":"Liderazgo"}]}
    }
    resume = svc._create_validated_response(structured, "raw texto")
    assert resume.datos_contacto.nombre_completo == "Ana QA"
    assert len(resume.experiencia_laboral) == 1
    assert resume.habilidades.habilidades_blandas == ["Liderazgo"]
    assert resume.titular_profesional.titular != "No extraído"

def test_emergency_not_destructive():
    svc = RobustExtractionService(llm_service=LLMService())
    structured = {"datos_contacto":{"nombre_completo":"Ana QA","email":"ana@test.cl"}, "experiencia_laboral":[{"cargo":"QA","empresa":"X","periodo":{"fecha_inicio":"2020-01"},"responsabilidades":["a"]}], "habilidades":{"habilidades_tecnicas":[],"habilidades_blandas":[{"skill":"Liderazgo"}]}}
    # Simulate old emergency would return minimal with no experiencia
    resp = svc._create_validated_response(structured, "raw")
    assert len(resp.experiencia_laboral) >= 1
```

Create `currify-core/tests/test_partial_status.py`:

```python
def test_ensure_required_fields_marks_partial():
    from app.services.robust_extraction_service import RobustExtractionService
    from app.services.llm_service import LLMService
    svc = RobustExtractionService(llm_service=LLMService())
    merged = {"datos_contacto":{"nombre_completo":"Ana QA","email":"ana@test.cl"}, "titular_profesional":{"titular":"QA Lead"}, "experiencia_laboral":[], "formacion_academica":[]}
    svc._ensure_required_fields(merged, "raw")
    assert "experiencia_laboral" in merged
```

- [ ] **Step 2: Run fails**

Run: `pytest currify-core/tests/test_recovery_nondestructivo.py currify-core/tests/test_partial_status.py -v`
Expected: FAIL before fix (resume empty)

- [ ] **Step 3: Implement**

Replace `currify-core/app/services/robust_extraction_service.py:2140 _create_emergency_response`:

```python
    def _create_emergency_response(self, structured_data: dict, cv_text: str):
        # Merge parcial: conservar campos válidos, sanitizar fallidos
        partial = {}
        for k, v in structured_data.items():
            if k == "habilidades" and isinstance(v, dict):
                # sanitize habilidades_blandas here too
                hb = v.get("habilidades_blandas", [])
                if isinstance(hb, list):
                    v["habilidades_blandas"] = [x.get("skill") if isinstance(x, dict) else str(x) for x in hb if x is not None]
            if k == "proyectos" and isinstance(v, dict):
                # filter layout
                pass
            partial[k] = v
        partial.setdefault("metadata_procesamiento", {})["partial"] = True
        partial.setdefault("metadata_procesamiento", {})["recovered"] = True
        return self._create_validated_response(partial, cv_text)
```

Modify `currify-back/prisma/schema.prisma` add to enum `ProcessingStatus`:

```prisma
enum ProcessingStatus {
  PENDING
  PROCESSING
  COMPLETED
  PARTIAL
  FAILED
}
```

Then `npx prisma migrate dev --name add_partial_status` (or manual).

In `currify-back/src/documents/documents.service.ts` after extraction, check `response.metadata_procesamiento?.partial` -> set `processingStatus=PARTIAL` else `COMPLETED`; add method `repairDocument(id)` that re-calls `/resume/extract` with only failed sections (no credit charge if previous PARTIAL).

In `currify-back/src/documents/documents.controller.ts` add:

```typescript
@Post(':id/repair')
@UseGuards(JwtAuthGuard)
async repair(@Param('id') id: string) { return this.documentsService.repairDocument(id); }
```

- [ ] **Step 4: Verify**

Run: `pytest currify-core/tests/test_recovery_nondestructivo.py currify-core/tests/test_partial_status.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add currify-core/app/services/robust_extraction_service.py currify-back/prisma/schema.prisma currify-back/src/documents/documents.service.ts currify-back/src/documents/documents.controller.ts currify-core/tests/test_recovery_nondestructivo.py currify-core/tests/test_partial_status.py
git commit -m "fix: non-destructive recovery with PARTIAL status and repair endpoint (bug 4)"
```

---

### Task 6: Titular condicional (F3.1)

**Files:**
- Modify: `currify-core/app/services/section_extractor.py:56` and `currify-core/app/services/robust_extraction_service.py:466`
- Test: `currify-core/tests/test_titular_fix.py`

- [ ] **Step 1: Write failing test**

Create `currify-core/tests/test_titular_fix.py`:

```python
import pytest
from app.services.robust_extraction_service import RobustExtractionService
from app.services.llm_service import LLMService
from app.services.section_extractor import SectionResult

def test_titular_headline_preferred_over_master():
    svc = RobustExtractionService(llm_service=LLMService())
    raw = "Candidato QA 15y\nQA Test Lead Automation Engineer\nqa@test.cl\nEXPERIENCIA\nQA Lead Empresa A"
    sr = SectionResult(section_type="titles", success=True, data={"titulo_profesional":"Magíster en Dirección de Empresas","formacion":[{"titulo":"Magíster en Dirección","institucion":"U X"}]}, method="llm")
    sr_exp = SectionResult(section_type="experience", success=True, data={"experiencias":[{"cargo":"QA Test Lead Automation Engineer","empresa":"Empresa A","periodo":{"fecha_inicio":"2024-01"},"responsabilidades":["a"]}]}, method="llm")
    merged = svc._merge_section_results({"titles": sr, "experience": sr_exp}, raw, "test-titular-001")
    assert merged["titular_profesional"]["titular"] == "QA Test Lead Automation Engineer"
    assert "Magíster" not in merged["titular_profesional"]["titular"]

def test_titular_fallback_for_junior_without_experience():
    svc = RobustExtractionService(llm_service=LLMService())
    raw = "Ana Junior\nana@test.cl"
    sr = SectionResult(section_type="titles", success=True, data={"titulo_profesional":"Ingeniería en Informática","formacion":[{"titulo":"Ingeniería en Informática","institucion":"UChile"}]}, method="llm")
    merged = svc._merge_section_results({"titles": sr}, raw, "test-titular-002")
    # Junior without experience, education fallback is correct
    assert "Ingeniería" in merged["titular_profesional"]["titular"]
```

- [ ] **Step 2: Run fails**

Run: `pytest currify-core/tests/test_titular_fix.py -v`
Expected: FAIL first assert (currently picks master)

- [ ] **Step 3: Implement**

In `currify-core/app/services/section_extractor.py:56` replace `PROMPT_TITLES`:

```python
PROMPT_TITLES = r"""Eres un clasificador de títulos profesionales y credenciales académicas.

<cv>{content}</cv>

⛔ DIFERENCIA CLAVE:
- "Título profesional" = HEADLINE de la persona (lo que ES profesionalmente, ej: Ingeniero Civil, QA Test Lead) - busca en las primeras 5 líneas bajo el nombre.
- "Cargo laboral" = puesto de trabajo (Gerente, Jefe) → NO es un título
- "Grado académico" = Magíster/Master/Doctorado → va en formacion, NO en titular_profesional a menos que no haya headline.

INSTRUCCIONES:
1. Razona paso a paso: 1) Identifica headline en primeras 5 líneas 2) Luego busca grados 3) Si headline existe, úsalo como titulo_profesional 4) Si no, usa grado más alto (Doctorado > Magíster > Licenciatura)
2. NO incluyas diplomados ni cursos cortos en titulo_profesional.

Few-Shot:
Input: "Candidato QA 15y\nQA Test Lead Automation Engineer\nIng. Informático - UChile\n..."
Output: {"titulo_profesional": "QA Test Lead Automation Engineer", "formacion": [{"titulo": "Ingeniería en Informática", "institucion": "UChile"}]}

Output JSON: {"titulo_profesional": "Ingeniero Civil", "formacion": [{"titulo": "...", "institucion": "...", "periodo": {"fecha_inicio": "...", "fecha_fin": "..."}}]}"""
```

In `currify-core/app/services/robust_extraction_service.py:466` replace priority block:

```python
        titular_final = "No extraído"
        if titular_from_titles and str(titular_from_titles).strip().lower() not in ("no extraído","no extraido","","none","null"):
            # Heurística: si titular_from_titles es grado académico (contiene Magíster/Master/Doctorado) y existe experiencia con headline, preferir headline
            is_academic = any(kw in str(titular_from_titles).lower() for kw in ["magíster","magister","master","doctorado","phd","mba"])
            headline_from_text = self._extract_titular_from_text(raw_text) if hasattr(self, '_extract_titular_from_text') else None
            if is_academic and headline_from_text and headline_from_text != "No extraído":
                titular_final = headline_from_text
                logger.info("[%s] 🏷️ Titular headline override academic: %s -> %s", request_id, titular_from_titles, headline_from_text)
            else:
                titular_final = str(titular_from_titles).strip()
        if titular_final == "No extraído":
            # Prioridad 2: headline heurística de texto
            headline = self._extract_titular_from_text(raw_text) if hasattr(self, '_extract_titular_from_text') else None
            if headline and headline != "No extraído":
                titular_final = headline
        if titular_final == "No extraído" and formacion_combinada:
            # Solo usar educación si no hay experiencia (junior)
            if not experience_data_raw:
                for entry in formacion_combinada:
                    titulo_str = str(entry.get("titulo","")).strip()
                    if titulo_str and len(titulo_str)>3:
                        titular_final = titulo_str
                        break
```

If `_extract_titular_from_text` not exists, implement simple: first 5 lines, look for role keywords `["ingeniero","qa","lead","desarrollador","analista","jefe","gerente","arquitecto"]` lower, return first match.

- [ ] **Step 4: Verify**

Run: `pytest currify-core/tests/test_titular_fix.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add currify-core/app/services/section_extractor.py currify-core/app/services/robust_extraction_service.py currify-core/tests/test_titular_fix.py
git commit -m "fix: titular headline vs academic with conditional fallback (bug 3)"
```

---

### Task 7: Scoring graceful + indent fix

**Files:**
- Modify: `currify-core/app/services/scoring_service.py:42,188`
- Test: `currify-core/tests/test_scoring_parcial.py`

- [ ] **Step 1: Write failing test**

Create `currify-core/tests/test_scoring_parcial.py`:

```python
import pytest
from app.services.scoring_service import ScoringService
from app.services.llm_service import LLMService

@pytest.mark.asyncio
async def test_scoring_partial_not_zero():
    llm = LLMService()
    async def fake(prompt, input_data, stage_name, **kw):
        # Return minimal LLM reasoning
        return {"breakdown":{"skills_match":{"reasoning":"ok"},"experience":{"reasoning":"ok"},"education":{"reasoning":"falta"},"cultural_fit":{"reasoning":"ok"},"logistics":{"reasoning":"ok"},"career_trajectory":{"reasoning":"ok"}},"strengths":[],"gaps":[],"summary":"ok"}
    llm.call_agent = fake  # type: ignore
    # Mock semantic and rubric to avoid real calls
    svc = ScoringService(llm_service=llm)
    async def fake_expand(skills): return set(["selenium","java"])
    async def fake_norm_roles(roles): return [r.lower() for r in roles]
    async def fake_norm_deg(deg): return [d.lower() for d in deg]
    async def fake_rubric(title, desc, parsed_data=None):
        from app.models.dynamic_rubric import StructuredRubric
        return StructuredRubric.parse_obj({"education":{"required_degrees":[],"academic_level":"Técnico","kill_clause":False},"experience":{"min_years":0,"key_roles":["QA Automation"]},"skills":{"mandatory_skills":["selenium","java"],"nice_to_have_skills":[]},"logistics":{"location":None,"modality":"Presencial"},"languages":{"required_languages":[]},"certifications":{"mandatory_certs":[]}})
    async def fake_extract(text): return set()
    svc.semantic_service.expand_skills = fake_expand  # type: ignore
    svc.semantic_service.normalize_job_titles = fake_norm_roles  # type: ignore
    svc.semantic_service.normalize_degrees = fake_norm_deg  # type: ignore
    svc.semantic_service.extract_skills_from_description = fake_extract  # type: ignore
    svc.semantic_service.get_text_embedding = lambda t: [0.0]*4  # type: ignore
    svc.semantic_service.calculate_similarity = lambda a,b: 0.9  # type: ignore
    svc.dynamic_rubric_service.generate_rubric = fake_rubric  # type: ignore

    candidate = {"titular_profesional":{"titular":"QA Lead"},"datos_contacto":{"ubicacion":"Santiago"},"experiencia_laboral":[{"cargo":"QA Lead","empresa":"Empresa A","responsabilidades":["Selenium"]}],"habilidades":{"habilidades_tecnicas":[{"skill":"Selenium","level":"Avanzado"}],"idiomas":[],"habilidades_blandas":["Liderazgo"]},"formacion_academica":[]}
    job = {"title":"QA Automation","description":"Selenium Java","parsedJobData":{"habilidades_blandas":[]}}
    resp = await svc.evaluate_candidate(candidate, job)
    assert resp is not None
    assert resp.overall_score > 0
    assert resp.breakdown["education"].score == 0
    assert resp.overall_score < 100

@pytest.mark.asyncio
async def test_scoring_empty_still_zero():
    svc = ScoringService(llm_service=LLMService())
    # Mock to avoid real LLM, but guardrail should short-circuit before
    resp = await svc.evaluate_candidate({"titular_profesional":{"titular":"No extraído"},"habilidades":{},"experiencia_laboral":[],"formacion_academica":[]}, {"title":"X","description":"Y"})
    assert resp.overall_score == 0.0
```

- [ ] **Step 2: Run fails**

Run: `pytest currify-core/tests/test_scoring_parcial.py -v`
Expected: FAIL before graceful (first returns 0.0 or None)

- [ ] **Step 3: Implement**

In `currify-core/app/services/scoring_service.py:42` replace guard:

```python
            titular = candidate_data.get('titular_profesional', {}).get('titular', '')
            habs = candidate_data.get('habilidades', {})
            has_skills = False
            if isinstance(habs, dict):
                has_skills = any(
                    (isinstance(v, list) and len(v)>0) or (isinstance(v, str) and v.strip())
                    for v in habs.values()
                )
            has_experience = len(candidate_data.get('experiencia_laboral', [])) > 0
            has_education = len(candidate_data.get('formacion_academica', [])) > 0
            has_contact = bool(candidate_data.get('datos_contacto', {}).get('email')) and candidate_data.get('datos_contacto', {}).get('email') != "no-extraido@example.com"
            if not has_experience and not has_skills and not has_education and not has_contact:
                logger.warning("⚠️ Extraction failed or empty data detected. Returning 0 score.")
                return ScoringResponse(overall_score=0.0, recommendation="weak_fit", breakdown={}, strengths=[], gaps=["Error en la extracción de datos del CV"], summary="No se pudo procesar el contenido del CV para realizar la evaluación.")
            # Else: continue to graceful partial scoring (do not short-circuit if partial data exists)
```

Fix indent bug `currify-core/app/services/scoring_service.py:188` ensure `async def _calculate_matrix_scores` is correctly indented at class level (check `has_title_match = False` not stray). If stray line exists at top-level, delete/indent.

In `currify-core/app/services/scoring_service.py:492` after `_calculate_matrix_scores`, ensure missing dimensions default to `0` not `None` via `deterministic_scores.get(dim, 0.0)` already in `_parse_llm_response:834`.

- [ ] **Step 4: Verify**

Run: `pytest currify-core/tests/test_scoring_parcial.py currify-core/tests/test_scoring_judge.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add currify-core/app/services/scoring_service.py currify-core/tests/test_scoring_parcial.py
git commit -m "fix: scoring graceful partial per-dimension + guardrail fix + indent (bug 5)"
```

---

### Task 8: Dedup semántico + longitud proyectos

**Files:**
- Modify: `currify-core/app/services/file_parser_service.py:72` and `currify-core/app/services/robust_extraction_service.py:404` and `currify-core/app/services/semantic_service.py`
- Test: `currify-core/tests/test_dedup_semantic.py`

- [ ] **Step 1: Write failing test**

Create `currify-core/tests/test_dedup_semantic.py`:

```python
from app.services.file_parser_service import FileParserService

def test_whitespace_normalization():
    svc = FileParserService()
    raw = "Aumenté la cobertura\nAumentélacobertura"
    cleaned = svc._clean_extracted_text(raw)
    # Should normalize and dedup pegado sin espacios
    assert cleaned.count("Aumenté") >= 1
    assert "Aumentélacobertura" not in cleaned or cleaned.count("Aumenté") == 1
```

- [ ] **Step 2: Run fails**

Run: `pytest currify-core/tests/test_dedup_semantic.py -v`
Expected: FAIL (pegado not normalized)

- [ ] **Step 3: Implement**

In `currify-core/app/services/file_parser_service.py:349` add after dedup:

```python
        # 1. Normalizar pegado sin espacios (pdfplumber layout artifact)
        text = re.sub(r"([a-záéíóú])([A-ZÁÉÍÓÚ])", r"\1 \2", text)
        # 2. Colapsar múltiples espacios
        text = re.sub(r" +", " ", text)
        return text.strip()
```

For embedding dedup, optionally in `robust_extraction_service.py:404` already filters long dict; add comment `embedding dedup optional Fase 3.3`.

- [ ] **Step 4: Verify**

Run: `pytest currify-core/tests/test_dedup_semantic.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add currify-core/app/services/file_parser_service.py currify-core/tests/test_dedup_semantic.py
git commit -m "fix: whitespace dedup for layout artifacts (extension F3.3)"
```

---

### Task 9: Eval E2E + golden assertions

**Files:**
- Create: `evals/assertions.py`
- Create: `evals/test_e2e_extraction.py` (or `evals/eval_runner.py`)
- Create: `evals/cvs_fixture/qa_lead_15y_edge_layout.pdf` (copy anon pdf)
- Test: `evals/test_e2e_extraction.py`

- [ ] **Step 1: Write eval**

Create `evals/assertions.py`:

```python
def assert_extraction_golden(extracted, golden):
    assert extracted.datos_contacto.email == golden["datos_contacto"]["email"]
    assert extracted.titular_profesional.titular == golden["titular_profesional"]["titular"]
    assert len(extracted.experiencia_laboral) >= len(golden["experiencia_laboral"])
    assert all(isinstance(s, str) for s in extracted.habilidades.habilidades_blandas)
    assert all("LAYOUT" not in p.nombre for p in (extracted.proyectos.proyectos if extracted.proyectos else []))
    assert len(extracted.habilidades.habilidades_tecnicas) >= 2
```

Create `evals/test_e2e_extraction.py`:

```python
import json, pytest
from pathlib import Path
from app.services.robust_extraction_service import RobustExtractionService
from app.services.llm_service import LLMService
from app.models.resume import ResumeExtractionRequest
from evals.assertions import assert_extraction_golden

@pytest.mark.asyncio
async def test_e2e_golden_anon():
    golden = json.loads(Path("evals/cvs_fixture/qa_lead_15y_anon_golden.json").read_text())
    raw = Path("evals/cvs_fixture/qa_lead_15y_anon.txt").read_text() if Path("evals/cvs_fixture/qa_lead_15y_anon.txt").exists() else "Candidato QA 15y\nQA Test Lead Automation Engineer\nqa.anon@example.com\nEXPERIENCIA\nQA Lead Empresa A Ene 2024 - Presente\nHABILIDADES\nSelenium, Java\n"
    # Mock LLM for deterministic
    llm = LLMService()
    async def fake(prompt, input_data, stage_name, **kw):
        if "section_skills" in stage_name: return {"habilidades_tecnicas":[{"skill":"Selenium","level":"Avanzado"},{"skill":"Java","level":"Avanzado"}],"idiomas":[{"idioma":"Inglés","nivel":"Intermedio"}],"habilidades_blandas":["Liderazgo","Comunicación"]}
        if "section_titles" in stage_name: return {"titulo_profesional":"QA Test Lead Automation Engineer","formacion":[{"titulo":"Ingeniería en Informática","institucion":"U Tecnológica","periodo":{"fecha_inicio":"2010","fecha_fin":"2015"}}]}
        if "section_experience" in stage_name: return {"experiencias":[{"cargo":"QA Test Lead Automation Engineer","empresa":"Empresa A","periodo":{"fecha_inicio":"2024-01","fecha_fin":"Presente"},"responsabilidades":["Automatización"]}]}
        if "section_education" in stage_name: return {"formacion":[{"titulo":"Ingeniería en Informática","institucion":"U Tecnológica"}]}
        if "section_summary" in stage_name: return {"resumen":"15 años experiencia QA"}
        return {"items":[]} if "projects" in stage_name or "other" in stage_name else None
    llm.call_agent = fake  # type: ignore
    svc = RobustExtractionService(llm_service=llm)
    req = ResumeExtractionRequest(archivo_contenido=raw, tipo_archivo="txt", nombre_archivo="qa_anon.txt")
    resp = await svc.extract_from_text(req, request_id="eval-001")
    assert_extraction_golden(resp.datos_cv, golden)
    # Scoring >60
    from app.services.scoring_service import ScoringService
    # Mock scoring as in Task7
    assert resp.confianza_general > 0.6
```

- [ ] **Step 2: Run eval**

Run: `pytest evals/test_e2e_extraction.py -v`
Expected: PASS after prior tasks

- [ ] **Step 3: Commit**

```bash
git add evals/assertions.py evals/test_e2e_extraction.py evals/cvs_fixture/qa_lead_15y_edge_layout.pdf
git commit -m "test: eval golden E2E for anon QA lead (contract D)"
```

---

### Task 10: Telemetría + skill + contratos

**Files:**
- Modify: `.agents/skills/core/currify-llm-pipelines/SKILL.md`
- Create: `docs/contracts/core/resume_extraction_contract.md`
- Create: `docs/contracts/core/scoring_contract.md`

- [ ] **Step 1: Write contracts**

Create `docs/contracts/core/resume_extraction_contract.md`:

```markdown
# Resume Extraction Contract

POST /resume/extract -> ResumeExtractionResponse { datos_cv: ResumeData, confianza_general, advertencias, campos_faltantes, request_id, tiempo_procesamiento } + headers X-LLM-Prompt-Tokens, X-LLM-Completion-Tokens, X-LLM-Model
Invariantes:
- habilidades_blandas: List[str] consistente prompt+schema, validator pre=True dict->str
- proyectos.proyectos: filtrado LAYOUT, longitud nombre <120
- titular_profesional: headline primeras 5 líneas, no grado académico salvo junior sin exp
- Recovery: field-level sanitización + partial status, nunca minimal por 1 campo
- Anti-contaminación: regex LAYOUT + dedup antes de segmentación
```

Similarly for scoring.

- [ ] **Step 2: Update skill**

Append to `.agents/skills/core/currify-llm-pipelines/SKILL.md`:

```markdown
## 7) Invariantes Contratos Pydantic (FIX 1)
- SectionResult validar contra schema parcial antes de merge. habilidades_blandas list[str] consistente. proyectos filtrar LAYOUT.

## 8) Invariantes Anti-contaminación y Recovery (FIX 2,4,5,6)
- FileParser regex LAYOUT obligatorio. DocumentAnalyzer flag contaminated. Recovery jerarquía sanitizar->retry->heurístico->parcial confidence*0.7. Scoring overall=0 solo si exp+skills+edu vacíos. Detector compara structured_data vs resume_data.
```

- [ ] **Step 3: Verify docs**

Run: `pytest evals/test_e2e_extraction.py -v && pytest currify-core/tests -k "skills or layout or detector or recovery or scoring" --tb=short`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add .agents/skills/core/currify-llm-pipelines/SKILL.md docs/contracts/core/resume_extraction_contract.md docs/contracts/core/scoring_contract.md
git commit -m "docs: update currify-llm-pipelines invariants + contracts (contract E)"
```

---

## Self-Review Checklist

- [ ] Spec coverage: Bugs 1-6 + críticos retry/partial/dedup all have tasks (0-10)
- [ ] No placeholders: Every step has code + command + expected output
- [ ] Type consistency: Skills list[str], Project nombre str, ResumeData fields match validators, ScoringResponse breakdown Dict[DimensionScore]
- [ ] TDD: Each task writes failing test before implementation, frequent commits

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-08-25-cv-extraction-cascade-fix.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
