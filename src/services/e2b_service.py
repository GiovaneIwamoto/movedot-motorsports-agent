"""E2B sandbox service for code execution."""

import logging
import os
import time
import base64
from typing import Optional

from ..config import get_settings

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
            error_str = str(e)
            # Check if sandbox expired or was not found
            if "sandbox was not found" in error_str or "502" in error_str or "timeout" in error_str.lower():
                logger.warning(f"E2B sandbox expired or not found: {error_str}")
                logger.info("This usually means the sandbox timed out. It will be recreated on next use.")
                # Mark sandbox as invalid so it gets recreated
                global _e2b_sandbox, _sandbox_csv_data
                _e2b_sandbox = None
                _sandbox_csv_data = {}
                return f"E2B sandbox timeout error: The sandbox expired during execution. Please try again - a new sandbox will be created."
            error_msg = f"E2B execution error: {error_str}"
            logger.error(error_msg)
            return error_msg


def get_or_create_e2b_sandbox(csv_list: list, csv_memory):
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
    
    # Get ALL available CSVs from memory, not just the requested ones
    all_available_csvs = csv_memory.list_available_csvs()
    if "message" in all_available_csvs:
        # No CSVs available, use only requested ones
        all_csv_names = csv_list
    else:
        # Get all available CSV names and combine with requested ones
        all_csv_names = list(set(csv_list + list(all_available_csvs["available_datasets"].keys())))
    
    logger.info(f"Requested CSVs: {csv_list}")
    logger.info(f"All available CSVs: {all_csv_names}")
    
    # Check if we need to create a new sandbox
    # Also verify if existing sandbox is still valid
    need_new_sandbox = (
        _e2b_sandbox is None or 
        not all(csv in _sandbox_csv_data for csv in all_csv_names)
    )
    
    # If sandbox exists, verify it's still active
    if _e2b_sandbox is not None and not need_new_sandbox:
        try:
            # Try a simple operation to verify sandbox is still alive
            _e2b_sandbox.run_code("1 + 1")
        except Exception as e:
            error_str = str(e)
            if "sandbox was not found" in error_str or "502" in error_str:
                logger.warning("Existing E2B sandbox expired, will create new one")
                need_new_sandbox = True
                _e2b_sandbox = None
                _sandbox_csv_data = {}
    
    if need_new_sandbox:
        # Close existing sandbox if any
        if _e2b_sandbox is not None:
            try:
                _e2b_sandbox.kill()
                logger.info("Killed previous E2B sandbox")
            except Exception as e:
                logger.warning(f"Error killing sandbox: {e}")
        
        # Create new sandbox with timeout
        logger.info("Creating new E2B sandbox...")
        timeout_seconds = settings.e2b_sandbox_timeout
        logger.info(f"E2B sandbox timeout set to {timeout_seconds} seconds ({timeout_seconds // 60} minutes)")
        _e2b_sandbox = Sandbox.create(timeout=timeout_seconds)
        _sandbox_csv_data = {}
        
        # Upload CSVs to sandbox filesystem (E2B best practice)
        logger.info(f"Uploading {len(all_csv_names)} CSV files to sandbox filesystem...")
        for csv_name in all_csv_names:
            csv_content = csv_memory.get_csv_data(csv_name)
            if csv_content:
                # Upload CSV to /data/ directory in sandbox filesystem
                file_path = f"/data/{csv_name}"
                _e2b_sandbox.files.write(file_path, csv_content)
                _sandbox_csv_data[csv_name] = file_path
                logger.info(f"Uploaded {csv_name} to {file_path}")
            else:
                logger.warning(f"CSV content not found for {csv_name}")
        
        logger.info(f"E2B sandbox ready with {len(_sandbox_csv_data)} CSV files in /data/")
    
    # Verify that all requested CSVs are available
    missing_csvs = [csv for csv in csv_list if csv not in _sandbox_csv_data]
    if missing_csvs:
        logger.error(f"Missing CSVs in sandbox: {missing_csvs}")
        logger.error(f"Available CSVs: {list(_sandbox_csv_data.keys())}")
    
    return _e2b_sandbox, list(_sandbox_csv_data.keys())


def cleanup_e2b_sandbox():
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
