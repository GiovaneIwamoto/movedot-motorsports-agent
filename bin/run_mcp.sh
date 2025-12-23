#!/bin/bash
# Script to run MCP servers locally for development and testing
#
# IMPORTANT: This script is for LOCAL DEVELOPMENT ONLY.
# 
# In production, MCP servers are automatically managed by the application:
# - Servers are configured through the web interface at /mcp-servers.html
# - The application automatically starts/stops MCP servers as needed
# - Servers are loaded when users authenticate via ensure_user_mcp_servers_loaded_async()
#
# This script is useful for:
# - Testing MCP servers locally before adding them to the web interface
# - Development and debugging of MCP server implementations
# - Running standalone MCP servers for manual testing
#
# To add your own MCP server:
# 1. Create your MCP server in src/integrations/your_server_name/
# 2. Update the command below to point to your server:
#    python -m src.integrations.your_server_name.server
# 3. Or modify this script to accept server name as argument
#
# Example usage:
#   ./bin/run_mcp.sh                    # Run default server
#   python -m src.integrations.my_server.server  # Run your custom server

# Get the directory where this script is located and navigate to project root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"
cd "$PROJECT_ROOT"

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    source venv/bin/activate
fi

# Run the MCP server
# TODO: Replace with your MCP server module path
# Example: python -m src.integrations.your_server_name.server
python -m src.integrations.mcp_openf1.server
