#!/usr/bin/env python3
"""
Simple installation script for MoveDot Analytics Agent.
"""

import os
import sys
import subprocess
import platform
from pathlib import Path

def run_command(command, description):
    """Run a command and handle errors."""
    print(f"[INFO] {description}...")
    try:
        result = subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
        print(f"[SUCCESS] {description} completed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"[ERROR] {description} failed: {e}")
        if e.stdout:
            print(f"Output: {e.stdout}")
        if e.stderr:
            print(f"Error: {e.stderr}")
        return False

def main():
    """Main installation function."""
    print("MoveDot Data Analytics Agent - Installation")
    print("=" * 60)
    
    # Check Python version
    if sys.version_info < (3, 8):
        print("[ERROR] Python 3.8 or higher is required")
        sys.exit(1)
    
    print(f"[SUCCESS] Python {sys.version.split()[0]} detected")
    
    # Create virtual environment
    if not run_command("python3 -m venv venv", "Creating virtual environment"):
        print("[ERROR] Failed to create virtual environment")
        sys.exit(1)
    
    # Determine activation script based on OS
    if platform.system() == "Windows":
        activate_script = "venv\\Scripts\\activate"
        pip_command = "venv\\Scripts\\pip"
    else:
        activate_script = "venv/bin/activate"
        pip_command = "venv/bin/pip"
    
    # Install requirements
    if not run_command(f"{pip_command} install --upgrade pip", "Upgrading pip"):
        print("[ERROR] Failed to upgrade pip")
        sys.exit(1)
    
    if not run_command(f"{pip_command} install -r requirements.txt", "Installing dependencies"):
        print("[ERROR] Failed to install dependencies")
        sys.exit(1)
    
    # Create necessary directories
    print("[INFO] Creating directories...")
    directories = ["data", "plots"]
    for directory in directories:
        Path(directory).mkdir(exist_ok=True)
        print(f"[SUCCESS] Created {directory}/ directory")
    
    # Create .env file if it doesn't exist
    env_file = Path(".env")
    if not env_file.exists():
        print("[INFO] Creating .env file...")
        env_content = """# MoveDot Analytics Agent - Environment Configuration

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
"""
        env_file.write_text(env_content)
        print("[SUCCESS] Created .env file")
        print("[WARNING] Please edit .env file and add your OpenAI API key")
    else:
        print("[SUCCESS] .env file already exists")
    
    print("\n" + "=" * 60)
    print("[SUCCESS] Installation completed successfully!")
    print("=" * 60)
    print("Next steps:")
    print("1. Edit .env file and add your OpenAI API key")
    print("2. Run: ./scripts/bin/run_web.sh (Linux/Mac) or scripts/bin/run_web.bat (Windows)")
    print("3. Open http://localhost:8000 in your browser")
    print("=" * 60)

if __name__ == "__main__":
    main()
