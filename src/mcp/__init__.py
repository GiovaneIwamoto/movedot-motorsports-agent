"""MCP (Model Context Protocol) integration."""

from .adapter import (
    create_mcp_client_from_config,
    get_global_mcp_client,
    get_global_server_names,
    get_mcp_server_names,
    get_mcp_tools_from_client,
    set_global_mcp_client,
)
from .client import MCPClient
from .loader import ensure_user_mcp_servers_loaded_async, load_user_mcp_servers
from .manager import MCPManager, get_global_mcp_manager

__all__ = [
    # LangChain MCP adapters API (for agent tool integration)
    "create_mcp_client_from_config",
    "get_global_mcp_client",
    "get_global_server_names",
    "get_mcp_server_names",
    "get_mcp_tools_from_client",
    "set_global_mcp_client",
    "load_user_mcp_servers",
    "ensure_user_mcp_servers_loaded_async",
    # MCP client API (for API management endpoints)
    "MCPClient",
    "MCPManager",
    "get_global_mcp_manager",
]
