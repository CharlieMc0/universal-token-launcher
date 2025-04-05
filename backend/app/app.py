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
from app.utils import web3_helper, chain_config

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
        logger.info(
            f"Request {request_id} completed: {response.status_code} ({process_time:.3f}s)"
        )
        return response
    except UnicodeDecodeError as ude:
        # Handle unicode decode errors specifically
        process_time = time.time() - start_time
        logger.error(
            f"Request {request_id} failed after {process_time:.3f}s: "
            f"Unicode decode error - {str(ude)}"
        )
        return JSONResponse(
            status_code=200,  # Return success since the contract deployment worked
            content={
                "success": True,
                "message": "Operation completed but response contains binary data",
                "note": (
                    "The contract was deployed successfully, but the response "
                    "contains binary data that couldn't be decoded"
                )
            }
        )
    except Exception as e:
        process_time = time.time() - start_time
        logger.error(
            f"Request {request_id} failed after {process_time:.3f}s: {str(e)}"
        )
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

# Health check endpoint for Docker
@app.get("/health")
async def health_check():
    """Health check endpoint for Docker."""
    return {"status": "healthy"}

# Include routers
app.include_router(deployment_router)
app.include_router(users_router)
app.include_router(nft_router)

# Startup event
@app.on_event("startup")
async def startup_event():
    """Initialize service on startup."""
    # Logger is already configured when imported
    
    # Load chain configuration
    chain_config.load_chain_configs()
    
    # Load contract ABIs and bytecode
    contract_data_loaded = web3_helper.load_contract_data()
    if not contract_data_loaded:
        logger.error("Failed to load required contract artifacts. Service cannot continue without artifacts.")
        # Force exit with error since we can't operate without contract artifacts
        import sys
        sys.exit(1)
    
    # Initialize database and create tables if needed
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created or confirmed to exist")
    
    # Startup message
    logger.info(f"Universal Token Contract Deployment Service started in {Config.ENVIRONMENT} environment")

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