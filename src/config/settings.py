"""Application settings and configuration management."""

import os
from typing import Optional
from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # API Keys
    openai_api_key: str = Field(..., env="OPENAI_API_KEY")
    
    # Model configurations
    agent_model: str = Field(default="gpt-4o-mini", env="AGENT_MODEL")
    
    # Temperature settings
    agent_temperature: float = Field(default=0.1, env="AGENT_TEMPERATURE")
    
    # File paths
    data_dir: str = Field(default="data", env="DATA_DIR")
    memory_file: str = Field(default="scratchpad_memory.json", env="MEMORY_FILE")
    csv_memory_file: str = Field(default="csv_memory.json", env="CSV_MEMORY_FILE")
    api_endpoints_file: str = Field(default="_api_endpoints.txt", env="API_ENDPOINTS_FILE")
    
    # Logging
    log_level: str = Field(default="INFO", env="LOG_LEVEL")
    
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
