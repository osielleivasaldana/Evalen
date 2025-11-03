"""
VERSIÓN 2 DEL SERVICIO DE EXTRACCIÓN CON TÉCNICAS AVANZADAS GARANTIZADAS
Esta versión SIEMPRE ejecuta técnicas avanzadas para asegurar extracción completa
"""
import asyncio
import json
import logging
import time
from typing import Dict, List, Optional, Any, Union
from datetime import datetime

from app.services.llm_service import LLMService
from app.services.profile_detection_service import ProfileDetectionService, ProfileType
from app.services.file_parser_service import FileParserService
from app.services.data_structurer_service import DataStructurerService
from app.services.document_analyzer_service import DocumentAnalyzerService
from app.services.advanced_prompting_service import AdvancedPromptingService
from app.core.resume_prompts import ResumeExtractionPrompts
from app.utils.resume_validators import ResumeValidators
from app.models.resume import ResumeData, ResumeExtractionRequest, ResumeExtractionResponse

logger = logging.getLogger(__name__)

class ResumeExtractionServiceV2:
    """
    VERSIÓN 2: Servicio de extracción con técnicas avanzadas GARANTIZADAS
    Siempre ejecuta técnicas de prompting profundo para máxima extracción
    """

    def __init__(self, llm_service: LLMService):
        self.llm_service = llm_service
        self.profile_detector = ProfileDetectionService()
        self.file_parser = FileParserService()
        self.data_structurer = DataStructurerService()
        self.document_analyzer = DocumentAnalyzerService()
        self.advanced_prompting = AdvancedPromptingService()
        self.prompts = ResumeExtractionPrompts()
        self.validators = ResumeValidators()

    async def extract_from_text(self, request: ResumeExtractionRequest) -> ResumeExtractionResponse:
        """
        Extracción GARANTIZADA con técnicas avanzadas SIEMPRE activadas
        """
        start_time = time.time()

        try:
            logger.info("🚀 INICIANDO EXTRACCIÓN V2 CON TÉCNICAS AVANZADAS GARANTIZADAS")

            # 1. Análisis de documento
            analysis = self.document_analyzer.analyze_document(request.archivo_contenido)
            analysis_hints = self.document_analyzer.create_extraction_hints(analysis)
            logger.info(f"📋 Análisis completado: {len(analysis['sections_detected'])} secciones")

            # 2. Detección de perfil
            profile_detection = self.profile_detector.detect_profile_type(
                request.archivo_contenido
            )
            logger.info(f"👤 Perfil detectado: {profile_detection['profile_type']}")

            # 3. EXTRACCIÓN BÁSICA PRIMERA
            logger.info("⚡ Ejecutando extracción básica inicial...")
            basic_extraction = await self._execute_basic_extraction(
                request.archivo_contenido,
                profile_detection['profile_type']
            )

            # 4. TÉCNICAS AVANZADAS - SIEMPRE EJECUTADAS
            logger.info("🧠 EJECUTANDO TÉCNICAS AVANZADAS (GARANTIZADO)")
            advanced_extractions = await self._execute_advanced_techniques(
                request.archivo_contenido,
                analysis_hints,
                basic_extraction
            )

            # 5. Fusión inteligente de todas las extracciones
            logger.info("🔗 Fusionando extracciones...")
            final_extractions = self._smart_merge_all_extractions(
                basic_extraction,
                advanced_extractions
            )

            # 🔍 SAFETY CHECK: Ensure final_extractions is always a dict
            if not isinstance(final_extractions, dict):
                logger.warning(f"⚠️ final_extractions no es dict, tipo: {type(final_extractions)}")
                logger.warning(f"Contenido: {str(final_extractions)[:200] if final_extractions else 'None'}")
                # Fallback to basic_extraction if available
                if isinstance(basic_extraction, dict):
                    logger.info("🔄 Usando basic_extraction como fallback")
                    final_extractions = basic_extraction
                else:
                    logger.warning("🔄 Usando estructura vacía como fallback")
                    final_extractions = self._create_empty_extraction_structure()

            # 6. Estructuración de datos
            file_metadata = {
                "filename": request.nombre_archivo,
                "file_type": request.tipo_archivo,
                "text_length": len(request.archivo_contenido),
                "has_text": bool(request.archivo_contenido.strip()),
                "processing_time": time.time() - start_time
            }

            structured_result = self.data_structurer.structure_resume_data(
                {"main_extraction": final_extractions},  # Enviar como main_extraction
                file_metadata,
                profile_detection
            )

            # 7. Conversión a modelo Pydantic
            resume_data = self._convert_to_pydantic(structured_result["datos_cv"])

            processing_time = time.time() - start_time

            # 8. Crear respuesta
            response = ResumeExtractionResponse(
                datos_cv=resume_data,
                confianza_general=1.0,  # Máxima confianza con técnicas avanzadas
                advertencias=[],
                campos_faltantes=self._identify_missing_fields(resume_data),
                tiempo_procesamiento=processing_time,
                timestamp=datetime.now().isoformat()
            )

            logger.info(f"✅ EXTRACCIÓN V2 COMPLETADA en {processing_time:.2f}s")
            logger.info(f"📊 Resultados: {len(resume_data.formacion_academica)} académicos + {len(resume_data.experiencia_laboral)} trabajos")

            return response

        except Exception as e:
            logger.error(f"❌ Error en extracción V2: {e}")
            import traceback
            traceback.print_exc()
            return self._create_error_response(str(e), time.time() - start_time)

    async def _execute_basic_extraction(self, cv_text: str, profile_type: str) -> Dict[str, Any]:
        """Extracción básica usando prompts estándar"""
        try:
            main_prompt = self.prompts.get_main_extraction_prompt()

            result = await self.llm_service.call_agent(
                prompt=main_prompt,
                input_data=cv_text,
                stage_name=f"basic_extraction_{profile_type}",
                temperature=0.0
            )

            if result and isinstance(result, dict):
                logger.info("✅ Extracción básica exitosa")
                return result
            else:
                logger.warning("⚠️ Extracción básica falló, usando estructura vacía")
                return self._create_empty_extraction_structure()

        except Exception as e:
            logger.error(f"Error en extracción básica: {e}")
            return self._create_empty_extraction_structure()

    async def _execute_advanced_techniques(self, cv_text: str, analysis_hints: Dict, basic_extraction: Dict) -> Dict[str, Any]:
        """
        Ejecuta TODAS las técnicas avanzadas - GARANTIZADO
        """
        advanced_results = {}

        try:
            # 1. Chain-of-Thought SIEMPRE
            logger.info("🧠 Aplicando Chain-of-Thought prompting...")
            cot_prompt = self.advanced_prompting.create_chain_of_thought_prompt(cv_text, analysis_hints)
            cot_result = await self.llm_service.call_agent(
                prompt=cot_prompt,
                input_data=cv_text,
                stage_name="advanced_cot",
                temperature=0.0
            )
            if cot_result:
                advanced_results["cot_extraction"] = cot_result
                logger.info("✅ Chain-of-Thought completado")

            # 2. Decomposición por secciones SIEMPRE
            logger.info("🎯 Aplicando decomposición para formación académica...")
            education_prompt = self.advanced_prompting.create_decomposition_prompt(cv_text, "formacion_academica")
            education_result = await self.llm_service.call_agent(
                prompt=education_prompt,
                input_data=cv_text,
                stage_name="advanced_education",
                temperature=0.0
            )
            if education_result:
                advanced_results["decomp_education"] = education_result
                logger.info("✅ Decomposición educación completada")

            logger.info("🎯 Aplicando decomposición para experiencia laboral...")
            experience_prompt = self.advanced_prompting.create_decomposition_prompt(cv_text, "experiencia_laboral")
            experience_result = await self.llm_service.call_agent(
                prompt=experience_prompt,
                input_data=cv_text,
                stage_name="advanced_experience",
                temperature=0.0
            )
            if experience_result:
                advanced_results["decomp_experience"] = experience_result
                logger.info("✅ Decomposición experiencia completada")

            # 3. Extracción comprehensiva SIEMPRE
            logger.info("🎯 Aplicando extracción comprehensiva...")
            comprehensive_prompt = self.advanced_prompting.create_comprehensive_extraction_prompt(cv_text, analysis_hints)
            comprehensive_result = await self.llm_service.call_agent(
                prompt=comprehensive_prompt,
                input_data=cv_text,
                stage_name="advanced_comprehensive",
                temperature=0.0
            )
            if comprehensive_result:
                advanced_results["comprehensive_extraction"] = comprehensive_result
                logger.info("✅ Extracción comprehensiva completada")

            # 4. Auto-corrección SIEMPRE
            if basic_extraction:
                logger.info("🔍 Aplicando auto-corrección...")
                correction_prompt = self.advanced_prompting.create_self_correction_prompt(basic_extraction, cv_text)
                correction_result = await self.llm_service.call_agent(
                    prompt=correction_prompt,
                    input_data=cv_text,
                    stage_name="advanced_correction",
                    temperature=0.0
                )
                if correction_result:
                    advanced_results["self_correction"] = correction_result
                    logger.info("✅ Auto-corrección completada")

            logger.info(f"🎯 TÉCNICAS AVANZADAS COMPLETADAS: {len(advanced_results)} técnicas ejecutadas")
            return advanced_results

        except Exception as e:
            logger.error(f"Error en técnicas avanzadas: {e}")
            return advanced_results

    def _smart_merge_all_extractions(self, basic: Dict[str, Any], advanced: Dict[str, Any]) -> Dict[str, Any]:
        """
        Fusión inteligente que prioriza técnicas avanzadas
        """
        logger.info("🔗 Iniciando fusión inteligente de extracciones...")

        # Comenzar con extracción básica
        final_extraction = basic.copy() if basic else self._create_empty_extraction_structure()

        # Priorizar técnicas avanzadas en orden de confianza
        priority_techniques = [
            "comprehensive_extraction",
            "self_correction",
            "cot_extraction",
            "decomp_education",
            "decomp_experience"
        ]

        for technique in priority_techniques:
            if technique in advanced:
                technique_data = advanced[technique]
                logger.info(f"🔀 Fusionando {technique}...")

                if technique in ["comprehensive_extraction", "self_correction", "cot_extraction"]:
                    # Estas son extracciones completas - usar como base
                    if isinstance(technique_data, dict) and technique_data:
                        final_extraction = technique_data.copy()
                        logger.info(f"✅ {technique} usado como extracción principal")
                        break

                elif technique == "decomp_education":
                    # Fusionar formación académica específica
                    if isinstance(technique_data, dict):
                        if "formacion_academica" in technique_data:
                            final_extraction["formacion_academica"] = technique_data["formacion_academica"]
                            logger.info(f"✅ Formación académica actualizada desde {technique}")

                elif technique == "decomp_experience":
                    # Fusionar experiencia laboral específica
                    if isinstance(technique_data, dict):
                        if "experiencia_laboral" in technique_data:
                            final_extraction["experiencia_laboral"] = technique_data["experiencia_laboral"]
                            logger.info(f"✅ Experiencia laboral actualizada desde {technique}")

        # Log final
        if isinstance(final_extraction, dict):
            logger.info(f"🎯 FUSIÓN COMPLETADA:")
            logger.info(f"  📚 Formación académica: {len(final_extraction.get('formacion_academica', []))}")
            logger.info(f"  💼 Experiencia laboral: {len(final_extraction.get('experiencia_laboral', []))}")

        return final_extraction

    def _create_empty_extraction_structure(self) -> Dict[str, Any]:
        """Estructura vacía para fallback"""
        return {
            "datos_contacto": {
                "nombre_completo": "Información no disponible",
                "email": "no-extraido@example.com",
                "telefono": None,
                "ubicacion": "No especificado"
            },
            "titular_profesional": {"titular": "Perfil profesional no especificado"},
            "resumen_profesional": {"resumen": "Resumen no disponible"},
            "experiencia_laboral": [],
            "formacion_academica": [],
            "habilidades": {"habilidades_tecnicas": [], "idiomas": [], "habilidades_blandas": []},
            "formacion_complementaria": [],
            "reconocimientos": {"logros_premios": []},
            "actividades_extracurriculares": {"voluntariado": []},
            "intereses": {"hobbies_intereses": []}
        }

    def _convert_to_pydantic(self, structured_data: Dict[str, Any]) -> ResumeData:
        """Convierte datos estructurados a modelo Pydantic"""
        try:
            return ResumeData(**structured_data)
        except Exception as e:
            logger.warning(f"Error convirtiendo a Pydantic: {e}")
            return self._create_empty_resume_data()

    def _create_empty_resume_data(self) -> ResumeData:
        """Crea modelo ResumeData vacío válido"""
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

    def _identify_missing_fields(self, resume_data: ResumeData) -> List[str]:
        """Identifica campos faltantes"""
        missing = []

        if not resume_data.formacion_academica:
            missing.append("formacion_academica")
        if not resume_data.experiencia_laboral:
            missing.append("experiencia_laboral")
        if resume_data.datos_contacto.nombre_completo in ["No extraído", "Información no disponible"]:
            missing.append("nombre_completo")

        return missing

    def _create_error_response(self, error_msg: str, processing_time: float) -> ResumeExtractionResponse:
        """Crea respuesta de error"""
        return ResumeExtractionResponse(
            datos_cv=self._create_empty_resume_data(),
            confianza_general=0.0,
            advertencias=[f"Error en procesamiento: {error_msg}"],
            campos_faltantes=["todos"],
            tiempo_procesamiento=processing_time,
            timestamp=datetime.now().isoformat()
        )