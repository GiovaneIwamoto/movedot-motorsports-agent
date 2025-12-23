"""LangChain MCP Adapters integration for agent tool loading."""

import logging
import shutil
from typing import Any, Dict, List, Optional

from langchain_mcp_adapters.client import MultiServerMCPClient

logger = logging.getLogger(__name__)

# Global client state
_global_mcp_client: Optional[MultiServerMCPClient] = None
_global_server_names: List[str] = []


def _get_python_command() -> str:
    """Get available Python command (python3 or python)."""
    if shutil.which("python3"):
        return "python3"
    if shutil.which("python"):
        return "python"
    logger.warning("Neither 'python3' nor 'python' found in PATH, defaulting to 'python3'")
    return "python3"


def get_global_mcp_client() -> Optional[MultiServerMCPClient]:
    """Get the global MultiServerMCPClient instance."""
    return _global_mcp_client


def set_global_mcp_client(client: MultiServerMCPClient, server_names: Optional[List[str]] = None) -> None:
    """Set the global MultiServerMCPClient instance."""
    global _global_mcp_client, _global_server_names
    _global_mcp_client = client
    if server_names is not None:
        _global_server_names = server_names


def get_global_server_names() -> List[str]:
    """Get the list of server names for the global MCP client."""
    return _global_server_names


async def create_mcp_client_from_config(
    server_configs: List[Dict[str, Any]],
    tool_interceptors: Optional[List] = None,
) -> MultiServerMCPClient:
    """
    Create a MultiServerMCPClient from server configurations.
    
    Args:
        server_configs: List of server configuration dictionaries
        tool_interceptors: Optional tool interceptors for LangChain
        
    Returns:
        Configured MultiServerMCPClient instance
    """
    servers_config = {}
    
    for server_config in server_configs:
        server_type = server_config.get("server_type", "stdio")
        name = server_config.get("name")
        
        if not name:
            logger.warning(f"Server config missing 'name' field: {server_config}")
            continue
        
        if server_type == "stdio":
            command = server_config.get("command", "python")
            
            if command in ("python", "python3") and not shutil.which(command):
                working_command = _get_python_command()
                logger.warning(f"Command '{command}' not found for '{name}', using '{working_command}'")
                command = working_command
            
            servers_config[name] = {
                "transport": "stdio",
                "command": command,
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
    
    if not servers_config:
        logger.warning("No valid server configs found - creating empty MultiServerMCPClient")
    
    client = MultiServerMCPClient(
        servers_config,
        tool_interceptors=tool_interceptors if tool_interceptors else None
    )
    
    server_names = list(servers_config.keys())
    set_global_mcp_client(client, server_names)
    
    return client


async def get_mcp_tools_from_client(client: Optional[MultiServerMCPClient] = None) -> List:
    """
    Get LangChain tools from MCP client.
    
    Args:
        client: Optional MultiServerMCPClient (uses global if not provided)
        
    Returns:
        List of LangChain tools
    """
    if client is None:
        client = get_global_mcp_client()
    
    if client is None:
        return []
    
    try:
        tools = await client.get_tools()
        return tools
    except Exception as e:
        logger.error(f"Error getting tools from MCP client: {e}", exc_info=True)
        return []


async def get_mcp_server_names(client: Optional[MultiServerMCPClient] = None) -> List[str]:
    """
    Get list of server names from MultiServerMCPClient.
    
    Args:
        client: Optional MultiServerMCPClient (uses global if not provided)
        
    Returns:
        List of server names
    """
    stored_names = get_global_server_names()
    if stored_names:
        return stored_names
    
    if client is None:
        client = get_global_mcp_client()
    
    if client is None:
        return []
    
    if hasattr(client, '_servers_config'):
        return list(client._servers_config.keys())
    elif hasattr(client, 'servers_config'):
        return list(client.servers_config.keys())
    elif hasattr(client, '_config') and isinstance(client._config, dict):
        return list(client._config.keys())
    
    return []
