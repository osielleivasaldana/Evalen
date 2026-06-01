#!/usr/bin/env python3
"""
Script de testing para el pipeline de extraccion por secciones.

Uso:
    python dev/test_section_pipeline.py <ruta_del_archivo>
    python dev/test_section_pipeline.py                          # usa CV por defecto

Soporta archivos .pdf y .txt.
"""
import asyncio
import logging
import sys
import time
import os
from pathlib import Path

# Fix Windows encoding for emoji/special chars
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# Asegurar que currify-core esta en el path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# ══════════════════════════════════════════════════════════════════
# CRÍTICO: Cargar .env ANTES de cualquier import de app.*
# ══════════════════════════════════════════════════════════════════
from dotenv import load_dotenv
load_dotenv()

from app.core.config import settings
assert settings.google_api_key, "GOOGLE_API_KEY no cargada! Verifica tu .env"
# ──────────────────────────────────────────────────────────────────

from app.services.llm_service import LLMService
from app.services.robust_extraction_service import RobustExtractionService
from app.services.document_analyzer_service import DocumentAnalyzerService
from app.models.resume import ResumeData


# ── Configuración de logging ──
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("section_pipeline_test")

# ── Secciones coloreadas para la terminal ──
SEP = "=" * 70
SEP2 = "─" * 70

ST_MAP = {
    "experience": "💼 EXPERIENCIA",
    "education": "🎓 EDUCACIÓN",
    "titles": "🏅 TÍTULOS",
    "skills": "🔧 HABILIDADES",
    "languages": "🌐 IDIOMAS",
    "certifications": "📜 CERTIFICACIONES",
    "projects": "📁 PROYECTOS",
    "summary": "📝 PERFIL",
    "awards": "🏆 PREMIOS",
    "volunteer": "🤝 VOLUNTARIADO",
    "interests": "🎯 INTERESES",
    "references": "👥 REFERENCIAS",
    "other": "📋 OTROS",
    "personal_info": "👤 CONTACTO",
}

METHOD_ICONS = {"llm": "🧠", "heuristic": "⚙️", "default": "❌", "exception": "💥"}


async def parse_file(filepath: str) -> tuple[str, str]:
    """Parsea un archivo PDF o TXT y retorna (texto, nombre_archivo)."""
    path = Path(filepath)
    if not path.exists():
        raise FileNotFoundError(f"Archivo no encontrado: {filepath}")

    ext = path.suffix.lower()
    nombre = path.name

    if ext == ".txt":
        text = path.read_text(encoding="utf-8")
        return text, nombre

    if ext == ".pdf":
        from app.services.file_parser_service import FileParserService
        content = path.read_bytes()
        parser = FileParserService()
        result = await parser.parse_file(content, nombre)
        if not result.get("success", False):
            raise RuntimeError(f"Error parseando PDF: {result.get('error', 'desconocido')}")
        return result["text"], nombre

    raise ValueError(f"Formato no soportado: {ext}. Usa .pdf o .txt")


async def run_pipeline(filepath: str):
    """Ejecuta el pipeline completo de extracción por secciones."""
    t0 = time.time()

    # ── 1. Parsear archivo ──
    print(f"\n{SEP}")
    print(f"  PIPELINE DE EXTRACCIÓN POR SECCIONES")
    print(f"{SEP}")

    try:
        cv_text, filename = await parse_file(filepath)
    except Exception as e:
        print(f"\n  ❌ ERROR: {e}")
        return

    print(f"  CV: {filename}")
    print(f"  Texto extraído: {len(cv_text)} caracteres, {len(cv_text.split(chr(10)))} líneas")
    print(f"{SEP}")

    # ── 2. Inicializar servicios ──
    llm_service = None
    try:
        llm_service = LLMService()
        provider_info = f"provider={llm_service.provider}"
    except Exception as e:
        provider_info = f"sin LLM ({e})"
        print(f"\n  [WARN] LLM no disponible: {e}")
        print(f"  [WARN] Continuando SOLO con fallbacks heuristicos y defaults...")

    if llm_service is None:
        # Mock que devuelve None para que el SectionExtractor use heuristicos
        class MockLLM:
            provider = "mock"
            async def call_agent(self, *a, **kw):
                return None
            async def call_agent_structured(self, *a, **kw):
                return None
        llm_service = MockLLM()

    robust_service = RobustExtractionService(llm_service)

    print(f"  Proveedor LLM: {provider_info}")

    # ── 3. FASE 1: Segmentación ──
    print(f"\n  {SEP2}")
    print(f"  SECCIONES DETECTADAS:")
    print(f"  {SEP2}")

    analyzer = DocumentAnalyzerService()
    sections = analyzer.analyze(cv_text)

    if not sections:
        print("  ⚠️  No se detectaron secciones. Abortando.")
        return

    section_contents = {}
    lines = cv_text.split('\n')
    for s in sections:
        content = '\n'.join(lines[s.start_line:s.end_line]).strip()
        section_contents[s.section_type.value] = content
        preview = content[:60].replace('\n', ' | ')
        icon = ST_MAP.get(s.section_type.value, "  ")
        print(f"  {icon:25s} \"{s.section_name[:50]}\"")
        print(f"  {'':25s} líneas {s.start_line}-{s.end_line} ({len(content)} chars) conf={s.confidence:.0%}")
        print(f"  {'':25s} → \"{preview}...\"")

    print(f"\n  Total: {len(sections)} secciones detectadas")

    # ── 4. FASE 2: Extracción paralela ──
    print(f"\n  {SEP2}")
    print(f"  RESULTADOS DE EXTRACCIÓN:")
    print(f"  {SEP2}")

    try:
        section_results = await robust_service._extract_by_sections(cv_text, "pipeline_test")
    except Exception as e:
        print(f"\n  ❌ Error en extracción: {e}")
        return

    if not section_results:
        print("  ⚠️  No se obtuvieron resultados de extracción.")
        return

    for key, result in section_results.items():
        icon = METHOD_ICONS.get(result.method, "  ")
        status = "✅" if result.success else "⚠️"
        section_label = ST_MAP.get(key, f"[{key}]")

        detail = ""
        if result.success and result.data:
            d = result.data
            if key == "experience":
                exps = d.get("experiencias", [])
                detail = f"→ {len(exps)} experiencias"
                if exps:
                    cargo = exps[0].get("cargo") or "?"
                    detail += f" (1º: \"{str(cargo)[:50]}\")"
            elif key == "titles":
                titular = d.get("titulo_profesional") or ""
                form = d.get("formacion", [])
                detail = f"→ titular: \"{str(titular)[:60]}\", {len(form)} grados"
            elif key == "education":
                form = d.get("formacion", [])
                detail = f"→ {len(form)} items"
                if form:
                    detail += f" (1º: \"{str(form[0].get('titulo', ''))[:50]}\")"
            elif key == "skills":
                tech = d.get("habilidades_tecnicas", [])
                soft = d.get("habilidades_blandas", [])
                langs = d.get("idiomas", [])
                detail = f"→ {len(tech)} técnicas, {len(soft)} blandas, {len(langs)} idiomas"
            elif key == "summary":
                resumen = d.get("resumen") or ""
                detail = f"→ \"{str(resumen)[:60]}...\"" if len(str(resumen)) > 60 else f"→ \"{resumen}\""
            elif key == "other":
                items = d.get("items", []) if isinstance(d, dict) else (d if isinstance(d, list) else [])
                detail = f"→ {len(items)} items"
                if items and len(items) > 0:
                    detail += f" (1º: \"{str(items[0])[:60]}\")"
            elif key == "certifications":
                items = d.get("items", [])
                detail = f"→ {len(items)} certificaciones"

        print(f"  {icon} {section_label:25s} {icon} {result.method:12s} "
              f"({result.processing_time_ms / 1000:.2f}s) {detail}")
        if result.error:
            print(f"  {'':25s} error: {result.error}")

    # ── 5. FASE 3: Merge ──
    print(f"\n  {SEP2}")
    print(f"  RESULTADO FINAL (ResumeData):")
    print(f"  {SEP2}")

    merged = robust_service._merge_section_results(section_results, cv_text, "pipeline_test")

    contacto = merged.get("datos_contacto", {})
    print(f"  👤 Nombre:            {contacto.get('nombre_completo', 'No extraído')}")
    print(f"  📧 Email:             {contacto.get('email', 'N/A')}")
    print(f"  📞 Teléfono:          {contacto.get('telefono', 'N/A')}")
    print(f"  📍 Ubicación:         {contacto.get('ubicacion', 'N/A')}")

    titular = merged.get("titular_profesional", {}).get("titular", "No extraído")
    titular_label = "✅ CORRECTO" if "Gerente" not in titular else "⚠️  ¡ES UN CARGO LABORAL!"
    print(f"\n  🏅 Titular profesional: {titular}")
    if "Gerente" in titular or "Jefe" in titular or "Coordinador" in titular:
        print(f"     🔴 ADVERTENCIA: El titular parece ser un cargo laboral, no un título profesional")
    else:
        print(f"     ✅ El titular parece ser un título profesional (no cargo laboral)")

    resumen = merged.get("resumen_profesional", {}).get("resumen", "")
    if resumen:
        preview = resumen[:100] + ("..." if len(resumen) > 100 else "")
        print(f"\n  📝 Resumen: \"{preview}\"")

    exps = merged.get("experiencia_laboral", [])
    print(f"\n  💼 Experiencia laboral: {len(exps)} posiciones")
    for i, exp in enumerate(exps[:3]):
        cargo = exp.get("cargo", "?")
        empresa = exp.get("empresa", "?")
        print(f"     {i+1}. {cargo} — {empresa}")

    formacion = merged.get("formacion_academica", [])
    print(f"\n  🎓 Formación académica: {len(formacion)} items")
    for edu in formacion[:3]:
        t = edu.get("titulo", "?")
        inst = edu.get("institucion", "?")
        print(f"     • {t} ({inst})")

    hab = merged.get("habilidades", {})
    print(f"\n  🔧 Habilidades técnicas: {len(hab.get('habilidades_tecnicas', []))}")
    print(f"  🗣️  Idiomas:              {len(hab.get('idiomas', []))}")
    print(f"  🤝 Habilidades blandas:   {len(hab.get('habilidades_blandas', []))}")

    certs = merged.get("formacion_complementaria", {}).get("certificaciones_cursos", [])
    print(f"\n  📜 Certificaciones: {len(certs)}")
    for c in certs[:5]:
        print(f"     • {c}")

    otros = merged.get("otros_antecedentes", [])
    if otros:
        print(f"\n  📋 Otros antecedentes: {len(otros)} items")
        for item in otros[:5]:
            print(f"     • {item}")

    referencias = merged.get("referencias", [])
    if referencias:
        print(f"\n  👥 Referencias: {len(referencias)} contactos")
        for ref in referencias[:10]:
            nombre = ref.get("nombre", "N/A") if isinstance(ref, dict) else str(ref)
            telefono = ref.get("telefono", "N/A") if isinstance(ref, dict) else "N/A"
            print(f"     • {nombre} — {telefono}")
    else:
        print(f"\n  👥 Referencias: 0 contactos")

    # ── Timing ──
    elapsed = time.time() - t0
    print(f"\n  {SEP}")
    print(f"  ⏱️  TIEMPO TOTAL: {elapsed:.1f}s")
    print(f"  {SEP}\n")


def main():
    if len(sys.argv) > 1:
        filepath = sys.argv[1]
    else:
        # Usar el CV de Rocío por defecto (archivo de texto)
        default = Path(__file__).resolve().parent / "test_cv_rocio.txt"
        if default.exists():
            filepath = str(default)
        else:
            print("ERROR: Especifica una ruta de archivo o asegúrate de que exista un CV por defecto.")
            sys.exit(1)

    print(f"\n[FILE] Archivo: {filepath}")
    asyncio.run(run_pipeline(filepath))


if __name__ == "__main__":
    main()
