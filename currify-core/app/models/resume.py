from pydantic import BaseModel, Field, validator, ConfigDict, model_validator
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
    periodo: Period = Field(default_factory=lambda: Period(), description="Período de trabajo")
    responsabilidades: List[str] = Field(default=[], description="Lista de responsabilidades y logros del puesto")
    ubicacion: Optional[str] = Field(None, description="Ciudad/País donde se realizó el trabajo")
    metadata: Optional[Dict[str, ExtractionMetadata]] = None

    @model_validator(mode='before')
    @classmethod
    def flatten_dates_to_period(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if 'periodo' in data and isinstance(data['periodo'], dict):
                return data
            
            periodo_data = {}
            if 'fecha_inicio' in data: periodo_data['fecha_inicio'] = str(data['fecha_inicio'])
            elif 'start_date' in data: periodo_data['fecha_inicio'] = str(data['start_date'])
            elif 'anio_inicio' in data: periodo_data['fecha_inicio'] = str(data['anio_inicio'])
            
            if 'fecha_fin' in data: periodo_data['fecha_fin'] = str(data['fecha_fin'])
            elif 'end_date' in data: periodo_data['fecha_fin'] = str(data['end_date'])
            elif 'anio_fin' in data: periodo_data['fecha_fin'] = str(data['anio_fin'])
            
            if periodo_data or 'periodo' not in data:
                data['periodo'] = periodo_data

        # Normalizar descripción -> responsabilidades
        if 'responsabilidades' not in data or not data['responsabilidades']:
            desc = None
            if 'descripcion' in data and data['descripcion']:
                desc = data['descripcion']
            elif 'description' in data:
                desc = data['description']

            if desc:
                if isinstance(desc, list):
                    data['responsabilidades'] = desc
                elif isinstance(desc, str):
                    # 1. Limpieza inicial: Unificar saltos de línea y espacios
                    # Reemplazar bullets corruptos o no estándar si es necesario
                    clean_desc = desc.replace('\r\n', '\n').strip()
                    
                    # 2. Estrategia de split:
                    # Si hay bullets explícitos (•, *, -), usarlos como separador principal
                    if re.search(r'[•\*]\s', clean_desc) or re.search(r'\n-\s', clean_desc):
                        # Split por bullets, manteniendo el texto limpio
                        # El patrón busca un bullet al inicio de línea o después de newline
                        items = re.split(r'(?:^|\n)\s*[•\*\-]\s*', clean_desc)
                    else:
                        # Fallback: Split por doble salto de línea (párrafos)
                        # Evitar split por un solo \n para no cortar frases
                        items = re.split(r'\n\s*\n', clean_desc)

                    # 3. Limpieza de items y re-unión de fragmentos
                    final_items = []
                    for item in items:
                        item = item.strip()
                        if not item: continue
                        
                        # Fix básico de "linea partida": si el item anterior termina sin punto y este empieza con minuscula
                        # Probablemente es continuación (aunque el split por bullet debería prevenir esto si el bullet está bien puesto)
                        # Pero si el split fue por \n\n, esto ajuda.
                        
                        # Filtro de "texto pegado" (ej: UtilizandoZephyr...)
                        # Heurística: Si una palabra es > 30 chars, es sospechoso (probablemente falta espacio)
                        longest_word = max(len(w) for w in item.split()) if item.split() else 0
                        if longest_word > 40: # Un URL largo podría pasar, pero texto normal no
                             continue

                        final_items.append(item)
                    
                    # 4. Deduplicación inteligente (eliminar versiones sin espacios si existe la versión con espacios)
                    # O simplemente eliminar duplicados exactos
                    unique_items = []
                    seen = set()
                    for item in final_items:
                        # Normalizar para comparar (quitar espacios extra)
                        normalized = re.sub(r'\s+', '', item).lower()
                        if normalized not in seen:
                            unique_items.append(item)
                            seen.add(normalized)
                        else:
                            # Si ya existe, ver si el nuevo tiene más espacios (es la versión "buena")
                            # y reemplazar la versión anterior si era la "mala"
                             pass # Por ahora simple deduplicación, asumiendo orden de llegada mezclado
                    
                    data['responsabilidades'] = unique_items
        
        return data

    @validator('cargo', 'empresa', pre=True, always=True)
    def validate_strings(cls, v):
        if v is None: return "No especificado"
        return str(v)

class Education(BaseModel):
    titulo: Optional[str] = Field(None, description="Nombre del grado académico o título obtenido")
    institucion: Optional[str] = Field(None, description="Nombre de la universidad o centro de estudios")
    periodo: Period = Field(default_factory=lambda: Period(), description="Período de estudios")
    gpa: Optional[str] = Field(None, description="Promedio académico si está disponible")
    ubicacion: Optional[str] = Field(None, description="Ciudad/País de la institución")
    metadata: Optional[Dict[str, ExtractionMetadata]] = None

    @model_validator(mode='before')
    @classmethod
    def flatten_education_dates(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if 'periodo' in data and isinstance(data['periodo'], dict):
                return data
                
            periodo_data = {}
            if 'anio' in data:
                val = str(data['anio']).strip()
                # Rango "2012-2016"
                if '-' in val:
                    parts = val.split('-')
                    if len(parts) >= 2:
                        periodo_data['fecha_inicio'] = parts[0].strip()
                        periodo_data['fecha_fin'] = parts[1].strip()
                    else:
                        periodo_data['fecha_fin'] = val
                        periodo_data['fecha_inicio'] = val
                else:
                    periodo_data['fecha_fin'] = val
                    periodo_data['fecha_inicio'] = val
            elif 'fecha_fin' in data: periodo_data['fecha_fin'] = str(data['fecha_fin'])
            elif 'year' in data: periodo_data['fecha_fin'] = str(data['year'])
            
            if 'fecha_inicio' in data and 'fecha_inicio' not in periodo_data: 
                periodo_data['fecha_inicio'] = str(data['fecha_inicio'])
            
            # Robustez: Si no hay fecha pero el título empieza con año (ej: "2021: Curso...")
            # Esto pasa cuando el LLM falla en separar campos
            if not periodo_data.get('fecha_fin') and 'titulo' in data and data['titulo']:
                import re
                titulo = str(data['titulo'])
                # Patrón "YYYY: ..." o "YYYY-YYYY: ..."
                match = re.match(r'^(\d{4})(?:-(\d{4}))?[:\s]\s*(.+)$', titulo)
                if match:
                    # Extraer fechas y limpiar título
                    start_year = match.group(1)
                    end_year = match.group(2) if match.group(2) else start_year
                    clean_title = match.group(3)
                    
                    periodo_data['fecha_inicio'] = start_year
                    periodo_data['fecha_fin'] = end_year
                    data['titulo'] = clean_title

            if periodo_data or 'periodo' not in data:
                data['periodo'] = periodo_data
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

    @model_validator(mode='before')
    @classmethod
    def normalize_root_fields(cls, data: Any) -> Any:
        """
        Normaliza campos que el LLM a veces devuelve en la raíz o con nombres ligeramente distintos.
        Ej: 'nombre_completo' en root -> 'datos_contacto.nombre_completo'
            'contacto' -> 'datos_contacto'
            'titulo_profesional' -> 'titular_profesional'
        """
        if not isinstance(data, dict):
            return data
            
        # 1. Normalizar Datos de Contacto
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
        
        # Campos sueltos en root que deberían ir en contacto
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

        # 2. Normalizar Titular Profesional
        val_tp = data.get('titular_profesional')
        if not val_tp:
            val_tp = data.get('titulo_profesional') or data.get('titular')
        
        if val_tp:
             if isinstance(val_tp, str):
                 data['titular_profesional'] = {'titular': val_tp}
             elif isinstance(val_tp, dict):
                 data['titular_profesional'] = val_tp

        # 3. Normalizar Resumen Profesional
        val_rp = data.get('resumen_profesional')
        if not val_rp:
            val_rp = data.get('resumen') or data.get('perfil_profesional')
            
        if val_rp:
            if isinstance(val_rp, str):
                data['resumen_profesional'] = {'resumen': val_rp}
            elif isinstance(val_rp, dict):
                data['resumen_profesional'] = val_rp

        # 4. Normalizar Formación Académica
        if 'formacion_academica' not in data or not data['formacion_academica']:
            education = data.get('educacion') or data.get('education') or data.get('estudios')
            if education and isinstance(education, list):
                data['formacion_academica'] = education

        return data



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
        """
        Normaliza campos que el LLM a veces devuelve en la raíz o con nombres ligeramente distintos.
        Ej: 'nombre_completo' en root -> 'datos_contacto.nombre_completo'
            'contacto' -> 'datos_contacto'
            'titulo_profesional' -> 'titular_profesional'
        """
        if not isinstance(data, dict):
            return data
            
        # 1. Normalizar Datos de Contacto
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
        
        # Campos sueltos en root que deberían ir en contacto
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

        # 2. Normalizar Titular Profesional
        val_tp = data.get('titular_profesional')
        if not val_tp:
            val_tp = data.get('titulo_profesional') or data.get('titular')
        
        if val_tp:
             if isinstance(val_tp, str):
                 data['titular_profesional'] = {'titular': val_tp}
             elif isinstance(val_tp, dict):
                 data['titular_profesional'] = val_tp

        # 3. Normalizar Resumen Profesional
        val_rp = data.get('resumen_profesional')
        if not val_rp:
            val_rp = data.get('resumen') or data.get('perfil_profesional')
            
        if val_rp:
            if isinstance(val_rp, str):
                data['resumen_profesional'] = {'resumen': val_rp}
            elif isinstance(val_rp, dict):
                data['resumen_profesional'] = val_rp

        # 4. Normalizar Formación Académica
        if 'formacion_academica' not in data or not data['formacion_academica']:
            education = data.get('educacion') or data.get('education') or data.get('estudios')
            if education and isinstance(education, list):
                data['formacion_academica'] = education

        return data

class ErrorResponse(BaseModel):
    error: str = Field(..., description="Descripción del error")
    detail: Optional[str] = Field(None, description="Detalles adicionales del error")
    timestamp: datetime = Field(default_factory=datetime.now, description="Momento del error")

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
