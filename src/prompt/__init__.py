"""Prompt modules for the agents."""

from .supervisor_agent_prompt import SUPERVISOR_AGENT_PROMPT
from .context_agent_prompt import CONTEXT_AGENT_PROMPT
from .analysis_agent_prompt import ANALYSIS_AGENT_PROMPT

__all__ = [
    "SUPERVISOR_AGENT_PROMPT",
    "CONTEXT_AGENT_PROMPT", 
    "ANALYSIS_AGENT_PROMPT"
]
