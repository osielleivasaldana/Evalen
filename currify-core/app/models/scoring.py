"""
Pydantic models for scoring service
"""

from typing import Dict, List, Any, Optional
from pydantic import BaseModel, Field, field_validator, model_validator


class SkillJudgeResult(BaseModel):
    """
    Resultado del Judge LLM para UNA mandatory skill que quedó en 0 tras similitud.

    Invariantes (hotfix parvularia):
    - El judge alimenta la MATRIZ de evaluación (matching de skills), NUNCA el score final.
    - Debe citar evidencia LITERAL del CV; si no puede → score forzado a 0.0.
    - Presupuesto acotado: máximo 6 llamadas por evaluación, cache por (skill, hash candidato).
    """
    skill: str = Field("", description="Skill requerida evaluada (asignada por el caller)")
    score: float = Field(0.0, ge=0.0, le=1.0, description="Crédito parcial: 0.0 | 0.5 | 1.0")
    evidence: Optional[str] = Field(None, description="Cita LITERAL del CV que respalda la skill")

    @model_validator(mode='after')
    def force_zero_without_literal_evidence(self) -> 'SkillJudgeResult':
        if self.evidence is None or not str(self.evidence).strip():
            self.score = 0.0
            self.evidence = None
        return self


class DimensionScore(BaseModel):
    """Score for a single evaluation dimension"""
    score: float = Field(..., ge=0, le=100, description="Score from 0-100")
    weight: float = Field(..., ge=0, le=100, description="Weight percentage")
    weighted_score: float = Field(..., description="Score * (weight/100)")
    reasoning: str = Field(..., description="Explanation for this score")


class ScoringRequest(BaseModel):
    """Request to evaluate candidate-job fit"""
    candidate: Dict[str, Any] = Field(..., description="Candidate CV data (JSON from /resume/extract)")
    job: Dict[str, Any] = Field(..., description="Job posting data (JSON)")

    @field_validator('candidate', 'job')
    @classmethod
    def validate_not_empty(cls, v):
        if not v:
            raise ValueError("Cannot be empty")
        return v


class ScoringResponse(BaseModel):
    """Response with detailed scoring breakdown"""
    overall_score: float = Field(..., ge=0, le=100, description="Final weighted score")
    recommendation: str = Field(..., description="strong_fit | moderate_fit | weak_fit")

    breakdown: Dict[str, DimensionScore] = Field(
        ...,
        description="Detailed scores for each dimension"
    )

    strengths: List[str] = Field(
        ...,
        description="Key strengths of the candidate for this position"
    )

    gaps: List[str] = Field(
        ...,
        description="Areas where candidate doesn't fully match requirements"
    )

    summary: str = Field(
        ...,
        description="Executive summary of the evaluation"
    )


class ScoringError(BaseModel):
    """Error response for scoring endpoint"""
    error: str
    detail: str = ""


class JobRequirements(BaseModel):
    """Job requirements structure"""
    experiencia_años: str = Field(default="No especificado", description="Years of experience required (e.g., '3-5 años')")
    habilidades_requeridas: List[str] = Field(default_factory=list, description="Required technical skills")
    habilidades_blandas: List[str] = Field(default_factory=list, description="Required soft skills")
    educacion: str = Field(default="No especificado", description="Education level required")
    idiomas: List[str] = Field(default_factory=list, description="Languages required")


class ParsedJobData(BaseModel):
    """Parsed job data from description"""
    requisitos: JobRequirements = Field(default_factory=JobRequirements)
    habilidades_deseables: List[str] = Field(default_factory=list, description="Nice to have skills")
    salario: str = Field(default="No especificado", description="Salary range")
    beneficios: List[str] = Field(default_factory=list, description="Benefits offered")


class JobParsingRequest(BaseModel):
    """Request to parse job description"""
    description: str = Field(..., description="Job description text")
    requirements: str = Field(default="", description="Job requirements text (optional)")

    @field_validator('description')
    @classmethod
    def validate_description(cls, v):
        if not v or not v.strip():
            raise ValueError("Description cannot be empty")
        return v.strip()


class CompleteJobData(BaseModel):
    """Complete job data combining parsed info with campaign metadata"""
    titulo: str = Field(..., description="Job title")
    empresa: str = Field(default="No especificado", description="Company name")
    ubicacion: str = Field(default="No especificado", description="Location")
    tipo: str = Field(default="Tiempo completo", description="Employment type")
    descripcion: str = Field(..., description="Job description")
    requisitos: JobRequirements = Field(default_factory=JobRequirements)
    habilidades_deseables: List[str] = Field(default_factory=list)
    salario: str = Field(default="No especificado")
    beneficios: List[str] = Field(default_factory=list)
