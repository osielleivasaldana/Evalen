from typing import List, Literal
from pydantic import BaseModel, Field, field_validator


class CampaignBrief(BaseModel):
    title: str = ""
    description: str = ""
    requirements: str = ""


class StageBrief(BaseModel):
    name: str = ""
    description: str = ""


class CandidateBrief(BaseModel):
    resumen: str = ""
    habilidades: List[str] = Field(default_factory=list)
    brechas: List[str] = Field(default_factory=list)


class InterviewGuideRequest(BaseModel):
    campaign: CampaignBrief
    stage: StageBrief
    candidate: CandidateBrief
    rubric_criteria: List[str] = Field(default_factory=list)


class GuideQuestion(BaseModel):
    question: str
    source: Literal["rubrica", "perfil", "brecha", "estandar"]

    @field_validator("source", mode="before")
    @classmethod
    def normalize_source(cls, v):
        if isinstance(v, str):
            normalized = (
                v.lower()
                .replace("á", "a")
                .replace("é", "e")
                .replace("í", "i")
                .replace("ó", "o")
                .replace("ú", "u")
            )
            return normalized
        return v


class InterviewGuideResponse(BaseModel):
    questions: List[GuideQuestion]