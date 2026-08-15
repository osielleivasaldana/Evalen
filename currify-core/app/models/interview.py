from typing import List, Literal
from pydantic import BaseModel, Field


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


class InterviewGuideResponse(BaseModel):
    questions: List[GuideQuestion]