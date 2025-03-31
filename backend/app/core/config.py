import os
from typing import List, Dict, Optional
from dotenv import load_dotenv
from pydantic_settings import BaseSettings
from pydantic import field_validator
import json

# Load environment variables from .env file
load_dotenv()

class Settings(BaseSettings):
    # Database
    DATABASE_URL: str
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_HOST: str
    POSTGRES_PORT: str
    POSTGRES_DB: str

    # Server
    PORT: int = 8001
    HOST: str = "0.0.0.0"
    DEBUG: bool = False

    # JWT
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # Google Cloud Storage
    GCP_PROJECT_ID: str
    GCP_BUCKET_NAME: str
    GCP_CREDENTIALS_FILE: str

    # ZetaChain
    ZETA_CHAIN_RPC_URL: str
    UNIVERSAL_TOKEN_SERVICE_WALLET: str
    FIXED_ZETA_FEE: int

    # CORS
    CORS_ORIGINS: List[str]

    # Supported Chains
    SUPPORTED_CHAINS: List[str]

    # Chain RPC URLs
    CHAIN_RPC_URLS: Dict[str, str]

    # Deployer Wallet
    DEPLOYER_WALLET: str
    DEPLOYER_PRIVATE_KEY: str

    # Storage
    STORAGE_BUCKET: str

    @field_validator("CORS_ORIGINS")
    @classmethod
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            return json.loads(v)
        return v

    @field_validator("SUPPORTED_CHAINS")
    @classmethod
    def parse_supported_chains(cls, v):
        if isinstance(v, str):
            return json.loads(v)
        return v

    @field_validator("CHAIN_RPC_URLS")
    @classmethod
    def parse_chain_rpc_urls(cls, v):
        if isinstance(v, str):
            return json.loads(v)
        return v

    class Config:
        env_file = ".env"
        case_sensitive = True

# Create global settings instance
settings = Settings() 