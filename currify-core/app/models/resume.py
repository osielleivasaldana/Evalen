from pydantic import BaseModel, Field, validator, ConfigDict
from typing import List, Optional, Dict, Any, Union
from enum import Enum
from datetime import datetime
import re

class ConfidenceLevel(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

class ExtractionMethod(str, Enum):
    DIRECT = "direct"
    INFERRED = "inferred"
    PARSED = "parsed"

class SkillLevel(str, Enum):
    BASICO = "Básico"
    INTERMEDIO = "Intermedio"
    AVANZADO = "Avanzado"
    EXPERTO = "Experto"
    INTERMEDIO_AVANZADO = "Intermedio - Avanzado"

class ExtractionMetadata(BaseModel):
    confidence_level: str = Field(..., description="Nivel de confianza: high, medium, low")
    extraction_method: str = Field(..., description="Método: direct, inferred, parsed")
    source_text: Optional[str] = Field(None, description="Texto original del cual se extrajo")

    model_config = ConfigDict(use_enum_values=True)
    
    @validator('confidence_level', pre=True)
    def validate_confidence(cls, v):
        if isinstance(v, str):
            v_lower = v.lower()
            if v_lower in ['high', 'alto', 'alta']: return ConfidenceLevel.HIGH.value
            if v_lower in ['medium', 'medio', 'media']: return ConfidenceLevel.MEDIUM.value
            if v_lower in ['low', 'bajo', 'baja']: return ConfidenceLevel.LOW.value
        return v

    @validator('extraction_method', pre=True)
    def validate_method(cls, v):
        if isinstance(v, str):
            v_lower = v.lower()
            if v_lower in ['direct', 'directo']: return ExtractionMethod.DIRECT.value
            if v_lower in ['inferred', 'inferido']: return ExtractionMethod.INFERRED.value
            if v_lower in ['parsed', 'parseado']: return ExtractionMethod.PARSED.value
        return v

class Period(BaseModel):
    fecha_inicio: Optional[str] = Field(None, description="Fecha de inicio en formato YYYY-MM o YYYY")
    fecha_fin: Optional[str] = Field(None, description="Fecha de fin en formato YYYY-MM, YYYY o 'Presente'")
    texto_original: Optional[str] = Field(None, description="Texto original del período")
    metadata: Optional[ExtractionMetadata] = None

    @validator('fecha_fin')
    def validate_fecha_fin(cls, v):
        if v and v.lower() in ['presente', 'actual', 'current', 'now']:
            return 'Presente'
        return v

class Skill(BaseModel):
    skill: str = Field(..., description="Nombre de la habilidad")
    level: Optional[str] = Field(None, description="Nivel: Básico, Intermedio, Avanzado, Experto")
    years_experience: Optional[int] = Field(None, description="Años de experiencia")
    metadata: Optional[ExtractionMetadata] = None

    model_config = ConfigDict(use_enum_values=True)

    @validator('level', pre=True)
    def validate_level(cls, v):
        if isinstance(v, str):
            # Normalize common variations to Enum VALUES
            v_lower = v.lower()
            if 'básico' in v_lower or 'basico' in v_lower or 'basic' in v_lower: return SkillLevel.BASICO.value
            if 'intermedio - avanzado' in v_lower: return SkillLevel.INTERMEDIO_AVANZADO.value
            if 'intermedio' in v_lower or 'intermediate' in v_lower: return SkillLevel.INTERMEDIO.value
            if 'avanzado' in v_lower or 'advanced' in v_lower: return SkillLevel.AVANZADO.value
            if 'experto' in v_lower or 'expert' in v_lower: return SkillLevel.EXPERTO.value
        return v

class Language(BaseModel):
    idioma: str = Field(..., description="Nombre del idioma")
    nivel: Optional[str] = Field(None, description="Nivel de competencia (ej: 'C1 Avanzado', 'Nativo')")
    certificacion: Optional[str] = Field(None, description="Certificación si existe")
    metadata: Optional[ExtractionMetadata] = None

# ... (ContactInfo, ProfessionalTitle, ProfessionalSummary remain same)
class ContactInfo(BaseModel):
    nombre_completo: str = Field(..., description="Nombre y apellidos completos del candidato")
    telefono: Optional[str] = Field(None, description="Número de contacto principal")
    email: str = Field(..., description="Dirección de email profesional")
    ubicacion: Optional[str] = Field(None, description="Ciudad y País de residencia")
    metadata: Optional[Dict[str, ExtractionMetadata]] = None

    @validator('email')
    def validate_email_format(cls, v):
        # Relaxed email validation
        if not v or '@' not in v:
            return "no-extraido@example.com"
        return v

    @validator('telefono')
    def validate_phone(cls, v):
        return v

    @validator('nombre_completo')
    def validate_nombre_completo(cls, v):
        if not v or len(v.strip()) < 2:
            return "No extraído"
        return v.strip()

class ProfessionalTitle(BaseModel):
    titular: str = Field(..., description="Frase corta que define el perfil profesional")
    metadata: Optional[ExtractionMetadata] = None

class ProfessionalSummary(BaseModel):
    resumen: Optional[str] = Field(None, description="Párrafo de 3 a 5 líneas resumiendo experiencia y competencias")
    metadata: Optional[ExtractionMetadata] = None

    @validator('resumen', pre=True, always=True)
    def validate_resumen_content(cls, v):
        if v is None:
            return ""
        return str(v)

class WorkExperience(BaseModel):
    cargo: Optional[str] = Field(None, description="Título del puesto ocupado")
    empresa: Optional[str] = Field(None, description="Nombre de la compañía empleadora")
    periodo: Period = Field(..., description="Período de trabajo")
    responsabilidades: List[str] = Field(default=[], description="Lista de responsabilidades y logros del puesto")
    ubicacion: Optional[str] = Field(None, description="Ciudad/País donde se realizó el trabajo")
    metadata: Optional[Dict[str, ExtractionMetadata]] = None

    @validator('cargo', 'empresa', pre=True, always=True)
    def validate_strings(cls, v):
        if v is None: return "No especificado"
        return str(v)

class Education(BaseModel):
    titulo: Optional[str] = Field(None, description="Nombre del grado académico o título obtenido")
    institucion: Optional[str] = Field(None, description="Nombre de la universidad o centro de estudios")
    periodo: Period = Field(..., description="Período de estudios")
    gpa: Optional[str] = Field(None, description="Promedio académico si está disponible")
    ubicacion: Optional[str] = Field(None, description="Ciudad/País de la institución")
    metadata: Optional[Dict[str, ExtractionMetadata]] = None

    @validator('titulo', 'institucion', pre=True, always=True)
    def validate_strings(cls, v):
        if v is None: return "No especificado"
        return str(v)

class Skills(BaseModel):
    habilidades_tecnicas: List[Skill] = Field(default=[], description="Lista de software, herramientas o conocimientos técnicos")
    idiomas: List[Language] = Field(default=[], description="Lista de idiomas y nivel de competencia")
    habilidades_blandas: List[str] = Field(default=[], description="Lista de competencias interpersonales")
    metadata: Optional[Dict[str, ExtractionMetadata]] = None

    model_config = ConfigDict(use_enum_values=True)

    @validator('habilidades_tecnicas', pre=True)
    def validate_tech_skills(cls, v):
        if not v:
            return []
        cleaned = []
        for item in v:
            if isinstance(item, str):
                cleaned.append({'skill': item, 'level': None})
            elif isinstance(item, dict):
                cleaned.append(item)
            else:
                cleaned.append(item)
        return cleaned

# ... (OnlineProfiles, AdditionalTraining, etc remain same)
class OnlineProfiles(BaseModel):
    linkedin: Optional[str] = Field(None, description="URL del perfil de LinkedIn")
    portfolio: Optional[str] = Field(None, description="URL del portafolio o sitio web")
    github: Optional[str] = Field(None, description="URL del perfil de GitHub")
    otros: Optional[Dict[str, str]] = Field(None, description="Otros perfiles profesionales")
    metadata: Optional[Dict[str, ExtractionMetadata]] = None

    @validator('linkedin')
    def validate_linkedin(cls, v):
        return v

    @validator('github')
    def validate_github(cls, v):
        return v

    @validator('portfolio')
    def validate_portfolio(cls, v):
        return v

class AdditionalTraining(BaseModel):
    certificaciones_cursos: List[str] = Field(default=[], description="Lista de certificaciones y cursos relevantes")
    metadata: Optional[ExtractionMetadata] = None

class Recognition(BaseModel):
    logros_premios: List[str] = Field(default=[], description="Lista de premios, publicaciones o reconocimientos")
    metadata: Optional[ExtractionMetadata] = None

class ExtracurricularActivities(BaseModel):
    voluntariado: List[str] = Field(default=[], description="Experiencia de voluntariado")
    metadata: Optional[ExtractionMetadata] = None

class Interests(BaseModel):
    hobbies_intereses: List[str] = Field(default=[], description="Lista de intereses personales")
    metadata: Optional[ExtractionMetadata] = None

class ResumeData(BaseModel):
    datos_contacto: ContactInfo = Field(..., description="Información de contacto del candidato")
    titular_profesional: ProfessionalTitle = Field(..., description="Titular o headline profesional")
    resumen_profesional: ProfessionalSummary = Field(..., description="Resumen ejecutivo del perfil")
    experiencia_laboral: List[WorkExperience] = Field(..., description="Historial de experiencia laboral")
    formacion_academica: List[Education] = Field(..., description="Educación formal del candidato")
    
    # Relaxed type for habilidades to handle string inputs
    habilidades: Union[Skills, Dict[str, Any], str] = Field(default_factory=lambda: Skills(), description="Conjunto de habilidades técnicas y blandas")

    perfiles_online: Optional[OnlineProfiles] = Field(None, description="Perfiles en redes profesionales")
    formacion_complementaria: Optional[AdditionalTraining] = Field(None, description="Certificaciones y cursos adicionales")
    reconocimientos: Optional[Recognition] = Field(None, description="Premios y logros destacados")
    actividades_extracurriculares: Optional[ExtracurricularActivities] = Field(None, description="Voluntariado y actividades")
    intereses: Optional[Interests] = Field(None, description="Hobbies e intereses personales")

    metadata_procesamiento: Optional[Dict[str, Any]] = Field(None, description="Información sobre el procesamiento del CV")

    model_config = ConfigDict(use_enum_values=True)

    @validator('habilidades', pre=True)
    def parse_habilidades(cls, v):
        if isinstance(v, str):
            try:
                import json
                # Try parsing if it's a JSON string
                if v.strip().startswith('{'):
                    v = json.loads(v)
            except:
                pass
        
        if isinstance(v, dict):
             # Ensure lists exist
             if 'habilidades_tecnicas' not in v: v['habilidades_tecnicas'] = []
             if 'idiomas' not in v: v['idiomas'] = []
             if 'habilidades_blandas' not in v: v['habilidades_blandas'] = []
             return Skills(**v)
             
        return v

    @validator('experiencia_laboral', pre=True)
    def validate_experiencia_laboral(cls, v):
        return v if v else []

    @validator('formacion_academica', pre=True)
    def validate_formacion_academica(cls, v):
        return v if v else []


    def get_años_experiencia(self) -> int:
        """Calcula los años totales de experiencia laboral"""
        total_años = 0
        for exp in self.experiencia_laboral:
            if exp.periodo.fecha_inicio and exp.periodo.fecha_fin:
                try:
                    año_inicio = int(exp.periodo.fecha_inicio[:4])
                    if exp.periodo.fecha_fin.lower() == 'presente':
                        año_fin = datetime.now().year
                    else:
                        año_fin = int(exp.periodo.fecha_fin[:4])
                    total_años += max(0, año_fin - año_inicio)
                except (ValueError, IndexError):
                    continue
        return total_años

    def get_skills_summary(self) -> Dict[str, int]:
        """Resumen de habilidades por categoría"""
        return {
            'técnicas': len(self.habilidades.habilidades_tecnicas),
            'idiomas': len(self.habilidades.idiomas),
            'blandas': len(self.habilidades.habilidades_blandas)
        }

# Modelos para requests y responses
class ResumeExtractionRequest(BaseModel):
    archivo_contenido: str = Field(..., description="Contenido del CV extraído del archivo")
    tipo_archivo: str = Field(..., description="Tipo de archivo (pdf, docx, txt)")
    nombre_archivo: str = Field(..., description="Nombre original del archivo")
    configuracion: Optional[Dict[str, Any]] = Field(None, description="Configuraciones específicas de extracción")

class ResumeExtractionResponse(BaseModel):
    datos_cv: ResumeData = Field(..., description="Datos estructurados del CV")
    confianza_general: float = Field(..., description="Nivel de confianza general de la extracción (0.0-1.0)")
    advertencias: List[str] = Field(default=[], description="Advertencias durante el procesamiento")
    campos_faltantes: List[str] = Field(default=[], description="Campos obligatorios no encontrados")
    tiempo_procesamiento: float = Field(..., description="Tiempo de procesamiento en segundos")
    timestamp: datetime = Field(default_factory=datetime.now, description="Momento de procesamiento")

# Partial models for chunked extraction
class PartialContactInfo(BaseModel):
    nombre_completo: Optional[str] = Field(None, description="Nombre y apellidos (o None)")
    telefono: Optional[str] = Field(None, description="Teléfono (o None)")
    email: Optional[str] = Field(None, description="Email (o None)")
    ubicacion: Optional[str] = Field(None, description="Ubicación (o None)")
    metadata: Optional[Dict[str, ExtractionMetadata]] = None

    @validator('nombre_completo', pre=True)
    def validate_nc(cls, v): return v

    @validator('email', pre=True)
    def validate_email(cls, v): return v

class PartialProfessionalTitle(BaseModel):
    titular: Optional[str] = Field(None, description="Titular (o None)")
    metadata: Optional[ExtractionMetadata] = None
    
    @validator('titular', pre=True)
    def validate_titular(cls, v): return v

class PartialProfessionalSummary(BaseModel):
    resumen: Optional[str] = Field(None, description="Resumen (o None)")
    metadata: Optional[ExtractionMetadata] = None
    
    @validator('resumen', pre=True)
    def validate_resumen(cls, v): return v

class PartialResumeData(BaseModel):
    datos_contacto: Optional[PartialContactInfo] = Field(None, description="Información de contacto parcial")
    titular_profesional: Optional[PartialProfessionalTitle] = Field(None, description="Titular parcial")
    resumen_profesional: Optional[PartialProfessionalSummary] = Field(None, description="Resumen parcial")
    experiencia_laboral: Optional[List[WorkExperience]] = Field(default=[], description="Experiencia laboral parcial")
    formacion_academica: Optional[List[Education]] = Field(default=[], description="Formación académica parcial")
    habilidades: Optional[Union[Skills, Dict[str, Any], str]] = Field(default_factory=lambda: Skills(), description="Habilidades parciales")
    perfiles_online: Optional[OnlineProfiles] = Field(None, description="Perfiles online parciales")
    formacion_complementaria: Optional[AdditionalTraining] = Field(None, description="Formación comp. parcial")
    reconocimientos: Optional[Recognition] = Field(None, description="Reconocimientos parciales")
    actividades_extracurriculares: Optional[ExtracurricularActivities] = Field(None, description="Actividades parciales")
    intereses: Optional[Interests] = Field(None, description="Intereses parciales")
    metadata_procesamiento: Optional[Dict[str, Any]] = None

    model_config = ConfigDict(use_enum_values=True)

    @validator('habilidades', pre=True)
    def parse_habilidades(cls, v):
        if isinstance(v, str):
            try:
                import json
                if v.strip().startswith('{'):
                    v = json.loads(v)
            except:
                pass
        
        if isinstance(v, dict):
             if 'habilidades_tecnicas' not in v: v['habilidades_tecnicas'] = []
             if 'idiomas' not in v: v['idiomas'] = []
             if 'habilidades_blandas' not in v: v['habilidades_blandas'] = []
             return Skills(**v)
        return v
    
    @validator('experiencia_laboral', pre=True)
    def validate_experiencia_laboral(cls, v):
        return v if v else []

    @validator('formacion_academica', pre=True)
    def validate_formacion_academica(cls, v):
        return v if v else []

class ErrorResponse(BaseModel):
    error: str = Field(..., description="Descripción del error")
    detail: Optional[str] = Field(None, description="Detalles adicionales del error")
    timestamp: datetime = Field(default_factory=datetime.now, description="Momento del error")