"""Analytics agent that combines all functionality for data analysis and insights."""

import logging
from langgraph.prebuilt import create_react_agent
from langgraph.checkpoint.memory import InMemorySaver

from ..config import get_openai_client
from ..tools import get_all_tools
from ..prompt.analytics_agent_prompt import ANALYTICS_AGENT_PROMPT

logger = logging.getLogger(__name__)

# Global variable to store agent instance
_analytics_agent = None


def get_analytics_agent():
    """Get or create the analytics agent."""
    global _analytics_agent
    if _analytics_agent is None:
        _analytics_agent = _create_analytics_agent()
        logger.info("Analytics agent created")
    return _analytics_agent


def _create_analytics_agent():
    """Create the analytics ReAct agent with all tools."""
    llm = get_openai_client()
    tools = get_all_tools()
    
    return create_react_agent(
        model=llm,
        tools=tools,
        prompt=ANALYTICS_AGENT_PROMPT,
        checkpointer=InMemorySaver(),
        name="analytics_agent"
    )


def invoke_analytics_agent(message: str, config: dict = None) -> str:
    """
    Invoke the analytics agent with a message.
    
    Args:
        message: User message
        config: Configuration for the agent
        
    Returns:
        Agent response
    """
    if config is None:
        config = {"configurable": {"thread_id": "analytics_agent_session"}}
    
    
    agent = get_analytics_agent()
    response = agent.invoke(
        {"messages": [{"role": "user", "content": message}]},
        config
    )
    
    return response["messages"][-1].content
