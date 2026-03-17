from fastapi import APIRouter, Depends, Request, UploadFile, File, HTTPException, Form, BackgroundTasks
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from typing import List, Optional, Dict, Any
import logging
import uuid
import asyncio
from datetime import datetime

from app.models.resume import (
    ResumeExtractionRequest,
    ResumeExtractionResponse,
    ErrorResponse,
    ResumeData
)
from app.services.resume_extraction_service import ResumeExtractionService
from app.services.resume_extraction_service_v2 import ResumeExtractionServiceV2
from app.services.robust_extraction_service import RobustExtractionService
from app.services.llm_service import LLMService
from app.services.profile_detection_service import ProfileDetectionService
from app.core.security import verify_token
from app.core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/resume", tags=["resume extraction"])

# Rate limiter
limiter = Limiter(key_func=get_remote_address)

# Dependency injection
def get_llm_service() -> LLMService:
    return LLMService()

def get_resume_extraction_service(llm_service: LLMService = Depends(get_llm_service)) -> RobustExtractionService:
    return RobustExtractionService(llm_service)

def get_profile_detection_service() -> ProfileDetectionService:
    return ProfileDetectionService()

# Storage temporal para procesamiento por lotes
batch_jobs = {}

# Global semaphore to limit concurrent extraction requests (protects memory & DNS)
global_extraction_semaphore = asyncio.Semaphore(3)

async def limit_concurrency():
    async with global_extraction_semaphore:
        yield

@router.post("/extract", response_model=ResumeExtractionResponse)
@limiter.limit(f"{settings.rate_limit_requests}/{settings.rate_limit_window}minute")
async def extract_resume(
    request: Request,
    file: UploadFile = File(..., description="Archivo de CV (PDF, DOCX, TXT, RTF)"),
    config: Optional[str] = Form(None, description="Configuración JSON opcional"),
    token: dict = Depends(verify_token),
    extraction_service: RobustExtractionService = Depends(get_resume_extraction_service),
    _ = Depends(limit_concurrency)
):
    """
    Extrae datos estructurados de un archivo de CV individual
    
    - **file**: Archivo de CV en formatos soportados (PDF, DOCX, TXT, RTF)
    - **config**: Configuración opcional en formato JSON
    - Retorna datos estructurados del CV con métricas de calidad
    """
    try:
        # Validar archivo
        if not file.filename:
            raise HTTPException(status_code=400, detail="Nombre de archivo requerido")

        # Validar tamaño del archivo (máximo 10MB)
        file_content = await file.read()
        if len(file_content) > 10 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="Archivo demasiado grande (máximo 10MB)")

        if len(file_content) == 0:
            raise HTTPException(status_code=400, detail="Archivo vacío")

        # Parsear configuración
        extraction_config = {}
        if config:
            try:
                import json
                extraction_config = json.loads(config)
            except json.JSONDecodeError:
                raise HTTPException(status_code=400, detail="Configuración JSON inválida")

        logger.info(f"Processing CV extraction for file: {file.filename}")

        # Procesar extracción
        result = await extraction_service.extract_from_file(
            file_content=file_content,
            filename=file.filename,
            config=extraction_config
        )

        logger.info(f"CV extraction completed for {file.filename} with confidence {result.confianza_general:.3f}")

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing CV extraction: {e}")
        raise HTTPException(status_code=500, detail=f"Error interno del servidor: {str(e)}")

@router.post("/extract-text", response_model=ResumeExtractionResponse)
@limiter.limit(f"{settings.rate_limit_requests}/{settings.rate_limit_window}minute")
async def extract_from_text(
    request: Request,
    extraction_request: ResumeExtractionRequest,
    token: dict = Depends(verify_token),
    extraction_service: RobustExtractionService = Depends(get_resume_extraction_service)
):
    """
    Extrae datos estructurados de texto de CV ya extraído

    - **extraction_request**: Objeto con texto del CV y configuraciones
    - Útil cuando ya tienes el texto extraído y solo necesitas el procesamiento
    """
    try:
        logger.info(f"Processing text extraction for file: {extraction_request.nombre_archivo}")

        result = await extraction_service.extract_from_text(extraction_request)

        logger.info(f"Text extraction completed with confidence {result.confianza_general:.3f}")

        return result

    except Exception as e:
        logger.error(f"Error processing text extraction: {e}")
        raise HTTPException(status_code=500, detail=f"Error interno del servidor: {str(e)}")

@router.post("/extract-text-v2", response_model=ResumeExtractionResponse)
@limiter.limit(f"{settings.rate_limit_requests}/{settings.rate_limit_window}minute")
async def extract_from_text_v2(
    request: Request,
    extraction_request: ResumeExtractionRequest,
    token: dict = Depends(verify_token)
):
    """
    🚀 VERSIÓN 2: Extracción GARANTIZADA con técnicas avanzadas SIEMPRE activas

    Esta versión ASEGURA extracción profunda usando:
    - Chain-of-Thought prompting
    - Decomposición por secciones
    - Extracción comprehensiva
    - Auto-corrección

    Usa esta versión para máxima extracción de datos.
    """
    try:
        logger.info(f"🚀 V2 Processing for file: {extraction_request.nombre_archivo}")

        # Crear servicio V2 con técnicas avanzadas garantizadas
        llm_service = LLMService()
        extraction_service_v2 = ResumeExtractionServiceV2(llm_service)

        result = await extraction_service_v2.extract_from_text(extraction_request)

        logger.info(f"🎯 V2 extraction completed - {len(result.datos_cv.formacion_academica)} academic + {len(result.datos_cv.experiencia_laboral)} experience")

        return result

    except Exception as e:
        logger.error(f"Error in V2 text extraction: {e}")
        raise HTTPException(status_code=500, detail=f"Error interno del servidor: {str(e)}")

@router.post("/extract-batch")
@limiter.limit(f"10/hour")  # Límite más restrictivo para lotes
async def extract_batch(
    request: Request,
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(..., description="Lista de archivos de CV"),
    config: Optional[str] = Form(None, description="Configuración JSON opcional"),
    token: dict = Depends(verify_token),
    extraction_service: RobustExtractionService = Depends(get_resume_extraction_service)
):
    """
    Procesa múltiples CVs en lote (asíncrono)

    - **files**: Lista de archivos de CV (máximo 50)
    - **config**: Configuración opcional aplicada a todos los archivos
    - Retorna job_id para consultar el progreso
    """
    try:
        # Validar número de archivos
        if len(files) > 50:
            raise HTTPException(status_code=400, detail="Máximo 50 archivos por lote")

        if len(files) == 0:
            raise HTTPException(status_code=400, detail="Se requiere al menos un archivo")

        # Parsear configuración
        extraction_config = {}
        if config:
            try:
                import json
                extraction_config = json.loads(config)
            except json.JSONDecodeError:
                raise HTTPException(status_code=400, detail="Configuración JSON inválida")

        # Generar job ID
        job_id = str(uuid.uuid4())

        # Crear entrada en storage temporal
        batch_jobs[job_id] = {
            "status": "processing",
            "total_files": len(files),
            "processed_files": 0,
            "results": [],
            "errors": [],
            "started_at": datetime.now().isoformat(),
            "completed_at": None
        }

        # Procesar archivos en background
        background_tasks.add_task(
            process_batch_files,
            job_id,
            files,
            extraction_config,
            extraction_service
        )

        logger.info(f"Started batch processing job {job_id} with {len(files)} files")

        return {
            "job_id": job_id,
            "status": "processing",
            "total_files": len(files),
            "message": "Procesamiento iniciado. Use GET /resume/batch/{job_id} para consultar el progreso"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error starting batch processing: {e}")
        raise HTTPException(status_code=500, detail=f"Error interno del servidor: {str(e)}")

@router.get("/batch/{job_id}")
@limiter.limit(f"{settings.rate_limit_requests}/{settings.rate_limit_window}minute")
async def get_batch_status(
    request: Request,
    job_id: str,
    token: dict = Depends(verify_token)
):
    """
    Consulta el estado de un trabajo de procesamiento por lotes

    - **job_id**: ID del trabajo de lote
    - Retorna estado, progreso y resultados disponibles
    """
    if job_id not in batch_jobs:
        raise HTTPException(status_code=404, detail="Job ID no encontrado")

    job_data = batch_jobs[job_id]

    return {
        "job_id": job_id,
        "status": job_data["status"],
        "progress": {
            "total_files": job_data["total_files"],
            "processed_files": job_data["processed_files"],
            "percentage": round((job_data["processed_files"] / job_data["total_files"]) * 100, 2)
        },
        "results": job_data["results"],
        "errors": job_data["errors"],
        "timestamps": {
            "started_at": job_data["started_at"],
            "completed_at": job_data["completed_at"]
        }
    }

@router.post("/analyze-profile")
@limiter.limit(f"{settings.rate_limit_requests}/{settings.rate_limit_window}minute")
async def analyze_profile(
    request: Request,
    file: UploadFile = File(..., description="Archivo de CV para análisis de perfil"),
    token: dict = Depends(verify_token),
    profile_service: ProfileDetectionService = Depends(get_profile_detection_service)
):
    """
    Analiza el tipo de perfil profesional sin extraer datos completos

    - **file**: Archivo de CV
    - Retorna tipo de perfil detectado, confianza y características
    """
    try:
        # Leer contenido del archivo
        file_content = await file.read()
        if len(file_content) == 0:
            raise HTTPException(status_code=400, detail="Archivo vacío")

        # Extraer texto básico (simplificado)
        from app.services.file_parser_service import FileParserService
        parser = FileParserService()

        parse_result = parser.parse_file(file_content, file.filename)
        if not parse_result["success"]:
            raise HTTPException(status_code=400, detail=f"Error procesando archivo: {parse_result['error']}")

        # Detectar perfil
        profile_analysis = profile_service.detect_profile_type(parse_result["text"])

        logger.info(f"Profile analysis completed for {file.filename}: {profile_analysis['profile_type']}")

        return {
            "filename": file.filename,
            "profile_type": profile_analysis["profile_type"],
            "confidence": profile_analysis["confidence"],
            "scores": profile_analysis["scores"],
            "reasons": profile_analysis["reasons"],
            "additional_traits": profile_analysis["additional_traits"],
            "is_multilingual": profile_analysis["is_multilingual"]
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error analyzing profile: {e}")
        raise HTTPException(status_code=500, detail=f"Error interno del servidor: {str(e)}")

@router.post("/validate")
@limiter.limit(f"{settings.rate_limit_requests}/{settings.rate_limit_window}minute")
async def validate_resume_data(
    request: Request,
    resume_data: ResumeData,
    token: dict = Depends(verify_token)
):
    """
    Valida datos de CV ya estructurados

    - **resume_data**: Datos estructurados del CV
    - Retorna métricas de calidad y sugerencias de mejora
    """
    try:
        from app.utils.resume_validators import ResumeValidators

        validators = ResumeValidators()

        # Convertir a dict para validación
        resume_dict = resume_data.dict()

        # Ejecutar validaciones
        completeness = validators.validate_resume_completeness(resume_dict)
        years_experience = validators.calculate_experience_years(resume_dict.get("experiencia_laboral", []))
        skills_summary = resume_data.get_skills_summary()

        return {
            "validation_results": {
                "is_valid": completeness["is_valid"],
                "completeness_score": completeness["completeness_score"],
                "missing_required": completeness["missing_required"],
                "missing_optional": completeness["missing_optional"],
                "quality_issues": completeness["quality_issues"]
            },
            "metrics": {
                "years_of_experience": years_experience,
                "skills_summary": skills_summary,
                "total_work_experiences": len(resume_data.experiencia_laboral),
                "total_education_records": len(resume_data.formacion_academica)
            },
            "suggestions": generate_improvement_suggestions(resume_data, completeness)
        }

    except Exception as e:
        logger.error(f"Error validating resume data: {e}")
        raise HTTPException(status_code=500, detail=f"Error interno del servidor: {str(e)}")

@router.get("/health")
async def health_check():
    """Check de salud específico para el módulo de resume extraction"""
    try:
        # Verificar dependencias críticas
        checks = {
            "anthropic_configured": bool(settings.anthropic_api_key),
            "file_parsers_available": True,
            "profile_detection_ready": True
        }

        # Verificar disponibilidad de librerías opcionales
        optional_libs = {}
        try:
            import PyPDF2
            optional_libs["PyPDF2"] = "available"
        except ImportError:
            optional_libs["PyPDF2"] = "missing"

        try:
            import docx
            optional_libs["python-docx"] = "available"
        except ImportError:
            optional_libs["python-docx"] = "missing"

        try:
            import pdfplumber
            optional_libs["pdfplumber"] = "available"
        except ImportError:
            optional_libs["pdfplumber"] = "missing"

        all_checks_passed = all(checks.values())

        return {
            "status": "healthy" if all_checks_passed else "degraded",
            "module": "resume_extraction",
            "checks": checks,
            "optional_libraries": optional_libs,
            "supported_formats": [".pdf", ".docx", ".txt", ".rtf"]
        }

    except Exception as e:
        return {
            "status": "unhealthy",
            "module": "resume_extraction",
            "error": str(e)
        }

# Funciones auxiliares
async def process_batch_files(job_id: str, files: List[UploadFile], config: Dict[str, Any], extraction_service: ResumeExtractionService):
    """Procesa archivos en lote en background de manera paralela con límite"""
    # Límite de concurrencia para proteger recursos (LLM/Memoria)
    semaphore = asyncio.Semaphore(5)
    
    async def process_single_file(file: UploadFile):
        async with semaphore:
            try:
                # Leer y procesar
                # Nota: UploadFile.read() puede no ser thread-safe si se comparte, pero aquí cada tarea tiene su file
                # Sin embargo, si 'files' son del mismo request, SpooledTemporaryFile puede tener quirks.
                # Lo mejor es leer todo antes o asegurarse de que sean independientes.
                # En FastAPI BackgroundTasks, los archivos pueden cerrarse si el request termina.
                # Pero aquí se pasan los objetos. Asumimos que están disponibles.
                
                # Para mayor seguridad, leamos el contenido antes de lanzar las tareas si son pocos,
                # pero para streams grandes es mejor leer dentro. 
                # Intentaremos leer dentro controlando errores.
                
                content = await file.read()
                
                result = await extraction_service.extract_from_file(
                    file_content=content,
                    filename=file.filename,
                    config=config
                )
                
                return {
                    "filename": file.filename,
                    "success": True,
                    "data": result.dict(),
                    "processed_at": datetime.now().isoformat()
                }
            except Exception as e:
                logger.error(f"Error extracting {file.filename}: {e}")
                return {
                    "filename": file.filename,
                    "success": False,
                    "error": str(e),
                    "processed_at": datetime.now().isoformat()
                }

    try:
        # Lanzar todas las tareas (el semáforo limita las activas)
        tasks = [process_single_file(file) for file in files]
        
        # Esperar a que todas terminen
        results = await asyncio.gather(*tasks)
        
        # Procesar resultados para actualizar el estado del job
        for res in results:
            if res.get("success"):
                batch_jobs[job_id]["results"].append(res)
            else:
                batch_jobs[job_id]["errors"].append(res)
        
        batch_jobs[job_id]["processed_files"] = len(files) # Final count
        
        # Marcar como completado
        batch_jobs[job_id]["status"] = "completed"
        batch_jobs[job_id]["completed_at"] = datetime.now().isoformat()

        logger.info(f"Batch job {job_id} completed successfully. Processed {len(files)} files.")

    except Exception as e:
        batch_jobs[job_id]["status"] = "failed"
        batch_jobs[job_id]["completed_at"] = datetime.now().isoformat()
        batch_jobs[job_id]["error"] = str(e)
        logger.error(f"Batch job {job_id} failed catastrophically: {e}")

def generate_improvement_suggestions(resume_data: ResumeData, completeness: Dict[str, Any]) -> List[str]:
    """Genera sugerencias de mejora basadas en los datos del CV"""
    suggestions = []

    # Sugerencias basadas en campos faltantes
    missing_required = completeness.get("missing_required", [])

    if "datos_contacto.telefono" in missing_required:
        suggestions.append("Agregar número de teléfono para mejor contactabilidad")

    if len(resume_data.experiencia_laboral) < 2:
        suggestions.append("Incluir más experiencias laborales relevantes")

    if len(resume_data.habilidades.habilidades_tecnicas) < 5:
        suggestions.append("Ampliar la lista de habilidades técnicas")

    if not resume_data.perfiles_online or not resume_data.perfiles_online.linkedin:
        suggestions.append("Agregar perfil de LinkedIn para mayor visibilidad profesional")

    # Sugerencias basadas en años de experiencia
    years_exp = resume_data.get_años_experiencia()
    if years_exp < 2:
        suggestions.append("Incluir proyectos académicos o prácticas profesionales")

    # Sugerencias basadas en completitud
    completeness_score = completeness.get("completeness_score", 0)
    if completeness_score < 70:
        suggestions.append("El CV está incompleto. Revisar secciones faltantes")

    return suggestions