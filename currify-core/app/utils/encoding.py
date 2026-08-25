"""
Utility for fixing UTF-8 mojibake issues.

Signatures covered:
  Double-encoding via latin1/cp1252 misdecode:
    é (C3 A9) -> Ã© (C3 83 C2 A9)

  UTF-8 read as CP850 (OEM Windows console) — firma confirmada en producción (Task B):
    • (E2 80 A2) -> ÔÇó   (cp850: E2->Ô, 80->Ç, A2->ó)
    é (C3 A9) -> ├®       (cp850: C3->├, A9->®)
    ó (C3 B3) -> ├│       (cp850: C3->├, B3->│)

Reversal validated: text.encode('cp850').decode('utf-8').
Defense is preventive at ingestion (choke points in extraction services).
"""
import unicodedata
import re
from typing import Any

# Common mojibake markers that indicate double-encoding
_MOJIBAKE_MARKERS = ["Ã", "Â", "Ô", "€", "â", "Æ", "Ç", "¢", "â€"]
# CP850/OEM signature: box-drawing chars leaking into natural language text.
# CVs never legitimately contain these; they are the hallmark of UTF-8 read as cp850.
_CP850_BOX_MARKERS = ["├", "└", "┘", "┌", "┐", "┤", "┬", "┴", "┼", "─", "│"]

def is_mojibake(text: str) -> bool:
    if not text or not isinstance(text, str):
        return False
    # Contains classic double-encoding chars and also contains valid accents pattern?
    # Heuristic: if contains Ã or Â or ÔÇó
    if any(m in text for m in ["Ã", "Â", "ÔÇó", "Ã©", "Ã³", "Ã¡", "Ãí", "Ã±", "Ã¼", "â€", "Â·"]):
        return True
    # CP850 signature: box-drawing artifacts (e.g. '├®' = é, '├│' = ó, 'ÔÇó' = •)
    return any(m in text for m in _CP850_BOX_MARKERS)

def fix_mojibake(text: str) -> str:
    """
    Attempt to repair mojibake by reversing utf-8 misdecodes.
    Tries latin1, cp1252 and cp850 (OEM console), and validates improvement
    via scoring (fewest mojibake markers wins). Also normalizes to NFC.
    """
    if not text or not isinstance(text, str):
        return text

    # Fast path: if no markers, just normalize
    if not is_mojibake(text):
        try:
            return unicodedata.normalize('NFC', text)
        except:
            return text

    candidates = []
    # Strategy 1: latin1 encode -> utf-8 decode
    try:
        fixed = text.encode('latin1').decode('utf-8')
        candidates.append(fixed)
    except Exception:
        pass
    # Strategy 2: cp1252 encode -> utf-8 decode
    try:
        fixed = text.encode('cp1252').decode('utf-8')
        candidates.append(fixed)
    except Exception:
        pass
    # Strategy 2b: cp850 (OEM Windows console, firma 'ÔÇó'/'├®')
    try:
        fixed = text.encode('cp850').decode('utf-8')
        candidates.append(fixed)
    except Exception:
        pass
    # Strategy 3: double reverse (sometimes triple-encoded)
    try:
        fixed = text.encode('latin1').decode('utf-8').encode('latin1').decode('utf-8')
        candidates.append(fixed)
    except Exception:
        pass
    # Strategy 4: utf8->latin1->utf8 via ftfy-like loop
    # Use ftfy if available
    try:
        import ftfy
        fixed = ftfy.fix_text(text)
        candidates.append(fixed)
    except Exception:
        pass

    # Choose best candidate: fewest mojibake markers, contains proper Spanish chars, and has bullet correctly
    def score(s: str) -> int:
        # Lower is better (fewer mojibake markers)
        mojibake_count = sum(s.count(m) for m in ["Ã", "Â", "ÔÇó", "â€"])
        # Bonus for containing proper accents
        accents = sum(s.count(c) for c in ["é", "ó", "á", "í", "ñ", "ú", "É", "Á", "í"])
        bullet_ok = 1 if "•" in s else 0
        # We want low mojibake, high accents/bullet
        return mojibake_count * 10 - accents - bullet_ok * 2

    if candidates:
        # Filter candidates that look better than original
        best = min(candidates, key=score)
        original_score = score(text)
        best_score = score(best)
        if best_score < original_score:
            try:
                return unicodedata.normalize('NFC', best)
            except:
                return best

    # Fallback: at least normalize
    try:
        return unicodedata.normalize('NFC', text)
    except:
        return text

def fix_mojibake_recursive(obj: Any) -> Any:
    """Recursively fix all strings in a JSON-like structure."""
    if isinstance(obj, str):
        return fix_mojibake(obj)
    elif isinstance(obj, list):
        return [fix_mojibake_recursive(x) for x in obj]
    elif isinstance(obj, dict):
        return {k: fix_mojibake_recursive(v) for k, v in obj.items()}
    elif isinstance(obj, tuple):
        return tuple(fix_mojibake_recursive(x) for x in obj)
    else:
        return obj

def ensure_utf8_bytes_decode(data: bytes, encoding: str = 'utf-8') -> str:
    """
    Safely decode bytes as utf-8 with errors='replace', never latin1.
    If data is already str, return as is after fixing.
    """
    if isinstance(data, str):
        return fix_mojibake(data)
    if isinstance(data, bytes):
        try:
            text = data.decode('utf-8', errors='replace')
        except Exception:
            text = data.decode('utf-8', errors='ignore')
        return fix_mojibake(text)
    return str(data)
