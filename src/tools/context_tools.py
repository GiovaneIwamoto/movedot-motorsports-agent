"""Tools for the context agent."""

import json
import csv
import io
import logging
from typing import Dict, Any, Optional, List

import httpx
from langchain_core.tools import tool, StructuredTool

from ..core import get_csv_memory
from ..utils import generate_csv_name
from ..mcp.langchain_adapter import get_global_mcp_client, get_mcp_server_names

logger = logging.getLogger(__name__)


def _json_to_csv(json_data: Any) -> Optional[str]:
    """
    Convert JSON data to CSV format.
    
    Args:
        json_data: JSON data (list of dicts or single dict)
        
    Returns:
        CSV string or None if conversion fails
    """
    try:
        # Handle single dict - wrap in list
        if isinstance(json_data, dict):
            json_data = [json_data]
        
        # Must be a list
        if not isinstance(json_data, list):
            logger.warning(f"Cannot convert JSON to CSV: expected list or dict, got {type(json_data)}")
            return None
        
        # Empty list
        if len(json_data) == 0:
            logger.warning("Cannot convert empty JSON array to CSV")
            return None
        
        # Get all keys from all objects to handle inconsistent schemas
        all_keys = set()
        for item in json_data:
            if isinstance(item, dict):
                all_keys.update(item.keys())
        
        if not all_keys:
            logger.warning("No keys found in JSON objects")
            return None
        
        # Sort keys for consistent column order
        fieldnames = sorted(list(all_keys))
        
        # Create CSV in memory
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=fieldnames, extrasaction='ignore')
        writer.writeheader()
        
        # Write rows
        for item in json_data:
            if isinstance(item, dict):
                writer.writerow(item)
        
        csv_content = output.getvalue()
        logger.info(f"Converted JSON to CSV: {len(json_data)} rows, {len(fieldnames)} columns")
        return csv_content
        
    except Exception as e:
        logger.error(f"Error converting JSON to CSV: {e}")
        return None


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
            return "No MCP client available."
        
        blobs = await client.get_resources(uris=[uri])
        
        if not blobs:
            return f"Resource '{uri}' not found. Use list_mcp_resources() to see available URIs."
        
        blob = blobs[0]
        if blob.mimetype.startswith("text/"):
            return blob.as_string()
        else:
            return f"Resource '{uri}' is not text content (MIME type: {blob.mimetype})"
            
    except Exception as e:
        error_str = str(e)
        error_repr = repr(e)
        combined_error = (error_str + " " + error_repr).lower()
        
        if "unknown resource" in combined_error or "not found" in combined_error or "mcp error" in combined_error:
            logger.warning(f"Resource not found: {uri} - {error_str}")
            return f"Resource '{uri}' not found."
        
        logger.error(f"Error reading MCP resource {uri}: {e}", exc_info=True)
        return f"Error reading resource '{uri}': {error_str}"


read_mcp_resource = StructuredTool.from_function(
    coroutine=_read_mcp_resource_impl,
    name="read_mcp_resource",
    description="Read documentation from an MCP resource using its URI.",
)


@tool
async def list_mcp_resources() -> str:
    """List all available MCP resources with URIs, names, and descriptions."""
    try:
        client = get_global_mcp_client()
        if not client:
            return "No MCP client available. MCP servers may not be connected. Check your MCP server configuration."
        
        try:
            server_names = await get_mcp_server_names(client)
            logger.info(f"Found {len(server_names)} MCP servers: {server_names}")
            
            if not server_names:
                return "No MCP servers available."
            
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
                return "No resources available from MCP servers."
            
            result = f"Available MCP Resources ({len(all_resources)} total):\n\n"
            
            resources_by_server = {}
            for resource_dict in all_resources:
                server_name = resource_dict.get('server', 'unknown')
                if server_name not in resources_by_server:
                    resources_by_server[server_name] = []
                resources_by_server[server_name].append(resource_dict)
            
            for server_name, resources in resources_by_server.items():
                result += f"Server: {server_name} ({len(resources)} resources)\n"
                for res in resources:
                    result += f"  - URI: {res['uri']}\n"
                    if res.get('name'):
                        result += f"    Name: {res['name']}\n"
                    if res.get('description'):
                        result += f"    Description: {res['description']}\n"
                result += "\n"
            
            return result
            
        except Exception as e:
            logger.error(f"Error listing MCP resources: {e}", exc_info=True)
            return f"Error listing resources: {str(e)}"
            
    except Exception as e:
        logger.error(f"Error in list_mcp_resources: {e}", exc_info=True)
        return f"Error: {str(e)}"


@tool
def fetch_api_data(url: str) -> str:
    """
    Fetch data from an API URL via HTTP GET request.
    Automatically converts JSON arrays to CSV format and stores them.
    
    Args:
        url: Complete API URL with query parameters
    
    Returns:
        Confirmation message if data was stored, or raw response for non-tabular data
    """
    try:
        logger.info(f"Fetching API data from: {url}")
        
        if not url.startswith(("http://", "https://")):
            return f"Error: Invalid URL protocol. Provided: {url}"
        
        csv_memory = get_csv_memory()
        csv_name = generate_csv_name(url, None)
        existing_csv = csv_memory.get_csv_data(csv_name)
        if existing_csv:
            return f"✓ Data already cached as '{csv_name}'. Use analyze_data_with_pandas() to work with it."
        
        with httpx.Client() as client:
            response = client.get(url, timeout=30.0)
            response.raise_for_status()
            
            content_type = response.headers.get('content-type', '').lower()
            
            # Handle CSV content
            if content_type.startswith('text/csv') or (
                content_type.startswith('text/plain') and 
                ',' in response.text and 
                '\n' in response.text and
                response.text.count(',') > response.text.count('{')
            ):
                csv_memory.store_csv_data(csv_name, response.text, "API")
                return f"✓ CSV data stored as '{csv_name}'. Dataset is ready for analysis."
            
            # Handle JSON content
            if content_type.startswith('application/json'):
                try:
                    data = response.json()
                    
                    # Try to convert JSON to CSV if it's a list or dict
                    if isinstance(data, (list, dict)):
                        csv_content = _json_to_csv(data)
                        
                        if csv_content:
                            # Successfully converted to CSV
                            csv_memory.store_csv_data(csv_name, csv_content, "API")
                            
                            # Count rows for user feedback
                            row_count = len(data) if isinstance(data, list) else 1
                            return f"✓ JSON data converted to CSV and stored as '{csv_name}'. Dataset contains {row_count} records and is ready for analysis."
                        else:
                            # Couldn't convert to CSV, return JSON
                            logger.warning(f"Could not convert JSON to CSV for {url}")
                            return f"⚠ Received JSON data but could not convert to CSV format:\n{json.dumps(data, indent=2)[:500]}..."
                    else:
                        # Not a list or dict, just return the JSON
                        return f"Received non-tabular JSON data:\n{json.dumps(data, indent=2)}"
                        
                except json.JSONDecodeError as e:
                    logger.error(f"Failed to parse JSON from {url}: {e}")
                    return f"Error: Invalid JSON response: {str(e)}"
            
            # Handle other text content
            if content_type.startswith('text/'):
                return f"Received text response ({len(response.text)} characters):\n{response.text[:500]}..."
            
            # Binary content
            return f"Binary response ({content_type}, {len(response.content)} bytes)"
                
    except httpx.HTTPStatusError as e:
        return f"HTTP Error {e.response.status_code}: {e.response.text[:200]}"
    except httpx.TimeoutException:
        return "Request timeout (30s). The API may be slow or unavailable."
    except Exception as e:
        logger.error(f"Error fetching data from {url}: {str(e)}")
        return f"Error: {str(e)}"


def get_context_tools():
    """Get all context tools."""
    return [
        list_mcp_resources,
        read_mcp_resource,
        fetch_api_data,
    ]
