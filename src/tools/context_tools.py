"""Tools for the context agent."""

import json
import logging
from typing import Dict, Any, Optional

import httpx
from langchain_core.tools import tool, StructuredTool

from ..core import get_csv_memory
from ..utils import generate_csv_name
from ..mcp.langchain_adapter import get_global_mcp_client

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
            return f"Resource '{uri}' not found. Available resources may be listed via MCP server."
        
        blob = blobs[0]
        if blob.mimetype.startswith("text/"):
            return blob.as_string()
        else:
            return f"Resource '{uri}' is not text content (MIME type: {blob.mimetype})"
            
    except Exception as e:
        logger.error(f"Error reading MCP resource {uri}: {e}", exc_info=True)
        return f"Error reading resource '{uri}': {str(e)}"


read_mcp_resource = StructuredTool.from_function(
    coroutine=_read_mcp_resource_impl,
    name="read_mcp_resource",
    description=(
        "Read a resource (PRP/documentation) from an MCP server. "
        "MCP servers provide documentation resources that explain how to use their APIs. "
        "Use this tool to read documentation before constructing API calls. "
        "URI format: 'prp://<mcp_server>/<endpoint>'"
    ),
)


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
        read_mcp_resource,
        fetch_api_data,
    ]
