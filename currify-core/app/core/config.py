import os
from typing import List
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # LLM Provider Configuration
    llm_provider: str = "google"

    # API Keys — REQUIRED: set via env vars (no defaults in production)
    anthropic_api_key: str = ""
    openai_api_key: str = ""
    google_api_key: str = ""

    # Model Configuration per provider
    claude_model: str = "claude-3-5-sonnet-20241022"
    openai_model: str = "gpt-4o"
    google_model: str = "gemini-2.5-flash"

    # General LLM settings
    max_tokens: int = 4096
    timeout_seconds: float = 120.0
    llm_concurrency_limit: int = 6
    llm_concurrency_per_request: int = 3
    llm_section_timeout_seconds: float = 30.0

    # Section extraction feature flag
    section_extraction_enabled: bool = True

    # Security — REQUIRED in production: set CURRIFY_SECRET_KEY via env
    api_secret_key: str = ""
    allowed_origins: str = "http://localhost:3000,http://localhost:8080,http://localhost:5173"

    # Authentication — REQUIRED in production: set valid hashed API keys via env
    admin_username: str = "admin"
    admin_password: str = ""
    valid_api_keys: str = ""

    # Rate Limiting
    rate_limit_requests: int = 100
    rate_limit_window: int = 60

    # Environment
    environment: str = "development"
    debug: bool = False

    # Currify specific settings
    max_file_size_mb: int = 10
    max_batch_size: int = 50
    supported_file_formats: str = "pdf,docx,doc,txt,rtf"

    model_config = {
        "env_file": ".env",
        "case_sensitive": False,
        "extra": "ignore"
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
        return self.anthropic_api_key

settings = Settings()