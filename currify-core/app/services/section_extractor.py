"""
SectionExtractor — Servicio de extracción por secciones del CV.

Cada tipo de sección tiene:
  1. Prompt especializado → LLM
  2. Fallback heurístico (regex)
  3. Valor por defecto

Usa asyncio.gather + semáforo para extraer todas las secciones en paralelo.
"""
from __future__ import annotations

import asyncio
import logging
import re
import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from app.models.resume import SectionDetection, SectionType

logger = logging.getLogger(__name__)


# ──────────────────────────────────────────────────────────────────────────────
# Data structures
# ──────────────────────────────────────────────────────────────────────────────

@dataclass
class SectionResult:
    """Resultado de extracción de una sección."""
    section_type: str
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    method: str = "llm"          # "llm" | "heuristic" | "default" | "exception"
    processing_time_ms: float = 0.0


# ──────────────────────────────────────────────────────────────────────────────
# Specialized prompts per section type
# ──────────────────────────────────────────────────────────────────────────────

PROMPT_EXPERIENCE = r"""Eres un extractor de historial laboral. Extrae del texto TODAS las experiencias.

⛔ REGLAS CRÍTICAS:
1. TEXTO LITERAL: Las responsabilidades deben ser el texto EXACTO del CV. NO resumas, NO parafrasees, NO conviertas párrafos en bullets.
2. Cargo COMPLETO: "Gerente de Sucursal Valdivia", NO "Gerente".
3. Empresa: razón social completa, separada del cargo.
4. Fechas: "Enero 2019" → "2019-01", "A la Fecha" → "Presente"
5. NO mezcles información entre distintas experiencias.
6. Si una experiencia no tiene fechas, NO las inventes. Usa null.

Output JSON: {"experiencias": [{"cargo": "...", "empresa": "...", "periodo": {"fecha_inicio": "...", "fecha_fin": "...", "texto_original": "..."}, "responsabilidades": ["...", "..."]}]}"""

PROMPT_TITLES = r"""Eres un clasificador de títulos profesionales y credenciales académicas.

⛔ DIFERENCIA CLAVE:
- "Título profesional" = PROFESIÓN de la persona (Ingeniero Civil, Médico, Abogado)
- "Cargo laboral" = puesto de trabajo (Gerente, Jefe, Coordinador) → NO es un título

INSTRUCCIONES:
1. Busca el TÍTULO PROFESIONAL (lo que estudió, no dónde trabajó). Busca palabras como: Ingeniero/a, Licenciado/a, Arquitecto/a, Médico/a, Abogado/a, Contador/a, Profesor/a, Doctor/a, Psicólogo/a
2. Si hay varios títulos, prioriza: Doctorado > Magíster > Licenciatura > Técnico
3. Extrae TODOS los títulos/grados con su institución y fecha si está disponible
4. NO incluyas diplomados ni cursos cortos aquí (van en certificaciones)

Output JSON: {"titulo_profesional": "Ingeniero Civil", "formacion": [{"titulo": "...", "institucion": "...", "periodo": {"fecha_inicio": "...", "fecha_fin": "..."}}]}"""

PROMPT_SKILLS = r"""Extrae habilidades técnicas, idiomas y habilidades blandas del texto.

⛔ REGLAS:
1. habilidades_tecnicas: SOLO herramientas, tecnologías, metodologías. Ej: "Python", "Excel Avanzado", "Metodología Ágil", "SAP", "Power BI"
2. idiomas: idioma + nivel + certificación si existe. Ej: {"idioma": "Inglés", "nivel": "Avanzado", "certificacion": "TOEFL 105"}
3. habilidades_blandas: competencias interpersonales. Ej: "Liderazgo", "Trabajo en equipo"
4. NO incluyas títulos académicos, cargos laborales ni experiencias.

Output JSON: {"habilidades_tecnicas": [{"skill": "...", "level": "..."}], "idiomas": [{"idioma": "...", "nivel": "...", "certificacion": "..."}], "habilidades_blandas": [{"skill": "...", "level": "..."}]}"""

PROMPT_EDUCATION = r"""Extrae formación académica del texto.

⛔ REGLAS:
1. titulo: nombre COMPLETO del grado (ej: "Magíster en Dirección de Empresas")
2. institucion: nombre COMPLETO de la universidad/instituto
3. periodo: fechas normalizadas si están disponibles
4. NO incluyas certificaciones ni cursos cortos
5. Extrae TODOS los items, no omitas ninguno

Output JSON: {"formacion": [{"titulo": "...", "institucion": "...", "periodo": {"fecha_inicio": "...", "fecha_fin": "..."}}]}"""

PROMPT_SUMMARY = r"""Extrae el resumen profesional o perfil del CV.

Si el CV tiene un párrafo bajo títulos como "Perfil", "Resumen", "Sobre mí", "Objetivo profesional", "Professional Summary":
→ Extrae el TEXTO LITERAL COMPLETO de ese párrafo.
→ NO resumas, NO acortes, NO parafrasees.

Si no hay resumen profesional en el texto → devuelve "".

Output JSON: {"resumen": "texto literal del resumen profesional"}"""

PROMPT_REFERENCES = r"""Eres un extractor de referencias profesionales. Extrae los datos de contacto de las personas listadas como referencias.

⛔ REGLAS:
1. Cada persona es una entrada separada con nombre, cargo/empresa y teléfono si está disponible.
2. Si el teléfono usa formato (+XX) o +XX, presérvalo exactamente.
3. NO incluyas datos del candidato (nombre, email, etc.) — solo de las referencias.
4. Si no hay referencias en el texto, devuelve una lista vacía.

Output JSON: {"referencias": [{"nombre": "...", "cargo": "...", "empresa": "...", "telefono": "..."}]}"""

PROMPT_OTHER = r"""Captura el contenido de esta sección como items de texto estructurado.

⛔ REGLA DE CONTINUACIÓN: Las líneas sin bullet (•, -, ✓) que aparecen inmediatamente después de un item son CONTINUACIONES de ese item, NO items separados. Ejemplo:
  "• Inglés nivel Intermedio"
  "  Bond University, Australia"  ← esto es continuación, NO un nuevo item
Debe quedar como UN solo item: "Inglés nivel Intermedio Bond University, Australia"

Esta sección no corresponde a una categoría estándar de CV. Extrae:
1. section_name: el nombre original de la sección
2. items: lista de strings con el contenido, preservando bullets y formato original

NO resumas. NO interpretes. Simplemente estructura el texto en items.

Output JSON: {"section_name": "...", "items": ["línea 1", "línea 2", ...]}"""

# Prompt por defecto para cualquier otro tipo de sección
PROMPT_DEFAULT = PROMPT_OTHER

# Mapa de prompts
_PROMPT_MAP: Dict[SectionType, str] = {
    SectionType.EXPERIENCE: PROMPT_EXPERIENCE,
    SectionType.TITLES: PROMPT_TITLES,
    SectionType.SKILLS: PROMPT_SKILLS,
    SectionType.EDUCATION: PROMPT_EDUCATION,
    SectionType.SUMMARY: PROMPT_SUMMARY,
    SectionType.OTHER: PROMPT_OTHER,
    SectionType.LANGUAGES: PROMPT_SKILLS,      # languages extraídas junto con skills
    SectionType.CERTIFICATIONS: PROMPT_OTHER,
    SectionType.PROJECTS: PROMPT_OTHER,
    SectionType.AWARDS: PROMPT_OTHER,
    SectionType.VOLUNTEER: PROMPT_OTHER,
    SectionType.INTERESTS: PROMPT_OTHER,
    SectionType.REFERENCES: PROMPT_REFERENCES,
    SectionType.PERSONAL_INFO: PROMPT_OTHER,
}


# ──────────────────────────────────────────────────────────────────────────────
# Heuristic fallback implementations
# ──────────────────────────────────────────────────────────────────────────────

def _heuristic_experience(content: str) -> Optional[Dict[str, Any]]:
    """Extrae experiencia laboral con regex."""
    experiencias: List[Dict[str, Any]] = []
    lines = content.strip().split('\n')

    # Regex: buscar fechas (Enero 2019 - Diciembre 2020, 01/2019 - 12/2020, etc.)
    date_pattern = re.compile(
        r'(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre|'
        r'january|february|march|april|may|june|july|august|september|october|november|december|'
        r'\d{1,2})[\s/]+\d{4}',
        re.IGNORECASE
    )

    # Regex: cargos comunes
    cargo_keywords = [
        r'(?:gerente|jefe|director|coordinador|supervisor|analista|asistente|'
        r'ingeniero|licenciado|profesor|consultor|especialista|técnico|'
        r'manager|head|lead|senior|junior|chief|VP|president|'
        r'desarrollador|programador|arquitecto|diseñador)',
    ]
    cargo_pattern = re.compile('|'.join(cargo_keywords), re.IGNORECASE)

    current_exp: Optional[Dict[str, Any]] = None

    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue

        # Si encontramos una fecha, posible inicio de nueva experiencia
        date_matches = date_pattern.findall(stripped)
        if date_matches and len(date_matches) >= 1:
            if current_exp and current_exp.get("cargo"):
                experiencias.append(current_exp)
            current_exp = {"cargo": None, "empresa": None, "periodo": {
                "fecha_inicio": date_matches[0] if date_matches else None,
                "fecha_fin": date_matches[1] if len(date_matches) > 1 else None,
                "texto_original": stripped
            }, "responsabilidades": []}
            continue

        # Si hay keyword de cargo
        if cargo_pattern.search(stripped):
            if not current_exp:
                current_exp = {"cargo": stripped, "empresa": None, "periodo": {
                    "fecha_inicio": None, "fecha_fin": None,
                    "texto_original": None
                }, "responsabilidades": []}
            elif not current_exp.get("cargo"):
                current_exp["cargo"] = stripped
            elif current_exp.get("cargo") and not current_exp.get("empresa"):
                current_exp["empresa"] = stripped
            else:
                current_exp.setdefault("responsabilidades", []).append(stripped)
            continue

        if current_exp:
            current_exp.setdefault("responsabilidades", []).append(stripped)

    if current_exp and current_exp.get("cargo"):
        experiencias.append(current_exp)

    if experiencias:
        return {"experiencias": experiencias}
    return None


def _heuristic_titles(content: str) -> Optional[Dict[str, Any]]:
    """Busca títulos profesionales con keywords en el texto."""
    title_keywords = [
        r'(?:ingeniero|ingeniera)\s+(?:civil\s+)?(?:en\s+)?\w+',
        r'(?:licenciado|licenciada)\s+(?:en\s+)?\w+',
        r'(?:arquitecto|arquitecta)',
        r'(?:médico|médica|medico|medica)\s+(?:cirujano|cirujana)?',
        r'(?:abogado|abogada)',
        r'(?:contador|contadora)\s+(?:público|publico|pública|publica)?',
        r'(?:profesor|profesora)\s+(?:de\s+)?\w+',
        r'(?:doctor|doctora)\s+(?:en\s+)?\w+',
        r'(?:psicólogo|psicóloga|psicologo|psicologa)',
        r'(?:magíster|magister|master)\s+(?:en\s+)?\w+',
    ]
    combined = re.compile('|'.join(title_keywords), re.IGNORECASE)

    matches = combined.findall(content)
    if matches:
        return {
            "titulo_profesional": matches[0].strip(),
            "formacion": []
        }
    return None


def _heuristic_skills(content: str) -> Optional[Dict[str, Any]]:
    """Parseo de habilidades desde bullets/líneas/comas."""
    lines = content.strip().split('\n')
    tech_skills: List[Dict[str, str]] = []
    soft_skills: List[str] = []
    languages: List[Dict[str, Optional[str]]] = []

    # Known tech skills
    tech_keywords = [
        "python", "java", "javascript", "sql", "excel", "power bi", "sap",
        "html", "css", "react", "angular", "vue", "node", "aws", "azure",
        "docker", "kubernetes", "git", "linux", "windows", "office",
        "metodología ágil", "scrum", "kanban", "jira", "tableau",
        "photoshop", "illustrator", "autocad", "solidworks", "matlab",
    ]

    # Known soft skills
    soft_keywords = [
        "liderazgo", "trabajo en equipo", "comunicación", "resolución",
        "proactividad", "adaptabilidad", "organización", "creatividad",
    ]

    # Known languages
    lang_keywords = [
        "inglés", "ingles", "english", "español", "spanish", "francés",
        "frances", "french", "alemán", "aleman", "german", "portugués",
        "portugues", "portuguese", "italiano", "italian", "chino",
        "chinese", "japonés", "japones", "japanese",
    ]

    for line in lines:
        stripped = line.strip().strip('-•* ').strip()
        if not stripped:
            continue

        lower = stripped.lower()

        # Check for languages
        for lang_kw in lang_keywords:
            if lang_kw in lower:
                nivel: Optional[str] = None
                for lv in ["nativo", "avanzado", "intermedio", "básico", "basico"]:
                    if lv in lower:
                        nivel = lv.capitalize()
                        break
                languages.append({"idioma": stripped, "nivel": nivel, "certificacion": None})
                break
        else:
            # Check for tech skills
            is_tech = any(kw in lower for kw in tech_keywords)
            is_soft = any(kw in lower for kw in soft_keywords)

            if is_tech:
                tech_skills.append({"skill": stripped, "level": "Intermedio"})
            elif is_soft:
                soft_skills.append(stripped)
            else:
                # If it looks like a tech term (short, no verbs), classify as tech
                if len(stripped.split()) <= 3:
                    tech_skills.append({"skill": stripped, "level": "Intermedio"})
                else:
                    soft_skills.append(stripped)

    if tech_skills or soft_skills or languages:
        return {
            "habilidades_tecnicas": tech_skills,
            "idiomas": languages,
            "habilidades_blandas": soft_skills if soft_skills else [],
        }
    return None


def _heuristic_education(content: str) -> Optional[Dict[str, Any]]:
    """Extrae formación académica con regex de universidad + grado."""
    uni_keywords = [
        "universidad", "instituto", "college", "university", "school",
        "facultad", "politécnico", "politecnico", "escuela",
    ]
    degree_keywords = [
        "magíster", "magister", "master", "licenciatura", "licenciado",
        "ingeniería", "ingenieria", "doctorado", "phd", "bachiller",
        "técnico", "tecnico", "diplomado", "grado", "mba",
    ]

    formacion: List[Dict[str, Any]] = []
    lines = content.strip().split('\n')

    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue
        lower = stripped.lower()

        has_uni = any(kw in lower for kw in uni_keywords)
        has_degree = any(kw in lower for kw in degree_keywords)

        if has_uni or has_degree:
            entry: Dict[str, Any] = {
                "titulo": stripped if has_degree else None,
                "institucion": stripped if has_uni else None,
                "periodo": {"fecha_inicio": None, "fecha_fin": None}
            }
            # Check for dates
            date_match = re.search(r'(\d{4})', stripped)
            if date_match:
                entry["periodo"]["fecha_fin"] = date_match.group(1)
            formacion.append(entry)

    if formacion:
        # Merge adjacent entries where one has title and the other has institution
        merged: List[Dict[str, Any]] = []
        i = 0
        while i < len(formacion):
            entry = formacion[i].copy()
            if i + 1 < len(formacion):
                if not entry.get("titulo") and formacion[i + 1].get("titulo"):
                    entry["titulo"] = formacion[i + 1]["titulo"]
                    if not entry.get("institucion"):
                        entry["institucion"] = formacion[i + 1].get("institucion")
                    i += 1
                elif not entry.get("institucion") and formacion[i + 1].get("institucion"):
                    entry["institucion"] = formacion[i + 1]["institucion"]
                    if not entry.get("titulo"):
                        entry["titulo"] = formacion[i + 1].get("titulo")
                    i += 1
            merged.append(entry)
            i += 1
        return {"formacion": merged}

    return None


def _heuristic_summary(content: str) -> Optional[Dict[str, Any]]:
    """Devuelve el texto completo como resumen."""
    text = content.strip()
    if text and len(text) > 10:
        return {"resumen": text}
    return None


def _heuristic_references(content: str) -> Optional[Dict[str, Any]]:
    """Extrae referencias con regex: nombre + cargo/empresa + teléfono."""
    lines = [l.strip() for l in content.split('\n') if l.strip()]
    
    referencias = []
    current_ref: Dict[str, str] = {}
    
    for line in lines:
        # Detectar teléfono
        phone_match = re.search(r'(\(\+\d{1,3}\)[\s\-.]?\d[\d\s\-.]{6,}|\+\d{1,3}[\s\-.]?\d[\d\s\-.]{6,})', line)
        if phone_match:
            current_ref['telefono'] = phone_match.group(0).strip()
        
        # Si la línea parece un nombre (2+ palabras capitalizadas, corta, sin números ni bullets)
        first_char_upper = line[0].isupper() if line else False
        words = line.split()
        capital_words = sum(1 for w in words if w and w[0].isupper())
        if (len(line) < 80 and len(words) >= 2 
            and not line.startswith(('•', '-', '*', '✓', '\uf0fc'))
            and not any(c.isdigit() for c in line[:5])
            and first_char_upper
            and capital_words >= 2):
            
            if current_ref and 'nombre' in current_ref:
                referencias.append(current_ref)
                current_ref = {}
            current_ref['nombre'] = line
        elif current_ref and 'nombre' in current_ref and 'cargo' not in current_ref:
            current_ref['cargo'] = line
    
    if current_ref and 'nombre' in current_ref:
        referencias.append(current_ref)
    
    return {"referencias": referencias} if referencias else None


def _heuristic_other(content: str) -> Optional[Dict[str, Any]]:
    """Devuelve el contenido como items (líneas no vacías)."""
    lines = [l.strip() for l in content.strip().split('\n') if l.strip()]
    if lines:
        return {"section_name": "", "items": lines}
    return None


# Mapa de fallbacks heurísticos
_HEURISTIC_MAP: Dict[SectionType, Any] = {
    SectionType.EXPERIENCE: _heuristic_experience,
    SectionType.TITLES: _heuristic_titles,
    SectionType.SKILLS: _heuristic_skills,
    SectionType.LANGUAGES: _heuristic_skills,
    SectionType.EDUCATION: _heuristic_education,
    SectionType.SUMMARY: _heuristic_summary,
    SectionType.CERTIFICATIONS: _heuristic_other,
    SectionType.PROJECTS: _heuristic_other,
    SectionType.AWARDS: _heuristic_other,
    SectionType.VOLUNTEER: _heuristic_other,
    SectionType.INTERESTS: _heuristic_other,
    SectionType.REFERENCES: _heuristic_references,
    SectionType.OTHER: _heuristic_other,
    SectionType.PERSONAL_INFO: _heuristic_other,
}


# ──────────────────────────────────────────────────────────────────────────────
# Default (empty) values per section type
# ──────────────────────────────────────────────────────────────────────────────

def _default_experience() -> Dict[str, Any]:
    return {"experiencias": []}

def _default_titles() -> Dict[str, Any]:
    return {"titulo_profesional": "No extraído", "formacion": []}

def _default_skills() -> Dict[str, Any]:
    return {"habilidades_tecnicas": [], "idiomas": [], "habilidades_blandas": []}

def _default_education() -> Dict[str, Any]:
    return {"formacion": []}

def _default_summary() -> Dict[str, Any]:
    return {"resumen": ""}

def _default_other() -> Dict[str, Any]:
    return {"section_name": "", "items": []}

def _default_references() -> Dict[str, Any]:
    return {"referencias": []}


_DEFAULT_MAP: Dict[SectionType, Any] = {
    SectionType.EXPERIENCE: _default_experience,
    SectionType.TITLES: _default_titles,
    SectionType.SKILLS: _default_skills,
    SectionType.LANGUAGES: _default_skills,
    SectionType.EDUCATION: _default_education,
    SectionType.SUMMARY: _default_summary,
    SectionType.CERTIFICATIONS: _default_other,
    SectionType.PROJECTS: _default_other,
    SectionType.AWARDS: _default_other,
    SectionType.VOLUNTEER: _default_other,
    SectionType.INTERESTS: _default_other,
    SectionType.REFERENCES: _default_references,
    SectionType.OTHER: _default_other,
    SectionType.PERSONAL_INFO: _default_other,
}


# ──────────────────────────────────────────────────────────────────────────────
# SectionExtractor
# ──────────────────────────────────────────────────────────────────────────────

class SectionExtractor:
    """
    Extrae datos estructurados de UNA sección del CV usando 3 niveles:
      1. LLM con prompt especializado (timeout 30s)
      2. Fallback heurístico
      3. Valor por defecto
    """

    def __init__(self, llm_service):
        """
        Args:
            llm_service: instancia de LLMService inyectada para testabilidad
        """
        self.llm_service = llm_service

    async def extract_section(
        self,
        section: SectionDetection,
        content: str,
        request_id: str = "unknown",
    ) -> SectionResult:
        """
        Extrae datos de una sección con 3 niveles de resiliencia.

        Args:
            section: SectionDetection con metadatos de la sección
            content: texto completo de la sección (recortado del CV original)
            request_id: ID de request para trazabilidad
        """
        start = time.time()
        last_error: Optional[str] = None
        section_type = section.section_type

        # ── Nivel 1: LLM con prompt especializado ──
        try:
            result = await asyncio.wait_for(
                self._extract_with_llm(section_type, content, request_id),
                timeout=30.0,
            )
            if result is not None:
                return SectionResult(
                    section_type=section_type.value,
                    success=True,
                    data=result,
                    method="llm",
                    processing_time_ms=(time.time() - start) * 1000,
                )
            else:
                logger.warning(
                    "[%s] LLM returned None for section %s", request_id, section_type.value
                )
                last_error = "LLM returned None"
        except asyncio.TimeoutError:
            logger.warning("[%s] Timeout (30s) en sección %s", request_id, section_type.value)
            last_error = "Timeout after 30s"
        except Exception as e:
            logger.warning("[%s] Error LLM en sección %s: %s", request_id, section_type.value, e)
            last_error = str(e)

        # ── Nivel 2: Fallback heurístico ──
        try:
            heuristic_result = self._heuristic_fallback(section_type, content)
            if heuristic_result:
                return SectionResult(
                    section_type=section_type.value,
                    success=True,
                    data=heuristic_result,
                    method="heuristic",
                    processing_time_ms=(time.time() - start) * 1000,
                )
        except Exception as e:
            logger.error(
                "[%s] Error heurístico en sección %s: %s", request_id, section_type.value, e
            )

        # ── Nivel 3: Default ──
        return SectionResult(
            section_type=section_type.value,
            success=False,
            data=self._default_result(section_type),
            method="default",
            error=last_error or "All levels exhausted",
            processing_time_ms=(time.time() - start) * 1000,
        )

    async def extract_all(
        self,
        sections: List[SectionDetection],
        sections_content: Dict[str, str],
        request_id: str = "unknown",
        max_concurrent: int = 3,
    ) -> Dict[str, SectionResult]:
        """
        Extrae TODAS las secciones en paralelo usando asyncio.gather + semáforo.

        Args:
            sections: lista de secciones detectadas
            sections_content: dict mapeando section_type.value → texto de la sección
            request_id: ID de request para trazabilidad
            max_concurrent: máximo de llamadas LLM simultáneas por request
        """
        sem = asyncio.Semaphore(max_concurrent)

        async def _bounded_extract(section: SectionDetection) -> SectionResult:
            async with sem:
                content = sections_content.get(section.section_type.value, "")
                return await self.extract_section(section, content, request_id)

        tasks = [_bounded_extract(s) for s in sections]
        raw_results = await asyncio.gather(*tasks, return_exceptions=True)

        output: Dict[str, SectionResult] = {}
        for i, result in enumerate(raw_results):
            section = sections[i]
            key = section.section_type.value
            if isinstance(result, Exception):
                output[key] = SectionResult(
                    section_type=key,
                    success=False,
                    error=str(result),
                    method="exception",
                )
            else:
                output[key] = result

        return output

    # ──────────────────────────────────────────────────────────────────────
    # LLM extraction
    # ──────────────────────────────────────────────────────────────────────

    async def _extract_with_llm(
        self, section_type: SectionType, content: str, request_id: str
    ) -> Optional[Dict[str, Any]]:
        """Llama al LLM con el prompt especializado para el tipo de sección."""
        prompt = _PROMPT_MAP.get(section_type, PROMPT_DEFAULT)

        if not content or not content.strip():
            return None

        result = await self.llm_service.call_agent(
            prompt=prompt,
            input_data=content,
            stage_name=f"section_{section_type.value}",
            temperature=0.0,
            request_id=request_id,
        )
        return result

    # ──────────────────────────────────────────────────────────────────────
    # Heuristic fallback
    # ──────────────────────────────────────────────────────────────────────

    def _heuristic_fallback(
        self, section_type: SectionType, content: str
    ) -> Optional[Dict[str, Any]]:
        """Aplica el fallback heurístico correspondiente al tipo de sección."""
        func = _HEURISTIC_MAP.get(section_type)
        if func:
            return func(content)
        return None

    # ──────────────────────────────────────────────────────────────────────
    # Default values
    # ──────────────────────────────────────────────────────────────────────

    def _default_result(self, section_type: SectionType) -> Dict[str, Any]:
        """Retorna un valor por defecto para el tipo de sección."""
        func = _DEFAULT_MAP.get(section_type, _default_other)
        return func()
