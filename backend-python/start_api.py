#!/usr/bin/env python
"""
Simple script to start the API using uvicorn directly.
"""
import os
import sys
import subprocess

def main():
    """Run the app using uvicorn."""
    # Get the current directory
    current_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Build the command to run uvicorn
    command = [
        sys.executable, "-m", "uvicorn", 
        "app.app:app", 
        "--host", "0.0.0.0", 
        "--port", "8000"
    ]
    
    # Print what we're going to run
    print(f"Running command: {' '.join(command)}")
    
    # Run the command
    try:
        subprocess.run(command, check=True, cwd=current_dir)
    except subprocess.CalledProcessError as e:
        print(f"Error running uvicorn: {e}")
    except FileNotFoundError:
        print("Error: uvicorn not found. Make sure it's installed:")
        print("pip install uvicorn")

if __name__ == "__main__":
    main() 