"""Client configurations for external services."""

import logging
from typing import Optional, Literal
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic

from .settings import get_settings

logger = logging.getLogger(__name__)

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
