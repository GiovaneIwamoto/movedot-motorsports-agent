"""Analysis agent for data analysis and visualization."""

import logging
from langgraph.prebuilt import create_react_agent
from langgraph.checkpoint.memory import InMemorySaver

from ..config import get_openai_client
from ..tools import get_analysis_tools
from ..prompt.analysis_agent_prompt import ANALYSIS_AGENT_PROMPT

logger = logging.getLogger(__name__)

# Global variable to store agent instance
_analysis_agent = None


def get_analysis_agent():
    """Get or create the analysis agent."""
    global _analysis_agent
    if _analysis_agent is None:
        _analysis_agent = _create_analysis_agent()
        logger.info("Analysis agent created")
    return _analysis_agent


def _create_analysis_agent():
    """Create the ReAct agent."""
    llm = get_openai_client("worker")
    tools = get_analysis_tools()
    
    return create_react_agent(
        model=llm,
        tools=tools,
        prompt=ANALYSIS_AGENT_PROMPT,
        checkpointer=InMemorySaver(),
        name="analysis_agent"
    )


def invoke_analysis_agent(message: str, config: dict = None) -> str:
    """
    Invoke the analysis agent with a message.
    
    Args:
        message: User message
        config: Configuration for the agent
        
    Returns:
        Agent response
    """
    if config is None:
        config = {"configurable": {"thread_id": "analysis_agent_session"}}
    
    logger.info(f"Analysis agent invoked with message: {message[:100]}...")
    
    agent = get_analysis_agent()
    response = agent.invoke(
        {"messages": [{"role": "user", "content": message}]},
        config
    )
    
    return response["messages"][-1].content