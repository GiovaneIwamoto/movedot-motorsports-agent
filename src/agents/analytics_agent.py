"""Analytics agent that combines all functionality for data analysis and insights."""

import logging
from langgraph.prebuilt import create_react_agent
from langgraph.checkpoint.memory import InMemorySaver

from ..config import get_openai_client
from ..prompt.analytics_agent_prompt import ANALYTICS_AGENT_PROMPT

logger = logging.getLogger(__name__)

# Global variable to store agent instance
_analytics_agent = None


def get_analytics_agent(force_reload=False):
    """Get or create the analytics agent."""
    global _analytics_agent
    
    if _analytics_agent is None or force_reload:
        from ..tools import get_all_tools
        
        llm = get_openai_client()
        tools = get_all_tools()
        
        _analytics_agent = create_react_agent(
            model=llm,
            tools=tools,
            prompt=ANALYTICS_AGENT_PROMPT,
            checkpointer=InMemorySaver(),
            name="analytics_agent"
        )
        
        action = "reloaded" if force_reload else "created"
        logger.info(f"Analytics agent {action}")
    
    return _analytics_agent


def reload_analytics_agent():
    """Reload the analytics agent."""
    return get_analytics_agent(force_reload=True)


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
    
    # Ensure recursion_limit is set
    config.setdefault("recursion_limit", 50)
    
    agent = get_analytics_agent()
    response = agent.invoke(
        {"messages": [{"role": "user", "content": message}]},
        config
    )
    
    return response["messages"][-1].content
