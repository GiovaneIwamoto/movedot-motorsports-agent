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
            error_msg = f"E2B execution error: {str(e)}"
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
