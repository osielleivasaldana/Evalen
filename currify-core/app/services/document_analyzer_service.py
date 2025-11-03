"""
Servicio para analizar estructura de documentos de CV antes de la extracción
Detecta patrones, secciones y formatos específicos
"""
import re
import logging
from typing import Dict, List, Any, Optional, Tuple

logger = logging.getLogger(__name__)

class DocumentAnalyzerService:
    """
    Analiza documentos de CV para entender su estructura antes de la extracción
    """

    def __init__(self):
        self.section_patterns = {
            # Experiencia laboral
            "experience": [
                r"experiencia\s*(?:laboral|profesional)?",
                r"experiencia",
                r"experience",
                r"trabajo",
                r"empleo",
                r"carrera\s*profesional",
                r"historia\s*laboral"
            ],

            # Educación/Formación
            "education": [
                r"formaci[óo]n\s*(?:acad[ée]mica)?",
                r"formaci[óo]n",
                r"educaci[óo]n",
                r"education",
                r"estudios",
                r"t[ií]tulos",
                r"acad[ée]mico"
            ],

            # Habilidades
            "skills": [
                r"habilidades",
                r"competencias",
                r"skills",
                r"capacidades",
                r"conocimientos",
                r"aptitudes",
                r"destrezas"
            ],

            # Idiomas
            "languages": [
                r"idiomas",
                r"languages",
                r"lenguas"
            ]
        }

        # Patrones para detectar sistemas de evaluación
        self.rating_patterns = [
            r"★+",  # Estrellas
            r"\*+", # Asteriscos
            r"●+",  # Puntos
            r"■+",  # Cuadrados
            r"(?:\d+/\d+|\d+%)",  # Fracciones o porcentajes
            r"(?:básico|intermedio|avanzado|experto|nativo)",  # Niveles
            r"(?:principiante|junior|senior|expert)"
        ]

    def analyze_document(self, text: str) -> Dict[str, Any]:
        """
        Analiza la estructura completa del documento
        """
        try:
            analysis = {
                "sections_detected": self._detect_sections(text),
                "rating_systems": self._detect_rating_systems(text),
                "structure_type": self._determine_structure_type(text),
                "language": self._detect_language(text),
                "formatting_clues": self._extract_formatting_clues(text),
                "content_density": self._analyze_content_density(text)
            }

            logger.info(f"Document analysis completed: {len(analysis['sections_detected'])} sections detected")
            return analysis

        except Exception as e:
            logger.error(f"Error in document analysis: {e}")
            return self._create_basic_analysis()

    def _detect_sections(self, text: str) -> Dict[str, Dict[str, Any]]:
        """
        Detecta secciones del documento y su contenido
        """
        sections = {}
        lines = text.split('\n')

        for section_type, patterns in self.section_patterns.items():
            section_info = self._find_section_in_text(text, patterns, section_type)
            if section_info:
                sections[section_type] = section_info

        return sections

    def _find_section_in_text(self, text: str, patterns: List[str], section_type: str) -> Optional[Dict[str, Any]]:
        """
        Busca una sección específica en el texto usando múltiples patrones
        """
        lines = text.split('\n')

        for i, line in enumerate(lines):
            line_clean = line.strip().lower()

            for pattern in patterns:
                if re.search(pattern, line_clean):
                    # Encontramos el inicio de la sección
                    section_start = i
                    section_content = self._extract_section_content(lines, section_start, section_type)

                    return {
                        "title": line.strip(),
                        "start_line": section_start,
                        "content": section_content,
                        "pattern_matched": pattern,
                        "content_length": len(section_content)
                    }

        return None

    def _extract_section_content(self, lines: List[str], start_index: int, section_type: str) -> str:
        """
        Extrae el contenido de una sección desde su inicio hasta la siguiente sección
        """
        content_lines = []

        # Buscar contenido después del título de la sección
        for i in range(start_index + 1, len(lines)):
            line = lines[i].strip()

            # Si encontramos otra sección (línea en mayúsculas o con patrones conocidos), detenerse
            if self._is_likely_section_header(line):
                break

            # Si la línea no está vacía, agregarla al contenido
            if line:
                content_lines.append(line)
            # Si hay líneas vacías consecutivas, puede ser el fin de la sección
            elif len(content_lines) > 0 and i < len(lines) - 1:
                # Mirar las próximas líneas para decidir si continuar
                next_non_empty = self._find_next_non_empty_line(lines, i)
                if next_non_empty and self._is_likely_section_header(next_non_empty):
                    break

        return '\n'.join(content_lines)

    def _is_likely_section_header(self, line: str) -> bool:
        """
        Determina si una línea es probablemente un encabezado de sección
        """
        if not line.strip():
            return False

        line_clean = line.strip().lower()

        # Buscar patrones de sección conocidos
        all_patterns = []
        for patterns in self.section_patterns.values():
            all_patterns.extend(patterns)

        for pattern in all_patterns:
            if re.search(pattern, line_clean):
                return True

        # Heurísticas adicionales
        # - Línea corta en mayúsculas
        if line.isupper() and len(line.split()) <= 4:
            return True

        # - Línea que termina con :
        if line.endswith(':'):
            return True

        return False

    def _find_next_non_empty_line(self, lines: List[str], start_index: int) -> Optional[str]:
        """
        Encuentra la siguiente línea no vacía
        """
        for i in range(start_index, len(lines)):
            line = lines[i].strip()
            if line:
                return line
        return None

    def _detect_rating_systems(self, text: str) -> List[Dict[str, Any]]:
        """
        Detecta sistemas de evaluación/rating en el texto (estrellas, porcentajes, etc.)
        """
        rating_systems = []

        for pattern in self.rating_patterns:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                # Obtener contexto alrededor del match
                start = max(0, match.start() - 50)
                end = min(len(text), match.end() + 50)
                context = text[start:end]

                rating_systems.append({
                    "pattern": pattern,
                    "matched_text": match.group(),
                    "position": match.start(),
                    "context": context.strip()
                })

        return rating_systems

    def _determine_structure_type(self, text: str) -> str:
        """
        Determina el tipo de estructura del documento
        """
        # Analizar patrones de estructura
        if "★" in text or "☆" in text:
            return "visual_rating"
        elif re.search(r"\d+/\d+", text):
            return "fractional_rating"
        elif re.search(r"\d+%", text):
            return "percentage_rating"
        elif any(level in text.lower() for level in ["básico", "intermedio", "avanzado", "experto"]):
            return "level_rating"
        else:
            return "standard"

    def _detect_language(self, text: str) -> str:
        """
        Detecta el idioma principal del documento
        """
        spanish_indicators = ["experiencia", "formación", "habilidades", "educación"]
        english_indicators = ["experience", "education", "skills", "work"]

        spanish_count = sum(1 for word in spanish_indicators if word in text.lower())
        english_count = sum(1 for word in english_indicators if word in text.lower())

        if spanish_count > english_count:
            return "spanish"
        elif english_count > spanish_count:
            return "english"
        else:
            return "mixed"

    def _extract_formatting_clues(self, text: str) -> Dict[str, Any]:
        """
        Extrae pistas de formato que pueden ayudar en la extracción
        """
        return {
            "has_bullet_points": bool(re.search(r'[-•*]', text)),
            "has_dates": bool(re.search(r'\d{4}', text)),
            "has_email": bool(re.search(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', text)),
            "has_phone": bool(re.search(r'[\+]?[\d\s\-\(\)]{8,}', text)),
            "line_count": len(text.split('\n')),
            "avg_line_length": sum(len(line) for line in text.split('\n')) / len(text.split('\n'))
        }

    def _analyze_content_density(self, text: str) -> Dict[str, Any]:
        """
        Analiza la densidad de contenido por sección
        """
        lines = text.split('\n')
        non_empty_lines = [line for line in lines if line.strip()]

        return {
            "total_lines": len(lines),
            "content_lines": len(non_empty_lines),
            "empty_line_ratio": (len(lines) - len(non_empty_lines)) / len(lines),
            "avg_words_per_line": sum(len(line.split()) for line in non_empty_lines) / max(1, len(non_empty_lines))
        }

    def _create_basic_analysis(self) -> Dict[str, Any]:
        """
        Crea un análisis básico de fallback
        """
        return {
            "sections_detected": {},
            "rating_systems": [],
            "structure_type": "standard",
            "language": "unknown",
            "formatting_clues": {},
            "content_density": {}
        }

    def create_extraction_hints(self, analysis: Dict[str, Any]) -> Dict[str, str]:
        """
        Crea hints específicos para la extracción basados en el análisis
        """
        hints = {}

        # Hints para secciones detectadas
        for section_type, section_info in analysis.get("sections_detected", {}).items():
            if section_type == "experience":
                hints["experience_section"] = f"La sección de experiencia se titula '{section_info['title']}' y contiene: {section_info['content'][:200]}..."
            elif section_type == "education":
                hints["education_section"] = f"La sección de educación se titula '{section_info['title']}' y contiene: {section_info['content'][:200]}..."
            elif section_type == "skills":
                hints["skills_section"] = f"La sección de habilidades se titula '{section_info['title']}' y contiene: {section_info['content'][:200]}..."

        # Hints para sistemas de rating
        if analysis.get("rating_systems"):
            rating_examples = [rs["matched_text"] for rs in analysis["rating_systems"][:3]]
            hints["rating_system"] = f"El documento usa sistemas de evaluación como: {', '.join(rating_examples)}"

        # Hints de estructura
        hints["structure_type"] = analysis.get("structure_type", "standard")
        hints["language"] = analysis.get("language", "unknown")

        return hints