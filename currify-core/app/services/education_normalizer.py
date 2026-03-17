
import logging
from typing import Dict, Optional, Tuple

logger = logging.getLogger(__name__)

class EducationNormalizer:
    """
    Service to normalize education titles to standard academic levels using heuristic keywords.
    Levels based roughly on ISCED/EQF:
    - Level 8: Doctoral (Doctorado, PhD)
    - Level 7: Master (Magister, Master, MBA)
    - Level 6: Bachelor/Professional (Ingeniería Civil, Licenciatura, Título Profesional 4-5y)
    - Level 5: Short-cycle tertiary (Técnico Superior, Analista, 2-3y)
    - Level 4: Secondary (Liceo, Colegio)
    """
    
    LEVELS = {
        8: ["doctor", "phd", "doctorado"],
        7: ["magister", "master", "maestría", "mba", "postgrado", "specialization", "especialización"],
        6: ["ingeniero", "ingeniería", "licenciado", "licenciatura", "bachelor", "profesional", "computación", "informática", "civil"], 
        # Note: "Ingeniería" often implies Level 6 in LatAm (5+ years).
        5: ["técnico", "technician", "analista", "asociado", "diplomado", "bootcamp", "curso", "certificación"],
        4: ["bachiller", "secundaria", "enseñanza media", "colegio"]
    }

    def normalize_degree(self, title: str) -> Tuple[int, str]:
        """
        Returns (level, normalized_title_type)
        Start from highest level and check for keywords.
        """
        title_lower = title.lower()
        
        # Heuristic: Check levels descending
        for level in sorted(self.LEVELS.keys(), reverse=True):
            for keyword in self.LEVELS[level]:
                if keyword in title_lower:
                    # Special Case: "Ingeniería Ejecución" or similar might be lower than "Civil" but still Level 6 for practical purposes in this matching context, 
                    # or Level 6 vs Level 5 distinction is the main one.
                    # For now treating all "Ingeniería" as Level 6 is safer than downgrading them.
                    
                    # Refinement: "Analista" is often Level 5, but "Analista de Sistemas" can be a Professional Title. 
                    # Let's keep it simple first.
                    return level, keyword
        
        return 0, "unknown"

    def check_level_match(self, candidate_level: int, required_level: int) -> bool:
        """
        Returns True if candidate_level >= required_level.
        Allow 1 level gap if it's 5 vs 6? No, strict for now but maybe allow equivalence.
        """
        if candidate_level == 0 or required_level == 0:
            return False # Fallback to text match if unknown
            
        return candidate_level >= required_level

    def extract_required_level(self, education_requirements: list) -> int:
        """
        Scans a list of requirement strings to find the requested academic level.
        Returns the Maximum implicit level found (e.g. if asks for "Técnico o Ingeniero", returns 5 as min requirement? 
        Actually, usually "Técnico o Ingeniero" means "At least Técnico". So we should return the MINIMUM valid level mentioned).
        
        Wait. logic: If Job asks "Técnico o Ingeniero", it accepts Técnico (5). So Requirement is 5.
        If Job asks "Ingeniero Civil (Excluyente)", Requirement is 6.
        """
        min_accepted_level = 10 # Start high
        found_any = False
        
        for req in education_requirements:
            level, _ = self.normalize_degree(req)
            if level > 0:
                if level < min_accepted_level:
                    min_accepted_level = level
                found_any = True
        
        return min_accepted_level if found_any else 0
