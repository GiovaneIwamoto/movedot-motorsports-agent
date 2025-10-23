"""Tools for the agent system."""

from .context_tools import (
    load_product_requirement_prompt,
    fetch_api_data,
    get_context_tools
)

from .analysis_tools import (
    analyze_data_with_pandas,
    debug_csv_storage,
    list_available_data,
    quick_data_check,
    clear_csv_cache,
    cleanup_e2b_sandbox_tool,
    get_analysis_tools
)

def get_all_tools():
    """Get all tools from both context and analysis modules."""
    context_tools = get_context_tools()
    analysis_tools = get_analysis_tools()
    return context_tools + analysis_tools

__all__ = [
    # Context tools
    "load_product_requirement_prompt",
    "fetch_api_data",
    "get_context_tools",
    
    # Analysis tools
    "analyze_data_with_pandas",
    "debug_csv_storage",
    "list_available_data",
    "quick_data_check",
    "clear_csv_cache",
    "cleanup_e2b_sandbox_tool",
    "get_analysis_tools",
    
    # Combined function
    "get_all_tools"
]
