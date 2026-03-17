import json
import logging
import time
from datetime import datetime
from typing import Dict, List, Optional, Any

from app.services.llm_service import LLMService
from app.services.profile_detection_service import ProfileDetectionService, ProfileType
from app.services.file_parser_service import FileParserService
from app.services.data_structurer_service import DataStructurerService
from app.services.document_analyzer_service import DocumentAnalyzerService
from app.services.advanced_prompting_service import AdvancedPromptingService
from app.core.resume_prompts import ResumeExtractionPrompts
from app.models.resume import ResumeExtractionRequest, ResumeExtractionResponse, ResumeData
from app.utils.resume_validators import ResumeValidators

logger = logging.getLogger(__name__)

class ResumeExtractionService:
    """Servicio principal para orquestar la extracción de datos de CV"""

    def __init__(self, llm_service: LLMService):
        self.llm_service = llm_service
        self.profile_detector = ProfileDetectionService()
        self.file_parser = FileParserService()
        self.data_structurer = DataStructurerService()
        self.document_analyzer = DocumentAnalyzerService()
        self.advanced_prompting = AdvancedPromptingService()
        self.prompts = ResumeExtractionPrompts()
        self.validators = ResumeValidators()

    async def extract_from_file(self, file_content: bytes, filename: str,
                               config: Optional[Dict[str, Any]] = None) -> ResumeExtractionResponse:
        """
        Extrae datos estructurados de un archivo de CV

        Args:
            file_content: Contenido del archivo en bytes
            filename: Nombre del archivo
            config: Configuraciones opcionales de extracción

        Returns:
            ResumeExtractionResponse con datos estructurados
        """
        start_time = time.time()
        config = config or {}

        try:
            # 1. Validar archivo
            # Nota: validate_file sigue siendo síncrono porque es ligero, pero si crece debería ser async
            validation_result = self.file_parser.validate_file(file_content, filename)
            logger.info(f"DEBUG_TYPE: validation_result type: {type(validation_result)}")
            if asyncio.iscoroutine(validation_result):
                logger.error("CRITICAL: validation_result IS A COROUTINE! Awaiting it now to fix temporarily.")
                validation_result = await validation_result

            if not validation_result["is_valid"]:
                raise ValueError(f"Archivo inválido: {', '.join(validation_result['issues'])}")

            # 2. Extraer texto del archivo
            parse_result = await self.file_parser.parse_file(file_content, filename)
            logger.info(f"DEBUG_TYPE: parse_result type: {type(parse_result)}")
            
            if asyncio.iscoroutine(parse_result):
                 logger.error("CRITICAL: parse_result IS A COROUTINE (double await needed)! Awaiting it now.")
                 parse_result = await parse_result

            if not isinstance(parse_result, dict):
                 logger.error(f"CRITICAL: parse_result is {type(parse_result)}, expected dict")


            if not parse_result["success"]:
                raise ValueError(f"Error al procesar archivo: {parse_result['error']}")

            extracted_text = parse_result["text"]
            if not extracted_text.strip():
                raise ValueError("No se pudo extraer texto del archivo")

            # 3. Crear request interno
            extraction_request = ResumeExtractionRequest(
                archivo_contenido=extracted_text,
                tipo_archivo=parse_result["metadata"]["file_type"],
                nombre_archivo=filename,
                configuracion=config
            )

            # 4. Procesar extracción
            result = await self.extract_from_text(extraction_request)

            # 5. Agregar metadatos del archivo
            existing_metadata = result.datos_cv.metadata_procesamiento or {}
            result.datos_cv.metadata_procesamiento = {
                **existing_metadata,
                "archivo_original": filename,
                "tipo_archivo": parse_result["metadata"]["file_type"],
                "metadatos_archivo": parse_result["metadata"]
            }

            processing_time = time.time() - start_time
            result.tiempo_procesamiento = processing_time

            logger.info(f"CV extraction completed for {filename} in {processing_time:.2f}s")
            return result

        except Exception as e:
            processing_time = time.time() - start_time
            logger.error(f"Error extracting CV from {filename}: {e}")

            # Retornar respuesta de error estructurada
            return ResumeExtractionResponse(
                datos_cv=self._create_empty_resume_data(),
                confianza_general=0.0,
                advertencias=[f"Error en procesamiento: {str(e)}"],
                campos_faltantes=["todos"],
                tiempo_procesamiento=processing_time
            )

    async def extract_from_text(self, request: ResumeExtractionRequest) -> ResumeExtractionResponse:
        """
        Extrae datos estructurados de texto de CV usando arquitectura robusta

        Args:
            request: Request con texto del CV y configuraciones

        Returns:
            ResumeExtractionResponse con datos estructurados
        """
        start_time = time.time()

        try:
            logger.info("Iniciando extracción de CV con nueva arquitectura robusta")

            # 1. Analizar estructura del documento
            document_analysis = self.document_analyzer.analyze_document(request.archivo_contenido)
            analysis_hints = self.document_analyzer.create_extraction_hints(document_analysis)

            logger.info(f"Document analysis completed: {len(document_analysis.get('sections_detected', {}))} sections detected")

            # 2. Detectar tipo de perfil
            profile_detection = self.profile_detector.detect_profile_type(request.archivo_contenido)
            profile_type = profile_detection["profile_type"]

            logger.info(f"Profile type detected: {profile_type} (confidence: {profile_detection['confidence']:.2f})")

            # 3. Ejecutar extracciones LLM con análisis inteligente
            raw_extractions = await self._execute_all_llm_extractions(
                request.archivo_contenido,
                profile_type,
                request.configuracion or {},
                analysis_hints
            )

            # 4. Si la extracción fue pobre, usar técnicas avanzadas
            extraction_quality = self._assess_extraction_quality(raw_extractions)
            # TEMPORAL: Forzar técnicas avanzadas para debugging
            logger.info(f"Calidad evaluada: {extraction_quality}")
            if extraction_quality < 0.5 or True:  # SMART: Use advanced techniques only if they improve data
                logger.info("Extracción inicial pobre, aplicando técnicas avanzadas de prompting")
                enhanced_extractions = await self._apply_advanced_prompting(
                    request.archivo_contenido,
                    raw_extractions,
                    analysis_hints
                )
                # Combinar con extracciones originales
                raw_extractions = self._merge_extractions(raw_extractions, enhanced_extractions)

            # 3. Metadatos del archivo
            file_metadata = {
                "filename": request.nombre_archivo,
                "file_type": request.tipo_archivo,
                "text_length": len(request.archivo_contenido),
                "has_text": bool(request.archivo_contenido.strip()),
                "processing_time": time.time() - start_time
            }

            # 4. Estructurar datos usando el servicio robusto (responsabilidad separada)
            structured_result = self.data_structurer.structure_resume_data(
                raw_extractions,
                file_metadata,
                profile_detection
            )

            # 5. Convertir a modelo Pydantic
            resume_data = self._convert_to_pydantic(structured_result["datos_cv"])

            processing_time = time.time() - start_time
            structured_result["tiempo_procesamiento"] = processing_time

            logger.info(f"CV extraction completed for {request.nombre_archivo} in {processing_time:.2f}s")

            return ResumeExtractionResponse(
                datos_cv=resume_data,
                confianza_general=structured_result["confianza_general"],
                advertencias=structured_result["advertencias"],
                campos_faltantes=structured_result["campos_faltantes"],
                tiempo_procesamiento=processing_time
            )

        except Exception as e:
            processing_time = time.time() - start_time
            logger.error(f"Error in CV extraction: {e}")

            # Usar fallback del estructurador
            fallback_metadata = {
                "filename": request.nombre_archivo,
                "file_type": request.tipo_archivo,
                "error": str(e)
            }

            fallback_result = self.data_structurer._create_error_fallback(fallback_metadata, str(e))
            fallback_resume_data = self._convert_to_pydantic(fallback_result["datos_cv"])

            return ResumeExtractionResponse(
                datos_cv=fallback_resume_data,
                confianza_general=0.0,
                advertencias=[f"Error crítico en extracción: {str(e)}"],
                campos_faltantes=["todos"],
                tiempo_procesamiento=processing_time
            )

    async def _execute_all_llm_extractions(self, cv_text: str, profile_type: ProfileType, config: Dict, analysis_hints: Dict = None) -> Dict[str, Any]:
        """
        Ejecuta todas las extracciones LLM necesarias de forma robusta
        Separa responsabilidad: solo extracción, no estructuración
        """
        extractions = {}

        try:
            # 1. Extracción principal con análisis inteligente
            logger.info("Ejecutando extracción principal con análisis inteligente")
            strategy = self._get_extraction_strategy(profile_type, config)
            main_result = await self._execute_main_extraction(cv_text, profile_type, strategy, analysis_hints)
            extractions["main_extraction"] = main_result
            logger.info("Extracción principal exitosa")

            # 2. Extracción detallada si es necesario
            if strategy.get("detailed_extraction", False) and main_result:
                logger.info("Ejecutando extracción detallada con análisis inteligente")
                detailed_result = await self._execute_detailed_extraction(cv_text, main_result, profile_type, analysis_hints)
                extractions.update(detailed_result)

            # 3. Validación y limpieza
            if main_result:
                logger.info("Ejecutando validación y limpieza")
                validation_result = await self._validate_and_clean_data(main_result)
                extractions["validation_cleaning"] = validation_result

            extractions["processing_time"] = 0  # Se calculará después
            return extractions

        except Exception as e:
            logger.error(f"Error en extracciones LLM: {e}")
            # Devolver lo que se pudo extraer
            return extractions

    def _convert_to_pydantic(self, structured_data: Dict[str, Any]) -> ResumeData:
        """
        Convierte datos estructurados a modelo Pydantic ResumeData
        Manejo robusto de errores de validación
        """
        try:
            return ResumeData(**structured_data)
        except Exception as e:
            logger.warning(f"Error convirtiendo a Pydantic: {e}")
            # Crear estructura mínima válida
            return self._create_empty_resume_data()

    def _assess_extraction_quality(self, extractions: Dict[str, Any]) -> float:
        """
        Evalúa la calidad de la extracción inicial para decidir si aplicar técnicas avanzadas
        """
        main_data = extractions.get("main_extraction", {})

        if not isinstance(main_data, dict):
            return 0.0

        quality_score = 0.0
        total_checks = 0

        # Verificar datos de contacto
        contact_data = main_data.get("datos_contacto", {})
        if isinstance(contact_data, dict):
            if contact_data.get("nombre_completo") and contact_data.get("nombre_completo") != "Información no disponible":
                quality_score += 1
            if contact_data.get("email") and "@" in str(contact_data.get("email")):
                quality_score += 1
            total_checks += 2

        # Verificar experiencia laboral
        experience = main_data.get("experiencia_laboral", [])
        if isinstance(experience, list) and len(experience) > 0:
            quality_score += 2
        total_checks += 2

        # Verificar formación académica
        education = main_data.get("formacion_academica", [])
        if isinstance(education, list) and len(education) > 0:
            quality_score += 2
        total_checks += 2

        # Verificar resumen profesional
        resume_data = main_data.get("resumen_profesional", {})
        if isinstance(resume_data, dict) and resume_data.get("resumen"):
            if resume_data["resumen"] != "Resumen no disponible":
                quality_score += 1
        total_checks += 1

        return quality_score / total_checks if total_checks > 0 else 0.0

    async def _apply_advanced_prompting(self, cv_text: str, initial_extractions: Dict, analysis_hints: Dict) -> Dict[str, Any]:
        """
        Aplica técnicas avanzadas de prompting cuando la extracción inicial es pobre
        """
        enhanced_extractions = {}

        try:
            # 1. Chain-of-Thought para extracción completa
            logger.info("Aplicando Chain-of-Thought prompting")
            cot_prompt = self.advanced_prompting.create_chain_of_thought_prompt(cv_text, analysis_hints)
            cot_result = await self.llm_service.call_agent(
                prompt=cot_prompt,
                input_data="",  # Ya incluido en el prompt
                stage_name="cot_extraction",
                temperature=0.0
            )
            if cot_result:
                enhanced_extractions["cot_extraction"] = cot_result

            # 2. Extracción por decomposición para secciones faltantes
            main_data = initial_extractions.get("main_extraction", {})

            # Si falta formación académica, usar decomposición específica
            if not main_data.get("formacion_academica"):
                logger.info("Aplicando decomposición para formación académica")
                education_prompt = self.advanced_prompting.create_decomposition_prompt(cv_text, "formacion_academica")
                education_result = await self.llm_service.call_agent(
                    prompt=education_prompt,
                    input_data="",
                    stage_name="decomp_education",
                    temperature=0.0
                )
                if education_result:
                    enhanced_extractions["decomp_education"] = education_result

            # Si falta experiencia laboral, usar decomposición específica
            if not main_data.get("experiencia_laboral"):
                logger.info("Aplicando decomposición para experiencia laboral")
                experience_prompt = self.advanced_prompting.create_decomposition_prompt(cv_text, "experiencia_laboral")
                experience_result = await self.llm_service.call_agent(
                    prompt=experience_prompt,
                    input_data="",
                    stage_name="decomp_experience",
                    temperature=0.0
                )
                if experience_result:
                    enhanced_extractions["decomp_experience"] = experience_result

            # 3. Auto-corrección de la extracción inicial
            logger.info("Aplicando auto-corrección")
            correction_prompt = self.advanced_prompting.create_self_correction_prompt(main_data, cv_text)
            correction_result = await self.llm_service.call_agent(
                prompt=correction_prompt,
                input_data="",
                stage_name="self_correction",
                temperature=0.0
            )
            if correction_result:
                enhanced_extractions["self_correction"] = correction_result

            # 4. Extracción comprehensiva como respaldo
            logger.info("Aplicando extracción comprehensiva")
            comprehensive_prompt = self.advanced_prompting.create_comprehensive_extraction_prompt(cv_text, analysis_hints)
            comprehensive_result = await self.llm_service.call_agent(
                prompt=comprehensive_prompt,
                input_data="",
                stage_name="comprehensive_extraction",
                temperature=0.0
            )
            if comprehensive_result:
                enhanced_extractions["comprehensive_extraction"] = comprehensive_result

            return enhanced_extractions

        except Exception as e:
            logger.error(f"Error en prompting avanzado: {e}")
            return {}

    def _merge_extractions(self, original: Dict[str, Any], enhanced: Dict[str, Any]) -> Dict[str, Any]:
        """
        Combina extracciones originales con las mejoradas, usando técnicas avanzadas SOLO si mejoran los datos
        """
        merged = original.copy()

        # Comenzar con extracción básica
        best_main = original.get("main_extraction", {})
        original_score = self._calculate_extraction_completeness(best_main)

        logger.info(f"🔗 Merge extractions - Original score: {original_score:.2f}")

        # Técnicas avanzadas en orden de prioridad
        priority_order = [
            "comprehensive_extraction",
            "self_correction",
            "cot_extraction",
            "decomp_education",
            "decomp_experience"
        ]

        # Solo usar técnicas avanzadas si realmente mejoran
        for technique in priority_order:
            if technique in enhanced:
                enhanced_data = enhanced[technique]

                if technique in ["comprehensive_extraction", "self_correction", "cot_extraction"]:
                    # Evaluar si la técnica avanzada es mejor que la básica
                    if isinstance(enhanced_data, dict) and enhanced_data:
                        enhanced_score = self._calculate_extraction_completeness(enhanced_data)
                        logger.info(f"🔗 {technique} score: {enhanced_score:.2f}")

                        if enhanced_score > original_score:
                            best_main = enhanced_data
                            original_score = enhanced_score
                            logger.info(f"✅ Using {technique} (better score)")
                            break
                        else:
                            logger.info(f"⚠️ Skipping {technique} (worse than basic)")

                elif technique == "decomp_education" and isinstance(enhanced_data, dict):
                    # Solo mejorar formación académica si es mejor
                    if isinstance(best_main, dict):
                        # Los datos de decomp_education vienen como {"formacion_academica": [...]}
                        if "formacion_academica" in enhanced_data:
                            best_main["formacion_academica"] = enhanced_data["formacion_academica"]
                        else:
                            best_main["formacion_academica"] = enhanced_data

                elif technique == "decomp_experience" and isinstance(enhanced_data, dict):
                    if isinstance(best_main, dict):
                        # Los datos de decomp_experience vienen como {"experiencia_laboral": [...]}
                        if "experiencia_laboral" in enhanced_data:
                            best_main["experiencia_laboral"] = enhanced_data["experiencia_laboral"]
                        else:
                            best_main["experiencia_laboral"] = enhanced_data

        merged["main_extraction"] = best_main

        # Agregar las extracciones mejoradas para referencia
        merged.update(enhanced)

        return merged

    def _calculate_extraction_completeness(self, extraction: Dict[str, Any]) -> float:
        """
        Calcula qué tan completa es una extracción basándose en campos y contenido
        """
        if not isinstance(extraction, dict):
            return 0.0

        score = 0.0
        max_score = 0.0

        # Datos de contacto (peso: 1.0)
        max_score += 1.0
        if extraction.get("datos_contacto"):
            contacto = extraction["datos_contacto"]
            if isinstance(contacto, dict):
                if contacto.get("nombre_completo") and contacto["nombre_completo"] != "Información no disponible":
                    score += 0.4
                if contacto.get("email") and "@" in str(contacto["email"]):
                    score += 0.3
                if contacto.get("telefono"):
                    score += 0.3

        # Experiencia laboral (peso: 2.0 - muy importante)
        max_score += 2.0
        if extraction.get("experiencia_laboral"):
            exp_list = extraction["experiencia_laboral"]
            if isinstance(exp_list, list) and exp_list:
                # Puntos por cantidad
                score += min(len(exp_list) * 0.5, 1.0)

                # Puntos por completeness de cada experiencia
                total_exp_completeness = 0.0
                for exp in exp_list:
                    if isinstance(exp, dict):
                        exp_score = 0.0
                        if exp.get("cargo"):
                            exp_score += 0.3
                        if exp.get("empresa"):
                            exp_score += 0.3
                        if exp.get("logros") and isinstance(exp["logros"], list) and exp["logros"]:
                            exp_score += 0.4
                        total_exp_completeness += exp_score

                avg_exp_completeness = total_exp_completeness / len(exp_list) if exp_list else 0.0
                score += avg_exp_completeness

        # Formación académica (peso: 1.5)
        max_score += 1.5
        if extraction.get("formacion_academica"):
            edu_list = extraction["formacion_academica"]
            if isinstance(edu_list, list) and edu_list:
                score += min(len(edu_list) * 0.5, 1.0)

                # Completeness de cada formación
                total_edu_completeness = 0.0
                for edu in edu_list:
                    if isinstance(edu, dict):
                        edu_score = 0.0
                        if edu.get("titulo"):
                            edu_score += 0.5
                        if edu.get("institucion"):
                            edu_score += 0.5
                        total_edu_completeness += edu_score

                avg_edu_completeness = total_edu_completeness / len(edu_list) if edu_list else 0.0
                score += min(avg_edu_completeness * 0.5, 0.5)

        # Habilidades (peso: 0.5)
        max_score += 0.5
        if extraction.get("habilidades"):
            skills = extraction["habilidades"]
            if isinstance(skills, dict):
                if skills.get("habilidades_tecnicas") and isinstance(skills["habilidades_tecnicas"], list):
                    score += min(len(skills["habilidades_tecnicas"]) * 0.1, 0.3)
                if skills.get("idiomas") and isinstance(skills["idiomas"], list):
                    score += min(len(skills["idiomas"]) * 0.1, 0.2)

        # Normalizar score de 0 a 1
        return score / max_score if max_score > 0 else 0.0

    async def _execute_main_extraction(self, cv_text: str, profile_type: ProfileType,
                                     strategy: Dict[str, Any], analysis_hints: Dict = None) -> Optional[Dict[str, Any]]:
        """Ejecuta la extracción principal usando el prompt adecuado"""

        try:
            # Validar entrada
            if not cv_text or not cv_text.strip():
                logger.error("Texto de CV vacío para extracción")
                return None

            # Seleccionar prompt base
            if profile_type == ProfileType.JUNIOR:
                base_prompt = self.prompts.get_junior_profile_prompt()
            elif profile_type == ProfileType.SENIOR:
                base_prompt = self.prompts.get_senior_profile_prompt()
            elif profile_type == ProfileType.TECHNICAL:
                base_prompt = self.prompts.get_technical_profile_prompt()
            elif profile_type == ProfileType.CREATIVE:
                base_prompt = self.prompts.get_creative_profile_prompt()
            else:
                base_prompt = ""

            # Combinar con prompt principal inteligente
            main_prompt = self.prompts.get_main_extraction_prompt(analysis_hints)
            if base_prompt:
                combined_prompt = f"{base_prompt}\n\n{main_prompt}"
            else:
                combined_prompt = main_prompt

            # Detectar si es multiidioma
            if strategy.get("is_multilingual", False):
                multilingual_prompt = self.prompts.get_multilingual_prompt()
                combined_prompt = f"{multilingual_prompt}\n\n{combined_prompt}"

            # Ejecutar extracción
            logger.info(f"Ejecutando extracción principal para perfil {profile_type}")
            result = await self.llm_service.call_agent(
                prompt=combined_prompt,
                input_data=cv_text,
                stage_name=f"main_extraction_{profile_type}",
                temperature=0.1
            )

            if result and isinstance(result, dict):
                logger.info("Extracción principal exitosa")
                return result
            else:
                logger.warning("Extracción principal retornó resultado inválido")
                return None

        except Exception as e:
            logger.error(f"Error en extracción principal: {e}")
            return None

    async def _execute_detailed_extraction(self, cv_text: str, main_data: Dict[str, Any],
                                         profile_type: ProfileType, analysis_hints: Dict = None) -> Dict[str, Any]:
        """Ejecuta extracción detallada por secciones"""
        detailed_data = {}

        # Extracción detallada de experiencia
        if not main_data.get("experiencia_laboral") or len(main_data["experiencia_laboral"]) < 2:
            experience_result = await self.llm_service.call_agent(
                prompt=self.prompts.get_experience_extraction_prompt(),
                input_data=cv_text,
                stage_name="detailed_experience",
                temperature=0.1
            )
            if experience_result:
                detailed_data["experiencia_laboral"] = experience_result

        # Extracción detallada de habilidades con análisis inteligente
        if not main_data.get("habilidades") or len(main_data["habilidades"].get("habilidades_tecnicas", [])) < 3:
            skills_result = await self.llm_service.call_agent(
                prompt=self.prompts.get_skills_extraction_prompt(analysis_hints),
                input_data=cv_text,
                stage_name="detailed_skills",
                temperature=0.1
            )
            if skills_result:
                detailed_data["habilidades"] = skills_result

        return detailed_data

    async def _validate_and_clean_data(self, extraction_data: Dict[str, Any]) -> Dict[str, Any]:
        """Valida y limpia los datos extraídos"""

        if not extraction_data or not isinstance(extraction_data, dict):
            logger.warning("Datos de extracción inválidos para validación")
            extraction_data = self._create_basic_extraction_structure("")

        try:
            validation_prompt = self.prompts.get_validation_prompt()
            data_json = json.dumps(extraction_data, ensure_ascii=False, indent=2)

            result = await self.llm_service.call_agent(
                prompt=validation_prompt,
                input_data=data_json,
                stage_name="validation_cleaning",
                temperature=0.0
            )

            if result and isinstance(result, dict):
                return result
            else:
                logger.warning("Validación por IA falló, usando validadores locales")
                # Fallback: usar validadores locales
                return self._create_local_validation_result(extraction_data)

        except Exception as e:
            logger.error(f"Error en validación por IA: {e}")
            return self._create_local_validation_result(extraction_data)

    def _create_local_validation_result(self, extraction_data: Dict[str, Any]) -> Dict[str, Any]:
        """Crea resultado de validación usando validadores locales"""
        try:
            completeness = self.validators.validate_resume_completeness(extraction_data)
            return {
                "datos_validados": extraction_data,
                "validacion": {
                    "es_valido": completeness["is_valid"],
                    "completitud_score": completeness["completeness_score"],
                    "errores": [],
                    "advertencias": completeness.get("quality_issues", []),
                    "campos_faltantes": completeness.get("missing_required", []),
                    "sugerencias_mejora": []
                }
            }
        except Exception as e:
            logger.error(f"Error en validación local: {e}")
            return {
                "datos_validados": extraction_data,
                "validacion": {
                    "es_valido": True,
                    "completitud_score": 50.0,
                    "errores": [],
                    "advertencias": ["Error en validación local"],
                    "campos_faltantes": [],
                    "sugerencias_mejora": []
                }
            }

    def _get_extraction_strategy(self, profile_type: ProfileType, config: Dict[str, Any]) -> Dict[str, Any]:
        """Determina la estrategia de extracción basada en el tipo de perfil"""

        base_strategy = {
            "detailed_extraction": False,
            "quality_threshold": 0.7,
            "max_retries": 2,
            "is_multilingual": False
        }

        # Ajustar según tipo de perfil
        if profile_type == ProfileType.TECHNICAL:
            base_strategy.update({
                "detailed_extraction": True,
                "focus_on_skills": True,
                "extract_projects": True
            })
        elif profile_type == ProfileType.SENIOR:
            base_strategy.update({
                "detailed_extraction": True,
                "focus_on_leadership": True,
                "extract_achievements": True
            })
        elif profile_type == ProfileType.CREATIVE:
            base_strategy.update({
                "focus_on_portfolio": True,
                "extract_creative_tools": True
            })

        # Aplicar configuraciones personalizadas
        base_strategy.update(config)

        return base_strategy

    def _merge_extraction_results(self, main_data: Dict[str, Any],
                                detailed_data: Dict[str, Any]) -> Dict[str, Any]:
        """Combina resultados de extracción principal y detallada"""

        merged = main_data.copy()

        for section, data in detailed_data.items():
            if section in merged:
                if isinstance(data, list) and isinstance(merged[section], list):
                    # Combinar listas evitando duplicados
                    merged[section].extend(data)
                elif isinstance(data, dict) and isinstance(merged[section], dict):
                    # Combinar diccionarios
                    merged[section].update(data)
            else:
                merged[section] = data

        return merged

    def _create_resume_data_model(self, cleaned_data: Dict[str, Any],
                                profile_detection: Dict[str, Any]) -> ResumeData:
        """Crea el modelo Pydantic ResumeData a partir de los datos extraídos"""

        # Asegurar que los datos son válidos antes de crear el modelo
        validated_data = self._ensure_valid_resume_data(cleaned_data)

        # Agregar metadatos de procesamiento
        processing_metadata = {
            "version_extractor": "1.0",
            "fecha_procesamiento": datetime.now().isoformat(),
            "perfil_detectado": profile_detection["profile_type"],
            "confianza_deteccion": profile_detection["confidence"],
            "caracteristicas_adicionales": profile_detection.get("additional_traits", []),
            "multiidioma": profile_detection.get("is_multilingual", False)
        }

        validated_data["metadata_procesamiento"] = processing_metadata

        try:
            return ResumeData(**validated_data)
        except Exception as e:
            logger.error(f"Error creating ResumeData model: {e}")
            logger.error(f"Data that failed validation: {validated_data}")
            # Retornar modelo mínimo válido
            return self._create_empty_resume_data()

    def _create_empty_resume_data(self) -> ResumeData:
        """Crea un modelo ResumeData vacío pero válido"""
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

    def _ensure_valid_resume_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Asegura que los datos extraídos sean válidos para el modelo"""
        # Garantizar campos obligatorios
        if not data.get("datos_contacto"):
            data["datos_contacto"] = {
                "nombre_completo": "Información no disponible",
                "email": "no-disponible@example.com",
                "ubicacion": "No especificado"
            }

        # Asegurar que email existe y es válido
        if not data["datos_contacto"].get("email"):
            data["datos_contacto"]["email"] = "no-disponible@example.com"

        # Asegurar que nombre existe
        if not data["datos_contacto"].get("nombre_completo"):
            data["datos_contacto"]["nombre_completo"] = "Información no disponible"

        # Asegurar que ubicación existe
        if not data["datos_contacto"].get("ubicacion"):
            data["datos_contacto"]["ubicacion"] = "No especificado"

        # Limpiar telefono - convertir "No especificado" a None
        if data["datos_contacto"].get("telefono") == "No especificado":
            data["datos_contacto"]["telefono"] = None

        # Limpiar campos opcionales que pueden llegar como None pero deben ser listas
        if data.get("reconocimientos") and data["reconocimientos"].get("logros_premios") is None:
            data["reconocimientos"]["logros_premios"] = []

        if data.get("actividades_extracurriculares") and data["actividades_extracurriculares"].get("voluntariado") is None:
            data["actividades_extracurriculares"]["voluntariado"] = []

        if data.get("intereses") and data["intereses"].get("hobbies_intereses") is None:
            data["intereses"]["hobbies_intereses"] = []

        # Asegurar titular profesional
        if not data.get("titular_profesional"):
            data["titular_profesional"] = {"titular": "Perfil profesional no especificado"}
        elif not data["titular_profesional"].get("titular"):
            data["titular_profesional"]["titular"] = "Perfil profesional no especificado"

        # Asegurar resumen profesional
        if not data.get("resumen_profesional"):
            data["resumen_profesional"] = {"resumen": "Resumen no disponible"}
        elif not data["resumen_profesional"].get("resumen"):
            data["resumen_profesional"]["resumen"] = "Resumen no disponible"

        # Asegurar listas existen (pueden estar vacías)
        if not data.get("experiencia_laboral"):
            data["experiencia_laboral"] = []
        else:
            # Limpiar experiencias laborales con campos None
            cleaned_experiences = []
            for exp in data["experiencia_laboral"]:
                if isinstance(exp, dict):
                    # Solo agregar experiencias válidas
                    if exp.get("cargo") and exp.get("empresa"):
                        # Asegurar que periodo existe
                        if not exp.get("periodo"):
                            exp["periodo"] = {
                                "fecha_inicio": "Fecha no especificada",
                                "fecha_fin": "Fecha no especificada",
                                "texto_original": "Período no disponible"
                            }

                        # Limpiar campo logros - debe ser siempre una lista
                        if exp.get("logros") == "No especificado" or not isinstance(exp.get("logros"), list):
                            exp["logros"] = []

                        cleaned_experiences.append(exp)
            data["experiencia_laboral"] = cleaned_experiences

        if not data.get("formacion_academica"):
            data["formacion_academica"] = []
        else:
            # Limpiar formación académica con campos None
            cleaned_education = []
            for edu in data["formacion_academica"]:
                if isinstance(edu, dict):
                    # Solo agregar educación válida
                    if edu.get("titulo") and edu.get("institucion"):
                        # Asegurar que periodo existe
                        if not edu.get("periodo"):
                            edu["periodo"] = {
                                "fecha_inicio": "Fecha no especificada",
                                "fecha_fin": "Fecha no especificada",
                                "texto_original": "Período no disponible"
                            }
                        cleaned_education.append(edu)
            data["formacion_academica"] = cleaned_education

        if not data.get("habilidades"):
            data["habilidades"] = {
                "habilidades_tecnicas": [],
                "idiomas": [],
                "habilidades_blandas": []
            }
        else:
            # Limpiar habilidades técnicas con levels inválidos
            if data["habilidades"].get("habilidades_tecnicas"):
                cleaned_skills = []
                for skill in data["habilidades"]["habilidades_tecnicas"]:
                    if isinstance(skill, dict) and skill.get("skill"):
                        # Normalizar level si está presente
                        if skill.get("level"):
                            level = skill["level"]
                            # Mapear niveles no estándar
                            if "intermedio" in level.lower() and "avanzado" in level.lower():
                                skill["level"] = "Intermedio - Avanzado"
                            elif "avanzado" in level.lower():
                                skill["level"] = "Avanzado"
                            elif "intermedio" in level.lower():
                                skill["level"] = "Intermedio"
                            elif "básico" in level.lower() or "basico" in level.lower():
                                skill["level"] = "Básico"
                            elif "experto" in level.lower():
                                skill["level"] = "Experto"
                            else:
                                skill["level"] = None  # Será manejado como opcional
                        cleaned_skills.append(skill)
                data["habilidades"]["habilidades_tecnicas"] = cleaned_skills

        return data

    def _create_basic_extraction_structure(self, cv_text: str = "") -> Dict[str, Any]:
        """Crea una estructura básica cuando la extracción principal falla, extrayendo datos básicos con regex"""

        # Extracción básica usando regex cuando AI falla
        extracted_data = self._extract_basic_data_with_regex(cv_text) if cv_text else {}

        return {
            "datos_contacto": {
                "nombre_completo": extracted_data.get("nombre", "Información no extraída"),
                "email": extracted_data.get("email", "no-extraido@example.com"),
                "telefono": extracted_data.get("telefono"),
                "ubicacion": extracted_data.get("ubicacion", "No especificado")
            },
            "titular_profesional": {
                "titular": extracted_data.get("titulo", "Perfil profesional no especificado")
            },
            "resumen_profesional": {
                "resumen": "Resumen no disponible"
            },
            "experiencia_laboral": [],
            "formacion_academica": [],
            "habilidades": {
                "habilidades_tecnicas": [],
                "idiomas": [],
                "habilidades_blandas": []
            }
        }

    def _extract_basic_data_with_regex(self, text: str) -> Dict[str, Any]:
        """Extrae datos básicos usando regex cuando AI falla"""
        import re

        if not text:
            return {}

        extracted = {}

        # Extraer email
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        email_match = re.search(email_pattern, text)
        if email_match:
            extracted["email"] = email_match.group(0)

        # Extraer teléfono
        phone_patterns = [
            r'\+?[\d\s\-\(\)]{10,}',  # Patrones internacionales
            r'\b\d{3,4}[\s\-]?\d{3,4}[\s\-]?\d{3,4}\b'  # Patrones locales
        ]
        for pattern in phone_patterns:
            phone_match = re.search(pattern, text)
            if phone_match:
                phone = phone_match.group(0).strip()
                if len(re.sub(r'[^\d]', '', phone)) >= 7:  # Al menos 7 dígitos
                    extracted["telefono"] = phone
                    break

        # Extraer nombre (líneas principales del inicio)
        lines = text.split('\n')
        for line in lines[:10]:  # Revisar primeras 10 líneas
            line = line.strip()
            if len(line) > 3 and len(line) < 100:
                # Verificar si parece un nombre (tiene al menos 2 palabras, no tiene números, etc.)
                if (re.match(r'^[A-ZÁÉÍÓÚÜÑa-záéíóúüñ\s]+$', line) and
                    len(line.split()) >= 2 and
                    not any(word.lower() in ['cv', 'curriculum', 'vitae', 'resume', 'email', 'phone', 'tel'] for word in line.split())):
                    extracted["nombre"] = line
                    break

        # Extraer ubicación (buscar patrones de ciudad, país)
        location_patterns = [
            r'([A-ZÁÉÍÓÚÜÑa-záéíóúüñ\s]+),\s*([A-ZÁÉÍÓÚÜÑa-záéíóúüñ\s]+)',  # Ciudad, País
            r'\b(Chile|Argentina|México|España|Colombia|Perú|Venezuela|Ecuador|Bolivia|Uruguay|Paraguay)\b'
        ]
        for pattern in location_patterns:
            location_match = re.search(pattern, text, re.IGNORECASE)
            if location_match:
                if ',' in location_match.group(0):
                    extracted["ubicacion"] = location_match.group(0)
                else:
                    extracted["ubicacion"] = f"Ciudad no especificada, {location_match.group(0)}"
                break

        return extracted

    def _calculate_quality_metrics(self, resume_data: ResumeData,
                                 profile_detection: Dict[str, Any]) -> Dict[str, float]:
        """Calcula métricas de calidad de la extracción"""

        # Calcular completitud básica
        required_fields = [
            resume_data.datos_contacto.nombre_completo != "No extraído",
            resume_data.datos_contacto.email != "no-extraido@example.com",
            len(resume_data.experiencia_laboral) > 0,
            len(resume_data.formacion_academica) > 0,
            len(resume_data.habilidades.habilidades_tecnicas) > 0
        ]

        completeness = sum(required_fields) / len(required_fields)

        # Factor de confianza del detector de perfil
        detection_confidence = profile_detection.get("confidence", 0.5)

        # Calcular confianza general
        general_confidence = (completeness * 0.7) + (detection_confidence * 0.3)

        return {
            "confidence": round(general_confidence, 3),
            "completeness": round(completeness, 3),
            "detection_confidence": round(detection_confidence, 3)
        }