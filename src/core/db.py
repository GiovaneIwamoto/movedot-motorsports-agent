"""SQLite database helpers for users, sessions, conversations, and messages."""

from __future__ import annotations

import sqlite3
from dataclasses import dataclass
from pathlib import Path
from typing import Optional, Iterable
from datetime import datetime, timedelta

from src.config.settings import get_settings


def _connect() -> sqlite3.Connection:
    settings = get_settings()
    db_path = Path(settings.app_db_path)
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with _connect() as conn:
        cur = conn.cursor()
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                google_sub TEXT UNIQUE NOT NULL,
                email TEXT,
                name TEXT,
                picture TEXT,
                created_at TEXT NOT NULL
            )
            """
        )
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                expires_at TEXT NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )
            """
        )
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS conversations (
                id TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL,
                title TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )
            """
        )
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS messages (
                id TEXT PRIMARY KEY,
                conversation_id TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY(conversation_id) REFERENCES conversations(id)
            )
            """
        )
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS user_api_config (
                user_id INTEGER PRIMARY KEY,
                provider TEXT NOT NULL,
                api_key TEXT NOT NULL,
                model TEXT NOT NULL,
                temperature REAL DEFAULT 0.1,
                e2b_api_key TEXT,
                updated_at TEXT NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            )
            """
        )
        # Add e2b_api_key column if it doesn't exist (migration)
        try:
            cur.execute("ALTER TABLE user_api_config ADD COLUMN e2b_api_key TEXT")
        except sqlite3.OperationalError:
            # Column already exists, ignore
            pass
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS mcp_servers (
                id TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                server_type TEXT NOT NULL,
                command TEXT,
                args TEXT,
                env TEXT,
                url TEXT,
                headers TEXT,
                enabled BOOLEAN DEFAULT 1,
                created_at TEXT NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            )
            """
        )
        conn.commit()


def upsert_user(google_sub: str, email: Optional[str], name: Optional[str], picture: Optional[str]) -> int:
    now = datetime.utcnow().isoformat()
    with _connect() as conn:
        cur = conn.cursor()
        cur.execute("SELECT id FROM users WHERE google_sub = ?", (google_sub,))
        row = cur.fetchone()
        if row:
            user_id = int(row["id"])
            cur.execute(
                "UPDATE users SET email = ?, name = ?, picture = ? WHERE id = ?",
                (email, name, picture, user_id),
            )
        else:
            cur.execute(
                "INSERT INTO users (google_sub, email, name, picture, created_at) VALUES (?, ?, ?, ?, ?)",
                (google_sub, email, name, picture, now),
            )
            user_id = cur.lastrowid
        conn.commit()
        return int(user_id)


def create_session(session_id: str, user_id: int, ttl_days: int = 7) -> None:
    now = datetime.utcnow()
    with _connect() as conn:
        cur = conn.cursor()
        cur.execute(
            "INSERT OR REPLACE INTO sessions (id, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
            (session_id, user_id, now.isoformat(), (now + timedelta(days=ttl_days)).isoformat()),
        )
        conn.commit()


def get_session_user(session_id: str) -> Optional[sqlite3.Row]:
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
    with _connect() as conn:
        cur = conn.cursor()
        cur.execute("DELETE FROM sessions WHERE id = ?", (session_id,))
        conn.commit()


def ensure_conversation(user_id: int, conversation_id: Optional[str], title: Optional[str] = None) -> str:
    from uuid import uuid4
    now = datetime.utcnow().isoformat()
    with _connect() as conn:
        cur = conn.cursor()
        if conversation_id:
            cur.execute("SELECT id FROM conversations WHERE id = ? AND user_id = ?", (conversation_id, user_id))
            if cur.fetchone():
                return conversation_id
        new_id = str(uuid4())
        cur.execute(
            "INSERT INTO conversations (id, user_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
            (new_id, user_id, title or "Conversation", now, now),
        )
        conn.commit()
        return new_id


def list_conversations(user_id: int) -> list[dict]:
    with _connect() as conn:
        cur = conn.cursor()
        cur.execute(
            "SELECT id, title, created_at, updated_at FROM conversations WHERE user_id = ? ORDER BY updated_at DESC",
            (user_id,),
        )
        return [dict(r) for r in cur.fetchall()]


def get_messages(conversation_id: str, limit: int = 200) -> list[dict]:
    with _connect() as conn:
        cur = conn.cursor()
        cur.execute(
            "SELECT id, role, content, created_at FROM messages WHERE conversation_id = ? ORDER BY created_at ASC LIMIT ?",
            (conversation_id, limit),
        )
        return [dict(r) for r in cur.fetchall()]


def add_message(conversation_id: str, role: str, content: str) -> str:
    from uuid import uuid4
    now = datetime.utcnow().isoformat()
    msg_id = str(uuid4())
    with _connect() as conn:
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO messages (id, conversation_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)",
            (msg_id, conversation_id, role, content, now),
        )
        cur.execute("UPDATE conversations SET updated_at = ? WHERE id = ?", (now, conversation_id))
        conn.commit()
    return msg_id


def delete_user_conversations(user_id: int) -> int:
    """Delete all conversations and messages for a user."""
    with _connect() as conn:
        cur = conn.cursor()
        cur.execute("SELECT id FROM conversations WHERE user_id = ?", (user_id,))
        conversation_ids = [row["id"] for row in cur.fetchall()]
        
        deleted_messages = 0
        for conv_id in conversation_ids:
            cur.execute("DELETE FROM messages WHERE conversation_id = ?", (conv_id,))
            deleted_messages += cur.rowcount
        
        cur.execute("DELETE FROM conversations WHERE user_id = ?", (user_id,))
        deleted_conversations = cur.rowcount
        
        conn.commit()
        return deleted_conversations


def upsert_user_api_config(user_id: int, provider: str, api_key: str, model: str, temperature: float = 0.0, e2b_api_key: Optional[str] = None) -> None:
    """Save or update user's API configuration."""
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
    """Get user's API configuration."""
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
    """Delete user's API configuration."""
    with _connect() as conn:
        cur = conn.cursor()
        cur.execute("DELETE FROM user_api_config WHERE user_id = ?", (user_id,))
        conn.commit()





