import os
from typing import List
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # LLM Provider Configuration
    llm_provider: str = "google"  # anthropic, openai, google, groq

    # API Keys (only the needed one needs to be set)
    anthropic_api_key: str = ""
    openai_api_key: str = ""
    google_api_key: str = ""
    groq_api_key: str = ""

    # Model Configuration per provider
    claude_model: str = "claude-3-haiku-20240307"
    openai_model: str = "gpt-4"
    google_model: str = "gemini-2.0-flash"
    groq_model: str = "llama-3.1-70b-versatile"

    # General LLM settings
    max_tokens: int = 2048
    timeout_seconds: float = 60.0
    
    # Security
    api_secret_key: str = "evalen-secreto-temporal-123"
    allowed_origins: str = "http://localhost:3000,http://localhost:8080,http://localhost:5173"
    
    # Authentication
    admin_username: str = "admin"
    admin_password: str = "change-me-in-production"
    valid_api_keys: str = "api-key-1,api-key-2"
    
    # Rate Limiting
    rate_limit_requests: int = 100
    rate_limit_window: int = 60
    
    # Environment
    environment: str = "development"
    debug: bool = True
    
    # Currify specific settings
    max_file_size_mb: int = 10
    max_batch_size: int = 50
    supported_file_formats: str = "pdf,docx,doc,txt,rtf"

    model_config = {
        "env_file": ".env",
        "case_sensitive": False
    }
    
    @property
    def allowed_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.allowed_origins.split(',')]
    
    @property
    def supported_file_formats_list(self) -> List[str]:
        return [fmt.strip() for fmt in self.supported_file_formats.split(',')]
    
    @property
    def valid_api_keys_list(self) -> List[str]:
        return [key.strip() for key in self.valid_api_keys.split(',')]

    @property
    def current_model(self) -> str:
        """Get the current model based on selected provider"""
        if self.llm_provider == "anthropic":
            return self.claude_model
        elif self.llm_provider == "openai":
            return self.openai_model
        elif self.llm_provider == "google":
            return self.google_model
        elif self.llm_provider == "groq":
            return self.groq_model
        return self.claude_model

    @property
    def current_api_key(self) -> str:
        """Get the current API key based on selected provider"""
        if self.llm_provider == "anthropic":
            return self.anthropic_api_key
        elif self.llm_provider == "openai":
            return self.openai_api_key
        elif self.llm_provider == "google":
            return self.google_api_key
        elif self.llm_provider == "groq":
            return self.groq_api_key
        return self.anthropic_api_key

settings = Settings()