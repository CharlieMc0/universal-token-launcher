#!/usr/bin/env python3
"""
Test script to verify that the RPC configuration is properly loaded.
This helps ensure that the chain configuration is available for the deployment service.
"""

import os
import sys
import json
from typing import Dict, Any, List
import pytest

# Add the current directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.utils.chain_config import get_supported_chains
from app.utils.logger import logger


def verify_chain_config():
    """Verify that the RPC configuration can be properly loaded and accessed."""
    # Get all chains
    all_chains = get_supported_chains()
    
    if not all_chains:
        logger.error("No chains found in configuration. Check if rpc_config.json exists.")
        return False, "No chains found"
    
    # Filter for enabled chains
    enabled_chains = {
        chain_id: chain_info 
        for chain_id, chain_info in all_chains.items() 
        if chain_info.get('enabled', True)
    }
    
    # Filter for mainnets and testnets
    mainnet_chains = {
        chain_id: chain_info 
        for chain_id, chain_info in enabled_chains.items() 
        if not chain_info.get('testnet', False)
    }
    
    testnet_chains = {
        chain_id: chain_info 
        for chain_id, chain_info in enabled_chains.items() 
        if chain_info.get('testnet', False)
    }
    
    # Print summary
    print(f"\nTotal chains configured: {len(all_chains)}")
    print(f"Enabled chains: {len(enabled_chains)}")
    print(f"Enabled mainnet chains: {len(mainnet_chains)}")
    print(f"Enabled testnet chains: {len(testnet_chains)}")
    
    print("\nEnabled Mainnet Chains:")
    for chain_id, chain_info in mainnet_chains.items():
        print(f"  - {chain_info['name']} (Chain ID: {chain_id})")
    
    print("\nEnabled Testnet Chains:")
    for chain_id, chain_info in testnet_chains.items():
        print(f"  - {chain_info['name']} (Chain ID: {chain_id})")
    
    return True, f"Successfully loaded {len(enabled_chains)} enabled chains"


def verify_rpc_endpoints():
    """Verify that each chain has a valid RPC endpoint configuration."""
    # Get all enabled chains
    all_chains = get_supported_chains()
    enabled_chains = {
        chain_id: chain_info 
        for chain_id, chain_info in all_chains.items() 
        if chain_info.get('enabled', True)
    }
    
    valid_chains = []
    missing_rpc = []
    
    # Check each chain for RPC URL
    for chain_id, chain_info in enabled_chains.items():
        if chain_info.get('rpc_url'):
            valid_chains.append(chain_id)
        else:
            missing_rpc.append(chain_id)
    
    # Print results
    print(f"\nRPC URL validation:")
    print(f"  - Chains with valid RPC URL: {len(valid_chains)}")
    print(f"  - Chains missing RPC URL: {len(missing_rpc)}")
    
    if missing_rpc:
        print("\nChains missing RPC URL:")
        for chain_id in missing_rpc:
            print(f"  - {enabled_chains[chain_id]['name']} (Chain ID: {chain_id})")
    
    return len(missing_rpc) == 0, "All enabled chains have RPC URLs"


def test_chain_config():
    """Test that the chain configuration loads correctly."""
    success, message = verify_chain_config()
    assert success, message


def test_rpc_endpoints():
    """Test that all enabled chains have RPC endpoints."""
    success, message = verify_rpc_endpoints()
    assert success, message


if __name__ == "__main__":
    print("=== Verifying RPC Configuration ===")
    
    success, message = verify_chain_config()
    if not success:
        print(f"❌ Chain configuration verification failed: {message}")
        sys.exit(1)
    
    success, message = verify_rpc_endpoints()
    if not success:
        print(f"⚠️ RPC endpoint verification warning: Some chains are missing RPC URLs")
        # Don't exit with error, just warn
    
    print("\n✅ RPC configuration verification completed!")
    sys.exit(0) 