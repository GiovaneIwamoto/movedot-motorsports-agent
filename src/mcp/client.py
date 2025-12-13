"""MCP client for API management endpoints (mcp_routes.py).

Note: For agent tool integration, use langchain-mcp-adapters via langchain_adapter.py
"""

import logging
from contextlib import AsyncExitStack
from typing import Any, Dict, List, Optional

from anyio import ClosedResourceError
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

logger = logging.getLogger(__name__)


class MCPClient:
    """MCP client for connecting to MCP servers (used by API management endpoints)."""
    
    def __init__(
        self,
        server_id: str,
        server_type: str,
        name: str,
        command: Optional[str] = None,
        args: Optional[List[str]] = None,
        env: Optional[Dict[str, str]] = None,
        url: Optional[str] = None,
        headers: Optional[Dict[str, str]] = None,
    ):
        self.server_id = server_id
        self.server_type = server_type
        self.name = name
        self.command = command
        self.args = args or []
        self.env = env or {}
        self.url = url
        self.headers = headers or {}
        
        self._exit_stack = AsyncExitStack()
        self._session: Optional[ClientSession] = None
        self._read_stream = None
        self._write_stream = None
        self._connected = False
        self._tools_cache: Optional[List[Dict[str, Any]]] = None
        self._resources_cache: Optional[List[Dict[str, Any]]] = None
    
    async def connect(self) -> bool:
        """Connect to the MCP server."""
        try:
            if self.server_type == "stdio":
                return await self._connect_stdio()
            elif self.server_type in ("sse", "http"):
                logger.warning(f"HTTP/SSE transport not implemented for {self.name}")
                return False
            else:
                logger.error(f"Unknown server type: {self.server_type}")
                return False
        except Exception as e:
            logger.error(f"Failed to connect to {self.name}: {e}")
            return False
    
    async def _connect_stdio(self) -> bool:
        """Connect via stdio."""
        try:
            server_params = StdioServerParameters(
                command=self.command or "python",
                args=self.args,
                env=self.env if self.env else None,
            )
            
            stdio_transport = await self._exit_stack.enter_async_context(
                stdio_client(server_params)
            )
            self._read_stream, self._write_stream = stdio_transport
            
            self._session = await self._exit_stack.enter_async_context(
                ClientSession(self._read_stream, self._write_stream)
            )
            
            await self._session.initialize()
            
            try:
                tools_result = await self._session.list_tools()
                tools_count = len(tools_result.tools) if tools_result.tools else 0
                logger.info(f"Connected to {self.name} ({tools_count} tools)")
            except Exception as e:
                logger.warning(f"Connected to {self.name} but failed to list tools: {e}")
            
            self._connected = True
            return True
            
        except Exception as e:
            logger.error(f"Failed to connect to {self.name}: {e}", exc_info=True)
            await self._cleanup_resources()
            return False
    
    async def _cleanup_resources(self):
        """Cleanup resources."""
        try:
            await self._exit_stack.aclose()
        except Exception:
            pass
        finally:
            self._session = None
            self._read_stream = None
            self._write_stream = None
            self._exit_stack = AsyncExitStack()
    
    async def disconnect(self):
        """Disconnect from the MCP server."""
        if not self._connected:
            return
        
        try:
            await self._cleanup_resources()
            self._connected = False
            self._tools_cache = None
            self._resources_cache = None
        except Exception as e:
            logger.error(f"Error disconnecting from {self.name}: {e}", exc_info=True)
            self._connected = False
            self._tools_cache = None
            self._resources_cache = None
    
    async def list_tools(self) -> List[Dict[str, Any]]:
        """List available tools from the MCP server."""
        if self._tools_cache is not None:
            return self._tools_cache
        
        if not self._session or not self._connected:
            return []
        
        try:
            result = await self._session.list_tools()
            
            if not hasattr(result, 'tools'):
                return []
            
            tools_list = result.tools
            tools = []
            
            if tools_list:
                for tool in tools_list:
                    try:
                        input_schema = {}
                        if hasattr(tool, 'inputSchema') and tool.inputSchema is not None:
                            input_schema_value = tool.inputSchema
                            if isinstance(input_schema_value, dict):
                                input_schema = input_schema_value
                            elif hasattr(input_schema_value, 'model_dump'):
                                input_schema = input_schema_value.model_dump()
                            elif hasattr(input_schema_value, 'dict'):
                                input_schema = input_schema_value.dict()
                        
                        tools.append({
                            "name": tool.name,
                            "description": tool.description or "",
                            "inputSchema": input_schema,
                        })
                    except Exception as e:
                        logger.error(f"Error processing tool {getattr(tool, 'name', 'unknown')}: {e}")
                        continue
            
            self._tools_cache = tools
            return tools
            
        except Exception as e:
            logger.error(f"Error listing tools from {self.name}: {e}", exc_info=True)
            return []
    
    async def list_resources(self) -> List[Dict[str, Any]]:
        """List available resources from the MCP server."""
        if self._resources_cache is not None:
            return self._resources_cache
        
        if not self._session or not self._connected:
            return []
        
        try:
            result = await self._session.list_resources()
            
            if not hasattr(result, 'resources'):
                return []
            
            resources_list = result.resources
            resources = []
            
            if resources_list:
                for resource in resources_list:
                    resources.append({
                        "uri": str(resource.uri),
                        "name": resource.name or str(resource.uri),
                        "description": resource.description or "",
                        "mimeType": resource.mimeType or "text/markdown",
                    })
            
            self._resources_cache = resources
            return resources
            
        except Exception as e:
            logger.error(f"Error listing resources from {self.name}: {e}", exc_info=True)
            return []
    
    async def call_tool(self, tool_name: str, arguments: Dict[str, Any]) -> Any:
        """Call a tool on the MCP server."""
        if not self._session or not self._connected:
            raise RuntimeError(f"Cannot call tool '{tool_name}': not connected to {self.name}")
        
        try:
            result = await self._session.call_tool(tool_name, arguments)
            
            if result.content:
                text_parts = []
                for item in result.content:
                    if hasattr(item, 'text'):
                        text_parts.append(item.text)
                    elif isinstance(item, dict) and 'text' in item:
                        text_parts.append(item['text'])
                    elif isinstance(item, str):
                        text_parts.append(item)
                
                if text_parts:
                    return "\n".join(text_parts)
            
            return str(result)
            
        except (ClosedResourceError, Exception) as e:
            if isinstance(e, ClosedResourceError):
                self._connected = False
                self._session = None
            
            logger.error(f"Error calling tool '{tool_name}' on {self.name}: {e}", exc_info=True)
            raise RuntimeError(f"Failed to call tool '{tool_name}' on {self.name}: {str(e)}") from e
    
    async def get_resource(self, resource_uri: str) -> Optional[str]:
        """Get a resource from the MCP server."""
        if not self._session or not self._connected:
            return None
        
        try:
            result = await self._session.read_resource(resource_uri)
            
            if result.contents:
                text_parts = []
                for item in result.contents:
                    if hasattr(item, 'text'):
                        text_parts.append(item.text)
                    elif isinstance(item, dict) and 'text' in item:
                        text_parts.append(item['text'])
                    elif isinstance(item, str):
                        text_parts.append(item)
                
                if text_parts:
                    return "\n".join(text_parts)
            
            return None
            
        except (ClosedResourceError, Exception) as e:
            if isinstance(e, ClosedResourceError):
                self._connected = False
                self._session = None
            
            logger.error(f"Error getting resource '{resource_uri}' from {self.name}: {e}", exc_info=True)
            return None
    
    @property
    def is_connected(self) -> bool:
        """Check if client is connected."""
        return self._connected and self._session is not None
    
    async def __aenter__(self):
        """Async context manager entry."""
        await self.connect()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await self.disconnect()
