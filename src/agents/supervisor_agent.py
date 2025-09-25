"""Supervisor agent for orchestrating other agents."""

import logging
from typing import Annotated
from langgraph.graph import StateGraph, START, MessagesState, END
from langgraph.types import Command
from langgraph.prebuilt import create_react_agent
from langchain_core.tools import tool, InjectedToolCallId
from langgraph.prebuilt import InjectedState

from ..config import get_openai_client
from ..prompt.supervisor_agent_prompt import SUPERVISOR_AGENT_PROMPT

logger = logging.getLogger(__name__)

# Global variables to store agent instances
_context_agent = None
_analysis_agent = None
_supervisor_graph = None


def _create_handoff_tool(agent_name: str, description: str = None):
    """Create a handoff tool for transferring to another agent."""
    name = f"transfer_to_{agent_name}"
    description = description or f"Ask {agent_name} for help."

    @tool(name, description=description)
    def handoff_tool(
        state: Annotated[MessagesState, InjectedState],
        tool_call_id: Annotated[str, InjectedToolCallId],
    ) -> Command:
        tool_message = {
            "role": "tool",
            "content": f"Successfully transferred to {agent_name}",
            "name": name,
            "tool_call_id": tool_call_id,
        }
        return Command(
            goto=agent_name,  
            update={**state, "messages": state["messages"] + [tool_message]},  
            graph=Command.PARENT,  
        )
    return handoff_tool


def _create_supervisor_graph():
    """Create the supervisor graph with handoff capabilities."""
    global _context_agent, _analysis_agent
    
    # Import here to avoid circular imports
    from .context_agent import get_context_agent
    from .analysis_agent import get_analysis_agent
    
    # Get agent instances
    _context_agent = get_context_agent()
    _analysis_agent = get_analysis_agent()
    
    # Create handoff tools
    assign_to_context_agent = _create_handoff_tool(
        agent_name="context_agent",
        description="Assign task to a context agent for API documentation and data fetching."
    )

    assign_to_analysis_agent = _create_handoff_tool(
        agent_name="analysis_agent",
        description="Assign task to an analysis agent for data analysis and visualization."
    )

    # Create supervisor agent with handoff tools
    llm = get_openai_client("supervisor")
    supervisor_agent = create_react_agent(
        model=llm,
        tools=[assign_to_context_agent, assign_to_analysis_agent],
        prompt=SUPERVISOR_AGENT_PROMPT,
        name="supervisor"
    )

    # Create custom supervisor graph
    return (
        StateGraph(MessagesState)
        .add_node(supervisor_agent, destinations={"context_agent", "analysis_agent", END})
        .add_node("context_agent", _context_agent)
        .add_node("analysis_agent", _analysis_agent)
        .add_edge(START, "supervisor")
        .add_edge("context_agent", "supervisor")
        .add_edge("analysis_agent", "supervisor")
        .compile()
    )


def get_supervisor_graph():
    """Get or create the supervisor graph."""
    global _supervisor_graph
    if _supervisor_graph is None:
        _supervisor_graph = _create_supervisor_graph()
        logger.info("Supervisor graph created")
    return _supervisor_graph


def invoke_supervisor(message: str, config: dict = None) -> str:
    """
    Invoke the supervisor agent with a message.
    
    Args:
        message: User message
        config: Configuration for the agent
        
    Returns:
        Agent response
    """
    if config is None:
        config = {"configurable": {"thread_id": "supervisor_session"}}
    
    logger.info(f"Supervisor agent invoked with message: {message[:100]}...")
    
    supervisor_graph = get_supervisor_graph()
    response = supervisor_graph.invoke(
        {"messages": [{"role": "user", "content": message}]},
        config
    )
    
    return response["messages"][-1].content