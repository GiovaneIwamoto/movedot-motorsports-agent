"""Agents for the agent system."""

from .context_agent import get_context_agent, invoke_context_agent
from .analysis_agent import get_analysis_agent, invoke_analysis_agent
from .supervisor_agent import get_supervisor_graph, invoke_supervisor
from .unified_agent import get_unified_agent, invoke_unified_agent

__all__ = [
    # Legacy agents (deprecated)
    "get_context_agent",
    "invoke_context_agent",
    "get_analysis_agent", 
    "invoke_analysis_agent",
    "get_supervisor_graph",
    "invoke_supervisor",
    
    # New unified agent
    "get_unified_agent",
    "invoke_unified_agent"
]
