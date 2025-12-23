"""CSV utility functions."""

from typing import Dict, Any, Optional


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
