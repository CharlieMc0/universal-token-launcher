from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

from app.core.config import settings
from app.api import auth, tokens, transfers, distributions
from app.models import Base
from app.models.database import engine

# Create database tables if they don't exist
Base.metadata.create_all(bind=engine)

# Create the FastAPI app
app = FastAPI(
    title=settings.PROJECT_NAME,
    description="API for launching universal tokens across multiple chains using ZetaChain.",
    version=settings.VERSION,
    debug=settings.DEBUG,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
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
app.include_router(auth.router)
app.include_router(tokens.router)
app.include_router(transfers.router)
app.include_router(distributions.router)

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
        "version": settings.VERSION,
        "name": settings.PROJECT_NAME
    }


@app.get("/health", tags=["health"])
async def health_check():
    """
    Health check endpoint.
    """
    return {"status": "healthy"} 