"""
Servicio de estructuración de datos post-extracción LLM
Separa la responsabilidad de parsing LLM y estructuración de datos
"""
import logging
from typing import Dict, List, Optional, Any, Union
from datetime import datetime
from app.models.resume import ResumeData

logger = logging.getLogger(__name__)

class DataStructurerService:
    """
    Servicio robusto para estructurar datos extraídos por LLMs
    Convierte cualquier formato de respuesta LLM en estructura consistente
    """

    def __init__(self):
        self.default_values = {
            "nombre_completo": "Información no disponible",
            "email": "no-extraido@example.com",
            "telefono": None,
            "ubicacion": "No especificado",
            "titular": "Perfil profesional no especificado",
            "resumen": "Resumen no disponible"
        }

    def structure_resume_data(
        self,
        raw_extractions: Dict[str, Any],
        file_metadata: Dict[str, Any],
        profile_detection: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Estructura todos los datos de CV en formato consistente

        Args:
            raw_extractions: Datos crudos extraídos por LLMs
            file_metadata: Metadatos del archivo procesado
            profile_detection: Información de detección de perfil

        Returns:
            Dict con estructura de CV normalizada
        """
        try:
            logger.info("Iniciando estructuración de datos de CV")

            # Extraer datos principales
            main_data = self._safe_extract(raw_extractions, "main_extraction", {})

            # 🚀 SOLUCIÓN: Si main_data no tiene datos completos, fusionar con técnicas avanzadas
            enhanced_main_data = self._merge_advanced_techniques_data(raw_extractions, main_data)

            experience_data = self._safe_extract(raw_extractions, "detailed_experience", [])
            skills_data = self._safe_extract(raw_extractions, "detailed_skills", {})
            validation_data = self._safe_extract(raw_extractions, "validation_cleaning", {})

            # Estructurar cada sección usando los datos mejorados
            structured_data = {
                "datos_cv": {
                    "datos_contacto": self._structure_contact_data(enhanced_main_data, validation_data),
                    "titular_profesional": self._structure_professional_title(enhanced_main_data, validation_data),
                    "resumen_profesional": self._structure_professional_summary(enhanced_main_data, validation_data),
                    "experiencia_laboral": self._structure_work_experience(enhanced_main_data, experience_data, validation_data),
                    "formacion_academica": self._structure_education(enhanced_main_data, validation_data),
                    "habilidades": self._structure_skills(enhanced_main_data, skills_data, validation_data),
                    "perfiles_online": self._structure_online_profiles(enhanced_main_data, validation_data),
                    "formacion_complementaria": self._structure_additional_training(enhanced_main_data, validation_data),
                    "reconocimientos": self._structure_achievements(enhanced_main_data, validation_data),
                    "actividades_extracurriculares": self._structure_extracurricular(enhanced_main_data, validation_data),
                    "intereses": self._structure_interests(enhanced_main_data, validation_data),
                    "metadata_procesamiento": self._structure_processing_metadata(file_metadata, profile_detection)
                },
                "confianza_general": self._calculate_general_confidence(raw_extractions, profile_detection),
                "advertencias": self._collect_warnings(raw_extractions),
                "campos_faltantes": self._identify_missing_fields(enhanced_main_data, validation_data),
                "tiempo_procesamiento": raw_extractions.get("processing_time", 0),
                "timestamp": datetime.now().isoformat()
            }

            # 🔍 DEBUG: Verificar datos estructurados antes del return
            datos_cv = structured_data.get("datos_cv", {})
            logger.info(f"🔍 DEBUG DataStructurer - Datos estructurados finales:")
            logger.info(f"🔍   formacion_academica final: {len(datos_cv.get('formacion_academica', []))} items")
            logger.info(f"🔍   experiencia_laboral final: {len(datos_cv.get('experiencia_laboral', []))} items")
            logger.info(f"🔍   datos_contacto final: {bool(datos_cv.get('datos_contacto'))}")

            logger.info("Estructuración de datos completada exitosamente")
            return structured_data

        except Exception as e:
            logger.error(f"Error en estructuración de datos: {e}")
            return self._create_error_fallback(file_metadata, str(e))

    def _merge_advanced_techniques_data(self, raw_extractions: Dict[str, Any], main_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        🚀 FUSIONA datos de técnicas avanzadas cuando main_data está incompleto
        """
        # Safety checks
        if raw_extractions is None:
            raw_extractions = {}
        if main_data is None:
            main_data = {}

        enhanced_data = main_data.copy() if isinstance(main_data, dict) else {}

        # Orden de prioridad para fusionar datos
        technique_priority = [
            "comprehensive_extraction",
            "self_correction",
            "cot_extraction",
            "decomp_education",
            "decomp_experience"
        ]


        for technique in technique_priority:
            if technique in raw_extractions:
                technique_data = raw_extractions[technique]

                if isinstance(technique_data, dict):
                    # Si es una extracción completa, usar como base principal
                    if technique in ["comprehensive_extraction", "self_correction", "cot_extraction"]:
                        if technique_data.get("formacion_academica") or technique_data.get("experiencia_laboral"):
                            logger.info(f"🔍 DEBUG _merge_advanced - Using {technique} as main data source")
                            enhanced_data = technique_data.copy()
                            # CONTINUAR para también integrar datos específicos de decomposición
                            # No hacer break aquí

                # Si es decomposición específica, fusionar sección específica (SIEMPRE)
                if technique == "decomp_education":
                    if isinstance(technique_data, dict) and "formacion_academica" in technique_data:
                        enhanced_data["formacion_academica"] = technique_data["formacion_academica"]
                        logger.info(f"🔍 DEBUG _merge_advanced - Merged formacion_academica from {technique}")

                elif technique == "decomp_experience":
                    if isinstance(technique_data, dict) and "experiencia_laboral" in technique_data:
                        enhanced_data["experiencia_laboral"] = technique_data["experiencia_laboral"]
                        logger.info(f"🔍 DEBUG _merge_advanced - Merged experiencia_laboral from {technique}")

        return enhanced_data

    def _safe_extract(self, data: Dict, key: str, default: Any) -> Any:
        """Extracción segura de datos con manejo robusto de errores"""
        try:
            if data is None:
                return default

            value = data.get(key, default)

            # Si es un string que parece JSON, intentar parsearlo
            if isinstance(value, str) and value.strip().startswith('{'):
                import json
                try:
                    return json.loads(value)
                except:
                    pass

            return value if value is not None else default
        except Exception as e:
            logger.warning(f"Error extrayendo {key}: {e}")
            return default

    def _structure_contact_data(self, main_data: Dict, validation_data: Dict) -> Dict[str, Any]:
        """Estructura datos de contacto con validación robusta"""
        contact_sources = [
            validation_data.get("datos_validados", {}),
            validation_data,
            main_data.get("datos_contacto", {}),
            main_data
        ]

        contact_data = {}

        # Extraer nombre completo
        nombre = None
        for source in contact_sources:
            if isinstance(source, dict):
                nombre = (source.get("nombre_completo") or
                         source.get("nombre") or
                         source.get("datos_contacto", {}).get("nombre_completo"))
                if nombre and nombre != "Información no extraída":
                    break

        # Extraer email
        email = None
        for source in contact_sources:
            if isinstance(source, dict):
                email = (source.get("email") or
                        source.get("datos_contacto", {}).get("email"))
                if email and "@" in str(email) and "no-extraido" not in str(email):
                    break

        # Extraer teléfono
        telefono = None
        for source in contact_sources:
            if isinstance(source, dict):
                telefono = (source.get("telefono") or
                           source.get("datos_contacto", {}).get("telefono"))
                if telefono and telefono != "No especificado":
                    break

        # Extraer ubicación
        ubicacion = None
        for source in contact_sources:
            if isinstance(source, dict):
                ubicacion = (source.get("ubicacion") or
                            source.get("datos_contacto", {}).get("ubicacion"))
                if ubicacion and ubicacion != "No especificado":
                    break

        return {
            "nombre_completo": nombre or self.default_values["nombre_completo"],
            "telefono": telefono if telefono and telefono != "No especificado" else None,
            "email": email or self.default_values["email"],
            "ubicacion": ubicacion or self.default_values["ubicacion"],
            "metadata": None
        }

    def _structure_professional_title(self, main_data: Dict, validation_data: Dict) -> Dict[str, Any]:
        """Estructura titular profesional - Detecta automáticamente título académico principal"""
        sources = [validation_data.get("datos_validados", {}), main_data]

        titular = None
        for source in sources:
            if isinstance(source, dict):
                titular = (source.get("titular_profesional", {}).get("titular") or
                          source.get("titular") or
                          source.get("titulo_profesional"))
                if titular and titular != "Perfil profesional no especificado":
                    break

        # Si no hay titular específico, extraer automáticamente de formación académica
        if not titular or titular == "Perfil profesional no especificado":
            titular = self._extract_professional_title_from_education(main_data, validation_data)

        # Si aún no hay titular, extraer del resumen profesional
        if not titular or titular == "Perfil profesional no especificado":
            for source in sources:
                if isinstance(source, dict):
                    resumen = (source.get("descripcion_profesional") or
                             source.get("resumen") or
                             source.get("bio"))
                    if resumen and isinstance(resumen, str):
                        # Extraer primera oración como titular (máximo 100 chars)
                        first_sentence = resumen.split('.')[0].strip()
                        if len(first_sentence) > 20 and len(first_sentence) <= 100:
                            titular = first_sentence
                            break

        return {
            "titular": titular or self.default_values["titular"],
            "metadata": None
        }

    def _extract_professional_title_from_education(self, main_data: Dict, validation_data: Dict) -> str:
        """Extrae automáticamente el título profesional principal de la formación académica"""
        # Recopilar todos los títulos de formación académica
        all_titles = []
        sources = [validation_data.get("datos_validados", {}), main_data]

        for source in sources:
            if isinstance(source, dict) and source.get("formacion_academica"):
                education_list = source["formacion_academica"]
                if isinstance(education_list, list):
                    for edu in education_list:
                        if isinstance(edu, dict) and edu.get("titulo"):
                            all_titles.append(edu["titulo"])

        if not all_titles:
            return None

        # Priorizar títulos profesionales por orden de importancia
        professional_priorities = [
            # Títulos universitarios y profesionales
            ("contador publico", "Contador Público"),
            ("contador auditor", "Contador Auditor"),
            ("auditor", "Auditor"),
            ("ingeniero", "Ingeniero"),
            ("licenciado", "Licenciado"),
            ("arquitecto", "Arquitecto"),
            ("medico", "Médico"),
            ("abogado", "Abogado"),
            ("psicologo", "Psicólogo"),
            ("administrador", "Administrador"),

            # Títulos de posgrado
            ("magister", "Magíster"),
            ("master", "Máster"),
            ("mba", "MBA"),
            ("doctorado", "Doctor"),
            ("doctor", "Doctor"),
            ("phd", "PhD"),
        ]

        # Buscar el título de mayor prioridad
        for priority_keyword, clean_title in professional_priorities:
            for title in all_titles:
                title_lower = title.lower()
                if priority_keyword in title_lower:
                    # Si encontramos una coincidencia, extraer el título específico
                    if "contador publico" in title_lower and "auditor" in title_lower:
                        return "Contador Público - Auditor"
                    elif "contador auditor" in title_lower:
                        return "Contador Auditor"
                    elif "contador publico" in title_lower:
                        return "Contador Público"
                    elif "ingeniero" in title_lower:
                        # Extraer tipo de ingeniería si es específico
                        engineering_types = ["civil", "industrial", "comercial", "sistemas", "informatico", "electronico", "mecanico"]
                        for eng_type in engineering_types:
                            if eng_type in title_lower:
                                return f"Ingeniero {eng_type.capitalize()}"
                        return "Ingeniero"
                    elif "licenciado" in title_lower or "licenciatura" in title_lower:
                        # Extraer área de licenciatura
                        if "contabilidad" in title_lower:
                            return "Licenciado en Contabilidad"
                        elif "auditoria" in title_lower:
                            return "Licenciado en Auditoría"
                        elif "administracion" in title_lower:
                            return "Licenciado en Administración"
                        else:
                            return "Licenciado"
                    elif "magister" in title_lower or "master" in title_lower:
                        if "direccion" in title_lower and "empresas" in title_lower:
                            return "Magíster en Dirección de Empresas"
                        elif "administracion" in title_lower:
                            return "Magíster en Administración"
                        elif "mba" in title_lower:
                            return "MBA"
                        else:
                            return "Magíster"
                    else:
                        return clean_title

        # Si no encontramos títulos prioritarios, usar el primer título académico (no diplomado)
        for title in all_titles:
            title_lower = title.lower()
            # Evitar diplomados y cursos
            if not any(word in title_lower for word in ["diplomado", "diploma", "curso", "certificado", "seminario", "taller"]):
                # Limpiar y formatear el título
                cleaned_title = title.strip()
                if len(cleaned_title) > 10 and len(cleaned_title) <= 80:
                    return self._clean_professional_title(cleaned_title)

        return None

    def _clean_professional_title(self, title: str) -> str:
        """Limpia y formatea un título profesional"""
        # Remover texto redundante común
        title = title.replace("TITULO DE ", "")
        title = title.replace("GRADO DE ", "")
        title = title.replace("Otorgado por", "").split("Otorgado por")[0].strip()

        # Capitalizar correctamente
        words = title.split()
        cleaned_words = []

        for word in words:
            word = word.strip()
            if word:
                # Palabras que deben ir en mayúsculas
                if word.upper() in ["MBA", "PhD", "CEO", "CTO", "CFO"]:
                    cleaned_words.append(word.upper())
                # Palabras de conexión que van en minúsculas
                elif word.lower() in ["de", "en", "y", "del", "la", "el", "los", "las"]:
                    cleaned_words.append(word.lower())
                # Primera letra mayúscula, resto minúsculas
                else:
                    cleaned_words.append(word.capitalize())

        result = " ".join(cleaned_words)

        # Límite de longitud
        if len(result) > 80:
            result = result[:80].rsplit(' ', 1)[0] + "..."

        return result

    def _structure_professional_summary(self, main_data: Dict, validation_data: Dict) -> Dict[str, Any]:
        """Estructura resumen profesional"""
        sources = [validation_data.get("datos_validados", {}), main_data]

        resumen = None
        for source in sources:
            if isinstance(source, dict):
                # Buscar en múltiples campos posibles
                resumen = (source.get("resumen_profesional", {}).get("resumen") or
                          source.get("resumen") or
                          source.get("descripcion_profesional") or  # ← NUEVO: campo común
                          source.get("bio") or                      # ← NUEVO: campo común
                          source.get("descripcion"))                # ← NUEVO: campo común
                if resumen and resumen != "Resumen no disponible" and len(str(resumen).strip()) > 50:
                    break

        return {
            "resumen": resumen or self.default_values["resumen"],
            "metadata": None
        }

    def _structure_work_experience(self, main_data: Dict, experience_data: Any, validation_data: Dict) -> List[Dict[str, Any]]:
        """Estructura experiencia laboral de múltiples fuentes"""
        # 🔍 DEBUG: Verificar datos de experiencia
        logger.info(f"🔍 DEBUG _structure_work_experience - main_data type: {type(main_data)}")
        if isinstance(main_data, dict):
            logger.info(f"🔍 DEBUG _structure_work_experience - 'experiencia_laboral' in main_data: {'experiencia_laboral' in main_data}")
            if 'experiencia_laboral' in main_data:
                exp_data = main_data['experiencia_laboral']
                logger.info(f"🔍 DEBUG _structure_work_experience - experiencia_laboral type: {type(exp_data)}, content preview: {str(exp_data)[:200]}...")

        experiences = []

        # Fuentes prioritarias de experiencia
        sources = [
            validation_data.get("datos_validados", {}).get("experiencia_laboral"),
            experience_data if isinstance(experience_data, list) else None,
            main_data.get("experiencia_laboral")
        ]

        for source in sources:
            if isinstance(source, list) and source:
                for exp in source:
                    if isinstance(exp, dict) and exp.get("cargo") and exp.get("empresa"):
                        structured_exp = {
                            "cargo": str(exp.get("cargo", "")).strip(),
                            "empresa": str(exp.get("empresa", "")).strip(),
                            "periodo": self._normalize_period(exp.get("periodo")),
                            "logros": self._normalize_achievements(exp.get("logros")),
                            "ubicacion": str(exp.get("ubicacion", "")).strip() or None,
                            "metadata": exp.get("metadata")
                        }
                        experiences.append(structured_exp)
                break  # Usar la primera fuente válida

        return experiences

    def _structure_education(self, main_data: Dict, validation_data: Dict) -> List[Dict[str, Any]]:
        """Estructura formación académica"""
        # 🔍 DEBUG: Verificar datos de entrada
        logger.info(f"🔍 DEBUG _structure_education - main_data type: {type(main_data)}")
        if isinstance(main_data, dict):
            logger.info(f"🔍 DEBUG _structure_education - main_data keys: {list(main_data.keys())}")
            logger.info(f"🔍 DEBUG _structure_education - 'formacion_academica' in main_data: {'formacion_academica' in main_data}")
            if 'formacion_academica' in main_data:
                fa_data = main_data['formacion_academica']
                logger.info(f"🔍 DEBUG _structure_education - formacion_academica type: {type(fa_data)}, content preview: {str(fa_data)[:200]}...")

        education = []

        sources = [
            validation_data.get("datos_validados", {}).get("formacion_academica"),
            main_data.get("formacion_academica")
        ]

        logger.info(f"🔍 DEBUG _structure_education - sources prepared: {[type(s) for s in sources]}")

        for i, source in enumerate(sources):
            logger.info(f"🔍 DEBUG _structure_education - Processing source {i}: type={type(source)}, is_list={isinstance(source, list)}, length={len(source) if isinstance(source, (list, dict)) else 'N/A'}")

            if isinstance(source, list) and source:
                logger.info(f"🔍 DEBUG _structure_education - Source {i} is valid list with {len(source)} items")
                for j, edu in enumerate(source):
                    logger.info(f"🔍 DEBUG _structure_education - Processing education item {j}: type={type(edu)}")
                    if isinstance(edu, dict):
                        logger.info(f"🔍 DEBUG _structure_education - Education item {j} keys: {list(edu.keys())}")
                        logger.info(f"🔍 DEBUG _structure_education - Has titulo: {edu.get('titulo') is not None}, Has institucion: {edu.get('institucion') is not None}")

                    if isinstance(edu, dict) and edu.get("titulo") and edu.get("institucion"):
                        titulo = str(edu.get("titulo", "")).strip()

                        # 🎯 SEPARAR: Solo títulos académicos principales (no diplomados/cursos)
                        if self._is_academic_degree(titulo):
                            structured_edu = {
                                "titulo": titulo,
                                "institucion": str(edu.get("institucion", "")).strip(),
                                "periodo": self._normalize_period(edu.get("periodo")),
                                "metadata": edu.get("metadata")
                            }
                            education.append(structured_edu)
                            logger.info(f"🔍 DEBUG _structure_education - Added ACADEMIC degree: {structured_edu['titulo']}")
                        else:
                            logger.info(f"🔍 DEBUG _structure_education - Skipped non-academic: {titulo} (should go to complementary)")
                break
            else:
                logger.info(f"🔍 DEBUG _structure_education - Source {i} is not a valid list: {source}")

        logger.info(f"🔍 DEBUG _structure_education - Final education count: {len(education)}")

        return education

    def _is_academic_degree(self, titulo: str) -> bool:
        """Determina si un título es académico formal (no diplomado/curso)"""
        titulo_lower = titulo.lower()

        # Títulos académicos formales
        academic_keywords = [
            "magister", "master", "mba", "doctorado", "phd", "doctor",
            "licenciado", "licenciatura", "ingeniero", "ingenieria",
            "titulo de contador", "contador publico", "auditor",
            "bachiller", "grado", "carrera de", "enseñanza superior"
        ]

        # NO académicos (formación complementaria)
        non_academic_keywords = [
            "diplomado", "diploma", "curso", "certificacion", "certificado",
            "seminario", "taller", "workshop", "capacitacion", "programa",
            "premio", "reconocimiento", "distincion"
        ]

        # Primero verificar si NO es académico
        for keyword in non_academic_keywords:
            if keyword in titulo_lower:
                return False

        # Luego verificar si SÍ es académico
        for keyword in academic_keywords:
            if keyword in titulo_lower:
                return True

        # Por defecto, si es de una universidad conocida, considerarlo académico
        if any(univ in titulo_lower for univ in ["universidad", "instituto profesional", "cft"]):
            return True

        return False

    def _structure_skills(self, main_data: Dict, skills_data: Any, validation_data: Dict) -> Dict[str, Any]:
        """Estructura habilidades de múltiples fuentes"""
        # Combinar habilidades de todas las fuentes
        all_skills = {}

        sources = [
            validation_data.get("datos_validados", {}),
            skills_data if isinstance(skills_data, dict) else {},
            main_data
        ]

        for source in sources:
            if isinstance(source, dict) and source.get("habilidades"):
                skills_section = source["habilidades"]
                if isinstance(skills_section, dict):
                    # Habilidades técnicas
                    if not all_skills.get("habilidades_tecnicas") and skills_section.get("habilidades_tecnicas"):
                        all_skills["habilidades_tecnicas"] = self._normalize_technical_skills(
                            skills_section["habilidades_tecnicas"]
                        )

                    # Idiomas
                    if not all_skills.get("idiomas") and skills_section.get("idiomas"):
                        all_skills["idiomas"] = self._normalize_languages(
                            skills_section["idiomas"]
                        )

                    # Habilidades blandas
                    if not all_skills.get("habilidades_blandas") and skills_section.get("habilidades_blandas"):
                        all_skills["habilidades_blandas"] = self._normalize_soft_skills(
                            skills_section["habilidades_blandas"]
                        )

        return {
            "habilidades_tecnicas": all_skills.get("habilidades_tecnicas", []),
            "idiomas": all_skills.get("idiomas", []),
            "habilidades_blandas": all_skills.get("habilidades_blandas", []),
            "metadata": None
        }

    def _normalize_period(self, period: Any) -> Dict[str, Any]:
        """Normaliza períodos de tiempo - SIEMPRE devuelve un dict válido con parsing inteligente"""
        if not period:
            return {
                "fecha_inicio": None,
                "fecha_fin": None,
                "texto_original": "No especificado"
            }

        if isinstance(period, dict):
            # Si ya está estructurado, usar tal como está
            texto_original = period.get("texto_original") or "No especificado"
            fecha_inicio = period.get("fecha_inicio")
            fecha_fin = period.get("fecha_fin")

            # Si no hay fechas estructuradas, intentar parsear desde texto original
            if not fecha_inicio and not fecha_fin and texto_original != "No especificado":
                parsed_dates = self._parse_period_from_text(texto_original)
                fecha_inicio = parsed_dates["fecha_inicio"]
                fecha_fin = parsed_dates["fecha_fin"]

            return {
                "fecha_inicio": fecha_inicio,
                "fecha_fin": fecha_fin,
                "texto_original": texto_original
            }
        elif isinstance(period, str):
            # Parsear fechas desde texto
            parsed_dates = self._parse_period_from_text(period)
            return {
                "fecha_inicio": parsed_dates["fecha_inicio"],
                "fecha_fin": parsed_dates["fecha_fin"],
                "texto_original": period
            }

        # Fallback para cualquier otro tipo
        period_str = str(period) if period is not None else "No especificado"
        parsed_dates = self._parse_period_from_text(period_str) if period_str != "No especificado" else {"fecha_inicio": None, "fecha_fin": None}

        return {
            "fecha_inicio": parsed_dates["fecha_inicio"],
            "fecha_fin": parsed_dates["fecha_fin"],
            "texto_original": period_str
        }

    def _parse_period_from_text(self, period_text: str) -> Dict[str, Any]:
        """Parsea fechas desde texto en formato libre"""
        import re

        if not period_text or period_text == "No especificado":
            return {"fecha_inicio": None, "fecha_fin": None}

        # Meses en español
        months_es = {
            "enero": "01", "febrero": "02", "marzo": "03", "abril": "04",
            "mayo": "05", "junio": "06", "julio": "07", "agosto": "08",
            "septiembre": "09", "octubre": "10", "noviembre": "11", "diciembre": "12"
        }

        fecha_inicio = None
        fecha_fin = None

        try:
            # Patterns comunes de fechas
            patterns = [
                # "Enero 2018 - Julio 2019", "Enero 2018 – Julio 2019"
                r'(\w+)\s+(\d{4})\s*[-–]\s*(\w+)\s+(\d{4})',
                # "01/2018 - 07/2019"
                r'(\d{1,2})/(\d{4})\s*[-–]\s*(\d{1,2})/(\d{4})',
                # "2018-01 - 2019-07"
                r'(\d{4})-(\d{1,2})\s*[-–]\s*(\d{4})-(\d{1,2})',
                # "2018 - 2019"
                r'(\d{4})\s*[-–]\s*(\d{4})',
                # "Enero 2018 - Presente", "Enero 2018 – Presente"
                r'(\w+)\s+(\d{4})\s*[-–]\s*(Presente|Actualidad|Actual)',
                # "01/2018 - Presente"
                r'(\d{1,2})/(\d{4})\s*[-–]\s*(Presente|Actualidad|Actual)',
                # "2018 - Presente"
                r'(\d{4})\s*[-–]\s*(Presente|Actualidad|Actual)'
            ]

            for pattern in patterns:
                match = re.search(pattern, period_text, re.IGNORECASE)
                if match:
                    groups = match.groups()

                    if len(groups) == 4:
                        # Formato: Mes YYYY - Mes YYYY o MM/YYYY - MM/YYYY
                        start_part1, start_part2, end_part1, end_part2 = groups

                        if start_part1.lower() in months_es:
                            # Formato: Mes YYYY
                            fecha_inicio = f"{start_part2}-{months_es[start_part1.lower()]}"
                        elif start_part1.isdigit() and len(start_part1) <= 2:
                            # Formato: MM/YYYY
                            fecha_inicio = f"{start_part2}-{start_part1.zfill(2)}"
                        elif len(start_part1) == 4:
                            # Formato: YYYY-MM
                            fecha_inicio = f"{start_part1}-{start_part2.zfill(2)}"

                        if end_part1.lower() in months_es:
                            # Formato: Mes YYYY
                            fecha_fin = f"{end_part2}-{months_es[end_part1.lower()]}"
                        elif end_part1.isdigit() and len(end_part1) <= 2:
                            # Formato: MM/YYYY
                            fecha_fin = f"{end_part2}-{end_part1.zfill(2)}"
                        elif len(end_part1) == 4:
                            # Formato: YYYY-MM
                            fecha_fin = f"{end_part1}-{end_part2.zfill(2)}"

                    elif len(groups) == 3:
                        # Formato: Mes YYYY - Presente
                        start_part1, start_part2, end_keyword = groups

                        if start_part1.lower() in months_es:
                            fecha_inicio = f"{start_part2}-{months_es[start_part1.lower()]}"
                        elif start_part1.isdigit() and len(start_part1) <= 2:
                            fecha_inicio = f"{start_part2}-{start_part1.zfill(2)}"
                        elif len(start_part1) == 4:
                            fecha_inicio = f"{start_part1}-{start_part2.zfill(2)}"

                        fecha_fin = "Presente"

                    elif len(groups) == 2:
                        # Formato: YYYY - YYYY o YYYY - Presente
                        start_year, end_part = groups
                        fecha_inicio = start_year

                        if end_part.lower() in ["presente", "actualidad", "actual"]:
                            fecha_fin = "Presente"
                        else:
                            fecha_fin = end_part

                    break

        except Exception as e:
            logger.warning(f"Error parseando período '{period_text}': {e}")

        return {"fecha_inicio": fecha_inicio, "fecha_fin": fecha_fin}

    def _normalize_achievements(self, achievements: Any) -> List[str]:
        """Normaliza logros/responsabilidades"""
        if not achievements:
            return []

        if isinstance(achievements, list):
            return [str(a).strip() for a in achievements if a and str(a).strip()]
        elif isinstance(achievements, str) and achievements.strip():
            return [achievements.strip()]

        return []

    def _normalize_technical_skills(self, skills: Any) -> List[Dict[str, Any]]:
        """Normaliza habilidades técnicas"""
        if not skills or not isinstance(skills, list):
            return []

        normalized = []
        for skill in skills:
            if isinstance(skill, dict) and skill.get("skill"):
                normalized.append({
                    "skill": str(skill["skill"]).strip(),
                    "level": skill.get("level"),
                    "years_experience": skill.get("years_experience"),
                    "metadata": skill.get("metadata")
                })
            elif isinstance(skill, str) and skill.strip():
                normalized.append({
                    "skill": skill.strip(),
                    "level": None,
                    "years_experience": None,
                    "metadata": None
                })

        return normalized

    def _normalize_languages(self, languages: Any) -> List[Dict[str, Any]]:
        """Normaliza idiomas"""
        if not languages or not isinstance(languages, list):
            return []

        normalized = []
        for lang in languages:
            if isinstance(lang, dict) and lang.get("idioma"):
                normalized.append({
                    "idioma": str(lang["idioma"]).strip(),
                    "nivel": lang.get("nivel"),
                    "metadata": lang.get("metadata")
                })
            elif isinstance(lang, str) and lang.strip():
                normalized.append({
                    "idioma": lang.strip(),
                    "nivel": None,
                    "metadata": None
                })

        return normalized

    def _normalize_soft_skills(self, skills: Any) -> List[str]:
        """Normaliza habilidades blandas"""
        if not skills:
            return []

        if isinstance(skills, list):
            return [str(s).strip() for s in skills if s and str(s).strip()]
        elif isinstance(skills, str):
            return [s.strip() for s in skills.split(",") if s.strip()]

        return []

    def _structure_online_profiles(self, main_data: Dict, validation_data: Dict) -> Optional[Dict[str, Any]]:
        """Estructura perfiles online"""
        sources = [validation_data.get("datos_validados", {}), main_data]

        for source in sources:
            if isinstance(source, dict) and source.get("perfiles_online"):
                return source["perfiles_online"]

        return None

    def _structure_additional_training(self, main_data: Dict, validation_data: Dict) -> Optional[Dict[str, Any]]:
        """Estructura formación complementaria con normalización robusta"""
        certificaciones_cursos = []

        # 1. Buscar en formacion_complementaria existente
        sources = [validation_data.get("datos_validados", {}), main_data]
        for source in sources:
            if isinstance(source, dict) and source.get("formacion_complementaria"):
                raw_training = source["formacion_complementaria"]

                # Si ya tiene la estructura correcta
                if isinstance(raw_training, dict) and "certificaciones_cursos" in raw_training:
                    normalized_courses = self._normalize_course_list(raw_training["certificaciones_cursos"])
                    return {"certificaciones_cursos": normalized_courses}

                # Si es una lista directa
                elif isinstance(raw_training, list):
                    certificaciones_cursos.extend(self._normalize_course_list(raw_training))

        # 2. 🎯 NUEVO: Buscar diplomados/cursos en formacion_academica que fueron filtrados
        for source in sources:
            if isinstance(source, dict) and source.get("formacion_academica"):
                for edu in source["formacion_academica"]:
                    if isinstance(edu, dict) and edu.get("titulo"):
                        titulo = str(edu.get("titulo", "")).strip()
                        if not self._is_academic_degree(titulo):  # Los que NO son académicos
                            # Convertir a formato de certificación
                            institucion = edu.get("institucion", "").strip()
                            periodo = edu.get("periodo", {})
                            if isinstance(periodo, dict):
                                periodo_text = periodo.get("texto_original", "")
                            else:
                                periodo_text = str(periodo) if periodo else ""

                            # Formato: "Título (Institución) [Año]"
                            cert_text = f"{titulo}"
                            if institucion:
                                cert_text += f" ({institucion})"
                            if periodo_text and periodo_text != "No especificado":
                                cert_text += f" [{periodo_text}]"

                            certificaciones_cursos.append(cert_text)

        if certificaciones_cursos:
            return {"certificaciones_cursos": certificaciones_cursos, "metadata": None}

        return None

    def _normalize_course_list(self, courses: Any) -> List[str]:
        """Convierte cualquier formato de cursos a lista de strings"""
        if not courses:
            return []

        normalized = []

        if isinstance(courses, list):
            for course in courses:
                normalized.append(self._normalize_course_item(course))
        elif isinstance(courses, dict):
            # Si es un dict, puede tener cursos anidados
            for key, value in courses.items():
                if isinstance(value, list):
                    for course in value:
                        normalized.append(self._normalize_course_item(course))
                else:
                    normalized.append(self._normalize_course_item(value))
        else:
            normalized.append(str(courses))

        return normalized

    def _normalize_course_item(self, course: Any) -> str:
        """Convierte un item de curso a string descriptivo"""
        if isinstance(course, dict):
            # Extraer información estructurada y convertir a string
            parts = []

            if course.get("nombre"):
                parts.append(course["nombre"])

            if course.get("institucion"):
                parts.append(f"({course['institucion']})")

            if course.get("duracion"):
                parts.append(f"- {course['duracion']}")

            if course.get("año") or course.get("fecha"):
                year = course.get("año") or course.get("fecha")
                parts.append(f"[{year}]")

            return " ".join(parts) if parts else str(course)

        elif isinstance(course, str):
            return course
        else:
            return str(course)

    def _structure_achievements(self, main_data: Dict, validation_data: Dict) -> Dict[str, Any]:
        """Estructura reconocimientos con normalización robusta"""
        sources = [validation_data.get("datos_validados", {}), main_data]

        for source in sources:
            if isinstance(source, dict) and source.get("reconocimientos"):
                raw_achievements = source["reconocimientos"]

                # Normalizar según el tipo de datos recibido
                if isinstance(raw_achievements, dict):
                    if raw_achievements.get("logros_premios") is not None:
                        normalized_achievements = self._normalize_achievement_list(raw_achievements["logros_premios"])
                        return {"logros_premios": normalized_achievements}
                    else:
                        # Si es un dict pero sin la estructura esperada, convertir todo
                        normalized_achievements = self._normalize_achievement_list(raw_achievements)
                        return {"logros_premios": normalized_achievements}
                else:
                    normalized_achievements = self._normalize_achievement_list(raw_achievements)
                    return {"logros_premios": normalized_achievements}

        return {"logros_premios": []}

    def _normalize_achievement_list(self, achievements: Any) -> List[str]:
        """Convierte cualquier formato de logros a lista de strings"""
        if achievements is None:
            return []

        normalized = []

        if isinstance(achievements, list):
            for achievement in achievements:
                normalized.append(self._normalize_single_item_to_string(achievement))
        elif isinstance(achievements, dict):
            # Extraer valores del dict
            for key, value in achievements.items():
                if isinstance(value, list):
                    normalized.extend(self._normalize_achievement_list(value))
                elif value is not None:
                    normalized.append(self._normalize_single_item_to_string(value))
        elif isinstance(achievements, str):
            normalized.append(achievements)
        elif achievements is not None:
            normalized.append(str(achievements))

        return normalized

    def _normalize_single_item_to_string(self, item: Any) -> str:
        """Convierte cualquier item individual a string descriptivo"""
        if isinstance(item, dict):
            # Si es un objeto estructurado, extraer información clave
            parts = []

            # Buscar campos comunes de nombre/título
            name_fields = ["nombre", "title", "titulo", "name", "curso", "logro", "premio"]
            for field in name_fields:
                if item.get(field):
                    parts.append(str(item[field]))
                    break

            # Buscar información adicional relevante
            if item.get("institucion"):
                parts.append(f"({item['institucion']})")
            if item.get("fecha") or item.get("año"):
                date = item.get("fecha") or item.get("año")
                parts.append(f"[{date}]")
            if item.get("duracion"):
                parts.append(f"- {item['duracion']}")

            # Si no encontramos campos conocidos, usar la representación completa
            if not parts:
                relevant_values = [str(v) for v in item.values() if v is not None and str(v).strip()]
                return " - ".join(relevant_values) if relevant_values else str(item)

            return " ".join(parts)

        elif isinstance(item, str):
            return item
        elif item is not None:
            return str(item)
        else:
            return ""

    def _structure_extracurricular(self, main_data: Dict, validation_data: Dict) -> Dict[str, Any]:
        """Estructura actividades extracurriculares con normalización robusta"""
        sources = [validation_data.get("datos_validados", {}), main_data]

        for source in sources:
            if isinstance(source, dict) and source.get("actividades_extracurriculares"):
                raw_activities = source["actividades_extracurriculares"]

                # Normalizar según el tipo de datos recibido
                if isinstance(raw_activities, dict):
                    if raw_activities.get("voluntariado") is not None:
                        normalized_activities = self._normalize_achievement_list(raw_activities["voluntariado"])
                        return {"voluntariado": normalized_activities}
                    else:
                        normalized_activities = self._normalize_achievement_list(raw_activities)
                        return {"voluntariado": normalized_activities}
                else:
                    normalized_activities = self._normalize_achievement_list(raw_activities)
                    return {"voluntariado": normalized_activities}

        return {"voluntariado": []}

    def _structure_interests(self, main_data: Dict, validation_data: Dict) -> Dict[str, Any]:
        """Estructura intereses con normalización robusta"""
        sources = [validation_data.get("datos_validados", {}), main_data]

        for source in sources:
            if isinstance(source, dict) and source.get("intereses"):
                raw_interests = source["intereses"]

                # Normalizar según el tipo de datos recibido
                if isinstance(raw_interests, dict):
                    if raw_interests.get("hobbies_intereses") is not None:
                        normalized_interests = self._normalize_achievement_list(raw_interests["hobbies_intereses"])
                        return {"hobbies_intereses": normalized_interests}
                    else:
                        normalized_interests = self._normalize_achievement_list(raw_interests)
                        return {"hobbies_intereses": normalized_interests}
                else:
                    normalized_interests = self._normalize_achievement_list(raw_interests)
                    return {"hobbies_intereses": normalized_interests}

        return {"hobbies_intereses": []}

    def _structure_processing_metadata(self, file_metadata: Dict, profile_detection: Dict) -> Dict[str, Any]:
        """Estructura metadatos de procesamiento"""
        return {
            "version_extractor": "1.0",
            "fecha_procesamiento": datetime.now().isoformat(),
            "perfil_detectado": profile_detection.get("profile_type", "unknown"),
            "confianza_deteccion": profile_detection.get("confidence", 0.0),
            "caracteristicas_adicionales": profile_detection.get("additional_traits", []),
            "multiidioma": profile_detection.get("is_multilingual", False),
            "archivo_original": file_metadata.get("filename", "unknown"),
            "tipo_archivo": file_metadata.get("file_type", "unknown"),
            "metadatos_archivo": file_metadata
        }

    def _calculate_general_confidence(self, raw_extractions: Dict, profile_detection: Dict) -> float:
        """Calcula confianza general basada en datos extraídos"""
        confidence_factors = []

        # Factor de detección de perfil
        profile_conf = profile_detection.get("confidence", 0.0)
        confidence_factors.append(profile_conf)

        # Factor de datos principales
        main_data = raw_extractions.get("main_extraction", {})
        if isinstance(main_data, dict):
            main_fields = ["datos_contacto", "experiencia_laboral", "formacion_academica"]
            present_fields = sum(1 for field in main_fields if main_data.get(field))
            confidence_factors.append(present_fields / len(main_fields))

        # Promedio ponderado
        if confidence_factors:
            return round(sum(confidence_factors) / len(confidence_factors), 2)

        return 0.0

    def _collect_warnings(self, raw_extractions: Dict) -> List[str]:
        """Recolecta advertencias de todas las fuentes"""
        warnings = []

        # Advertencias de validación
        validation_data = raw_extractions.get("validation_cleaning", {})
        if isinstance(validation_data, dict):
            val_warnings = validation_data.get("validacion", {}).get("advertencias", [])
            if isinstance(val_warnings, list):
                warnings.extend(val_warnings)

        return warnings

    def _identify_missing_fields(self, main_data: Dict, validation_data: Dict) -> List[str]:
        """Identifica campos faltantes"""
        missing = []

        # Campos faltantes de validación
        if isinstance(validation_data, dict):
            val_missing = validation_data.get("validacion", {}).get("campos_faltantes", [])
            if isinstance(val_missing, list):
                missing.extend(val_missing)

        # Validación básica local
        if not main_data.get("datos_contacto", {}).get("nombre_completo"):
            missing.append("nombre_completo")

        if not main_data.get("experiencia_laboral"):
            missing.append("experiencia_laboral")

        if not main_data.get("formacion_academica"):
            missing.append("formacion_academica")

        return list(set(missing))  # Eliminar duplicados

    def _create_error_fallback(self, file_metadata: Dict, error_msg: str) -> Dict[str, Any]:
        """Crea estructura de fallback en caso de error crítico"""
        return {
            "datos_cv": {
                "datos_contacto": {
                    "nombre_completo": self.default_values["nombre_completo"],
                    "telefono": self.default_values["telefono"],
                    "email": self.default_values["email"],
                    "ubicacion": self.default_values["ubicacion"],
                    "metadata": None
                },
                "titular_profesional": {
                    "titular": self.default_values["titular"],
                    "metadata": None
                },
                "resumen_profesional": {
                    "resumen": self.default_values["resumen"],
                    "metadata": None
                },
                "experiencia_laboral": [],
                "formacion_academica": [],
                "habilidades": {
                    "habilidades_tecnicas": [],
                    "idiomas": [],
                    "habilidades_blandas": [],
                    "metadata": None
                },
                "perfiles_online": None,
                "formacion_complementaria": None,
                "reconocimientos": {"logros_premios": []},
                "actividades_extracurriculares": {"voluntariado": []},
                "intereses": {"hobbies_intereses": []},
                "metadata_procesamiento": {
                    "version_extractor": "1.0",
                    "fecha_procesamiento": datetime.now().isoformat(),
                    "perfil_detectado": "unknown",
                    "confianza_deteccion": 0.0,
                    "caracteristicas_adicionales": [],
                    "multiidioma": False,
                    "archivo_original": file_metadata.get("filename", "unknown"),
                    "tipo_archivo": file_metadata.get("file_type", "unknown"),
                    "metadatos_archivo": file_metadata
                }
            },
            "confianza_general": 0.0,
            "advertencias": [f"Error crítico en estructuración: {error_msg}"],
            "campos_faltantes": ["nombre_completo", "experiencia_laboral", "formacion_academica"],
            "tiempo_procesamiento": 0,
            "timestamp": datetime.now().isoformat()
        }