"""Load MCP servers for users using langchain-mcp-adapters."""

import logging

from .adapter import create_mcp_client_from_config, set_global_mcp_client

logger = logging.getLogger(__name__)


async def load_user_mcp_servers(user_id: int) -> int:
    """
    Load and connect all enabled MCP servers for a user.
    
    Creates a MultiServerMCPClient used by the agent (chat assistant).
    This is separate from MCPManager used by the MCP servers page interface.
    
    Args:
        user_id: User identifier
        
    Returns:
        Number of servers loaded
    """
    try:
        from ..repositories import list_mcp_servers
        
        servers = list_mcp_servers(user_id, enabled_only=True)
        logger.info(f"Found {len(servers)} enabled MCP servers for user {user_id}")
        
        if not servers:
            client = await create_mcp_client_from_config([])
            set_global_mcp_client(client, [])
            return 0
        
        client = await create_mcp_client_from_config(servers)
        return len(servers)
        
    except Exception as e:
        logger.error(f"Error loading MCP servers for user {user_id}: {e}", exc_info=True)
        return 0


async def ensure_user_mcp_servers_loaded_async(user_id: int) -> int:
    """Ensure MCP servers are loaded for a user (alias for load_user_mcp_servers)."""
    return await load_user_mcp_servers(user_id)
