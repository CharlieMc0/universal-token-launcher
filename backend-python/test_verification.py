#!/usr/bin/env python3

"""Test ZetaChain contract verification via BlockScout API."""

import asyncio
import json
import os
from app.services.verification import VerificationService
from app.utils.web3_helper import (
    load_contract_data, 
    get_chain_config, 
    extract_compiler_version
)


async def test_zetachain_verification():
    """Test verification service for ZetaChain contracts using BlockScout API."""
    print("Testing ZetaChain contract verification via BlockScout API...")
    
    # Load contract data
    load_contract_data()
    
    # Sample contract address - replace with actual for testing
    contract_address = "0x7C1739ff2D1E3BaB231Cd728C6f99DadF801c60E"
    
    # Verify contract source files exist
    smart_contracts_dir = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "smart-contracts"
    )
    contract_files = [
        os.path.join(
            smart_contracts_dir, 
            "contracts", 
            "ZetaChainUniversalToken.sol"
        ),
        os.path.join(
            smart_contracts_dir, 
            "contracts", 
            "EVMUniversalToken.sol"
        )
    ]
    
    print("\nChecking for contract source files:")
    for file_path in contract_files:
        if os.path.exists(file_path):
            print(f"✅ Found: {file_path}")
            # Try to read and extract compiler version
            with open(file_path, 'r') as f:
                source = f.read()
                compiler_version = extract_compiler_version(source)
                print(f"  - Detected compiler version: {compiler_version}")
        else:
            print(f"❌ Missing: {file_path}")
    
    print("\nChecking RPC URLs and BlockScout URLs:")
    # Test ZetaChain chains to verify configuration
    zetachain_chains = [7001]  # ZetaChain mainnet and testnet
    for chain_id in zetachain_chains:
        chain_config = get_chain_config(chain_id)
        if chain_config:
            print(f"\nChain ID {chain_id} ({chain_config.get('name')}):")
            print(f"  - RPC URL: {chain_config.get('rpc_url')}")
            print(f"  - BlockScout URL: {chain_config.get('blockscout_url')}")
            if chain_config.get('blockscout_url'):
                api_url = f"{chain_config.get('blockscout_url').rstrip('/')}/api"
                print(f"  - API URL: {api_url}")
            else:
                print("  - ❌ No BlockScout URL configured")
        else:
            print(f"❌ Chain ID {chain_id} not configured")
    
    # Test ZetaChain testnet (7001)
    print("\n=== Testing ZetaChain Testnet (7001) ===")
    result = await VerificationService().verify_contract(
        contract_address=contract_address,
        chain_id="7001",
        contract_type="zetachain"
    )
    print(json.dumps(result, indent=2))
    
    # Test ZetaChain mainnet (7000)
    print("\n=== Testing ZetaChain Mainnet (7000) ===")
    result = await VerificationService().verify_contract(
        contract_address=contract_address,
        chain_id="7000",
        contract_type="zetachain"
    )
    print(json.dumps(result, indent=2))
    
    # Test other EVM chain for comparison (should fail without API key)
    print("\n=== Testing Ethereum Sepolia (11155111) ===")
    result = await VerificationService().verify_contract(
        contract_address=contract_address,
        chain_id="11155111",
        contract_type="evm"
    )
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    print("BlockScout API Verification Testing Utility")
    print("==========================================")
    msg1 = "This script tests the contract verification on BlockScout using their API."
    msg2 = "If verification works, you'll see a 'success: true' in the output."
    msg3 = "For actual verification, replace the sample contract address with a real one."
    print(msg1)
    print(msg2)
    print(msg3)
    print()
    asyncio.run(test_zetachain_verification()) 