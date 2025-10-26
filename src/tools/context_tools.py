"""Tools for the context agent."""

import json
import logging
from typing import Dict, Any, Optional
from pathlib import Path

import httpx
import pandas as pd
from langchain_core.tools import tool

from ..config import get_settings
from ..core import get_csv_memory
from ..utils import generate_csv_name

logger = logging.getLogger(__name__)


def _load_endpoint_documentation(endpoint_name: str) -> str:
    """Helper function to load endpoint-specific documentation."""
    try:
        this_file = Path(__file__).resolve()
        doc_path = this_file.parents[1] / "docs" / f"prp_{endpoint_name}.md"
        
        if not doc_path.exists():
            return f"Documentation for {endpoint_name} not found at: {doc_path}"
        
        with open(doc_path, "r", encoding="utf-8") as f:
            content = f.read()
        
        if not content.strip():
            return f"Documentation file for {endpoint_name} is empty."
        
        return content
    except Exception as e:
        logger.error(f"Error loading {endpoint_name} documentation: {str(e)}")
        return f"Error loading {endpoint_name} documentation: {str(e)}"


@tool
def get_meetings_documentation() -> str:
    """Get detailed documentation for meetings endpoint (Grand Prix events)."""
    return _load_endpoint_documentation("meetings")


@tool
def get_sessions_documentation() -> str:
    """Get detailed documentation for sessions endpoint (Practice, Qualifying, Race)."""
    return _load_endpoint_documentation("sessions")


@tool
def get_drivers_documentation() -> str:
    """Get detailed documentation for drivers endpoint (driver information)."""
    return _load_endpoint_documentation("drivers")


@tool
def get_car_data_documentation() -> str:
    """Get detailed documentation for car_data endpoint (telemetry data)."""
    return _load_endpoint_documentation("car_data")


@tool
def get_laps_documentation() -> str:
    """Get detailed documentation for laps endpoint (lap-by-lap performance)."""
    return _load_endpoint_documentation("laps")


@tool
def get_positions_documentation() -> str:
    """Get detailed documentation for position endpoint (track positions)."""
    return _load_endpoint_documentation("positions")


@tool
def get_pit_stops_documentation() -> str:
    """Get detailed documentation for pit endpoint (pit stop information)."""
    return _load_endpoint_documentation("pit_stops")


@tool
def get_intervals_documentation() -> str:
    """Get detailed documentation for intervals endpoint (time gaps between cars)."""
    return _load_endpoint_documentation("intervals")


@tool
def get_stints_documentation() -> str:
    """Get detailed documentation for stints endpoint (tire strategy)."""
    return _load_endpoint_documentation("stints")


@tool
def get_weather_documentation() -> str:
    """Get detailed documentation for weather endpoint (track conditions)."""
    return _load_endpoint_documentation("weather")


@tool
def get_race_control_documentation() -> str:
    """Get detailed documentation for race_control endpoint (flags, incidents)."""
    return _load_endpoint_documentation("race_control")


@tool
def get_team_radio_documentation() -> str:
    """Get detailed documentation for team_radio endpoint (driver-team communications)."""
    return _load_endpoint_documentation("team_radio")


@tool
def fetch_api_data(endpoint: str, parameters: Optional[Dict[str, Any]] = None) -> str:
    """
    Fetch data from a specified API endpoint.
    This tool constructs the request URL with optional parameters, 
    performs an HTTP GET request, and returns the response content.
    For OpenF1 API endpoints, automatically requests CSV format and stores in memory.
    """
    try:
        logger.info(f"Fetching API data from: {endpoint}")
        if parameters:
            logger.info(f"With parameters: {parameters}")
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
                return f"CSV data already exists in memory as '{csv_name}' from {endpoint}"
        
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
                return f"CSV data fetched and stored as '{csv_name}' from {endpoint}"
            
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
    """Get all context tools."""
    return [
        # Documentation tools
        get_meetings_documentation,
        get_sessions_documentation,
        get_drivers_documentation,
        get_car_data_documentation,
        get_laps_documentation,
        get_positions_documentation,
        get_pit_stops_documentation,
        get_intervals_documentation,
        get_stints_documentation,
        get_weather_documentation,
        get_race_control_documentation,
        get_team_radio_documentation,
        # API tools
        fetch_api_data,
    ]
