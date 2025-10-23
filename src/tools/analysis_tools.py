"""Tools for the analysis agent."""

import logging
import os
import time
import base64
from typing import Optional

from langchain_core.tools import tool

from ..config import get_settings
from ..core import get_csv_memory
from ..services import E2BPythonREPL, get_or_create_e2b_sandbox, cleanup_e2b_sandbox

logger = logging.getLogger(__name__)



@tool
def analyze_data_with_pandas(python_code: str, csv_names: Optional[str] = None) -> str:
    """
    Execute Python code for data analysis in E2B sandbox with CSV files available.
    
    CSV files are uploaded to the sandbox filesystem at /data/<filename>.
    Use pandas normally to read and analyze the data.
    
    Args:
        python_code: Python code to execute for data analysis.
                    CSV files are available at /data/ directory.
                    Example: "df = pd.read_csv('/data/openf1_sessions.csv'); df.head()"
        csv_names: Optional comma-separated list of specific CSVs to load into sandbox.
                   If None, loads all available CSVs.
        
    Returns:
        Results of code execution including output, plots, and any errors.
        The response will list which CSV files are available in the sandbox.
        
    Examples:
        - analyze_data_with_pandas("import pandas as pd; df = pd.read_csv('/data/openf1_sessions_meeting_key_1224.csv'); df.head()")
        - analyze_data_with_pandas("import pandas as pd; df = pd.read_csv('/data/openf1_laps.csv'); df['lap_duration'].mean()")
        - analyze_data_with_pandas("import pandas as pd; import matplotlib.pyplot as plt; df = pd.read_csv('/data/openf1_laps.csv'); plt.hist(df['lap_duration']); plt.show()")
        
    Available libraries: pandas, numpy, matplotlib, seaborn, scipy
    """
    try:
        logger.info(f"Executing Python code in E2B sandbox...")
        logger.info(f"Code: {python_code[:200]}...")
        
        # Get list of available CSVs
        csv_memory = get_csv_memory()
        available_csvs = csv_memory.list_available_csvs()
        
        if "message" in available_csvs:
            return "No CSV datasets available. Please fetch some data from OpenF1 API first."
        
        # Get available CSV names
        available_names = list(available_csvs["available_datasets"].keys())
        
        # Determine which CSVs to analyze
        if csv_names:
            csv_list = [name.strip() for name in csv_names.split(',')]
            csv_list = [name for name in csv_list if name in available_names]
        else:
            csv_list = available_names
        
        if not csv_list:
            return "No valid CSV names provided or no CSVs available."
        
        # Get or create E2B sandbox with CSVs uploaded to filesystem
        try:
            sandbox, loaded_csvs = get_or_create_e2b_sandbox(csv_list, csv_memory)
        except Exception as e:
            logger.error(f"Failed to create E2B sandbox: {e}")
            return f"E2B sandbox error: {str(e)}. Make sure E2B_API_KEY is configured."
        
        # Execute code in E2B sandbox
        e2b_repl = E2BPythonREPL(sandbox, loaded_csvs)  # Pass CSV names for reference
        result = e2b_repl.run(python_code)
        
        # Return result with clear CSV file listing
        csv_files_list = "\n".join([f"  • /data/{csv}" for csv in loaded_csvs])
        return f"""
Available CSV files ({len(loaded_csvs)}):
{csv_files_list}

Result:
{result}"""
        
    except Exception as e:
        logger.error(f"E2B analysis error: {str(e)}")
        # Cleanup sandbox on error
        cleanup_e2b_sandbox()
        return f"E2B analysis error: {str(e)}"


@tool
def debug_csv_storage() -> str:
    """
    Debug tool to check the current state of CSV storage and cache performance.
    This helps diagnose issues with data sharing between agents and cache efficiency.
    """
    try:
        result = "CSV STORAGE DEBUG\n\n"
        
        # Check persistent storage
        csv_memory = get_csv_memory()
        csv_data = csv_memory.load_csv_memory().get("csv_data", {})
        result += f"Persistent CSV storage: {len(csv_data)} items\n"
        for name, data in csv_data.items():
            result += f"  - {name}: {data['size']} chars, source: {data['source']}\n"
        
        # Check cache status
        result += f"\nCache status:\n"
        result += f"  - Cache enabled: {csv_memory._cache is not None}\n"
        result += f"  - Cache timestamp: {csv_memory._cache_timestamp}\n"
        result += f"  - Cache size: {len(csv_memory._cache.get('csv_data', {})) if csv_memory._cache else 0} items\n"
        
        return result
        
    except Exception as e:
        logger.error(f"Error in debug_csv_storage: {str(e)}")
        return f"Error in debug_csv_storage: {str(e)}"


@tool
def list_available_data() -> str:
    """
    List all available data sources for analysis.
    This provides a comprehensive view of what data is available.
    """
    try:
        result = "AVAILABLE DATA SOURCES \n\n"
        
        # Persistent Storage
        result += "CSV Storage:\n"
        csv_memory = get_csv_memory()
        csv_data = csv_memory.load_csv_memory().get("csv_data", {})
        if csv_data:
            for name, data in csv_data.items():
                result += f"   - {name}: {data['size']} chars, source: {data['source']}\n"
        else:
            result += "   - No CSV data available\n"
        
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
            count = len(csv_data)
            return f"{count} dataset(s) available for analysis"
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
        analyze_data_with_pandas,  # Now uses E2B sandbox for secure execution
        quick_data_check,
        list_available_data,
        debug_csv_storage,
        clear_csv_cache,
        cleanup_e2b_sandbox_tool
    ]
