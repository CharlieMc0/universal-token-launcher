import os
from dotenv import load_dotenv
from typing import Dict, Any, Optional

# Load environment variables
load_dotenv()


class Config:
    # Application settings
    APP_NAME = "Universal Token Contract Deployment Service"
    DEBUG = os.getenv("DEBUG", "false").lower() == "true"
    ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
    
    # Server settings
    PORT = int(os.getenv("PORT", "8000"))
    HOST = os.getenv("HOST", "0.0.0.0")
    
    # Database settings
    DB_USERNAME = os.getenv("DB_USERNAME", "postgres")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "postgres")
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_PORT = os.getenv("DB_PORT", "5432")
    DB_DATABASE = os.getenv("DB_DATABASE", "universal_token_registry")
    DB_URL = (
        f"postgresql://{DB_USERNAME}:{DB_PASSWORD}@"
        f"{DB_HOST}:{DB_PORT}/{DB_DATABASE}"
    )
    
    # Blockchain settings
    DEPLOYER_PRIVATE_KEY = os.getenv("DEPLOYER_PRIVATE_KEY", "")
    ZETA_CHAIN_ID = "7001"  # ZetaChain Testnet
    
    # Universal Token settings
    UNIVERSAL_TOKEN_GAS_LIMIT_ZC = int(os.getenv("UNIVERSAL_TOKEN_GAS_LIMIT_ZC", "500000"))
    UNIVERSAL_TOKEN_GAS_LIMIT_EVM = int(os.getenv("UNIVERSAL_TOKEN_GAS_LIMIT_EVM", "500000"))
    
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
            "UNIVERSAL_TOKEN_GAS_LIMIT_ZC": cls.UNIVERSAL_TOKEN_GAS_LIMIT_ZC,
            "UNIVERSAL_TOKEN_GAS_LIMIT_EVM": cls.UNIVERSAL_TOKEN_GAS_LIMIT_EVM,
            "ETHERSCAN_API_KEY": cls.ETHERSCAN_API_KEY,
            "POLYGONSCAN_API_KEY": cls.POLYGONSCAN_API_KEY,
            "BSCSCAN_API_KEY": cls.BSCSCAN_API_KEY,
            "BASESCAN_API_KEY": cls.BASESCAN_API_KEY,
            "ARBISCAN_API_KEY": cls.ARBISCAN_API_KEY,
            "OPTIMISM_API_KEY": cls.OPTIMISM_API_KEY,
            "BLOCKSCOUT_API_KEY": cls.BLOCKSCOUT_API_KEY,
        }
    
    @classmethod
    def get_chain_config(cls, chain_id) -> Optional[Dict[str, Any]]:
        """Get chain configuration by chain ID."""
        # Import here to avoid circular imports
        from app.utils.chain_config import get_chain_config as get_chain_config_func
        return get_chain_config_func(chain_id)


# Convenience function
def get_config():
    return Config.get_config() 