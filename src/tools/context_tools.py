"""Tools for the context agent."""

import json
import logging
from typing import Dict, Any, Optional

import httpx
from langchain_core.tools import tool, StructuredTool

from ..core import get_csv_memory
from ..utils import generate_csv_name
from ..mcp.langchain_adapter import get_global_mcp_client, get_mcp_server_names

logger = logging.getLogger(__name__)


async def _read_mcp_resource_impl(uri: str) -> str:
    """
    Implementation function for reading MCP resources.
    
    Args:
        uri: The resource URI in format 'prp://<mcp_server>/<endpoint>'
    
    Returns:
        The documentation content as a string
    """
    try:
        client = get_global_mcp_client()
        if not client:
            return "No MCP client available. MCP servers may not be connected."
        
        blobs = await client.get_resources(uris=[uri])
        
        if not blobs:
            return (
                f"Resource '{uri}' not found.\n\n"
                "IMPORTANT: Do not invent resource URIs. Instead:\n"
                "1. Use list_mcp_resources() FIRST to see all available resources and their URIs\n"
                "2. Copy the exact URI from list_mcp_resources() output\n"
                "3. Use that URI with read_mcp_resource() to read the documentation\n"
                "4. Also check available MCP tools - they are automatically loaded in your toolset\n"
                "5. Use MCP tools directly - they handle API calls correctly"
            )
        
        blob = blobs[0]
        if blob.mimetype.startswith("text/"):
            return blob.as_string()
        else:
            return f"Resource '{uri}' is not text content (MIME type: {blob.mimetype})"
            
    except Exception as e:
        error_str = str(e)
        error_repr = repr(e)
        combined_error = (error_str + " " + error_repr).lower()
        
        # Check for "Unknown resource" errors - this covers ExceptionGroup errors too
        if "unknown resource" in combined_error or "not found" in combined_error or "mcp error" in combined_error:
            logger.warning(f"Resource not found: {uri} - {error_str}")
            return (
                f"Resource '{uri}' not found.\n\n"
                "🚨 CRITICAL ERROR: You are trying to access a resource that does not exist.\n"
                "❌ STOP inventing resource URIs!\n\n"
                "✅ CORRECT APPROACH:\n"
                "1. Use list_mcp_resources() FIRST to see all available resources and their exact URIs\n"
                "2. Copy the URI from list_mcp_resources() output - use only URIs that were returned\n"
                "3. Then use read_mcp_resource() with that exact URI\n"
                "4. Also check available MCP tools - they are automatically loaded in your toolset\n"
                "5. Use MCP tools directly - they handle API calls correctly\n"
                "6. Do NOT guess or invent resource URIs - always use list_mcp_resources() first"
            )
        
        logger.error(f"Error reading MCP resource {uri}: {e}", exc_info=True)
        return (
            f"Error reading resource '{uri}': {error_str}\n\n"
            "⚠️ IMPORTANT: Use the MCP tools that are already available in your toolset instead of trying to read resources directly.\n"
            "MCP tools are automatically loaded and handle API calls correctly."
        )


read_mcp_resource = StructuredTool.from_function(
    coroutine=_read_mcp_resource_impl,
    name="read_mcp_resource",
    description=(
        "Read a resource (PRP/documentation) from an MCP server. "
        "Use list_mcp_resources() FIRST to discover available resources and their URIs. "
        "Then use this tool with a known resource URI to read the documentation."
    ),
)


@tool
async def list_mcp_resources() -> str:
    """
    List all available MCP resources (PRP/documentation) from connected MCP servers.
    
    This is the FIRST tool you should use when working with MCP servers. It shows you:
    - Which MCP servers are connected
    - What resources (documentation) are available from each server
    - The exact URIs you need to use with read_mcp_resource()
    
    Returns:
        A formatted list of all available resources with their URIs, names, and descriptions
    """
    try:
        client = get_global_mcp_client()
        if not client:
            return "No MCP client available. MCP servers may not be connected. Check your MCP server configuration."
        
        try:
            # Get server names from the client
            server_names = await get_mcp_server_names(client)
            logger.info(f"Found {len(server_names)} MCP servers: {server_names}")
            
            if not server_names:
                return "No MCP servers configured or available."
            
            all_resources = []
            for server_name in server_names:
                try:
                    async with client.session(server_name) as session:
                        result = await session.list_resources()
                        if hasattr(result, 'resources') and result.resources:
                            for resource in result.resources:
                                all_resources.append({
                                    'uri': str(resource.uri),
                                    'name': getattr(resource, 'name', None) or str(resource.uri).split('/')[-1],
                                    'description': getattr(resource, 'description', None) or '',
                                    'mime_type': getattr(resource, 'mimeType', 'text/markdown'),
                                    'server': server_name
                                })
                except Exception as e:
                    logger.debug(f"Could not list resources from server {server_name}: {e}")
                    continue
            
            if not all_resources:
                return (
                    "No resources returned from MCP servers.\n\n"
                    "This could mean:\n"
                    "1. The MCP servers don't expose resources (they may only provide tools)\n"
                    "2. The servers are not properly connected\n"
                    "3. The servers need to be configured to expose resources\n\n"
                    "**Alternative:** Check your available MCP tools - they are automatically loaded and handle API calls directly.\n"
                    "MCP tools are often more useful than resources for fetching data."
                )
            
            # Format the response
            result = f"Available MCP Resources ({len(all_resources)} total):\n\n"
            
            # Group resources by server
            resources_by_server = {}
            for resource_dict in all_resources:
                server_name = resource_dict.get('server', 'unknown')
                if server_name not in resources_by_server:
                    resources_by_server[server_name] = []
                resources_by_server[server_name].append(resource_dict)
            
            # Format output grouped by server
            for server_name, resources in resources_by_server.items():
                result += f"**Server: {server_name}** ({len(resources)} resources)\n\n"
                for res in resources:
                    result += f"- **URI**: `{res['uri']}`\n"
                    if res.get('name'):
                        result += f"  Name: {res['name']}\n"
                    if res.get('description'):
                        result += f"  Description: {res['description']}\n"
                    result += f"  Type: {res.get('mime_type', 'text/markdown')}\n"
                    result += "\n"
            
            result += "\n**How to use:**\n"
            result += "1. Copy the URI of a resource you want to read\n"
            result += "2. Use read_mcp_resource() with that URI to read the documentation\n"
            result += "3. Use the MCP tools (automatically loaded) to fetch actual data\n"
            
            return result
            
        except Exception as e:
            logger.error(f"Error listing MCP resources: {e}", exc_info=True)
            return f"Error listing resources: {str(e)}. The MCP servers may not be properly connected."
            
    except Exception as e:
        logger.error(f"Error in list_mcp_resources: {e}", exc_info=True)
        return f"Error: {str(e)}"


@tool
def fetch_api_data(url: str) -> str:
    """
    Fetch data from a specified API URL.
    
    This tool performs an HTTP GET request to the provided URL and returns the response content.
    The URL must be complete and properly formatted as specified in the API documentation.
    
    IMPORTANT: Before using this tool, read the API documentation using read_mcp_resource()
    to understand the exact URL format, base URL, required parameters, and valid parameter values.
    Construct the complete URL based on the documentation before calling this tool.
    
    Args:
        url: Complete API URL including protocol, domain, path, and all query parameters
             Example: 'https://api.example.com/v1/endpoint?param1=value1&param2=value2'
    
    Returns:
        Confirmation message with stored CSV name if CSV response detected, or API response content
    """
    try:
        logger.info(f"Fetching API data from: {url}")
        
        # Check if URL is valid
        if not url.startswith(("http://", "https://")):
            return f"Error: URL must start with 'http://' or 'https://'. Provided: {url}"
        
        # Check for existing CSV in cache
        csv_memory = get_csv_memory()
        csv_name = generate_csv_name(url, None)
        existing_csv = csv_memory.get_csv_data(csv_name)
        if existing_csv:
            return f"CSV data already exists in memory as '{csv_name}' from {url}"
        
        with httpx.Client() as client:
            response = client.get(url, timeout=30.0)
            response.raise_for_status()
            
            content_type = response.headers.get('content-type', '').lower()
            
            # Auto-detect and store CSV responses
            if content_type.startswith('text/csv') or (
                content_type.startswith('text/plain') and 
                ',' in response.text and 
                '\n' in response.text and
                response.text.count(',') > response.text.count('{')
            ):
                csv_memory = get_csv_memory()
                csv_name = generate_csv_name(url, None)
                csv_memory.store_csv_data(csv_name, response.text, "API")
                return f"CSV data fetched and stored as '{csv_name}' from {url}"
            
            # Handle JSON responses
            if content_type.startswith('application/json'):
                try:
                    data = response.json()
                    return f"API Response from {url}:\n\n{json.dumps(data, indent=2)}"
                except json.JSONDecodeError:
                    return f"API Response from {url}:\n\n{response.text}"
            
            # Handle other text responses
            if content_type.startswith('text/'):
                return f"API Response from {url}:\n\n{response.text}"
            
            # Handle binary or unknown content types
            return f"API Response from {url} (Content-Type: {content_type}, Size: {len(response.content)} bytes)"
                
    except httpx.HTTPStatusError as e:
        return f"HTTP Error {e.response.status_code} when fetching {url}: {e.response.text}"
    except httpx.TimeoutException:
        return f"Timeout error when fetching {url}. The request took too long."
    except Exception as e:
        logger.error(f"Error fetching data from {url}: {str(e)}")
        return f"Error fetching data from {url}: {str(e)}"


def get_context_tools():
    """Get all context tools."""
    return [
        list_mcp_resources,
        read_mcp_resource,
        fetch_api_data,
    ]
