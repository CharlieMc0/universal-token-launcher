"""Chain configuration utility module."""

import os
import json
from typing import Dict, Any, Optional

from app.utils.logger import logger

# Global variable to store chain configurations
_chain_configs = {}


def load_chain_configs():
    """Load chain configurations from the rpc_config.json file."""
    global _chain_configs
    
    # Path to config file relative to this module
    config_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'rpc_config.json')
    
    try:
        if os.path.exists(config_path):
            with open(config_path, 'r') as f:
                _chain_configs = json.load(f)
                logger.info(f"Loaded chain configurations for {len(_chain_configs)} chains")
        else:
            logger.warning(f"Chain configuration file not found at: {config_path}")
            _chain_configs = {}
    except Exception as e:
        logger.error(f"Error loading chain configurations: {str(e)}")
        _chain_configs = {}


def get_chain_config(chain_id: int) -> Optional[Dict[str, Any]]:
    """
    Get the configuration for a specific chain.
    
    Args:
        chain_id: The chain ID as an integer
        
    Returns:
        The chain configuration as a dictionary, or None if not found
    """
    # Ensure configs are loaded
    if not _chain_configs:
        load_chain_configs()
    
    # Convert chain_id to string for JSON dictionary lookup
    chain_id_str = str(chain_id)
    
    # Check if the chain ID exists in the configuration
    if chain_id_str in _chain_configs:
        chain_config = _chain_configs[chain_id_str]
        
        # Check for environment variable override for RPC URL
        env_var_name = f"{chain_config['name'].replace(' ', '_').upper()}_RPC_URL"
        custom_rpc_url = os.getenv(env_var_name)
        if custom_rpc_url:
            logger.info(f"Using custom RPC URL for {chain_config['name']} from {env_var_name}")
            chain_config = chain_config.copy()  # Create a copy to avoid modifying the original
            chain_config['rpc_url'] = custom_rpc_url
        
        return chain_config
    
    # Chain ID not found
    logger.warning(f"No configuration found for chain ID {chain_id}")
    return None


def get_supported_chains(testnet_only=False, mainnet_only=False) -> Dict[str, Dict[str, Any]]:
    """
    Get all supported chains, with optional filtering.
    
    Args:
        testnet_only: If True, return only testnet chains
        mainnet_only: If True, return only mainnet chains
        
    Returns:
        Dictionary of supported chains with chain IDs as keys
    """
    # Ensure configs are loaded
    if not _chain_configs:
        load_chain_configs()
    
    if testnet_only and mainnet_only:
        logger.warning("Both testnet_only and mainnet_only are True, returning all chains")
        return _chain_configs
    
    if testnet_only:
        return {k: v for k, v in _chain_configs.items() if v.get('testnet', False)}
    
    if mainnet_only:
        return {k: v for k, v in _chain_configs.items() if not v.get('testnet', False)}
    
    return _chain_configs


# Load configurations when module is imported
load_chain_configs() 