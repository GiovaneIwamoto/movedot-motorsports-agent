"""Context agent for API documentation and data fetching."""

import logging
from langgraph.prebuilt import create_react_agent
from langgraph.checkpoint.memory import InMemorySaver

from ..config import get_openai_client
from ..tools import get_context_tools
from ..prompt.context_agent_prompt import CONTEXT_AGENT_PROMPT

logger = logging.getLogger(__name__)

# Global variable to store agent instance
_context_agent = None


def get_context_agent():
    """Get or create the context agent."""
    global _context_agent
    if _context_agent is None:
        _context_agent = _create_context_agent()
        logger.info("Context agent created")
    return _context_agent


def _create_context_agent():
    """Create the ReAct agent."""
    llm = get_openai_client("worker")
    tools = get_context_tools()
    
    return create_react_agent(
        model=llm,
        tools=tools,
        prompt=CONTEXT_AGENT_PROMPT,
        checkpointer=InMemorySaver(),
        name="context_agent"
    )


def invoke_context_agent(message: str, config: dict = None) -> str:
    """
    Invoke the context agent with a message.
    
    Args:
        message: User message
        config: Configuration for the agent
        
    Returns:
        Agent response
    """
    if config is None:
        config = {"configurable": {"thread_id": "context_agent_session"}}
    
    logger.info(f"Context agent invoked with message: {message[:100]}...")
    
    agent = get_context_agent()
    response = agent.invoke(
        {"messages": [{"role": "user", "content": message}]},
        config
    )
    
    return response["messages"][-1].content