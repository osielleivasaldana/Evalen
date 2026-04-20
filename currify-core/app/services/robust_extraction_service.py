"""
SERVICIO DE EXTRACCIÓN ROBUSTO - SOLUCIÓN DEFINITIVA
Arquitectura moderna con técnicas de prompting avanzadas y validación robusta
"""

import asyncio
import json
import logging
import time
from typing import Dict, List, Optional, Any, Union
from datetime import datetime

from app.services.llm_service import LLMService
from app.models.resume import ResumeData, ResumeExtractionRequest, ResumeExtractionResponse, ThinkingResumeData
from app.services.profile_detection_service import ProfileDetectionService

logger = logging.getLogger(__name__)

class RobustExtractionService:
    """
    Servicio de extracción robusto con arquitectura moderna
    Basado en técnicas de prompting comprobadas y validación exhaustiva
    """

    def __init__(self, llm_service: LLMService):
        self.llm_service = llm_service
        self.profile_detector = ProfileDetectionService()

        # Configuración robusta
        self.max_retries = 3
        self.validation_threshold = 0.3  # Reducido de 0.7 a 0.3 para ser más tolerante

        # Configuración de texto
        self.max_text_length = 4000  # Caracteres máximos para procesamiento directo
        self.chunk_overlap = 600     # Solapamiento aumentado para mejor contexto (antes 200)

    async def extract_from_text(self, request: ResumeExtractionRequest) -> ResumeExtractionResponse:
        """
        Extracción robusta con múltiples validaciones y reintentos
        """
        start_time = time.time()

        try:
            logger.info(f"🚀 INICIANDO EXTRACCIÓN ROBUSTA para {request.nombre_archivo}")

            # 1. Pre-procesamiento y análisis
            cv_text = self._preprocess_text(request.archivo_contenido)
            profile_info = self.profile_detector.detect_profile_type(cv_text)

            logger.info(f"📊 Longitud de texto: {len(cv_text)} caracteres")

            # 2. Decidir estrategia de extracción basada en longitud
            if len(cv_text) <= self.max_text_length:
                logger.info(f"✅ Texto corto ({len(cv_text)} ≤ {self.max_text_length}): Extracción directa")
                extraction_result = await self._execute_robust_extraction(cv_text, profile_info)
            else:
                logger.info(f"📄 Texto largo ({len(cv_text)} > {self.max_text_length}): Extracción chunked")
                extraction_result = await self._execute_chunked_extraction(cv_text, profile_info)

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
            return self._create_error_response(str(e), processing_time)

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

    async def _execute_robust_extraction(self, cv_text: str, profile_info: Dict) -> Dict[str, Any]:
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
                stage_name="structured_extraction_main"
            )

            if result:
                logger.info("✅ Extracción estructurada exitosa con CoT")
                logger.info(f"🧠 Thinking Process: {result.thinking_process[:200]}...")
                return result.extraction.model_dump()
            
            logger.warning("⚠️ Falló la extracción estructurada, intentando fallback JSON...")
            
            # 2. Intentar fallback JSON (Extracción Flexible)
            return await self._execute_fallback_extraction(cv_text, prompt)

        except Exception as e:
            logger.error(f"❌ Error en extracción estructurada: {e}")
            logger.info("⚠️ Intentando fallback JSON tras error...")
            try:
                return await self._execute_fallback_extraction(cv_text, prompt)
            except Exception as e2:
                logger.error(f"❌ Falló también el fallback JSON: {e2}")
                return self._create_empty_extraction()

    async def _execute_fallback_extraction(self, cv_text: str, prompt: str) -> Dict[str, Any]:
        """
        Estrategia de respaldo usando modo JSON estándar y mapeo manual
        """
        logger.info("🔄 Ejecutando extracción fallback (JSON laxo)")
        
        # Usar el modo JSON estándar del servicio LLM
        json_result = await self.llm_service.call_agent(
            prompt=prompt + "\n\nIMPORTANTE: Devuelve JSON válido. Si no estás seguro de un campo, usa null.",
            input_data=cv_text,
            stage_name="fallback_json_extraction",
            temperature=0.1
        )
        
        if json_result:
             data_to_map = None
             
             if isinstance(json_result, dict):
                 data_to_map = json_result
             elif isinstance(json_result, list):
                 if len(json_result) == 1 and isinstance(json_result[0], dict):
                     logger.info("⚠️ Fallback devolvió lista unitem, desempaquetando...")
                     data_to_map = json_result[0]
                 elif len(json_result) > 0 and isinstance(json_result[0], dict):
                     # Heuristic: If detailed list, assume it's main content but missing wrapper.
                     # However, mapping arbitrary lists to ResumeData is risky without context.
                     # Let's try to detect if it's a list of experiences or education?
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
        return self._create_empty_extraction()

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
        """
        Prompt optimizado para Structured Outputs
        """
        return """
<system_role>
Eres un experto analista de currículums y reclutador senior. 
Tu objetivo es transformar documentos de CV (que pueden ser desordenados) en datos estructurados JSON de alta precisión.
</system_role>

<instructions>
1. **Análisis Profundo:** Antes de extraer, analiza el documento para entender su estructura, idioma y matices.
2. **Exhaustividad:** Extrae TODO el historial laboral y educativo. No omitas nada por parecer "antiguo". NO mezcles instituciones ni títulos. Si dice "Título de Contador" y abajo "Universidad Diego Portales", mantén el nombre exacto del título.
3. **Inferencia Inteligente:** Si falta la ciudad, infiérela de la empresa/universidad. Si falta el año de fin y dice "Actualidad", usa "Presente".
4. **Resumen Profesional:** Busca cualquier párrafo introductorio bajo títulos como "Perfil", "Resumen", "Descripción Profesional" o "Sobre mí" y extráelo completo en `resumen_profesional.resumen`.
5. **Normalización:** Fechas a YYYY-MM. 
6. **Búsqueda de Contacto Extrema:** Busca exhaustivamente en márgenes, encabezados y pies de página por correos electrónicos y teléfonos, aun si el recuadro que los contiene parece "roto" o con espacios (ej. +56 9 1 2 3).
</instructions>

<critical_rules>
- **Titular vs Cargo:** "Titular Profesional" es quién es la persona (ej: Ingeniero Civil). "Cargo" es qué puesto ocupó (ej: Jefe de Obra).
- **Habilidades Estructuradas:** El campo 'habilidades' NO es un string. Es un objeto con 'habilidades_tecnicas', 'idiomas', 'habilidades_blandas'.
- **Sanitización:** Nunca devuelvas valores como "N/A", "Unknown". Usa null o listas vacías. IMPORTANTE: Para campos de tipo string como 'email', 'telefono' o 'ubicacion', NUNCA devuelvas arreglos vacíos `[]`. Si la información no existe, debes devolver explícitamente `null`.
</critical_rules>

<output_schema>
El output final debe corresponder exactamente al modelo ResumeData.
</output_schema>
"""


    def _customize_prompt_for_attempt(self, base_prompt: str, attempt: int, profile_info: Dict) -> str:
        """
        Personaliza el prompt según el intento y perfil
        """
        if attempt == 0:
            # Primer intento: prompt base
            return base_prompt
        elif attempt == 1:
            # Segundo intento: enfoque en experiencia
            return base_prompt + "\n\nENFOQUE ESPECIAL: Presta atención extra a la experiencia laboral y fechas."
        else:
            # Tercer intento: enfoque en formación
            return base_prompt + "\n\nENFOQUE ESPECIAL: Verifica cuidadosamente la clasificación de formación académica vs complementaria."

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
        """
        Post-procesamiento inteligente de fechas
        """
        # Procesar experiencia laboral
        if data.get("experiencia_laboral") and isinstance(data["experiencia_laboral"], list):
            for exp in data["experiencia_laboral"]:
                if isinstance(exp, dict) and exp.get("periodo"):
                    exp["periodo"] = self._normalize_period(exp["periodo"])

        # Procesar formación académica
        if data.get("formacion_academica") and isinstance(data["formacion_academica"], list):
            for edu in data["formacion_academica"]:
                if isinstance(edu, dict) and edu.get("periodo"):
                    edu["periodo"] = self._normalize_period(edu["periodo"])

        return data

    def _normalize_period(self, period: Any) -> Dict[str, Any]:
        """
        Normalización robusta de períodos
        """
        p = {}
        if isinstance(period, dict):
            p = {
                "fecha_inicio": period.get("fecha_inicio"),
                "fecha_fin": period.get("fecha_fin"),
                "texto_original": period.get("texto_original", "No especificado")
            }
        elif isinstance(period, str):
            # Parsing inteligente de fechas
            p = self._parse_period_string(period)
        else:
            p = {
                "fecha_inicio": None,
                "fecha_fin": None,
                "texto_original": str(period) if period else "No especificado"
            }
            
        # Clean NaN/Null strings from initial extraction
        # Normalize to lower case for comparison but keep original strict check
        bad_values = ["nan", "none", "null", "nat", "no especificado", "", "unknown", "n/a", "no extraído"]
        
        for k in ["fecha_inicio", "fecha_fin"]:
            val = str(p.get(k, "")).lower().strip()
            if val in bad_values:
                p[k] = None
        
        # DEFINITIVE 'ACTUALIDAD' LIST
        current_synonyms = [
            "presente", "actualidad", "actual", "current", "now", "hoy", 
            "vigente", "curso", "continuo", "ongoing", "present", "date"
        ]

        # AGGRESSIVE RECOVERY & CORRECTION:
        # If we have texto_original, we TRUST regex parsing over LLM inference.
        # LLM often drops months (YYYY) or hallucinates years.
        # Regex is strict and grounded in the actual text chunk.
        
        if p.get("texto_original") and str(p["texto_original"]).lower() not in bad_values:
            parsed = self._parse_period_string(p["texto_original"])
            
            # 1. Start Date Correction
            # If regex successfully found a start date (e.g., "2024-01" or "2024"), use it.
            if parsed.get("fecha_inicio"):
                # Prefer parsed value (likely YYYY-MM) over likely LLM YYYY
                p["fecha_inicio"] = parsed["fecha_inicio"]

            # 2. End Date Correction
            if parsed.get("fecha_fin"):
                p["fecha_fin"] = parsed["fecha_fin"]
            
            # 3. Handle 'Actualidad' Logic explicitly again just in case regex missed it keying off specific words
            # (Though _parse_period_string handles this now)
            raw_text = str(p["texto_original"]).lower()
            if any(syn in raw_text for syn in current_synonyms):
                 p["fecha_fin"] = "Presente"
        
        # Final safety cleanup for 'Presente' normalization
        if p.get("fecha_fin") and str(p["fecha_fin"]).lower() in current_synonyms:
             p["fecha_fin"] = "Presente"
             
        return p

    def _parse_period_string(self, period_str: str) -> Dict[str, Any]:
        """
        Parsing inteligente de strings de período
        """
        if not period_str or str(period_str).lower() in ['nan', 'none', 'null']:
            return {"fecha_inicio": None, "fecha_fin": None, "texto_original": "No especificado"}
            
        import re

        months = {
            "enero": "01", "febrero": "02", "marzo": "03", "abril": "04",
            "mayo": "05", "junio": "06", "julio": "07", "agosto": "08",
            "septiembre": "09", "octubre": "10", "noviembre": "11", "diciembre": "12",
            "jan": "01", "feb": "02", "mar": "03", "apr": "04", "may": "05", "jun": "06",
            "jul": "07", "aug": "08", "sep": "09", "oct": "10", "nov": "11", "dec": "12"
        }

        fecha_inicio = None
        fecha_fin = None

        # Patrón Normal: "Enero 2018 - Julio 2019"
        # Patrón con texto extra: "Kibernum S.A. (Enero 2024 - Actualidad)"
        
        # 1. Limpiar strings envolventes
        period_str_clean = period_str.replace('(', '').replace(')', '').strip()
        
        # 2. Buscar patrón principal (Mes Año - Mes Año) o (Mes Año - Texto)
        # Regex explanation:
        # Group 1 (Start Month): ([A-Za-z]+)
        # Group 2 (Start Year): (\d{4})
        # Separator: \s*[-–]\s*
        # Group 3 (End): ([A-Za-z]+|\d{4}) -> Can be Month OR 'Actualidad'
        # Group 4 (End Year - Optional): (\d{4})?
        
        match = re.search(r'([A-Za-z]+)\s+(\d{4})\s*[-–]\s*([A-Za-z0-9]+)(?:\s+(\d{4}))?', period_str_clean, re.IGNORECASE)
        
        if match:
            start_month, start_year, end_part1, end_year = match.groups()
            
            # Parse Start Date
            if start_month.lower() in months:
                fecha_inicio = f"{start_year}-{months[start_month.lower()]}"
                
            # Parse End Date
            is_current = any(syn in end_part1.lower() for syn in ["presente", "actualidad", "actual", "current", "hoy", "vigente"])
            
            if is_current:
                fecha_fin = "Presente"
            elif end_part1.lower() in months and end_year:
                fecha_fin = f"{end_year}-{months[end_part1.lower()]}"
            elif end_part1.isdigit() and len(end_part1) == 4:
                 # Case: 2020 - 2021 (without months?)
                 pass 
        
        # fallback for "2020 - 2021" simple format
        if not fecha_inicio:
             match_years = re.search(r'(\d{4})\s*[-–]\s*(\d{4}|Presente|Actualidad)', period_str_clean, re.IGNORECASE)
             if match_years:
                 s_year, e_part = match_years.groups()
                 fecha_inicio = f"{s_year}-01"
                 if e_part.lower() in ["presente", "actualidad"]:
                     fecha_fin = "Presente"
                 else:
                     fecha_fin = f"{e_part}-12"


        # Patrón: "Enero 2018 - Presente"
        if not fecha_inicio:
            match = re.search(r'(\w+)\s+(\d{4})\s*[-–]\s*(Presente|Actualidad|Actual|Current|Now)', period_str, re.IGNORECASE)
            if match:
                start_month, start_year = match.groups()[:2]
                if start_month.lower() in months:
                    fecha_inicio = f"{start_year}-{months[start_month.lower()]}"
                    fecha_fin = "Presente"

        # Patrón: "2016 - 2019"
        if not fecha_inicio:
            match = re.search(r'(\d{4})\s*[-–]\s*(\d{4})', period_str)
            if match:
                fecha_inicio, fecha_fin = match.groups()

        return {
            "fecha_inicio": fecha_inicio,
            "fecha_fin": fecha_fin,
            "texto_original": period_str
        }

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
        try:
            logger.info(f"🔧 Intentando crear ResumeData con datos: {list(structured_data.keys())}")
            logger.info(f"🔧 Titular en structured_data: {structured_data.get('titular_profesional')}")
            logger.info(f"🔧 Email en structured_data: {structured_data.get('datos_contacto', {}).get('email')}")

            resume_data = ResumeData(**structured_data)
            logger.info(f"🔧 ✅ ResumeData creado exitosamente!")
            logger.info(f"🔧 ✅ Titular final: {resume_data.titular_profesional.titular}")
            logger.info(f"🔧 ✅ Email final: {resume_data.datos_contacto.email}")
            return resume_data

        except Exception as e:
            logger.error(f"Error validando con Pydantic: {e}")
            logger.error(f"🔧 Datos que causaron error: {structured_data}")
            logger.info("🔧 Intentando reparar datos antes de fallar...")

            # Intentar reparar datos faltantes
            fixed_data = self._fix_missing_required_fields(structured_data, cv_text)

            try:
                logger.info("🔧 Probando con datos reparados...")
                logger.info(f"🔧 Titular en datos reparados: {fixed_data.get('titular_profesional')}")
                resume_data_fixed = ResumeData(**fixed_data)
                logger.info(f"🔧 ✅ ResumeData reparado exitosamente!")
                logger.info(f"🔧 ✅ Titular final reparado: {resume_data_fixed.titular_profesional.titular}")
                return resume_data_fixed
            except Exception as e2:
                logger.error(f"Error después de reparar datos: {e2}")
                logger.error(f"🔧 Datos reparados que causaron error: {fixed_data}")
                # Como último recurso, crear estructura mínima válida
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
            if 'telefono' not in dc: dc['telefono'] = None
            if not dc.get('email'): dc['email'] = 'no-extraido@example.com'
            if 'ubicacion' not in dc: dc['ubicacion'] = None

        # --- MEJORA: Regex Fallback para Email y Teléfono ---
        if cv_text and isinstance(fixed_data.get('datos_contacto'), dict):
            dc = fixed_data['datos_contacto']
            texto_limpio = cv_text.strip()
            
            # 1. Fallback Email
            if not dc.get('email') or 'no-extraido' in dc.get('email', '').lower():
                # Buscar posibles correos en todo el texto
                match_email = re.search(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b', texto_limpio)
                if match_email:
                    encontrado = match_email.group(0)
                    logger.info(f"🔧 [REGEX Fallback] Email recuperado del texto: {encontrado}")
                    dc['email'] = encontrado

            # 2. Fallback Teléfono
            if not dc.get('telefono'):
                # Busca celulares típicos: (+569) 1234 5678, +56 9 1234 5678, 912345678
                match_phone = re.search(r'(\+?56\s*9\s*\d{4}\s*\d{4}|\+?56\s*9\d{8}|(?<!\d)9\s*\d{4}\s*\d{4}(?!\d))', texto_limpio)
                if match_phone:
                    encontrado = match_phone.group(0)
                    logger.info(f"🔧 [REGEX Fallback] Teléfono recuperado del texto: {encontrado}")
                    dc['telefono'] = encontrado

        # Asegurar titular_profesional
        if ('titular_profesional' not in fixed_data or
            not fixed_data['titular_profesional'] or
            not fixed_data['titular_profesional'].get('titular') or
            fixed_data['titular_profesional'].get('titular') == 'No extraído'):
            
            logger.info("🔧 Reparando titular_profesional faltante o vacío")
            logger.info(f"🔧 Estado actual titular_profesional: {fixed_data.get('titular_profesional', 'No existe')}")

            titular_extraido = 'No extraído'
            
            # 1. Intentar extraer de las primeras líneas del texto original PRIMERO
            if cv_text:
                titular_extraido_texto = self._extract_titular_from_text(cv_text)
                if titular_extraido_texto != 'No extraído':
                    logger.info(f"🔧 Titular extraído del texto en fallback: '{titular_extraido_texto}'")
                    titular_extraido = titular_extraido_texto
            
            # 2. Fallback semántico: Tratar de extraer el cargo más reciente (el que esté en "Presente" o el primero de la lista) SOLO si falló lo anterior
            if titular_extraido == 'No extraído':
                experiencias = fixed_data.get("experiencia_laboral", [])
                cargo_reciente = None
                if experiencias and isinstance(experiencias, list) and len(experiencias) > 0:
                    first_exp = experiencias[0]
                    if isinstance(first_exp, dict) and first_exp.get("cargo"):
                        cargo_reciente = str(first_exp["cargo"])
                        logger.info(f"🔧 [Semantic Fallback] Titular_profesional inferido desde la experiencia más reciente: {cargo_reciente}")
                        titular_extraido = cargo_reciente

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

        # Asegurar habilidades
        if 'habilidades' not in fixed_data or not fixed_data['habilidades']:
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

    def _create_minimal_valid_response(self) -> ResumeData:
        """
        Crear respuesta mínima válida
        """
        from app.models.resume import ContactInfo, ProfessionalTitle, ProfessionalSummary, Skills

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
            habilidades=Skills()
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

    def _create_empty_extraction(self) -> Dict[str, Any]:
        """
        Crear extracción vacía
        """
        return self._create_empty_structure()

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

    def _create_error_response(self, error_msg: str, processing_time: float) -> ResumeExtractionResponse:
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
        """Helper para extraer titular simple del texto"""
        lines = text.split('\n')
        for line in lines[:20]: # Buscar en las primeras líneas
            line = line.strip()
            if len(line) > 5 and len(line) < 100:
                # Heurística simple: líneas cortas al principio suelen ser el nombre o el titular
                return line
        return "No extraído"

    def _create_emergency_response(self, partial_data: Dict, cv_text: str) -> Optional[ResumeData]:
        """Intentar recuperar datos en caso de emergencia"""
        # Implementación simple de recuperación
        return self._create_validated_response(partial_data, cv_text)

    # -------------------------------------------------------------------------
    # ESTRATEGIA CHUNKED (Para textos largos)
    # -------------------------------------------------------------------------

    async def _execute_chunked_extraction(self, cv_text: str, profile_info: Dict) -> Dict[str, Any]:
        """
        Estrategia para CVs muy largos que exceden el contexto
        """
        logger.info("🔪 Ejecutando extracción por chunks")
        
        chunks = self._create_intelligent_chunks(cv_text)
        logger.info(f"🔪 Texto dividido en {len(chunks)} chunks")
        
        chunk_results = []
        
        for i, chunk in enumerate(chunks):
            logger.info(f"🔪 Procesando chunk {i+1}/{len(chunks)}")
            
            prompt = f"""
<system_role>
Estás analizando el FRAGMENTO {i+1} de {len(chunks)} de un currículum extenso.
</system_role>

<instructions>
1. Extrae únicamente la información presente en este fragmento.
2. Si una sección está cortada (ej: empieza en el anterior), extrae lo que veas aquí.
3. Mantén la estructura JSON exacta de ChunkResumeData.
4. IMPORTANTE: Si en este fragmento logras identificar el título profesional principal del candidato, extráelo en `titular_profesional`.
5. IMPORTANTE: Para la experiencia laboral, desglosa las descripciones de los cargos en viñetas dentro del arreglo `responsabilidades`. NO debes devolver un párrafo de texto largo en el campo `descripcion`.
</instructions>

<context_hint>
Este fragmento tiene un solapamiento de 600 caracteres con el anterior para asegurar continuidad.
Evita duplicar si es redundante, pero ante la duda, EXTRAE.
</context_hint>

{self._create_robust_extraction_prompt()}
"""
            
            try:
                # 1. Intentar Instructor
                from app.models.resume import PartialResumeData
                result = await self.llm_service.call_agent_structured(
                    prompt=prompt,
                    input_data=chunk,
                    response_model=PartialResumeData,
                    stage_name=f"chunk_{i+1}"
                )
                if result:
                    chunk_results.append(result.model_dump())
                    continue
                
                # 2. Fallback JSON local para el chunk
                logger.warning(f"⚠️ Chunk {i+1}: Falló estructurado, intentando fallback JSON...")
                json_result = await self._execute_fallback_extraction(chunk, prompt)
                if json_result:
                    chunk_results.append(json_result)
                    
            except Exception as e:
                logger.error(f"❌ Error procesando chunk {i+1}: {e}")
                # Último intento con fallback
                try:
                    json_result = await self._execute_fallback_extraction(chunk, prompt)
                    if json_result:
                        chunk_results.append(json_result)
                except:
                    pass
                
        if not chunk_results:
            return self._create_empty_extraction()
            
        # Fusionar resultados
        merged = self._merge_chunk_results(chunk_results)
        return await self._reduce_experiences_with_llm(merged)

    async def _reduce_experiences_with_llm(self, merged_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Usa el LLM para deduplicar inteligentemente y unificar las experiencias
        y formaciones que pudieron quedar divididas entre chunks.
        """
        exps = merged_data.get("experiencia_laboral", [])
        edus = merged_data.get("formacion_academica", [])
        
        if not exps and not edus:
            return merged_data
            
        import json
        data_to_reduce = {}
        if exps: data_to_reduce["experiencia_laboral"] = exps
        if edus: data_to_reduce["formacion_academica"] = edus
        
        prompt = """
<system_role>
Eres un experto en integración de datos (Data Reducer). Tu tarea es fusionar fragmentos redundantes.
</system_role>

<instructions>
Se te entregarán listas de 'experiencia_laboral' y 'formacion_academica' recopiladas al fragmentar un CV largo.
Al particionar el CV, un mismo rol o escuela pudo dividirse en dos entradas (ej: la empresa en la entidad 1, y parte de la descripción en la entidad 2; o el mismo rol aparece dos veces).
Tu tarea es DE-DUPLICAR y FUSIONAR la información.
1. NO inventes ni resumas datos. Combina la información (ej. fusionando bullet points de responsabilidades) si pertenecen genuinamente a la misma empresa/institución y cargo.
2. Mantén la estructura rígida de arrays JSON que recibirás.
3. Si algo está duplicado exactamente, elimina el duplicado.
4. Devuelve el JSON con las mismas llaves provistas ('experiencia_laboral', 'formacion_academica'), pero unificado limpiamente.
</instructions>
"""
        try:
            logger.info("🔪 Iniciando LLM Reducer para limpiar duplicados de chunks...")
            result = await self.llm_service.call_agent(
                prompt=prompt,
                input_data=json.dumps(data_to_reduce, ensure_ascii=False),
                stage_name="chunk_reduce",
                temperature=0.0
            )
            
            if result:
                parsed = None
                if isinstance(result, str):
                    parsed = self.llm_service._extract_json_from_response(result, stage="chunk_reduce")
                elif isinstance(result, dict):
                    parsed = result
                    
                if parsed and isinstance(parsed, dict):
                    if "experiencia_laboral" in parsed and isinstance(parsed["experiencia_laboral"], list):
                        merged_data["experiencia_laboral"] = parsed["experiencia_laboral"]
                    if "formacion_academica" in parsed and isinstance(parsed["formacion_academica"], list):
                        merged_data["formacion_academica"] = parsed["formacion_academica"]
                    logger.info(f"✅ Reducción LLM exitosa: {len(parsed.get('experiencia_laboral', []))} experiencias, {len(parsed.get('formacion_academica', []))} educaciones resultantes.")

        except Exception as e:
            logger.error(f"❌ Error en Reducción LLM (fallback a heurística base): {e}")
            
        return merged_data

    def _create_intelligent_chunks(self, text: str) -> List[str]:
        """
        Dividir texto en chunks respetando saltos de línea y contexto
        """
        chunks = []
        lines = text.split('\n')
        current_chunk = []
        current_len = 0
        
        for line in lines:
            line_len = len(line) + 1 # +1 por newline
            
            if current_len + line_len > self.max_text_length:
                # Chunk lleno, guardar y empezar nuevo con overlap
                chunks.append('\n'.join(current_chunk))
                # Mantener últimas lineas para overlap context
                overlap_size = 0
                overlap_lines = []
                for prev_line in reversed(current_chunk):
                    if overlap_size + len(prev_line) < self.chunk_overlap:
                        overlap_lines.insert(0, prev_line)
                        overlap_size += len(prev_line)
                    else:
                        break
                
                current_chunk = overlap_lines
                current_len = overlap_size
            
            current_chunk.append(line)
            current_len += line_len
            
        if current_chunk:
            chunks.append('\n'.join(current_chunk))
            
        return chunks

    def _merge_chunk_results(self, results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Fusionar inteligentemente los resultados de múltiples chunks
        """
        logger.info("🔄 Fusionando resultados de chunks...")
        merged = results[0].copy()
        
        for i in range(1, len(results)):
            current = results[i]
            
            # Fusionar titular_profesional si el actual está vacío
            merged_titular_obj = merged.get("titular_profesional")
            merged_titular = merged_titular_obj.get("titular", "") if isinstance(merged_titular_obj, dict) else str(merged_titular_obj or "")
            if not merged_titular or merged_titular == "No extraído" or merged_titular == "None":
                curr_titular_obj = current.get("titular_profesional")
                curr_titular = curr_titular_obj.get("titular", "") if isinstance(curr_titular_obj, dict) else str(curr_titular_obj or "")
                if curr_titular and curr_titular != "No extraído" and curr_titular != "None":
                    merged["titular_profesional"] = current["titular_profesional"]

            # Fusionar resumen_profesional si el actual está vacío
            merged_resumen_obj = merged.get("resumen_profesional")
            merged_resumen = merged_resumen_obj.get("resumen", "") if isinstance(merged_resumen_obj, dict) else str(merged_resumen_obj or "")
            if not merged_resumen or merged_resumen == "No extraído" or merged_resumen == "None":
                curr_resumen_obj = current.get("resumen_profesional")
                curr_resumen = curr_resumen_obj.get("resumen", "") if isinstance(curr_resumen_obj, dict) else str(curr_resumen_obj or "")
                if curr_resumen and curr_resumen != "No extraído" and curr_resumen != "None":
                    merged["resumen_profesional"] = current["resumen_profesional"]

            # Fusionar experiencia laboral con deduplicación/combinación al vuelo
            if current.get("experiencia_laboral"):
                merged_exp_list = merged.get("experiencia_laboral", [])
                for curr_exp in current["experiencia_laboral"]:
                    curr_empresa = (curr_exp.get("empresa") or "").strip().lower()
                    curr_cargo = (curr_exp.get("cargo") or "").strip().lower()
                    
                    found_match = False
                    # Only try to merge if we actually have fields to match on
                    if curr_empresa and curr_cargo:
                        for existing_exp in merged_exp_list:
                            existing_empresa = (existing_exp.get("empresa") or "").strip().lower()
                            existing_cargo = (existing_exp.get("cargo") or "").strip().lower()
                            
                            # Si empresa y cargo coinciden (ignorando mayúsculas/espacios), combinamos
                            if curr_empresa == existing_empresa and curr_cargo == existing_cargo:
                                found_match = True
                                
                                # Combine responsabilidades
                                existing_resp = existing_exp.get("responsabilidades", [])
                                if not isinstance(existing_resp, list):
                                    existing_resp = [existing_resp] if existing_resp else []
                                    
                                curr_resp = curr_exp.get("responsabilidades", [])
                                if not isinstance(curr_resp, list):
                                    # Might be a description string, just append it
                                    curr_resp = [curr_resp] if curr_resp else []

                                for r in curr_resp:
                                    if r not in existing_resp:
                                        existing_resp.append(r)
                                existing_exp["responsabilidades"] = existing_resp

                                # Fallback: Combine descriptions if present and responsibilities are missing
                                existing_desc = existing_exp.get("descripcion")
                                curr_desc = curr_exp.get("descripcion")
                                if curr_desc and not existing_desc:
                                    existing_exp["descripcion"] = curr_desc

                                # Merge Period if one is missing data
                                existing_period = existing_exp.get("periodo", {})
                                curr_period = curr_exp.get("periodo", {})
                                if isinstance(existing_period, dict) and isinstance(curr_period, dict):
                                    if not existing_period.get("fecha_inicio") and curr_period.get("fecha_inicio"):
                                        existing_period["fecha_inicio"] = curr_period["fecha_inicio"]
                                    if not existing_period.get("fecha_fin") and curr_period.get("fecha_fin"):
                                        existing_period["fecha_fin"] = curr_period["fecha_fin"]
                                    if not existing_period.get("texto_original") and curr_period.get("texto_original"):
                                        existing_period["texto_original"] = curr_period["texto_original"]
                                    
                                break

                    if not found_match:
                        merged_exp_list.append(curr_exp)
                
                merged["experiencia_laboral"] = merged_exp_list
                
            # Fusionar formación (concatenar, ya existe un paso de deduplicación después)
            if current.get("formacion_academica"):
                merged.setdefault("formacion_academica", []).extend(current["formacion_academica"])
                
            # Fusionar habilidades (unir sets)
            if current.get("habilidades"):
                # Técnicas - Deduplicación manual por nombre
                curr_tech = current["habilidades"].get("habilidades_tecnicas", [])
                merged_tech = merged["habilidades"].get("habilidades_tecnicas", [])
                
                # Crear set de nombres existentes para búsqueda rápida
                existing_names = set()
                for skill in merged_tech:
                    if isinstance(skill, dict):
                        existing_names.add(str(skill.get("skill", "")).lower())
                    elif isinstance(skill, str):
                        existing_names.add(skill.lower())
                
                # Agregar skills nuevas si no existen
                for skill in curr_tech:
                    skill_name = ""
                    if isinstance(skill, dict):
                        skill_name = str(skill.get("skill", "")).lower()
                    elif isinstance(skill, str):
                        skill_name = skill.lower()
                        
                    if skill_name and skill_name not in existing_names:
                        merged_tech.append(skill)
                        existing_names.add(skill_name)
                        
                merged["habilidades"]["habilidades_tecnicas"] = merged_tech
                
                # Idiomas - Deduplicación manual por nombre
                curr_lang = current["habilidades"].get("idiomas", [])
                merged_lang = merged["habilidades"].get("idiomas", [])
                
                existing_langs = set()
                for lang in merged_lang:
                    if isinstance(lang, dict):
                        existing_langs.add(str(lang.get("idioma", "")).lower())
                    elif isinstance(lang, str):
                        existing_langs.add(lang.lower())
                        
                for lang in curr_lang:
                    lang_name = ""
                    if isinstance(lang, dict):
                        lang_name = str(lang.get("idioma", "")).lower()
                    elif isinstance(lang, str):
                        lang_name = lang.lower()
                        
                    if lang_name and lang_name not in existing_langs:
                        merged_lang.append(lang)
                        existing_langs.add(lang_name)
                        
                merged["habilidades"]["idiomas"] = merged_lang
            
            # Actualizar contacto si el chunk actual tiene más info
            curr_contact = current.get("datos_contacto", {})
            if curr_contact:
                merged_contact = merged.setdefault("datos_contacto", {})
                for field in ["nombre_completo", "email", "telefono", "ubicacion", "linkedin"]:
                    curr_val = curr_contact.get(field)
                    if curr_val and "no-extraido" not in str(curr_val).lower() and "no extraído" not in str(curr_val).lower():
                        if not merged_contact.get(field) or "no-extraido" in str(merged_contact.get(field)).lower() or "no extraído" in str(merged_contact.get(field)).lower():
                            merged_contact[field] = curr_val
                    
        return merged
        """
        Crear estructura vacía válida
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
            },
            "formacion_complementaria": {"certificaciones_cursos": []},
            "reconocimientos": {"logros_premios": []}
        }

    def _create_error_response(self, error_msg: str, processing_time: float) -> ResumeExtractionResponse:
        """
        Crear respuesta de error
        """
        return ResumeExtractionResponse(
            datos_cv=self._create_minimal_valid_response(),
            confianza_general=0.0,
            advertencias=[f"Error en procesamiento: {error_msg}"],
            campos_faltantes=["todos"],
            tiempo_procesamiento=processing_time,
            timestamp=datetime.now().isoformat()
        )

    async def extract_from_file(self, file_content: bytes, filename: str,
                               config: Optional[Dict[str, Any]] = None) -> ResumeExtractionResponse:
        """
        Extrae datos estructurados de un archivo de CV usando el servicio robusto

        Args:
            file_content: Contenido del archivo en bytes
            filename: Nombre del archivo
            config: Configuraciones opcionales de extracción

        Returns:
            ResumeExtractionResponse con datos estructurados
        """
        try:
            # Importar parser de archivos
            from app.services.file_parser_service import FileParserService

            # Crear parser
            file_parser = FileParserService()

            # Validar archivo (puede ser síncrono o asíncrono dependiendo de la implementación)
            validation_result = file_parser.validate_file(file_content, filename)
            if asyncio.iscoroutine(validation_result):
                 validation_result = await validation_result

            if not validation_result["is_valid"]:
                raise ValueError(f"Archivo inválido: {', '.join(validation_result['issues'])}")

            # Extraer texto del archivo (ES ASÍNCRONO)
            parse_result = await file_parser.parse_file(file_content, filename)
            
            # Defensa contra retorno de corutina inesperada
            if asyncio.iscoroutine(parse_result):
                logger.warning("⚠️ parse_result returned a coroutine despite await. Double awaiting...")
                parse_result = await parse_result

            if not parse_result["success"]:
                raise ValueError(f"Error al procesar archivo: {parse_result['error']}")

            extracted_text = parse_result["text"]
            if not extracted_text.strip():
                raise ValueError("No se pudo extraer texto del archivo")

            # Obtener tipo de archivo
            file_extension = filename.split('.')[-1].lower() if '.' in filename else 'txt'

            # Crear request para extracción robusta
            request = ResumeExtractionRequest(
                nombre_archivo=filename,
                tipo_archivo=file_extension,
                archivo_contenido=extracted_text,
                config=config or {}
            )

            # Usar extracción robusta
            return await self.extract_from_text(request)

        except Exception as e:
            logger.error(f"Error en extract_from_file: {e}")
            return self._create_error_response(str(e), 0.0)

    def _extract_titular_from_text(self, cv_text: str) -> str:
        """
        Extraer titular profesional del texto usando patrones específicos
        """
        import re

        lines = cv_text.strip().split('\n')

        # Buscar titular después del nombre (estructura típica de CV)
        # Nombre completo generalmente está en la primera línea
        # Titular en la segunda línea o cerca del inicio

        for i, line in enumerate(lines[:10]):  # Solo revisar primeras 10 líneas
            line = line.strip()

            # Patrones para identificar titular profesional
            titular_patterns = [
                r'^([A-Za-zÁÉÍÓÚáéíóúñÑ\s]+(?:Ingenier[oa]|Developer|Analista|Consultor|Arquitecto|Especialista|Técnico|Programador|Administrador|Coordinador|Jefe|Director|Gerente|Líder)[A-Za-zÁÉÍÓÚáéíóúñÑ\s]*)$',
                r'^(Ingenier[oa].*?)$',
                r'^(Developer.*?)$',
                r'^(Analista.*?)$',
                r'^(Consultor.*?)$',
                r'^(Arquitecto.*?)$',
                r'^(Especialista.*?)$',
                r'^(Técnico.*?)$',
                r'^(Programador.*?)$',
                r'^(Administrador.*?)$'
            ]

            # Si la línea parece ser un nombre (tiene mayúsculas y espacios), saltar
            if i == 0 and re.match(r'^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+', line):
                continue

            # Verificar si la línea actual coincide con algún patrón de titular
            for pattern in titular_patterns:
                match = re.match(pattern, line, re.IGNORECASE)
                if match:
                    titular = match.group(1).strip()
                    # Verificar que no sea demasiado largo (probablemente no es un titular)
                    if len(titular) < 100 and titular:
                        return titular

        # Si no encuentra nada específico, intentar buscar palabras clave comunes
        text_lower = cv_text.lower()
        keywords = ['ingeniero', 'developer', 'analista', 'consultor', 'arquitecto']

        for keyword in keywords:
            if keyword in text_lower:
                # Buscar el contexto alrededor de la palabra clave
                sentences = cv_text.split('\n')[:15]  # Primeras 15 líneas
                for sentence in sentences:
                    if keyword in sentence.lower() and len(sentence.strip()) < 50:
                        return sentence.strip()

        return 'No extraído'