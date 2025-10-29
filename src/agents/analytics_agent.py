"""Analytics agent that combines all functionality for data analysis and insights."""

import logging
import os
from datetime import datetime
from typing import Optional, Dict, Any
from langgraph.prebuilt import create_react_agent
from langgraph.checkpoint.memory import InMemorySaver

from ..config import get_openai_client, get_settings
from ..prompt.analytics_agent_prompt import ANALYTICS_AGENT_PROMPT

# Constants
DEFAULT_RECURSION_LIMIT = 50
DEFAULT_THREAD_ID = "analytics_agent_session"
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
            
            # Setup LangSmith tracing
            self._setup_langsmith_tracing()
            
            # Get current date for temporal context
            current_date = datetime.now().strftime("%Y-%m-%d")
            
            # Format the prompt with temporal context
            formatted_prompt = ANALYTICS_AGENT_PROMPT.format(current_date=current_date)
            
            llm = get_openai_client()
            tools = get_all_tools()
            
            self._agent = create_react_agent(
                model=llm,
                tools=tools,
                prompt=formatted_prompt,
                checkpointer=InMemorySaver(),
                name=DEFAULT_AGENT_NAME
            )
            
            action = "reloaded" if force_reload else "created"
            logger.info(f"Analytics agent {action} with LangSmith tracing and current date: {current_date}")
        
        return self._agent
    
    def _setup_langsmith_tracing(self):
        """Setup LangSmith tracing with environment variables."""
        settings = get_settings()
        
        if settings.langsmith_api_key:
            # Set environment variables for LangSmith
            os.environ["LANGSMITH_TRACING"] = "true"
            os.environ["LANGSMITH_API_KEY"] = settings.langsmith_api_key
            os.environ["LANGSMITH_PROJECT"] = settings.langsmith_project
            logger.info(f"LangSmith tracing enabled for project: {settings.langsmith_project}")
        else:
            logger.warning("LangSmith API key not configured. Tracing disabled.")
    
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


async def stream_analytics_agent(message: str, config: Optional[Dict[str, Any]] = None):
    """
    Stream the analytics agent response token by token.
    Only streams the final LLM response, filtering out tool outputs and intermediate steps.
    
    Args:
        message: User message
        config: Configuration for the agent
        
    Yields:
        Tuple of (event_type, data) for SSE streaming
        
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
        
        # Stream only messages mode to get LLM tokens
        # This approach filters out tool outputs and intermediate steps
        async for chunk, metadata in agent.astream(
            {"messages": [{"role": "user", "content": message}]},
            config,
            stream_mode="messages"
        ):
            # Only stream content from LLM responses, not tool outputs
            if hasattr(chunk, 'content') and chunk.content:
                # Get the node name from metadata
                node_name = metadata.get("langgraph_node", "")
                
                # Filter to only include final agent responses
                # Skip tool execution nodes and intermediate steps
                # The main agent node typically has names like "agent", "analytics_agent", or is empty
                if (not node_name or  # Empty node name often indicates main agent
                    node_name in ["agent", "analytics_agent", DEFAULT_AGENT_NAME] or
                    "agent" in node_name.lower()):
                    yield ("token", {"content": chunk.content})
        
        # Yield completion event
        yield ("complete", {
            "status": "done", 
            "timestamp": datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Failed to stream analytics agent: {str(e)}")
        yield ("error", {"error": f"Agent streaming failed: {str(e)}"})


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
