#!/bin/bash

# MoveDot Data Analytics - Web Server Startup Script

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
    echo "[WARNING] .env file not found"
    echo "Creating .env file..."
    cat > .env << EOF
# MoveDot Data Analytics Agent - Environment Configuration

# OpenAI API Key (Required)
OPENAI_API_KEY=your-openai-api-key-here

# Data Directory (Optional - defaults to ./data)
DATA_DIR=./data

# Server Configuration (Optional)
HOST=0.0.0.0
PORT=8000
DEBUG=True

# Logging Level (Optional)
LOG_LEVEL=INFO
EOF
    echo "[SUCCESS] Created .env file"
    echo "[WARNING] Please edit .env file and add your OpenAI API key"
fi

# Check if OpenAI API key is set
if grep -q "your-openai-api-key-here" .env; then
    echo "[WARNING] Please set your OpenAI API key in the .env file"
    echo "Edit .env file and replace 'your-openai-api-key-here' with your actual API key"
    exit 1
fi

# Create necessary directories
echo "[INFO] Creating directories..."
mkdir -p data plots web/static

# Start the web server
echo ""
echo "[INFO] Starting MoveDot Data Analytics Web Server..."
echo "============================================================"
echo "Web Interface: http://localhost:8000"
echo "Dashboard: http://localhost:8000"
echo "API Docs: http://localhost:8000/docs"
echo "============================================================"
echo "Press Ctrl+C to stop the server"
echo "============================================================"

# Start the server
python3 -m src.api.main
