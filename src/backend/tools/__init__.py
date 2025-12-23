"""Tools for the agent system."""

import asyncio
import logging
from typing import List

from .analysis_tools import (
    analyze_data_with_pandas,
    debug_csv_storage,
    list_available_data,
    quick_data_check,
    clear_csv_cache,
    cleanup_e2b_sandbox_tool,
    get_analysis_tools
)
from .context_tools import get_context_tools

logger = logging.getLogger(__name__)


async def get_all_tools_async():
    """Get all tools including analysis tools, context tools, and dynamic MCP tools (async version)."""
    try:
        analysis_tools = get_analysis_tools()
    except Exception as e:
        logger.error(f"Error loading analysis tools: {e}", exc_info=True)
        analysis_tools = []
    
    try:
        context_tools = get_context_tools()
    except Exception as e:
        logger.error(f"Error loading context tools: {e}", exc_info=True)
        context_tools = []
    
    try:
        mcp_tools = await _get_mcp_tools_async()
    except Exception as e:
        logger.error(f"Error loading MCP tools: {e}", exc_info=True)
        mcp_tools = []
    
    return analysis_tools + context_tools + mcp_tools


def get_all_tools():
    """Get all tools including analysis tools, context tools, and dynamic MCP tools (sync wrapper)."""
    try:
        analysis_tools = get_analysis_tools()
    except Exception as e:
        logger.error(f"Error loading analysis tools: {e}", exc_info=True)
        analysis_tools = []
    
    try:
        context_tools = get_context_tools()
    except Exception as e:
        logger.error(f"Error loading context tools: {e}", exc_info=True)
        context_tools = []
    
    try:
        asyncio.get_running_loop()
        logger.warning("Called get_all_tools() from async context. Use get_all_tools_async() instead.")
        return analysis_tools + context_tools
    except RuntimeError:
        mcp_tools = _get_mcp_tools()
        return analysis_tools + context_tools + mcp_tools


async def _get_mcp_tools_async() -> List:
    """Get tools from MCP servers using langchain-mcp-adapters."""
    try:
        from ..mcp.adapter import get_mcp_tools_from_client
        return await get_mcp_tools_from_client()
    except ImportError:
        return []
    except Exception as e:
        logger.error(f"Error getting MCP tools: {e}", exc_info=True)
        return []


def _get_mcp_tools() -> List:
    """Get tools from MCP servers (sync wrapper)."""
    try:
        asyncio.get_running_loop()
        logger.warning("Called _get_mcp_tools() from async context. Use _get_mcp_tools_async() instead.")
        return []
    except RuntimeError:
        pass
    
    try:
        from ..mcp.adapter import get_mcp_tools_from_client
        
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            created_loop = True
        else:
            created_loop = False
        
        try:
            return loop.run_until_complete(get_mcp_tools_from_client())
        finally:
            if created_loop and not loop.is_closed():
                try:
                    loop.close()
                except Exception:
                    pass
    except ImportError:
        return []
    except Exception as e:
        logger.warning(f"Error getting MCP tools: {e}", exc_info=True)
        return []

__all__ = [
    "analyze_data_with_pandas",
    "debug_csv_storage",
    "list_available_data",
    "quick_data_check",
    "clear_csv_cache",
    "cleanup_e2b_sandbox_tool",
    "get_analysis_tools",
    "get_all_tools"
]
