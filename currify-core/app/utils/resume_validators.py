from typing import List, Dict, Any, Optional
from datetime import datetime
import re

class ResumeValidators:
    """Utilidades de validación para datos de currículum"""

    @staticmethod
    def validate_email(email: str) -> bool:
        """Valida formato de email"""
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return bool(re.match(pattern, email))

    @staticmethod
    def validate_phone(phone: str) -> bool:
        """Valida número de teléfono"""
        if not phone:
            return False
        # Limpiar caracteres especiales
        cleaned = re.sub(r'[^\d+]', '', phone)
        return len(cleaned) >= 7

    @staticmethod
    def validate_url(url: str) -> bool:
        """Valida formato de URL"""
        pattern = r'^https?://[^\s/$.?#].[^\s]*$'
        return bool(re.match(pattern, url, re.IGNORECASE))

    @staticmethod
    def normalize_phone(phone: str) -> str:
        """Normaliza formato de teléfono"""
        if not phone:
            return phone
        # Conservar solo números, + y algunos caracteres de formato
        return re.sub(r'[^\d+\s\-\(\)]', '', phone).strip()

    @staticmethod
    def normalize_url(url: str) -> str:
        """Normaliza URL agregando protocolo si es necesario"""
        if not url:
            return url
        if not url.startswith(('http://', 'https://')):
            return f'https://{url}'
        return url

    @staticmethod
    def parse_date_period(period_text: str) -> Dict[str, Optional[str]]:
        """
        Parsea texto de período y extrae fechas estructuradas

        Ejemplos:
        - "2020-2023" -> {"inicio": "2020", "fin": "2023"}
        - "Mar 2021 - Presente" -> {"inicio": "2021-03", "fin": "Presente"}
        - "2019" -> {"inicio": "2019", "fin": None}
        """
        if not period_text:
            return {"inicio": None, "fin": None}

        # Normalizar texto
        text = period_text.strip().lower()

        # Patrones para detectar "presente"
        present_patterns = ['presente', 'actual', 'current', 'now', 'actualidad']
        is_present = any(pattern in text for pattern in present_patterns)

        # Buscar años (4 dígitos)
        years = re.findall(r'\b(19|20)\d{2}\b', period_text)

        # Buscar meses
        month_map = {
            'ene': '01', 'jan': '01', 'enero': '01', 'january': '01',
            'feb': '02', 'febrero': '02', 'february': '02',
            'mar': '03', 'marzo': '03', 'march': '03',
            'abr': '04', 'abril': '04', 'april': '04',
            'may': '05', 'mayo': '05',
            'jun': '06', 'junio': '06', 'june': '06',
            'jul': '07', 'julio': '07', 'july': '07',
            'ago': '08', 'agosto': '08', 'august': '08',
            'sep': '09', 'sept': '09', 'septiembre': '09', 'september': '09',
            'oct': '10', 'octubre': '10', 'october': '10',
            'nov': '11', 'noviembre': '11', 'november': '11',
            'dic': '12', 'dec': '12', 'diciembre': '12', 'december': '12'
        }

        # Buscar meses en el texto
        found_months = []
        for month_name, month_num in month_map.items():
            if month_name in text:
                found_months.append(month_num)

        result = {"inicio": None, "fin": None}

        if years:
            if len(years) == 1:
                # Solo un año encontrado
                if found_months:
                    result["inicio"] = f"{years[0]}-{found_months[0]}"
                else:
                    result["inicio"] = years[0]

                if is_present:
                    result["fin"] = "Presente"
            elif len(years) >= 2:
                # Múltiples años
                if len(found_months) >= 1:
                    result["inicio"] = f"{years[0]}-{found_months[0]}"
                else:
                    result["inicio"] = years[0]

                if is_present:
                    result["fin"] = "Presente"
                elif len(found_months) >= 2:
                    result["fin"] = f"{years[-1]}-{found_months[-1]}"
                else:
                    result["fin"] = years[-1]

        return result

    @staticmethod
    def calculate_experience_years(work_experiences: List[Dict[str, Any]]) -> int:
        """Calcula años totales de experiencia"""
        total_years = 0
        current_year = datetime.now().year

        for exp in work_experiences:
            period = exp.get('periodo', {})
            start_year = None
            end_year = None

            # Extraer año de inicio
            if period.get('fecha_inicio'):
                try:
                    start_year = int(period['fecha_inicio'][:4])
                except (ValueError, TypeError):
                    continue

            # Extraer año de fin
            if period.get('fecha_fin'):
                if period['fecha_fin'].lower() == 'presente':
                    end_year = current_year
                else:
                    try:
                        end_year = int(period['fecha_fin'][:4])
                    except (ValueError, TypeError):
                        end_year = current_year

            if start_year and end_year:
                years = max(0, end_year - start_year)
                total_years += years

        return total_years

    @staticmethod
    def detect_skill_level(skill_text: str) -> Optional[str]:
        """Detecta nivel de habilidad en el texto"""
        text = skill_text.lower()

        level_patterns = {
            'Experto': ['experto', 'expert', 'senior', 'avanzado', 'advanced', '5+ años', '5+ years'],
            'Avanzado': ['avanzado', 'advanced', 'proficient', '3-5 años', '3-5 years'],
            'Intermedio': ['intermedio', 'intermediate', 'medium', '1-3 años', '1-3 years'],
            'Básico': ['básico', 'basic', 'beginner', 'principiante', '< 1 año', '< 1 year']
        }

        for level, patterns in level_patterns.items():
            if any(pattern in text for pattern in patterns):
                return level

        return None

    @staticmethod
    def clean_text(text: str) -> str:
        """Limpia texto eliminando caracteres extraños y espacios múltiples"""
        if not text:
            return ""

        # Eliminar caracteres de control
        cleaned = re.sub(r'[\x00-\x1f\x7f-\x9f]', '', text)

        # Normalizar espacios en blanco
        cleaned = re.sub(r'\s+', ' ', cleaned)

        return cleaned.strip()

    @staticmethod
    def validate_resume_completeness(resume_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Valida la completitud de un CV y retorna métricas de calidad
        """
        required_fields = [
            'datos_contacto.nombre_completo',
            'datos_contacto.email',
            'titular_profesional.titular',
            'resumen_profesional.resumen',
            'experiencia_laboral',
            'formacion_academica',
            'habilidades'
        ]

        optional_fields = [
            'datos_contacto.telefono',
            'perfiles_online.linkedin',
            'formacion_complementaria',
            'reconocimientos'
        ]

        missing_required = []
        missing_optional = []

        def get_nested_value(data, key_path):
            keys = key_path.split('.')
            value = data
            try:
                for key in keys:
                    value = value[key]
                return value
            except (KeyError, TypeError):
                return None

        # Verificar campos obligatorios
        for field in required_fields:
            value = get_nested_value(resume_data, field)
            if not value or (isinstance(value, list) and len(value) == 0):
                missing_required.append(field)

        # Verificar campos opcionales
        for field in optional_fields:
            value = get_nested_value(resume_data, field)
            if not value:
                missing_optional.append(field)

        # Calcular score de completitud
        total_fields = len(required_fields) + len(optional_fields)
        completed_fields = total_fields - len(missing_required) - len(missing_optional)
        completeness_score = (completed_fields / total_fields) * 100

        return {
            'completeness_score': round(completeness_score, 2),
            'missing_required': missing_required,
            'missing_optional': missing_optional,
            'is_valid': len(missing_required) == 0,
            'quality_issues': []
        }