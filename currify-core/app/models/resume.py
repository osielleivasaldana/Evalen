from pydantic import BaseModel, Field, validator, ConfigDict, model_validator
from typing import List, Optional, Dict, Any, Union
from enum import Enum
from datetime import datetime
import re

class SectionType(str, Enum):
    """Tipos de sección detectables en un CV"""
    PERSONAL_INFO = "personal_info"
    SUMMARY = "summary"
    EXPERIENCE = "experience"
    EDUCATION = "education"
    TITLES = "titles"
    SKILLS = "skills"
    LANGUAGES = "languages"
    CERTIFICATIONS = "certifications"
    PROJECTS = "projects"
    AWARDS = "awards"
    VOLUNTEER = "volunteer"
    INTERESTS = "interests"
    REFERENCES = "references"
    OTHER = "other"


class SectionDetection(BaseModel):
    """Resultado de detección de sección por DocumentAnalyzerService"""
    section_type: SectionType = Field(..., description="Tipo clasificado de la sección")
    section_name: str = Field(..., description="Nombre original del header en el CV")
    start_line: int = Field(..., description="Línea de inicio (0-indexed)")
    end_line: int = Field(..., description="Línea de fin (exclusiva)")
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)


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

BAD_DATE_VALUES = {"nan", "none", "null", "nat", "n/a", "n/a ", "na", "no especificado", "unknown", "string", "no extraído", "", " "}

class Period(BaseModel):
    fecha_inicio: Optional[str] = Field(None, description="Fecha de inicio en formato YYYY-MM o YYYY")
    fecha_fin: Optional[str] = Field(None, description="Fecha de fin en formato YYYY-MM, YYYY o 'Presente'")
    texto_original: Optional[str] = Field(None, description="Texto original del período")
    metadata: Optional[ExtractionMetadata] = None

    @validator('fecha_inicio', pre=True, always=True)
    def validate_fecha_inicio(cls, v):
        if v is None:
            return None
        s = str(v).strip().lower()
        if s in BAD_DATE_VALUES:
            return None
        return str(v).strip()

    @validator('fecha_fin', pre=True, always=True)
    def validate_fecha_fin(cls, v):
        if v is None:
            return None
        s = str(v).strip().lower()
        if s in BAD_DATE_VALUES:
            return None
        if s in ['presente', 'actual', 'current', 'now', 'actualidad', 'hoy', 'vigente', 'a la fecha', 'ongoing']:
            return 'Presente'
        return str(v).strip()

class Skill(BaseModel):
    skill: str = Field("No especificado", description="Nombre de la habilidad")
    level: Optional[str] = Field(None, description="Nivel: Básico, Intermedio, Avanzado, Experto")
    years_experience: Optional[int] = Field(None, description="Años de experiencia")
    metadata: Optional[ExtractionMetadata] = None

    model_config = ConfigDict(use_enum_values=True)

    @validator('skill', pre=True, always=True)
    def validate_skill(cls, v):
        if not v: return "No especificado"
        return str(v)

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
    idioma: str = Field("No especificado", description="Nombre del idioma")
    nivel: Optional[str] = Field(None, description="Nivel de competencia (ej: 'C1 Avanzado', 'Nativo')")
    certificacion: Optional[str] = Field(None, description="Certificación si existe")
    metadata: Optional[ExtractionMetadata] = None

    @validator('idioma', pre=True, always=True)
    def validate_idioma(cls, v):
        if not v: return "No especificado"
        return str(v)

# ... (ContactInfo, ProfessionalTitle, ProfessionalSummary remain same)
class ContactInfo(BaseModel):
    nombre_completo: str = Field("No extraído", description="Nombre y apellidos completos del candidato")
    telefono: Optional[str] = Field(None, description="Número de contacto principal")
    email: str = Field("no-extraido@example.com", description="Dirección de email profesional")
    ubicacion: Optional[str] = Field(None, description="Ciudad y País de residencia")
    metadata: Optional[Dict[str, ExtractionMetadata]] = None

    @validator('email', pre=True, always=True)
    def validate_email_format(cls, v):
        # Handle empty lists returned by Gemini
        if isinstance(v, list) and len(v) == 0:
            v = None
        # Relaxed email validation
        v_str = str(v) if v is not None else ""
        if not v_str or '@' not in v_str:
            return "no-extraido@example.com"
        return v_str

    @validator('telefono', pre=True, always=True)
    def validate_phone(cls, v):
        # Handle empty lists returned by Gemini
        if isinstance(v, list) and len(v) == 0:
            v = None
        if not v:
            return None
        return str(v)

    @validator('ubicacion', pre=True, always=True)
    def validate_ubicacion(cls, v):
        if not v:
            return None
        return str(v)

    @validator('nombre_completo', pre=True, always=True)
    def validate_nombre_completo(cls, v):
        if not v or len(str(v).strip()) < 2:
            return "No extraído"
        return str(v).strip()

class ProfessionalTitle(BaseModel):
    titular: str = Field("No extraído", description="Frase corta que define el perfil profesional")
    metadata: Optional[ExtractionMetadata] = None

    @validator('titular', pre=True, always=True)
    def validate_titular(cls, v):
        if not v:
            return "No extraído"
        return str(v).strip()

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
    periodo: Optional[Period] = Field(None, description="Período de trabajo")
    responsabilidades: List[str] = Field(default=[], description="Lista de responsabilidades y logros del puesto")
    ubicacion: Optional[str] = Field(None, description="Ciudad/País donde se realizó el trabajo")
    metadata: Optional[Dict[str, ExtractionMetadata]] = None

    @model_validator(mode='before')
    @classmethod
    def flatten_dates_to_period(cls, data: Any) -> Any:
        if isinstance(data, dict):
            # 1. Parse or initialize period_data
            periodo_data = {}
            if 'periodo' in data:
                if isinstance(data['periodo'], dict):
                    periodo_data = data['periodo']
                elif data['periodo'] is not None:
                    periodo_data['texto_original'] = str(data['periodo'])
            
            # 2. Collect any root date fields
            fecha_inicio = None
            if 'fecha_inicio' in data: fecha_inicio = data['fecha_inicio']
            elif 'start_date' in data: fecha_inicio = data['start_date']
            elif 'anio_inicio' in data: fecha_inicio = data['anio_inicio']
            
            fecha_fin = None
            if 'fecha_fin' in data: fecha_fin = data['fecha_fin']
            elif 'end_date' in data: fecha_fin = data['end_date']
            elif 'anio_fin' in data: fecha_fin = data['anio_fin']
            
            # 3. Merge root fields into periodo_data if missing, empty, or placeholder
            if fecha_inicio and (not periodo_data.get('fecha_inicio') or str(periodo_data.get('fecha_inicio')).strip() in ["", "null", "None", "N/A", "string"]):
                periodo_data['fecha_inicio'] = str(fecha_inicio)
            if fecha_fin and (not periodo_data.get('fecha_fin') or str(periodo_data.get('fecha_fin')).strip() in ["", "null", "None", "N/A", "string"]):
                periodo_data['fecha_fin'] = str(fecha_fin)
                
            # 4. Assign cleaned period data (None if empty)
            data['periodo'] = periodo_data if periodo_data else None
        return data
    @validator('cargo', 'empresa', pre=True, always=True)
    def validate_strings(cls, v):
        if v is None: return "No especificado"
        return str(v)

class Education(BaseModel):
    titulo: Optional[str] = Field(None, description="Nombre del grado académico o título obtenido")
    institucion: Optional[str] = Field(None, description="Nombre de la universidad o centro de estudios")
    periodo: Optional[Period] = Field(None, description="Período de estudios")
    gpa: Optional[str] = Field(None, description="Promedio académico si está disponible")
    ubicacion: Optional[str] = Field(None, description="Ciudad/País de la institución")
    metadata: Optional[Dict[str, ExtractionMetadata]] = None

    @model_validator(mode='before')
    @classmethod
    def flatten_education_dates(cls, data: Any) -> Any:
        if isinstance(data, dict):
            # 1. Parse or initialize period_data
            periodo_data = {}
            if 'periodo' in data:
                if isinstance(data['periodo'], dict):
                    periodo_data = data['periodo']
                elif data['periodo'] is not None:
                    periodo_data['texto_original'] = str(data['periodo'])
            
            # 2. Collect any root date fields or 'anio'
            fecha_inicio = None
            fecha_fin = None
            
            if 'anio' in data and data['anio']:
                val = str(data['anio']).strip()
                if '-' in val:
                    parts = val.split('-')
                    if len(parts) >= 2:
                        fecha_inicio = parts[0].strip()
                        fecha_fin = parts[1].strip()
                    else:
                        fecha_fin = val
                        fecha_inicio = val
                else:
                    fecha_fin = val
                    fecha_inicio = val
            
            if 'fecha_inicio' in data: fecha_inicio = data['fecha_inicio']
            if 'fecha_fin' in data: fecha_fin = data['fecha_fin']
            elif 'year' in data: fecha_fin = data['year']
            
            # 3. Merge into period_data if missing, empty, or placeholder
            if fecha_inicio and (not periodo_data.get('fecha_inicio') or str(periodo_data.get('fecha_inicio')).strip() in ["", "null", "None", "N/A", "string"]):
                periodo_data['fecha_inicio'] = str(fecha_inicio)
            if fecha_fin and (not periodo_data.get('fecha_fin') or str(periodo_data.get('fecha_fin')).strip() in ["", "null", "None", "N/A", "string"]):
                periodo_data['fecha_fin'] = str(fecha_fin)
                
            # Robustez: Si no hay fecha pero el título empieza con año (ej: "2021: Curso...")
            if not periodo_data.get('fecha_fin') and 'titulo' in data and data['titulo']:
                import re
                titulo = str(data['titulo'])
                match = re.match(r'^(\d{4})(?:-(\d{4}))?[:\s]\s*(.+)$', titulo)
                if match:
                    start_year = match.group(1)
                    end_year = match.group(2) if match.group(2) else start_year
                    clean_title = match.group(3)
                    
                    periodo_data['fecha_inicio'] = start_year
                    periodo_data['fecha_fin'] = end_year
                    data['titulo'] = clean_title
                    
            data['periodo'] = periodo_data if periodo_data else None
        return data

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

    @validator('idiomas', pre=True)
    def validate_languages(cls, v):
        if not v:
            return []
        cleaned = []
        for item in v:
            if isinstance(item, str):
                # Heurística simple para separar idioma de nivel
                idioma = item
                nivel = None
                
                # Caso: "Inglés (Avanzado)"
                match_parens = re.search(r'^(.*?)\s*\((.*?)\)$', item)
                if match_parens:
                    idioma = match_parens.group(1)
                    nivel = match_parens.group(2)
                else:
                    # Caso: "Inglés Intermedio"
                    lower_item = item.lower()
                    for level_word in ['básico', 'basico', 'intermedio', 'avanzado', 'experto', 'nativo']:
                        if level_word in lower_item:
                            # Intentar separar
                            parts = re.split(f'{level_word}', item, flags=re.IGNORECASE)
                            if len(parts) > 0 and parts[0].strip():
                                idioma = parts[0].strip()
                                nivel = level_word.capitalize()
                                break
                
                cleaned.append({'idioma': idioma, 'nivel': nivel})
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
    otros: Optional[List[str]] = Field(None, description="Otros perfiles profesionales")
    metadata: Optional[Dict[str, ExtractionMetadata]] = None

    @validator('linkedin')
    def validate_linkedin(cls, v):
        return v

    @validator('github')
    def validate_github(cls, v):
        return v

    @validator('otros', pre=True)
    def validate_otros(cls, v):
        if v is None:
            return None
        if isinstance(v, dict):
            return [str(val) for val in v.values() if val]
        if isinstance(v, list):
            return [str(item) for item in v if item]
        if isinstance(v, str):
            return [v] if v else None
        return None

    @validator('portfolio')
    def validate_portfolio(cls, v):
        return v

class AdditionalTraining(BaseModel):
    certificaciones_cursos: List[str] = Field(default=[], description="Lista de certificaciones y cursos relevantes")
    metadata: Optional[ExtractionMetadata] = None

    @validator('certificaciones_cursos', pre=True)
    def validate_list_input(cls, v):
        if not v: return []
        # Si llega un string, meterlo en lista
        if isinstance(v, str): return [v]
        # Si llega lista, retornarla convertido a string
        if isinstance(v, list):
            cleaned = []
            for item in v:
                if isinstance(item, dict):
                    # Convert dict values to a single string
                    vals = [str(val) for val in item.values() if val is not None]
                    cleaned.append(" - ".join(vals) if vals else str(item))
                else:
                    cleaned.append(str(item))
            return cleaned
        return v
    
    @model_validator(mode='before')
    @classmethod
    def flatten_list_input(cls, data: Any) -> Any:
        # Si la data entera es una lista, asumimos que es el contenido principal
        if isinstance(data, list):
            return {'certificaciones_cursos': data}
        return data

class Recognition(BaseModel):
    logros_premios: List[str] = Field(default=[], description="Lista de premios, publicaciones o reconocimientos")
    metadata: Optional[ExtractionMetadata] = None

    @validator('logros_premios', pre=True)
    def validate_list_input(cls, v):
        if not v: return []
        if isinstance(v, str): return [v]
        if isinstance(v, list):
            cleaned = []
            for item in v:
                if isinstance(item, dict):
                    vals = [str(val) for val in item.values() if val is not None]
                    cleaned.append(" - ".join(vals) if vals else str(item))
                else:
                    cleaned.append(str(item))
            return cleaned
        return v

    @model_validator(mode='before')
    @classmethod
    def flatten_list_input(cls, data: Any) -> Any:
        if isinstance(data, list):
            return {'logros_premios': data}
        return data

class ExtracurricularActivities(BaseModel):
    voluntariado: List[str] = Field(default=[], description="Experiencia de voluntariado")
    metadata: Optional[ExtractionMetadata] = None

    @validator('voluntariado', pre=True)
    def validate_list_input(cls, v):
        if not v: return []
        if isinstance(v, str): return [v]
        if isinstance(v, list):
            cleaned = []
            for item in v:
                if isinstance(item, dict):
                    vals = [str(val) for val in item.values() if val is not None]
                    cleaned.append(" - ".join(vals) if vals else str(item))
                else:
                    cleaned.append(str(item))
            return cleaned
        return v

    @model_validator(mode='before')
    @classmethod
    def flatten_list_input(cls, data: Any) -> Any:
        if isinstance(data, list):
            return {'voluntariado': data}
        return data

class Interests(BaseModel):
    hobbies_intereses: List[str] = Field(default=[], description="Lista de intereses personales")
    metadata: Optional[ExtractionMetadata] = None

    @validator('hobbies_intereses', pre=True)
    def validate_list_input(cls, v):
        if not v: return []
        if isinstance(v, str): return [v]
        if isinstance(v, list):
            cleaned = []
            for item in v:
                if isinstance(item, dict):
                    vals = [str(val) for val in item.values() if val is not None]
                    cleaned.append(" - ".join(vals) if vals else str(item))
                else:
                    cleaned.append(str(item))
            return cleaned
        return v
    @model_validator(mode='before')
    @classmethod
    def flatten_list_input(cls, data: Any) -> Any:
        if isinstance(data, list):
            return {'hobbies_intereses': data}
        return data

class Project(BaseModel):
    nombre: str = Field("No especificado", description="Nombre del proyecto")
    descripcion: Optional[str] = Field(None, description="Descripción breve del proyecto")
    rol: Optional[str] = Field(None, description="Rol desempeñado en el proyecto")
    tecnologias: List[str] = Field(default=[], description="Tecnologías o herramientas utilizadas")
    url: Optional[str] = Field(None, description="URL del proyecto (GitHub, portafolio, etc.)")
    periodo: Optional[Period] = Field(None, description="Período del proyecto")
    metadata: Optional[ExtractionMetadata] = None

    @validator('nombre', pre=True, always=True)
    def validate_nombre(cls, v):
        if not v: return "No especificado"
        return str(v).strip()

    @validator('tecnologias', pre=True)
    def validate_tecnologias(cls, v):
        if not v: return []
        if isinstance(v, str): return [v]
        if isinstance(v, list): return [str(item) for item in v if item]
        return []

class Projects(BaseModel):
    proyectos: List[Project] = Field(default=[], description="Lista de proyectos destacados")
    metadata: Optional[ExtractionMetadata] = None

    @validator('proyectos', pre=True)
    def validate_list_input(cls, v):
        if not v: return []
        if isinstance(v, list):
            return [{"nombre": item} if isinstance(item, str) else item for item in v]
        return v

    @model_validator(mode='before')
    @classmethod
    def flatten_list_input(cls, data: Any) -> Any:
        if isinstance(data, list):
            return {'proyectos': data}
        return data

class ResumeData(BaseModel):
    datos_contacto: ContactInfo = Field(
        default_factory=lambda: ContactInfo(
            nombre_completo="No extraído", 
            email="no-extraido@example.com"
        ), 
        description="Información de contacto del candidato"
    )
    titular_profesional: ProfessionalTitle = Field(
        default_factory=lambda: ProfessionalTitle(titular="Profesional"), 
        description="Titular o headline profesional"
    )
    resumen_profesional: ProfessionalSummary = Field(
        default_factory=lambda: ProfessionalSummary(resumen=""), 
        description="Resumen ejecutivo del perfil"
    )
    experiencia_laboral: List[WorkExperience] = Field(default=[], description="Historial de experiencia laboral")
    formacion_academica: List[Education] = Field(default=[], description="Educación formal del candidato")
    
    # Relaxed type for habilidades to handle string inputs
    habilidades: Skills = Field(default_factory=lambda: Skills(), description="Conjunto de habilidades técnicas y blandas")

    perfiles_online: Optional[OnlineProfiles] = Field(None, description="Perfiles en redes profesionales")
    formacion_complementaria: Optional[AdditionalTraining] = Field(None, description="Certificaciones y cursos adicionales")
    reconocimientos: Optional[Recognition] = Field(None, description="Premios y logros destacados")
    proyectos: Optional[Projects] = Field(None, description="Proyectos destacados (personales o profesionales)")
    actividades_extracurriculares: Optional[ExtracurricularActivities] = Field(None, description="Voluntariado y actividades")
    intereses: Optional[Interests] = Field(None, description="Hobbies e intereses personales")
    otros_antecedentes: Optional[List[str]] = Field(default=[], description="Información adicional del CV que no encaja en las secciones estándar")
    referencias: Optional[List[Dict[str, str]]] = Field(None, description="Referencias profesionales del candidato")

    metadata_procesamiento: Optional[Dict[str, Any]] = Field(None, description="Información sobre el procesamiento del CV")

    model_config = ConfigDict(use_enum_values=True)

    @validator('habilidades', pre=True)
    def parse_habilidades(cls, v):
        if isinstance(v, str):
            try:
                import json
                v_clean = v.strip()
                if v_clean.startswith('{') or v_clean.startswith('['):
                    v = json.loads(v_clean)
            except Exception:
                if isinstance(v, str) and len(v) > 0:
                    items = [x.strip() for x in v.replace('\n', ',').split(',') if x.strip()]
                    return Skills(habilidades_tecnicas=[
                        {"skill": item, "level": "Intermedio"} for item in items
                    ])
                return Skills()

        if isinstance(v, list):
            if len(v) > 0:
                return Skills(habilidades_tecnicas=[
                    {"skill": str(item), "level": "Intermedio"} if isinstance(item, str) else item
                    for item in v if item
                ])
            return Skills()

        if isinstance(v, dict):
             if 'habilidades_tecnicas' not in v: v['habilidades_tecnicas'] = []
             if 'idiomas' not in v: v['idiomas'] = []
             if 'habilidades_blandas' not in v: v['habilidades_blandas'] = []
             return Skills(**v)

        return Skills()

    @validator('experiencia_laboral', pre=True)
    def validate_experiencia_laboral(cls, v):
        return v if v else []

    @validator('formacion_academica', pre=True)
    def validate_formacion_academica(cls, v):
        return v if v else []

    @model_validator(mode='before')
    @classmethod
    def normalize_root_fields(cls, data: Any) -> Any:
        return _normalize_common_root_fields(data)


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
    request_id: Optional[str] = Field(None, description="Identificador único de la petición para trazabilidad")
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
    habilidades: Optional[Skills] = Field(default_factory=lambda: Skills(), description="Habilidades parciales")
    perfiles_online: Optional[OnlineProfiles] = Field(None, description="Perfiles online parciales")
    formacion_complementaria: Optional[AdditionalTraining] = Field(None, description="Formación comp. parcial")
    reconocimientos: Optional[Recognition] = Field(None, description="Reconocimientos parciales")
    proyectos: Optional[Projects] = Field(None, description="Proyectos parciales")
    actividades_extracurriculares: Optional[ExtracurricularActivities] = Field(None, description="Actividades parciales")
    intereses: Optional[Interests] = Field(None, description="Intereses parciales")
    otros_antecedentes: Optional[List[str]] = Field(default=[], description="Otros antecedentes parciales")
    referencias: Optional[List[Dict[str, str]]] = Field(None, description="Referencias profesionales del candidato")
    metadata_procesamiento: Optional[Dict[str, Any]] = None

    model_config = ConfigDict(use_enum_values=True)

    @validator('habilidades', pre=True)
    def parse_habilidades(cls, v):
        if isinstance(v, str):
            try:
                import json
                v_clean = v.strip()
                if v_clean.startswith('{') or v_clean.startswith('['):
                    v = json.loads(v_clean)
            except Exception:
                if isinstance(v, str) and len(v) > 0:
                    items = [x.strip() for x in v.replace('\n', ',').split(',') if x.strip()]
                    return Skills(habilidades_tecnicas=[
                        {"skill": item, "level": "Intermedio"} for item in items
                    ])
                return Skills()

        if isinstance(v, list):
            if len(v) > 0:
                return Skills(habilidades_tecnicas=[
                    {"skill": str(item), "level": "Intermedio"} if isinstance(item, str) else item
                    for item in v if item
                ])
            return Skills()

        if isinstance(v, dict):
             if 'habilidades_tecnicas' not in v: v['habilidades_tecnicas'] = []
             if 'idiomas' not in v: v['idiomas'] = []
             if 'habilidades_blandas' not in v: v['habilidades_blandas'] = []
             return Skills(**v)

        return Skills()
    
    @validator('experiencia_laboral', pre=True)
    def validate_experiencia_laboral(cls, v):
        return v if v else []

    @validator('formacion_academica', pre=True)
    def validate_formacion_academica(cls, v):
        return v if v else []

    @validator('reconocimientos', pre=True)
    def validate_reconocimientos(cls, v):
        if isinstance(v, list):
            return {'logros_premios': v}
        return v

    @validator('formacion_complementaria', pre=True)
    def validate_formacion_complementaria(cls, v):
        if isinstance(v, list):
            return {'certificaciones_cursos': v}
        return v

    @validator('actividades_extracurriculares', pre=True)
    def validate_actividades_extracurriculares(cls, v):
        if isinstance(v, list):
            return {'voluntariado': v}
        return v

    @validator('intereses', pre=True)
    def validate_intereses(cls, v):
        if isinstance(v, list):
            return {'hobbies_intereses': v}
        return v

    @model_validator(mode='before')
    @classmethod
    def normalize_root_fields(cls, data: Any) -> Any:
        return _normalize_common_root_fields(data)


class ErrorResponse(BaseModel):
    error: str = Field(..., description="Descripción del error")
    detail: Optional[str] = Field(None, description="Detalles adicionales del error")
    timestamp: datetime = Field(default_factory=datetime.now, description="Momento del error")


def _normalize_common_root_fields(data: Any) -> Any:
    """
    Función compartida para normalizar campos que el LLM devuelve en la raíz
    o con nombres alternativos. Usada por ResumeData y PartialResumeData.
    """
    if not isinstance(data, dict):
        return data

    contact_data = data.get('datos_contacto')
    if not isinstance(contact_data, dict):
        contact_data = {}

    if 'contacto' in data and isinstance(data['contacto'], dict):
        for k, v in data['contacto'].items():
            if k not in contact_data and v:
                contact_data[k] = v

    if 'datos_personales' in data and isinstance(data['datos_personales'], dict):
        for k, v in data['datos_personales'].items():
            if k not in data:
                data[k] = v

    for field in ['nombre_completo', 'nombre', 'apellido', 'email', 'telefono', 'ubicacion', 'linkedin']:
        if field in data and data[field]:
            target_field = 'nombre_completo' if field in ['nombre', 'apellido'] else field
            if target_field == 'nombre_completo' and field == 'apellido' and contact_data.get('nombre_completo'):
                if data[field] not in contact_data['nombre_completo']:
                    contact_data['nombre_completo'] = f"{contact_data['nombre_completo']} {data[field]}".strip()
            elif target_field == 'nombre_completo' and field == 'nombre':
                if contact_data.get('nombre_completo'):
                    if data[field] not in contact_data['nombre_completo']:
                        contact_data['nombre_completo'] = f"{data[field]} {contact_data['nombre_completo']}".strip()
                else:
                    contact_data['nombre_completo'] = data[field]
            elif target_field not in contact_data or not contact_data[target_field]:
                contact_data[target_field] = data[field]

    if contact_data:
        data['datos_contacto'] = contact_data

    val_tp = data.get('titular_profesional')
    if not val_tp:
        val_tp = data.get('titulo_profesional') or data.get('titular')
    if val_tp:
        if isinstance(val_tp, str):
            data['titular_profesional'] = {'titular': val_tp}
        elif isinstance(val_tp, dict):
            data['titular_profesional'] = val_tp
    else:
        data['titular_profesional'] = {'titular': 'Profesional'}

    val_rp = data.get('resumen_profesional')
    if not val_rp:
        val_rp = data.get('resumen') or data.get('perfil_profesional')
    if val_rp:
        if isinstance(val_rp, str):
            data['resumen_profesional'] = {'resumen': val_rp}
        elif isinstance(val_rp, dict):
            data['resumen_profesional'] = val_rp
    else:
        data['resumen_profesional'] = {'resumen': ''}

    if 'formacion_academica' not in data or not data['formacion_academica']:
        education = data.get('educacion') or data.get('education') or data.get('estudios')
        if education and isinstance(education, list):
            data['formacion_academica'] = education

    if 'habilidades' not in data or not isinstance(data.get('habilidades'), dict):
        tech = data.pop('habilidades_tecnicas', None)
        langs = data.pop('idiomas', None)
        soft = data.pop('habilidades_blandas', None)
        if tech or langs or soft:
            data['habilidades'] = {
                'habilidades_tecnicas': tech if isinstance(tech, list) else [],
                'idiomas': langs if isinstance(langs, list) else [],
                'habilidades_blandas': soft if isinstance(soft, list) else [],
            }

    if isinstance(data.get('habilidades'), dict) and 'skills' in data:
        skills_raw = data.pop('skills')
        if isinstance(skills_raw, list):
            existing = data['habilidades'].get('habilidades_tecnicas', [])
            for s in skills_raw:
                if s not in existing:
                    existing.append(s)
            data['habilidades']['habilidades_tecnicas'] = existing

    return data

class ThinkingResumeData(BaseModel):
    """
    Wrapper para permitir Chain of Thought (pensamiento paso a paso) antes de la extracción final.
    Esto mejora significativamente la calidad de los datos extraídos en modelos complejos.
    """
    thinking_process: str = Field(
        ..., 
        description="Análisis paso a paso del documento. Identifica idioma, estructura, ambigüedades y fechas clave antes de extraer."
    )
    extraction: ResumeData = Field(..., description="Los datos estructurados finales del CV")
