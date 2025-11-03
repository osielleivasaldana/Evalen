from pydantic import BaseModel, Field, validator
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
    confidence_level: ConfidenceLevel = Field(..., description="Nivel de confianza en la extracción")
    extraction_method: ExtractionMethod = Field(..., description="Método usado para extraer el dato")
    source_text: Optional[str] = Field(None, description="Texto original del cual se extrajo")

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
    level: Optional[SkillLevel] = Field(None, description="Nivel de competencia")
    years_experience: Optional[int] = Field(None, description="Años de experiencia")
    metadata: Optional[ExtractionMetadata] = None

class Language(BaseModel):
    idioma: str = Field(..., description="Nombre del idioma")
    nivel: str = Field(..., description="Nivel de competencia (ej: 'C1 Avanzado', 'Nativo')")
    certificacion: Optional[str] = Field(None, description="Certificación si existe")
    metadata: Optional[ExtractionMetadata] = None

# Secciones Obligatorias
class ContactInfo(BaseModel):
    nombre_completo: str = Field(..., description="Nombre y apellidos completos del candidato")
    telefono: Optional[str] = Field(None, description="Número de contacto principal")
    email: str = Field(..., description="Dirección de email profesional")
    ubicacion: Optional[str] = Field(None, description="Ciudad y País de residencia")
    metadata: Optional[Dict[str, ExtractionMetadata]] = None

    @validator('email')
    def validate_email_format(cls, v):
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, v):
            raise ValueError('Formato de email inválido')
        return v

    @validator('telefono')
    def validate_phone(cls, v):
        if v:
            # Limpiar el teléfono de caracteres no numéricos excepto + y espacios
            cleaned = re.sub(r'[^\d+\s\-\(\)]', '', v)
            if len(cleaned.replace(' ', '').replace('-', '').replace('(', '').replace(')', '')) < 7:
                raise ValueError('Número de teléfono muy corto')
        return v

    @validator('nombre_completo')
    def validate_nombre_completo(cls, v):
        if len(v.strip()) < 2:
            raise ValueError('Nombre completo muy corto')
        # Validar que contenga al menos 2 palabras
        palabras = v.strip().split()
        if len(palabras) < 2:
            raise ValueError('Debe incluir nombre y apellido')
        return v.strip()

class ProfessionalTitle(BaseModel):
    titular: str = Field(..., description="Frase corta que define el perfil profesional")
    metadata: Optional[ExtractionMetadata] = None

class ProfessionalSummary(BaseModel):
    resumen: str = Field(..., description="Párrafo de 3 a 5 líneas resumiendo experiencia y competencias")
    metadata: Optional[ExtractionMetadata] = None

class WorkExperience(BaseModel):
    cargo: str = Field(..., description="Título del puesto ocupado")
    empresa: str = Field(..., description="Nombre de la compañía empleadora")
    periodo: Period = Field(..., description="Período de trabajo")
    responsabilidades: List[str] = Field(default=[], description="Lista de responsabilidades y logros del puesto")
    ubicacion: Optional[str] = Field(None, description="Ciudad/País donde se realizó el trabajo")
    metadata: Optional[Dict[str, ExtractionMetadata]] = None

class Education(BaseModel):
    titulo: str = Field(..., description="Nombre del grado académico o título obtenido")
    institucion: str = Field(..., description="Nombre de la universidad o centro de estudios")
    periodo: Period = Field(..., description="Período de estudios")
    gpa: Optional[str] = Field(None, description="Promedio académico si está disponible")
    ubicacion: Optional[str] = Field(None, description="Ciudad/País de la institución")
    metadata: Optional[Dict[str, ExtractionMetadata]] = None

class Skills(BaseModel):
    habilidades_tecnicas: List[Skill] = Field(default=[], description="Lista de software, herramientas o conocimientos técnicos")
    idiomas: List[Language] = Field(default=[], description="Lista de idiomas y nivel de competencia")
    habilidades_blandas: List[str] = Field(default=[], description="Lista de competencias interpersonales")
    metadata: Optional[Dict[str, ExtractionMetadata]] = None

# Secciones Opcionales
class OnlineProfiles(BaseModel):
    linkedin: Optional[str] = Field(None, description="URL del perfil de LinkedIn")
    portfolio: Optional[str] = Field(None, description="URL del portafolio o sitio web")
    github: Optional[str] = Field(None, description="URL del perfil de GitHub")
    otros: Optional[Dict[str, str]] = Field(None, description="Otros perfiles profesionales")
    metadata: Optional[Dict[str, ExtractionMetadata]] = None

    @validator('linkedin')
    def validate_linkedin(cls, v):
        if v and 'linkedin.com' not in v.lower():
            raise ValueError('URL de LinkedIn inválida')
        return v

    @validator('github')
    def validate_github(cls, v):
        if v and 'github.com' not in v.lower():
            raise ValueError('URL de GitHub inválida')
        return v

    @validator('portfolio')
    def validate_portfolio(cls, v):
        if v:
            url_pattern = r'^https?://'
            if not re.match(url_pattern, v, re.IGNORECASE):
                # Agregar https:// si no está presente
                v = 'https://' + v
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

# Modelo principal del CV
class ResumeData(BaseModel):
    # Secciones obligatorias
    datos_contacto: ContactInfo = Field(..., description="Información de contacto del candidato")
    titular_profesional: ProfessionalTitle = Field(..., description="Titular o headline profesional")
    resumen_profesional: ProfessionalSummary = Field(..., description="Resumen ejecutivo del perfil")
    experiencia_laboral: List[WorkExperience] = Field(..., description="Historial de experiencia laboral")
    formacion_academica: List[Education] = Field(..., description="Educación formal del candidato")
    habilidades: Skills = Field(default_factory=lambda: Skills(), description="Conjunto de habilidades técnicas y blandas")

    # Secciones opcionales
    perfiles_online: Optional[OnlineProfiles] = Field(None, description="Perfiles en redes profesionales")
    formacion_complementaria: Optional[AdditionalTraining] = Field(None, description="Certificaciones y cursos adicionales")
    reconocimientos: Optional[Recognition] = Field(None, description="Premios y logros destacados")
    actividades_extracurriculares: Optional[ExtracurricularActivities] = Field(None, description="Voluntariado y actividades")
    intereses: Optional[Interests] = Field(None, description="Hobbies e intereses personales")

    # Metadatos de procesamiento
    metadata_procesamiento: Optional[Dict[str, Any]] = Field(None, description="Información sobre el procesamiento del CV")

    @validator('experiencia_laboral')
    def validate_experiencia_laboral(cls, v):
        # Permitir arrays vacíos - será reportado como advertencia en lugar de error
        return v if v else []

    @validator('formacion_academica')
    def validate_formacion_academica(cls, v):
        # Permitir arrays vacíos - será reportado como advertencia en lugar de error
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

class ErrorResponse(BaseModel):
    error: str = Field(..., description="Descripción del error")
    detail: Optional[str] = Field(None, description="Detalles adicionales del error")
    timestamp: datetime = Field(default_factory=datetime.now, description="Momento del error")