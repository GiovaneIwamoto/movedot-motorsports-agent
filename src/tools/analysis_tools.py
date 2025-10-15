"""Tools for the analysis agent."""

import logging
import os
import time
import base64
from typing import Optional

from langchain_core.tools import tool

from ..config import get_settings
from ..utils import get_csv_memory

logger = logging.getLogger(__name__)

# Global E2B sandbox instance for the pandas agent
_e2b_sandbox = None
_sandbox_csv_data = {}


class E2BPythonREPL:
    """Custom Python REPL that executes code in E2B sandbox."""
    
    def __init__(self, sandbox, csv_names: list):
        """
        Initialize E2B Python REPL.
        
        Args:
            sandbox: Active E2B sandbox instance
            csv_names: List of CSV file names available in sandbox /data/ directory
        """
        self.sandbox = sandbox
        self.csv_names = csv_names
        logger.info(f"E2B REPL initialized with {len(csv_names)} CSV files")
    
    def run(self, code: str) -> str:
        """
        Execute Python code in E2B sandbox.
        
        Args:
            code: Python code to execute
            
        Returns:
            String output from code execution
        """
        try:
            logger.info(f"Executing code in E2B sandbox:\n{code[:200]}...")
            
            # Execute code in sandbox
            execution = self.sandbox.run_code(code)
            
            result_parts = []
            
            # Collect text output (stdout)
            if execution.text:
                result_parts.append(execution.text)
            
            # Handle errors
            if execution.error:
                error_msg = f"{execution.error.name}: {execution.error.value}"
                logger.error(f"E2B execution error: {error_msg}")
                return error_msg
            
            # Collect results (return values)
            if execution.results:
                for res in execution.results:
                    if hasattr(res, 'text') and res.text:
                        result_parts.append(str(res.text))
            
            # Handle plots/images
            if hasattr(execution, 'results'):
                for idx, result in enumerate(execution.results):
                    # Check if result contains image data
                    if hasattr(result, 'formats') and callable(result.formats) and 'png' in result.formats():
                        # Save plot to local plots directory
                        plots_dir = "plots"
                        if not os.path.exists(plots_dir):
                            os.makedirs(plots_dir)
                        
                        timestamp = int(time.time())
                        filename = f"e2b_plot_{timestamp}_{idx}.png"
                        filepath = os.path.join(plots_dir, filename)
                        
                        # Get PNG data and save
                        png_data = result.png
                        with open(filepath, 'wb') as f:
                            f.write(base64.b64decode(png_data))
                        
                        result_parts.append(f"[Plot saved: {filepath}]")
                        logger.info(f"Saved plot: {filepath}")
            
            output = "\n".join(result_parts) if result_parts else ""
            return output
            
        except Exception as e:
            error_msg = f"E2B execution error: {str(e)}"
            logger.error(error_msg)
            return error_msg


def _get_or_create_e2b_sandbox(csv_list: list, csv_memory):
    """
    Get or create E2B sandbox with CSVs uploaded to filesystem.
    Following E2B best practices: upload files to sandbox filesystem instead of loading in memory.
    """
    global _e2b_sandbox, _sandbox_csv_data
    
    settings = get_settings()
    if not settings.e2b_api_key:
        raise ValueError("E2B API key not configured. Please set E2B_API_KEY environment variable.")
    
    # Import E2B
    try:
        from e2b_code_interpreter import Sandbox
    except ImportError:
        raise ImportError("E2B Code Interpreter not installed. Run: pip install e2b-code-interpreter")
    
    # Set E2B API key as environment variable (E2B reads from env)
    import os
    os.environ['E2B_API_KEY'] = settings.e2b_api_key
    
    # Check if we need to create a new sandbox
    need_new_sandbox = (
        _e2b_sandbox is None or 
        set(csv_list) != set(_sandbox_csv_data.keys())
    )
    
    if need_new_sandbox:
        # Close existing sandbox if any
        if _e2b_sandbox is not None:
            try:
                _e2b_sandbox.kill()
                logger.info("Killed previous E2B sandbox")
            except Exception as e:
                logger.warning(f"Error killing sandbox: {e}")
        
        # Create new sandbox
        logger.info("Creating new E2B sandbox...")
        _e2b_sandbox = Sandbox.create()
        _sandbox_csv_data = {}
        
        # Upload CSVs to sandbox filesystem (E2B best practice)
        logger.info(f"Uploading {len(csv_list)} CSV files to sandbox filesystem...")
        for csv_name in csv_list:
            csv_content = csv_memory.get_csv_data(csv_name)
            if csv_content:
                # Upload CSV to /data/ directory in sandbox filesystem
                file_path = f"/data/{csv_name}"
                _e2b_sandbox.files.write(file_path, csv_content)
                _sandbox_csv_data[csv_name] = file_path
                logger.info(f"Uploaded {csv_name} to {file_path}")
        
        logger.info(f"E2B sandbox ready with {len(_sandbox_csv_data)} CSV files in /data/")
    
    return _e2b_sandbox, list(_sandbox_csv_data.keys())


def _cleanup_e2b_sandbox():
    """Clean up E2B sandbox."""
    global _e2b_sandbox, _sandbox_csv_data
    if _e2b_sandbox is not None:
        try:
            _e2b_sandbox.kill()
            logger.info("E2B sandbox killed")
        except Exception as e:
            logger.warning(f"Error killing sandbox: {e}")
        finally:
            _e2b_sandbox = None
            _sandbox_csv_data = {}


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
            sandbox, loaded_csvs = _get_or_create_e2b_sandbox(csv_list, csv_memory)
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
        _cleanup_e2b_sandbox()
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
def cleanup_e2b_sandbox() -> str:
    """
    Clean up and close the E2B sandbox.
    Use this when you're done with analysis or if you need to reset the sandbox.
    """
    try:
        _cleanup_e2b_sandbox()
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
        cleanup_e2b_sandbox
    ]
