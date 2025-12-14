"""LangChain MCP Adapters integration."""

import logging
import shutil
from typing import Any, Dict, List, Optional

from langchain_mcp_adapters.client import MultiServerMCPClient

logger = logging.getLogger(__name__)


def _get_python_command() -> str:
    """Get the available Python command (python3 or python)."""
    # Try python3 first (preferred on macOS/Linux)
    if shutil.which("python3"):
        return "python3"
    # Fall back to python
    if shutil.which("python"):
        return "python"
    # Default to python3 if neither is found
    logger.warning("Neither 'python3' nor 'python' found in PATH, defaulting to 'python3'")
    return "python3"

_global_mcp_client: Optional[MultiServerMCPClient] = None
_global_server_names: List[str] = []


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
    """Create a MultiServerMCPClient from server configurations."""
    servers_config = {}
    
    for server_config in server_configs:
        server_type = server_config.get("server_type", "stdio")
        name = server_config.get("name")
        
        if not name:
            logger.warning(f"Server config missing 'name' field: {server_config}")
            continue
        
        if server_type == "stdio":
            # Get command and validate/fix it
            command = server_config.get("command", "python")
            
            # If command is just "python" without path, check if it exists
            if command in ("python", "python3"):
                if not shutil.which(command):
                    # Command doesn't exist, try to find a working Python command
                    working_command = _get_python_command()
                    logger.warning(f"Command '{command}' not found in PATH for server '{name}', using '{working_command}' instead")
                    command = working_command
            
            servers_config[name] = {
                "transport": "stdio",
                "command": command,
                "args": server_config.get("args", []),
            }
            if server_config.get("env"):
                servers_config[name]["env"] = server_config["env"]
            logger.info(f"Configured stdio server '{name}': command={servers_config[name]['command']}, args={servers_config[name]['args']}")
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
    
    server_names = list(servers_config.keys())
    
    if not servers_config:
        logger.warning("No valid server configs found - creating empty MultiServerMCPClient")
    
    logger.info(f"Creating MultiServerMCPClient with {len(servers_config)} server(s): {server_names}")
    client = MultiServerMCPClient(
        servers_config,
        tool_interceptors=tool_interceptors if tool_interceptors else None
    )
    logger.info(f"MultiServerMCPClient created successfully with servers: {server_names}")
    
    # Store server names for later retrieval
    set_global_mcp_client(client, server_names)
    
    return client


async def get_mcp_tools_from_client(client: Optional[MultiServerMCPClient] = None) -> List:
    """Get LangChain tools from MCP client."""
    if client is None:
        client = get_global_mcp_client()
    
    if client is None:
        logger.warning("No global MCP client available - MCP tools will not be loaded")
        return []
    
    try:
        tools = await client.get_tools()
        logger.info(f"Loaded {len(tools)} MCP tools from client")
        if tools:
            tool_names = [tool.name if hasattr(tool, 'name') else str(tool) for tool in tools[:5]]
            logger.info(f"MCP tool names (first 5): {tool_names}")
        else:
            logger.debug("No tools returned from MCP client (may have no servers configured or servers don't expose tools)")
        return tools
    except Exception as e:
        logger.error(f"Error getting tools from MCP client: {e}", exc_info=True)
        return []


async def get_mcp_server_names(client: Optional[MultiServerMCPClient] = None) -> List[str]:
    """Get list of server names from MultiServerMCPClient."""
    # First try to get from stored server names
    stored_names = get_global_server_names()
    if stored_names:
        return stored_names
    
    # Fallback: try to extract from client if provided
    if client is None:
        client = get_global_mcp_client()
    
    if client is None:
        return []
    
    # Try to access server config from client
    if hasattr(client, '_servers_config'):
        return list(client._servers_config.keys())
    elif hasattr(client, 'servers_config'):
        return list(client.servers_config.keys())
    elif hasattr(client, '_config') and isinstance(client._config, dict):
        return list(client._config.keys())
    
    return []
