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
        chain_config = _chain_configs[chain_id_str].copy()  # Create a copy to avoid modifying the original
        
        # Check for environment variable override for RPC URL
        chain_name_upper = chain_config['name'].replace(' ', '_').upper()
        
        # Check for RPC URL override
        rpc_env_var = f"{chain_name_upper}_RPC_URL"
        custom_rpc_url = os.getenv(rpc_env_var)
        if custom_rpc_url:
            logger.info(f"Using custom RPC URL for {chain_config['name']} from {rpc_env_var}")
            chain_config['rpc_url'] = custom_rpc_url
        
        # Check for API key (for Etherscan-like explorers)
        # First try chain-specific API key env var
        api_key_env_vars = [
            f"{chain_name_upper}_API_KEY",  # e.g., SEPOLIA_TESTNET_API_KEY
            f"{chain_name_upper.split('_')[0]}_API_KEY"  # e.g., SEPOLIA_API_KEY
        ]
        
        # Add explorer-specific env var if explorer_url exists
        if chain_config.get('explorer_url'):
            explorer_domain = chain_config['explorer_url'].split('//')[1].split('.')[0].upper()
            api_key_env_vars.append(f"{explorer_domain}_API_KEY")  # e.g., ETHERSCAN_API_KEY
        
        # Check all possible env var names
        for env_var in api_key_env_vars:
            api_key = os.getenv(env_var)
            if api_key:
                logger.info(f"Using API key for {chain_config['name']} from {env_var}")
                chain_config['api_key'] = api_key
                break
                
        # Set the API URL for Etherscan-like explorers
        if chain_config.get('explorer_url') and not chain_config.get('api_url'):
            explorer_base = chain_config['explorer_url'].rstrip('/')
            chain_config['api_url'] = f"{explorer_base}/api"
            logger.info(f"Set API URL for {chain_config['name']}: {chain_config['api_url']}")
        
        return chain_config
    
    # Chain ID not found
    logger.warning(f"No configuration found for chain ID {chain_id}")
    return None


def get_chain_details(chain_id: int) -> Optional[Dict[str, Any]]:
    """
    Alias for get_chain_config for backward compatibility.
    
    Args:
        chain_id: The chain ID as an integer
        
    Returns:
        The chain configuration dictionary, or None if not found
    """
    return get_chain_config(chain_id)


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


def get_enabled_chains(testnet_only=False, mainnet_only=False) -> Dict[str, Dict[str, Any]]:
    """
    Get all enabled chains, with optional filtering.
    
    Args:
        testnet_only: If True, return only enabled testnet chains
        mainnet_only: If True, return only enabled mainnet chains
        
    Returns:
        Dictionary of enabled chains with chain IDs as keys
    """
    # Get all supported chains with filtering
    chains = get_supported_chains(testnet_only, mainnet_only)
    
    # Filter to only include enabled chains
    enabled_chains = {k: v for k, v in chains.items() if v.get('enabled', True)}
    
    logger.info(f"Found {len(enabled_chains)} enabled chains")
    return enabled_chains


# Load configurations when module is imported
load_chain_configs() 