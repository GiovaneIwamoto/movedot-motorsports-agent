"""Repository layer for data persistence operations."""

from .base import init_db
from .user import upsert_user
from .session import create_session, delete_session, get_session_user
from .chat import (
    add_message,
    delete_user_conversations,
    ensure_conversation,
    get_messages,
    list_conversations,
)
from .api_config import (
    delete_user_api_config,
    get_user_api_config,
    upsert_user_api_config,
)
from .mcp_server import (
    create_mcp_server,
    delete_mcp_server,
    get_mcp_server,
    list_mcp_servers,
    update_mcp_server,
)

__all__ = [
    # Database initialization
    "init_db",
    # Users and sessions
    "upsert_user",
    "create_session",
    "get_session_user",
    "delete_session",
    # Chat (conversations and messages)
    "ensure_conversation",
    "list_conversations",
    "get_messages",
    "add_message",
    "delete_user_conversations",
    # User API configuration
    "upsert_user_api_config",
    "get_user_api_config",
    "delete_user_api_config",
    # MCP servers
    "create_mcp_server",
    "get_mcp_server",
    "list_mcp_servers",
    "update_mcp_server",
    "delete_mcp_server",
]

