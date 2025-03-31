import os
from typing import List, Optional
from dotenv import load_dotenv
from pydantic_settings import BaseSettings
from pydantic import field_validator

# Load environment variables from .env file
load_dotenv()

class Settings(BaseSettings):
    PROJECT_NAME: str = "Universal Token Launcher"
    VERSION: str = "0.1.0"
    API_V1_STR: str = "/api/v1"
    
    # Database settings
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_HOST: str
    POSTGRES_PORT: str
    POSTGRES_DB: str
    DATABASE_URL: Optional[str] = None

    # JWT Settings
    JWT_SECRET_KEY: str = "your_jwt_secret_key"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # Google Cloud Storage Configuration
    GCP_PROJECT_ID: Optional[str] = None
    GCP_BUCKET_NAME: str = "universal-token-launcher"
    GCP_CREDENTIALS_FILE: Optional[str] = None

    # ZetaChain Configuration
    ZETA_CHAIN_RPC_URL: str = "https://zetachain-athens.g.allthatnode.com/archive/evm"
    UNIVERSAL_TOKEN_SERVICE_WALLET: str = "0x1234567890123456789012345678901234567890"
    FIXED_ZETA_FEE: float = 1

    # Server Configuration
    PORT: int = 8000
    DEBUG: bool = False
    CORS_ORIGINS: str = "http://localhost:5500,http://localhost:8000"

    @field_validator("CORS_ORIGINS")
    def parse_cors_origins(cls, v: str) -> List[str]:
        return [origin.strip() for origin in v.split(",")]

    # File Storage
    MAX_CSV_ROWS: int = 100
    ALLOWED_ICON_EXTENSIONS: List[str] = ["jpg", "jpeg", "png", "svg", "webp"]
    MAX_ICON_SIZE: int = 2 * 1024 * 1024  # 2MB in bytes

    # Supported Chains
    SUPPORTED_CHAINS: str = "1,137,56,43114,42161"
    CHAIN_NAMES: dict = {
        1: "Ethereum",
        137: "Polygon",
        56: "BNB Chain",
        43114: "Avalanche",
        42161: "Arbitrum"
    }

    @field_validator("SUPPORTED_CHAINS")
    def parse_supported_chains(cls, v: str) -> List[int]:
        return [int(chain.strip()) for chain in v.split(",")]

    @property
    def DATABASE_URL(self) -> str:
        """Get the database URL."""
        if self.DATABASE_URL:
            return self.DATABASE_URL
        return (
            f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    class Config:
        env_file = ".env"

# Create global settings instance
settings = Settings() 