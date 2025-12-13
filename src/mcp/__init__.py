"""MCP (Model Context Protocol) integration using langchain-mcp-adapters."""

from .langchain_adapter import (
    create_mcp_client_from_config,
    get_global_mcp_client,
    get_mcp_tools_from_client,
    set_global_mcp_client,
)
from .loader import ensure_user_mcp_servers_loaded_async, load_user_mcp_servers

# Legacy imports for mcp_routes.py (API management endpoints)
from .client import MCPClient
from .manager import MCPManager, get_global_mcp_manager

__all__ = [
    # langchain-mcp-adapters API (preferred)
    "create_mcp_client_from_config",
    "get_global_mcp_client",
    "get_mcp_tools_from_client",
    "set_global_mcp_client",
    "load_user_mcp_servers",
    "ensure_user_mcp_servers_loaded_async",
    # Legacy API (for mcp_routes.py only)
    "MCPClient",
    "MCPManager",
    "get_global_mcp_manager",
]
