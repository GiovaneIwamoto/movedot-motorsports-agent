"""Repository for chat conversations and messages."""

from datetime import datetime
from typing import Optional
from uuid import uuid4

from .base import _connect


def ensure_conversation(
    user_id: int,
    conversation_id: Optional[str],
    title: Optional[str] = None,
) -> str:
    """
    Ensure a conversation exists, creating it if necessary.
    
    Args:
        user_id: Owner user ID
        conversation_id: Existing conversation ID (if any)
        title: Conversation title (default: "Conversation")
        
    Returns:
        Conversation ID (existing or newly created)
    """
    now = datetime.utcnow().isoformat()
    with _connect() as conn:
        cur = conn.cursor()
        
        if conversation_id:
            cur.execute(
                "SELECT id FROM conversations WHERE id = ? AND user_id = ?",
                (conversation_id, user_id),
            )
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
    """
    List all conversations for a user, ordered by most recent update.
    
    Args:
        user_id: Owner user ID
        
    Returns:
        List of conversation dictionaries with id, title, created_at, updated_at
    """
    with _connect() as conn:
        cur = conn.cursor()
        cur.execute(
            "SELECT id, title, created_at, updated_at FROM conversations WHERE user_id = ? ORDER BY updated_at DESC",
            (user_id,),
        )
        return [dict(r) for r in cur.fetchall()]


def get_messages(conversation_id: str, limit: int = 200) -> list[dict]:
    """
    Get messages for a conversation, ordered chronologically.
    
    Args:
        conversation_id: Conversation identifier
        limit: Maximum number of messages to return (default: 200)
        
    Returns:
        List of message dictionaries with id, role, content, created_at
    """
    with _connect() as conn:
        cur = conn.cursor()
        cur.execute(
            "SELECT id, role, content, created_at FROM messages WHERE conversation_id = ? ORDER BY created_at ASC LIMIT ?",
            (conversation_id, limit),
        )
        return [dict(r) for r in cur.fetchall()]


def add_message(conversation_id: str, role: str, content: str) -> str:
    """
    Add a message to a conversation and update conversation timestamp.
    
    Args:
        conversation_id: Target conversation ID
        role: Message role ("user" or "assistant")
        content: Message content
        
    Returns:
        Created message ID
    """
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
    """
    Delete all conversations and their messages for a user.
    
    Args:
        user_id: Owner user ID
        
    Returns:
        Number of conversations deleted
    """
    with _connect() as conn:
        cur = conn.cursor()
        cur.execute("SELECT id FROM conversations WHERE user_id = ?", (user_id,))
        conversation_ids = [row["id"] for row in cur.fetchall()]
        
        for conv_id in conversation_ids:
            cur.execute("DELETE FROM messages WHERE conversation_id = ?", (conv_id,))
        
        cur.execute("DELETE FROM conversations WHERE user_id = ?", (user_id,))
        deleted_conversations = cur.rowcount
        
        conn.commit()
        return deleted_conversations

