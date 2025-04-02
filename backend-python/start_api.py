#!/usr/bin/env python
"""
Script to start the Universal Token Deployment Service API.
This script ensures that:
1. The correct Python environment is used (Python 3.11)
2. The necessary environment variables are set
3. The database migration is run if needed
4. The API server is started with CORS support for frontend integration
"""

import os
import sys
import platform


# Check Python version
if sys.version_info.major != 3 or sys.version_info.minor != 11:
    print("Error: This application requires Python 3.11")
    print(f"Current version: {platform.python_version()}")
    print("Please run this script using Python 3.11:")
    print("  python3.11 start_api.py")
    sys.exit(1)

# Add current directory to python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    import uvicorn
    from app.app import app, Config
    from app.db import engine, Base
    from app.utils.logger import logger
    from app.utils.web3_helper import load_contract_data
except ImportError as e:
    print(f"Error: {e}")
    print("Please make sure all dependencies are installed:")
    print("  source venv_311/bin/activate")
    print("  pip install -r requirements.txt")
    sys.exit(1)


def setup_database():
    """Create database tables if they don't exist."""
    try:
        # Create all tables defined by SQLAlchemy models
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created or confirmed to exist")
        return True
    except Exception as e:
        logger.error(f"Database setup failed: {str(e)}")
        return False


def start_api_server():
    """Start the API server."""
    # First reload contract data to ensure latest artifacts are used
    load_contract_data()
    
    # Setup database
    if not setup_database():
        logger.error("Database setup failed, aborting server start")
        return False
    
    print("Starting the Universal Token Deployment Service API...")
    logger.info(
        "Starting API server on http://%s:%d",
        Config.HOST,
        Config.PORT
    )
    
    # Start the uvicorn server
    uvicorn.run(
        app,
        host=Config.HOST,
        port=Config.PORT,
        log_level="info"
    )
    return True


if __name__ == "__main__":
    try:
        # Print a banner
        print("=" * 80)
        print(" Universal Token Deployment Service ".center(80, "="))
        print("=" * 80)
        print("Environment:", Config.ENV)
        print("Port:", Config.PORT)
        print("Database:", Config.DB_DATABASE)
        print("=" * 80)
        
        # Start the API server
        start_api_server()
    except KeyboardInterrupt:
        print("\nShutting down gracefully...")
    except Exception as e:
        print(f"Error starting server: {str(e)}")
        sys.exit(1) 