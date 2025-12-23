"""API routes for managing MCP servers."""

import logging
from typing import List, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from ..repositories import (
    create_mcp_server,
    delete_mcp_server,
    get_mcp_server,
    get_session_user,
    list_mcp_servers,
    update_mcp_server,
)
from ..mcp import MCPClient, MCPManager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/mcp", tags=["mcp"])


# Pydantic models
class MCPServerCreate(BaseModel):
    name: str
    server_type: str
    command: Optional[str] = None
    args: Optional[List[str]] = None
    env: Optional[dict] = None
    url: Optional[str] = None
    headers: Optional[dict] = None
    enabled: bool = True


class MCPServerUpdate(BaseModel):
    name: Optional[str] = None
    server_type: Optional[str] = None
    command: Optional[str] = None
    args: Optional[List[str]] = None
    env: Optional[dict] = None
    url: Optional[str] = None
    headers: Optional[dict] = None
    enabled: Optional[bool] = None


class MCPServerResponse(BaseModel):
    id: str
    user_id: int
    name: str
    server_type: str
    command: Optional[str] = None
    args: Optional[List[str]] = None
    env: Optional[dict] = None
    url: Optional[str] = None
    headers: Optional[dict] = None
    enabled: bool
    created_at: str


class MCPServerStatusResponse(MCPServerResponse):
    is_connected: bool


# Helper functions
def get_mcp_manager() -> MCPManager:
    """Get the global MCP manager instance."""
    from ..mcp import get_global_mcp_manager
    return get_global_mcp_manager()


def current_user(request: Request) -> dict:
    """Dependency to get current user from session cookie."""
    session_id = request.cookies.get("session_id")
    if not session_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user = get_session_user(session_id)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    return {"id": int(user["id"]), "email": user["email"], "name": user["name"]}


async def ensure_user_servers_connected(user_id: int) -> None:
    """Ensure all enabled MCP servers for a user are connected in MCPManager."""
    mcp_manager = get_mcp_manager()
    enabled_servers = list_mcp_servers(user_id, enabled_only=True)
    
    for server in enabled_servers:
        existing_client = await mcp_manager.get_client(server["id"])
        
        if not existing_client or not existing_client.is_connected:
            if existing_client:
                await mcp_manager.remove_client(server["id"])
            
            client = MCPClient(
                server_id=server["id"],
                server_type=server["server_type"],
                name=server["name"],
                command=server.get("command"),
                args=server.get("args"),
                env=server.get("env"),
                url=server.get("url"),
                headers=server.get("headers"),
            )
            
            success = await mcp_manager.add_client(client)
            if success:
                logger.info(f"Connected MCP server: {server['name']} ({server['id']})")
    
    connected_clients = await mcp_manager.list_clients()
    connected_server_ids = {client.server_id for client in connected_clients}
    enabled_server_ids = {server["id"] for server in enabled_servers}
    
    for server_id in connected_server_ids:
        if server_id not in enabled_server_ids:
            await mcp_manager.remove_client(server_id)
            logger.info(f"Disconnected MCP server: {server_id}")


# Routes
@router.get("/servers", response_model=List[MCPServerStatusResponse])
async def list_servers(user: dict = Depends(current_user)):
    """List all MCP servers with their connection status."""
    user_id = user["id"]
    await ensure_user_servers_connected(user_id)
    
    servers = list_mcp_servers(user_id)
    mcp_manager = get_mcp_manager()
    
    servers_with_status = []
    for server in servers:
        client = await mcp_manager.get_client(server["id"])
        is_connected = client.is_connected if client else False
        
        servers_with_status.append({
            **server,
            "is_connected": is_connected
        })
    
    return servers_with_status


@router.get("/servers/status", response_model=List[MCPServerStatusResponse])
async def list_servers_status(user: dict = Depends(current_user)):
    """List all MCP servers with their connection status (alias for /servers)."""
    return await list_servers(user)


@router.post("/servers", response_model=MCPServerResponse, status_code=201)
async def create_server(
    server_data: MCPServerCreate,
    user: dict = Depends(current_user),
):
    """Create a new MCP server configuration."""
    user_id = user["id"]
    server_id = str(uuid4())
    
    try:
        create_mcp_server(
            server_id=server_id,
            user_id=user_id,
            name=server_data.name,
            server_type=server_data.server_type,
            command=server_data.command,
            args=server_data.args,
            env=server_data.env,
            url=server_data.url,
            headers=server_data.headers,
            enabled=server_data.enabled,
        )
        
        await ensure_user_servers_connected(user_id)
        
        server = get_mcp_server(server_id, user_id)
        if not server:
            raise HTTPException(status_code=500, detail="Failed to create server")
        
        return server
    except Exception as e:
        logger.error(f"Error creating MCP server: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/servers/{server_id}", response_model=MCPServerResponse)
async def get_server(
    server_id: str,
    user: dict = Depends(current_user),
):
    """Get an MCP server configuration."""
    server = get_mcp_server(server_id, user["id"])
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
    return server


@router.put("/servers/{server_id}", response_model=MCPServerResponse)
async def update_server(
    server_id: str,
    server_data: MCPServerUpdate,
    user: dict = Depends(current_user),
):
    """Update an MCP server configuration."""
    user_id = user["id"]
    existing = get_mcp_server(server_id, user_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Server not found")
    
    try:
        update_mcp_server(
            server_id=server_id,
            user_id=user_id,
            name=server_data.name,
            server_type=server_data.server_type,
            command=server_data.command,
            args=server_data.args,
            env=server_data.env,
            url=server_data.url,
            headers=server_data.headers,
            enabled=server_data.enabled,
        )
        
        await ensure_user_servers_connected(user_id)
        
        updated = get_mcp_server(server_id, user_id)
        if not updated:
            raise HTTPException(status_code=500, detail="Failed to update server")
        
        return updated
    except Exception as e:
        logger.error(f"Error updating MCP server: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/servers/{server_id}", status_code=204)
async def delete_server(
    server_id: str,
    user: dict = Depends(current_user),
):
    """Delete an MCP server configuration."""
    user_id = user["id"]
    
    mcp_manager = get_mcp_manager()
    await mcp_manager.remove_client(server_id)
    
    deleted = delete_mcp_server(server_id, user_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Server not found")


@router.post("/servers/{server_id}/connect")
async def connect_server(
    server_id: str,
    user: dict = Depends(current_user),
):
    """Connect to an MCP server."""
    user_id = user["id"]
    server = get_mcp_server(server_id, user_id)
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
    
    if not server["enabled"]:
        raise HTTPException(status_code=400, detail="Server is disabled")
    
    try:
        mcp_manager = get_mcp_manager()
        
        existing_client = await mcp_manager.get_client(server_id)
        if existing_client:
            await mcp_manager.remove_client(server_id)
        
        client = MCPClient(
            server_id=server_id,
            server_type=server["server_type"],
            name=server["name"],
            command=server.get("command"),
            args=server.get("args"),
            env=server.get("env"),
            url=server.get("url"),
            headers=server.get("headers"),
        )
        
        success = await mcp_manager.add_client(client)
        
        if success:
            return {
                "status": "connected",
                "message": f"Successfully connected to {server['name']}",
                "server_id": server_id
            }
        else:
            return {
                "status": "failed",
                "message": f"Failed to connect to {server['name']}",
                "server_id": server_id
            }
    except Exception as e:
        logger.error(f"Error connecting to server {server_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Connection error: {str(e)}")


@router.get("/servers/{server_id}/tools")
async def list_server_tools(
    server_id: str,
    user: dict = Depends(current_user),
):
    """List tools available from an MCP server."""
    user_id = user["id"]
    server = get_mcp_server(server_id, user_id)
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
    
    await ensure_user_servers_connected(user_id)
    
    mcp_manager = get_mcp_manager()
    client = await mcp_manager.get_client(server_id)
    
    if not client or not client.is_connected:
        return {
            "tools": [],
            "status": "not_connected",
            "message": "Server is not connected. Use POST /api/mcp/servers/{server_id}/connect to connect."
        }
    
    try:
        tools = await client.list_tools()
        return {
            "tools": tools,
            "status": "connected",
            "count": len(tools),
            "server_name": server["name"]
        }
    except Exception as e:
        logger.error(f"Error listing tools from {server['name']}: {e}", exc_info=True)
        return {
            "tools": [],
            "status": "error",
            "error": str(e),
            "server_name": server["name"]
        }


@router.get("/servers/{server_id}/resources")
async def list_server_resources(
    server_id: str,
    user: dict = Depends(current_user),
):
    """List resources available from an MCP server."""
    user_id = user["id"]
    server = get_mcp_server(server_id, user_id)
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
    
    await ensure_user_servers_connected(user_id)
    
    mcp_manager = get_mcp_manager()
    client = await mcp_manager.get_client(server_id)
    
    if not client or not client.is_connected:
        return {
            "resources": [],
            "status": "not_connected",
            "message": "Server is not connected. Use POST /api/mcp/servers/{server_id}/connect to connect."
        }
    
    try:
        resources = await client.list_resources()
        return {
            "resources": resources,
            "status": "connected",
            "count": len(resources)
        }
    except Exception as e:
        logger.error(f"Error listing resources: {e}", exc_info=True)
        return {
            "resources": [],
            "status": "error",
            "error": str(e)
        }
