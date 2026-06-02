"""
Authentication service with proper credential validation
"""
import logging
import hashlib
from typing import Optional
from fastapi import HTTPException, status
from app.core.config import settings
from app.core.security import create_access_token

logger = logging.getLogger(__name__)

class AuthService:
    """Service to handle authentication and authorization"""

    def __init__(self):
        try:
            from passlib.hash import bcrypt
            self._bcrypt = bcrypt
        except ImportError:
            self._bcrypt = None

    def authenticate_user(self, username: str, password: str) -> bool:
        """Authenticate user with username/password"""
        if not settings.admin_password:
            logger.critical("ADMIN_PASSWORD not configured — authentication disabled")
            return False

        if username == settings.admin_username:
            if self._bcrypt and settings.admin_password.startswith("$2"):
                valid = self._bcrypt.verify(password, settings.admin_password)
            else:
                valid = password == settings.admin_password

            if valid:
                logger.info("Successful login")
                return True

        logger.warning("Failed login attempt")
        return False

    def authenticate_api_key(self, api_key: str) -> bool:
        """Authenticate using API key (bcrypt-hashed in env)"""
        if not settings.valid_api_keys_list:
            logger.critical("VALID_API_KEYS not configured — API key auth disabled")
            return False

        for stored in settings.valid_api_keys_list:
            if self._bcrypt and stored.startswith("$2"):
                try:
                    if self._bcrypt.verify(api_key, stored):
                        logger.info("Successful API key authentication")
                        return True
                except Exception:
                    continue
            elif api_key == stored:
                logger.info("Successful API key authentication (plain comparison)")
                return True

        logger.warning("Invalid API key attempted")
        return False

    def generate_token(self, username: str) -> str:
        """Generate JWT token for authenticated user"""
        return create_access_token(data={"sub": username, "type": "user"})

    def generate_api_token(self, api_key: str) -> str:
        """Generate JWT token for API key"""
        key_hash = hashlib.sha256(api_key.encode()).hexdigest()[:12]
        return create_access_token(data={"sub": f"api_{key_hash}", "type": "api_key"})
    
    def validate_login_attempt(self, username: str, password: str) -> dict:
        """Complete login validation with rate limiting awareness"""
        # Basic validation
        if not username or not password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username and password are required"
            )
        
        if len(username) < 3 or len(password) < 6:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid username or password format"
            )
        
        # Authenticate
        if not self.authenticate_user(username, password):
            # Security: Don't reveal if username exists
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username or password"
            )
        
        # Generate token
        token = self.generate_token(username)
        return {
            "access_token": token,
            "token_type": "bearer",
            "expires_in": 86400  # 24 hours
        }
    
    def validate_api_key_login(self, api_key: str) -> dict:
        """Validate API key and generate token"""
        if not api_key:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="API key is required"
            )
        
        if not self.authenticate_api_key(api_key):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid API key"
            )
        
        # Generate token
        token = self.generate_api_token(api_key)
        return {
            "access_token": token,
            "token_type": "bearer",
            "expires_in": 86400  # 24 hours
        }