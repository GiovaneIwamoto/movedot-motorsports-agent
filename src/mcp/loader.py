"""Helper functions to load MCP servers for users using langchain-mcp-adapters."""

import logging

from .langchain_adapter import (
    create_mcp_client_from_config,
    set_global_mcp_client,
)

logger = logging.getLogger(__name__)


async def load_user_mcp_servers(user_id: int) -> int:
    """Load and connect all enabled MCP servers for a user."""
    try:
        from ..core.mcp_servers import list_mcp_servers
        
        servers = list_mcp_servers(user_id, enabled_only=True)
        
        if not servers:
            client = await create_mcp_client_from_config([])
            set_global_mcp_client(client)
            return 0
        
        client = await create_mcp_client_from_config(servers)
        set_global_mcp_client(client)
        
        logger.info(f"Loaded {len(servers)} MCP servers for user {user_id}")
        return len(servers)
        
    except Exception as e:
        logger.error(f"Error loading MCP servers for user {user_id}: {e}", exc_info=True)
        return 0


async def ensure_user_mcp_servers_loaded_async(user_id: int) -> int:
    """Ensure MCP servers are loaded for a user (async version)."""
    return await load_user_mcp_servers(user_id)
