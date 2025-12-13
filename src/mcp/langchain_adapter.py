"""LangChain MCP Adapters integration."""

import logging
from typing import Any, Dict, List, Optional

from langchain_mcp_adapters.client import MultiServerMCPClient

logger = logging.getLogger(__name__)

_global_mcp_client: Optional[MultiServerMCPClient] = None


def get_global_mcp_client() -> Optional[MultiServerMCPClient]:
    """Get the global MultiServerMCPClient instance."""
    return _global_mcp_client


def set_global_mcp_client(client: MultiServerMCPClient) -> None:
    """Set the global MultiServerMCPClient instance."""
    global _global_mcp_client
    _global_mcp_client = client


async def create_mcp_client_from_config(
    server_configs: List[Dict[str, Any]],
    tool_interceptors: Optional[List] = None,
) -> MultiServerMCPClient:
    """Create a MultiServerMCPClient from server configurations."""
    servers_config = {}
    
    for server_config in server_configs:
        server_type = server_config["server_type"]
        name = server_config["name"]
        
        if server_type == "stdio":
            servers_config[name] = {
                "transport": "stdio",
                "command": server_config.get("command", "python"),
                "args": server_config.get("args", []),
            }
            if server_config.get("env"):
                servers_config[name]["env"] = server_config["env"]
        elif server_type in ("http", "sse"):
            servers_config[name] = {
                "transport": "http",
                "url": server_config.get("url"),
            }
            if server_config.get("headers"):
                servers_config[name]["headers"] = server_config["headers"]
        else:
            logger.warning(f"Unknown server type '{server_type}' for '{name}', skipping")
            continue
    
    return MultiServerMCPClient(
        servers_config,
        tool_interceptors=tool_interceptors if tool_interceptors else None
    )


async def get_mcp_tools_from_client(client: Optional[MultiServerMCPClient] = None) -> List:
    """Get LangChain tools from MCP client."""
    if client is None:
        client = get_global_mcp_client()
    
    if client is None:
        return []
    
    try:
        return await client.get_tools()
    except Exception as e:
        logger.error(f"Error getting tools from MCP client: {e}", exc_info=True)
        return []
