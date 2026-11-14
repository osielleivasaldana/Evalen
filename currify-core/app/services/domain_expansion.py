"""Expansión léxica LADO RÚBRICA por dominio (batch-fix F3, 2026-08-25).

Drift conceptual corregido: un requisito como "Currículum Nacional de Educación
Parvularia" recibía 0.00 frente a CVs que usan el lenguaje NATIVO del marco
("ámbitos de aprendizaje", "núcleos de aprendizaje"...). Esta expansión genera
sondas de sinónimos DEL LADO DEL REQUISITO antes del cálculo de bandas del
scoring, alimentando el matching literal/de-banda existente.

Invariantes:
- 100% estático/determinista. NUNCA vía LLM (presupuesto).
- El judge mantiene su rol actual: solo <0.65 tras expansión, evidencia literal,
  cache y máximo 6 llamadas (intactos en scoring_service).
- Extensible: agregar dominio = añadir una entrada a DOMAIN_SKILL_RULES
  (educación parvularia primero; estructura lista para salud/oficios).
"""
import re
import unicodedata
from typing import Any, Dict, List, Set

# Reglas por dominio. `triggers`: frases normalizadas cuya presencia en la skill
# requerida activa la regla. `synonyms`: sondas de lenguaje nativo del dominio
# que se acreditan como match literal si aparecen en el CV (skills expandidas o
# texto de contexto). Frases de UNA palabra se matchean con borde de palabra.
DOMAIN_SKILL_RULES: List[Dict[str, Any]] = [
    {
        "domain": "educacion_parvularia",
        "description": "Currículum Nacional de Educación Parvularia (CNEP) y su lenguaje nativo",
        "triggers": [
            "curriculum nacional de educacion parvularia",
            "curriculum nacional educacion parvularia",
            "curriculum nacional de educacion inicial",
            "curriculum nacional",
            "cnep",
        ],
        "synonyms": [
            "ambitos de aprendizaje",
            "nucleos de aprendizaje",
            "planificacion por ambitos",
            "por ambitos",
            "ambitos",
        ],
    },
    # ── Extensible (estructura lista; añadir entradas según necesidad) ──
    # {
    #     "domain": "salud",
    #     "description": "Protocolos/marcos clínicos y su lenguaje nativo",
    #     "triggers": [...],
    #     "synonyms": [...],
    # },
]


def normalize_text(text: str) -> str:
    """Normaliza para matching léxico: lowercase, sin tildes, espacios colapsados."""
    t = unicodedata.normalize("NFD", str(text or "").lower())
    t = "".join(c for c in t if not unicodedata.combining(c))
    return re.sub(r"\s+", " ", t).strip()


def _build_trigger_matchers() -> List[Dict[str, Any]]:
    """Compila los triggers una sola vez al importar (determinista)."""
    matchers: List[Dict[str, Any]] = []
    for rule in DOMAIN_SKILL_RULES:
        compiled = []
        for trig in rule.get("triggers", []):
            t_norm = normalize_text(trig)
            if not t_norm:
                continue
            if len(t_norm.split()) == 1:
                compiled.append(re.compile(r"\b" + re.escape(t_norm) + r"\b"))
            else:
                compiled.append(re.compile(re.escape(t_norm)))
        matchers.append({"domain": rule.get("domain"), "patterns": compiled,
                         "synonyms": [normalize_text(s) for s in rule.get("synonyms", []) if normalize_text(s)]})
    return matchers


_TRIGGER_MATCHERS = _build_trigger_matchers()


def expand_rubric_skill(skill: str) -> Set[str]:
    """Devuelve las sondas de dominio aplicables a UNA skill del lado rúbrica.

    - Skill fuera de todo dominio → set() vacío (comportamiento idéntico al previo).
    - Determinista: misma entrada → mismas sondas, cero llamadas LLM.
    """
    normalized = normalize_text(skill)
    if not normalized:
        return set()
    probes: Set[str] = set()
    for matcher in _TRIGGER_MATCHERS:
        if any(p.search(normalized) for p in matcher["patterns"]):
            probes.update(matcher["synonyms"])
    return probes
