import logging
import sys
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.api import auth, resume, analytics, scoring

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    stream=sys.stdout,
    force=True
)

# Ensure all loggers use this config
logging.getLogger().handlers.clear()
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    stream=sys.stdout,
    force=True
)
logger = logging.getLogger(__name__)

# Rate limiter
limiter = Limiter(key_func=get_remote_address)

# Create FastAPI app
app = FastAPI(
    title="Currify API",
    description="AI-powered resume extraction and analysis platform",
    version="1.0.0"
)

# Add rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type"],
)

@app.get("/")
def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "Currify API",
        "version": "1.0.0",
        "environment": settings.environment,
        "features": [
            "Resume extraction from PDF/DOCX/TXT/RTF",
            "Profile type detection",
            "Batch processing",
            "Quality analytics",
            "Candidate-job scoring"
        ]
    }

@app.get("/health")
def detailed_health():
    """Detailed health check"""
    return {
        "status": "healthy",
        "services": {
            "anthropic": "configured" if settings.anthropic_api_key else "missing_key",
            "resume_extraction": "active",
            "profile_detection": "active",
            "analytics": "active",
            "scoring": "active"
        },
        "config": {
            "model": settings.claude_model,
            "environment": settings.environment,
            "debug": settings.debug,
            "supported_formats": ["PDF", "DOCX", "TXT", "RTF"]
        }
    }

# Include routers
app.include_router(auth.router)
app.include_router(resume.router)
app.include_router(analytics.router)
app.include_router(scoring.router)