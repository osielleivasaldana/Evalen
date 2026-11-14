"""Clasificador determinista de tiers mandatory/nice-to-have (Fase B P3, SDD §4.3).

Corrección post-LLM SIN llamadas LLM nuevas (presupuesto §6.4): clasifica un texto
de requisito usando pistas léxicas estáticas sobre texto normalizado (lowercase,
sin tildes, sin puntuación relevante) y se aplica como post-procesado en
DynamicRubricService.generate_rubric DESPUÉS del filtro anti-soft (orden:
anti-soft → tier-reclass), gated por el feature flag RUBRIC_TIER_RECLASS
(default OFF = comportamiento actual preservado, ver SDD §9).

REGLA DE ORO (SDD §4.3): JAMÁS promover a mandatory. Solo degradar a nice CON
evidencia léxica explícita. Retorno None ⇒ se respeta la asignación del LLM.

Extender = añadir entradas a NICE_PHRASES / NICE_WORDS / MANDATORY_STRONG_WORDS.
"""
import json
import logging
import re
import unicodedata
from collections import deque
from typing import Optional

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# Léxico estático (normalizado sin tildes; matching con bordes de palabra)
# ─────────────────────────────────────────────────────────────────────────────

# Frases multi-palabra con lectura clara de "deseable/complementaria"
NICE_PHRASES = [
    "se valora",
    "se agradece",
    "no excluyente",
    "no excluyente",
]

# Palabras simples con lectura nice-to-have
NICE_WORDS = [
    "deseable",
    "deseables",
    "deseablemente",
    "valorable",
    "valorables",
    "valora",
    "ideal",
    "ideales",
    "idealmente",
]

# Palabras con lectura mandatory FUERTE (cláusula excluyente explícita).
# Precedencia sobre pistas nice: si coexisten, gana la señal excluyente del
# empleador (decisión documentada en docs/debug/2026-08-26-fase-b-rubric-tier.md).
MANDATORY_STRONG_WORDS = [
    "excluyente",
    "excluyentes",
    "imprescindible",
    "imprescindibles",
    "obligatorio",
    "obligatoria",
    "obligatorios",
    "obligatorias",
    "indispensable",
    "indispensables",
]


def normalize_requirement_text(text: Optional[str]) -> str:
    """Normaliza para matching léxico: lowercase, sin tildes NFD, espacios colapsados."""
    t = unicodedata.normalize("NFD", str(text or "").lower())
    t = "".join(c for c in t if not unicodedata.combining(c))
    return re.sub(r"\s+", " ", t).strip()


# Compilados una sola vez al importar (determinista, sin estado mutable)
_NICE_PHRASE_PATTERNS = [re.compile(r"\b" + re.escape(p) + r"\b") for p in NICE_PHRASES]
_NICE_WORD_PATTERNS = [re.compile(r"\b" + re.escape(w) + r"\b") for w in NICE_WORDS]
_MANDATORY_WORD_PATTERNS = [re.compile(r"\b" + re.escape(w) + r"\b") for w in MANDATORY_STRONG_WORDS]

# Pista "básic(o/a)s herramientas" (SDD §4.3): co-ocurrencia de un token con raíz
# "herram" y una variante de "básico/a(s)". Cubre ambos órdenes ("herramientas
# tecnológicas básicas" y "básicas herramientas de oficina") — es la lectura mínima
# que hace pasar el contraejemplo obligatorio del SDD sin sobre-degradar.
_HERRAM_TOKEN = re.compile(r"\bherram\w*")
_BASICO_TOKEN = re.compile(r"\bbasic[oa]s?\b")


def classify_requirement_tier(texto_requisito: Optional[str]) -> Optional[str]:
    """Clasifica un requisito como "mandatory" | "nice" | None (léxico puro, sin LLM).

    - "mandatory": evidencia léxica fuerte (cláusula excluyente explícita).
      Confirmatoria: el post-procesado nunca promueve, solo respeta/conserva.
    - "nice": evidencia léxica de deseable/complementario (incluye herramientas
      básicas) ⇒ candidato a degradación desde mandatory_skills.
    - None: sin pista ⇒ se respeta la asignación del LLM.

    Precedencia: mandatory-fuerte > nice (ver decisión D2 en el acta Fase B).
    """
    normalized = normalize_requirement_text(texto_requisito)
    if not normalized:
        return None

    # 1) Mandatory fuerte primero (precedencia sobre pistas nice)
    if any(p.search(normalized) for p in _MANDATORY_WORD_PATTERNS):
        return "mandatory"

    # 2) Pistas nice léxicas
    if any(p.search(normalized) for p in _NICE_PHRASE_PATTERNS):
        return "nice"
    if any(p.search(normalized) for p in _NICE_WORD_PATTERNS):
        return "nice"

    # 3) Co-ocurrencia herramientas × básicas (contraejemplo obligatorio SDD)
    if _HERRAM_TOKEN.search(normalized) and _BASICO_TOKEN.search(normalized):
        return "nice"

    return None


# ─────────────────────────────────────────────────────────────────────────────
# Observabilidad (SDD §4.3.3): cada re-clasificación genera evento con
# {requisito_original, decisión, pista_disparadora}. Buffer acotado local +
# mirror best-effort a analytics_storage (sin cambios de endpoints/HTTP).
# ─────────────────────────────────────────────────────────────────────────────

_RECLASS_EVENTS_MAX = 500
_RECLASS_EVENTS: deque = deque(maxlen=_RECLASS_EVENTS_MAX)


def first_triggering_hint(normalized: str) -> str:
    """Devuelve la primera pista léxica literal presente en el texto normalizado."""
    for p in _MANDATORY_WORD_PATTERNS:
        m = p.search(normalized)
        if m:
            return m.group(0)
    for p in _NICE_PHRASE_PATTERNS:
        m = p.search(normalized)
        if m:
            return m.group(0)
    for p in _NICE_WORD_PATTERNS:
        m = p.search(normalized)
        if m:
            return m.group(0)
    if _HERRAM_TOKEN.search(normalized) and _BASICO_TOKEN.search(normalized):
        return "herramientas+basicas"
    return ""


def record_reclass_event(
    requisito_original: str,
    decision: str,
    pista: str,
    destino: str = "nice_to_have_skills",
) -> dict:
    """Registra un evento de re-clasificación: buffer acotado + log estructurado
    JSON + mirror best-effort a analytics (nunca rompe el flujo de scoring)."""
    event = {
        "requisito_original": requisito_original,
        "decision": decision,
        "pista_disparadora": pista,
        "destino": destino,
    }
    _RECLASS_EVENTS.append(event)

    # Mirror best-effort al storage de analytics (lazy import: evita ciclos;
    # fallo ⇒ silencioso, el buffer local y el log estructurado son la fuente).
    try:
        from app.api.analytics import analytics_storage  # noqa: WPS433

        bucket = analytics_storage.setdefault("rubric_tier_reclass", [])
        bucket.append({"timestamp": __import__("datetime").datetime.now().isoformat(), **event})
        if len(bucket) > _RECLASS_EVENTS_MAX:
            del bucket[:-_RECLASS_EVENTS_MAX]
    except Exception:  # pragma: no cover - entorno sin API montada
        pass

    return event


def get_recent_reclass_events():
    """Eventos de re-clasificación recientes (más nuevos al final)."""
    return list(_RECLASS_EVENTS)


def clear_reclass_events() -> None:
    """Limpia el buffer local (uso en tests/harness para isolación)."""
    _RECLASS_EVENTS.clear()


def structured_reclass_log_payload(event: dict) -> str:
    """Payload JSON canónico para el log estructurado [TIER-RECLASS]."""
    return json.dumps(event, ensure_ascii=False, sort_keys=True)
