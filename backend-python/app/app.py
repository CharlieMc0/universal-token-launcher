import uvicorn
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import time

from app.config import Config
from app.utils.logger import logger
from app.routes.deployment import router as deployment_router
from app.routes.users import router as users_router
from app.routes.nft import router as nft_router
from app.models.base import engine, Base

# Initialize FastAPI app
app = FastAPI(
    title="Universal Token Contract Deployment Service",
    description="API for deploying and managing universal tokens across multiple blockchains",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add middleware for request logging
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log incoming requests and their processing time."""
    request_id = str(int(time.time() * 1000))
    start_time = time.time()
    
    # Log request details
    logger.info(f"Request {request_id} started: {request.method} {request.url.path}")
    
    # Process the request
    try:
        response = await call_next(request)
        process_time = time.time() - start_time
        logger.info(f"Request {request_id} completed: {response.status_code} ({process_time:.3f}s)")
        return response
    except Exception as e:
        process_time = time.time() - start_time
        logger.error(f"Request {request_id} failed after {process_time:.3f}s: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal Server Error"}
        )

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint to check if the service is running."""
    return {
        "name": Config.APP_NAME,
        "status": "running",
        "environment": Config.ENVIRONMENT
    }

# Include routers
app.include_router(deployment_router)
app.include_router(users_router)
app.include_router(nft_router)

# Startup event
@app.on_event("startup")
async def startup_event():
    """Initialize services on application startup."""
    try:
        # Create database tables if they don't exist
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created or confirmed to exist")
        
        # Log application startup
        logger.info(f"{Config.APP_NAME} started in {Config.ENVIRONMENT} environment")
    except Exception as e:
        logger.error(f"Error during application startup: {str(e)}")
        # Let the application start anyway, as the database might be created separately

# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    """Clean up resources on application shutdown."""
    logger.info(f"{Config.APP_NAME} shutting down")

if __name__ == "__main__":
    """
    Main entry point for the application.
    Run using "python -m app.app" from the root directory.
    """
    # Get configuration from environment
    port = Config.PORT
    host = Config.HOST
    debug = Config.DEBUG
    
    # Start the Uvicorn server
    uvicorn.run(
        "app.app:app",
        host=host,
        port=port,
        reload=debug,
        log_level="info"
    ) 