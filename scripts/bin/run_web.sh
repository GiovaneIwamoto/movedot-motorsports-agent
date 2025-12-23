#!/bin/bash

# MoveDot Data Analytics - Web Server Startup Script
# Run 'python install.py' first if this is your first time.

# Get the directory where this script is located and navigate to project root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../.." && pwd )"
cd "$PROJECT_ROOT"

echo "MoveDot Data Analytics Agent"
echo "=================================================="

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "[ERROR] Virtual environment not found"
    echo "Please run: python install.py"
    exit 1
fi

# Activate virtual environment
echo "[INFO] Activating virtual environment..."
source venv/bin/activate

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "[ERROR] .env file not found"
    echo "Please run: python install.py"
    exit 1
fi

# Create necessary directories
mkdir -p data plots frontend/{assets,css/{base,components,pages},js/{core,components,pages},pages}

# Start the web server
echo ""
echo "[INFO] Starting MoveDot Data Analytics Web Server..."
echo "============================================================"
echo "Web Interface: http://localhost:8000"
echo "API Docs: http://localhost:8000/docs"
echo "============================================================"
echo "Press Ctrl+C to stop the server"
echo "============================================================"

# Start the server
python3 -m src.api.main
