"""
Servicio unificado de parseo de fechas.
Centraliza toda la lógica de parsing de períodos/fechas que antes estaba duplicada
en robust_extraction_service, data_structurer_service, y resume_validators.
"""

import re
from typing import Dict, Optional, Any

MONTHS: Dict[str, str] = {
    "enero": "01", "febrero": "02", "marzo": "03", "abril": "04",
    "mayo": "05", "junio": "06", "julio": "07", "agosto": "08",
    "septiembre": "09", "octubre": "10", "noviembre": "11", "diciembre": "12",
    "ene": "01", "feb": "02", "mar": "03", "abr": "04", "may": "05", "jun": "06",
    "jul": "07", "ago": "08", "sep": "09", "sept": "09", "oct": "10", "nov": "11", "dic": "12",
    "january": "01", "february": "02", "march": "03", "april": "04",
    "june": "06", "july": "07", "august": "08",
    "september": "09", "october": "10", "november": "11", "december": "12",
    "jan": "01", "feb": "02", "mar": "03", "apr": "04", "may": "05", "jun": "06",
    "jul": "07", "aug": "08", "sep": "09", "oct": "10", "nov": "11", "dec": "12",
}

PRESENT_SYNONYMS = [
    "presente", "actualidad", "actual", "current", "now", "hoy",
    "vigente", "curso", "continuo", "ongoing", "present", "date",
    "a la fecha", "al día", "hasta la fecha"
]

BAD_VALUES = {"nan", "none", "null", "nat", "no especificado", "", "unknown", "n/a", "no extraído", "string"}


def normalize_month(month_name: str) -> Optional[str]:
    return MONTHS.get(month_name.lower().strip())


def is_present(text: str) -> bool:
    t = text.lower().strip()
    for syn in PRESENT_SYNONYMS:
        if syn in t:
            return True
    return False


def is_bad_value(val: Any) -> bool:
    if val is None:
        return True
    s = str(val).lower().strip()
    return s in BAD_VALUES


def clean_bad_value(val: Any) -> Optional[str]:
    if is_bad_value(val):
        return None
    return str(val)


class DateParserService:
    @staticmethod
    def parse_period_string(period_str: str) -> Dict[str, Any]:
        if not period_str or str(period_str).lower() in ['nan', 'none', 'null']:
            return {"fecha_inicio": None, "fecha_fin": None, "texto_original": "No especificado"}

        fecha_inicio = None
        fecha_fin = None

        period_str_clean = period_str.replace('(', '').replace(')', '').strip()

        match = re.search(
            r'([A-Za-z]+)\s+(\d{4})\s*[-–]\s*([A-Za-z0-9]+)(?:\s+(\d{4}))?',
            period_str_clean, re.IGNORECASE
        )

        if match:
            start_month, start_year, end_part1, end_year = match.groups()

            month_num = normalize_month(start_month)
            if month_num:
                fecha_inicio = f"{start_year}-{month_num}"

            if is_present(end_part1):
                fecha_fin = "Presente"
            elif end_part1.lower() in MONTHS and end_year:
                fecha_fin = f"{end_year}-{normalize_month(end_part1)}"
            elif end_part1.isdigit() and len(end_part1) == 4:
                pass

        if not fecha_inicio:
            match_years = re.search(
                r'(\d{4})\s*[-–]\s*(\d{4}|Presente|Actualidad|Actual|Current)',
                period_str_clean, re.IGNORECASE
            )
            if match_years:
                s_year, e_part = match_years.groups()
                fecha_inicio = f"{s_year}-01"
                fecha_fin = "Presente" if is_present(e_part) else f"{e_part}-12"

        if not fecha_inicio:
            match = re.search(
                r'(\w+)\s+(\d{4})\s*[-–]\s*(Presente|Actualidad|Actual|Current|Now)',
                period_str, re.IGNORECASE
            )
            if match:
                start_month, start_year = match.groups()[:2]
                month_num = normalize_month(start_month)
                if month_num:
                    fecha_inicio = f"{start_year}-{month_num}"
                    fecha_fin = "Presente"

        if not fecha_inicio:
            match = re.search(r'(\d{4})\s*[-–]\s*(\d{4})', period_str)
            if match:
                fecha_inicio, fecha_fin = match.groups()

        return {
            "fecha_inicio": fecha_inicio,
            "fecha_fin": fecha_fin,
            "texto_original": period_str
        }

    @staticmethod
    def normalize_period(period: Any) -> Dict[str, Any]:
        p: Dict[str, Any] = {}

        if isinstance(period, dict):
            p = {
                "fecha_inicio": clean_bad_value(period.get("fecha_inicio")),
                "fecha_fin": clean_bad_value(period.get("fecha_fin")),
                "texto_original": period.get("texto_original", "No especificado")
            }
        elif isinstance(period, str):
            p = DateParserService.parse_period_string(period)
        else:
            p = {
                "fecha_inicio": None,
                "fecha_fin": None,
                "texto_original": str(period) if period else "No especificado"
            }

        if p.get("texto_original") and not is_bad_value(p["texto_original"]):
            parsed = DateParserService.parse_period_string(p["texto_original"])

            if parsed.get("fecha_inicio"):
                p["fecha_inicio"] = parsed["fecha_inicio"]
            if parsed.get("fecha_fin"):
                p["fecha_fin"] = parsed["fecha_fin"]

            raw_text = str(p["texto_original"]).lower()
            if any(syn in raw_text for syn in PRESENT_SYNONYMS):
                p["fecha_fin"] = "Presente"

        if p.get("fecha_fin") and is_present(str(p["fecha_fin"])):
            p["fecha_fin"] = "Presente"

        return p

    @staticmethod
    def validate_period(fecha_inicio: Optional[str], fecha_fin: Optional[str]) -> Optional[str]:
        if not fecha_inicio:
            return None

        try:
            year_start = int(fecha_inicio[:4])
        except (ValueError, IndexError):
            return "fecha_inicio inválida"

        if fecha_fin and fecha_fin != "Presente":
            try:
                year_end = int(fecha_fin[:4])
                if year_end < year_start:
                    return "fecha_fin anterior a fecha_inicio"
                if year_end - year_start > 50:
                    return "período sospechosamente largo (>50 años)"
            except (ValueError, IndexError):
                return "fecha_fin inválida"

        return None
