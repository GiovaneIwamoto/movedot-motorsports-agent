"""Client configurations for external services."""

import logging
from typing import Optional
from langchain_openai import ChatOpenAI
from tavily import TavilyClient

from .settings import get_settings

logger = logging.getLogger(__name__)

# Global client instances
_openai_summarizer: Optional[ChatOpenAI] = None
_openai_worker: Optional[ChatOpenAI] = None
_openai_supervisor: Optional[ChatOpenAI] = None
_tavily_client: Optional[TavilyClient] = None


def get_openai_client(client_type: str = "worker") -> ChatOpenAI:
    """
    Get OpenAI client instance.
    
    Args:
        client_type: Type of client ("summarizer", "worker", "supervisor")
    
    Returns:
        ChatOpenAI client instance
    """
    global _openai_summarizer, _openai_worker, _openai_supervisor
    
    settings = get_settings()
    
    if client_type == "summarizer":
        if _openai_summarizer is None:
            _openai_summarizer = ChatOpenAI(
                api_key=settings.openai_api_key,
                model=settings.summarizer_model,
                temperature=settings.summarizer_temperature
            )
            logger.info(f"Initialized OpenAI summarizer client with model: {settings.summarizer_model}")
        return _openai_summarizer
    
    elif client_type == "supervisor":
        if _openai_supervisor is None:
            _openai_supervisor = ChatOpenAI(
                api_key=settings.openai_api_key,
                model=settings.supervisor_model,
                temperature=settings.supervisor_temperature
            )
            logger.info(f"Initialized OpenAI supervisor client with model: {settings.supervisor_model}")
        return _openai_supervisor
    
    else:  # worker (default)
        if _openai_worker is None:
            _openai_worker = ChatOpenAI(
                api_key=settings.openai_api_key,
                model=settings.worker_model,
                temperature=settings.worker_temperature
            )
            logger.info(f"Initialized OpenAI worker client with model: {settings.worker_model}")
        return _openai_worker


def get_tavily_client() -> TavilyClient:
    """
    Get Tavily client instance.
    
    Returns:
        TavilyClient instance
    """
    global _tavily_client
    
    if _tavily_client is None:
        settings = get_settings()
        _tavily_client = TavilyClient(api_key=settings.tavily_api_key)
        logger.info("Initialized Tavily client")
    
    return _tavily_client
