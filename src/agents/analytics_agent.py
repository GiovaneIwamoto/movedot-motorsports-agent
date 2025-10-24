"""Analytics agent that combines all functionality for data analysis and insights."""

import logging
from typing import Optional, Dict, Any
from langgraph.prebuilt import create_react_agent
from langgraph.checkpoint.memory import InMemorySaver

from ..config import get_openai_client, get_settings
from ..prompt.analytics_agent_prompt import ANALYTICS_AGENT_PROMPT

# Constants
DEFAULT_THREAD_ID = "analytics_agent_session"
DEFAULT_RECURSION_LIMIT = 50
DEFAULT_AGENT_NAME = "analytics_agent"

logger = logging.getLogger(__name__)


class AnalyticsAgentManager:
    """Singleton class to manage the analytics agent instance."""
    
    _instance: Optional['AnalyticsAgentManager'] = None
    _agent: Optional[Any] = None
    _logging_configured: bool = False
    
    def __new__(cls) -> 'AnalyticsAgentManager':
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def _configure_logging(self) -> None:
        """Configure logging if not already done."""
        if not self._logging_configured:
            settings = get_settings()
            logging.basicConfig(
                level=getattr(logging, settings.log_level.upper()),
                format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            )
            logger.info(f"Logging configured with level: {settings.log_level}")
            self._logging_configured = True
    
    def get_agent(self, force_reload: bool = False) -> Any:
        """Get or create the analytics agent."""
        if self._agent is None or force_reload:
            from ..tools import get_all_tools
            
            llm = get_openai_client()
            tools = get_all_tools()
            
            self._agent = create_react_agent(
                model=llm,
                tools=tools,
                prompt=ANALYTICS_AGENT_PROMPT,
                checkpointer=InMemorySaver(),
                name=DEFAULT_AGENT_NAME
            )
            
            action = "reloaded" if force_reload else "created"
            logger.info(f"Analytics agent {action}")
        
        return self._agent
    
    def reload_agent(self) -> Any:
        """Reload the analytics agent."""
        return self.get_agent(force_reload=True)


# Global manager instance
_agent_manager = AnalyticsAgentManager()


def _setup_logging():
    """Setup logging configuration."""
    _agent_manager._configure_logging()


def get_analytics_agent(force_reload: bool = False) -> Any:
    """Get or create the analytics agent."""
    return _agent_manager.get_agent(force_reload)


def reload_analytics_agent() -> Any:
    """Reload the analytics agent."""
    return _agent_manager.reload_agent()


def invoke_analytics_agent(message: str, config: Optional[Dict[str, Any]] = None) -> str:
    """
    Invoke the analytics agent with a message.
    
    Args:
        message: User message
        config: Configuration for the agent
        
    Returns:
        Agent response
        
    Raises:
        ValueError: If message is empty or invalid
        RuntimeError: If agent fails to process the message
    """
    if not message or not message.strip():
        raise ValueError("Message cannot be empty")
    
    if config is None:
        config = {"configurable": {"thread_id": DEFAULT_THREAD_ID}}
    
    # Ensure recursion_limit is set
    config.setdefault("recursion_limit", DEFAULT_RECURSION_LIMIT)
    
    try:
        agent = get_analytics_agent()
        response = agent.invoke(
            {"messages": [{"role": "user", "content": message}]},
            config
        )
        
        if not response or "messages" not in response or not response["messages"]:
            raise RuntimeError("Invalid response from agent")
        
        return response["messages"][-1].content
        
    except Exception as e:
        logger.error(f"Failed to invoke analytics agent: {str(e)}")
        raise RuntimeError(f"Agent invocation failed: {str(e)}") from e


def process_message(message: str, config: Optional[Dict[str, Any]] = None) -> str:
    """
    Process a message using the analytics agent.
    
    Args:
        message: User message
        config: Configuration for the agent
        
    Returns:
        Agent response or error message if processing fails
    """
    _setup_logging()
    
    try:
        response = invoke_analytics_agent(message, config)
        logger.info("Response generated successfully")
        return response
        
    except ValueError as e:
        logger.warning(f"Invalid input: {str(e)}")
        return f"Invalid input: {str(e)}"
        
    except RuntimeError as e:
        logger.error(f"Agent processing error: {str(e)}")
        return f"Error processing your request: {str(e)}"
        
    except Exception as e:
        logger.error(f"Unexpected error processing message: {str(e)}")
        return f"Unexpected error processing your request: {str(e)}"
