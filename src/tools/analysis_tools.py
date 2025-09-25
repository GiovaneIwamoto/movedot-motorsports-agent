"""Tools for the analysis agent."""

import logging
from typing import Optional
from io import StringIO
import os

import pandas as pd
import matplotlib
# Configure matplotlib to use non-interactive backend to avoid GUI issues
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from langchain_core.tools import tool
from langchain.agents.agent_types import AgentType
from langchain_experimental.agents.agent_toolkits import create_pandas_dataframe_agent

from ..config import get_openai_client
from ..utils import get_csv_memory

logger = logging.getLogger(__name__)


def load_dataframe_from_csv(csv_name: str) -> pd.DataFrame:
    """Load DataFrame from CSV data stored in persistent file."""
    # Get CSV content from persistent storage (now with caching)
    csv_memory = get_csv_memory()
    csv_content = csv_memory.get_csv_data(csv_name)
    if csv_content is None:
        raise ValueError(f"CSV '{csv_name}' not found in persistent storage")
    
    # Load DataFrame from CSV content
    df = pd.read_csv(StringIO(csv_content))
    
    logger.info(f"DataFrame loaded: {csv_name} ({df.shape[0]} rows, {df.shape[1]} columns)")
    return df


def save_plot_to_file(plot_name: str = "plot") -> str:
    """Save the current matplotlib plot to a file and return the file path."""
    # Create plots directory if it doesn't exist
    plots_dir = "plots"
    if not os.path.exists(plots_dir):
        os.makedirs(plots_dir)
    
    # Generate unique filename
    import time
    timestamp = int(time.time())
    filename = f"{plot_name}_{timestamp}.png"
    filepath = os.path.join(plots_dir, filename)
    
    # Save the plot
    plt.savefig(filepath, dpi=300, bbox_inches='tight')
    plt.close()  # Close the figure to free memory
    
    return filepath


@tool
def create_plots_from_data(plot_query: str, csv_names: Optional[str] = None) -> str:
    """
    Create plots and visualizations from CSV datasets.
    This tool loads CSV data and creates plots that are saved as image files.
    
    Args:
        plot_query: Description of what plots to create
        csv_names: Comma-separated list of CSV names to use for plotting
    """
    try:
        # Get list of available CSVs
        csv_memory = get_csv_memory()
        available_csvs = csv_memory.list_available_csvs()
        
        if "message" in available_csvs:
            return "No CSV datasets available. Please fetch some data from OpenF1 API first."
        
        # Get available CSV names
        available_names = list(available_csvs["available_datasets"].keys())
        
        # Determine which CSVs to use
        if csv_names:
            csv_list = [name.strip() for name in csv_names.split(',')]
            csv_list = [name for name in csv_list if name in available_names]
        else:
            csv_list = available_names
        
        if not csv_list:
            return "No valid CSV names provided or no CSVs available."
        
        # Load the first CSV for plotting
        df = load_dataframe_from_csv(csv_list[0])
        
        # Create a custom plotting function that saves to file
        def create_and_save_plot(plot_code: str) -> str:
            """Execute plotting code and save the result."""
            try:
                # Add the save_plot_to_file function to the namespace
                exec_globals = {
                    'df': df,
                    'plt': plt,
                    'pd': pd,
                    'save_plot_to_file': save_plot_to_file
                }
                
                # Execute the plotting code
                exec(plot_code, exec_globals)
                
                # The code should call save_plot_to_file() to save the plot
                return "Plot created and saved successfully"
                
            except Exception as e:
                return f"Error creating plot: {str(e)}"
        
        # Use the pandas agent to generate plotting code
        llm_worker = get_openai_client("worker")
        
        # Create a simple agent for plotting
        plotting_prompt = f"""
        You are a data visualization expert. Create Python code to generate plots based on this query: {plot_query}
        
        The dataframe is called 'df' and has these columns: {list(df.columns)}
        
        IMPORTANT: 
        1. Use matplotlib.pyplot as plt
        2. After creating your plot, call save_plot_to_file('plot_name') to save it
        3. Do NOT call plt.show() - this will cause errors
        4. Make sure to close the figure with plt.close() after saving
        
        Return only the Python code, no explanations.
        """
        
        response = llm_worker.invoke(plotting_prompt)
        plot_code = response.content if hasattr(response, 'content') else str(response)
        
        # Execute the plotting code
        result = create_and_save_plot(plot_code)
        
        return f"Plot creation result: {result}"
        
    except Exception as e:
        logger.error(f"Plotting error: {str(e)}")
        return f"Plotting error: {str(e)}"


@tool
def analyze_data_with_pandas(analysis_query: str, csv_names: Optional[str] = None) -> str:
    """
    Analyze CSV datasets using a Pandas DataFrame agent.
    This tool loads CSV data from persistent storage and allows natural language queries 
    on the datasets by leveraging a Pandas agent that executes LLM-generated Python code.
    It can work with multiple DataFrames simultaneously for comparative analysis.
    
    Args:
        analysis_query: The analysis query in natural language
        csv_names: Comma-separated list of CSV names to analyze. If None, analyzes all available CSVs.
    """
    try:
        # Get list of available CSVs (single check with caching)
        csv_memory = get_csv_memory()
        available_csvs = csv_memory.list_available_csvs()
        
        if "message" in available_csvs:
            return "No CSV datasets available. Please fetch some data from OpenF1 API first."
        
        # Get available CSV names
        available_names = list(available_csvs["available_datasets"].keys())
        
        # Determine which CSVs to analyze
        if csv_names:
            csv_list = [name.strip() for name in csv_names.split(',')]
            # Filter to only include available CSVs
            csv_list = [name for name in csv_list if name in available_names]
        else:
            csv_list = available_names
        
        if not csv_list:
            return "No valid CSV names provided or no CSVs available."
        
        # Load DataFrames directly from persistent storage
        dataframes_list = []
        dataframe_names = []
        
        for csv_name in csv_list:
            try:
                # Load DataFrame using helper function (now with caching)
                df = load_dataframe_from_csv(csv_name)
                
                # Create a clean name for the DataFrame
                clean_name = csv_name.replace('.csv', '').replace('openf1_', '')
                dataframes_list.append(df)
                dataframe_names.append(f"df_{clean_name}")
                
            except Exception as e:
                logger.warning(f"Could not load {csv_name}: {e}")
                continue
        
        if not dataframes_list:
            return "No DataFrames could be loaded successfully."
        
        # Create pandas agent with all dataframes
        llm_worker = get_openai_client("worker")
        agent = create_pandas_dataframe_agent(
            llm_worker,
            dataframes_list,
            verbose=True,
            agent_type=AgentType.OPENAI_FUNCTIONS,
            allow_dangerous_code=True
        )
        
        result = agent.invoke(analysis_query)
        return f"Analysis of {len(dataframes_list)} CSV datasets:\n\n{result}"
        
    except Exception as e:
        logger.error(f"Analysis error: {str(e)}")
        return f"Analysis error: {str(e)}"


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


def get_analysis_tools():
    """Get all analysis agent tools."""
    return [
        analyze_data_with_pandas,
        create_plots_from_data,
        quick_data_check,
        list_available_data,
        debug_csv_storage,
        clear_csv_cache
    ]
