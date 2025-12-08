"""Client configurations for external services."""

import logging
from typing import Optional, Literal
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic

from .settings import get_settings

logger = logging.getLogger(__name__)

# Global client instance (fallback)
_openai_client: Optional[ChatOpenAI] = None


def get_llm_client(provider: str, api_key: str, model: str, temperature: float = 0.1):
    """
    Get LLM client instance for a specific provider.
    
    Args:
        provider: 'openai' or 'anthropic'
        api_key: API key for the provider
        model: Model name to use
        temperature: Temperature setting
        
    Returns:
        LLM client instance (ChatOpenAI or ChatAnthropic)
    """
    if provider.lower() == 'openai':
        return ChatOpenAI(
            api_key=api_key,
            model=model,
            temperature=temperature
        )
    elif provider.lower() == 'anthropic':
        return ChatAnthropic(
            api_key=api_key,
            model=model,
            temperature=temperature
        )
    else:
        raise ValueError(f"Unsupported provider: {provider}")


def get_openai_client() -> ChatOpenAI:
    """
    Get OpenAI client instance (fallback for backward compatibility).
    
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


