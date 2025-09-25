"""Unified agent that combines all functionality from supervisor, context, and analysis agents."""

import logging
from langgraph.prebuilt import create_react_agent
from langgraph.checkpoint.memory import InMemorySaver

from ..config import get_openai_client
from ..tools import get_all_tools
from ..prompt.unified_agent_prompt import UNIFIED_AGENT_PROMPT

logger = logging.getLogger(__name__)

# Global variable to store agent instance
_unified_agent = None


def get_unified_agent():
    """Get or create the unified agent."""
    global _unified_agent
    if _unified_agent is None:
        _unified_agent = _create_unified_agent()
        logger.info("Unified agent created")
    return _unified_agent


def _create_unified_agent():
    """Create the unified ReAct agent with all tools."""
    llm = get_openai_client("worker")
    tools = get_all_tools()
    
    return create_react_agent(
        model=llm,
        tools=tools,
        prompt=UNIFIED_AGENT_PROMPT,
        checkpointer=InMemorySaver(),
        name="unified_agent"
    )


def invoke_unified_agent(message: str, config: dict = None) -> str:
    """
    Invoke the unified agent with a message.
    
    Args:
        message: User message
        config: Configuration for the agent
        
    Returns:
        Agent response
    """
    if config is None:
        config = {"configurable": {"thread_id": "unified_agent_session"}}
    
    logger.info(f"Unified agent invoked with message: {message[:100]}...")
    
    agent = get_unified_agent()
    response = agent.invoke(
        {"messages": [{"role": "user", "content": message}]},
        config
    )
    
    return response["messages"][-1].content
