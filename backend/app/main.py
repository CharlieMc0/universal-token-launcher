from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

from app.core.config import settings
from app.api import tokens, transfers, distributions, auth
from app.db.session import engine
from app.db.base import Base

# Create database tables if they don't exist
Base.metadata.create_all(bind=engine)

# Create the FastAPI app
app = FastAPI(
    title="Universal Token Launcher",
    version="1.0.0",
    description="API for deploying and managing universal tokens across multiple chains"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(auth.router, prefix="/api", tags=["auth"])
app.include_router(tokens.router, prefix="/api", tags=["tokens"])
app.include_router(transfers.router, prefix="/api", tags=["transfers"])
app.include_router(distributions.router, prefix="/api", tags=["distributions"])

# Create upload directory for local file storage if it doesn't exist
os.makedirs("./uploads/csv", exist_ok=True)
os.makedirs("./uploads/icons", exist_ok=True)


@app.get("/", tags=["root"])
async def root():
    """
    Root endpoint for health check.
    """
    return {
        "status": "healthy",
        "version": "1.0.0",
        "name": "Universal Token Launcher"
    }


@app.get("/health", tags=["health"])
async def health_check():
    """
    Health check endpoint.
    """
    return {"status": "healthy"} 