"""Tools for the context agent."""

import json
import os
import logging
from typing import Dict, Any, Optional
from pathlib import Path
from io import StringIO

import httpx
import pandas as pd
from langchain_core.tools import tool

from ..config import get_settings
from ..utils import get_csv_memory

logger = logging.getLogger(__name__)


@tool
def load_product_requirement_prompt() -> str:
    """
    Load the product requirement prompt content from the repository.
    This file contains authoritative, detailed guidance on how to use the OpenF1 API.
    ALWAYS read this before constructing any API fetch.
    """
    try:
        # Resolve path: src/tools -> src -> prompt/product_requirement_prompt.txt
        this_file = Path(__file__).resolve()
        product_prompt_path = this_file.parents[1] / "prompt" / "product_requirement_prompt.txt"

        if not product_prompt_path.exists():
            return f"Product requirement prompt not found at: {product_prompt_path}"

        with open(product_prompt_path, "r", encoding="utf-8") as f:
            content = f.read()

        if not content.strip():
            return "Product requirement prompt file is empty."

        return content
    except Exception as e:
        logger.error(f"Error loading product requirement prompt: {str(e)}")
        return f"Error loading product requirement prompt: {str(e)}"

def generate_csv_name(endpoint: str, parameters: Optional[Dict[str, Any]] = None) -> str:
    """Generate a CSV name based on endpoint and all parameters (including URL filters)"""
    # Extract endpoint type (e.g., 'laps', 'sessions', 'drivers')
    endpoint_clean = endpoint.split('?')[0].split('/')[-1] if endpoint else "data"
    
    # Extract all parameters from URL and combine with passed parameters
    all_params = {}
    
    # Parse URL parameters
    if '?' in endpoint:
        url_params = endpoint.split('?')[1]
        for param in url_params.split('&'):
            if '=' in param:
                key, value = param.split('=', 1)
                if key != 'csv':  # Skip csv parameter
                    all_params[key] = value
    
    # Add passed parameters (overriding URL params if same key)
    if parameters:
        for key, value in parameters.items():
            if key != 'csv':  # Skip csv parameter
                all_params[key] = value
    
    # Create suffix from all parameters
    param_suffix = ""
    if all_params:
        param_parts = []
        for key, value in sorted(all_params.items()):
            # Clean parameter values for filename
            clean_value = str(value).replace('=', '').replace('&', '').replace('?', '').replace('<', 'lt').replace('>', 'gt')
            param_parts.append(f"{key}_{clean_value}")
        if param_parts:
            param_suffix = "_" + "_".join(param_parts)
    
    return f"openf1_{endpoint_clean}{param_suffix}.csv"


@tool
def fetch_api_data(endpoint: str, parameters: Optional[Dict[str, Any]] = None) -> str:
    """
    Fetch data from a specified API endpoint.
    This tool constructs the request URL with optional parameters, 
    performs an HTTP GET request, and returns the response content.
    For OpenF1 API endpoints, automatically requests CSV format and stores in memory.
    """
    try:
        # Check if this is an OpenF1 API endpoint (either full URL or partial path)
        is_openf1 = "api.openf1.org" in endpoint or not endpoint.startswith(("http://", "https://"))
        
        # If it's a partial OpenF1 endpoint, construct the full URL
        if is_openf1 and not endpoint.startswith(("http://", "https://")):
            # Remove leading slash if present
            endpoint = endpoint.lstrip("/")
            # Construct full OpenF1 API URL
            endpoint = f"https://api.openf1.org/v1/{endpoint}"
        
        if parameters:
            # Convert parameters to query string
            param_strings = []
            for key, value in parameters.items():
                param_strings.append(f"{key}={value}")
            if param_strings:
                endpoint += "?" + "&".join(param_strings)
        
        # For OpenF1 API, automatically append csv=true parameter (only if not already present)
        if is_openf1 and "csv=true" not in endpoint:
            separator = "&" if "?" in endpoint else "?"
            endpoint += f"{separator}csv=true"
        
        # For OpenF1 API, check if CSV already exists before making request
        if is_openf1:
            csv_memory = get_csv_memory()
            csv_name = generate_csv_name(endpoint, parameters)
            existing_csv = csv_memory.get_csv_data(csv_name)
            if existing_csv:
                return f"CSV data already exists in memory as '{csv_name}' from {endpoint}\n\nData preview (first 5 lines):\n{existing_csv.split(chr(10))[:5]}\n\nNo new API call needed - using cached data."
        
        # Make the HTTP request
        with httpx.Client() as client:
            response = client.get(endpoint, timeout=30.0)
            response.raise_for_status()
            
            # For OpenF1 CSV responses, store in memory and return confirmation
            if is_openf1 and response.headers.get('content-type', '').startswith('text/csv'):
                # Generate CSV name based on endpoint (including all filters)
                csv_memory = get_csv_memory()
                csv_name = generate_csv_name(endpoint, parameters)
                csv_memory.store_csv_data(csv_name, response.text, "OpenF1")
                return f"CSV data fetched and stored as '{csv_name}' from {endpoint}\n\nData preview (first 5 lines):\n{response.text.split(chr(10))[:5]}"
            
            # For other APIs, try JSON first, then fall back to text
            try:
                data = response.json()
                return f"API Response from {endpoint}:\n\n{json.dumps(data, indent=2)}"
            except json.JSONDecodeError:
                return f"API Response from {endpoint}:\n\n{response.text}"
                
    except httpx.HTTPStatusError as e:
        return f"HTTP Error {e.response.status_code} when fetching {endpoint}: {e.response.text}"
    except httpx.TimeoutException:
        return f"Timeout error when fetching {endpoint}. The request took too long."
    except Exception as e:
        logger.error(f"Error fetching data from {endpoint}: {str(e)}")
        return f"Error fetching data from {endpoint}: {str(e)}"

def get_context_tools():
    """Get all context agent tools."""
    return [
        load_product_requirement_prompt,
        fetch_api_data,
    ]
