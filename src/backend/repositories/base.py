"""Base database connection and initialization utilities."""

import sqlite3
from pathlib import Path

from src.backend.config.settings import get_settings


def _connect() -> sqlite3.Connection:
    """
    Create and return a database connection.
    
    Returns:
        SQLite connection with Row factory enabled for dict-like access
    """
    settings = get_settings()
    db_path = Path(settings.app_db_path)
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    """
    Initialize database schema by creating all required tables.
    
    Creates tables for:
    - users: User accounts (Google OAuth)
    - sessions: User session management
    - conversations: Chat conversation containers
    - messages: Individual chat messages
    - user_api_config: User API keys and model preferences
    - mcp_servers: MCP server configurations per user
    """
    with _connect() as conn:
        cur = conn.cursor()
        
        # Users table
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
        
        # Sessions table
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
        
        # Conversations table
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
        
        # Messages table
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
        
        # User API configuration table
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
        
        # Migration: Add e2b_api_key column if it doesn't exist
        try:
            cur.execute("ALTER TABLE user_api_config ADD COLUMN e2b_api_key TEXT")
        except sqlite3.OperationalError:
            # Column already exists, ignore
            pass
        
        # MCP servers table
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

