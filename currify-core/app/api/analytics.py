from fastapi import APIRouter, Depends, Request, HTTPException, Query
from slowapi import Limiter
from slowapi.util import get_remote_address
from typing import List, Optional, Dict, Any
import logging
from datetime import datetime, timedelta
from collections import Counter

from app.models.resume import ResumeData
from app.core.security import verify_token
from app.core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/analytics", tags=["analytics"])

# Rate limiter
limiter = Limiter(key_func=get_remote_address)

# Storage temporal para métricas (en producción usar base de datos)
analytics_storage = {
    "extractions": [],  # Historial de extracciones
    "profiles": [],     # Historial de perfiles detectados
    "quality_metrics": []  # Métricas de calidad
}

@router.post("/record-extraction")
@limiter.limit(f"{settings.rate_limit_requests}/{settings.rate_limit_window}minute")
async def record_extraction(
    request: Request,
    extraction_data: Dict[str, Any],
    token: dict = Depends(verify_token)
):
    """
    Registra una extracción para análisis posterior

    - **extraction_data**: Datos de la extracción realizada
    - Almacena métricas para análisis de tendencias
    """
    try:
        # Extraer métricas relevantes
        record = {
            "timestamp": datetime.now().isoformat(),
            "profile_type": extraction_data.get("profile_type", "unknown"),
            "confidence": extraction_data.get("confidence", 0.0),
            "processing_time": extraction_data.get("processing_time", 0.0),
            "file_type": extraction_data.get("file_type", "unknown"),
            "completeness_score": extraction_data.get("completeness_score", 0.0),
            "years_experience": extraction_data.get("years_experience", 0),
            "skills_count": extraction_data.get("skills_count", 0),
            "has_linkedin": extraction_data.get("has_linkedin", False),
            "is_multilingual": extraction_data.get("is_multilingual", False)
        }

        # Almacenar en storage temporal
        analytics_storage["extractions"].append(record)

        # Mantener solo los últimos 1000 registros
        if len(analytics_storage["extractions"]) > 1000:
            analytics_storage["extractions"] = analytics_storage["extractions"][-1000:]

        return {"status": "recorded", "timestamp": record["timestamp"]}

    except Exception as e:
        logger.error(f"Error recording extraction analytics: {e}")
        raise HTTPException(status_code=500, detail=f"Error interno del servidor: {str(e)}")

@router.get("/extraction-trends")
@limiter.limit(f"{settings.rate_limit_requests}/{settings.rate_limit_window}minute")
async def get_extraction_trends(
    request: Request,
    days: int = Query(7, description="Número de días hacia atrás para analizar"),
    token: dict = Depends(verify_token)
):
    """
    Obtiene tendencias de extracciones en los últimos N días

    - **days**: Número de días hacia atrás (default: 7)
    - Retorna métricas agregadas y tendencias
    """
    try:
        # Filtrar datos por fecha
        cutoff_date = datetime.now() - timedelta(days=days)
        recent_extractions = [
            ext for ext in analytics_storage["extractions"]
            if datetime.fromisoformat(ext["timestamp"]) >= cutoff_date
        ]

        if not recent_extractions:
            return {
                "period": f"últimos {days} días",
                "total_extractions": 0,
                "message": "No hay datos en el período especificado"
            }

        # Calcular métricas
        total_extractions = len(recent_extractions)
        avg_confidence = sum(ext["confidence"] for ext in recent_extractions) / total_extractions
        avg_processing_time = sum(ext["processing_time"] for ext in recent_extractions) / total_extractions
        avg_completeness = sum(ext["completeness_score"] for ext in recent_extractions) / total_extractions

        # Distribución por tipo de perfil
        profile_distribution = Counter(ext["profile_type"] for ext in recent_extractions)

        # Distribución por tipo de archivo
        file_type_distribution = Counter(ext["file_type"] for ext in recent_extractions)

        # Tendencias por día
        daily_counts = {}
        for ext in recent_extractions:
            date = datetime.fromisoformat(ext["timestamp"]).date().isoformat()
            daily_counts[date] = daily_counts.get(date, 0) + 1

        # Métricas de calidad
        high_quality_count = len([ext for ext in recent_extractions if ext["completeness_score"] >= 80])
        medium_quality_count = len([ext for ext in recent_extractions if 60 <= ext["completeness_score"] < 80])
        low_quality_count = len([ext for ext in recent_extractions if ext["completeness_score"] < 60])

        return {
            "period": f"últimos {days} días",
            "summary": {
                "total_extractions": total_extractions,
                "avg_confidence": round(avg_confidence, 3),
                "avg_processing_time": round(avg_processing_time, 2),
                "avg_completeness_score": round(avg_completeness, 2)
            },
            "distributions": {
                "profile_types": dict(profile_distribution),
                "file_types": dict(file_type_distribution)
            },
            "daily_trends": daily_counts,
            "quality_distribution": {
                "high_quality": high_quality_count,
                "medium_quality": medium_quality_count,
                "low_quality": low_quality_count
            }
        }

    except Exception as e:
        logger.error(f"Error getting extraction trends: {e}")
        raise HTTPException(status_code=500, detail=f"Error interno del servidor: {str(e)}")

@router.get("/profile-insights")
@limiter.limit(f"{settings.rate_limit_requests}/{settings.rate_limit_window}minute")
async def get_profile_insights(
    request: Request,
    profile_type: Optional[str] = Query(None, description="Filtrar por tipo de perfil específico"),
    token: dict = Depends(verify_token)
):
    """
    Obtiene insights detallados sobre perfiles procesados

    - **profile_type**: Filtrar por tipo específico (opcional)
    - Retorna estadísticas detalladas por tipo de perfil
    """
    try:
        extractions = analytics_storage["extractions"]

        # Filtrar por tipo de perfil si se especifica
        if profile_type:
            extractions = [ext for ext in extractions if ext["profile_type"] == profile_type]

        if not extractions:
            return {
                "profile_type": profile_type or "todos",
                "total_profiles": 0,
                "message": "No hay datos para el filtro especificado"
            }

        # Agrupar por tipo de perfil
        profiles_by_type = {}
        for ext in extractions:
            ptype = ext["profile_type"]
            if ptype not in profiles_by_type:
                profiles_by_type[ptype] = []
            profiles_by_type[ptype].append(ext)

        # Calcular insights por tipo
        insights = {}
        for ptype, profile_data in profiles_by_type.items():
            count = len(profile_data)
            avg_confidence = sum(p["confidence"] for p in profile_data) / count
            avg_experience = sum(p["years_experience"] for p in profile_data) / count
            avg_skills = sum(p["skills_count"] for p in profile_data) / count
            linkedin_rate = len([p for p in profile_data if p["has_linkedin"]]) / count * 100
            multilingual_rate = len([p for p in profile_data if p["is_multilingual"]]) / count * 100

            insights[ptype] = {
                "total_count": count,
                "avg_confidence": round(avg_confidence, 3),
                "avg_years_experience": round(avg_experience, 1),
                "avg_skills_count": round(avg_skills, 1),
                "linkedin_presence_rate": round(linkedin_rate, 1),
                "multilingual_rate": round(multilingual_rate, 1),
                "quality_metrics": {
                    "high_quality": len([p for p in profile_data if p["completeness_score"] >= 80]),
                    "medium_quality": len([p for p in profile_data if 60 <= p["completeness_score"] < 80]),
                    "low_quality": len([p for p in profile_data if p["completeness_score"] < 60])
                }
            }

        return {
            "filter": profile_type or "todos los tipos",
            "total_profiles_analyzed": len(extractions),
            "insights_by_type": insights,
            "recommendations": generate_profile_recommendations(insights)
        }

    except Exception as e:
        logger.error(f"Error getting profile insights: {e}")
        raise HTTPException(status_code=500, detail=f"Error interno del servidor: {str(e)}")

@router.get("/quality-metrics")
@limiter.limit(f"{settings.rate_limit_requests}/{settings.rate_limit_window}minute")
async def get_quality_metrics(
    request: Request,
    min_confidence: float = Query(0.0, description="Confianza mínima para incluir en análisis"),
    token: dict = Depends(verify_token)
):
    """
    Obtiene métricas de calidad de las extracciones

    - **min_confidence**: Confianza mínima para filtrar (0.0-1.0)
    - Retorna análisis detallado de calidad
    """
    try:
        # Filtrar por confianza mínima
        filtered_extractions = [
            ext for ext in analytics_storage["extractions"]
            if ext["confidence"] >= min_confidence
        ]

        if not filtered_extractions:
            return {
                "filter": f"confianza >= {min_confidence}",
                "total_extractions": 0,
                "message": "No hay datos que cumplan el filtro"
            }

        # Métricas de confianza
        confidences = [ext["confidence"] for ext in filtered_extractions]
        confidence_metrics = {
            "mean": round(sum(confidences) / len(confidences), 3),
            "min": round(min(confidences), 3),
            "max": round(max(confidences), 3),
            "median": round(sorted(confidences)[len(confidences) // 2], 3)
        }

        # Métricas de completitud
        completeness_scores = [ext["completeness_score"] for ext in filtered_extractions]
        completeness_metrics = {
            "mean": round(sum(completeness_scores) / len(completeness_scores), 2),
            "min": round(min(completeness_scores), 2),
            "max": round(max(completeness_scores), 2),
            "median": round(sorted(completeness_scores)[len(completeness_scores) // 2], 2)
        }

        # Métricas de tiempo de procesamiento
        processing_times = [ext["processing_time"] for ext in filtered_extractions]
        timing_metrics = {
            "mean_seconds": round(sum(processing_times) / len(processing_times), 2),
            "min_seconds": round(min(processing_times), 2),
            "max_seconds": round(max(processing_times), 2),
            "median_seconds": round(sorted(processing_times)[len(processing_times) // 2], 2)
        }

        # Distribución de calidad
        quality_distribution = {
            "excellent": len([ext for ext in filtered_extractions if ext["completeness_score"] >= 90]),
            "good": len([ext for ext in filtered_extractions if 80 <= ext["completeness_score"] < 90]),
            "fair": len([ext for ext in filtered_extractions if 60 <= ext["completeness_score"] < 80]),
            "poor": len([ext for ext in filtered_extractions if ext["completeness_score"] < 60])
        }

        # Correlaciones
        correlations = calculate_correlations(filtered_extractions)

        return {
            "filter": f"confianza >= {min_confidence}",
            "total_extractions": len(filtered_extractions),
            "confidence_metrics": confidence_metrics,
            "completeness_metrics": completeness_metrics,
            "timing_metrics": timing_metrics,
            "quality_distribution": quality_distribution,
            "correlations": correlations,
            "overall_score": calculate_overall_quality_score(confidence_metrics, completeness_metrics, timing_metrics)
        }

    except Exception as e:
        logger.error(f"Error getting quality metrics: {e}")
        raise HTTPException(status_code=500, detail=f"Error interno del servidor: {str(e)}")

@router.get("/benchmarks")
@limiter.limit(f"{settings.rate_limit_requests}/{settings.rate_limit_window}minute")
async def get_benchmarks(
    request: Request,
    token: dict = Depends(verify_token)
):
    """
    Obtiene benchmarks y comparativas del sistema

    - Retorna métricas de rendimiento comparadas con estándares
    """
    try:
        extractions = analytics_storage["extractions"]

        if not extractions:
            return {
                "message": "No hay datos suficientes para generar benchmarks",
                "total_extractions": 0
            }

        # Calcular métricas actuales
        total_count = len(extractions)
        avg_confidence = sum(ext["confidence"] for ext in extractions) / total_count
        avg_processing_time = sum(ext["processing_time"] for ext in extractions) / total_count
        avg_completeness = sum(ext["completeness_score"] for ext in extractions) / total_count

        # Definir benchmarks objetivo
        target_benchmarks = {
            "confidence": 0.85,
            "processing_time": 15.0,  # segundos
            "completeness": 85.0,
            "success_rate": 95.0
        }

        # Calcular tasa de éxito (extracciones con confianza > 0.7)
        successful_extractions = len([ext for ext in extractions if ext["confidence"] > 0.7])
        success_rate = (successful_extractions / total_count) * 100

        # Comparar con benchmarks
        current_metrics = {
            "confidence": avg_confidence,
            "processing_time": avg_processing_time,
            "completeness": avg_completeness,
            "success_rate": success_rate
        }

        # Calcular scores vs targets
        benchmark_scores = {}
        for metric, current_value in current_metrics.items():
            target_value = target_benchmarks[metric]

            if metric == "processing_time":
                # Para tiempo de procesamiento, menor es mejor
                score = min(100, (target_value / current_value) * 100) if current_value > 0 else 0
            else:
                # Para otras métricas, mayor es mejor
                score = min(100, (current_value / target_value) * 100)

            benchmark_scores[metric] = {
                "current": round(current_value, 3),
                "target": target_value,
                "score": round(score, 1),
                "status": "exceeds" if score >= 100 else "meets" if score >= 90 else "below"
            }

        # Score general
        overall_score = sum(score["score"] for score in benchmark_scores.values()) / len(benchmark_scores)

        return {
            "total_extractions": total_count,
            "benchmark_scores": benchmark_scores,
            "overall_score": round(overall_score, 1),
            "overall_status": "excellent" if overall_score >= 95 else "good" if overall_score >= 85 else "needs_improvement",
            "recommendations": generate_benchmark_recommendations(benchmark_scores)
        }

    except Exception as e:
        logger.error(f"Error getting benchmarks: {e}")
        raise HTTPException(status_code=500, detail=f"Error interno del servidor: {str(e)}")

# Funciones auxiliares
def generate_profile_recommendations(insights: Dict[str, Any]) -> List[str]:
    """Genera recomendaciones basadas en insights de perfiles"""
    recommendations = []

    for profile_type, data in insights.items():
        if data["avg_confidence"] < 0.8:
            recommendations.append(f"Mejorar detección de perfiles {profile_type} (confianza: {data['avg_confidence']:.2f})")

        if data["linkedin_presence_rate"] < 50:
            recommendations.append(f"Los perfiles {profile_type} necesitan más presencia en LinkedIn")

        if data["quality_metrics"]["low_quality"] > data["quality_metrics"]["high_quality"]:
            recommendations.append(f"Mejorar calidad de extracción para perfiles {profile_type}")

    return recommendations

def calculate_correlations(extractions: List[Dict[str, Any]]) -> Dict[str, float]:
    """Calcula correlaciones simples entre métricas"""
    if len(extractions) < 2:
        return {}

    # Correlación simple entre confianza y completitud
    confidences = [ext["confidence"] for ext in extractions]
    completeness = [ext["completeness_score"] for ext in extractions]

    # Correlación de Pearson simplificada
    def simple_correlation(x, y):
        n = len(x)
        if n < 2:
            return 0
        mean_x = sum(x) / n
        mean_y = sum(y) / n
        num = sum((x[i] - mean_x) * (y[i] - mean_y) for i in range(n))
        den_x = sum((x[i] - mean_x) ** 2 for i in range(n))
        den_y = sum((y[i] - mean_y) ** 2 for i in range(n))
        if den_x == 0 or den_y == 0:
            return 0
        return num / (den_x * den_y) ** 0.5

    return {
        "confidence_vs_completeness": round(simple_correlation(confidences, completeness), 3)
    }

def calculate_overall_quality_score(confidence_metrics: Dict, completeness_metrics: Dict, timing_metrics: Dict) -> float:
    """Calcula un score general de calidad"""
    confidence_score = confidence_metrics["mean"] * 100
    completeness_score = completeness_metrics["mean"]
    timing_score = min(100, 15.0 / timing_metrics["mean_seconds"] * 100)  # 15s es el target

    overall = (confidence_score * 0.4 + completeness_score * 0.4 + timing_score * 0.2)
    return round(overall, 1)

def generate_benchmark_recommendations(benchmark_scores: Dict[str, Any]) -> List[str]:
    """Genera recomendaciones basadas en benchmarks"""
    recommendations = []

    for metric, score_data in benchmark_scores.items():
        if score_data["status"] == "below":
            if metric == "confidence":
                recommendations.append("Mejorar prompts de extracción para aumentar confianza")
            elif metric == "processing_time":
                recommendations.append("Optimizar tiempo de procesamiento - considerar paralelización")
            elif metric == "completeness":
                recommendations.append("Mejorar extracción de campos obligatorios")
            elif metric == "success_rate":
                recommendations.append("Revisar casos de falla y mejorar robustez del sistema")

    return recommendations