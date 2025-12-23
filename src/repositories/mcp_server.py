"""Repository for MCP server configuration management."""

import json
from datetime import datetime
from typing import Dict, List, Optional

from .base import _connect


def create_mcp_server(
    server_id: str,
    user_id: int,
    name: str,
    server_type: str,
    command: Optional[str] = None,
    args: Optional[List[str]] = None,
    env: Optional[Dict[str, str]] = None,
    url: Optional[str] = None,
    headers: Optional[Dict[str, str]] = None,
    enabled: bool = True,
) -> None:
    """
    Create a new MCP server configuration.
    
    Args:
        server_id: Unique server identifier
        user_id: Owner user ID
        name: Server display name
        server_type: Server type ("stdio" or "sse")
        command: Command to execute (for stdio servers)
        args: Command arguments (for stdio servers)
        env: Environment variables (for stdio servers)
        url: Server URL (for SSE servers)
        headers: HTTP headers (for SSE servers)
        enabled: Whether server is enabled (default: True)
    """
    now = datetime.utcnow().isoformat()
    
    with _connect() as conn:
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO mcp_servers 
            (id, user_id, name, server_type, command, args, env, url, headers, enabled, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                server_id,
                user_id,
                name,
                server_type,
                command,
                json.dumps(args) if args else None,
                json.dumps(env) if env else None,
                url,
                json.dumps(headers) if headers else None,
                1 if enabled else 0,
                now,
            ),
        )
        conn.commit()


def get_mcp_server(server_id: str, user_id: int) -> Optional[Dict]:
    """
    Get an MCP server configuration.
    
    Args:
        server_id: Server identifier
        user_id: Owner user ID
        
    Returns:
        Server configuration dictionary or None if not found
    """
    with _connect() as conn:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT id, user_id, name, server_type, command, args, env, url, headers, enabled, created_at
            FROM mcp_servers
            WHERE id = ? AND user_id = ?
            """,
            (server_id, user_id),
        )
        row = cur.fetchone()
        if row:
            return {
                "id": row["id"],
                "user_id": row["user_id"],
                "name": row["name"],
                "server_type": row["server_type"],
                "command": row["command"],
                "args": json.loads(row["args"]) if row["args"] else None,
                "env": json.loads(row["env"]) if row["env"] else None,
                "url": row["url"],
                "headers": json.loads(row["headers"]) if row["headers"] else None,
                "enabled": bool(row["enabled"]),
                "created_at": row["created_at"],
            }
        return None


def list_mcp_servers(user_id: int, enabled_only: bool = False) -> List[Dict]:
    """
    List all MCP servers for a user.
    
    Args:
        user_id: Owner user ID
        enabled_only: If True, only return enabled servers
        
    Returns:
        List of server configuration dictionaries
    """
    with _connect() as conn:
        cur = conn.cursor()
        if enabled_only:
            cur.execute(
                """
                SELECT id, user_id, name, server_type, command, args, env, url, headers, enabled, created_at
                FROM mcp_servers
                WHERE user_id = ? AND enabled = 1
                ORDER BY created_at DESC
                """,
                (user_id,),
            )
        else:
            cur.execute(
                """
                SELECT id, user_id, name, server_type, command, args, env, url, headers, enabled, created_at
                FROM mcp_servers
                WHERE user_id = ?
                ORDER BY created_at DESC
                """,
                (user_id,),
            )
        rows = cur.fetchall()
        return [
            {
                "id": row["id"],
                "user_id": row["user_id"],
                "name": row["name"],
                "server_type": row["server_type"],
                "command": row["command"],
                "args": json.loads(row["args"]) if row["args"] else None,
                "env": json.loads(row["env"]) if row["env"] else None,
                "url": row["url"],
                "headers": json.loads(row["headers"]) if row["headers"] else None,
                "enabled": bool(row["enabled"]),
                "created_at": row["created_at"],
            }
            for row in rows
        ]


def update_mcp_server(
    server_id: str,
    user_id: int,
    name: Optional[str] = None,
    server_type: Optional[str] = None,
    command: Optional[str] = None,
    args: Optional[List[str]] = None,
    env: Optional[Dict[str, str]] = None,
    url: Optional[str] = None,
    headers: Optional[Dict[str, str]] = None,
    enabled: Optional[bool] = None,
) -> bool:
    """
    Update an MCP server configuration (partial update).
    
    Args:
        server_id: Server identifier
        user_id: Owner user ID
        name: New server name (optional)
        server_type: New server type (optional)
        command: New command (optional)
        args: New arguments (optional)
        env: New environment variables (optional)
        url: New URL (optional)
        headers: New headers (optional)
        enabled: New enabled status (optional)
        
    Returns:
        True if update was successful, False if no changes were made
    """
    updates = []
    values = []
    
    if name is not None:
        updates.append("name = ?")
        values.append(name)
    if server_type is not None:
        updates.append("server_type = ?")
        values.append(server_type)
    if command is not None:
        updates.append("command = ?")
        values.append(command)
    if args is not None:
        updates.append("args = ?")
        values.append(json.dumps(args))
    if env is not None:
        updates.append("env = ?")
        values.append(json.dumps(env))
    if url is not None:
        updates.append("url = ?")
        values.append(url)
    if headers is not None:
        updates.append("headers = ?")
        values.append(json.dumps(headers))
    if enabled is not None:
        updates.append("enabled = ?")
        values.append(1 if enabled else 0)
    
    if not updates:
        return False
    
    values.extend([server_id, user_id])
    
    with _connect() as conn:
        cur = conn.cursor()
        cur.execute(
            f"""
            UPDATE mcp_servers
            SET {', '.join(updates)}
            WHERE id = ? AND user_id = ?
            """,
            values,
        )
        conn.commit()
        return cur.rowcount > 0


def delete_mcp_server(server_id: str, user_id: int) -> bool:
    """
    Delete an MCP server configuration.
    
    Args:
        server_id: Server identifier
        user_id: Owner user ID
        
    Returns:
        True if deletion was successful, False if server not found
    """
    with _connect() as conn:
        cur = conn.cursor()
        cur.execute(
            "DELETE FROM mcp_servers WHERE id = ? AND user_id = ?",
            (server_id, user_id),
        )
        conn.commit()
        return cur.rowcount > 0

