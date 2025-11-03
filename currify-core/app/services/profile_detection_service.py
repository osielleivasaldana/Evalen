import logging
import re
from typing import Dict, List, Optional, Tuple
from enum import Enum

logger = logging.getLogger(__name__)

class ProfileType(str, Enum):
    JUNIOR = "junior"
    SENIOR = "senior"
    TECHNICAL = "technical"
    CREATIVE = "creative"
    GENERAL = "general"

class ProfileDetectionService:
    """Servicio para detectar el tipo de perfil profesional basado en el contenido del CV"""

    def __init__(self):
        self.junior_indicators = [
            "recién graduado", "recent graduate", "entry level", "estudiante", "student",
            "prácticas", "internship", "intern", "junior", "trainee", "becario",
            "pasante", "sin experiencia", "no experience", "fresh graduate"
        ]

        self.senior_indicators = [
            "senior", "director", "manager", "gerente", "jefe", "lead", "líder",
            "executive", "ejecutivo", "vp", "vice president", "vicepresidente",
            "ceo", "cto", "cfo", "head of", "jefe de", "responsable de",
            "coordinador", "supervisor", "team lead", "principal"
        ]

        self.technical_indicators = [
            "developer", "desarrollador", "engineer", "ingeniero", "programmer",
            "programador", "software", "backend", "frontend", "fullstack",
            "devops", "sysadmin", "architect", "arquitecto", "qa", "tester",
            "data scientist", "ml engineer", "security", "cybersecurity"
        ]

        self.creative_indicators = [
            "designer", "diseñador", "creative", "creativo", "ux", "ui",
            "graphic", "gráfico", "marketing", "content", "contenido",
            "copywriter", "redactor", "photographer", "fotógrafo", "artist",
            "artista", "illustrator", "ilustrador", "brand", "marca"
        ]

        self.technical_skills = [
            "python", "javascript", "java", "c++", "react", "angular", "vue",
            "django", "flask", "spring", "nodejs", "aws", "azure", "gcp",
            "docker", "kubernetes", "git", "sql", "mongodb", "postgresql",
            "linux", "windows", "macos", "api", "rest", "graphql", "agile",
            "scrum", "devops", "ci/cd", "jenkins", "terraform", "ansible"
        ]

        self.creative_tools = [
            "photoshop", "illustrator", "indesign", "figma", "sketch", "adobe",
            "canva", "after effects", "premiere", "lightroom", "corel",
            "blender", "maya", "3ds max", "unity", "unreal", "final cut"
        ]

    def detect_profile_type(self, resume_text: str) -> Dict[str, any]:
        """
        Detecta el tipo de perfil profesional basado en el contenido del CV

        Returns:
            Dict con tipo detectado, confianza y razones
        """
        text_lower = resume_text.lower()

        # Calcular scores para cada tipo
        scores = {
            ProfileType.JUNIOR: self._calculate_junior_score(text_lower),
            ProfileType.SENIOR: self._calculate_senior_score(text_lower),
            ProfileType.TECHNICAL: self._calculate_technical_score(text_lower),
            ProfileType.CREATIVE: self._calculate_creative_score(text_lower)
        }

        # Determinar el tipo principal
        max_score = max(scores.values())
        detected_type = ProfileType.GENERAL

        if max_score > 0:
            detected_type = max(scores, key=scores.get)

        # Calcular confianza
        confidence = min(max_score / 10.0, 1.0)  # Normalizar a 0-1

        # Generar razones
        reasons = self._generate_reasons(text_lower, detected_type, scores)

        # Detectar características adicionales
        additional_traits = self._detect_additional_traits(text_lower)

        logger.info(f"Profile detected: {detected_type} with confidence {confidence:.2f}")

        return {
            "profile_type": detected_type,
            "confidence": confidence,
            "scores": scores,
            "reasons": reasons,
            "additional_traits": additional_traits,
            "is_multilingual": self._detect_multilingual(resume_text)
        }

    def _calculate_junior_score(self, text: str) -> float:
        """Calcula score para perfil junior"""
        score = 0.0

        # Indicadores directos
        for indicator in self.junior_indicators:
            if indicator in text:
                score += 2.0

        # Patrones de experiencia limitada
        experience_patterns = [
            r'(\d+)\s*(mes|month|meses|months)',
            r'sin experiencia',
            r'no experience',
            r'recién',
            r'recent'
        ]

        for pattern in experience_patterns:
            matches = re.findall(pattern, text)
            score += len(matches) * 1.5

        # Indicadores educativos recientes
        education_patterns = [
            r'graduado\s+en\s+\d{4}',
            r'graduated\s+in\s+\d{4}',
            r'título\s+en\s+\d{4}',
            r'degree\s+in\s+\d{4}'
        ]

        for pattern in education_patterns:
            if re.search(pattern, text):
                score += 2.0

        return score

    def _calculate_senior_score(self, text: str) -> float:
        """Calcula score para perfil senior"""
        score = 0.0

        # Indicadores directos de liderazgo
        for indicator in self.senior_indicators:
            count = text.count(indicator)
            score += count * 2.0

        # Patrones de experiencia extensa
        experience_patterns = [
            r'(\d+)\+?\s*(años|years)',
            r'más de\s+(\d+)\s*(años|years)',
            r'over\s+(\d+)\s*(years)',
            r'(\d{2})\+?\s*(años|years)'
        ]

        years_mentioned = []
        for pattern in experience_patterns:
            matches = re.findall(pattern, text)
            for match in matches:
                try:
                    years = int(match[0] if isinstance(match, tuple) else match)
                    years_mentioned.append(years)
                except ValueError:
                    continue

        # Bonificar experiencia larga
        if years_mentioned:
            max_years = max(years_mentioned)
            if max_years >= 10:
                score += 4.0
            elif max_years >= 5:
                score += 2.0

        # Indicadores de gestión
        management_terms = [
            "team", "equipo", "gestión", "management", "liderar", "lead",
            "supervisar", "supervise", "coordinar", "coordinate", "budget",
            "presupuesto", "strategy", "estrategia"
        ]

        for term in management_terms:
            score += text.count(term) * 0.5

        return score

    def _calculate_technical_score(self, text: str) -> float:
        """Calcula score para perfil técnico"""
        score = 0.0

        # Indicadores directos
        for indicator in self.technical_indicators:
            count = text.count(indicator)
            score += count * 1.5

        # Habilidades técnicas específicas
        for skill in self.technical_skills:
            if skill in text:
                score += 1.0

        # Patrones técnicos
        technical_patterns = [
            r'github\.com',
            r'stackoverflow',
            r'api\s+development',
            r'database\s+design',
            r'system\s+architecture',
            r'cloud\s+computing',
            r'machine\s+learning',
            r'artificial\s+intelligence'
        ]

        for pattern in technical_patterns:
            if re.search(pattern, text):
                score += 2.0

        return score

    def _calculate_creative_score(self, text: str) -> float:
        """Calcula score para perfil creativo"""
        score = 0.0

        # Indicadores directos
        for indicator in self.creative_indicators:
            count = text.count(indicator)
            score += count * 1.5

        # Herramientas creativas
        for tool in self.creative_tools:
            if tool in text:
                score += 1.0

        # Patrones creativos
        creative_patterns = [
            r'portfolio',
            r'behance\.net',
            r'dribbble\.com',
            r'brand\s+identity',
            r'visual\s+design',
            r'user\s+experience',
            r'creative\s+direction',
            r'art\s+direction'
        ]

        for pattern in creative_patterns:
            if re.search(pattern, text):
                score += 2.0

        return score

    def _detect_additional_traits(self, text: str) -> List[str]:
        """Detecta características adicionales del perfil"""
        traits = []

        # Multilingual
        languages = ["inglés", "english", "francés", "french", "alemán", "german",
                    "italiano", "italian", "portugués", "portuguese", "chino", "chinese"]
        language_count = sum(1 for lang in languages if lang in text)
        if language_count >= 2:
            traits.append("multilingual")

        # Remote work
        remote_indicators = ["remote", "remoto", "teletrabajo", "home office", "distributed"]
        if any(indicator in text for indicator in remote_indicators):
            traits.append("remote_ready")

        # International experience
        international_indicators = ["international", "internacional", "global", "multinational"]
        if any(indicator in text for indicator in international_indicators):
            traits.append("international_experience")

        # Startup experience
        startup_indicators = ["startup", "entrepreneurship", "innovation", "innovación"]
        if any(indicator in text for indicator in startup_indicators):
            traits.append("startup_experience")

        # Academic background
        academic_indicators = ["phd", "master", "research", "investigación", "publication"]
        if any(indicator in text for indicator in academic_indicators):
            traits.append("academic_background")

        return traits

    def _detect_multilingual(self, text: str) -> bool:
        """Detecta si el CV está en múltiples idiomas"""
        # Patrones simples para detectar múltiples idiomas
        spanish_patterns = ["experiencia", "habilidades", "educación", "formación"]
        english_patterns = ["experience", "skills", "education", "background"]
        french_patterns = ["expérience", "compétences", "éducation", "formation"]
        portuguese_patterns = ["experiência", "habilidades", "educação", "formação"]

        languages_detected = 0
        text_lower = text.lower()

        if any(pattern in text_lower for pattern in spanish_patterns):
            languages_detected += 1
        if any(pattern in text_lower for pattern in english_patterns):
            languages_detected += 1
        if any(pattern in text_lower for pattern in french_patterns):
            languages_detected += 1
        if any(pattern in text_lower for pattern in portuguese_patterns):
            languages_detected += 1

        return languages_detected > 1

    def _generate_reasons(self, text: str, detected_type: ProfileType, scores: Dict) -> List[str]:
        """Genera razones para la detección del tipo de perfil"""
        reasons = []

        if detected_type == ProfileType.JUNIOR:
            if any(indicator in text for indicator in self.junior_indicators):
                reasons.append("Contiene términos típicos de perfil junior")
            if "universidad" in text or "university" in text:
                reasons.append("Mención de educación universitaria reciente")

        elif detected_type == ProfileType.SENIOR:
            if any(indicator in text for indicator in self.senior_indicators):
                reasons.append("Contiene términos de liderazgo y gestión")
            years_match = re.search(r'(\d+)\+?\s*(años|years)', text)
            if years_match:
                reasons.append(f"Menciona experiencia de {years_match.group(1)} años")

        elif detected_type == ProfileType.TECHNICAL:
            tech_skills_found = [skill for skill in self.technical_skills if skill in text]
            if tech_skills_found:
                reasons.append(f"Contiene habilidades técnicas: {', '.join(tech_skills_found[:3])}")
            if any(indicator in text for indicator in self.technical_indicators):
                reasons.append("Contiene términos técnicos especializados")

        elif detected_type == ProfileType.CREATIVE:
            creative_tools_found = [tool for tool in self.creative_tools if tool in text]
            if creative_tools_found:
                reasons.append(f"Usa herramientas creativas: {', '.join(creative_tools_found[:3])}")
            if "portfolio" in text:
                reasons.append("Menciona portfolio de trabajos")

        # Agregar información sobre scores
        sorted_scores = sorted(scores.items(), key=lambda x: x[1], reverse=True)
        if len(sorted_scores) > 1:
            reasons.append(f"Score más alto: {sorted_scores[0][0].value} ({sorted_scores[0][1]:.1f})")

        return reasons