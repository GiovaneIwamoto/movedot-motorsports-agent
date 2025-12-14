"""Application settings and configuration management."""

from typing import Optional
from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # API Keys
    openai_api_key: str = Field(..., env="OPENAI_API_KEY")
    e2b_api_key: Optional[str] = Field(default=None, env="E2B_API_KEY")
    langsmith_api_key: Optional[str] = Field(default=None, env="LANGSMITH_API_KEY")
    langsmith_project: str = Field(default="movedot-analytics-agent", env="LANGSMITH_PROJECT")
    
    # Model configurations
    agent_model: str = Field(default="gpt-4o-mini", env="AGENT_MODEL")
    
    # Temperature settings
    agent_temperature: float = Field(default=0.1, env="AGENT_TEMPERATURE")
    
    # File paths
    data_dir: str = Field(default="data", env="DATA_DIR")
    csv_memory_file: str = Field(default="csv_memory.json", env="CSV_MEMORY_FILE")
    api_endpoints_file: str = Field(default="_api_endpoints.txt", env="API_ENDPOINTS_FILE")
    
    # Logging
    log_level: str = Field(default="INFO", env="LOG_LEVEL")

    # Google OAuth
    google_client_id: str | None = Field(default=None, env="GOOGLE_CLIENT_ID")
    google_client_secret: str | None = Field(default=None, env="GOOGLE_CLIENT_SECRET")
    google_redirect_uri: str | None = Field(default=None, env="GOOGLE_REDIRECT_URI")

    # App database
    app_db_path: str = Field(default="data/app.db", env="APP_DB_PATH")
    
    # E2B Sandbox timeout (in seconds, default 30 minutes)
    e2b_sandbox_timeout: int = Field(default=1800, env="E2B_SANDBOX_TIMEOUT")
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


# Global settings instance
_settings: Optional[Settings] = None


def get_settings() -> Settings:
    """Get the global settings instance."""
    global _settings
    if _settings is None:
        _settings = Settings()
    return _settings
