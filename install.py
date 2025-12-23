#!/usr/bin/env python3
"""
Installation script for MoveDot Analytics Agent.
Automates the initial setup of the development environment.
"""

import sys
import subprocess
import platform
import shutil
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
    
    # Check Python version (3.9+ as per README)
    if sys.version_info < (3, 9):
        print("[ERROR] Python 3.9 or higher is required")
        print(f"Current version: {sys.version.split()[0]}")
        sys.exit(1)
    
    print(f"[SUCCESS] Python {sys.version.split()[0]} detected")
    
    # Check if virtual environment already exists
    venv_path = Path("venv")
    if venv_path.exists():
        print("[INFO] Virtual environment already exists")
        response = input("[QUESTION] Recreate virtual environment? (y/N): ").strip().lower()
        if response == 'y':
            print("[INFO] Removing existing virtual environment...")
            shutil.rmtree(venv_path)
            # Create new virtual environment
            if not run_command("python3 -m venv venv", "Creating virtual environment"):
                print("[ERROR] Failed to create virtual environment")
                sys.exit(1)
        else:
            print("[INFO] Using existing virtual environment")
    else:
        # Create virtual environment if it doesn't exist
        if not run_command("python3 -m venv venv", "Creating virtual environment"):
            print("[ERROR] Failed to create virtual environment")
            sys.exit(1)
    
    # Determine pip command based on OS
    if platform.system() == "Windows":
        pip_command = "venv\\Scripts\\pip"
    else:
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
    directories = ["data", "exports"]
    for directory in directories:
        Path(directory).mkdir(parents=True, exist_ok=True)
        print(f"[SUCCESS] Created/verified {directory}/ directory")
    
    # Handle .env file from .env.example
    env_file = Path(".env")
    env_example = Path(".env.example")
    
    if not env_file.exists():
        if env_example.exists():
            print("[INFO] Creating .env file from .env.example...")
            shutil.copy(env_example, env_file)
            print("[SUCCESS] Created .env file from .env.example")
        else:
            print("[WARNING] .env.example not found - you'll need to create .env manually")
    else:
        print("[SUCCESS] .env file already exists")
    
    print("\n" + "=" * 60)
    print("[SUCCESS] Installation completed successfully!")
    print("=" * 60)
    print("Next steps:")
    print("1. Start web interface: ./bin/run_web.sh")
    print("2. Open http://localhost:8000 in your browser")
    print("=" * 60)

if __name__ == "__main__":
    main()
