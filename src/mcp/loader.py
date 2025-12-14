"""Helper functions to load MCP servers for users using langchain-mcp-adapters."""

import logging

from .langchain_adapter import (
    create_mcp_client_from_config,
    set_global_mcp_client,
)

logger = logging.getLogger(__name__)


async def load_user_mcp_servers(user_id: int) -> int:
    """Load and connect all enabled MCP servers for a user.
    
    This creates a MultiServerMCPClient used by the agent (chat assistant).
    Note: This is separate from MCPManager used by the MCP servers page interface.
    """
    try:
        from ..core.mcp_servers import list_mcp_servers
        
        servers = list_mcp_servers(user_id, enabled_only=True)
        logger.info(f"[Agent MCP] Found {len(servers)} enabled MCP servers for user {user_id}")
        
        if not servers:
            logger.warning("[Agent MCP] No enabled servers found - creating empty client")
            client = await create_mcp_client_from_config([])
            set_global_mcp_client(client, [])
            return 0
        
        # Log server details
        for server in servers:
            logger.info(f"[Agent MCP] Server: {server['name']} - command: {server.get('command')}, args: {server.get('args')}")
        
        logger.info(f"[Agent MCP] Creating MultiServerMCPClient with {len(servers)} server(s)")
        client = await create_mcp_client_from_config(servers)
        # set_global_mcp_client is called inside create_mcp_client_from_config with server names
        
        logger.info(f"[Agent MCP] Successfully created MultiServerMCPClient for {len(servers)} server(s)")
        return len(servers)
        
    except Exception as e:
        logger.error(f"[Agent MCP] Error loading MCP servers for user {user_id}: {e}", exc_info=True)
        return 0


async def ensure_user_mcp_servers_loaded_async(user_id: int) -> int:
    """Ensure MCP servers are loaded for a user (async version)."""
    return await load_user_mcp_servers(user_id)
