import os
from dotenv import load_dotenv
from typing import Dict, Any

# Load environment variables
load_dotenv()


class Config:
    # Application settings
    APP_NAME = "Universal Token Contract Deployment Service"
    DEBUG = os.getenv("DEBUG", "false").lower() == "true"
    ENVIRONMENT = os.getenv("NODE_ENV", "development")
    
    # Server settings
    PORT = int(os.getenv("PORT", "8000"))
    HOST = os.getenv("HOST", "0.0.0.0")
    
    # Database settings
    DB_USERNAME = os.getenv("DB_USERNAME", "postgres")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "postgres")
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_PORT = os.getenv("DB_PORT", "5432")
    DB_DATABASE = os.getenv("DB_DATABASE", "universal_token_registry")
    DB_URL = (f"postgresql://{DB_USERNAME}:{DB_PASSWORD}@"
              f"{DB_HOST}:{DB_PORT}/{DB_DATABASE}")
    
    # Blockchain settings
    DEPLOYER_PRIVATE_KEY = os.getenv("DEPLOYER_PRIVATE_KEY", "")
    ZETA_CHAIN_ID = "7001"  # ZetaChain Testnet
    
    # Explorer API keys
    ETHERSCAN_API_KEY = os.getenv("ETHERSCAN_API_KEY", "")
    POLYGONSCAN_API_KEY = os.getenv("POLYGONSCAN_API_KEY", "")
    BSCSCAN_API_KEY = os.getenv("BSCSCAN_API_KEY", "")
    BASESCAN_API_KEY = os.getenv("BASESCAN_API_KEY", "")
    ARBISCAN_API_KEY = os.getenv("ARBISCAN_API_KEY", "")
    OPTIMISM_API_KEY = os.getenv("OPTIMISM_API_KEY", "")
    BLOCKSCOUT_API_KEY = os.getenv("BLOCKSCOUT_API_KEY", "")
    
    # Logging settings
    LOG_LEVEL = os.getenv("LOG_LEVEL", "info")
    
    @classmethod
    def get_config(cls) -> Dict[str, Any]:
        """Get configuration as dictionary."""
        return {
            "DEPLOYER_PRIVATE_KEY": cls.DEPLOYER_PRIVATE_KEY,
            "ZETA_CHAIN_ID": cls.ZETA_CHAIN_ID,
            "ETHERSCAN_API_KEY": cls.ETHERSCAN_API_KEY,
            "POLYGONSCAN_API_KEY": cls.POLYGONSCAN_API_KEY,
            "BSCSCAN_API_KEY": cls.BSCSCAN_API_KEY,
            "BASESCAN_API_KEY": cls.BASESCAN_API_KEY,
            "ARBISCAN_API_KEY": cls.ARBISCAN_API_KEY,
            "OPTIMISM_API_KEY": cls.OPTIMISM_API_KEY,
            "BLOCKSCOUT_API_KEY": cls.BLOCKSCOUT_API_KEY,
        }


# Convenience function
def get_config():
    return Config.get_config()


# Import chain_config here to avoid circular imports
from app.utils.chain_config import get_chain_config 