"""Tools for the analysis agent."""

import logging
import os
import time
import base64
from typing import Optional

from langchain_core.tools import tool

from ..config import get_settings
from ..services.memory import get_csv_memory
from ..services import E2BPythonREPL, get_or_create_e2b_sandbox, cleanup_e2b_sandbox

logger = logging.getLogger(__name__)

# Global context for E2B API key (set per user request)
_e2b_api_key_context: Optional[str] = None

def set_e2b_api_key_context(e2b_api_key: Optional[str]) -> None:
    """Set the E2B API key for the current execution context."""
    global _e2b_api_key_context
    _e2b_api_key_context = e2b_api_key

def get_e2b_api_key_context() -> Optional[str]:
    """Get the E2B API key from the current execution context."""
    return _e2b_api_key_context



@tool
def analyze_data_with_pandas(python_code: str, csv_names: Optional[str] = None) -> str:
    """
    Execute Python code for data analysis in E2B sandbox with CSV files available.
    
    CSV files are uploaded to the sandbox filesystem at /data/<filename>.
    Use pandas normally to read and analyze the data.
    
    Args:
        python_code: Python code to execute (pandas, numpy, matplotlib, seaborn, scipy available)
        csv_names: Comma-separated CSV names to load (loads all if None)
        
    Returns:
        Execution results including output and plots
    """
    try:
        logger.info(f"Executing Python code in E2B sandbox...")
        logger.info(f"Code: {python_code[:200]}...")
        
        csv_memory = get_csv_memory()
        available_csvs = csv_memory.list_available_csvs()
        
        if "message" in available_csvs:
            return "No CSV datasets available."
        
        available_names = list(available_csvs["available_datasets"].keys())
        
        if csv_names:
            csv_list = [name.strip() for name in csv_names.split(',')]
            csv_list = [name for name in csv_list if name in available_names]
        else:
            csv_list = available_names
        
        if not csv_list:
            return "No valid CSV names available."
        
        try:
            # Get E2B API key from context (set by agent) - required, no fallback
            e2b_api_key = get_e2b_api_key_context()
            sandbox, loaded_csvs = get_or_create_e2b_sandbox(csv_list, csv_memory, e2b_api_key=e2b_api_key)
        except Exception as e:
            logger.error(f"Failed to create E2B sandbox: {e}")
            return f"Sandbox error: {str(e)}"
        
        e2b_repl = E2BPythonREPL(sandbox, loaded_csvs)
        result = e2b_repl.run(python_code)
        
        csv_files = ", ".join(loaded_csvs)
        return f"CSV files loaded: {csv_files}\n\n{result}"
        
    except Exception as e:
        logger.error(f"E2B analysis error: {str(e)}")
        cleanup_e2b_sandbox()
        return f"Analysis error: {str(e)}"


@tool
def debug_csv_storage() -> str:
    """
    Debug tool to check the current state of CSV storage and cache performance.
    This helps diagnose issues with data sharing between agents and cache efficiency.
    """
    try:
        result = "CSV STORAGE DEBUG\n\n"
        
        csv_memory = get_csv_memory()
        csv_data = csv_memory.load_csv_memory().get("csv_data", {})
        result += f"Persistent CSV storage: {len(csv_data)} items\n"
        for name, data in csv_data.items():
            result += f"  - {name}\n"
        
        result += f"\nCache status:\n"
        result += f"  - Cache enabled: {csv_memory._cache is not None}\n"
        result += f"  - Cache timestamp: {csv_memory._cache_timestamp}\n"
        result += f"  - Cache size: {len(csv_memory._cache.get('csv_data', {})) if csv_memory._cache else 0} items\n"
        
        return result
        
    except Exception as e:
        logger.error(f"Error in debug_csv_storage: {str(e)}")
        return f"Error: {str(e)}"


@tool
def list_available_data() -> str:
    """
    List all available CSV data sources for analysis.
    This provides a comprehensive view of what data is available.
    """
    try:
        csv_memory = get_csv_memory()
        csv_data = csv_memory.load_csv_memory().get("csv_data", {})
        
        if not csv_data:
            return "No CSV data available"
        
        result = f"Available datasets ({len(csv_data)}):\n"
        for name in csv_data.keys():
            result += f"  - {name}\n"
        
        return result
        
    except Exception as e:
        logger.error(f"Error listing available data: {str(e)}")
        return f"Error listing available data: {str(e)}"


@tool
def quick_data_check() -> str:
    """
    Quick check to see if any data is available for analysis.
    Returns a simple yes/no answer to avoid verbose output.
    """
    try:
        csv_memory = get_csv_memory()
        csv_data = csv_memory.load_csv_memory().get("csv_data", {})
        
        if csv_data:
            return f"{len(csv_data)} dataset(s) available"
        else:
            return "No datasets available. Please fetch data first."
        
    except Exception as e:
        logger.error(f"Error in quick data check: {str(e)}")
        return f"Error checking data: {str(e)}"


@tool
def clear_csv_cache() -> str:
    """
    Clear the CSV memory cache to force reload from disk.
    Useful for debugging or when data has been updated externally.
    """
    try:
        csv_memory = get_csv_memory()
        csv_memory.invalidate_cache()
        return "CSV memory cache cleared successfully"
        
    except Exception as e:
        logger.error(f"Error clearing CSV cache: {str(e)}")
        return f"Error clearing cache: {str(e)}"


@tool
def cleanup_e2b_sandbox_tool() -> str:
    """
    Clean up and close the E2B sandbox.
    Use this when you're done with analysis or if you need to reset the sandbox.
    """
    try:
        cleanup_e2b_sandbox()
        return "E2B sandbox cleaned up successfully"
    except Exception as e:
        logger.error(f"Error cleaning up E2B sandbox: {str(e)}")
        return f"Error cleaning up sandbox: {str(e)}"


def get_analysis_tools():
    """Get all analysis tools."""
    return [
        analyze_data_with_pandas,
        quick_data_check,
        list_available_data,
        debug_csv_storage,
        clear_csv_cache,
        cleanup_e2b_sandbox_tool
    ]
