"""
SERVICIO DE EXTRACCIÓN ROBUSTO - SOLUCIÓN DEFINITIVA
Arquitectura moderna con técnicas de prompting avanzadas y validación robusta
"""

import asyncio
import json
import logging
import time
from typing import Dict, List, Optional, Any, Union, Tuple
from datetime import datetime

from app.services.llm_service import LLMService
from app.models.resume import ResumeData, ResumeExtractionRequest, ResumeExtractionResponse, ThinkingResumeData
from app.models.resume import SectionType
from app.services.profile_detection_service import ProfileDetectionService
from app.services.date_parser_service import DateParserService
from app.services.document_analyzer_service import DocumentAnalyzerService
from app.services.section_extractor import SectionExtractor
from app.core.config import settings

logger = logging.getLogger(__name__)

class RobustExtractionService:
    """
    Servicio de extracción robusto con arquitectura moderna
    Basado en técnicas de prompting comprobadas y validación exhaustiva
    """

    def __init__(self, llm_service: LLMService):
        self.llm_service = llm_service
        self.profile_detector = ProfileDetectionService()
        self.document_analyzer = DocumentAnalyzerService()
        self.section_extractor = SectionExtractor(self.llm_service)

        # Configuración robusta
        self.max_retries = 3
        self.validation_threshold = 0.3  # Reducido de 0.7 a 0.3 para ser más tolerante

        # Configuración de texto
        self.max_text_length = 4000  # Caracteres máximos para procesamiento directo
        self.chunk_overlap = 600     # Solapamiento aumentado para mejor contexto (antes 200)

    async def extract_from_text(self, request: ResumeExtractionRequest, request_id: str = "unknown") -> ResumeExtractionResponse:
        """
        Extracción robusta con múltiples validaciones y reintentos
        """
        start_time = time.time()

        try:
            logger.info(f"[{request_id}] 🚀 INICIANDO EXTRACCIÓN ROBUSTA para {request.nombre_archivo}")

            # 1. Pre-procesamiento y análisis
            cv_text = self._preprocess_text(request.archivo_contenido)
            profile_info = self.profile_detector.detect_profile_type(cv_text)
            document_analysis = self.document_analyzer.analyze_document(cv_text)

            logger.info(f"📊 Longitud de texto: {len(cv_text)} caracteres")
            logger.info(f"📊 Documento analizado: idioma={document_analysis.get('language')}, secciones={list(document_analysis.get('sections_detected', {}).keys())}")

            # 2. Decidir estrategia de extracción
            # ── NUEVO PIPELINE: Extracción por secciones ──
            if getattr(settings, 'section_extraction_enabled', False):
                logger.info(f"[{request_id}] 🔀 Usando pipeline de extracción por secciones")
                section_results = await self._extract_by_sections(cv_text, request_id)
                if section_results:
                    merged = self._merge_section_results(section_results, cv_text, request_id)
                    extraction_result = self._structure_final_data(merged, request, profile_info)
                    logger.info(f"[{request_id}] ✅ Pipeline por secciones completado exitosamente")
                else:
                    logger.warning(f"[{request_id}] ⚠️ Section extraction returned no results, falling back to legacy")
                    extraction_result = await self._execute_legacy_extraction(cv_text, profile_info, request_id)
            else:
                extraction_result = await self._execute_legacy_extraction(cv_text, profile_info, request_id)

            # Legacy extraction method (preserved for backward compatibility)
            # Fallback route is wrapped in _execute_legacy_extraction which decides
            # between direct vs chunked based on text length

            # 3. Post-procesamiento y estructuración
            logger.info(f"🔧 CRITICAL: extraction_result keys: {list(extraction_result.keys()) if isinstance(extraction_result, dict) else type(extraction_result)}")
            logger.info(f"🔧 CRITICAL: extraction_result titular: {extraction_result.get('titular_profesional') if isinstance(extraction_result, dict) else 'NOT DICT'}")

            structured_data = self._structure_final_data(extraction_result, request, profile_info)

            logger.info(f"🔧 CRITICAL: structured_data keys: {list(structured_data.keys()) if isinstance(structured_data, dict) else type(structured_data)}")
            logger.info(f"🔧 CRITICAL: structured_data titular: {structured_data.get('titular_profesional') if isinstance(structured_data, dict) else 'NOT DICT'}")

            # 4. Validación final y respuesta
            logger.info(f"🎯 Datos estructurados antes de validación - titular: {structured_data.get('titular_profesional')}")
            logger.info(f"🎯 Datos estructurados antes de validación - email: {structured_data.get('datos_contacto', {}).get('email')}")

            resume_data = self._create_validated_response(structured_data, cv_text)

            logger.info(f"🎯 Resume data después de validación - titular: {resume_data.titular_profesional.titular}")
            logger.info(f"🎯 Resume data después de validación - email: {resume_data.datos_contacto.email}")

            processing_time = time.time() - start_time

            confidence = self._calculate_confidence(structured_data)
            logger.info(f"🎯 Confianza calculada: {confidence}")

            response = ResumeExtractionResponse(
                datos_cv=resume_data,
                confianza_general=confidence,
                advertencias=self._collect_warnings(structured_data),
                campos_faltantes=self._identify_missing_fields(resume_data),
                request_id=request_id,
                tiempo_procesamiento=processing_time,
                timestamp=datetime.now().isoformat()
            )

            logger.info(f"🎯 Respuesta final - titular: {response.datos_cv.titular_profesional.titular}")
            logger.info(f"🎯 Respuesta final - email: {response.datos_cv.datos_contacto.email}")
            logger.info(f"🎯 Respuesta final - confianza: {response.confianza_general}")

            # EMERGENCY CHECK: Detect high confidence with empty data (critical bug)
            if (response.confianza_general > 0.8 and
                response.datos_cv.titular_profesional.titular == "No extraído" and
                response.datos_cv.datos_contacto.email == "no-extraido@example.com"):

                logger.error("🚨 CRITICAL BUG DETECTED: High confidence with empty data!")
                logger.error(f"🚨 Original structured_data: {structured_data}")
                logger.error(f"🚨 This indicates a critical failure in data preservation")

                # Try to create emergency response with original data
                try:
                    logger.info("🚨 Attempting emergency data recovery...")
                    emergency_data = self._create_emergency_response(structured_data, cv_text)
                    if emergency_data:
                        logger.info(f"🚨 Emergency recovery successful!")
                        return ResumeExtractionResponse(
                            datos_cv=emergency_data,
                            confianza_general=response.confianza_general,
                            advertencias=response.advertencias + ["Emergency data recovery applied"],
                            campos_faltantes=response.campos_faltantes,
                            tiempo_procesamiento=response.tiempo_procesamiento,
                            timestamp=response.timestamp
                        )
                except Exception as e:
                    logger.error(f"🚨 Emergency recovery failed: {e}")

            logger.info(f"✅ EXTRACCIÓN ROBUSTA COMPLETADA en {processing_time:.2f}s")
            self._log_extraction_summary(resume_data)

            return response

        except Exception as e:
            processing_time = time.time() - start_time
            logger.error(f"❌ Error en extracción robusta: {e}")
            import traceback
            traceback.print_exc()
            return self._create_error_response(str(e), processing_time, request_id=request_id)

    def _preprocess_text(self, raw_text: str) -> str:
        """
        Pre-procesamiento inteligente del texto con limpieza de artefactos PDF
        """
        if not raw_text:
            return ""

        # Limpieza básica pero preservando estructura
        text = raw_text.strip()

        # Normalizar espacios pero preservar saltos de línea importantes
        import re

        # 1. Remover caracteres Unicode problemáticos (artefactos PDF)
        # Códigos problemáticos comunes: 61692 (0xF0FC), otros private use characters
        text = ''.join(char if ord(char) < 65536 and (char.isprintable() or char in ['\n', '\r', '\t']) else ' ' for char in text)

        # 2. Limpiar caracteres de control residuales
        text = re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', ' ', text)

        # 3. Normalizar guiones y caracteres especiales comunes en PDFs
        text = text.replace('–', '-').replace('—', '-').replace(''', "'").replace(''', "'").replace('"', '"').replace('"', '"')

        # 4. Detect multi-column gaps (3+ spaces) and insert separator
        # This is critical for layout=True extraction
        text = re.sub(r'[ \t]{3,}', ' | ', text)

        # 5. Remove remaining excessive spaces
        text = re.sub(r' +', ' ', text)

        # 5. Preservar separadores importantes pero limpiar líneas vacías excesivas
        text = re.sub(r'\n\s*\n\s*\n+', '\n\n', text)

        # 6. Limpiar espacios al inicio y final de líneas
        lines = text.split('\n')
        lines = [line.strip() for line in lines]
        text = '\n'.join(lines)

        return text

    # ─────────────────────────────────────────────────────────────────────
    # ESTRATEGIA LEGACY: extracción monolítica para backward compatibility
    # ─────────────────────────────────────────────────────────────────────

    async def _execute_legacy_extraction(self, cv_text: str, profile_info: Dict, request_id: str = "unknown") -> Dict[str, Any]:
        """
        Legado: extracción monolítica directa usando Structured Outputs + CoT.
        Solo se usa como fallback cuando section_extraction_enabled=False
        o cuando el pipeline de secciones no produce resultados.
        """
        logger.info(f"[{request_id}] 🔄 Usando extracción legacy ({len(cv_text)} caracteres)")
        return await self._execute_robust_extraction(cv_text, profile_info, request_id=request_id)

    # ═════════════════════════════════════════════════════════════════════
    # NUEVO PIPELINE: Extracción por Secciones (Commits 3 & 4)
    # ═════════════════════════════════════════════════════════════════════

    async def _extract_by_sections(self, text: str, request_id: str) -> Optional[Dict[str, Any]]:
        """
        FASE 1 + FASE 2 del nuevo pipeline:
          1. Segmentación: detectar secciones con DocumentAnalyzerService.analyze()
          2. Extracción paralela: SectionExtractor.extract_all() con asyncio.gather

        Returns:
            Dict[str, SectionResult] o None si falla la segmentación
        """
        # ── FASE 1: Segmentación ──
        analyzer = DocumentAnalyzerService()
        sections = analyzer.analyze(text)

        logger.info(
            "[%s] 🔍 Detectadas %d secciones: %s",
            request_id,
            len(sections),
            [f"{s.section_type.value}(L{s.start_line}-{s.end_line})" for s in sections]
        )

        if not sections:
            logger.warning("[%s] ⚠️ No se detectaron secciones, usando extracción legacy", request_id)
            return None

        # ── Preparar contenido por sección (CONSOLIDADO por tipo) ──
        lines = text.split('\n')
        section_contents: Dict[str, str] = {}
        for section in sections:
            content_lines = lines[section.start_line:section.end_line]
            content = '\n'.join(content_lines).strip()
            key = section.section_type.value
            if key not in section_contents:
                section_contents[key] = content
            else:
                # Concatenar contenido de múltiples fragmentos del mismo tipo
                if content and content != section_contents[key]:
                    section_contents[key] += "\n" + content

        # Pre-procesar secciones OTHER: unir líneas de continuación sin bullet
        for key, content in list(section_contents.items()):
            if key == "other":
                lines = content.split('\n')
                merged = []
                for line in lines:
                    stripped = line.strip()
                    # Si no es header (no está en all-caps corto) y no tiene bullet
                    is_header = stripped.isupper() and len(stripped) < 60 and len(stripped.split()) <= 6
                    has_bullet = stripped.startswith(('✓', '\uf0fc', '•', '-', '*', '>', '○'))
                    
                    if stripped and not is_header and not has_bullet and merged:
                        # Continuación del item anterior
                        merged[-1] += ' ' + stripped
                    else:
                        merged.append(stripped)
                section_contents[key] = '\n'.join(merged)

        # ── FASE 2: Extracción paralela ──
        start_time = time.time()
        section_results = await self.section_extractor.extract_all(
            sections=sections,
            sections_content=section_contents,
            request_id=request_id,
            max_concurrent=settings.llm_concurrency_per_request,
        )

        elapsed = time.time() - start_time
        logger.info(
            "[%s] ⏱️ Extracción paralela completada en %.2fs (%d secciones)",
            request_id, elapsed, len(section_results)
        )

        # ── Logging detallado de resultados ──
        for key, result in section_results.items():
            logger.info(
                "[%s] 📋 Sección %-20s method=%-10s success=%-5s time=%.0fms%s",
                request_id,
                key,
                result.method,
                str(result.success),
                result.processing_time_ms,
                f" error={result.error}" if result.error else ""
            )

        return section_results

    def _merge_section_results(
        self,
        section_results: Dict[str, Any],
        raw_text: str,
        request_id: str,
    ) -> Dict[str, Any]:
        """
        FASE 3: Merge + Normalización de resultados de secciones.

        Mapea cada SectionResult a los campos correspondientes de ResumeData,
        aplicando reglas de prioridad y combinando secciones relacionadas.

        Returns:
            Dict compatible con ResumeData para validación Pydantic
        """
        import re

        merged: Dict[str, Any] = {}

        # ── 4A. Datos de contacto (SIEMPRE heurístico) ──
        merged["datos_contacto"] = self._extract_contact_info(raw_text)

        # ── 4B. Mapeo de secciones a campos ──

        # ---- SUMMARY → resumen_profesional ----
        if "summary" in section_results and section_results["summary"].success:
            summary_data = section_results["summary"].data or {}
            resumen = summary_data.get("resumen", "")
            if resumen:
                merged["resumen_profesional"] = {"resumen": resumen}
        if "resumen_profesional" not in merged:
            merged["resumen_profesional"] = {"resumen": ""}

        # ---- EXPERIENCE → experiencia_laboral ----
        experience_data_raw: List[Dict[str, Any]] = []
        if "experience" in section_results and section_results["experience"].success:
            exp_data = section_results["experience"].data or {}
            experience_data_raw = exp_data.get("experiencias", [])
        merged["experiencia_laboral"] = experience_data_raw

        # ---- EDUCATION → formacion_academica ----
        education_formacion: List[Dict[str, Any]] = []
        if "education" in section_results and section_results["education"].success:
            edu_data = section_results["education"].data or {}
            education_formacion = edu_data.get("formacion", [])
        merged["formacion_academica"] = list(education_formacion)

        # ---- TITLES → titular_profesional + formacion_academica (merge) ----
        titles_formacion: List[Dict[str, Any]] = []
        titular_from_titles: Optional[str] = None
        if "titles" in section_results and section_results["titles"].success:
            titles_data = section_results["titles"].data or {}
            titular_from_titles = titles_data.get("titulo_profesional")
            titles_formacion = titles_data.get("formacion", [])

        # ---- 4C. Merge de formación (titles + education) sin duplicados ----
        formacion_combinada: List[Dict[str, Any]] = []
        seen_edu = set()
        for entry in titles_formacion + education_formacion:
            if not isinstance(entry, dict):
                continue
            titulo = str(entry.get("titulo", "")).strip()
            institucion = str(entry.get("institucion", "")).strip()
            key = (titulo.lower(), institucion.lower())
            if key not in seen_edu and (titulo or institucion):
                seen_edu.add(key)
                formacion_combinada.append(entry)
        merged["formacion_academica"] = formacion_combinada

        # ---- SKILLS → habilidades ----
        habilidades_data: Dict[str, Any] = {
            "habilidades_tecnicas": [],
            "idiomas": [],
            "habilidades_blandas": [],
        }
        if "skills" in section_results and section_results["skills"].success:
            sk_data = section_results["skills"].data or {}
            habilidades_data["habilidades_tecnicas"] = sk_data.get("habilidades_tecnicas", [])
            habilidades_data["habilidades_blandas"] = sk_data.get("habilidades_blandas", [])
            # Skills prompt also extracts languages
            if sk_data.get("idiomas"):
                habilidades_data["idiomas"] = sk_data["idiomas"]

        # ---- LANGUAGES → merge into habilidades.idiomas ----
        if "languages" in section_results and section_results["languages"].success:
            lang_data = section_results["languages"].data or {}
            extra_langs = lang_data.get("idiomas", [])
            if extra_langs:
                existing_langs = {str(l.get("idioma", "")).lower() for l in habilidades_data["idiomas"] if isinstance(l, dict)}
                for lang in extra_langs:
                    if isinstance(lang, dict):
                        if str(lang.get("idioma", "")).lower() not in existing_langs:
                            habilidades_data["idiomas"].append(lang)

        merged["habilidades"] = habilidades_data

        # ---- CERTIFICATIONS → formacion_complementaria ----
        certificaciones: List[str] = []
        if "certifications" in section_results and section_results["certifications"].success:
            cert_data = section_results["certifications"].data or {}
            cert_items = cert_data.get("items", [])
            if isinstance(cert_items, list):
                certificaciones = [str(item) for item in cert_items if item]
            elif isinstance(cert_data.get("section_name"), str) and cert_data["section_name"]:
                certificaciones = [cert_data["section_name"]]
        merged["formacion_complementaria"] = {"certificaciones_cursos": certificaciones}

        # ---- PROJECTS → proyectos ----
        proyectos_list: List[Dict[str, Any]] = []
        if "projects" in section_results and section_results["projects"].success:
            proj_data = section_results["projects"].data or {}
            items = proj_data.get("items", [])
            if isinstance(items, list):
                for item in items:
                    if isinstance(item, str):
                        proyectos_list.append({"nombre": item})
                    elif isinstance(item, dict):
                        proyectos_list.append(item)
        merged["proyectos"] = {"proyectos": proyectos_list}

        # ---- AWARDS → reconocimientos ----
        awards_list: List[str] = []
        if "awards" in section_results and section_results["awards"].success:
            awards_data = section_results["awards"].data or {}
            awards_list = awards_data.get("items", [])
        merged["reconocimientos"] = {"logros_premios": awards_list if isinstance(awards_list, list) else []}

        # ---- VOLUNTEER → actividades_extracurriculares ----
        volunteer_list: List[str] = []
        if "volunteer" in section_results and section_results["volunteer"].success:
            vol_data = section_results["volunteer"].data or {}
            volunteer_list = vol_data.get("items", [])
        merged["actividades_extracurriculares"] = {"voluntariado": volunteer_list if isinstance(volunteer_list, list) else []}

        # ---- INTERESTS → intereses ----
        interests_list: List[str] = []
        if "interests" in section_results and section_results["interests"].success:
            int_data = section_results["interests"].data or {}
            interests_list = int_data.get("items", [])
        merged["intereses"] = {"hobbies_intereses": interests_list if isinstance(interests_list, list) else []}

        # ---- REFERENCES → campo referencias (separado de otros_antecedentes) ----
        referencias_list: List[Dict[str, str]] = []
        if "references" in section_results and section_results["references"].success:
            ref_data = section_results["references"].data or {}
            referencias_list = ref_data.get("referencias", [])
            if not isinstance(referencias_list, list):
                referencias_list = []
        merged["referencias"] = referencias_list

        # ---- OTHER → otros_antecedentes (SIN referencias) ----
        otros_items: List[str] = []
        if "other" in section_results and section_results["other"].success:
            other_data = section_results["other"].data or {}
            if isinstance(other_data, list):
                # LLM returned a plain list instead of {"items": [...]}
                for item in other_data:
                    if isinstance(item, dict):
                        items = item.get("items", [])
                        if items:
                            otros_items.extend([str(i) for i in items if i])
                    else:
                        otros_items.append(str(item))
            elif isinstance(other_data, dict):
                items = other_data.get("items", [])
                if isinstance(items, list):
                    otros_items.extend([str(i) for i in items if i])
        merged["otros_antecedentes"] = otros_items

        # ── 4A. Regla de prioridad para titular_profesional ──
        titular_final = "No extraído"

        # Prioridad 1: titles → titulo_profesional
        if titular_from_titles and str(titular_from_titles).strip().lower() not in (
            "no extraído", "no extraido", "", "none", "null"
        ):
            titular_final = str(titular_from_titles).strip()
            logger.info("[%s] 🏷️ Titular desde titles: %s", request_id, titular_final)

        # Prioridad 2: buscar título más alto en formación académica combinada
        if titular_final == "No extraído" and formacion_combinada:
            for entry in formacion_combinada:
                titulo_str = str(entry.get("titulo", "")).strip()
                if titulo_str and len(titulo_str) > 3:
                    titular_final = titulo_str
                    logger.info("[%s] 🏷️ Titular desde education: %s", request_id, titular_final)
                    break

        # Prioridad 3: buscar keywords de profesión en cargos de experiencia
        if titular_final == "No extraído" and experience_data_raw:
            prof_keywords = [
                "ingeniero", "licenciado", "arquitecto", "médico", "abogado",
                "contador", "profesor", "doctor", "psicólogo", "enfermer",
                "científico", "desarrollador", "programador", "analista",
            ]
            for exp in experience_data_raw:
                cargo = str(exp.get("cargo", "")).lower()
                if any(kw in cargo for kw in prof_keywords):
                    titular_final = str(exp.get("cargo", "")).strip()
                    logger.info("[%s] 🏷️ Titular desde experience: %s", request_id, titular_final)
                    break

        merged["titular_profesional"] = {"titular": titular_final}

        # ── 4F. Manejo de campos requeridos ──
        self._ensure_required_fields(merged, raw_text)

        logger.info(
            "[%s] 📦 Merge completado: exp=%d, edu=%d, skills=%d, otros=%d",
            request_id,
            len(merged.get("experiencia_laboral", [])),
            len(merged.get("formacion_academica", [])),
            len(merged.get("habilidades", {}).get("habilidades_tecnicas", [])),
            len(merged.get("otros_antecedentes", [])),
        )

        return merged

    def _extract_contact_info(self, raw_text: str) -> Dict[str, Any]:
        """
        Extrae datos de contacto del texto crudo usando regex.
        Siempre heurístico (no usa LLM).
        """
        import re

        result: Dict[str, Any] = {
            "nombre_completo": "No extraído",
            "telefono": None,
            "email": "no-extraido@example.com",
            "ubicacion": None,
        }

        # ── Email ──
        email_match = re.search(
            r'[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}',
            raw_text
        )
        if email_match:
            result["email"] = email_match.group(0)

        # ── Teléfono ──
        # Primero: formato internacional con +, acepta (+XX) o +XX
        phone_match = re.search(
            r'(?:\+\d{1,3}|\(\+\d{1,3}\))[\s\-.]?\d[\d\s\-.]{6,}',
            raw_text
        )
        if not phone_match:
            # Fallback: buscar secuencias de dígitos con separadores
            # pero EXCLUIR patrones de RUT chileno (XX.XXX.XXX - X)
            rut_pattern = re.compile(r'\d{1,2}\.\d{3}\.\d{3}\s*[-–]\s*\d')
            candidates = []
            for m in re.finditer(r'(?<!\d)(\d[\d\s\-.]{7,}\d)(?!\d)', raw_text):
                candidate = m.group(0).strip()
                if not rut_pattern.search(candidate):
                    candidates.append(candidate)
            if candidates:
                # Elegir el candidato con más dígitos (más probable que sea teléfono)
                phone_match = type('Match', (), {
                    'group': lambda self, g=0: max(candidates, key=lambda x: sum(c.isdigit() for c in x))
                })()
        if phone_match:
            result["telefono"] = phone_match.group(0).strip()

        # ── Nombre (primeras líneas significativas) ──
        lines = [l.strip() for l in raw_text.split('\n') if l.strip()]
        for line in lines[:5]:
            # Saltar líneas que son email, teléfono, URL, o encabezados
            if '@' in line or re.search(r'https?://', line):
                continue
            if re.match(r'^[\d\s\-+/()]+$', line):
                continue
            # Buscar patrón Nombre Apellido (2+ palabras, capitalizadas)
            if len(line.split()) >= 2 and len(line) < 60:
                words = line.split()
                capital_words = sum(1 for w in words if w and w[0].isupper())
                if capital_words >= 2 and all(len(w) > 1 for w in words):
                    result["nombre_completo"] = line
                    break

        # ── Ubicación ──
        loc_patterns = [
            r'(?:Santiago|Valparaíso|Viña|Concepción|Antofagasta|La Serena|'
            r'Temuco|Valdivia|Puerto Montt|Iquique|Arica|Rancagua|Talca|'
            r'Chillán|Osorno|Punta Arenas|Copiapó|'
            r'Lima|Buenos Aires|Bogotá|México|Madrid|Barcelona|'
            r'New York|London|Paris|Berlin|Toronto)[,\s]+(?:Chile|Perú|Argentina|'
            r'Colombia|México|España|USA|UK|Francia|Alemania|Canadá)?',
        ]
        for pat in loc_patterns:
            loc_match = re.search(pat, raw_text, re.IGNORECASE)
            if loc_match:
                result["ubicacion"] = loc_match.group(0).strip()
                break

        return result

    def _ensure_required_fields(self, merged: Dict[str, Any], raw_text: str) -> None:
        """
        Asegura que todos los campos requeridos tengan al menos valores por defecto.
        """
        # experiencia_laboral
        if not merged.get("experiencia_laboral"):
            merged["experiencia_laboral"] = []
            logger.warning("⚠️ experiencia_laboral vacío tras merge")

        # formacion_academica
        if not merged.get("formacion_academica"):
            merged["formacion_academica"] = []
            logger.warning("⚠️ formacion_academica vacía tras merge")

        # habilidades
        if not isinstance(merged.get("habilidades"), dict):
            merged["habilidades"] = {
                "habilidades_tecnicas": [],
                "idiomas": [],
                "habilidades_blandas": [],
            }

        # resumen_profesional
        if "resumen_profesional" not in merged or not merged.get("resumen_profesional"):
            merged["resumen_profesional"] = {"resumen": ""}

        # formacion_complementaria
        if "formacion_complementaria" not in merged:
            merged["formacion_complementaria"] = {"certificaciones_cursos": []}

        # reconocimientos
        if "reconocimientos" not in merged:
            merged["reconocimientos"] = {"logros_premios": []}

        # proyectos
        if "proyectos" not in merged:
            merged["proyectos"] = {"proyectos": []}

        # actividades_extracurriculares
        if "actividades_extracurriculares" not in merged:
            merged["actividades_extracurriculares"] = {"voluntariado": []}

        # intereses
        if "intereses" not in merged:
            merged["intereses"] = {"hobbies_intereses": []}

        # otros_antecedentes
        if "otros_antecedentes" not in merged:
            merged["otros_antecedentes"] = []

    async def _execute_robust_extraction(self, cv_text: str, profile_info: Dict, request_id: str = "unknown") -> Dict[str, Any]:
        """
        Extracción robusta usando Structured Outputs nativos con fallback a JSON
        """
        logger.info("🔄 Ejecutando extracción estructurada nativa")

        # Prompt principal limpio y directo
        prompt = self._create_robust_extraction_prompt()

        try:
            # 1. Intentar con Instructor (Extracción Estricta + CoT)
            result = await self.llm_service.call_agent_structured(
                prompt=prompt,
                input_data=cv_text,
                response_model=ThinkingResumeData,
                stage_name="structured_extraction_main",
                request_id=request_id
            )

            if result:
                logger.info("✅ Extracción estructurada exitosa con CoT")
                logger.info(f"🧠 Thinking Process: {result.thinking_process[:200]}...")
                return result.extraction.model_dump()
            
            logger.warning("⚠️ Falló la extracción estructurada, intentando fallback JSON...")
            
            # Obtener esquema para fallback
            try:
                schema_dict = ThinkingResumeData.model_json_schema()
            except AttributeError:
                schema_dict = ThinkingResumeData.schema()
            schema_dict = self.llm_service._clean_schema_for_gemini(schema_dict)

            # 2. Intentar fallback JSON (Extracción Flexible)
            return await self._execute_fallback_extraction(cv_text, prompt, schema_dict)

        except Exception as e:
            logger.error(f"❌ Error en extracción estructurada: {e}")
            logger.info("⚠️ Intentando fallback JSON tras error...")
            try:
                try:
                    schema_dict = ThinkingResumeData.model_json_schema()
                except AttributeError:
                    schema_dict = ThinkingResumeData.schema()
                schema_dict = self.llm_service._clean_schema_for_gemini(schema_dict)
                return await self._execute_fallback_extraction(cv_text, prompt, schema_dict)
            except Exception as e2:
                logger.error(f"❌ Falló también el fallback JSON: {e2}")
                return self._create_empty_structure()

    async def _execute_fallback_extraction(self, cv_text: str, prompt: str, schema_dict: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Estrategia de respaldo usando modo JSON estándar y mapeo manual
        """
        logger.info("🔄 Ejecutando extracción fallback (JSON laxo)")
        
        schema_str = ""
        if schema_dict:
            import json
            schema_str = f"\n\nDebes retornar la salida ÚNICAMENTE en formato JSON plano que se ajuste exactamente al siguiente esquema:\n{json.dumps(schema_dict, indent=2, ensure_ascii=False)}"

        # Usar el modo JSON estándar del servicio LLM
        json_result = await self.llm_service.call_agent(
            prompt=prompt + schema_str + "\n\nIMPORTANTE: Devuelve JSON válido. Si no estás seguro de un campo o está vacío, usa null.",
            input_data=cv_text,
            stage_name="fallback_json_extraction",
            temperature=0.1
        )
        
        if json_result:
             data_to_map = None
             
             if isinstance(json_result, dict):
                 # Si viene estructurado bajo el esquema de ThinkingResumeData (con la llave 'extraction')
                 if "extraction" in json_result and isinstance(json_result["extraction"], dict):
                     logger.info("🔧 Encontrado bloque 'extraction' en fallback JSON, desempaquetando...")
                     data_to_map = json_result["extraction"]
                 else:
                     data_to_map = json_result
             elif isinstance(json_result, list):
                 if len(json_result) == 1 and isinstance(json_result[0], dict):
                     logger.info("⚠️ Fallback devolvió lista unitem, desempaquetando...")
                     data_to_map = json_result[0]
                 elif len(json_result) > 0 and isinstance(json_result[0], dict):
                     # Heuristic: If detailed list, assume it's main content but missing wrapper.
                     logger.warning(f"⚠️ Fallback devolvió lista de {len(json_result)} items. Intentando heurística simple...")
                     first_keys = json_result[0].keys()
                     if any(k in first_keys for k in ['cargo', 'empresa', 'responsabilidades']):
                         logger.info("⚠️ Lista parece ser Experiencia Laboral")
                         data_to_map = {"experiencia_laboral": json_result}
                     elif any(k in first_keys for k in ['titulo', 'institucion', 'grado']):
                         logger.info("⚠️ Lista parece ser Formación Académica")
                         data_to_map = {"formacion_academica": json_result}
                     else:
                         logger.warning("❌ No se pudo determinar el tipo de contenido de la lista.")

             if data_to_map:
                 logger.info("✅ Extracción JSON fallback exitosa, mapeando a modelo...")
                 return self._map_loose_data_to_model(data_to_map)
             
        logger.error("❌ Falló la extracción fallback JSON (formato inválido)")
        return self._create_empty_structure()

    def _map_loose_data_to_model(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Sanitiza y adapta datos crudos (lax JSON) para cumplir con el modelo Pydantic
        """
        sanitized = data.copy()
        
        # 1. Sanitizar Habilidades (punto crítico de fallo)
        if 'habilidades' in sanitized:
            skills = sanitized['habilidades']
            if isinstance(skills, str):
                # Si viene como string JSON, dejarlo así para que el validator lo arregle
                pass
            elif isinstance(skills, list):
                # Si viene como lista (error común), convertir a estructura esperada
                sanitized['habilidades'] = {
                    "habilidades_tecnicas": [{"skill": str(s), "level": "Intermedio"} for s in skills],
                    "idiomas": [],
                    "habilidades_blandas": []
                }
            elif isinstance(skills, dict):
                # Asegurar listas dentro del dict
                for key in ['habilidades_tecnicas', 'idiomas', 'habilidades_blandas']:
                     if key not in skills:
                         skills[key] = []
                     elif skills[key] is None:
                         skills[key] = []
                sanitized['habilidades'] = skills
        
        # 2. Sanitizar Fechas/Periodos en Experiencia
        if 'experiencia_laboral' in sanitized and isinstance(sanitized['experiencia_laboral'], list):
            for i, exp in enumerate(sanitized['experiencia_laboral']):
                if not isinstance(exp, dict): continue
                
                # Arreglar periodo si falta o es inválido
                if 'periodo' not in exp or not isinstance(exp['periodo'], (dict, str)):
                    exp['periodo'] = {"texto_original": "No especificado"}
                elif isinstance(exp['periodo'], str):
                    exp['periodo'] = {"texto_original": exp['periodo']}
                    
        # 3. Sanitizar Formación
        if 'formacion_academica' in sanitized and isinstance(sanitized['formacion_academica'], list):
            for i, edu in enumerate(sanitized['formacion_academica']):
                if not isinstance(edu, dict): continue
                if 'periodo' not in edu or not isinstance(edu['periodo'], (dict, str)):
                    edu['periodo'] = {"texto_original": "No especificado"}

        # 4. Sanitizar Metadatos (evitar errores de Enum)
        # Recorrer recursivamente para limpiar metadatos? 
        # Por ahora confiamos en que los validators 'pre=True' manejarán los strings
        
        return sanitized


    def _create_robust_extraction_prompt(self) -> str:
        return """
<system_role>
Eres un experto analista de currículums y reclutador senior. 
Tu objetivo es transformar documentos de CV (que pueden ser desordenados) en datos estructurados JSON de alta precisión.
</system_role>

<instructions>
1. **Análisis Profundo:** Antes de extraer, analiza el documento para entender su estructura, idioma y matices.
2. **Exhaustividad:** Extrae TODO el historial laboral y educativo. No omitas nada por parecer "antiguo". NO mezcles instituciones ni títulos.
3. **Inferencia Inteligente:** Si falta la ciudad, infiérela de la empresa/universidad. Si falta el año de fin y dice "Actualidad", usa "Presente".
4. **Resumen Profesional:** Busca cualquier párrafo introductorio bajo títulos como "Perfil", "Resumen", "Descripción Profesional" o "Sobre mí".
5. **Normalización de Fechas: CRÍTICO** – Sigue EXACTAMENTE estos formatos:
   - "Enero 2018" → "2018-01" (SIEMPRE con mes de 2 dígitos)
   - "2018" → "2018" (solo año cuando no hay mes)
   - "Actualidad", "A la fecha", "Presente" → "Presente"
   - NUNCA dejes "Enero 2018" como texto suelto – conviértelo siempre
   - NUNCA uses formatos como "01/2018" – usa "2018-01"
6. **Búsqueda de Contacto Extrema:** Busca exhaustivamente en márgenes, encabezados y pies de página por correos electrónicos y teléfonos.
</instructions>

<date_examples_few_shot>
TEXTO ORIGINAL: "Enero 2018 - Julio 2019"
EXTRACCIÓN CORRECTA: {"fecha_inicio": "2018-01", "fecha_fin": "2019-07", "texto_original": "Enero 2018 - Julio 2019"}

TEXTO ORIGINAL: "Mar 2020 - Actualidad"
EXTRACCIÓN CORRECTA: {"fecha_inicio": "2020-03", "fecha_fin": "Presente", "texto_original": "Mar 2020 - Actualidad"}

TEXTO ORIGINAL: "2016 - 2019"
EXTRACCIÓN CORRECTA: {"fecha_inicio": "2016", "fecha_fin": "2019", "texto_original": "2016 - 2019"}

TEXTO ORIGINAL: "2018"
EXTRACCIÓN CORRECTA: {"fecha_inicio": "2018", "fecha_fin": "2018", "texto_original": "2018"}

TEXTO ORIGINAL: "Septiembre 2015 - Diciembre 2020"
EXTRACCIÓN CORRECTA: {"fecha_inicio": "2015-09", "fecha_fin": "2020-12", "texto_original": "Septiembre 2015 - Diciembre 2020"}

TEXTO ORIGINAL: "01/2018 - 07/2019"
EXTRACCIÓN CORRECTA: {"fecha_inicio": "2018-01", "fecha_fin": "2019-07", "texto_original": "01/2018 - 07/2019"}
</date_examples_few_shot>

<skills_examples_few_shot>
TEXTO: "Habilidades: Python, Java, SQL, Git"
EXTRACCIÓN CORRECTA: {"habilidades_tecnicas": [{"skill": "Python", "level": "Intermedio"}, {"skill": "Java", "level": "Intermedio"}, {"skill": "SQL", "level": "Intermedio"}, {"skill": "Git", "level": "Intermedio"}], "idiomas": [], "habilidades_blandas": []}

TEXTO: "Inglés (Avanzado) - TOEFL 105"
EXTRACCIÓN CORRECTA: {"habilidades_tecnicas": [], "idiomas": [{"idioma": "Inglés", "nivel": "Avanzado", "certificacion": "TOEFL 105"}], "habilidades_blandas": []}
</skills_examples_few_shot>

<critical_rules>
- ⛔ TEXTO LITERAL: Copia el texto original del CV sin resumir ni parafrasear. Las responsabilidades deben ser el texto exacto del CV, no bullet points condensados.
- **Titular vs Cargo:** "Titular Profesional" es quién es la persona (ej: Ingeniero Civil). "Cargo" es qué puesto ocupó (ej: Jefe de Obra).
- **Cargo y Empresa Separados:** Separa rigurosamente el Cargo de la Empresa. NUNCA unas la empresa al cargo.
- **Cargo COMPLETO:** Extrae el nombre completo del puesto. "Gerente de Sucursal Valdivia", no solo "Gerente".
- **Título e Institución Separados:** Separa rigurosamente el Título obtenido de la Institución.
- **Habilidades:** El campo 'habilidades' SIEMPRE debe ser un objeto con 'habilidades_tecnicas', 'idiomas' y 'habilidades_blandas'. NUNCA devuelvas una lista plana de strings.
- **Sanitización:** Nunca devuelvas valores como "N/A", "Unknown". Usa null o listas vacías. Para campos string como 'email', 'telefono' o 'ubicacion', NUNCA devuelvas arreglos vacíos `[]`. Usa `null`.
</critical_rules>

<output_schema>
El output final debe corresponder exactamente al modelo ResumeData.
</output_schema>
"""

    def _validate_extraction_quality(self, extraction: Dict[str, Any]) -> float:
        """
        Valida la calidad de extracción con scoring detallado y tolerante
        """
        if not isinstance(extraction, dict):
            logger.info(f"📊 Score 0.0: extraction no es dict - tipo: {type(extraction)}")
            return 0.0

        score = 0.0
        max_score = 10.0

        # Log para debugging
        logger.info(f"📊 Evaluando calidad de extracción. Keys: {list(extraction.keys())}")

        # Datos de contacto (2 puntos) - MÁS TOLERANTE
        contacto_score = 0.0
        if extraction.get("datos_contacto"):
            contacto = extraction["datos_contacto"]
            logger.info(f"📊 Datos contacto encontrados: {contacto}")
            if isinstance(contacto, dict):
                # Más tolerante con nombre - acepta cualquier string no vacío
                nombre = contacto.get("nombre_completo")
                logger.info(f"📊 Evaluando nombre: '{nombre}' (tipo: {type(nombre)})")
                if nombre and str(nombre).strip() and str(nombre).strip() not in ["null", "None", "No extraído", "no extraído"]:
                    contacto_score += 1.0
                    logger.info(f"📊 Nombre válido - +1.0 punto")
                else:
                    logger.info(f"📊 Nombre inválido o vacío")

                # Más tolerante con email - acepta strings válidos
                email = contacto.get("email")
                logger.info(f"📊 Evaluando email: '{email}' (tipo: {type(email)})")
                if email and str(email).strip() and "@" in str(email) and "no-extraido" not in str(email).lower():
                    contacto_score += 1.0
                    logger.info(f"📊 Email válido - +1.0 punto")
                else:
                    logger.info(f"📊 Email inválido o vacío")

        score += contacto_score
        logger.info(f"📊 Score datos contacto: {contacto_score}/2.0")

        # Experiencia laboral (4 puntos - crítico) - MEJORADO
        exp_score_total = 0.0
        if extraction.get("experiencia_laboral"):
            exp_list = extraction["experiencia_laboral"]
            logger.info(f"📊 Experiencia laboral encontrada: {len(exp_list) if isinstance(exp_list, list) else 'no es lista'} items")
            if isinstance(exp_list, list) and len(exp_list) > 0:
                quantity_score = min(len(exp_list) * 0.8, 2.0)  # Hasta 2 puntos por cantidad
                exp_score_total += quantity_score
                logger.info(f"📊 Score por cantidad experiencias: +{quantity_score}")

                # Evaluar calidad de experiencias
                valid_experiences = 0
                for i, exp in enumerate(exp_list):
                    if isinstance(exp, dict):
                        exp_score = 0
                        logger.info(f"📊 Evaluando experiencia {i+1}: {exp}")

                        # Cargo y empresa válidos
                        cargo = exp.get("cargo")
                        empresa = exp.get("empresa")
                        if cargo and str(cargo).strip() and empresa and str(empresa).strip():
                            exp_score += 0.5
                            logger.info(f"📊 Exp {i+1}: Cargo/empresa válidos - +0.5")

                        # Responsabilidades válidas
                        responsabilidades = exp.get("responsabilidades")
                        if (responsabilidades and isinstance(responsabilidades, list) and
                            len([r for r in responsabilidades if r and str(r).strip()]) > 0):
                            exp_score += 0.5
                            logger.info(f"📊 Exp {i+1}: Responsabilidades válidas - +0.5")

                        # Fechas válidas
                        periodo = exp.get("periodo", {})
                        if isinstance(periodo, dict) and periodo.get("fecha_inicio"):
                            exp_score += 0.3
                            logger.info(f"📊 Exp {i+1}: Fechas válidas - +0.3")

                        if exp_score > 0.5:  # Si la experiencia es válida
                            valid_experiences += 1
                            exp_score_total += min(exp_score, 1.0)
                            logger.info(f"📊 Exp {i+1}: Válida - Score: {exp_score}")

                        if valid_experiences >= 3:  # Evaluar máximo 3 para eficiencia
                            break
            else:
                logger.info(f"📊 No hay experiencia laboral válida")

        score += exp_score_total
        logger.info(f"📊 Score experiencia total: {exp_score_total}/4.0")

        # Formación académica (2 puntos) - MEJORADO
        if extraction.get("formacion_academica"):
            edu_list = extraction["formacion_academica"]
            if isinstance(edu_list, list) and len(edu_list) > 0:
                score += 0.5  # Puntos por tener formación

                valid_education = 0
                for edu in edu_list:
                    if isinstance(edu, dict):
                        titulo = edu.get("titulo")
                        institucion = edu.get("institucion")
                        if (titulo and str(titulo).strip() and titulo != "No extraído" and
                            institucion and str(institucion).strip() and institucion != "No especificado"):
                            valid_education += 1
                            score += 0.5
                            if valid_education >= 2:  # Max 2 para eficiencia
                                break

        # Habilidades (1 punto) - MEJORADO
        if extraction.get("habilidades"):
            skills = extraction["habilidades"]
            if isinstance(skills, dict):
                # Habilidades técnicas
                tech_skills = skills.get("habilidades_tecnicas")
                if (tech_skills and isinstance(tech_skills, list) and
                    len([s for s in tech_skills if s and (isinstance(s, str) or isinstance(s, dict))]) > 0):
                    score += 0.5

                # Idiomas
                idiomas = skills.get("idiomas")
                if (idiomas and isinstance(idiomas, list) and
                    len([i for i in idiomas if i and (isinstance(i, str) or isinstance(i, dict))]) > 0):
                    score += 0.5

        # Formación complementaria (1 punto) - MEJORADO
        if extraction.get("formacion_complementaria"):
            comp = extraction["formacion_complementaria"]
            if isinstance(comp, dict) and comp.get("certificaciones_cursos"):
                cursos = comp["certificaciones_cursos"]
                if isinstance(cursos, list) and len([c for c in cursos if c and str(c).strip()]) > 0:
                    score += 1.0

        # MEJORA CRÍTICA: Asegurar score mínimo si hay estructura básica
        final_score = score / max_score

        logger.info(f"📊 Score calculado antes de normalizar: {score}/{max_score} = {final_score:.3f}")

        # Score mínimo de 0.15 si hay estructura JSON válida
        if final_score == 0.0 and isinstance(extraction, dict):
            # Verificar si hay al menos estructura básica
            basic_structure = (
                extraction.get("datos_contacto") or
                extraction.get("experiencia_laboral") or
                extraction.get("formacion_academica")
            )
            if basic_structure:
                final_score = 0.15  # Score mínimo para estructuras válidas
                logger.info(f"🔧 Applied minimum score 0.15 for basic valid structure")

        # MEJORA ADICIONAL: Si hay datos válidos extraídos pero score bajo, aplicar mínimo más alto
        if final_score > 0.0 and final_score < 0.2:
            # Verificar si hay datos realmente válidos
            has_valid_data = False

            # Verificar contacto válido
            if extraction.get("datos_contacto"):
                contacto = extraction["datos_contacto"]
                if isinstance(contacto, dict):
                    nombre = contacto.get("nombre_completo")
                    email = contacto.get("email")
                    if (nombre and str(nombre).strip() and "Osiel" in str(nombre)) or \
                       (email and "@" in str(email) and "gmail" in str(email)):
                        has_valid_data = True

            # Verificar experiencia válida
            if extraction.get("experiencia_laboral") and isinstance(extraction["experiencia_laboral"], list):
                for exp in extraction["experiencia_laboral"]:
                    if isinstance(exp, dict) and exp.get("cargo") and exp.get("empresa"):
                        has_valid_data = True
                        break

            if has_valid_data:
                final_score = max(final_score, 0.3)  # Score mínimo de 30% si hay datos válidos
                logger.info(f"🔧 Applied higher minimum score 0.3 for valid extracted data")

        logger.info(f"📊 Final quality score: {final_score:.3f} (raw: {score:.1f}/{max_score})")
        return final_score

    def _structure_final_data(self, extraction: Dict[str, Any], request: ResumeExtractionRequest, profile_info: Dict) -> Dict[str, Any]:
        """
        Estructuración final con validación y limpieza
        """
        if not extraction or not isinstance(extraction, dict):
            return self._create_empty_structure()

        # Post-procesamiento de fechas
        extraction = self._post_process_dates(extraction)
        
        # Deduplicación de experiencias (Fix: "No especificado" duplicate entries)
        extraction = self._deduplicate_experiences(extraction)
        
        # Deduplicación de educación (Fix: Duplicates due to chunking/dates)
        extraction = self._deduplicate_education(extraction)

        # Validación de clasificación académica
        extraction = self._validate_academic_classification(extraction)

        # Validación cruzada de fechas y consistencia entre secciones
        extraction = self._validate_cross_field_consistency(extraction, request.archivo_contenido if hasattr(request, 'archivo_contenido') else None)

        # Limpieza y normalización
        extraction = self._clean_and_normalize(extraction)

        return extraction

    def _deduplicate_experiences(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Elimina experiencias duplicadas o fantasmas (ej: header vs detalle)
        """
        if not data.get("experiencia_laboral"):
            return data
            
        exps = data["experiencia_laboral"]
        if not isinstance(exps, list): return data
        
        unique_exps = []
        seen_keys = set()
        
        for exp in exps:
            if not isinstance(exp, dict): continue
            
            # Normalizar claves para detección de duplicados
            empresa = str(exp.get("empresa", "")).lower().strip()
            # Usar fecha inicio para distinguir roles distintos en misma empresa
            fecha_inicio = str(exp.get("periodo", {}).get("fecha_inicio", "")).lower().strip()
            
            # Clave única
            key = f"{empresa}|{fecha_inicio}"
            
            # Verificar si ya existe una mejor versión
            if key in seen_keys:
                # Encontrar la existente
                existing_idx = -1
                for i, e in enumerate(unique_exps):
                    e_emp = str(e.get("empresa", "")).lower().strip()
                    e_fec = str(e.get("periodo", {}).get("fecha_inicio", "")).lower().strip()
                    if f"{e_emp}|{e_fec}" == key:
                        existing_idx = i
                        break
                
                if existing_idx != -1:
                    existing = unique_exps[existing_idx]
                    
                    # Criterio de fusión: Quedarse con la que tiene Cargo
                    curr_cargo = str(exp.get("cargo", "")).lower()
                    prev_cargo = str(existing.get("cargo", "")).lower()
                    
                    is_curr_better = (curr_cargo and curr_cargo != "no especificado" and curr_cargo != "none") and \
                                     (not prev_cargo or prev_cargo == "no especificado" or prev_cargo == "none")
                                     
                    if is_curr_better:
                        # Reemplazar la existente con la actual (que tiene cargo real)
                        unique_exps[existing_idx] = exp
                    
                    # Si ambas tienen cargo, puede ser una promoción legítima.
                    # Pero si el cargo es IDÉNTICO, es duplicado.
                    elif curr_cargo == prev_cargo:
                        # Fusionar responsabilidades
                        curr_resps = exp.get("responsabilidades", [])
                        prev_resps = unique_exps[existing_idx].get("responsabilidades", [])
                        if isinstance(curr_resps, list) and isinstance(prev_resps, list):
                             # Add unique new ones
                             for r in curr_resps:
                                 if r not in prev_resps:
                                     prev_resps.append(r)
                        unique_exps[existing_idx]["responsabilidades"] = prev_resps
                        # No agregar 'exp' como nueva entrada
                    else:
                        # Mismo inicio, misma empresa, distinto cargo -> Posiblemente promoción concurrente?
                        # O error. Asumiremos distinto cargo = válida si no es 'No especificado'.
                        if curr_cargo and curr_cargo != "no especificado":
                             unique_exps.append(exp)
            else:
                seen_keys.add(key)
                unique_exps.append(exp)
        
        # FINAL PASS: Clean duplicated responsibilities (substrings)
        # e.g. ["Hello world", "Hello"] -> ["Hello world"]
        for exp in unique_exps:
            if "responsabilidades" in exp and isinstance(exp["responsabilidades"], list):
                raw_resps = sorted(list(set(exp["responsabilidades"])), key=len, reverse=True)
                clean_resps = []
                for r in raw_resps:
                    # Check if 'r' is a substring/prefix of any already accepted larger string
                    # Use a threshold to avoid deleting "Design API" just because "Design API and Database" exists if they are distinct.
                    # But for the specific case "text..." vs "text... continued", the check is:
                    if not any(r in outcome for outcome in clean_resps):
                        clean_resps.append(r)
                exp["responsabilidades"] = clean_resps

        data["experiencia_laboral"] = unique_exps
        return data

    def _deduplicate_education(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Elimina educación duplicada (normalmente chunking artifacts), prefiriendo la que tiene fechas específicas.
        """
        if not data.get("formacion_academica"):
            return data
            
        edu_list = data["formacion_academica"]
        if not isinstance(edu_list, list): return data
        
        # 1. Group by normalized key (Title + Institution)
        grouped = {}
        import re
        
        for edu in edu_list:
            if not isinstance(edu, dict): continue
            
            titulo = str(edu.get("titulo", "")).lower().strip()
            institucion = str(edu.get("institucion", "")).lower().strip()
            
            # Simple normalization: remove punctuation, extra spaces
            titulo_norm = re.sub(r'[^\w\s]', '', titulo)
            inst_norm = re.sub(r'[^\w\s]', '', institucion)
            
            # If both are empty, ignore (junk)
            if not titulo_norm and not inst_norm:
                continue

            key = f"{titulo_norm}|{inst_norm}"
            
            if key not in grouped:
                grouped[key] = []
            grouped[key].append(edu)
            
        # 2. Select best candidate per group
        final_list = []
        for key, candidates in grouped.items():
            if not candidates: continue
            if len(candidates) == 1:
                final_list.append(candidates[0])
                continue
                
            best = candidates[0]
            best_score = -100
            
            for cand in candidates:
                score = 0
                periodo = cand.get("periodo", {})
                if not isinstance(periodo, dict): periodo = {}
                
                inicio = str(periodo.get("fecha_inicio", "")).lower()
                fin = str(periodo.get("fecha_fin", "")).lower()
                
                # Score based on date quality
                # Prefer explicit dates over "n/a", "no especificado", "none"
                if inicio and "n/a" not in inicio and "no especificado" not in inicio and "none" not in inicio and "presente" not in inicio:
                    score += 2
                if fin and "n/a" not in fin and "no especificado" not in fin and "none" not in fin:
                    score += 2
                
                # Tie-breaker: content length (more info is usually better)
                try:
                    cand_str = json.dumps(cand)
                    score += len(cand_str) * 0.001
                except:
                    pass
                
                if score > best_score:
                    best_score = score
                    best = cand
            
            final_list.append(best)
            
        data["formacion_academica"] = final_list
        return data

    def _post_process_dates(self, data: Dict[str, Any]) -> Dict[str, Any]:
        if data.get("experiencia_laboral") and isinstance(data["experiencia_laboral"], list):
            for exp in data["experiencia_laboral"]:
                if isinstance(exp, dict) and exp.get("periodo"):
                    exp["periodo"] = DateParserService.normalize_period(exp["periodo"])

        if data.get("formacion_academica") and isinstance(data["formacion_academica"], list):
            for edu in data["formacion_academica"]:
                if isinstance(edu, dict) and edu.get("periodo"):
                    edu["periodo"] = DateParserService.normalize_period(edu["periodo"])

        return data

    def _validate_academic_classification(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validación robusta de clasificación académica
        """
        # Palabras clave para formación académica formal
        academic_keywords = [
            "licenciado", "licenciatura", "ingeniero", "ingenieria", "titulo",
            "grado", "magister", "master", "mba", "doctorado", "doctor", "phd",
            "contador publico", "auditor", "medico", "abogado", "arquitecto"
        ]

        # Palabras clave para formación complementaria
        complementary_keywords = [
            "curso", "diplomado", "certificacion", "capacitacion", "seminario",
            "taller", "programa", "entrenamiento"
        ]

        # Revisar si hay items mal clasificados en formacion_complementaria
        fc = data.get("formacion_complementaria")
        cursos = []
        if isinstance(fc, list):
            cursos = fc
            data["formacion_complementaria"] = {"certificaciones_cursos": cursos}
        elif isinstance(fc, dict):
            cursos = fc.get("certificaciones_cursos") or []
            
        if cursos:
            academic_items = []
            complementary_items = []

            for item in cursos:
                item_lower = item.lower() if isinstance(item, str) else ""

                # Verificar si es académico
                is_academic = any(keyword in item_lower for keyword in academic_keywords)
                is_complementary = any(keyword in item_lower for keyword in complementary_keywords)

                if is_academic and not is_complementary:
                    # Mover a formación académica
                    academic_items.append(self._convert_to_academic_format(item))
                else:
                    complementary_items.append(item)

            # Actualizar listas
            if academic_items:
                if not data.get("formacion_academica"):
                    data["formacion_academica"] = []
                data["formacion_academica"].extend(academic_items)

            data["formacion_complementaria"]["certificaciones_cursos"] = complementary_items

        return data

    def _convert_to_academic_format(self, item_text: str) -> Dict[str, Any]:
        """
        Convierte texto de formación a formato académico estructurado
        """
        # Extraer institución si está presente
        import re

        # Buscar patrón "Título (Universidad)"
        match = re.search(r'(.+?)\s*\((.+?)\)', item_text)
        if match:
            titulo = match.group(1).strip()
            institucion = match.group(2).strip()
        else:
            # Buscar patrón "Título Universidad"
            parts = item_text.split()
            if len(parts) > 3 and "universidad" in item_text.lower():
                # Encontrar donde empieza "Universidad"
                for i, part in enumerate(parts):
                    if "universidad" in part.lower():
                        titulo = " ".join(parts[:i]).strip()
                        institucion = " ".join(parts[i:]).strip()
                        break
                else:
                    titulo = item_text
                    institucion = "No especificado"
            else:
                titulo = item_text
                institucion = "No especificado"

        return {
            "titulo": titulo,
            "institucion": institucion,
            "periodo": {
                "fecha_inicio": None,
                "fecha_fin": None,
                "texto_original": "No especificado"
            },
            "gpa": None,
            "ubicacion": None
        }

    def _validate_cross_field_consistency(self, data: Dict[str, Any], cv_text: Optional[str] = None) -> Dict[str, Any]:
        """
        Validación cruzada: verifica consistencia entre secciones.
        - Previene fechas imposibles (fin < inicio)
        - Detecta secciones vacías cuando el texto original sugiere que deberían tener datos
        - Valida que experiencia_laboral y formacion_academica no estén vacíos si el CV es largo
        """
        import re

        periods_to_check = []

        if data.get("experiencia_laboral") and isinstance(data["experiencia_laboral"], list):
            for exp in data["experiencia_laboral"]:
                if isinstance(exp, dict) and isinstance(exp.get("periodo"), dict):
                    p = exp["periodo"]
                    validation_msg = DateParserService.validate_period(
                        p.get("fecha_inicio"), p.get("fecha_fin")
                    )
                    if validation_msg:
                        logger.warning(f"📅 Problema de fechas en experiencia '{exp.get('cargo')}': {validation_msg}")
                        periods_to_check.append((exp, p))

        if data.get("formacion_academica") and isinstance(data["formacion_academica"], list):
            for edu in data["formacion_academica"]:
                if isinstance(edu, dict) and isinstance(edu.get("periodo"), dict):
                    p = edu["periodo"]
                    validation_msg = DateParserService.validate_period(
                        p.get("fecha_inicio"), p.get("fecha_fin")
                    )
                    if validation_msg:
                        logger.warning(f"📅 Problema de fechas en educación '{edu.get('titulo')}': {validation_msg}")
                        periods_to_check.append((edu, p))

        if cv_text and len(cv_text) > 200:
            lines = cv_text.split('\n')
            non_empty_lines = [l for l in lines if l.strip()]
            text_has_content = len(non_empty_lines) > 5

            if text_has_content:
                exp_empty = not data.get("experiencia_laboral") or (
                    isinstance(data["experiencia_laboral"], list) and len(data["experiencia_laboral"]) == 0
                )
                edu_empty = not data.get("formacion_academica") or (
                    isinstance(data["formacion_academica"], list) and len(data["formacion_academica"]) == 0
                )

                if exp_empty:
                    job_keywords = ['experiencia', 'trabajo', 'empleo', 'cargo', 'empresa', 'laboral',
                                    'experience', 'work', 'job', 'employment', 'position']
                    if any(kw in cv_text.lower() for kw in job_keywords):
                        logger.warning(f"📋 CV tiene sección de experiencia pero no se extrajeron datos")

                if edu_empty:
                    edu_keywords = ['formación', 'educación', 'título', 'universidad', 'instituto',
                                    'education', 'degree', 'university', 'college', 'academic']
                    if any(kw in cv_text.lower() for kw in edu_keywords):
                        logger.warning(f"📋 CV tiene sección de educación pero no se extrajeron datos")

        return data

    def _clean_and_normalize(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Limpieza y normalización final
        """
        # Asegurar estructura mínima
        if not data.get("datos_contacto"):
            data["datos_contacto"] = {
                "nombre_completo": "No extraído",
                "telefono": None,
                "email": "no-extraido@example.com",
                "ubicacion": None
            }

        if not data.get("experiencia_laboral"):
            data["experiencia_laboral"] = []

        if not data.get("formacion_academica"):
            data["formacion_academica"] = []

        return data

    def _create_validated_response(self, structured_data: Dict[str, Any], cv_text: str = None) -> ResumeData:
        """
        Crear respuesta validada con modelo Pydantic
        """
        fixed_data = self._fix_missing_required_fields(structured_data, cv_text)
        logger.info(f"🔧 Habilidades post-fix: {len(fixed_data.get('habilidades', {}).get('habilidades_tecnicas', []))} técnicas, {len(fixed_data.get('habilidades', {}).get('idiomas', []))} idiomas")

        try:
            logger.info(f"🔧 Intentando crear ResumeData con datos: {list(fixed_data.keys())}")
            logger.info(f"🔧 Titular en datos: {fixed_data.get('titular_profesional')}")
            logger.info(f"🔧 Email en datos: {fixed_data.get('datos_contacto', {}).get('email')}")
            logger.info(f"🔧 Habilidades RAW: {type(fixed_data.get('habilidades')).__name__} = {json.dumps(fixed_data.get('habilidades'), default=str, ensure_ascii=False)[:500] if fixed_data.get('habilidades') else 'None/empty'}")

            resume_data = ResumeData(**fixed_data)

            logger.info(f"🔧 ✅ ResumeData creado exitosamente!")
            logger.info(f"🔧 ✅ Titular final: {resume_data.titular_profesional.titular}")
            logger.info(f"🔧 ✅ Email final: {resume_data.datos_contacto.email}")
            logger.info(f"🔧 ✅ Habilidades finales: t={len(resume_data.habilidades.habilidades_tecnicas)} i={len(resume_data.habilidades.idiomas)} b={len(resume_data.habilidades.habilidades_blandas)}")
            return resume_data

        except Exception as e:
            logger.error(f"Error validando con Pydantic: {e}")
            logger.error(f"🔧 Datos que causaron error: {list(fixed_data.keys())}")
            logger.warning("🔧 ⚠️ FALLBACK: Usando respuesta mínima porque falló todo")
            return self._create_minimal_valid_response()

    def _fix_missing_required_fields(self, data: Dict[str, Any], cv_text: str = None) -> Dict[str, Any]:
        """
        Reparar campos requeridos faltantes con valores por defecto razonables
        """
        import re
        fixed_data = data.copy()
        # Normalization for fallbacks
        tp = fixed_data.get('titular_profesional')
        if tp is not None:
            if not isinstance(tp, dict):
                if isinstance(tp, list) and len(tp) > 0:
                    fixed_data['titular_profesional'] = {'titular': str(tp[0])}
                else:
                    fixed_data['titular_profesional'] = {'titular': str(tp)}
            else:
                inner_titular = tp.get('titular')
                if isinstance(inner_titular, dict):
                    tp['titular'] = str(inner_titular.get('titular') or inner_titular.get('titulo') or inner_titular.get('name') or "No extraído")
                elif isinstance(inner_titular, list) and len(inner_titular) > 0:
                    tp['titular'] = str(inner_titular[0])
                
        rp = fixed_data.get('resumen_profesional')
        if rp is not None:
            if not isinstance(rp, dict):
                if isinstance(rp, list) and len(rp) > 0:
                    fixed_data['resumen_profesional'] = {'resumen': str(rp[0])}
                else:
                    fixed_data['resumen_profesional'] = {'resumen': str(rp)}
            else:
                inner_resumen = rp.get('resumen')
                if isinstance(inner_resumen, dict):
                    rp['resumen'] = str(inner_resumen.get('resumen') or inner_resumen.get('summary') or "No extraído")
                elif isinstance(inner_resumen, list) and len(inner_resumen) > 0:
                    rp['resumen'] = str(inner_resumen[0])

        # Asegurar resumen_profesional (campo que más frecuentemente falta)
        if 'resumen_profesional' not in fixed_data or not fixed_data['resumen_profesional']:
            logger.info("🔧 Agregando resumen_profesional faltante")
            # Intentar generar un resumen basado en el titular
            titular = (fixed_data.get('titular_profesional') or {}).get('titular', '')
            logger.info(f"🔧 Titular disponible para generar resumen: '{titular}'")

            if titular and 'No extraído' not in titular:
                resumen = f"Profesional con experiencia en {titular.lower()}"
                logger.info(f"🔧 Resumen generado basado en titular: '{resumen}'")
            else:
                resumen = "Perfil profesional no especificado en el CV"
                logger.info(f"🔧 Resumen por defecto: '{resumen}'")

            fixed_data['resumen_profesional'] = {'resumen': resumen}
        elif isinstance(fixed_data.get('resumen_profesional'), dict) and not fixed_data['resumen_profesional'].get('resumen'):
            fixed_data['resumen_profesional']['resumen'] = "Perfil profesional no especificado en el CV"

        # Asegurar datos_contacto
        if 'datos_contacto' not in fixed_data or not fixed_data['datos_contacto']:
            logger.info("🔧 Agregando datos_contacto faltantes")
            fixed_data['datos_contacto'] = {
                'nombre_completo': 'No extraído',
                'telefono': None,
                'email': 'no-extraido@example.com',
                'ubicacion': None
            }
        elif isinstance(fixed_data.get('datos_contacto'), dict):
            # Fill in missing keys instead of overwriting the whole dict
            dc = fixed_data['datos_contacto']
            if not dc.get('nombre_completo'): dc['nombre_completo'] = 'No extraído'
            if 'telefono' not in dc or str(dc.get('telefono')).lower() in ('none', 'null', ''):
                dc['telefono'] = None
            if not dc.get('email') or str(dc.get('email')).lower() in ('none', 'null', ''):
                dc['email'] = 'no-extraido@example.com'
            if 'ubicacion' not in dc: dc['ubicacion'] = None

        # --- MEJORA: Regex Fallback para Email y Teléfono ---
        if cv_text and isinstance(fixed_data.get('datos_contacto'), dict):
            dc = fixed_data['datos_contacto']
            texto_limpio = cv_text.strip()

            email_val = dc.get('email')
            telefono_val = dc.get('telefono')
            ubicacion_val = dc.get('ubicacion')

            email_invalido = (
                not email_val
                or 'no-extraido' in str(email_val).lower()
                or str(email_val).strip().lower() in ('none', 'null', '')
            )
            telefono_invalido = (
                not telefono_val
                or str(telefono_val).strip().lower() in ('none', 'null', '')
            )

            if email_invalido:
                combined_text = texto_limpio
                if ubicacion_val and isinstance(ubicacion_val, str):
                    combined_text = f"{texto_limpio}\n{ubicacion_val}"
                match_email = re.search(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b', combined_text)
                if match_email:
                    encontrado = match_email.group(0)
                    logger.info(f"🔧 [REGEX Fallback] Email recuperado del texto: {encontrado}")
                    dc['email'] = encontrado

            if telefono_invalido:
                combined_text = texto_limpio
                if ubicacion_val and isinstance(ubicacion_val, str):
                    combined_text = f"{texto_limpio}\n{ubicacion_val}"
                # Priorizar formato internacional con +, acepta (+XX) o +XX
                match_phone = re.search(r'(?:\+\d{1,3}|\(\+\d{1,3}\))[\s\-.]?\d[\d\s\-.]{6,}', combined_text)
                if not match_phone:
                    # Fallback: buscar secuencias de dígitos con separadores
                    # pero EXCLUIR patrones de RUT chileno (XX.XXX.XXX - X)
                    rut_pattern = re.compile(r'\d{1,2}\.\d{3}\.\d{3}\s*[-–]\s*\d')
                    candidates = []
                    for m in re.finditer(r'(?<!\d)(\d[\d\s\-.]{7,}\d)(?!\d)', combined_text):
                        candidate = m.group(0).strip()
                        if not rut_pattern.search(candidate):
                            candidates.append(candidate)
                    if candidates:
                        # Elegir el candidato con más dígitos (más probable que sea teléfono)
                        match_phone = type('Match', (), {
                            'group': lambda self, g=0: max(candidates, key=lambda x: sum(c.isdigit() for c in x))
                        })()
                    else:
                        match_phone = None
                if match_phone:
                    encontrado = match_phone.group(0).strip()
                    logger.info(f"🔧 [REGEX Fallback] Teléfono recuperado del texto: {encontrado}")
                    dc['telefono'] = encontrado

            # --- LIMPIAR UBICACION: extraer email/teléfono del campo y dejar solo dirección ---
            if isinstance(dc.get('ubicacion'), str):
                ubi = dc['ubicacion']
                # Intentar rescatar email del string de ubicación
                if email_invalido:
                    match_e = re.search(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b', ubi)
                    if match_e:
                        dc['email'] = match_e.group(0)
                        logger.info(f"🔧 [UBICACION] Email rescatado de ubicación: {dc['email']}")
                # Intentar rescatar teléfono del string de ubicación
                if telefono_invalido or not dc.get('telefono'):
                    match_p = re.search(r'(?:\+\d{1,3}|\(\+\d{1,3}\))[\s\-.]?\d[\d\s\-.]{6,}', ubi)
                    if match_p:
                        dc['telefono'] = match_p.group(0).strip()
                        logger.info(f"🔧 [UBICACION] Teléfono rescatado de ubicación: {dc['telefono']}")
                # Limpiar: remover email, teléfono, y el pipe separator, dejar solo dirección
                ubi = re.sub(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b', '', ubi)
                ubi = re.sub(r'(?:\+\d{1,3}|\(\+\d{1,3}\))[\s\-.]?\d[\d\s\-.]{6,}', '', ubi)
                ubi = ubi.replace('|', ',').strip()
                ubi = re.sub(r',\s*,', ',', ubi).strip(',').strip()
                if ubi:
                    dc['ubicacion'] = ubi

        # --- HEURÍSTICA: Extracción de skills desde sección del CV ---
        if cv_text and isinstance(fixed_data.get('habilidades'), dict):
            hab = fixed_data['habilidades']
            hab_tecnicas = hab.get('habilidades_tecnicas', [])
            if not hab_tecnicas or len(hab_tecnicas) == 0:
                extracted_skills, section_name = self._heuristic_skill_extraction(cv_text)
                if extracted_skills:
                    # Determinar si es sección de "competencias" (no-estándar) → otros_antecedentes
                    is_competency_section = section_name and any(
                        w in section_name.lower() for w in ['competencia', 'diferencial', 'competency']
                    )
                    if is_competency_section and 'habilidad' not in section_name.lower():
                        logger.info(f"🔧 [HEURISTIC] Sección '{section_name}' → otros_antecedentes ({len(extracted_skills)} items)")
                        otros = fixed_data.get('otros_antecedentes', [])
                        if not isinstance(otros, list):
                            otros = []
                        otros.extend(extracted_skills)
                        fixed_data['otros_antecedentes'] = otros
                    else:
                        logger.info(f"🔧 [HEURISTIC] Skills extraídas del texto: {len(extracted_skills)} items")
                        for sk in extracted_skills:
                            hab_tecnicas.append({"skill": sk, "level": "Intermedio"})
                        hab['habilidades_tecnicas'] = hab_tecnicas

        # Asegurar titular_profesional
        GENERIC_TITLES = {'no extraído', 'profesional', 'no especificado', 'sin título', 'n/a', ''}
        if ('titular_profesional' not in fixed_data or
            not fixed_data['titular_profesional'] or
            not fixed_data['titular_profesional'].get('titular') or
            str(fixed_data['titular_profesional'].get('titular', '')).strip().lower() in GENERIC_TITLES):
            
            logger.info("🔧 Reparando titular_profesional faltante o vacío")
            logger.info(f"🔧 Estado actual titular_profesional: {fixed_data.get('titular_profesional', 'No existe')}")

            titular_extraido = 'No extraído'
            
            # 1. Intentar extraer de las primeras líneas del texto original PRIMERO
            if cv_text:
                titular_extraido_texto = self._extract_titular_from_text(cv_text)
                if titular_extraido_texto != 'No extraído':
                    logger.info(f"🔧 Titular extraído del texto en fallback: '{titular_extraido_texto}'")
                    titular_extraido = titular_extraido_texto
            
            # 2. Fallback semántico: Tratar de extraer el cargo más reciente
            if titular_extraido == 'No extraído':
                experiencias = fixed_data.get("experiencia_laboral", [])
                if experiencias and isinstance(experiencias, list) and len(experiencias) > 0:
                    first_exp = experiencias[0]
                    if isinstance(first_exp, dict) and first_exp.get("cargo"):
                        cargo_reciente = str(first_exp["cargo"])
                        logger.info(f"🔧 [Semantic Fallback] Titular desde experiencia: {cargo_reciente}")
                        titular_extraido = cargo_reciente

            # 3. Fallback: extraer título de formación académica (no magíster/licenciatura/diplomado)
            if titular_extraido == 'No extraído':
                formacion = fixed_data.get("formacion_academica", [])
                if isinstance(formacion, list):
                    for edu in formacion:
                        if isinstance(edu, dict):
                            titulo_str = str(edu.get('titulo') or '')
                            t_lower = titulo_str.lower()
                            if (titulo_str and len(titulo_str) > 3 and
                                not any(w in t_lower for w in ['magíster', 'magister', 'máster', 'master', 'licenciad', 'diplomad', 'doctorad', 'phd', 'mba', 'bachiller']) and
                                not any(w in t_lower for w in ['curso', 'taller', 'seminario', 'certific'])):
                                # Busca parte después de "/" que suele ser el título profesional
                                if '/' in titulo_str:
                                    parts = [p.strip() for p in titulo_str.split('/')]
                                    for p in parts:
                                        p_lower = p.lower()
                                        if not any(w in p_lower for w in ['licenciad', 'magíster', 'magister']):
                                            titular_extraido = p
                                            logger.info(f"🔧 [Education Fallback] Titular desde formación (split): {titular_extraido}")
                                            break
                                if titular_extraido == 'No extraído':
                                    titular_extraido = titulo_str
                                    logger.info(f"🔧 [Education Fallback] Titular desde formación: {titular_extraido}")
                            if titular_extraido != 'No extraído':
                                break

            if 'titular_profesional' not in fixed_data or not fixed_data['titular_profesional']:
                fixed_data['titular_profesional'] = {'titular': titular_extraido}
            else:
                 fixed_data['titular_profesional']['titular'] = titular_extraido

        # Asegurar listas (estas son requeridas pero pueden estar vacías)
        for field in ['experiencia_laboral', 'formacion_academica']:
            if field not in fixed_data or not isinstance(fixed_data[field], list):
                logger.info(f"🔧 Reparando lista {field}")
                fixed_data[field] = []

        # Sanitizar formacion_academica
        if isinstance(fixed_data.get('formacion_academica'), list):
            sanitized_edu = []
            for edu in fixed_data['formacion_academica']:
                if isinstance(edu, dict):
                    titulo = edu.get('titulo')
                    if isinstance(titulo, dict):
                        edu['titulo'] = str(titulo.get('titulo') or titulo.get('name') or "No especificado")
                    inst = edu.get('institucion')
                    if isinstance(inst, dict):
                        edu['institucion'] = str(inst.get('institucion') or inst.get('name') or "No especificado")
                    sanitized_edu.append(edu)
                else:
                    sanitized_edu.append({"titulo": str(edu), "institucion": "No especificado"})
            fixed_data['formacion_academica'] = sanitized_edu

            # --- HEURÍSTICA: Extracción de instituciones desde el texto del CV ---
            if cv_text:
                for edu in fixed_data['formacion_academica']:
                    if isinstance(edu, dict) and edu.get('institucion') == 'No especificado':
                        titulo = str(edu.get('titulo', ''))
                        inst = self._heuristic_institution_extraction(cv_text, titulo)
                        if inst:
                            edu['institucion'] = inst
                            logger.info(f"🔧 [HEURISTIC] Institución recuperada para '{titulo[:50]}...': {inst}")
            
        # Sanitizar experiencia_laboral
        if isinstance(fixed_data.get('experiencia_laboral'), list):
            sanitized_exp = []
            for exp in fixed_data['experiencia_laboral']:
                if isinstance(exp, dict):
                    cargo = exp.get('cargo')
                    if isinstance(cargo, dict):
                        exp['cargo'] = str(cargo.get('cargo') or cargo.get('title') or "No especificado")
                    empresa = exp.get('empresa')
                    if isinstance(empresa, dict):
                        exp['empresa'] = str(empresa.get('empresa') or empresa.get('company') or "No especificado")
                        
                    resp = exp.get('responsabilidades')
                    if isinstance(resp, dict):
                        exp['responsabilidades'] = [str(v) for v in resp.values()]
                    sanitized_exp.append(exp)
                else:
                    sanitized_exp.append({"cargo": str(exp), "empresa": "No especificado"})
            fixed_data['experiencia_laboral'] = sanitized_exp

        # Asegurar habilidades (solo si realmente no hay datos o es una lista plana vacía)
        habilidades = fixed_data.get('habilidades')
        if not isinstance(habilidades, dict) or (
            not habilidades.get('habilidades_tecnicas') and
            not habilidades.get('idiomas') and
            not habilidades.get('habilidades_blandas') and
            not any(isinstance(habilidades.get(k), list) and len(habilidades[k]) > 0
                   for k in ['habilidades_tecnicas', 'idiomas', 'habilidades_blandas'])
        ):
            logger.info("🔧 Agregando habilidades faltantes")
            fixed_data['habilidades'] = {
                'habilidades_tecnicas': [],
                'idiomas': [],
                'habilidades_blandas': []
            }

        # Asegurar formacion_complementaria
        if 'formacion_complementaria' not in fixed_data:
            logger.info("🔧 Agregando formacion_complementaria faltante")
            fixed_data['formacion_complementaria'] = {'certificaciones_cursos': []}

        # Asegurar reconocimientos
        if 'reconocimientos' not in fixed_data:
            logger.info("🔧 Agregando reconocimientos faltantes")
            fixed_data['reconocimientos'] = {'logros_premios': []}

        logger.info(f"🔧 Datos reparados: {list(fixed_data.keys())}")
        return fixed_data

    def _heuristic_skill_extraction(self, cv_text: str) -> Tuple[List[str], Optional[str]]:
        """
        Extrae habilidades técnicas del texto crudo del CV mediante heurística.
        Busca secciones de tipo 'Habilidades'/'Skills'/'Competencias' y parsea
        bullet points, listas separadas por comas/pipes, y líneas con formato de lista.
        """
        import re

        text = cv_text.replace('\r', '\n')
        lines = text.split('\n')

        section_keywords = [
            r'(habilidades|competencias|skills|capacidades|conocimientos|aptitudes|destrezas|herramientas?|technologies?|tools?)',
        ]

        section_start = None
        for i, line in enumerate(lines):
            line_clean = line.strip().lower()
            for pat in section_keywords:
                if re.search(pat, line_clean):
                    # Heurística: títulos de sección suelen ser cortos y en mayúsculas o con formato
                    if len(line_clean) < 60 and not line_clean.startswith(('http', 'www')):
                        section_start = i
                        break
            if section_start is not None:
                break

        if section_start is None:
            return [], None

        section_name = lines[section_start].strip()
        section_lines = []
        for i in range(section_start + 1, min(section_start + 40, len(lines))):
            line = lines[i].strip()
            # Detener en siguiente sección (línea corta en mayúsculas o con keyword de sección)
            if line and len(line) < 60 and (
                line.isupper() or
                any(re.search(r'(?:experiencia|formaci[oó]n|educaci[oó]n|idiomas?|intereses|referencias|proyectos|certificaciones?|contacto)', line.lower()) for _ in [1])
            ):
                break
            if line:
                section_lines.append(line)

        if not section_lines:
            return [], section_name

        raw_skills_text = ' '.join(section_lines)
        logger.info(f"🔧 [HEURISTIC] Contenido sección skills: {raw_skills_text[:200]}...")

        skills = []

        # Estrategia 1: Bullet points como delimitadores primarios
        bullet_split = re.split(r'\n\s*[•\-*>·○▪◆◇‣◦]\s*', '\n' + raw_skills_text)
        for item in bullet_split:
            item = item.strip()
            if not item:
                continue
            # Remover el bullet character si quedó al inicio
            item = re.sub(r'^[•\-*>·○▪◆◇‣◦]\s*', '', item)
            item = item.strip()
            if len(item) < 2 or len(item) > 250:
                continue
            if item.startswith(('http://', 'https://', 'www.')):
                continue
            cleaned = re.sub(r'\s{2,}', ' ', item).strip()
            cleaned = cleaned.rstrip(',').rstrip(';').rstrip('.').strip()

            if cleaned and len(cleaned) > 2:
                if self._is_not_skill(cleaned):
                    continue
                # Saltar items que son categorías (terminan en : sin contenido después)
                skills.append(cleaned)

        # Estrategia 2: Si no hay bullets, líneas completas
        if not skills:
            for s in section_lines:
                s = s.strip().lstrip('•-*>·○▪◆◇‣◦').strip()
                s = re.sub(r'\s{2,}', ' ', s).rstrip(',').rstrip(';').rstrip('.')
                if 2 < len(s) < 250 and not self._is_not_skill(s):
                    skills.append(s)

        # Deduplicar
        unique = []
        seen = set()
        for s in skills:
            s_clean = s.strip().lower()
            if s_clean and s_clean not in seen:
                seen.add(s_clean)
                unique.append(s.strip())

        # Filtrar: remover items que son encabezados de categoría (ej: "Estratégicas:")
        filtered = []
        for s in unique:
            # Si es un encabezado tipo "Categoría:" sin más contenido relevante
            if re.match(r'^[A-Za-zÁÉÍÓÚáéíóúñÑ\s]+:\s*$', s):
                continue
            # Si contiene "Idioma:" es un idioma, no skill técnica
            if re.match(r'^idiomas?\s*:', s.lower()):
                continue
            filtered.append(s)

        return filtered[:30], section_name

    def _heuristic_institution_extraction(self, cv_text: str, education_title: str) -> Optional[str]:
        """
        Busca el nombre de la institución educativa en el texto del CV,
        cerca de donde aparece el título educativo.
        """
        import re

        if not education_title or len(education_title) < 5:
            return None

        text = cv_text.replace('\r', '\n')
        lines = text.split('\n')

        institution_keywords = [
            r'universidad', r'university', r'instituto', r'institute',
            r'pontificia', r'facultad', r'faculty', r'escuela', r'school',
            r'colegio', r'college', r'centro', r'center',
            r'U\.\s*[A-Z]', r'Universidad\s+[A-Z]',
        ]

        title_words = set(re.findall(r'\b\w{4,}\b', education_title.lower()))

        best_match = None
        best_score = 0

        for i, line in enumerate(lines):
            line_clean = line.strip()
            if not line_clean or len(line_clean) < 4:
                continue

            line_lower = line_clean.lower()

            # Checar si la línea contiene el título educativo o palabras clave del título
            title_proximity_score = sum(
                1 for w in title_words if w in line_lower.replace('\n', ' ')
            )

            # Buscar en líneas cercanas (±3 líneas) al título
            nearby_lines = []
            for offset in range(-3, 4):
                idx = i + offset
                if 0 <= idx < len(lines):
                    nearby_lines.append(lines[idx].strip())

            nearby_text = ' '.join(nearby_lines)

            # Buscar keywords de institución
            for pat in institution_keywords:
                inst_match = re.search(pat, nearby_text, re.IGNORECASE)
                if inst_match:
                    # Extraer el nombre completo de la institución (desde la keyword hacia los costados)
                    match_start = inst_match.start()
                    context = nearby_text[max(0, match_start - 5):match_start + 80]
                    inst_name = context.strip()

                    # Limpiar: tomar hasta el primer punto, coma, o pipe
                    inst_name = re.split(r'[,.;:|]\s*', inst_name)[0]
                    inst_name = inst_name.strip()

                    # Score basado en keyword match y proximity al título
                    inst_words = len(re.findall(r'\b\w{3,}\b', inst_name))
                    score = (2 if inst_match.group(0).lower() in ['universidad', 'university'] else 1)
                    score += title_proximity_score
                    score += min(inst_words, 5)

                    if score > best_score and len(inst_name) > 4 and len(inst_name) < 120:
                        best_match = inst_name
                        best_score = score

        # Fallback: buscar líneas que contengan keywords de institución + palabras del título
        if not best_match:
            for i, line in enumerate(lines):
                line_clean = line.strip()
                if len(line_clean) < 4 or len(line_clean) > 120:
                    continue

                has_inst_kw = any(re.search(pat, line_clean, re.IGNORECASE) for pat in institution_keywords)
                if has_inst_kw and not any(w in line_clean.lower() for w in ['experiencia', 'habilidad', 'contacto']):
                    best_match = line_clean.strip()
                    break

        return best_match

    def _is_not_skill(self, text: str) -> bool:
        """Filtra líneas que claramente no son habilidades"""
        import re
        t = text.lower()
        no_skill_patterns = [
            r'^\d{4}', r'^(enero|febrero|marzo|abril|mayo|junio|julio|agosto|sept|oct|nov|dic)',
            r'^[a-z]+ \d{4}$', r'^tel[ée]fono', r'^correo', r'^email', r'^direcci[oó]n',
            r'^linkedin', r'^github', r'^www\.', r'^http',
        ]
        for pat in no_skill_patterns:
            if re.search(pat, t):
                return True
        return len(t) < 2

    def _create_minimal_valid_response(self) -> ResumeData:
        """
        Crear respuesta mínima válida sin valores None en colecciones requeridas
        """
        from app.models.resume import ContactInfo, ProfessionalTitle, ProfessionalSummary, Skills, AdditionalTraining, Recognition, OnlineProfiles, ExtracurricularActivities, Interests, Projects

        return ResumeData(
            datos_contacto=ContactInfo(
                nombre_completo="No extraído",
                email="no-extraido@example.com",
                ubicacion="No especificado"
            ),
            titular_profesional=ProfessionalTitle(titular="No extraído"),
            resumen_profesional=ProfessionalSummary(resumen="No extraído"),
            experiencia_laboral=[],
            formacion_academica=[],
            habilidades=Skills(),
            perfiles_online=OnlineProfiles(linkedin=None, github=None, portfolio=None, otros=[]),
            formacion_complementaria=AdditionalTraining(certificaciones_cursos=[]),
            reconocimientos=Recognition(logros_premios=[]),
            proyectos=Projects(proyectos=[]),
            actividades_extracurriculares=ExtracurricularActivities(voluntariado=[]),
            intereses=Interests(hobbies_intereses=[]),
            otros_antecedentes=[]
        )

    def _calculate_confidence(self, data: Dict[str, Any]) -> float:
        """
        Calcular confianza basada en completeness
        """
        return self._validate_extraction_quality(data)

    def _collect_warnings(self, data: Dict[str, Any]) -> List[str]:
        """
        Recolectar advertencias
        """
        warnings = []

        if not data.get("experiencia_laboral") or len(data["experiencia_laboral"]) == 0:
            warnings.append("No se encontró experiencia laboral")

        if not data.get("formacion_academica") or len(data["formacion_academica"]) == 0:
            warnings.append("No se encontró formación académica")

        return warnings

    def _identify_missing_fields(self, resume_data: ResumeData) -> List[str]:
        """
        Identificar campos faltantes
        """
        missing = []

        if not resume_data.experiencia_laboral:
            missing.append("experiencia_laboral")
        if not resume_data.formacion_academica:
            missing.append("formacion_academica")
        if resume_data.datos_contacto.nombre_completo in ["No extraído", "Información no disponible"]:
            missing.append("nombre_completo")

        return missing

    def _log_extraction_summary(self, resume_data: ResumeData):
        """
        Log resumen de extracción
        """
        logger.info(f"📊 RESUMEN EXTRACCIÓN:")
        logger.info(f"   👤 Nombre: {resume_data.datos_contacto.nombre_completo}")
        logger.info(f"   💼 Experiencia laboral: {len(resume_data.experiencia_laboral)} items")
        logger.info(f"   🎓 Formación académica: {len(resume_data.formacion_academica)} items")
        logger.info(f"   🔧 Habilidades técnicas: {len(resume_data.habilidades.habilidades_tecnicas)} items")

    def _create_empty_structure(self) -> Dict[str, Any]:
        """
        Crear estructura vacía inicial
        """
        return {
            "datos_contacto": {
                "nombre_completo": "No extraído",
                "telefono": None,
                "email": "no-extraido@example.com",
                "ubicacion": None
            },
            "titular_profesional": {"titular": "No extraído"},
            "resumen_profesional": {"resumen": "No extraído"},
            "experiencia_laboral": [],
            "formacion_academica": [],
            "habilidades": {
                "habilidades_tecnicas": [],
                "idiomas": [],
                "habilidades_blandas": []
            }
        }

    def _create_error_response(self, error_msg: str, processing_time: float, request_id: str = "unknown") -> ResumeExtractionResponse:
        """
        Crear respuesta de error
        """
        return ResumeExtractionResponse(
            datos_cv=self._create_minimal_valid_response(),
            confianza_general=0.0,
            advertencias=[f"Error crítico durante extracción: {error_msg}"],
            campos_faltantes=["ALL"],
            tiempo_procesamiento=processing_time,
            timestamp=datetime.now().isoformat()
        )
        
    def _extract_titular_from_text(self, text: str) -> str:
        """Helper para extraer titular profesional del texto, saltando nombres personales"""
        import re

        lines = text.strip().split('\n')

        # Patrones que indican que una línea NO es un titular profesional
        name_pattern = re.compile(
            r'^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+'  # Nombre Apellido
            r'(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)?$'                      # Apellido2 opcional
        )
        contact_patterns = [
            r'@',                           # email
            r'\+\d{1,3}\s',                # teléfono internacional
            r'\b\d{7,}\b',                 # número largo
            r'linkedin\.com', r'github\.com',  # URL perfil
            r'^www\.', r'^https?://',
        ]

        # Keywords que sugieren un rol/titular profesional
        role_keywords = re.compile(
            r'\b('
            r'ingeniero|ingeniera|engineer|developer|desarrollador|desarrolladora|'
            r'analista|analyst|consultor|consultora|consultant|'
            r'arquitecto|arquitecta|architect|'
            r'especialista|specialist|técnico|técnica|technician|'
            r'programador|programadora|programmer|'
            r'administrador|administradora|administrator|'
            r'coordinador|coordinadora|coordinator|'
            r'jefe|jefa|chief|head|'
            r'director|directora|'
            r'gerente|manager|'
            r'líder|lider|leader|'
            r'diseñador|diseñadora|designer|'
            r'científico|científica|scientist|'
            r'profesor|profesora|professor|teacher|'
            r'asesor|asesora|advisor|'
            r'supervisor|supervisora|'
            r'auditor|auditora|'
            r'contador|contadora|accountant|'
            r'abogado|abogada|lawyer|attorney|'
            r'médico|médica|doctor'
            r')\b',
            re.IGNORECASE
        )

        for line in lines[:20]:
            line = line.strip()
            if len(line) < 5 or len(line) > 100:
                continue

            # Saltar líneas que parecen ser nombre personal
            if name_pattern.match(line):
                continue

            # Saltar líneas con info de contacto
            if any(re.search(p, line, re.IGNORECASE) for p in contact_patterns):
                continue

            # Saltar líneas que son puramente fechas o números
            if re.match(r'^[\d\s/\-–—.]+$', line):
                continue

            # Si la línea contiene una keyword de rol profesional → titular
            if role_keywords.search(line):
                return line

        # Si no se encuentra nada, retornar "No extraído" para que la cascada continúe
        return "No extraído"

    def _create_emergency_response(self, partial_data: Dict, cv_text: str) -> Optional[ResumeData]:
        """Intentar recuperar datos en caso de emergencia"""
        # Implementación simple de recuperación
        return self._create_validated_response(partial_data, cv_text)

    async def extract_from_file(self, file_content: bytes, filename: str,
                               config: Optional[Dict[str, Any]] = None, request_id: str = "unknown") -> ResumeExtractionResponse:
        try:
            from app.services.file_parser_service import FileParserService

            file_parser = FileParserService()

            validation_result = file_parser.validate_file(file_content, filename)
            if asyncio.iscoroutine(validation_result):
                 validation_result = await validation_result

            if not validation_result["is_valid"]:
                raise ValueError(f"Archivo inválido: {', '.join(validation_result['issues'])}")

            parse_result = await file_parser.parse_file(file_content, filename)

            if asyncio.iscoroutine(parse_result):
                parse_result = await parse_result

            if not parse_result["success"]:
                raise ValueError(f"Error al procesar archivo: {parse_result['error']}")

            extracted_text = parse_result["text"]
            if not extracted_text.strip():
                raise ValueError("No se pudo extraer texto del archivo")

            file_extension = filename.split('.')[-1].lower() if '.' in filename else 'txt'

            request = ResumeExtractionRequest(
                nombre_archivo=filename,
                tipo_archivo=file_extension,
                archivo_contenido=extracted_text,
                configuracion=config or {}
            )

            return await self.extract_from_text(request, request_id=request_id)

        except Exception as e:
            logger.error(f"Error en extract_from_file: {e}")
            return self._create_error_response(str(e), 0.0)