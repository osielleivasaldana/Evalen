from typing import List, Optional
from pydantic import BaseModel, Field

class SmartFillRequest(BaseModel):
    jobTitle: str = Field(..., description="The title of the job position")
    additionalContext: Optional[str] = Field(None, description="Additional context or requirements for the position")
    language: Optional[str] = Field("es", description="The language for the generated draft")

class SalaryRange(BaseModel):
    min: Optional[int] = None
    max: Optional[int] = None
    currency: Optional[str] = "CLP"

class SmartFillFields(BaseModel):
    title: str = Field(..., description="Job title")
    description: str = Field(..., description="Professional and comprehensive job description")
    requirements: List[str] = Field(..., description="List of technical and soft requirements")
    modality: str = Field(..., description="Work modality, e.g., Remote, On-site, Hybrid")
    duration: str = Field(..., description="Contract duration, e.g., Indefinite, Fixed-term")
    salary_range: Optional[SalaryRange] = None

class SuggestedRubricWeights(BaseModel):
    technical_skills: float = Field(..., description="Weight for technical skills (0.0 to 1.0)")
    experience: float = Field(..., description="Weight for experience (0.0 to 1.0)")
    education: float = Field(..., description="Weight for education (0.0 to 1.0)")

class SmartFillResponse(BaseModel):
    fields: SmartFillFields
    suggested_rubric_weights: SuggestedRubricWeights
