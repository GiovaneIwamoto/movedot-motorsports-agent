"""Client configurations for external services."""

from typing import Union

from langchain_anthropic import ChatAnthropic
from langchain_openai import ChatOpenAI

LLMClient = Union[ChatOpenAI, ChatAnthropic]


def get_llm_client(
    provider: str,
    api_key: str,
    model: str,
    temperature: float = 0.1,
) -> LLMClient:
    """
    Create an LLM client for the given provider.

    Args:
        provider: "openai" or "anthropic"
        api_key: API key for the provider
        model: Model name to use
        temperature: Temperature setting (default: 0.1)

    Returns:
        LLM client instance (ChatOpenAI or ChatAnthropic)

    Raises:
        ValueError: If provider is not supported
    """
    provider_normalized = provider.lower()

    if provider_normalized == "openai":
        return ChatOpenAI(api_key=api_key, model=model, temperature=temperature)

    if provider_normalized == "anthropic":
        return ChatAnthropic(api_key=api_key, model=model, temperature=temperature)

    raise ValueError(f"Unsupported provider: {provider}")
