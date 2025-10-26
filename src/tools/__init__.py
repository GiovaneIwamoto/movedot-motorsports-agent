"""Tools for the agent system."""

from .context_tools import (
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
    # Documentation tools
    "get_meetings_documentation",
    "get_sessions_documentation",
    "get_drivers_documentation",
    "get_car_data_documentation",
    "get_laps_documentation",
    "get_positions_documentation",
    "get_pit_stops_documentation",
    "get_intervals_documentation",
    "get_stints_documentation",
    "get_weather_documentation",
    "get_race_control_documentation",
    "get_team_radio_documentation",
    # Context tools
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
