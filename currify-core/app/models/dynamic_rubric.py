from typing import List, Optional, Any, Union
from pydantic import BaseModel, Field, field_validator
from typing_extensions import Annotated

# Helper validators
def validate_empty_list_to_none(v: Any) -> Any:
    if isinstance(v, list) and not v:
        return None
    return v

def validate_empty_list_to_dict(v: Any) -> Any:
    if isinstance(v, list) and not v:
        return {}
    return v

class RubricEducation(BaseModel):
    required_degrees: List[str] = Field(default_factory=list, description="Lista de títulos requeridos para el puesto. SI NO ESTÁ EXPLÍCITO, INFERIR DEL TÍTULO DEL CARGO (ej: 'Enfermero' -> ['Enfermería']).")
    academic_level: str = Field(default="Técnico", description="Nivel académico mínimo (Universitario, Técnico, Postgrado)")
    kill_clause: bool = Field(default=True, description="Si es True, la falta de título anula el puntaje de Educación (0 pts)")
    inferred_field: Optional[str] = Field(None, description="Campo profesional inferido del título del puesto (ej: SALUD, INGENIERIA)")
    is_inferred_degree: bool = Field(default=False, description="Si el grado fue inferido (no explícito en la descripción del puesto)")

class RubricExperience(BaseModel):
    min_years: int = Field(default=0, description="Años mínimos de experiencia requerida")
    key_roles: List[str] = Field(default_factory=list, description="Lista de roles/cargos similares requeridos")
    industry_mandatory: bool = Field(default=False, description="Si la experiencia debe ser obligatoriamente en la misma industria")
    target_industries: List[str] = Field(default_factory=list, description="Industrias objetivo (ej: ['Salud', 'Minería', 'Banca'])")

class RubricSkills(BaseModel):
    mandatory_skills: List[str] = Field(default_factory=list, description="Habilidades técnicas OBLIGATORIAS (Hard Skills)")
    nice_to_have_skills: List[str] = Field(default_factory=list, description="Habilidades deseables (Bonus points)")
    
class RubricLogistics(BaseModel):
    location: Optional[str] = Field(None, description="Ubicación física del trabajo (Ciudad/Comuna)")
    requires_shift_work: bool = Field(default=False, description="Si el trabajo requiere turnos rotativos")
    modality: str = Field(default="Presencial", description="Modalidad: Presencial, Híbrido, Remoto")

    @field_validator('location', mode='before')
    @classmethod
    def check_location(cls, v: Any) -> Optional[str]:
        if isinstance(v, list):
            if not v: return None
            # If list is not empty, take the first item
            return str(v[0])
        return v

class RubricCertifications(BaseModel):
    mandatory_certs: List[str] = Field(default_factory=list, description="Certificaciones obligatorias (ej: 'Licencia de Operador', 'ISO 9001')")

class RubricLanguages(BaseModel):
    required_languages: List[str] = Field(default_factory=list, description="Idiomas requeridos con nivel (ej: 'Inglés B2')")

class StructuredRubric(BaseModel):
    """
    Rúbrica Estructurada extraída dinámicamente de la Descripción del Puesto.
    Actúa como 'Contrato' para la evaluación determinista.
    """
    education: RubricEducation = Field(default_factory=RubricEducation)
    experience: RubricExperience = Field(default_factory=RubricExperience)
    skills: RubricSkills = Field(default_factory=RubricSkills)
    logistics: RubricLogistics = Field(default_factory=RubricLogistics)
    certifications: RubricCertifications = Field(default_factory=RubricCertifications)
    languages: RubricLanguages = Field(default_factory=RubricLanguages)

    @field_validator('education', 'experience', 'skills', 'logistics', 'certifications', 'languages', mode='before')
    @classmethod
    def check_empty_lists(cls, v: Any) -> Any:
        # Convert empty lists to empty dicts so default_factory works
        if isinstance(v, list) and not v:
            return {}
        return v
    
    @field_validator('certifications', mode='before')
    @classmethod
    def check_certifications_type(cls, v: Any) -> Any:
        # If it's a list (even empty), default to RubricCertifications
        if isinstance(v, list):
             if not v:
                 return RubricCertifications()
             # If list has content, maybe it's a list of strings directly? 
             # We could try to map it if simple string list
             if isinstance(v[0], str):
                 return RubricCertifications(mandatory_certs=v)
        return v
