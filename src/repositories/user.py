"""Repository for user management."""

import sqlite3
from datetime import datetime
from typing import Optional

from .base import _connect


def upsert_user(
    google_sub: str,
    email: Optional[str],
    name: Optional[str],
    picture: Optional[str],
) -> int:
    """
    Create or update a user based on Google OAuth subject.
    
    Args:
        google_sub: Google OAuth subject identifier (unique)
        email: User email address
        name: User display name
        picture: User profile picture URL
        
    Returns:
        User ID (existing or newly created)
    """
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

