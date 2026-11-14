"""Clasificación determinista de habilidades blandas (batch-fix F2, 2026-08-25).

Léxico estático/extensible, SIN LLM (presupuesto): se usa en la inyección
parser→rúbrica para garantizar que una entrada clasificable como blanda NUNCA
entre a mandatory_skills (regla anti-soft del prompt de rúbrica) y se redirija
a su bucket correcto (skills.soft_skills).

Extender = añadir entradas a SOFT_SKILL_PHRASES / SOFT_SKILL_WORDS.
"""
import re
import unicodedata
from typing import Optional

# Frases multi-palabra (match con bordes de palabra sobre texto normalizado)
SOFT_SKILL_PHRASES = [
    "trabajo en equipo",
    "trabajo colaborativo",
    "trabajo bajo presion",
    "resolucion de conflictos",
    "resolucion de problemas",
    "resolucion de desafios",
    "manejo de conflictos",
    "comunicacion efectiva",
    "comunicacion asertiva",
    "comunicacion interpersonal",
    "buena comunicacion",
    "habilidades de comunicacion",
    "habilidades sociales",
    "habilidades blandas",
    "relaciones interpersonales",
    "relaciones efectivas",
    "escucha activa",
]

# Palabras simples (match con borde de palabra; evita falsos positivos como
# 'responsabilidades' o 'adaptaciones', que NO contienen la palabra exacta)
SOFT_SKILL_WORDS = [
    "liderazgo",
    "liderar",
    "proactividad",
    "proactivo",
    "proactiva",
    "creatividad",
    "creativo",
    "creativa",
    "empatia",
    "empatico",
    "empatica",
    "inclusion",
    "adaptabilidad",
    "adaptable",
    "flexibilidad",
    "puntualidad",
    "responsabilidad",
    "honestidad",
    "integridad",
    "colaboracion",
    "negociacion",
    "autonomia",
    "motivacion",
    "resiliencia",
    "paciencia",
]


def normalize_skill_text(text: Optional[str]) -> str:
    """Normaliza para matching léxico: lowercase, sin tildes, espacios colapsados."""
    t = unicodedata.normalize("NFD", str(text or "").lower())
    t = "".join(c for c in t if not unicodedata.combining(c))
    return re.sub(r"\s+", " ", t).strip()


# Compilados una sola vez al importar (determinista, sin estado mutable)
_PHRASE_PATTERNS = [re.compile(r"\b" + re.escape(p) + r"\b") for p in SOFT_SKILL_PHRASES]
_WORD_PATTERNS = [re.compile(r"\b" + re.escape(w) + r"\b") for w in SOFT_SKILL_WORDS]


def is_soft_skill(name: Optional[str]) -> bool:
    """True si la entrada es clasificable como habilidad blanda (léxico estático).

    Determinista y agnóstico al dominio: NO usa LLM. Diseñado para el filtro
    anti-soft de la inyección parser→mandatory_skills.
    """
    normalized = normalize_skill_text(name)
    if not normalized:
        return False
    return (
        any(p.search(normalized) for p in _PHRASE_PATTERNS)
        or any(w.search(normalized) for w in _WORD_PATTERNS)
    )
