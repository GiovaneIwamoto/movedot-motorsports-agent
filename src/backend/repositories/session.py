"""Repository for session management."""

import sqlite3
from datetime import datetime, timedelta
from typing import Optional

from .base import _connect


def create_session(session_id: str, user_id: int, ttl_days: int = 7) -> None:
    """
    Create or refresh a user session.

    Args:
        session_id: Unique session identifier
        user_id: Associated user ID
        ttl_days: Session time-to-live in days (default: 7)
    """
    now = datetime.utcnow()
    with _connect() as conn:
        cur = conn.cursor()
        cur.execute(
            "INSERT OR REPLACE INTO sessions (id, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
            (session_id, user_id, now.isoformat(), (now + timedelta(days=ttl_days)).isoformat()),
        )
        conn.commit()


def get_session_user(session_id: str) -> Optional[sqlite3.Row]:
    """
    Get user information from a valid session.

    Args:
        session_id: Session identifier to look up

    Returns:
        User row if session is valid and not expired, None otherwise
    """
    with _connect() as conn:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT users.* FROM sessions
            JOIN users ON users.id = sessions.user_id
            WHERE sessions.id = ? AND sessions.expires_at > ?
            """,
            (session_id, datetime.utcnow().isoformat()),
        )
        return cur.fetchone()


def delete_session(session_id: str) -> None:
    """
    Delete a session by ID.

    Args:
        session_id: Session identifier to delete
    """
    with _connect() as conn:
        cur = conn.cursor()
        cur.execute("DELETE FROM sessions WHERE id = ?", (session_id,))
        conn.commit()

