from fastapi import APIRouter, Depends, Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from app.services.auth_service import AuthService
from app.models.auth import LoginRequest, LoginResponse, APIKeyRequest
from app.core.config import settings

router = APIRouter(prefix="/auth", tags=["authentication"])
limiter = Limiter(key_func=get_remote_address)

# Dependency injection
def get_auth_service() -> AuthService:
    return AuthService()

@router.post("/login", response_model=LoginResponse)
@limiter.limit("5/minute")  # Strict rate limiting for auth
def login_with_credentials(
    request: Request,
    login_data: LoginRequest, 
    auth_service: AuthService = Depends(get_auth_service)
):
    """Authenticate with username/password and get JWT token"""
    return auth_service.validate_login_attempt(login_data.username, login_data.password)

@router.post("/login-api-key", response_model=LoginResponse)
@limiter.limit("10/minute")  # Slightly higher limit for API keys
def login_with_api_key(
    request: Request,
    api_key_data: APIKeyRequest, 
    auth_service: AuthService = Depends(get_auth_service)
):
    """Authenticate with API key and get JWT token"""
    return auth_service.validate_api_key_login(api_key_data.api_key)