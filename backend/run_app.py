"""
Simple script to run the FastAPI application.
Make sure to run 'pip install uvicorn' first in your virtual environment.
"""
import os
import sys

# Add current directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Run the application
if __name__ == "__main__":
    try:
        import uvicorn
        from app.app import app, Config
        
        print("Starting the Universal Token Contract Deployment Service...")
        uvicorn.run(
            app, 
            host=Config.HOST, 
            port=Config.PORT,
            log_level="info"
        )
    except ImportError as e:
        print(f"Error: {e}")
        print("Please make sure all dependencies are installed:")
        print("pip install -r requirements.txt") 