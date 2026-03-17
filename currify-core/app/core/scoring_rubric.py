"""
Scoring Rubric Configuration
Defines the fixed weights and criteria for candidate-job matching
"""

from typing import Dict, List

class ScoringRubric:
    """Fixed rubric for evaluating candidate-job fit"""

    # Dimension weights (must sum to 100)
    WEIGHTS = {
        "skills_match": 30,
        "experience": 25,
        "education": 15,
        "cultural_fit": 15,
        "logistics": 10,
        "career_trajectory": 5
    }

    # Dimension descriptions for LLM context
    DIMENSIONS = {
        "skills_match": {
            "name": "Skills Match",
            "description": "Evaluate technical and professional skills alignment between candidate and job requirements",
            "criteria": [
                "Hard skills match (programming languages, tools, frameworks)",
                "Soft skills alignment",
                "Certifications and specialized knowledge",
                "Domain expertise"
            ]
        },
        "experience": {
            "name": "Experience Level",
            "description": "Assess years of experience and relevance to the position",
            "criteria": [
                "Total years of relevant experience",
                "Experience in similar roles",
                "Industry experience",
                "Seniority level match"
            ]
        },
        "education": {
            "name": "Education",
            "description": "Evaluate academic background and formal education",
            "criteria": [
                "Degree level match",
                "Field of study relevance",
                "Academic achievements",
                "Continuous learning and courses"
            ]
        },
        "cultural_fit": {
            "name": "Cultural Fit",
            "description": "Assess soft skills, values, and team compatibility",
            "criteria": [
                "Soft skills match (communication, teamwork, leadership)",
                "Work style preferences",
                "Values alignment",
                "Language proficiency"
            ]
        },
        "logistics": {
            "name": "Logistics",
            "description": "Evaluate practical aspects like location and availability",
            "criteria": [
                "Location match or remote work capability",
                "Availability to start",
                "Salary expectations alignment",
                "Work schedule compatibility"
            ]
        },
        "career_trajectory": {
            "name": "Career Trajectory",
            "description": "Analyze career progression and growth potential",
            "criteria": [
                "Career growth pattern",
                "Job stability and tenure",
                "Professional development",
                "Ambition and goals alignment"
            ]
        }
    }

    # Recommendation thresholds
    RECOMMENDATION_THRESHOLDS = {
        "strong_fit": 80,      # >= 80
        "moderate_fit": 60,    # >= 60 and < 80
        "weak_fit": 0          # < 60
    }

    @classmethod
    def get_recommendation(cls, overall_score: float) -> str:
        """Get recommendation based on overall score"""
        if overall_score >= cls.RECOMMENDATION_THRESHOLDS["strong_fit"]:
            return "strong_fit"
        elif overall_score >= cls.RECOMMENDATION_THRESHOLDS["moderate_fit"]:
            return "moderate_fit"
        else:
            return "weak_fit"

    @classmethod
    def validate_weights(cls) -> bool:
        """Validate that weights sum to 100"""
        return sum(cls.WEIGHTS.values()) == 100
