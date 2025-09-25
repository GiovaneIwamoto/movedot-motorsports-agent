"""
Main entry point for the agent system.
This script provides a command-line interface to interact with the agent system.
"""

import argparse
import sys
import logging
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / "src"))

from src.core import chat_with_unified_agent, chat_with_supervisor, chat_with_context_agent, chat_with_analysis_agent
from src.config import get_settings

logger = logging.getLogger(__name__)


def setup_environment():
    """Setup environment and validate configuration."""
    try:
        settings = get_settings()
        logger.info("Configuration loaded successfully")
        
        # Create data directory if it doesn't exist
        data_dir = Path(settings.data_dir)
        data_dir.mkdir(exist_ok=True)
        
        return True
        
    except Exception as e:
        logger.error(f"Failed to setup environment: {e}")
        return False


def interactive_mode():
    """Run the system in interactive mode."""
    print("Agent System - Interactive Mode")
    print("=" * 50)
    print("Available commands:")
    print("  - Ask questions about data and APIs")
    print("  - Request data analysis and visualizations")
    print("  - Get help with API usage")
    print("  - Type 'quit' or 'exit' to stop")
    print("=" * 50)
    
    while True:
        try:
            user_input = input("\nYou: ").strip()
            
            if user_input.lower() in ['quit', 'exit', 'q']:
                print("Goodbye!")
                break
            
            if not user_input:
                continue
            
            print("\nAgent: ", end="", flush=True)
            response = chat_with_unified_agent(user_input)
            print(response)
            
        except KeyboardInterrupt:
            print("\n\nGoodbye!")
            break
        except Exception as e:
            print(f"\nError: {e}")


def single_query_mode(query: str, agent_type: str = "unified"):
    """Run a single query and exit."""
    try:
        if agent_type == "unified":
            response = chat_with_unified_agent(query)
        elif agent_type == "supervisor":
            response = chat_with_supervisor(query)
        elif agent_type == "context":
            response = chat_with_context_agent(query)
        elif agent_type == "analysis":
            response = chat_with_analysis_agent(query)
        else:
            raise ValueError(f"Unknown agent type: {agent_type}")
        
        print(response)
        
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Agent System - Data Analysis and API Assistant",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python main.py                                    # Interactive mode (unified agent)
  python main.py -q "What data do I have available?" # Single query
  python main.py -q "Analyze driver performance" -a unified  # Use unified agent
        """
    )
    
    parser.add_argument(
        "-q", "--query",
        help="Single query to process (exits after processing)"
    )
    
    parser.add_argument(
        "-a", "--agent",
        choices=["unified", "supervisor", "context", "analysis"],
        default="unified",
        help="Agent type to use (default: unified)"
    )
    
    parser.add_argument(
        "-v", "--verbose",
        action="store_true",
        help="Enable verbose logging"
    )
    
    args = parser.parse_args()
    
    # Setup logging
    log_level = logging.DEBUG if args.verbose else logging.INFO
    logging.basicConfig(
        level=log_level,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # Setup environment
    if not setup_environment():
        print("Failed to setup environment. Please check your configuration.", file=sys.stderr)
        sys.exit(1)
    
    # Run appropriate mode
    if args.query:
        single_query_mode(args.query, args.agent)
    else:
        interactive_mode()


if __name__ == "__main__":
    main()
