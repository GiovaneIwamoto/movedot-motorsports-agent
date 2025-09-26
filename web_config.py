"""
Configuration for the MoveDot Motorsports Analytics Web Interface.
"""

import os
from pathlib import Path

# Server Configuration
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", 8000))
DEBUG = os.getenv("DEBUG", "True").lower() == "true"

# API Configuration
API_BASE_URL = f"http://{HOST}:{PORT}/api"
WS_URL = f"ws://{HOST}:{PORT}/ws/chat"

# File Paths
PROJECT_ROOT = Path(__file__).parent
WEB_DIR = PROJECT_ROOT / "web"
STATIC_DIR = WEB_DIR / "static"
PLOTS_DIR = PROJECT_ROOT / "plots"
DATA_DIR = Path(os.getenv("DATA_DIR", PROJECT_ROOT / "data"))

# Ensure directories exist
for directory in [WEB_DIR, STATIC_DIR, PLOTS_DIR, DATA_DIR]:
    directory.mkdir(parents=True, exist_ok=True)

# Logging Configuration
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
LOG_FORMAT = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"

# CORS Configuration
CORS_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "http://127.0.0.1:3000",
]

# WebSocket Configuration
WS_HEARTBEAT_INTERVAL = 30  # seconds
WS_MAX_CONNECTIONS = 100

# Chat Configuration
MAX_MESSAGE_LENGTH = 1000
SESSION_TIMEOUT = 3600  # 1 hour in seconds

# Dashboard Configuration
METRICS_REFRESH_INTERVAL = 30  # seconds
CHART_MAX_ITEMS = 10

# Development Configuration
if DEBUG:
    print(f"Development mode enabled")
    print(f"Project root: {PROJECT_ROOT}")
    print(f"Web directory: {WEB_DIR}")
    print(f"Plots directory: {PLOTS_DIR}")
    print(f"Data directory: {DATA_DIR}")
