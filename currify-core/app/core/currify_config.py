"""
Configuración específica para Currify
"""
from typing import Dict, List, Any

class CurrifyConfig:
    """Configuraciones específicas para el sistema Currify"""

    # Formatos de archivo soportados
    SUPPORTED_FILE_FORMATS = ['.pdf', '.docx', '.doc', '.txt', '.rtf']

    # Límites de archivos
    MAX_FILE_SIZE_MB = 10
    MAX_BATCH_SIZE = 50
    MAX_TEXT_LENGTH = 100000  # caracteres

    # Configuraciones de calidad
    MIN_CONFIDENCE_THRESHOLD = 0.5
    MIN_COMPLETENESS_SCORE = 40.0
    HIGH_QUALITY_THRESHOLD = 80.0

    # Configuraciones de procesamiento
    DEFAULT_PROCESSING_TIMEOUT = 60  # segundos
    BATCH_PROCESSING_DELAY = 0.1     # segundos entre archivos

    # Configuraciones por tipo de perfil
    PROFILE_CONFIGS = {
        "junior": {
            "min_experience_years": 0,
            "max_experience_years": 3,
            "focus_areas": ["education", "projects", "certifications"],
            "required_sections": ["datos_contacto", "formacion_academica", "habilidades"]
        },
        "senior": {
            "min_experience_years": 5,
            "focus_areas": ["experience", "leadership", "achievements"],
            "required_sections": ["datos_contacto", "experiencia_laboral", "habilidades"],
            "leadership_indicators": ["manager", "director", "lead", "senior"]
        },
        "technical": {
            "focus_areas": ["technical_skills", "projects", "certifications"],
            "required_sections": ["datos_contacto", "experiencia_laboral", "habilidades"],
            "skill_categories": ["programming", "frameworks", "tools", "platforms"]
        },
        "creative": {
            "focus_areas": ["portfolio", "creative_tools", "projects"],
            "required_sections": ["datos_contacto", "experiencia_laboral", "habilidades", "perfiles_online"],
            "portfolio_indicators": ["portfolio", "behance", "dribbble", "artstation"]
        }
    }

    # Configuraciones de extracción por idioma
    LANGUAGE_CONFIGS = {
        "spanish": {
            "date_formats": ["DD/MM/YYYY", "DD-MM-YYYY", "MM/YYYY"],
            "section_names": {
                "experience": ["experiencia laboral", "historial profesional", "experiencia profesional"],
                "education": ["formación académica", "educación", "estudios"],
                "skills": ["habilidades", "competencias", "destrezas"],
                "contact": ["datos personales", "información de contacto", "contacto"]
            }
        },
        "english": {
            "date_formats": ["MM/DD/YYYY", "MM-DD-YYYY", "MM/YYYY"],
            "section_names": {
                "experience": ["work experience", "professional experience", "employment history"],
                "education": ["education", "academic background", "qualifications"],
                "skills": ["skills", "competencies", "technical skills"],
                "contact": ["contact information", "personal details", "contact"]
            }
        }
    }

    # Configuraciones de validación
    VALIDATION_RULES = {
        "email": {
            "pattern": r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$',
            "required": True
        },
        "phone": {
            "min_length": 7,
            "required": False
        },
        "name": {
            "min_words": 2,
            "min_length": 2,
            "required": True
        },
        "experience": {
            "min_entries": 1,
            "required": True
        },
        "education": {
            "min_entries": 1,
            "required": True
        }
    }

    # Configuraciones de métricas y analytics
    ANALYTICS_CONFIG = {
        "retention_days": 90,  # Días para mantener datos de analytics
        "max_records": 10000,  # Máximo número de registros en memoria
        "metrics_update_interval": 3600,  # Segundos para actualizar métricas
        "benchmark_targets": {
            "confidence": 0.85,
            "processing_time": 15.0,
            "completeness": 85.0,
            "success_rate": 95.0
        }
    }

    # Configuraciones de prompts
    PROMPT_CONFIGS = {
        "temperature": {
            "extraction": 0.1,
            "validation": 0.0,
            "analysis": 0.2
        },
        "max_tokens": {
            "extraction": 4000,
            "validation": 2000,
            "analysis": 1500
        },
        "retry_attempts": 2
    }

    @classmethod
    def get_profile_config(cls, profile_type: str) -> Dict[str, Any]:
        """Obtiene configuración específica para un tipo de perfil"""
        return cls.PROFILE_CONFIGS.get(profile_type, {})

    @classmethod
    def get_language_config(cls, language: str) -> Dict[str, Any]:
        """Obtiene configuración específica para un idioma"""
        return cls.LANGUAGE_CONFIGS.get(language, cls.LANGUAGE_CONFIGS["english"])

    @classmethod
    def get_validation_rules(cls) -> Dict[str, Any]:
        """Obtiene reglas de validación"""
        return cls.VALIDATION_RULES

    @classmethod
    def is_supported_format(cls, file_extension: str) -> bool:
        """Verifica si un formato de archivo está soportado"""
        return file_extension.lower() in cls.SUPPORTED_FILE_FORMATS

    @classmethod
    def get_quality_thresholds(cls) -> Dict[str, float]:
        """Obtiene umbrales de calidad"""
        return {
            "min_confidence": cls.MIN_CONFIDENCE_THRESHOLD,
            "min_completeness": cls.MIN_COMPLETENESS_SCORE,
            "high_quality": cls.HIGH_QUALITY_THRESHOLD
        }

    @classmethod
    def get_processing_limits(cls) -> Dict[str, int]:
        """Obtiene límites de procesamiento"""
        return {
            "max_file_size_mb": cls.MAX_FILE_SIZE_MB,
            "max_batch_size": cls.MAX_BATCH_SIZE,
            "max_text_length": cls.MAX_TEXT_LENGTH,
            "timeout_seconds": cls.DEFAULT_PROCESSING_TIMEOUT
        }