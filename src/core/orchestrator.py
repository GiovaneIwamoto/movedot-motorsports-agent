"""Main orchestrator for the agent system."""

import logging
from ..config import get_settings
from ..agents import invoke_analytics_agent

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


def process_message(message: str, config: dict = None) -> str:
    """
    Process a message using the analytics agent.
    
    Args:
        message: User message
        config: Configuration for the agent
        
    Returns:
        Agent response
    """
    _setup_logging()
    
    try:
        response = invoke_analytics_agent(message, config)
        logger.info("Response generated successfully")
        return response
        
    except Exception as e:
        logger.error(f"Error processing message: {str(e)}")
        return f"Error processing your request: {str(e)}"


def chat_with_agent(message: str) -> str:
    """
    Chat with the analytics agent.
    
    Args:
        message: User message
        
    Returns:
        Agent response
    """
    return process_message(message)