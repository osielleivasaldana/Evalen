"""
Servicio para analizar estructura de documentos de CV antes de la extracción
Detecta patrones, secciones y formatos específicos
"""
import re
import logging
from typing import Dict, List, Any, Optional, Tuple
from app.models.resume import SectionType, SectionDetection

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Keyword → SectionType classification table (ordered by specificity)
# ---------------------------------------------------------------------------
KEYWORD_CLASSIFICATION: List[Tuple[List[str], SectionType]] = [
    (["experiencia", "work experience", "employment", "trayectoria", "historial laboral",
      "historial profesional", "trabajos", "empleos", "trabajo", "empleo",
      "carrera profesional", "cargo", "puestos"], SectionType.EXPERIENCE),
    (["formación", "formacion", "educación", "educacion", "education", "estudios",
      "academic", "académica", "academica", "preparación académica",
      "formación académica", "formacion academica"], SectionType.EDUCATION),
    (["títulos profesionales", "titulos profesionales", "títulos académicos",
      "titulos academicos", "credenciales", "certificaciones académicas",
      "certificaciones academicas", "grados", "títulos", "titulos",
      "título profesional", "titulo profesional"], SectionType.TITLES),
    (["habilidades", "skills", "competencias técnicas", "competencias tecnicas",
      "herramientas", "tecnologías", "tecnologias", "conocimientos técnicos",
      "conocimientos tecnicos", "aptitudes", "destrezas",
      "competencias"], SectionType.SKILLS),
    (["competencias diferenciales", "competencias transversales",
      "otros antecedentes", "información adicional", "informacion adicional",
      "datos complementarios", "información complementaria",
      "informacion complementaria", "otros datos", "otros",
      "antecedentes adicionales", "datos adicionales"], SectionType.OTHER),
    (["idiomas", "languages", "lenguas", "idioma"], SectionType.LANGUAGES),
    (["certificaciones", "cursos", "capacitaciones", "training",
      "capacitación", "capacitacion", "cursos y certificaciones",
      "diplomados", "seminarios", "talleres"], SectionType.CERTIFICATIONS),
    (["proyectos", "portafolio", "projects", "portfolio",
      "proyectos destacados", "proyectos realizados"], SectionType.PROJECTS),
    (["resumen", "perfil", "sobre mí", "sobre mi", "about me",
      "profile", "objective", "objetivo", "presentación",
      "presentacion", "perfil profesional", "resumen profesional",
      "professional summary", "perfil personal",
      "descripción profesional", "descripcion profesional",
      "descripción", "descripcion",
      "síntesis profesional", "sintesis profesional"], SectionType.SUMMARY),
    (["reconocimientos", "premios", "logros", "awards", "achievements",
      "distinciones", "menciones"], SectionType.AWARDS),
    (["voluntariado", "extracurricular", "volunteer",
      "actividades extracurriculares", "voluntariados"], SectionType.VOLUNTEER),
    (["referencias", "references", "referencias personales",
      "referencias laborales"], SectionType.REFERENCES),
    (["intereses", "hobbies", "interests", "pasatiempos",
      "aficiones", "intereses personales"], SectionType.INTERESTS),
]

# ---------------------------------------------------------------------------
# Ambiguity resolution overrides: (contains_X, contains_Y) → preferred_type
# ---------------------------------------------------------------------------
AMBIGUITY_RULES: List[Tuple[str, str, SectionType]] = [
    # "Competencias Técnicas y Diferenciales" → OTHER (has "diferenciales")
    ("diferenciales", "técnicas", SectionType.OTHER),
    ("diferenciales", "tecnicas", SectionType.OTHER),
    ("transversales", "competencias", SectionType.OTHER),
    # "Títulos y Certificaciones" → TITLES
    ("títulos", "certificaciones", SectionType.TITLES),
    ("titulos", "certificaciones", SectionType.TITLES),
    ("títulos", "cursos", SectionType.TITLES),
    ("titulos", "cursos", SectionType.TITLES),
    # "Formación y Cursos" → EDUCATION
    ("formación", "cursos", SectionType.EDUCATION),
    ("formacion", "cursos", SectionType.EDUCATION),
    ("educación", "cursos", SectionType.EDUCATION),
    ("educacion", "cursos", SectionType.EDUCATION),
    # "Competencias Técnicas" (sin "diferenciales") → SKILLS
    ("competencias técnicas", "", SectionType.SKILLS),
    ("competencias tecnicas", "", SectionType.SKILLS),
]


class DocumentAnalyzerService:
    """
    Analiza documentos de CV para entender su estructura antes de la extracción
    """

    def __init__(self):
        self.section_patterns = {
            "experience": [
                r"experiencia\s*(?:laboral|profesional)?",
                r"experiencia",
                r"experience",
                r"trabajo",
                r"empleo",
                r"carrera\s*profesional",
                r"historia\s*laboral"
            ],
            "education": [
                r"formaci[óo]n\s*(?:acad[ée]mica)?",
                r"formaci[óo]n",
                r"educaci[óo]n",
                r"education",
                r"estudios",
                r"t[ií]tulos",
                r"acad[ée]mico"
            ],
            "skills": [
                r"habilidades",
                r"competencias",
                r"skills",
                r"capacidades",
                r"conocimientos",
                r"aptitudes",
                r"destrezas"
            ],
            "languages": [
                r"idiomas",
                r"languages",
                r"lenguas"
            ]
        }

        self.rating_patterns = [
            r"★+",
            r"\*+",
            r"●+",
            r"■+",
            r"(?:\d+/\d+|\d+%)",
            r"(?:básico|intermedio|avanzado|experto|nativo)",
            r"(?:principiante|junior|senior|expert)"
        ]

    # ─────────────────────────────────────────────────────────────────────
    # NEW: analyze() — returns List[SectionDetection] with full classification
    # ─────────────────────────────────────────────────────────────────────

    def analyze(self, text: str) -> List[SectionDetection]:
        """
        Segmenta el texto del CV en secciones detectando headers y clasificándolos.

        Algoritmo:
        1. Recorrer líneas detectando líneas cortas, all-caps/Title Case,
           con keywords de secciones conocidas.
        2. Clasificar cada header por keywords con tabla de clasificación.
        3. Resolver ambigüedades (ej: "Competencias Técnicas y Diferenciales").
        4. Asignar límites start_line / end_line.
        5. POST-PROCESAMIENTO: fusionar secciones pequeñas (< 20 chars contenido),
           unificar secciones adyacentes del mismo tipo, deduplicar.

        Returns:
            List[SectionDetection] ordenadas por start_line
        """
        if not text or not text.strip():
            return []

        lines = text.split('\n')
        n = len(lines)

        # Paso 1: detectar candidatos a header
        header_candidates: List[Dict[str, Any]] = []
        for i, line in enumerate(lines):
            stripped = line.strip()
            if not stripped:
                continue
            if len(stripped) > 120:
                continue  # demasiado larga para ser header

            if self._looks_like_header(stripped, lines, i, n):
                header_candidates.append({
                    "line_index": i,
                    "header_text": stripped,
                    "confidence": 0.5,
                })

        if not header_candidates:
            return []

        # Paso 2: clasificar cada header
        for h in header_candidates:
            h_lower = h["header_text"].lower()
            section_type, confidence = self._classify_header(h_lower)
            h["section_type"] = section_type
            h["confidence"] = confidence

        # Paso 3: resolver ambigüedades entre headers adyacentes
        self._resolve_ambiguities(header_candidates)

        # Paso 4: asignar límites
        detections: List[SectionDetection] = []
        for idx, h in enumerate(header_candidates):
            start_line = h["line_index"]
            if idx + 1 < len(header_candidates):
                end_line = header_candidates[idx + 1]["line_index"]
            else:
                end_line = n

            detections.append(SectionDetection(
                section_type=h["section_type"],
                section_name=h["header_text"],
                start_line=start_line,
                end_line=end_line,
                confidence=h["confidence"],
            ))

        # Paso 5: POST-PROCESAMIENTO — fusionar secciones pequeñas y deduplicar
        detections = self._post_process_sections(detections, lines)

        return detections

    # ── Patrones de fecha para descartar líneas que NO son headers ──
    _DATE_PATTERNS: List[re.Pattern] = [
        re.compile(r'(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|'
                   r'septiembre|octubre|noviembre|diciembre|'
                   r'january|february|march|april|may|june|july|august|'
                   r'september|october|november|december)\s+\d{4}',
                   re.IGNORECASE),
        re.compile(r'\d{1,2}/\d{4}\s*[-–—]\s*\d{1,2}/\d{4}'),
        re.compile(r'\d{4}\s*[-–—]\s*(?:\d{4}|presente|actualidad|a la fecha|actual|now)',
                   re.IGNORECASE),
        re.compile(r'^\d{4}\s*[-–—]\s*\d{4}$'),
    ]

    # ── Palabras que sugieren que una línea NO es un header (es contenido) ──
    _NOT_HEADER_INDICATORS: List[str] = [
        "experiencia", "liderazgo", "gestión", "gesti", "responsable",
        "implementación", "implementaci", "desarrollo", "coordinación",
        "coordinaci", "administración", "administraci", "supervisión",
        "supervisi", "dirección", "direcci",
    ]

    _BULLET_CHARS = set('•-*○▪◆◇‣◦‣·')

    def _looks_like_header(self, line: str, lines: List[str], idx: int, n: int) -> bool:
        """Determina si una línea parece un header de sección.

        Reglas (en orden de prioridad):
        1. ⛔ NUNCA header si empieza con bullet o parece fecha
        2. ✅ All-caps + short (≤ 6 palabras) → header seguro
        3. ✅ Termina con ':' → posible header
        4. ✅ Contiene keyword de sección conocida Y:
           - La línea es corta (≤ 50 chars), O
           - Es Title Case (keyword como sujeto principal)
           - Es la keyword primaria (aparece en los primeros 30 chars)
        5. ❌ Title Case por sí solo NO es suficiente (demasiados falsos positivos)
        """
        stripped = line.strip()

        # ⛔ NO header si empieza con bullet
        if stripped and stripped[0] in self._BULLET_CHARS:
            return False

        # ⛔ NO header si parece una fecha
        if self._looks_like_date(stripped):
            return False

        # All-caps + short → header seguro
        if line.isupper() and len(line.split()) <= 6:
            return True

        # Termina con ':' → posible header
        if line.rstrip().endswith(':'):
            return True

        # Contiene keywords de secciones conocidas
        # La keyword debe ser el sujeto principal: aparecer en los primeros 10 chars
        line_lower = line.lower()
        for keywords, _ in KEYWORD_CLASSIFICATION:
            for kw in keywords:
                if kw in line_lower and self._keyword_is_primary_subject(line_lower, kw):
                    return True

        return False

    @staticmethod
    def _is_title_case(line: str) -> bool:
        """Chequea si una línea está en Title Case (cada palabra empieza con mayúscula)."""
        words = line.split()
        if len(words) < 2:
            return False
        capital_words = sum(1 for w in words if w and w[0].isupper())
        return capital_words >= len(words) * 0.6 and len(words) <= 8

    def _classify_header(self, header_lower: str) -> Tuple[SectionType, float]:
        """
        Clasifica un header por keywords en orden de especificidad.

        Returns:
            (SectionType, confidence)
        """
        best_type = SectionType.OTHER
        best_confidence = 0.0
        best_kw_length = 0  # prefer keyword más larga (más específica)

        for keywords, section_type in KEYWORD_CLASSIFICATION:
            for kw in keywords:
                if kw in header_lower:
                    # Si la keyword es más larga, es más específica
                    if len(kw) > best_kw_length:
                        best_type = section_type
                        best_confidence = 0.9
                        best_kw_length = len(kw)
                    elif len(kw) == best_kw_length and best_confidence < 0.9:
                        best_type = section_type
                        best_confidence = 0.9

        return best_type, best_confidence

    def _resolve_ambiguities(self, candidates: List[Dict[str, Any]]) -> None:
        """
        Aplica reglas de resolución de ambigüedades.
        - "Competencias Técnicas y Diferenciales" → OTHER
        - "Títulos y Certificaciones" → TITLES
        """
        for h in candidates:
            header_lower = h["header_text"].lower()

            for contain_a, contain_b, preferred_type in AMBIGUITY_RULES:
                if contain_a and contain_b:
                    if contain_a in header_lower and contain_b in header_lower:
                        h["section_type"] = preferred_type
                        h["confidence"] = 0.95
                        break
                elif contain_a in header_lower:
                    h["section_type"] = preferred_type
                    h["confidence"] = 0.95
                    break

    # ─────────────────────────────────────────────────────────────────────
    # POST-PROCESAMIENTO de secciones detectadas
    # ─────────────────────────────────────────────────────────────────────

    def _post_process_sections(
        self, detections: List[SectionDetection], lines: List[str]
    ) -> List[SectionDetection]:
        """
        Post-procesa las secciones detectadas:
        1. Fusiona secciones con < 20 caracteres de contenido real con la siguiente
           (extendiendo el start_line de la siguiente, conservando su identidad).
        2. Fusiona secciones adyacentes del mismo tipo SOLO si son consecutivas
           (no hay contenido sustancial entre ellas).
        3. Elimina duplicados por tipo (conserva la de mayor contenido).
        """
        if len(detections) <= 1:
            return detections

        # ── Calcular contenido real por sección (sin la línea del header) ──
        def _content_chars(det: SectionDetection) -> int:
            content_lines = [
                l.strip() for l in lines[det.start_line + 1:det.end_line] if l.strip()
            ]
            return sum(len(l) for l in content_lines)

        # ── 1. Absorber secciones con < 20 chars de contenido ──
        merged: List[SectionDetection] = []
        i = 0
        while i < len(detections):
            current = detections[i]
            current_chars = _content_chars(current)

            if current_chars < 20 and i + 1 < len(detections):
                # Extender la siguiente sección hacia atrás (absorber la actual)
                next_d = detections[i + 1]
                merged.append(SectionDetection(
                    section_type=next_d.section_type,
                    section_name=next_d.section_name,
                    start_line=current.start_line,
                    end_line=next_d.end_line,
                    confidence=next_d.confidence,
                ))
                i += 2
            else:
                merged.append(current)
                i += 1

        if len(merged) <= 1:
            return merged

        # ── 2. Fusionar secciones adyacentes del mismo tipo ──
        final: List[SectionDetection] = [merged[0]]
        for d in merged[1:]:
            prev = final[-1]
            # Solo fusionar si son del mismo tipo Y consecutivas
            # (end_line de prev == start_line de d → no hay headers entre ellos)
            if prev.section_type == d.section_type and prev.end_line == d.start_line:
                final[-1] = SectionDetection(
                    section_type=prev.section_type,
                    section_name=prev.section_name,
                    start_line=prev.start_line,
                    end_line=d.end_line,
                    confidence=max(prev.confidence, d.confidence),
                )
            else:
                final.append(d)

        if len(final) <= 1:
            return final

        # ── 3. Deduplicar por tipo: conservar la de mayor contenido ──
        best_by_type: Dict[SectionType, SectionDetection] = {}
        for d in final:
            key = d.section_type
            if key not in best_by_type:
                best_by_type[key] = d
            else:
                existing_chars = _content_chars(best_by_type[key])
                current_chars = _content_chars(d)
                if current_chars > existing_chars:
                    best_by_type[key] = d

        # Reconstruir lista ordenada por start_line
        result = sorted(best_by_type.values(), key=lambda d: d.start_line)

        return result

    # ─────────────────────────────────────────────────────────────────────
    # Helpers para _looks_like_header
    # ─────────────────────────────────────────────────────────────────────

    @staticmethod
    def _looks_like_date(line: str) -> bool:
        """Determina si una línea parece una fecha/periodo (NO es header)."""
        for pat in DocumentAnalyzerService._DATE_PATTERNS:
            if pat.search(line):
                return True
        return False

    @staticmethod
    def _keyword_is_primary_subject(line_lower: str, kw: str) -> bool:
        """
        Verifica si la keyword es el sujeto principal de la línea
        (aparece muy cerca del inicio, indicando que la línea es un header
        y no contenido que incidentalmente contiene la keyword).
        """
        pos = line_lower.find(kw)
        if pos == -1:
            return False
        # La keyword debe estar en los primeros 10 caracteres
        return pos <= 10

    # ─────────────────────────────────────────────────────────────────────
    # LEGACY methods (preserved for backward compatibility)
    # ─────────────────────────────────────────────────────────────────────

    def analyze_document(self, text: str) -> Dict[str, Any]:
        """
        Analiza la estructura completa del documento (legacy)
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
        """Detecta secciones del documento y su contenido (legacy)"""
        sections = {}

        for section_type, patterns in self.section_patterns.items():
            section_info = self._find_section_in_text(text, patterns, section_type)
            if section_info:
                sections[section_type] = section_info

        return sections

    def _find_section_in_text(self, text: str, patterns: List[str], section_type: str) -> Optional[Dict[str, Any]]:
        """Busca una sección específica en el texto usando múltiples patrones"""
        lines = text.split('\n')

        for i, line in enumerate(lines):
            line_clean = line.strip().lower()

            for pattern in patterns:
                if re.search(pattern, line_clean):
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
        """Extrae el contenido de una sección desde su inicio hasta la siguiente sección"""
        content_lines = []

        for i in range(start_index + 1, len(lines)):
            line = lines[i].strip()

            if self._is_likely_section_header(line):
                break

            if line:
                content_lines.append(line)
            elif len(content_lines) > 0 and i < len(lines) - 1:
                next_non_empty = self._find_next_non_empty_line(lines, i)
                if next_non_empty and self._is_likely_section_header(next_non_empty):
                    break

        return '\n'.join(content_lines)

    def _is_likely_section_header(self, line: str) -> bool:
        """Determina si una línea es probablemente un encabezado de sección"""
        if not line.strip():
            return False

        line_clean = line.strip().lower()

        all_patterns = []
        for patterns in self.section_patterns.values():
            all_patterns.extend(patterns)

        for pattern in all_patterns:
            if re.search(pattern, line_clean):
                return True

        if line.isupper() and len(line.split()) <= 4:
            return True

        if line.endswith(':'):
            return True

        return False

    def _find_next_non_empty_line(self, lines: List[str], start_index: int) -> Optional[str]:
        """Encuentra la siguiente línea no vacía"""
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