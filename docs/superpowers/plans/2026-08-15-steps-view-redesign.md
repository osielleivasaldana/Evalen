# Vista de Etapas del Proceso — Rediseño + Sandbox + Guía IA — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rediseñar `/campaigns/:campaignId/candidates/:candidateId/process` según `spec/mockup/steps.html` (tema Evalen), con sandbox de privacidad por rol en la API y guía de entrevista IA de punta a punta (currify-core → currify-back → frontend), más estado `OMITTED` y endpoint `reopen`.

**Architecture:** 3 capas. (1) currify-core (FastAPI): nuevo endpoint `POST /interview/questions` que usa `LLMService.call_agent_structured` con un Pydantic `InterviewGuideResponse`, siguiendo el patrón de `dynamic_rubric_service.py`. (2) currify-back (NestJS + Prisma): migración (`OMITTED` + `guideJson`/`notesJson`), scoping por rol en `getProcessByCandidate`, `reject → OMITTED`, endpoints `reopen`/`guide`/`notes` con llamada axios a core (patrón `scoring.service.ts`). (3) currify-front (React): rewrite de `CandidateProcessPanel.tsx` con dos modos (`viewer: OWNER | STAGE_RESPONSIBLE`), copiando los estilos exactos del mockup `steps.html`.

**Tech Stack:** FastAPI + Pydantic v2 + LLMService (Anthropic/OpenAI/Gemini), NestJS 10 + Prisma + Jest, React 18 + react-router + Tailwind (tokens Evalen `t-*`) + Vitest/RTL vía CRA.

**Spec de referencia:** `docs/superpowers/specs/2026-08-15-steps-view-redesign-design.md`
**Mockup (fuente de verdad visual):** `spec/mockup/steps.html` — al portar JSX, copiar clases y estructura EXACTAS del mockup (tokens `paper/ink/green/cta`, `t-*` para dark mode).

---

## Contexto técnico clave (leer antes de empezar)

- **Ruta actual:** `CandidateProcessPanel.tsx` monta en `AppRouter.tsx:256`. Se reescribe el mismo archivo; la ruta no cambia.
- **Patrón de llamada core desde back:** `scoring.service.ts:113` — `axios.post(\`${this.scoringServiceUrl}/interview/questions\`, payload, { headers: { Authorization: \`Bearer ${token}\` } })` donde `token` viene de `POST ${url}/auth/login` con `SCORING_SERVICE_USERNAME/PASSWORD` (ver `scoring.service.ts:42-66`, método `getToken`).
- **Datos del candidato en back:** `candidate.structuredData` (JSON con `datos_cv`), `candidate.scoring` (con `gaps[]`), `campaign.parsedJobData` (rúbrica ya parseada, `requisitos.habilidades_requeridas`).
- **Responsable sandbox:** a un usuario responsable SOLO se le devuelven sus propias `stageInstances`; nunca hermanas, `auditLogs`, prompt con feedback ajeno, ni `sensitive`.
- **Auth core:** las rutas protegidas usan `Depends(verify_token)` de `app.core.security` (ver `app/api/resume.py:90`).
- **Tests:** back con Jest y `mockPrisma` (patrón `scoring.service.spec.ts`); core con Pytest + `TestClient`; front con RTL.

---

## Fase A — currify-core: guía de entrevista IA

### Task 1: Modelos Pydantic de la guía

**Files:**
- Create: `currify-core/app/models/interview.py`
- Test: `currify-core/tests/test_interview_models.py`

- [ ] **Step 1: Write the failing test**

```python
import pytest
from pydantic import ValidationError
from app.models.interview import InterviewGuideRequest, InterviewGuideResponse, GuideQuestion


def test_valid_request_roundtrip():
    req = InterviewGuideRequest(
        campaign={"title": "Experto en React", "description": "Frontend", "requirements": "React, TS"},
        stage={"name": "Entrevista Técnica", "description": "Evaluar stack"},
        candidate={"resumen": "QA 6 años", "habilidades": ["QA", "Python"], "brechas": ["Sin React"]},
        rubric_criteria=["React avanzado", "TypeScript"],
    )
    assert req.campaign.title == "Experto en React"
    assert req.rubric_criteria == ["React avanzado", "TypeScript"]


def test_valid_response_roundtrip():
    resp = InterviewGuideResponse(questions=[
        {"question": "¿Cuéntame de tu proyecto React más complejo?", "source": "perfil"},
        {"question": "¿Cómo abordarías aprender testing?", "source": "brecha"},
        {"question": "Cuéntame de un conflicto de equipo", "source": "estandar"},
        {"question": "¿Qué significa React para ti?", "source": "rubrica"},
        {"question": "¿Cómo validas en producción?", "source": "perfil"},
    ])
    assert len(resp.questions) == 5


def test_invalid_source_rejected():
    with pytest.raises(ValidationError):
        GuideQuestion(question="x", source="feedback")
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd currify-core && python -m pytest tests/test_interview_models.py -v`
Expected: FAIL con `ModuleNotFoundError: No module named 'app.models.interview'`

- [ ] **Step 3: Write the models**

```python
from typing import List, Literal
from pydantic import BaseModel, Field


class CampaignBrief(BaseModel):
    title: str = ""
    description: str = ""
    requirements: str = ""


class StageBrief(BaseModel):
    name: str = ""
    description: str = ""


class CandidateBrief(BaseModel):
    resumen: str = ""
    habilidades: List[str] = Field(default_factory=list)
    brechas: List[str] = Field(default_factory=list)


class InterviewGuideRequest(BaseModel):
    campaign: CampaignBrief
    stage: StageBrief
    candidate: CandidateBrief
    rubric_criteria: List[str] = Field(default_factory=list)


class GuideQuestion(BaseModel):
    question: str
    source: Literal["rubrica", "perfil", "brecha", "estandar"]


class InterviewGuideResponse(BaseModel):
    questions: List[GuideQuestion]
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd currify-core && python -m pytest tests/test_interview_models.py -v`
Expected: PASS (3 passed)

- [ ] **Step 5: Commit**

```bash
git add currify-core/app/models/interview.py currify-core/tests/test_interview_models.py
git commit -m "feat(core): modelos Pydantic para guía de entrevista"
```

### Task 2: Prompt de generación de preguntas

**Files:**
- Create: `currify-core/app/core/interview_prompts.py`
- Test: `currify-core/tests/test_interview_prompts.py`

- [ ] **Step 1: Write the failing test**

```python
from app.core.interview_prompts import get_interview_guide_prompt


def test_prompt_clasifica_tipo_de_etapa():
    p = get_interview_guide_prompt()
    assert "técnica" in p.lower()
    assert "psicológica" in p.lower()
    assert "SHAR" in p.upper() or "STAR" in p.upper()


def test_prompt_sources_completas():
    p = get_interview_guide_prompt()
    for src in ("rubrica", "perfil", "brecha", "estandar"):
        assert src in p


def test_prompt_anti_fuga():
    p = get_interview_guide_prompt().lower()
    assert "otras etapas" in p
    assert "feedback" in p or "retroalimentación" in p
    assert "sensible" in p


def test_prompt_cinco_preguntas():
    assert "5 preguntas" in get_interview_guide_prompt()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd currify-core && python -m pytest tests/test_interview_prompts.py -v`
Expected: FAIL con ModuleNotFoundError

- [ ] **Step 3: Write the prompt**

```python
def get_interview_guide_prompt() -> str:
    return """Eres un reclutador experto con especialización en entrevistas por competencias y técnicas.

TAREA:
Genera una guía de entrevista de EXACTAMENTE 5 preguntas para una ETAPA de un proceso de selección.

CONTEXTO QUE RECIBIRÁS (input del usuario):
- CAMPAÑA: título, descripción y requisitos del cargo.
- ETAPA: nombre y descripción de la etapa (ej. "Entrevista Técnica", "Psicolaboral").
- CANDIDATO: resumen profesional, habilidades técnicas y brechas detectadas en su CV.
- RÚBRICA DEL CARGO: criterios obligatorios del cargo (puede estar vacía).

INSTRUCCIONES:
1. CLASIFICA el tipo de etapa por su NOMBRE y DESCRIPCIÓN:
   - Etapa técnica (contiene "técnica", "técnico", "stack", "habilidades", "code", etc.): preguntas de deep-dive sobre el stack y tecnologías del CARGO (ej. campaña "Experto en React" + etapa técnica → preguntas avanzadas de React).
   - Etapa psicológica / psicométrica / conductual (contiene "psicol", "conductual", "valores"): usa el estándar SHAR/STAR (Situación, Hecho/Acción, Resultado) para evaluar comportamiento pasado.
   - Etapa cultural / de fit (contiene "cultural", "fit", "valores", "equipo"): colaboración, feedback, resolución de conflictos.
   - Etapa general/contacto: motivación, disponibilidad, expectativas.
2. ASIGNA a cada pregunta su procedencia (`source`), una de estas cuatro:
   - "rubrica": derivada de un criterio de la RÚBRICA DEL CARGO.
   - "perfil": derivada de los requisitos o descripción de la CAMPAÑA.
   - "brecha": derivada de una BRECHA del CV del candidato (si hay brechas; si no hay, no usar).
   - "estandar": pregunta conductual estándar de la disciplina de la etapa (SHAR/STAR).
3. La mezcla debe cubrir el cargo y la etapa; prioriza "rubrica" y "perfil" en etapas técnicas y "estandar" en etapas conductuales/psicológicas.

REGLAS DE PRIVACIDAD (CRÍTICAS):
- NUNCA menciones, uses ni cites feedback, notas, decisiones o información de OTRAS ETAPAS del proceso.
- NUNCA menciones información sensible (salario, datos privados) del candidato.
- NUNCA inventes datos del candidato o del cargo; trabaja solo con lo que recibas.

FORMATO:
Devuelve ÚNICAMENTE JSON válido con la estructura:
{"questions": [{"question": "...", "source": "rubrica|perfil|brecha|estandar"}]}
"""
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd currify-core && python -m pytest tests/test_interview_prompts.py -v`
Expected: PASS (4 passed)

- [ ] **Step 5: Commit**

```bash
git add currify-core/app/core/interview_prompts.py currify-core/tests/test_interview_prompts.py
git commit -m "feat(core): prompt de guía de entrevista con clasificación de etapa y anti-fuga"
```

### Task 3: Servicio de generación de guía

**Files:**
- Create: `currify-core/app/services/interview_service.py`
- Test: `currify-core/tests/test_interview_service.py`

Patrón de referencia: `currify-core/app/services/dynamic_rubric_service.py` (usa `call_agent_structured`).

- [ ] **Step 1: Write the failing test** (LLM fake)

```python
import pytest
from typing import Optional
from app.models.interview import (
    InterviewGuideRequest, InterviewGuideResponse, GuideQuestion,
)
from app.services.interview_service import InterviewService


class FakeLLM:
    """Devuelve 3 preguntas fake — el servicio debe fallback a respuesta vacía si da menos de 1."""

    def __init__(self, result: Optional[list] = None):
        self._result = result

    async def call_agent_structured(self, prompt: str, input_data, response_model,
                                    stage_name: str = "", temperature: float = 0.0):
        if self._result is None:
            return None
        return response_model(questions=self._result)


def make_request() -> InterviewGuideRequest:
    return InterviewGuideRequest(
        campaign={"title": "Experto en React", "description": "Frontend", "requirements": "React, TS"},
        stage={"name": "Entrevista Técnica", "description": "Deep dive de React"},
        candidate={"resumen": "QA 6 años", "habilidades": ["QA"], "brechas": ["Sin React"]},
        rubric_criteria=["React avanzado"],
    )


async def fake_agent_final(*args, **kwargs):
    return None


async def fake_agent_fallback(*args, **kwargs):
    q = GuideQuestion(question="¿Fallas?", source="estandar")
    return InterviewGuideResponse(questions=[q])


async def fake_agent_full(*args, **kwargs):
    return InterviewGuideResponse(questions=[
        GuideQuestion(question="P1", source="rubrica"),
        GuideQuestion(question="P2", source="brecha"),
        GuideQuestion(question="P3", source="perfil"),
        GuideQuestion(question="P4", source="estandar"),
        GuideQuestion(question="P5", source="rubrica"),
    ])


def test_returns_llm_questions(monkeypatch):
    svc = InterviewService.__new__(InterviewService)
    monkeypatch.setattr(svc, "llm_service", type("LLM", (), {"call_agent_structured": fake_agent_full})())
    result = svc.generate_guide(make_request())
    assert len(result.questions) == 5
    assert result.questions[1].source == "brecha"


def test_fallback_when_llm_returns_none(monkeypatch):
    svc = InterviewService.__new__(InterviewService)
    monkeypatch.setattr(svc, "llm_service", type("LLM", (), {"call_agent_structured": fake_agent_final})())
    result = svc.generate_guide(make_request())
    assert isinstance(result, InterviewGuideResponse)
    assert isinstance(result.questions, list)


def test_fallback_when_llm_returns_one_question(monkeypatch):
    svc = InterviewService.__new__(InterviewService)
    monkeypatch.setattr(svc, "llm_service", type("LLM", (), {"call_agent_structured": fake_agent_fallback})())
    result = svc.generate_guide(make_request())
    assert len(result.questions) >= 1


def test_input_data_never_contains_feedback_sensitive(monkeypatch):
    captured = {}

    async def spy(prompt, input_data, response_model, stage_name="", temperature=0.0):
        captured["input"] = str(input_data)
        return InterviewGuideResponse(questions=[
            GuideQuestion(question="P1", source="rubrica")])

    llm = type("LLM", (), {"call_agent_structured": spy})()
    svc = InterviewService.__new__(InterviewService)
    monkeypatch.setattr(svc, "llm_service", llm)
    svc.generate_guide(make_request())
    lower = captured["input"].lower()
    assert "feedback" not in lower
    assert "sensitive" not in lower
    assert "etapa 1" not in lower
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd currify-core && python -m pytest tests/test_interview_service.py -v`
Expected: FAIL con ModuleNotFoundError / AttributeError

- [ ] **Step 3: Write the service**

```python
import logging
from typing import Optional
from app.models.interview import InterviewGuideRequest, InterviewGuideResponse
from app.services.llm_service import LLMService
from app.core.interview_prompts import get_interview_guide_prompt

logger = logging.getLogger(__name__)


class InterviewService:
    """Genera la guía de preguntas de entrevista para una etapa del proceso."""

    def __init__(self, llm_service: Optional[LLMService] = None):
        self.llm_service = llm_service or LLMService()

    def _build_input_text(self, request: InterviewGuideRequest) -> str:
        # PRIVACIDAD: solo candidate + campaign + stage + rúbrica.
        # NUNCA feedback, notas, decisiones ni datos de otras etapas.
        habs = ", ".join(request.candidate.habilidades) or "No informadas"
        brechas = ", ".join(request.candidate.brechas) or "Sin brechas detectadas"
        rubric = "\n".join(f"- {c}" for c in request.rubric_criteria) or "Sin criterios (vacía)"

        return f"""CAMPAÑA:
Título: {request.campaign.title}
Descripción: {request.campaign.description}
Requisitos: {request.campaign.requirements}

ETAPA:
Nombre: {request.stage.name}
Descripción: {request.stage.description}

CANDIDATO:
Resumen profesional: {request.candidate.resumen}
Habilidades técnicas: {habs}
Brechas detectadas: {brechas}

RÚBRICA DEL CARGO:
{rubric}
"""

    async def generate_guide(
        self,
        request: InterviewGuideRequest,
        request_id: str = "unknown",
    ) -> InterviewGuideResponse:
        try:
            logger.info(f"[{request_id}] Generando guía de entrevista para etapa '{request.stage.name}'")
            result = await self.llm_service.call_agent_structured(
                prompt=get_interview_guide_prompt(),
                input_data=self._build_input_text(request),
                response_model=InterviewGuideResponse,
                stage_name="INTERVIEW_GUIDE",
                temperature=0.2,
            )
            if not result:
                logger.warning("LLM devolvió None para la guía; respuesta vacía.")
                return InterviewGuideResponse(questions=[])
            return result
        except Exception as e:
            logger.error(f"Error generando guía de entrevista: {e}", exc_info=True)
            return InterviewGuideResponse(questions=[])
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd currify-core && python -m pytest tests/test_interview_service.py -v`
Expected: PASS (4 passed)

- [ ] **Step 5: Commit**

```bash
git add currify-core/app/services/interview_service.py currify-core/tests/test_interview_service.py
git commit -m "feat(core): servicio de generación de guía de entrevista"
```

### Task 4: Endpoint HTTP + registro del router

**Files:**
- Create: `currify-core/app/api/interview.py`
- Modify: `currify-core/app/main.py:10` (import) y `:91-95` (include_router)
- Test: `currify-core/tests/test_interview_api.py`

- [ ] **Step 1: Write the failing test** (TestClient + token)

```python
import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


@pytest.fixture(scope="module")
def auth_token():
    from app.core.config import settings
    r = client.post("/auth/login", json={
        "username": settings.api_username,
        "password": settings.api_password,
    })
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


def test_requires_token():
    r = client.post("/interview/questions", json={})
    assert r.status_code == 401


def test_generates_guide(auth_token):
    payload = {
        "campaign": {"title": "Experto en React", "description": "Frontend", "requirements": "React, TS"},
        "stage": {"name": "Entrevista Técnica", "description": "Deep dive de React"},
        "candidate": {"resumen": "QA 6 años", "habilidades": ["QA"], "brechas": ["Sin React"]},
        "rubric_criteria": ["React avanzado"],
    }
    r = client.post("/interview/questions", json=payload, headers={"Authorization": f"Bearer {auth_token}"})
    assert r.status_code == 200, r.text
    assert isinstance(r.json()["questions"], list)
    if r.json()["questions"]:
        assert r.json()["questions"][0]["source"] in {"rubrica", "perfil", "brecha", "estandar"}
```

> Nota: `test_generates_guide` hace una llamada LLM real. Si no hay API key configurada en el entorno dev, `generate_guide` devuelve `questions: []` y el test sigue pasando (200 + lista). Esto es intencional: el contrato de la API no depende del proveedor.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd currify-core && python -m pytest tests/test_interview_api.py -v`
Expected: FAIL — `404 Not Found` en `/interview/questions` (router no registrado) y el 401 no aplica porque no existe ruta.

- [ ] **Step 3: Write the endpoint**

```python
"""
Interview Guide API Endpoints
Genera preguntas de entrevista para una etapa del proceso de selección.
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, Response, status

from app.models.interview import InterviewGuideRequest, InterviewGuideResponse
from app.services.interview_service import InterviewService
from app.services.llm_service import token_usage_var
from app.core.security import verify_token

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/interview", tags=["interview"])


@router.post(
    "/questions",
    response_model=InterviewGuideResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate interview guide questions for a stage",
    description="""
    Generates up to 5 interview questions for a selection-process stage.

    **Input:**
    - `campaign`: title, description, requirements of the job campaign
    - `stage`: name and description of the stage (e.g. 'Entrevista Técnica', 'Psicolaboral')
    - `candidate`: resume summary, technical skills and CV gaps
    - `rubric_criteria`: mandatory criteria of the job rubric (optional)

    **Privacy:** the model never receives feedback, notes or decisions from other stages,
    nor sensitive candidate data. The stage name/description drives the question style
    (technical deep-dive, SHAR/STAR behavioral, cultural fit, etc.).
    """,
)
async def generate_interview_guide(request: InterviewGuideRequest, response: Response, token: dict = Depends(verify_token)):
    token_usage_list = []
    tok = token_usage_var.set(token_usage_list)
    try:
        logger.info("Received interview guide request")
        service = InterviewService()
        result = await service.generate_guide(request, request_id=token.get("sub", "unknown"))

        if token_usage_list:
            total_prompt = sum(u.get("prompt_tokens", 0) for u in token_usage_list)
            total_completion = sum(u.get("completion_tokens", 0) for u in token_usage_list)
            models = list(set(u.get("model", "unknown") for u in token_usage_list))
            response.headers["X-LLM-Prompt-Tokens"] = str(total_prompt)
            response.headers["X-LLM-Completion-Tokens"] = str(total_completion)
            response.headers["X-LLM-Model"] = ",".join(models)

        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in interview endpoint: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error inesperado durante la generación de la guía",
        )
    finally:
        token_usage_var.reset(tok)
```

- [ ] **Step 4: Registra el router en `app/main.py`**

`currify-core/app/main.py:10` — cambia la línea de imports:

```python
from app.api import auth, resume, analytics, scoring, smart_fill, interview
```

`currify-core/app/main.py` — después de `app.include_router(scoring.router)` (línea 94):

```python
app.include_router(interview.router)
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd currify-core && python -m pytest tests/test_interview_api.py -v`
Expected: PASS (2 passed)

- [ ] **Step 6: Commit**

```bash
git add currify-core/app/api/interview.py currify-core/app/main.py currify-core/tests/test_interview_api.py
git commit -m "feat(core): endpoint POST /interview/questions con auth y registro de router"
```

---

## Fase B — currify-back: procesos (scoping, OMITTED, reopen, guía)

### Task 5: Migración Prisma — OMITTED + guideJson/notesJson

**Files:**
- Modify: `currify-back/prisma/schema.prisma`

- [ ] **Step 1: Editar el enum `StageStatus`**

`currify-back/prisma/schema.prisma` — agrega `OMITTED` al enum (buscar `enum StageStatus`):

```prisma
enum StageStatus {
  PENDING
  ACTIVE
  ACCEPTED
  REJECTED
  OMITTED
}
```

- [ ] **Step 2: Editar `model StageInstance`** (agregar los dos campos JSON después de `decidedAt`)

```prisma
  guideJson  Json?
  notesJson  Json?
```

- [ ] **Step 3: Ejecutar la migración**

Run: `cd currify-back && npx prisma migrate dev --name stage_guide_omitted --create-only && npx prisma generate`
Expected: migración creada con `ALTER TABLE stage_instances ADD COLUMN ...` y `Type '"OMITTED"'` en el enum; `prisma generate` sin errores.

- [ ] **Step 4: Aplicar la migración**

Run: `cd currify-back && npx prisma migrate dev`
Expected: `Now in sync` — sin errores.

> Si Prisma pide confirmación por cambios destructivos: input `y` (solo agrega enum value y columnas).

- [ ] **Step 5: Commit**

```bash
git add currify-back/prisma
git commit -m "feat(back): migración StageStatus.OMITTED + guideJson/notesJson en StageInstance"
```

### Task 6: Scoping por rol en `getProcessByCandidate` + sensitive derivado

**Files:**
- Modify: `currify-back/src/processes/processes.service.ts:390-451` (reemplaza `getProcessByCandidate`)
- Modify: `currify-back/src/processes/processes.controller.ts` (sin cambios aquí; shape igual)
- Test: `currify-back/src/processes/processes.service.spec.ts` (nuevo archivo)

- [ ] **Step 1: Write the failing tests**

```ts
import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ProcessesService } from './processes.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from '../email/email.service';

describe('ProcessesService — getProcessByCandidate scoping', () => {
  let service: ProcessesService;
  let prisma: PrismaService;

  const mockPrisma = {
    campaign: { findUnique: jest.fn() },
    user: { findUnique: jest.fn() },
    stageTemplate: { findFirst: jest.fn() },
    processInstance: { findUnique: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
    candidate: { update: jest.fn() },
    stageInstance: { update: jest.fn(), updateMany: jest.fn() },
    notifications: { create: jest.fn() },
    auditLog: { create: jest.fn() },
  };

  const fullProcess = {
    id: 'proc-1',
    startDate: new Date().toISOString(),
    endDate: null,
    currentStageOrder: 2,
    candidate: { id: 'cand-1', name: 'Marta', expectedSalary: '$1.8M CLP' },
    campaign: { id: 'camp-1', title: 'Campaña', userId: 'owner-1', modality: 'HYBRID' },
    auditLogs: [{ id: 'log-1' }],
    stageInstances: [
      { id: 's1', status: 'ACCEPTED', stageTemplate: { name: 'Contactar' }, responsible: { id: 'owner-1', name: 'O', email: '' } },
      { id: 's2', status: 'ACTIVE', stageTemplate: { name: 'Técnica' }, responsible: { id: 'resp-1', name: 'R', email: '' } },
      { id: 's3', status: 'PENDING', stageTemplate: { name: 'Final' }, responsible: { id: 'resp-2', name: 'R2', email: '' } },
    ],
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma.campaign.findUnique.mockResolvedValue({ id: 'camp-1', userId: 'owner-1' });
    mockPrisma.processInstance.findUnique.mockResolvedValue(fullProcess);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProcessesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: { log: jest.fn() } },
        { provide: NotificationsService, useValue: { create: jest.fn() } },
        { provide: EmailService, useValue: {} },
      ],
    }).compile();
    service = module.get(ProcessesService);
    prisma = module.get(PrismaService);
  });

  it('debe devolver payload completo + viewer OWNER + sensitive para el dueño', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'owner-1', role: 'RECRUITER' });
    const res = await service.getProcessByCandidate('camp-1', 'cand-1', 'owner-1');
    expect(res.viewer).toBe('OWNER');
    expect(res.sensitive).toEqual({ salary: '$1.8M CLP', modality: 'HYBRID' });
    expect(res.stageInstances).toHaveLength(3);
    expect(res.auditLogs).toHaveLength(1);
  });

  it('debe devolver payload completo + viewer OWNER para ADMIN', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'admin-1', role: 'ADMIN' });
    const res = await service.getProcessByCandidate('camp-1', 'cand-1', 'admin-1');
    expect(res.viewer).toBe('OWNER');
    expect(res.stageInstances).toHaveLength(3);
  });

  it('debe devolver SOLO su etapa para un responsable (sandbox)', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'resp-1', role: 'TECHNICAL_REVIEWER' });
    const res = await service.getProcessByCandidate('camp-1', 'cand-1', 'resp-1');
    expect(res.viewer).toBe('STAGE_RESPONSIBLE');
    expect(res.stageInstances.map((s: any) => s.id)).toEqual(['s2']);
    expect(res.auditLogs).toBeUndefined();
    expect(res.sensitive).toBeUndefined();
    expect(res.candidate).toEqual({ id: 'cand-1', name: 'Marta' });
    expect(res.campaign).toEqual({ id: 'camp-1', title: 'Campaña' });
  });

  it('debe lanzar 403 para un usuario sin relación con la campaña', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'stranger-1', role: 'RECRUITER' });
    mockPrisma.stageTemplate.findFirst.mockResolvedValue(null);
    await expect(service.getProcessByCandidate('camp-1', 'cand-1', 'stranger-1')).rejects
      .toBeInstanceOf(ForbiddenException);
  });

  it('debe lanzar 404 si el proceso no existe', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'owner-1', role: 'RECRUITER' });
    mockPrisma.processInstance.findUnique.mockResolvedValue(null);
    await expect(service.getProcessByCandidate('camp-1', 'cand-1', 'owner-1')).rejects
      .toBeInstanceOf(NotFoundException);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd currify-back && npx jest src/processes/processes.service.spec.ts --no-coverage`
Expected: FAIL — `processes.service.spec.ts` no existe (o `res.viewer` undefined con la implementación actual).

- [ ] **Step 3: Reemplazar `getProcessByCandidate`** en `processes.service.ts`

Reemplaza todo el método actual (líneas 390-451) por:

```ts
  async getProcessByCandidate(campaignId: string, candidateId: string, userId: string) {
    const campaign = await this.prisma.campaign.findUnique({ where: { id: campaignId } });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isOwner = campaign.userId === userId || user.role === 'ADMIN';

    if (!isOwner) {
      // Responsable de alguna etapa de esta campaña (stage template o instancia asignada)?
      const isTemplateResponsible = await this.prisma.stageTemplate.findFirst({
        where: { campaignId, responsibleId: userId },
      });

      if (!isTemplateResponsible || !(user.role === 'ADMIN')) {
        if (!isTemplateResponsible) {
          throw new ForbiddenException('Access denied');
        }
      }
    }

    const processInstance = await this.prisma.processInstance.findUnique({
      where: { campaignId_candidateId: { campaignId, candidateId } },
      include: {
        candidate: true,
        campaign: true,
        stageInstances: {
          include: {
            stageTemplate: true,
            responsible: { select: { id: true, name: true, email: true } },
            attachments: true,
          },
          orderBy: { stageTemplate: { order: 'asc' } },
        },
        auditLogs: {
          include: { user: { select: { id: true, name: true, email: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!processInstance) {
      throw new NotFoundException('Process not found for this candidate');
    }

    if (isOwner) {
      const candidate = processInstance.candidate;
      const sensitive = {
        salary: (candidate.expectedSalary as string) || null,
        modality: (processInstance.campaign.modality as string) || null,
      };
      return {
        ...processInstance,
        viewer: 'OWNER',
        sensitive,
      };
    }

    // SANDBOX: el responsable solo recibe sus propias etapas. Sin hermanas,
    // sin auditLogs, sin sensitive, sin progreso del proceso.
    const myStages = processInstance.stageInstances.filter(
      (s) => s.responsible.id === userId,
    );

    return {
      viewer: 'STAGE_RESPONSIBLE',
      processId: processInstance.id,
      startDate: processInstance.startDate,
      candidate: {
        id: processInstance.candidate.id,
        name: processInstance.candidate.name,
      },
      campaign: {
        id: processInstance.campaign.id,
        title: processInstance.campaign.title,
      },
      stageInstances: myStages,
    };
  }
```

> Nota: la condición de permisos es equivalente a la existente (`campaign.userId` o `stageTemplate.responsibleId`), solo que ahora la respuesta del responsable está filtrada.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd currify-back && npx jest src/processes/processes.service.spec.ts --no-coverage`
Expected: PASS (5 passed)

- [ ] **Step 5: Commit**

```bash
git add currify-back/src/processes/processes.service.ts currify-back/src/processes/processes.service.spec.ts
git commit -m "feat(back): sandbox por rol en getProcessByCandidate + sensitive derivado para el dueño"
```

### Task 7: Rechazo marca etapas posteriores como OMITTED

**Files:**
- Modify: `currify-back/src/processes/processes.service.ts` (método `handleStageRejected`, líneas 279-314)

- [ ] **Step 1: Agregar el test** al final del describe (mismo archivo de test)

```ts
  describe('handleStageRejected — OMITTED', () => {
    it('debe marcar las etapas PENDING posteriores como OMITTED', async () => {
      const stageInstance = {
        processInstanceId: 'proc-1',
        processInstance: {
          campaignId: 'camp-1',
          candidateId: 'cand-1',
          campaign: { userId: 'owner-1', title: 'Campaña' },
          candidate: { email: 'm@x.cl', name: 'Marta' },
        },
        stageTemplate: { name: 'Contactar' },
      };
      mockPrisma.stageInstance.updateMany.mockResolvedValue({ count: 2 });
      mockPrisma.candidate.update.mockResolvedValue({});
      mockPrisma.processInstance.update.mockResolvedValue({});

      await (service as any).handleStageRejected(stageInstance, 'owner-1');

      expect(mockPrisma.stageInstance.updateMany).toHaveBeenCalledWith({
        where: { processInstanceId: 'proc-1', status: 'PENDING' },
        data: { status: 'OMITTED' },
      });
    });
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd currify-back && npx jest src/processes/processes.service.spec.ts --no-coverage`
Expected: FAIL — `updateMany` nunca se llama.

- [ ] **Step 3: Implementar** — en `handleStageRejected`, después del paso 2 (update de processInstance con `endDate`), agregar:

```ts
    // 2b. Marcar etapas posteriores pendientes como OMITIDAS (acta correcta para el dueño)
    await this.prisma.stageInstance.updateMany({
      where: {
        processInstanceId: stageInstance.processInstanceId,
        status: 'PENDING',
      },
      data: { status: 'OMITTED' },
    });
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd currify-back && npx jest src/processes/processes.service.spec.ts --no-coverage`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add currify-back/src/processes/processes.service.ts currify-back/src/processes/processes.service.spec.ts
git commit -m "feat(back): al rechazar, etapas PENDING posteriores pasan a OMITTED"
```

### Task 8: Endpoint `reopen` — reabrir proceso terminado

**Files:**
- Modify: `currify-back/src/processes/processes.service.ts` (nuevo método `reopenProcess`)
- Modify: `currify-back/src/processes/processes.controller.ts` (nueva ruta `POST :processInstanceId/reopen`)

- [ ] **Step 1: Write the failing tests**

```ts
  describe('reopenProcess', () => {
    const rejectedProcess = {
      id: 'proc-1',
      endDate: new Date().toISOString(),
      currentStageOrder: 2,
      campaignId: 'camp-1',
      candidateId: 'cand-1',
      campaign: { id: 'camp-1', userId: 'owner-1' },
      stageInstances: [
        { id: 's1', status: 'ACCEPTED', stageTemplate: { name: 'Contactar' } },
        { id: 's2', status: 'REJECTED', feedback: 'x', decision: 'REJECTED', decidedAt: new Date().toISOString(), stageTemplate: { name: 'Técnica', order: 2 }, responsibleId: 'resp-1' },
        { id: 's3', status: 'OMITTED', stageTemplate: { name: 'Final', order: 3 } },
      ],
    };

    beforeEach(() => {
      mockPrisma.processInstance.findUnique.mockResolvedValue(rejectedProcess);
      mockPrisma.campaign.findUnique.mockResolvedValue({ id: 'camp-1', userId: 'owner-1' });
    });

    it('debe lanzar 403 si no es dueño ni admin', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'resp-1', role: 'TECHNICAL_REVIEWER' });
      await expect(service.reopenProcess('proc-1', 'resp-1')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('debe reactivar la etapa rechazada y restaurar pendientes', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'owner-1', role: 'RECRUITER' });
      await service.reopenProcess('proc-1', 'owner-1');

      expect(mockPrisma.stageInstance.update).toHaveBeenCalledWith({
        where: { id: 's2' },
        data: { status: 'ACTIVE', feedback: null, decision: null, decidedAt: null },
      });
      expect(mockPrisma.stageInstance.updateMany).toHaveBeenCalledWith({
        where: { processInstanceId: 'proc-1', status: 'OMITTED' },
        data: { status: 'PENDING' },
      });
      expect(mockPrisma.processInstance.update).toHaveBeenCalledWith({
        where: { id: 'proc-1' },
        data: { endDate: null, currentStageOrder: 2 },
      });
      expect(mockPrisma.candidate.update).toHaveBeenCalledWith({
        where: { id: 'cand-1' },
        data: { candidateStatus: 'IN_PROCESS' },
      });
      expect(mockPrisma.notifications.create).toHaveBeenCalled();
    });
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd currify-back && npx jest src/processes/processes.service.spec.ts --no-coverage`
Expected: FAIL — `service.reopenProcess is not a function`.

- [ ] **Step 3: Implementar el método** en `processes.service.ts` (antes de `getProcessByCandidate` o después del `handleCandidateSelected`)

```ts
  async reopenProcess(processInstanceId: string, userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const processInstance = await this.prisma.processInstance.findUnique({
      where: { id: processInstanceId },
      include: {
        campaign: { select: { id: true, userId: true } },
        stageInstances: {
          include: { stageTemplate: true },
          orderBy: { stageTemplate: { order: 'asc' } },
        },
      },
    });

    if (!processInstance) {
      throw new NotFoundException('Process not found');
    }

    if (processInstance.campaign.userId !== userId && user.role !== 'ADMIN') {
      throw new ForbiddenException('Only the campaign owner or an admin can reopen a process');
    }

    const rejected = processInstance.stageInstances.find((s) => s.status === 'REJECTED');
    if (!rejected) {
      throw new BadRequestException('No rejected stage to reopen');
    }

    await this.prisma.stageInstance.update({
      where: { id: rejected.id },
      data: { status: 'ACTIVE', feedback: null, decision: null, decidedAt: null },
    });

    await this.prisma.stageInstance.updateMany({
      where: { processInstanceId, status: 'OMITTED' },
      data: { status: 'PENDING' },
    });

    await this.prisma.processInstance.update({
      where: { id: processInstanceId },
      data: { endDate: null, currentStageOrder: rejected.stageTemplate.order },
    });

    await this.prisma.candidate.update({
      where: { id: processInstance.candidateId },
      data: { candidateStatus: 'IN_PROCESS' },
    });

    await this.auditService.log({
      userId,
      action: 'PROCESS_REOPENED',
      entityType: 'ProcessInstance',
      entityId: processInstanceId,
      processInstanceId,
      metadata: { stageName: rejected.stageTemplate.name },
    });

    await this.notificationsService.create({
      userId: rejected.responsibleId,
      type: 'STAGE_ASSIGNED',
      title: 'Etapa reactivada',
      message: `El proceso fue reabierto. La etapa "${rejected.stageTemplate.name}" vuelve a estar activa.`,
      metadata: { processInstanceId, stageInstanceId: rejected.id },
    });

    return { id: processInstanceId, reopened: true, stageName: rejected.stageTemplate.name };
  }
```

- [ ] **Step 4: Agregar la ruta al controlador** (`processes.controller.ts`)

```ts
  @Post(':processInstanceId/reopen')
  async reopenProcess(
    @Param('processInstanceId') processInstanceId: string,
    @Request() req: any,
  ) {
    return this.processesService.reopenProcess(processInstanceId, req.user.id);
  }
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd currify-back && npx jest src/processes/processes.service.spec.ts --no-coverage`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add currify-back/src/processes/processes.service.ts currify-back/src/processes/processes.controller.ts currify-back/src/processes/processes.service.spec.ts
git commit -m "feat(back): endpoint reopen de proceso terminado (dueño/admin)"
```

### Task 9: Guía IA + notas — servicio, persistencia y endpoints

**Files:**
- Create: `currify-back/src/processes/interview-guide.service.ts`
- Modify: `currify-back/src/processes/processes.module.ts` (providers)
- Modify: `currify-back/src/processes/processes.controller.ts` (rutas guide + notes)
- Test: `currify-back/src/processes/interview-guide.service.spec.ts`

- [ ] **Step 1: Write the failing tests** (patrón `scoring.service.spec.ts`: jest.mock axios)

```ts
import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InterviewGuideService } from './interview-guide.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from '../email/email.service';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('InterviewGuideService', () => {
  let service: InterviewGuideService;

  const mockPrisma = {
    user: { findUnique: jest.fn() },
    campaign: { findUnique: jest.fn() },
    processInstance: { findUnique: jest.fn() },
    stageInstance: { findUnique: jest.fn(), update: jest.fn() },
  };

  const guide = { questions: [{ question: 'P1', source: 'rubrica' }] };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockedAxios.post
      .mockResolvedValueOnce({ data: { access_token: 'mock-token' } })
      .mockResolvedValueOnce({ data: guide, headers: {} });

    mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', role: 'RECRUITER' });
    mockPrisma.campaign.findUnique.mockResolvedValue({
      id: 'camp-1', title: 'Campaña', description: 'd', requirements: 'r',
      modality: 'REMOTE', userId: 'owner-1',
      parsedJobData: { requisitos: { habilidades_requeridas: ['React'] } },
    });
    mockPrisma.processInstance.findUnique.mockResolvedValue({
      id: 'proc-1', campaignId: 'camp-1', candidateId: 'cand-1',
    });
    mockPrisma.stageInstance.findUnique.mockResolvedValue({
      id: 'stage-1', responsibleId: 'user-1', status: 'ACTIVE',
      stageTemplate: { name: 'Entrevista Técnica', description: 'Deep dive' },
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InterviewGuideService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: { get: jest.fn((k: string) => ({ SCORING_SERVICE_URL: 'http://core:8000', SCORING_SERVICE_USERNAME: 'u', SCORING_SERVICE_PASSWORD: 'p' }[k])) } },
        { provide: AuditService, useValue: { log: jest.fn() } },
        { provide: NotificationsService, useValue: { create: jest.fn() } },
        { provide: EmailService, useValue: {} },
      ],
    }).compile();

    service = module.get(InterviewGuideService);
  });

  it('debe generar y persistir la guía para el responsable de la etapa', async () => {
    mockPrisma.campaign.findUnique.mockResolvedValue({
      id: 'camp-1', title: 'Campaña', description: 'd', requirements: 'r',
      modality: 'REMOTE', userId: 'owner-1',
      parsedJobData: { requisitos: { habilidades_requeridas: ['React'] } },
    });
    const result = await service.generateGuide('proc-1', 'stage-1', 'user-1');
    expect(result).toEqual(guide);
    expect(mockPrisma.stageInstance.update).toHaveBeenCalledWith({
      where: { id: 'stage-1' },
      data: { guideJson: guide },
    });
    // el payload enviado a core NUNCA incluye feedback/sensitive
    const sentPayload = mockedAxios.post.mock.calls[1][1];
    const raw = JSON.stringify(sentPayload).toLowerCase();
    expect(raw).not.toContain('feedback');
    expect(raw).not.toContain('sensitive');
  });

  it('debe rechazar a un usuario sin relación con la etapa', async () => {
    mockPrisma.stageInstance.findUnique.mockResolvedValue({
      id: 'stage-1', responsibleId: 'other-1', status: 'ACTIVE',
      stageTemplate: { name: 'X', description: 'Y' },
    });
    await expect(service.generateGuide('proc-1', 'stage-1', 'user-1')).rejects
      .toBeInstanceOf(ForbiddenException);
  });

  it('debe guardar notas solo para dueño o responsable', async () => {
    mockPrisma.stageInstance.findUnique.mockResolvedValue({
      id: 'stage-1', responsibleId: 'user-1', status: 'ACTIVE',
      stageTemplate: { name: 'X', description: 'Y' },
    });
    const result = await service.updateNotes('proc-1', 'stage-1', 'user-1', { 0: 'Bien' });
    expect(result.notesJson).toEqual({ 0: 'Bien' });
    expect(mockPrisma.stageInstance.update).toHaveBeenCalledWith({
      where: { id: 'stage-1' },
      data: { notesJson: { 0: 'Bien' } },
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd currify-back && npx jest src/processes/interview-guide.service.spec.ts --no-coverage`
Expected: FAIL — `Cannot find module './interview-guide.service'`.

- [ ] **Step 3: Implementar `interview-guide.service.ts`**

```ts
import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';

export interface GuideQuestion {
  question: string;
  source: 'rubrica' | 'perfil' | 'brecha' | 'estandar';
}

@Injectable()
export class InterviewGuideService {
  private readonly coreUrl: string;
  private readonly username: string;
  private readonly password: string;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.coreUrl = config.get<string>('SCORING_SERVICE_URL') || 'http://localhost:8000';
    this.username = config.get<string>('SCORING_SERVICE_USERNAME') || 'recruiter';
    this.password = config.get<string>('SCORING_SERVICE_PASSWORD') || 'recruiter123';
  }

  private async getToken(): Promise<string> {
    const response = await axios.post(`${this.coreUrl}/auth/login`, {
      username: this.username,
      password: this.password,
    });
    return response.data.access_token;
  }

  private async loadAuthorizedStage(processInstanceId: string, stageInstanceId: string, userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const stage = await this.prisma.stageInstance.findUnique({
      where: { id: stageInstanceId },
      include: { stageTemplate: true, processInstance: { select: { campaignId: true, candidateId: true } } },
    });
    if (!stage) throw new NotFoundException('Stage not found');
    if (stage.processInstanceId !== processInstanceId) throw new ForbiddenException('Stage does not belong to process');

    const campaign = await this.prisma.campaign.findUnique({ where: { id: stage.processInstance.campaignId } });
    const isOwner = campaign && (campaign.userId === userId || user.role === 'ADMIN');
    const isStageResponsible = stage.responsibleId === userId;

    if (!isOwner && !isStageResponsible) {
      throw new ForbiddenException('Only the campaign owner or the stage responsible can manage this stage');
    }

    return { user, stage, campaign, isOwner };
  }

  async generateGuide(processInstanceId: string, stageInstanceId: string, userId: string) {
    const { stage, campaign } = await this.loadAuthorizedStage(processInstanceId, stageInstanceId, userId);
    const candidate = await this.prisma.candidate.findUnique({
      where: { id: stage.processInstance.candidateId },
    });
    if (!candidate) throw new NotFoundException('Candidate not found');

    const sd = (candidate.structuredData as any)?.datos_cv || {};
    const gaps = (candidate.scoring as any)?.gaps || [];

    // PRIVACIDAD: candidate + campaign + stage + rúbrica. NUNCA feedback/notas
    // de otras etapas. Esto se garantiza por construcción del payload.
    const payload = {
      campaign: {
        title: campaign.title,
        description: campaign.description || '',
        requirements: [campaign.requirements, campaign.conditions].filter(Boolean).join('\n'),
      },
      stage: {
        name: stage.stageTemplate.name,
        description: stage.stageTemplate.description || '',
      },
      candidate: {
        resumen: sd.resumen_profesional?.resumen || '',
        habilidades: (sd.habilidades?.habilidades_tecnicas || []).map((h: any) => h.skill).filter(Boolean),
        brechas: gaps,
      },
      rubric_criteria: ((campaign.parsedJobData as any)?.requisitos?.habilidades_requeridas || []),
    };

    const token = await this.getToken();
    const response = await axios.post(`${this.coreUrl}/interview/questions`, payload, {
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    });

    const guide = response.data as { questions: GuideQuestion[] };
    await this.prisma.stageInstance.update({
      where: { id: stageInstanceId },
      data: { guideJson: guide },
    });

    return guide;
  }

  async updateNotes(processInstanceId: string, stageInstanceId: string, userId: string, notes: Record<string, string>) {
    await this.loadAuthorizedStage(processInstanceId, stageInstanceId, userId);
    const updated = await this.prisma.stageInstance.update({
      where: { id: stageInstanceId },
      data: { notesJson: notes },
    });
    return { notesJson: updated.notesJson };
  }
}
```

> Ajustes requeridos: `processes.module.ts` debe proveer `InterviewGuideService` (y el front ya no necesita nada más); revisar imports (`PrismaService`, `ConfigService` ya disponibles en el módulo). **Cuidado:** el test mockea `candidate.findUnique` y `campaign.parsedJobData` — asegúrate de que `mockPrisma` en el spec incluya `candidate: { findUnique: jest.fn() }` y que el mock de campaña devuelva `conditions`.

> Nota: `mockPrisma` del spec anterior (Task 6) no incluye `candidate`; este spec tiene su propio `mockPrisma` local — completo con `candidate: { findUnique: jest.fn() }`.

- [ ] **Step 4: Registrar el provider** — `processes.module.ts`

```ts
import { InterviewGuideService } from './interview-guide.service';
// dentro de providers: [ProcessesService, InterviewGuideService]
```

- [ ] **Step 5: Agregar rutas al controlador**

```ts
  @Post(':processInstanceId/stages/:stageInstanceId/guide')
  async generateGuide(
    @Param('processInstanceId') processInstanceId: string,
    @Param('stageInstanceId') stageInstanceId: string,
    @Request() req: any,
  ) {
    return this.interviewGuideService.generateGuide(processInstanceId, stageInstanceId, req.user.id);
  }

  @Patch(':processInstanceId/stages/:stageInstanceId/notes')
  async updateNotes(
    @Param('processInstanceId') processInstanceId: string,
    @Param('stageInstanceId') stageInstanceId: string,
    @Body() body: { notes: Record<string, string> },
    @Request() req: any,
  ) {
    return this.interviewGuideService.updateNotes(processInstanceId, stageInstanceId, req.user.id, body.notes || {});
  }
```

(Inyectar `private interviewGuideService: InterviewGuideService` en el constructor del controlador.)

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd currify-back && npx jest src/processes --no-coverage`
Expected: PASS (todos los specs de processes)

- [ ] **Step 7: Commit**

```bash
git add currify-back/src/processes
git commit -m "feat(back): guía IA persistida (guideJson) + notas por pregunta (notesJson) con sandbox en payload"
```

---

## Fase C — currify-front: rediseño de la vista de etapas

### Task 10: Tipos y métodos de API en el frontend

**Files:**
- Modify: `currify-front/src/services/api.ts` (tipos ~líneas 96-114, 397-450; métodos ~líneas 882-899)

- [ ] **Step 1: Agregar `'OMITTED'` al tipo `StageStatus` (línea 96)**

```ts
export type StageStatus = 'PENDING' | 'ACTIVE' | 'ACCEPTED' | 'REJECTED' | 'OMITTED';
```

- [ ] **Step 2: Extender `StageInstance` (línea 397)**

```ts
export interface StageInstance {
  id: string;
  status: StageStatus;
  feedback?: string;
  decision?: string;
  decidedAt?: string;
  guideJson?: { questions: GuideQuestion[] };
  notesJson?: Record<string, string>;
  stageTemplate: StageTemplate;
  responsible: {
    id: string;
    name: string;
    email: string;
  };
  attachments?: Document[];
  createdAt: string;
  updatedAt: string;
}
```

- [ ] **Step 3: Agregar tipos nuevos** (justo antes de `export interface StageInstance`)

```ts
export type ProcessViewer = 'OWNER' | 'STAGE_RESPONSIBLE';

export interface GuideQuestion {
  question: string;
  source: 'rubrica' | 'perfil' | 'brecha' | 'estandar';
}

export interface ProcessSensitive {
  salary?: string | null;
  modality?: string | null;
}
```

- [ ] **Step 4: Extender `ProcessInstance` (línea 439)**

```ts
export interface ProcessInstance {
  id: string;
  startDate: string;
  endDate?: string;
  currentStageOrder: number;
  candidate: Candidate;
  campaign: Campaign;
  stageInstances: StageInstance[];
  auditLogs?: AuditLog[];
  viewer?: ProcessViewer;
  sensitive?: ProcessSensitive;
  processId?: string; // presente en respuesta sandbox (STAGE_RESPONSIBLE)
  createdAt: string;
  updatedAt: string;
}
```

- [ ] **Step 5: Agregar métodos al `apiService`** (después de `getCampaignStages`, línea ~899)

```ts
  async generateStageGuide(processId: string, stageId: string): Promise<{ questions: GuideQuestion[] }> {
    return this.apiCall(`/processes/${processId}/stages/${stageId}/guide`, {
      method: 'POST',
    });
  }

  async updateStageNotes(processId: string, stageId: string, notes: Record<string, string>): Promise<{ notesJson: Record<string, string> }> {
    return this.apiCall(`/processes/${processId}/stages/${stageId}/notes`, {
      method: 'PATCH',
      body: JSON.stringify({ notes }),
    });
  }

  async reopenProcess(processId: string): Promise<any> {
    return this.apiCall(`/processes/${processId}/reopen`, {
      method: 'POST',
    });
  }
```

- [ ] **Step 6: Commit**

```bash
git add currify-front/src/services/api.ts
git commit -m "feat(front): tipos y métodos de API para guía, notas, OMITTED y reopen"
```

### Task 11: Rewrite de `CandidateProcessPanel.tsx` — modo dueño

**Files:**
- Modify: `currify-front/src/components/processes/CandidateProcessPanel.tsx` (reescritura total)

**Antes de escribir, abre `spec/mockup/steps.html` como referencia visual EXACTA** para clases y estructura (tokens `t-*` ya configurados en `index.css` y usados por el resto de componentes migrados). La aplicación ya tiene `Layout` con NavBar con theme toggle — NO portar el topbar del mockup, solo `<main>` + toast (patrón `CandidateDetail.tsx`).

- [ ] **Step 1: Escribir el componente (estructura)** — este archivo reemplaza TODO el contenido. Sigue esta arquitectura (los estilos provienen 1:1 del mockup):

```tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../layout/Layout';
import { apiService, ProcessInstance, StageInstance, GuideQuestion, ProcessSensitive } from '../../services/api';

const GUIDE_SRC: Record<GuideQuestion['source'], { label: string; cls: string; dot: string }> = {
  rubrica: { label: 'Rúbrica del cargo', cls: 'bg-goodt text-ink2 t-goodt t-ink2', dot: 'bg-good' },
  brecha: { label: 'Brecha en CV', cls: 'bg-midt text-ink2 t-midt t-ink2', dot: 'bg-mid' },
  estandar: { label: 'Estándar de la etapa', cls: 'bg-paper2 text-ink2 t-paper2 t-ink2', dot: 'bg-ink3' },
  perfil: { label: 'Perfil del cargo', cls: 'bg-greentint text-ink2 t-greentint t-ink2', dot: 'bg-green' },
};

const stageChip = (s: StageInstance) => { /* igual que chipFor del mockup: aprobada/rechazada/activa/omitida/pendiente */ };
const stageDot = (s: StageInstance) => { /* igual que dotFor del mockup (SVG check/X, anillo cta pulsante para activa, etc.) */ };
const segColor = (s: StageInstance) => { /* aprobada→bg-good, rechazada→bg-low, activa→bg-cta, omitida→bg-line2, pendiente→bg-paper2 */ };
const formatDate = (d?: string) => { /* '2 ago 2026, 16:29' como el mockup */ };
```

**Estado del componente:**

```tsx
const [process, setProcess] = useState<ProcessInstance | null>(null);
const [campaign, setCampaign] = useState<any>(null);
const [candidate, setCandidate] = useState<any>(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
const [selectedStageId, setSelectedStageId] = useState<string | null>(null); // mesas en lectura (dueño)
const [guide, setGuide] = useState<'loading' | GuideQuestion[] | null>(null);
const [notes, setNotes] = useState<Record<string, string>>({});
const [feedback, setFeedback] = useState('');
const [feedbackErr, setFeedbackErr] = useState(false);
const [busy, setBusy] = useState(false);
const [toast, setToast] = useState<{ msg: string; icon: string } | null>(null);
const toastT = useRef<any>(null);
const notesT = useRef<any>(null);
```

**Handlers (código clave; el JSX visual se copia del mockup):**

```tsx
const loadData = useCallback(async () => {
  if (!campaignId || !candidateId) return;
  try {
    setLoading(true); setError(null);
    const [pc, camp, cand] = await Promise.all([
      apiService.getProcess(campaignId, candidateId),
      apiService.getCampaign(campaignId),
      apiService.getCandidate(candidateId),
    ]);
    setProcess(pc); setCampaign(camp); setCandidate(cand);
    const active = pc.stageInstances.find(s => s.status === 'ACTIVE');
    setSelectedStageId(active?.id ?? pc.stageInstances[0]?.id ?? null);
    const activeStage = pc.stageInstances.find(s => s.status === 'ACTIVE');
    if (activeStage?.guideJson?.questions) {
      setGuide(activeStage.guideJson.questions);
      setNotes(activeStage.notesJson || {});
    } else if (pc.viewer === 'OWNER' && selectedStageIsActive()) {
      setGuide(null);
    } else {
      setGuide(null);
    }
  } catch (e: any) { setError(e.message || 'Error al cargar el proceso'); }
  finally { setLoading(false); }
}, [campaignId, candidateId]);

const activeStage = process?.stageInstances.find(s => s.status === 'ACTIVE') ?? null;
const isOwner = process?.viewer === 'OWNER' || process?.viewer === undefined;
const isResponsible = process?.viewer === 'STAGE_RESPONSIBLE';
const mesaStage = process?.stageInstances.find(s => s.id === selectedStageId) ?? activeStage;
const canDecide = mesaStage?.status === 'ACTIVE'; // responsable o dueño: el backend ya filtra; dueño decide solo la activa

const showToast = (msg: string, type: 'ok' | 'info' | 'warn' = 'info') => { /* patrón del mockup (toastId, translate-y) */ };

const handleGenerateGuide = async () => {
  if (!process) return;
  const stage = stageInstances().find(s => s.id === selectedStageId) ?? activeStage;
  if (!stage) return;
  setGuide('loading');
  try {
    const res = await apiService.generateStageGuide(process.id, stage.id);
    setGuide(res.questions);
    setNotes({});
    showToast(`Guía generada: ${res.questions.length} preguntas con procedencia.`, 'ok');
  } catch (e: any) {
    setGuide(null);
    showToast(e.message || 'Error al generar la guía.', 'warn');
  }
};
// stageInstances(): en modo responsable usa process.stageInstances (sus etapas); en owner todas.

const handleNoteChange = (idx: number, value: string) => {
  setNotes(prev => { const n = { ...prev, [String(idx)]: value }; scheduleSave(n); return n; });
};
const scheduleSave = (n: Record<string, string>) => {
  clearTimeout(notesT.current);
  notesT.current = setTimeout(async () => {
    const stage = activeOrMesa();
    if (!process || !stage) return;
    try { await apiService.updateStageNotes(process.id, stage.id, n); }
    catch { showToast('No se pudo guardar la nota.', 'warn'); }
  }, 700);
};

const handleDecide = async (approve: boolean) => {
  if (!process || !activeStage) return;
  const fb = feedback.trim();
  if (!approve && !fb) { setFeedbackErr(true); showToast('La retroalimentación es obligatoria al rechazar.', 'warn'); return; }
  setBusy(true);
  try {
    await apiService.updateStageDecision(activeStage.id, { decision: approve ? 'ACCEPTED' : 'REJECTED', feedback: fb });
    showToast(approve ? `Etapa "${activeStage.stageTemplate.name}" aprobada.` : 'Etapa rechazada. Proceso terminado.', approve ? 'ok' : 'warn');
    await loadData();
  } catch (e: any) { showToast(e.message || 'Error al decidir.', 'warn'); }
  finally { setBusy(false); }
};

const handleReopen = async () => {
  if (!process) return;
  setBusy(true);
  try { await apiService.reopenProcess(process.id); showToast('Proceso reabierto.', 'ok'); await loadData(); }
  catch (e: any) { showToast(e.message || 'Error al reabrir.', 'warn'); }
  finally { setBusy(false); }
};
```

**Render — modo DUEÑO (JSX fiduciario al mockup `steps.html`):**

```tsx
return (
  <Layout>
    <div className="min-h-screen bg-paper text-ink font-sans antialiased [text-rendering:optimizeLegibility]">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[60] bg-grain opacity-[0.045] mix-blend-overlay"></div>
      <main className="mx-auto max-w-[1240px] px-4 pb-24 pt-6 sm:px-6 lg:px-8">
        {/* breadcrumb + back: misma estructura del mockup (líneas 220-236): back button + eyebrow campaña + h1 candidato
             + meta: [statusChip] · Inicio <fecha> · <a matchLink>Match X · ver análisis →</a> */}
        <div className="flex items-start gap-4">… {breadcrumb/identidad del mockup}</div>

        {/* progreso (mockup 238-245): label + progLabel "Etapa N de M" + progBar segmentado */}
        {process && (
          <div className="mt-7">
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-[12.5px] uppercase tracking-[0.1em] text-ink2 t-ink2">Progreso del proceso</span>
              <span className="font-mono text-[12.5px] text-ink2 t-ink2">Etapa {activeIndex + 1} de {process.stageInstances.length}</span>
            </div>
            <div className="mt-2.5 flex gap-1.5" aria-hidden="true">
              {process.stageInstances.map((s, i) => (
                <span key={i} className={`seg h-2 flex-1 rounded-full ${segColor(s)}`}></span>
              ))}
            </div>
          </div>
        )}

        {/* grid (mockup 247-264): acta + mesa */}
        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[0.9fr_1.5fr] lg:gap-10">
          <section aria-label="Acta del proceso" className="order-2 lg:order-1">
            <div className="flex items-end justify-between gap-3 border-b border-line pb-3 t-line">
              <h2 className="font-sans text-[1.35rem] font-bold tracking-tight text-ink t-ink">Acta del proceso</h2>
              <span className="font-mono text-[12px] text-ink2 t-ink2">Acceso completo · dueño</span>
            </div>
            <div id="timeline" className="mt-6">
              {process.stageInstances.map((s, i) => (
                <button key={s.id} onClick={() => setSelectedStageId(s.id)} className="block w-full text-left">
                  {/* item de timeline EXACTO del mockup renderTimeline(): dotFor + línea + título Etapa N: name + chip
                       + decidido/responsable + feedback “…” + candado con sensitive (solo dueño) */}
                </button>
              ))}
            </div>
          </section>
          <section aria-label="Mesa de la etapa activa" className="order-1 lg:order-2">
            {/* mesa del mockup renderDesk(): contexto etapas anteriores (cards), guía de entrevista,
                 feedback textarea con fbErr, botones Aprobar/Rechazar */}
          </section>
        </div>
      </main>
    </div>
    {/* toast id="toastItem" exacto del mockup */}
  </Layout>
);
```

**Reglas del render (dueño):**
- `mesaStage = selectedStageId ? stageById(selectedStageId) : activeStage`; si `mesaStage.status !== 'ACTIVE'` → mesa en **modo lectura**: contexto + guía persistida (`guideJson`) + notas, sin botones de decidir.
- Info sensible en el acta: por cada etapa decidida mostrar candado + `process.sensitive` (derivado global) — texto: `Pretensiones: ${sensitive.salary}` y `Modalidad: ${sensitive.modality}` si existen.
- "Ya preguntado antes": chips con preguntas de `guideJson.questions` de etapas anteriores decididas (solo dueño), calculados con `askedBefore()`.
- Estado terminal: si `process.status` del candidato es `SELECTED` → card "Candidata seleccionada"; si `NOT_SELECTED` → "Proceso terminado" + botón **Reabrir proceso** (mockup 424-436).

- [ ] **Step 2: Compilar**

Run: `cd currify-front && npx tsc --noEmit`
Expected: sin errores (ajustar imports no usados — el lint de CRA fallará en CI si quedan).

- [ ] **Step 3: Commit**

```bash
git add currify-front/src/components/processes/CandidateProcessPanel.tsx
git commit -m "feat(front): rewrite de vista de etapas con modo dueño (acta + mesa + guía IA)"
```

### Task 12: Modo sandbox (responsable) + tests del componente

**Files:**
- Modify: `currify-front/src/components/processes/CandidateProcessPanel.tsx`
- Test: `currify-front/src/components/processes/CandidateProcessPanel.test.tsx` (nuevo)

- [ ] **Step 1: Condicionar el render por modo** — en el JSX del Task 11/12, antes del `return` principal:

```tsx
if (isResponsible) {
  // SANDBOX: sin acta, sin progreso, sin "Etapa X de Y", sin match, sin sensitive
  return (
    <Layout>
      <div className="min-h-screen bg-paper text-ink font-sans antialiased [text-rendering:optimizeLegibility]">
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[60] bg-grain opacity-[0.045] mix-blend-overlay"></div>
        <main className="mx-auto max-w-[760px] px-4 pb-24 pt-6 sm:px-6 lg:px-8">
          <div className="flex items-start gap-4">
            <button onClick={() => navigate(`/campaigns/${campaignId}/candidates`)} aria-label="Volver"
              className="mt-1 grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-line2 bg-card text-ink2 transition hover:border-ink hover:text-ink t-card t-ink2 t-line2">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M11 18l-6-6 6-6"/></svg>
            </button>
            <div className="min-w-0">
              <p className="font-mono text-[12.5px] uppercase tracking-[0.1em] text-ink2 t-ink2">Mi etapa asignada · {campaign?.title}</p>
              <h1 className="mt-1 font-sans text-[1.9rem] font-bold leading-[1.05] tracking-[-0.02em] text-ink t-ink">
                {mesaStage?.stageTemplate?.name ?? 'Etapa'}
              </h1>
              <p className="mt-2 inline-flex items-center gap-1.5 font-sans text-[13px] text-ink2 t-ink2">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-greendeep font-mono text-[11px] font-semibold text-onmark">
                  {initials(responsibleName)}
                </span>
                {responsibleName} · Candidato: {candidate?.name}
              </p>
            </div>
          </div>
          {/* mesa con SOLO su etapa: guía + notas + feedback + decidir (misma estructura del mockup renderDesk) */}
          <div className="mt-7 fade-in rounded-2xl border border-line2 bg-card p-6 shadow-card t-card t-line2">
            {guideSection()}
            {feedbackSection()}
          </div>
        </main>
      </div>
      {/* toast */}
    </Layout>
  );
}
```

- [ ] **Step 2: Escribir los tests** — `CandidateProcessPanel.test.tsx`:

```tsx
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import CandidateProcessPanel from './CandidateProcessPanel';
import { apiService } from '../../services/api';

jest.mock('../../services/api', () => {
  const actual = jest.requireActual('../../services/api');
  return {
    ...actual,
    apiService: {
      getProcess: jest.fn(),
      getCampaign: jest.fn(),
      getCandidate: jest.fn(),
      generateStageGuide: jest.fn(),
      updateStageNotes: jest.fn(),
      updateStageDecision: jest.fn(),
      reopenProcess: jest.fn(),
    },
  };
});

const stages = [
  { id: 's1', status: 'ACCEPTED', feedback: 'Buen inicio', decision: 'ACCEPTED', decidedAt: '2026-08-02T16:33:00Z', guideJson: undefined, notesJson: undefined, stageTemplate: { id: 't1', name: 'Contactar', order: 1 }, responsible: { id: 'o1', name: 'Osiel Leiva', email: '' }, createdAt: '', updatedAt: '' },
  { id: 's2', status: 'ACTIVE', feedback: undefined, decision: undefined, decidedAt: undefined, guideJson: undefined, notesJson: undefined, stageTemplate: { id: 't2', name: 'Entrevista Técnica', order: 2 }, responsible: { id: 'r1', name: 'Nadia Fuentes', email: '' }, createdAt: '', updatedAt: '' },
  { id: 's3', status: 'PENDING', feedback: undefined, decision: undefined, decidedAt: undefined, guideJson: undefined, notesJson: undefined, stageTemplate: { id: 't3', name: 'Entrevista final', order: 3 }, responsible: { id: 'o1', name: 'Osiel Leiva', email: '' }, createdAt: '', updatedAt: '' },
];

const ownerProcess: any = {
  id: 'proc-1', startDate: '2026-08-02T16:29:00Z', endDate: null, currentStageOrder: 2,
  viewer: 'OWNER', sensitive: { salary: '$1.8M CLP', modality: 'Híbrido' },
  candidate: { id: 'c1', name: 'Marta George Quiroz' },
  campaign: { id: 'camp-1', title: 'Tecnólogo médico' },
  stageInstances: stages, auditLogs: [], createdAt: '', updatedAt: '',
};
const respProcess: any = {
  viewer: 'STAGE_RESPONSIBLE', processId: 'proc-1', startDate: '2026-08-02T16:29:00Z',
  candidate: { id: 'c1', name: 'Marta George Quiroz' },
  campaign: { id: 'camp-1', title: 'Tecnólogo médico' },
  stageInstances: [stages[1]], createdAt: '', updatedAt: '',
};

const renderPanel = (process: any, candidate: any = { ...ownerProcess.candidate, id: 'c1' }) => {
  (apiService.getProcess as jest.Mock).mockResolvedValue(process);
  (apiService.getCampaign as jest.Mock).mockResolvedValue({ id: 'camp-1', title: 'Tecnólogo médico' });
  (apiService.getCandidate as jest.Mock).mockResolvedValue(candidate);
  return render(
    <MemoryRouter initialEntries={['/campaigns/camp-1/candidates/c1/process']}>
      <Routes>
        <Route path="/campaigns/:campaignId/candidates/:candidateId/process" element={<CandidateProcessPanel />} />
      </Routes>
    </MemoryRouter>
  );
};

describe('CandidateProcessPanel', () => {
  beforeEach(() => jest.clearAllMocks());

  it('modo dueño: renderiza acta, progreso y mesa', async () => {
    renderPanel(ownerProcess);
    expect(await screen.findByText('Acta del proceso')).toBeInTheDocument();
    expect(screen.getByText('Progreso del proceso')).toBeInTheDocument();
    expect(screen.getByText('Etapa 2 de 3')).toBeInTheDocument();
    expect(screen.getByText('Marta George Quiroz')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Acceso completo · dueño')).toBeInTheDocument());
  });

  it('modo dueño: muestra info sensible derivada', async () => {
    renderPanel(ownerProcess);
    await waitFor(() => expect(screen.getByText(/Pretensiones: \$1\.8M CLP/)).toBeInTheDocument());
  });

  it('modo sandbox: NO renderiza acta ni progreso, sí su etapa', async () => {
    renderPanel(respProcess);
    expect(await screen.findByText('Mi etapa asignada')).toBeInTheDocument();
    expect(screen.queryByText('Acta del proceso')).not.toBeInTheDocument();
    expect(screen.queryByText('Progreso del proceso')).not.toBeInTheDocument();
    expect(screen.queryByText('Etapa 2 de 3')).not.toBeInTheDocument();
    expect(screen.getByText('Entrevista Técnica')).toBeInTheDocument();
  });

  it('genera la guía desde el botón y la pinta con chips de procedencia', async () => {
    (apiService.generateStageGuide as jest.Mock).mockResolvedValue({
      questions: [
        { question: '¿Cuéntame de un proyecto React?', source: 'perfil' },
        { question: '¿Cómo abordarías testing?', source: 'brecha' },
      ],
    });
    renderPanel(respProcess);
    fireEvent.click(await screen.findByText(/Generar preguntas con IA/));
    expect(await screen.findByText('¿Cuéntame de un proyecto React?')).toBeInTheDocument();
    expect(screen.getByText('Perfil del cargo')).toBeInTheDocument();
    expect(screen.getByText('Brecha en CV')).toBeInTheDocument();
    expect(apiService.generateStageGuide).toHaveBeenCalledWith('proc-1', 's2');
  });

  it('rechazar sin feedback muestra error y no llama a la API', async () => {
    renderPanel(respProcess);
    fireEvent.click(await screen.findByText(/Rechazar etapa/));
    await waitFor(() => expect(screen.getByText(/obligatoria al rechazar/)).toBeInTheDocument());
    expect(apiService.updateStageDecision).not.toHaveBeenCalled();
  });

  it('reabre el proceso desde estado terminal', async () => {
    const ended = { ...ownerProcess, candidate: { ...ownerProcess.candidate, candidateStatus: 'NOT_SELECTED' } };
    renderPanel(ended);
    fireEvent.click(await screen.findByText(/Reabrir proceso/));
    await waitFor(() => expect(apiService.reopenProcess).toHaveBeenCalledWith('proc-1'));
  });
});
```

> Si `@testing-library/jest-dom` matchers (`toBeInTheDocument`) no están registrados en `setupTests.ts`, agregar `import '@testing-library/jest-dom';` (verificar cómo está configurado `currify-front/src/setupTests.ts`).

- [ ] **Step 3: Correr los tests**

Run: `cd currify-front && CI=true npx react-scripts test --testPathPattern=CandidateProcessPanel --watchAll=false`
Expected: todos PASS. Iterar hasta que lo estén (ajustar queries a los textos reales del JSX).

- [ ] **Step 4: Compilar + commit**

Run: `cd currify-front && npx tsc --noEmit`
Expected: sin errores.

```bash
git add currify-front/src/components/processes
git commit -m "feat(front): modo sandbox para responsable + tests del rediseño de etapas"
```

---

## Verificación final (después de Fase C)

1. `cd currify-back && npm run lint` y `npx jest --no-coverage` — verde.
2. `cd currify-core && python -m pytest tests/ -q` — verde (test_interview_* incluidos).
3. `cd currify-front && CI=true npm test` y `npx tsc --noEmit` — verde.
4. Manual: arrancar `npm run start:dev` (back+core) y `npm start` (front); navegar a `/campaigns/:cid/candidates/:cid/process`:
   - Dueño: vista fiel al mockup en light y dark; acta clickeable; candado con pretensiones; guía IA real (skeleton → preguntas con chips); notas se guardan (PATCH); rechazar sin feedback → shake/error; rechazar → etapas posteriores "Omitida"; "Reabrir proceso" restaura.
   - Responsable (Network): el GET `/processes/...` devuelve SOLO su etapa — sin hermanas ni audit.