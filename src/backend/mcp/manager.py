"""MCP manager for API management endpoints.

Note: For agent tool integration, use langchain-mcp-adapters via adapter.py
"""

import asyncio
import logging
from typing import Any, Dict, List, Optional

from .client import MCPClient

logger = logging.getLogger(__name__)


class MCPManager:
    """Manages multiple MCP clients for API endpoints."""
    
    _instance: Optional['MCPManager'] = None
    _initialized = False
    
    def __new__(cls):
        """Singleton pattern."""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        """Initialize MCP manager."""
        if MCPManager._initialized:
            return
        self._clients: Dict[str, MCPClient] = {}
        self._lock = asyncio.Lock()
        MCPManager._initialized = True
    
    async def add_client(self, client: MCPClient) -> bool:
        """Add and connect an MCP client."""
        async with self._lock:
            if client.server_id in self._clients:
                logger.warning(f"Client {client.server_id} ({client.name}) already exists")
                return False
            
            try:
                connected = await client.connect()
                if connected:
                    try:
                        tools = await client.list_tools()
                        logger.info(f"Added MCP client: {client.name} ({len(tools)} tools)")
                    except Exception as e:
                        logger.warning(f"Client {client.name} connected but failed to list tools: {e}")
                    
                    self._clients[client.server_id] = client
                    return True
                else:
                    logger.error(f"Failed to connect MCP client: {client.name}")
                    return False
            except Exception as e:
                logger.error(f"Exception connecting MCP client {client.name}: {e}", exc_info=True)
                return False
    
    async def remove_client(self, server_id: str) -> bool:
        """Remove and disconnect an MCP client."""
        async with self._lock:
            if server_id not in self._clients:
                return False
            
            client = self._clients[server_id]
            try:
                await client.disconnect()
                del self._clients[server_id]
                return True
            except Exception as e:
                logger.error(f"Error disconnecting client {server_id}: {e}", exc_info=True)
                del self._clients[server_id]
                return True
    
    async def get_client(self, server_id: str) -> Optional[MCPClient]:
        """Get an MCP client by ID."""
        async with self._lock:
            return self._clients.get(server_id)
    
    async def list_clients(self) -> List[MCPClient]:
        """List all connected MCP clients."""
        async with self._lock:
            return list(self._clients.values())
    
    async def get_all_tools(self) -> List[Dict]:
        """Get all tools from all connected clients."""
        all_tools = []
        async with self._lock:
            for client in self._clients.values():
                if not client.is_connected:
                    continue
                
                try:
                    tools = await client.list_tools()
                    for tool in tools:
                        tool["_mcp_server_id"] = client.server_id
                        tool["_mcp_server_name"] = client.name
                    all_tools.extend(tools)
                except Exception as e:
                    logger.error(f"Error listing tools from {client.name}: {e}", exc_info=True)
        
        return all_tools
    
    async def get_all_resources(self) -> List[Dict]:
        """Get all resources from all connected clients."""
        all_resources = []
        async with self._lock:
            for client in self._clients.values():
                if not client.is_connected:
                    continue
                
                try:
                    resources = await client.list_resources()
                    for resource in resources:
                        resource["_mcp_server_id"] = client.server_id
                        resource["_mcp_server_name"] = client.name
                    all_resources.extend(resources)
                except Exception as e:
                    logger.error(f"Error listing resources from {client.name}: {e}", exc_info=True)
        
        return all_resources
    
    async def call_tool(self, server_id: str, tool_name: str, arguments: Dict) -> Any:
        """Call a tool on a specific server."""
        client = await self.get_client(server_id)
        if not client:
            raise ValueError(f"Server {server_id} not found")
        
        if not client.is_connected:
            raise ValueError(f"Server {server_id} ({client.name}) is not connected")
        
        try:
            return await client.call_tool(tool_name, arguments)
        except (RuntimeError, ValueError) as e:
            error_str = str(e).lower()
            if "closed" in error_str or "not connected" in error_str:
                logger.warning(f"Connection to {client.name} was lost, attempting reconnect...")
                try:
                    await client.disconnect()
                    success = await client.connect()
                    if success:
                        return await client.call_tool(tool_name, arguments)
                except Exception as reconnect_error:
                    logger.error(f"Error during reconnection: {reconnect_error}", exc_info=True)
            
            logger.error(f"Error calling tool '{tool_name}' on server {server_id}: {e}", exc_info=True)
            raise
    
    async def get_resource(self, server_id: str, resource_uri: str) -> Optional[str]:
        """Get a resource from a specific server."""
        client = await self.get_client(server_id)
        if not client or not client.is_connected:
            return None
        
        return await client.get_resource(resource_uri)
    
    async def shutdown(self):
        """Shutdown all clients."""
        async with self._lock:
            clients_to_shutdown = list(self._clients.values())
            for client in clients_to_shutdown:
                try:
                    await client.disconnect()
                except Exception as e:
                    logger.error(f"Error disconnecting client {client.name}: {e}", exc_info=True)
            
            self._clients.clear()


def get_global_mcp_manager() -> MCPManager:
    """Get the global MCP manager instance."""
    return MCPManager()
