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

from src.core import chat_with_agent
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
            
            response = chat_with_agent(user_input)
            print(f"\nAgent: {response}\n")
            
        except KeyboardInterrupt:
            print("\n\nGoodbye!")
            break
        except Exception as e:
            print(f"\nError: {e}")


def single_query_mode(query: str):
    """Run a single query and exit."""
    try:
        response = chat_with_agent(query)
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
  python main.py                                    # Interactive mode
  python main.py -q "What data do I have available?" # Single query
  python main.py -q "Analyze driver performance"    # Single query
  python main.py --web                              # Start web interface
        """
    )
    
    parser.add_argument(
        "-q", "--query",
        help="Single query to process (exits after processing)"
    )
    
    parser.add_argument(
        "--web",
        action="store_true",
        help="Start web interface server"
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
    if args.web:
        print("Starting web interface...")
        print("Web interface will be available at: http://localhost:8000")
        print("Press Ctrl+C to stop the server")
        import subprocess
        subprocess.run([sys.executable, "web_server.py"])
    elif args.query:
        single_query_mode(args.query)
    else:
        interactive_mode()


if __name__ == "__main__":
    main()
