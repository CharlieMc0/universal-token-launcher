#!/usr/bin/env python3

"""
Test script for verifying EVM contracts on Sepolia
using the updated verification service.
"""

import os
import asyncio
import argparse
import json
from app.services.verification import verification_service
from app.utils.chain_config import get_chain_config


async def test_sepolia_verification(contract_address, owner_address=None):
    """
    Test verification of an EVMUniversalToken contract on Sepolia.
    
    Args:
        contract_address: The address of the deployed contract to verify
        owner_address: Owner address used in constructor (optional)
    """
    print("\n=== Sepolia Contract Verification Test ===")
    chain_id = "11155111"  # Sepolia
    
    # Check if Sepolia API key is available
    sepolia_api_key = (os.environ.get("SEPOLIA_API_KEY") or 
                       os.environ.get("ETHERSCAN_API_KEY"))
    if not sepolia_api_key:
        print("❌ No Sepolia/Etherscan API key found in environment variables")
        print("Please set SEPOLIA_API_KEY or ETHERSCAN_API_KEY")
        return False
    
    print(f"✅ Found API key: {sepolia_api_key[:5]}...{sepolia_api_key[-5:]}")
    
    # Get chain configuration
    chain_config = get_chain_config(int(chain_id))
    if not chain_config:
        print(f"❌ Chain ID {chain_id} not configured")
        return False
    
    print(f"✅ Testing contract verification on {chain_config['name']}")
    print(f"Contract address: {contract_address}")
    
    # Check explorer URL
    explorer_url = chain_config.get('explorer_url')
    if not explorer_url:
        print("❌ No explorer URL configured for Sepolia")
        return False
    
    print(f"✅ Explorer URL: {explorer_url}")
    
    # Test verification through the service
    contract_args = None
    if owner_address:
        print(f"✅ Using owner address: {owner_address}")
        # Sample constructor args for EVMUniversalToken
        contract_args = {
            "name": "Universal Token",
            "symbol": "UTVT",
            "decimals": 18,
            "supply": 0,  # Initial supply for EVM is 0
            "owner": owner_address
        }
    
    try:
        # Direct verification with constructor args
        verification_result = await verification_service.verify_contract(
            contract_address=contract_address,
            chain_id=chain_id,
            contract_type="evm",
            contract_args=contract_args
        )
        
        print("\n=== Verification Response ===")
        print(json.dumps(verification_result, indent=2))
        
        if verification_result.get("success"):
            print("\n✅ Verification request submitted successfully!")
            print(f"Check status at: {explorer_url}/address/{contract_address}#code")
            return True
        else:
            print("\n❌ Verification request failed")
            print(f"Error: {verification_result.get('message')}")
            return False
    
    except Exception as e:
        print(f"\n❌ Exception during verification: {e}")
        return False


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Verify EVMUniversalToken contract on Sepolia"
    )
    parser.add_argument(
        "contract_address",
        help="Address of the deployed contract to verify"
    )
    parser.add_argument(
        "--owner",
        help="Owner address used in the constructor",
        default=None
    )
    
    args = parser.parse_args()
    
    # Run the verification test
    result = asyncio.run(test_sepolia_verification(args.contract_address, args.owner))
    
    # Exit with appropriate code
    if not result:
        print("\nVerification test failed")
        exit(1)
    else:
        print("\nVerification test completed successfully")
        exit(0) 