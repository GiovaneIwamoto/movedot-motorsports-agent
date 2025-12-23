"""Repository for user API configuration management."""

from datetime import datetime
from typing import Optional

from .base import _connect


def upsert_user_api_config(
    user_id: int,
    provider: str,
    api_key: str,
    model: str,
    temperature: float = 0.0,
    e2b_api_key: Optional[str] = None,
) -> None:
    """
    Save or update user's API configuration.
    
    Args:
        user_id: User identifier
        provider: LLM provider ("openai" or "anthropic")
        api_key: Provider API key
        model: Model name to use
        temperature: Temperature setting (default: 0.0)
        e2b_api_key: E2B API key for code execution sandbox
    """
    now = datetime.utcnow().isoformat()
    with _connect() as conn:
        cur = conn.cursor()
        cur.execute(
            """
            INSERT OR REPLACE INTO user_api_config (user_id, provider, api_key, model, temperature, e2b_api_key, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (user_id, provider, api_key, model, temperature, e2b_api_key, now),
        )
        conn.commit()


def get_user_api_config(user_id: int) -> Optional[dict]:
    """
    Get user's API configuration.
    
    Args:
        user_id: User identifier
        
    Returns:
        Dictionary with provider, api_key, model, temperature, e2b_api_key, or None if not configured
    """
    with _connect() as conn:
        cur = conn.cursor()
        cur.execute(
            "SELECT provider, api_key, model, temperature, e2b_api_key FROM user_api_config WHERE user_id = ?",
            (user_id,),
        )
        row = cur.fetchone()
        if row:
            return {
                "provider": row["provider"],
                "api_key": row["api_key"],
                "model": row["model"],
                "temperature": row["temperature"],
                "e2b_api_key": row["e2b_api_key"],
            }
        return None


def delete_user_api_config(user_id: int) -> None:
    """
    Delete user's API configuration.
    
    Args:
        user_id: User identifier
    """
    with _connect() as conn:
        cur = conn.cursor()
        cur.execute("DELETE FROM user_api_config WHERE user_id = ?", (user_id,))
        conn.commit()

