"""Analytics agent that combines all functionality for data analysis and insights."""

import asyncio
import logging
import os
from datetime import datetime
from typing import Any, Dict, Optional
from langgraph.prebuilt import create_react_agent
from langgraph.checkpoint.memory import InMemorySaver

from ..config import get_settings, get_llm_client
from ..prompt.analytics_agent_prompt import ANALYTICS_AGENT_PROMPT

# Constants
DEFAULT_RECURSION_LIMIT = 50
DEFAULT_THREAD_ID = "analytics_agent_session"
DEFAULT_AGENT_NAME = "analytics_agent"

logger = logging.getLogger(__name__)


def _prepare_agent_config(config: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Ensure the agent config contains required defaults."""
    prepared: Dict[str, Any] = dict(config or {})
    prepared.setdefault("recursion_limit", DEFAULT_RECURSION_LIMIT)

    configurable = dict(prepared.get("configurable") or {})
    configurable.setdefault("thread_id", DEFAULT_THREAD_ID)
    prepared["configurable"] = configurable

    return prepared


class AnalyticsAgentManager:
    """Singleton class to manage the analytics agent instance."""
    
    _instance: Optional['AnalyticsAgentManager'] = None
    _agent: Optional[Any] = None
    _agent_config: Optional[Dict[str, Any]] = None
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
    
    async def get_agent_async(self, force_reload: bool = False, user_config: Optional[Dict[str, Any]] = None) -> Any:
        """
        Get or create the analytics agent (async version).
        
        This is the preferred way to get the agent - call from async context.
        Following MCP SDK best practices - loads tools in same event loop.
        
        Args:
            force_reload: Force reload of the agent
            user_config: Optional user-specific config with provider, api_key, model, temperature
            
        Returns:
            LangGraph agent instance
        """
        # Check if we need to reload (config changed or force reload)
        config_changed = False
        if user_config:
            config_key = f"{user_config.get('provider')}:{user_config.get('model')}:{user_config.get('api_key', '')[:10]}"
            if self._agent_config != config_key:
                config_changed = True
                self._agent_config = config_key
        
        if self._agent is None or force_reload or config_changed:
            from ..tools import get_all_tools_async
            
            # Setup LangSmith tracing
            self._setup_langsmith_tracing()
            
            # Get current date for temporal context
            current_date = datetime.now().strftime("%Y-%m-%d")
            
            # Format the prompt with temporal context
            formatted_prompt = ANALYTICS_AGENT_PROMPT.format(current_date=current_date)
            
            # User config is required - validated by API endpoint before reaching here
            if not user_config or not user_config.get("api_key"):
                raise ValueError(
                    "API configuration is required. "
                    "Please configure your API key and model in the web interface Settings."
                )
            
            llm = get_llm_client(
                provider=user_config["provider"],
                api_key=user_config["api_key"],
                model=user_config["model"],
                temperature=user_config.get("temperature", 0.0)
            )
            logger.info(f"Using user-provided {user_config['provider']} model: {user_config['model']}")
            
            # Get all tools (including MCP tools) - async version
            logger.info("Loading all tools for agent (async)...")
            try:
                tools = await get_all_tools_async()
                logger.info(f"Agent will have {len(tools)} tools available")
            except Exception as e:
                logger.error(f"Error loading tools: {e}", exc_info=True)
                # Fallback to just analysis tools if MCP tools fail to load
                from ..tools.analysis_tools import get_analysis_tools
                tools = get_analysis_tools()
                logger.warning(f"Using only analysis tools ({len(tools)} tools) due to MCP loading error")
            
            try:
                logger.info("Creating LangGraph agent...")
                self._agent = create_react_agent(
                    model=llm,
                    tools=tools,
                    prompt=formatted_prompt,
                    checkpointer=InMemorySaver(),
                    name=DEFAULT_AGENT_NAME
                )
                
                action = "reloaded" if (force_reload or config_changed) else "created"
                logger.info(f"Analytics agent {action} successfully with {len(tools)} tools (LangSmith tracing enabled, date: {current_date})")
            except Exception as e:
                logger.error(f"Failed to create agent: {e}", exc_info=True)
                raise RuntimeError(f"Failed to create analytics agent: {str(e)}") from e
        
        return self._agent
    
    def get_agent(self, force_reload: bool = False, user_config: Optional[Dict[str, Any]] = None) -> Any:
        """
        Get or create the analytics agent.
        
        Args:
            force_reload: Force reload of the agent
            user_config: Optional user-specific config with provider, api_key, model, temperature
        """
        # Check if we need to reload (config changed or force reload)
        config_changed = False
        if user_config:
            config_key = f"{user_config.get('provider')}:{user_config.get('model')}:{user_config.get('api_key', '')[:10]}"
            if self._agent_config != config_key:
                config_changed = True
                self._agent_config = config_key
        
        if self._agent is None or force_reload or config_changed:
            from ..tools import get_all_tools
            from ..mcp.loader import ensure_user_mcp_servers_loaded
            
            # Setup LangSmith tracing
            self._setup_langsmith_tracing()
            
            # NOTE: MCP servers should be loaded BEFORE calling get_agent()
            # They are loaded in the API endpoint (stream_chat_with_agent) in async context
            # This ensures they use the same event loop as the FastAPI application
            # Following MCP SDK best practices - no manual loop management
            
            # Get current date for temporal context
            current_date = datetime.now().strftime("%Y-%m-%d")
            
            # Format the prompt with temporal context
            formatted_prompt = ANALYTICS_AGENT_PROMPT.format(current_date=current_date)
            
            # User config is required - validated by API endpoint before reaching here
            if not user_config or not user_config.get("api_key"):
                raise ValueError(
                    "API configuration is required. "
                    "Please configure your API key and model in the web interface Settings."
                )
            
            llm = get_llm_client(
                provider=user_config["provider"],
                api_key=user_config["api_key"],
                model=user_config["model"],
                temperature=user_config.get("temperature", 0.0)
            )
            logger.info(f"Using user-provided {user_config['provider']} model: {user_config['model']}")
            
            # Get all tools (including MCP tools if servers are loaded)
            # Note: MCP tools are loaded dynamically, so they may not be available immediately
            # The agent will work with whatever tools are available at creation time
            logger.info("Loading all tools for agent...")
            try:
                tools = get_all_tools()
                logger.info(f"Agent will have {len(tools)} tools available")
            except Exception as e:
                logger.error(f"Error loading tools: {e}", exc_info=True)
                # Fallback to just analysis tools if MCP tools fail to load
                from ..tools.analysis_tools import get_analysis_tools
                tools = get_analysis_tools()
                logger.warning(f"Using only analysis tools ({len(tools)} tools) due to MCP loading error")
            
            try:
                logger.info("Creating LangGraph agent...")
                self._agent = create_react_agent(
                    model=llm,
                    tools=tools,
                    prompt=formatted_prompt,
                    checkpointer=InMemorySaver(),
                    name=DEFAULT_AGENT_NAME
                )
                
                action = "reloaded" if (force_reload or config_changed) else "created"
                logger.info(f"Analytics agent {action} successfully with {len(tools)} tools (LangSmith tracing enabled, date: {current_date})")
            except Exception as e:
                logger.error(f"Failed to create agent: {e}", exc_info=True)
                raise RuntimeError(f"Failed to create analytics agent: {str(e)}") from e
        
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


def get_analytics_agent(force_reload: bool = False, user_config: Optional[Dict[str, Any]] = None) -> Any:
    """Get or create the analytics agent."""
    return _agent_manager.get_agent(force_reload, user_config)


def reload_analytics_agent() -> Any:
    """Reload the analytics agent."""
    return _agent_manager.reload_agent()


def invoke_analytics_agent(message: str, config: Optional[Dict[str, Any]] = None, user_config: Optional[Dict[str, Any]] = None) -> str:
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
    
    config = _prepare_agent_config(config)

    try:
        agent = get_analytics_agent(user_config=user_config)
        
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


async def stream_analytics_agent_with_history(messages_history: list, config: Optional[Dict[str, Any]] = None, user_config: Optional[Dict[str, Any]] = None):
    """
    Stream the analytics agent response token by token with full conversation history.
    Only streams the final LLM response, filtering out tool outputs and intermediate steps.
    
    Args:
        messages_history: List of message dicts with "role" and "content" keys
        config: Configuration for the agent
        
    Yields:
        Tuple of (event_type, data) for SSE streaming
        
    Raises:
        ValueError: If messages_history is empty or invalid
        RuntimeError: If agent fails to process the message
    """
    if not messages_history or len(messages_history) == 0:
        raise ValueError("Messages history cannot be empty")
    
    config = _prepare_agent_config(config)

    try:
        logger.info("Starting agent stream with history")
        # Use async version to properly load MCP tools
        agent_manager = AnalyticsAgentManager()
        # Force reload if requested (e.g., after MCP servers are loaded)
        force_reload = user_config.get('force_reload_agent', False) if user_config else False
        # Clean up the flag so it doesn't interfere with config checking
        agent_config_clean = {k: v for k, v in (user_config or {}).items() if k != 'force_reload_agent'}
        agent = await agent_manager.get_agent_async(force_reload=force_reload, user_config=agent_config_clean if agent_config_clean else None)
        logger.info("Agent created, starting stream...")
        
        # Stream only messages mode to get LLM tokens
        # This approach filters out tool outputs and intermediate steps
        chunk_count = 0
        try:
            async for chunk, metadata in agent.astream(
                {"messages": messages_history},
                config,
                stream_mode="messages"
            ):
                chunk_count += 1
                node_name = metadata.get("langgraph_node", "")
                
                # Log tool execution nodes for debugging
                if "tool" in node_name.lower() or "mcp" in node_name.lower():
                    logger.info(f"Tool execution detected: {node_name}")
                
                # Only stream content from LLM responses, not tool outputs
                if hasattr(chunk, 'content') and chunk.content:
                    # Filter to only include final agent responses
                    # Skip tool execution nodes and intermediate steps
                    # The main agent node typically has names like "agent", "analytics_agent", or is empty
                    if (not node_name or  # Empty node name often indicates main agent
                        node_name in ["agent", "analytics_agent", DEFAULT_AGENT_NAME] or
                        "agent" in node_name.lower()):
                        yield ("token", {"content": chunk.content})
            
            logger.info(f"Agent stream completed successfully ({chunk_count} chunks processed)")
            
        except asyncio.TimeoutError:
            logger.error("Agent stream timed out")
            yield ("error", {"error": "Agent stream timed out. The request took too long to process."})
            return
        except Exception as stream_error:
            logger.error(f"Error during agent stream: {stream_error}", exc_info=True)
            yield ("error", {"error": f"Error during agent execution: {str(stream_error)}"})
            return
        
        # Yield completion event
        yield ("complete", {
            "status": "done", 
            "timestamp": datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Failed to stream analytics agent with history: {str(e)}", exc_info=True)
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
