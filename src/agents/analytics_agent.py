"""Analytics agent that combines all functionality for data analysis and insights."""

import logging
from pathlib import Path
from langgraph.prebuilt import create_react_agent
from langgraph.checkpoint.memory import InMemorySaver

from ..config import get_openai_client
from ..tools import get_all_tools
from ..prompt.analytics_agent_prompt import ANALYTICS_AGENT_PROMPT

logger = logging.getLogger(__name__)

# Global variable to store agent instance
_analytics_agent = None
_prp_content = None


def get_analytics_agent():
    """Get or create the analytics agent."""
    global _analytics_agent
    if _analytics_agent is None:
        _analytics_agent = _create_analytics_agent()
        logger.info("Analytics agent created")
    return _analytics_agent


def _load_prp_content():
    """Load PRP content from file."""
    global _prp_content
    try:
        prp_path = Path(__file__).parent.parent / "prompt" / "product_requirement_prompt.md"
        if prp_path.exists():
            _prp_content = prp_path.read_text(encoding='utf-8')
            logger.info(f"PRP content loaded: {len(_prp_content)} characters")
        else:
            _prp_content = ""
            logger.warning("PRP file not found, using empty content")
    except Exception as e:
        logger.error(f"Error loading PRP content: {e}")
        _prp_content = ""
    return _prp_content


def _create_analytics_agent():
    """Create the analytics ReAct agent with all tools."""
    llm = get_openai_client()
    tools = get_all_tools()
    
    # Load PRP content and combine with base prompt
    prp_content = _load_prp_content()
    
    # Combine base prompt with PRP content
    if prp_content:
        combined_prompt = f"{ANALYTICS_AGENT_PROMPT}\n\n## API Documentation and Context\n{prp_content}"
    else:
        combined_prompt = ANALYTICS_AGENT_PROMPT
    
    return create_react_agent(
        model=llm,
        tools=tools,
        prompt=combined_prompt,
        checkpointer=InMemorySaver(),
        name="analytics_agent"
    )


def reload_analytics_agent():
    """Reload the analytics agent with updated PRP content."""
    global _analytics_agent
    _analytics_agent = None
    _prp_content = None
    logger.info("Analytics agent reloaded with updated PRP")
    return get_analytics_agent()


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
