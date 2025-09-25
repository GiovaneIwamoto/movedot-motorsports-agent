"""Main orchestrator for the motorsports agent system."""

import logging
from ..config import get_settings
from ..agents import (
    invoke_context_agent, 
    invoke_analysis_agent, 
    invoke_supervisor,
    invoke_unified_agent
)

logger = logging.getLogger(__name__)

# Global variable to track if logging is set up
_logging_setup = False


def _setup_logging():
    """Setup logging configuration."""
    global _logging_setup
    if not _logging_setup:
        settings = get_settings()
        logging.basicConfig(
            level=getattr(logging, settings.log_level.upper()),
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        logger.info(f"Logging configured with level: {settings.log_level}")
        _logging_setup = True


def process_message(message: str, agent_type: str = "unified", config: dict = None) -> str:
    """
    Process a message using the specified agent.
    
    Args:
        message: User message
        agent_type: Type of agent to use ("unified", "context", "analysis", "supervisor")
        config: Configuration for the agent
        
    Returns:
        Agent response
    """
    _setup_logging()
    logger.info(f"Processing message with {agent_type} agent: {message[:100]}...")
    
    try:
        if agent_type == "unified":
            response = invoke_unified_agent(message, config)
        elif agent_type == "context":
            response = invoke_context_agent(message, config)
        elif agent_type == "analysis":
            response = invoke_analysis_agent(message, config)
        elif agent_type == "supervisor":
            response = invoke_supervisor(message, config)
        else:
            raise ValueError(f"Unknown agent type: {agent_type}")
        
        logger.info(f"Response generated successfully")
        return response
        
    except Exception as e:
        logger.error(f"Error processing message: {str(e)}")
        return f"Error processing your request: {str(e)}"


def chat_with_unified_agent(message: str) -> str:
    """
    Chat with the unified agent (recommended interface).
    
    Args:
        message: User message
        
    Returns:
        Unified agent response
    """
    return process_message(message, "unified")


def chat_with_supervisor(message: str) -> str:
    """
    Chat with the supervisor agent (legacy interface).
    
    Args:
        message: User message
        
    Returns:
        Supervisor response
    """
    return process_message(message, "supervisor")


def chat_with_context_agent(message: str) -> str:
    """
    Chat directly with the context agent.
    
    Args:
        message: User message
        
    Returns:
        Context agent response
    """
    return process_message(message, "context")


def chat_with_analysis_agent(message: str) -> str:
    """
    Chat directly with the analysis agent.
    
    Args:
        message: User message
        
    Returns:
        Analysis agent response
    """
    return process_message(message, "analysis")