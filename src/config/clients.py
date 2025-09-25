"""Client configurations for external services."""

import logging
from typing import Optional
from langchain_openai import ChatOpenAI

from .settings import get_settings

logger = logging.getLogger(__name__)

# Global client instance
_openai_client: Optional[ChatOpenAI] = None


def get_openai_client() -> ChatOpenAI:
    """
    Get OpenAI client instance.
    
    Returns:
        ChatOpenAI client instance
    """
    global _openai_client
    
    if _openai_client is None:
        settings = get_settings()
        _openai_client = ChatOpenAI(
            api_key=settings.openai_api_key,
            model=settings.agent_model,
            temperature=settings.agent_temperature
        )
        logger.info(f"Initialized OpenAI client with model: {settings.agent_model}")
    
    return _openai_client


