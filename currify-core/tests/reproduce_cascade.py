import asyncio, json, sys, os
# Ajuste path para permitir `pytest currify-core/tests/reproduce_cascade.py` desde raíz y desde currify-core
for _p in [os.path.abspath(os.path.join(os.path.dirname(__file__), "..")), os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))]:
    if _p not in sys.path:
        sys.path.insert(0, _p)
# Compat: si se ejecuta desde raíz, añadir currify-core al path
try:
    _core = os.path.join(os.path.dirname(__file__), "..")
    if os.path.isdir(os.path.join(_core, "app")) and _core not in sys.path:
        sys.path.insert(0, os.path.abspath(_core))
except Exception:
    pass
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
    import types, os
    # Asegurar API key dummy para evitar ValueError en LLMService (Task 0 ajuste import)
    from app.core.config import settings
    if not settings.google_api_key:
        settings.google_api_key = "test-dummy-key"
        settings.llm_provider = "google"
    llm = LLMService()
    llm.call_agent = fake_call_agent  # type: ignore
    svc = RobustExtractionService(llm_service=llm)
    raw = "Candidato QA 15y\nQA Test Lead Automation Engineer\nqa.anon@example.com\n+56 9 12345678\nEXPERIENCIA\nQA Test Lead - Empresa A Ene 2024 - Presente\nHABILIDADES\nSelenium, Java\n"
    req = ResumeExtractionRequest(archivo_contenido=raw, tipo_archivo="txt", nombre_archivo="qa_anon.txt")
    resp = asyncio.run(svc.extract_from_text(req, request_id="repro-001"))
    # Antes del fix: resume vacía + confianza 0.10 + scoring 0.0
    assert resp.datos_cv.experiencia_laboral == [] or resp.confianza_general < 0.2  # reproduce bug
