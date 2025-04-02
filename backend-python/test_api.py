#!/usr/bin/env python3
"""Test Universal Token Launcher API endpoints."""

import os
import sys
import json
import httpx
import asyncio

# Add the parent directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.utils.web3_helper import load_contract_data
from app.utils.chain_config import get_enabled_chains


# API Endpoints to test
BASE_URL = "http://localhost:8000"

# Test data
TEST_TOKEN = {
    "token_name": "Python API Test Token",
    "token_symbol": "PYTT",
    "decimals": 18,
    "total_supply": "1000000000000000000000000",
    "selected_chains": ["7001", "11155111"],  # ZetaChain testnet and Sepolia
    "deployer_address": "0x4f1684A28E33F42cdf50AB96e29a709e17249E63",
    "allocations": [
        {
            "address": "0x4f1684A28E33F42cdf50AB96e29a709e17249E63",
            "amount": "1000000000000000000000000"
        }
    ]
}

TEST_VERIFICATION = {
    "contract_address": "",  # Will be populated after deployment
    "chain_id": "7001",  # ZetaChain testnet
    "contract_type": "zetachain"
}


async def test_api_endpoints():
    """Test sequence of API calls to validate the API functionality."""
    print("\n=== Testing Universal Token Launcher API ===\n")
    
    print("1. Testing API connection...")
    async with httpx.AsyncClient() as client:
        # Test root endpoint
        response = await client.get(f"{BASE_URL}/")
        if response.status_code == 200:
            print(f"   ✅ API is accessible: {response.text}")
        else:
            print(f"   ❌ API connection error: {response.status_code}")
            return
    
    print("\n2. Getting available chains...")
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{BASE_URL}/api/chains")
        if response.status_code == 200:
            chains = response.json()
            print(f"   ✅ Received chain list. {len(chains['chains'])} chains available")
            for chain in chains['chains']:
                print(f"      - {chain['chain_id']}: {chain['name']} ({chain['currency_symbol']})")
                if chain['chain_id'] == 7001:
                    TEST_TOKEN['selected_chains'] = [str(chain['chain_id'])]
                    print(f"      - Selected {chain['name']} for test deployment")
        else:
            print(f"   ❌ Error getting chains: {response.status_code}")
    
    # Deploy a token (only if we need to test deployment)
    test_deployment = input("\n3. Do you want to test token deployment? (y/n): ")
    token_id = None
    contract_address = None
    
    if test_deployment.lower() == 'y':
        print("\n   Deploying test token...")
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{BASE_URL}/api/deploy", 
                json=TEST_TOKEN
            )
            
            if response.status_code == 200:
                result = response.json()
                token_id = result.get('token', {}).get('id')
                contract_address = result.get('token', {}).get('zc_contract_address')
                print(f"   ✅ Token deployed")
                print(f"      - Token ID: {token_id}")
                print(f"      - ZetaChain Contract: {contract_address}")
                # Store contract address for verification
                TEST_VERIFICATION["contract_address"] = contract_address
            else:
                print(f"   ❌ Deployment error: {response.status_code}")
                print(response.text)
        
        # If deployment was successful, get token info
        if token_id:
            print("\n4. Getting token information...")
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{BASE_URL}/api/token/{token_id}")
                if response.status_code == 200:
                    token_info = response.json()
                    print(f"   ✅ Token info retrieved")
                    print(f"      - Name: {token_info['token']['token_name']}")
                    print(f"      - Symbol: {token_info['token']['token_symbol']}")
                    print(f"      - Status: {token_info['token']['deployment_status']}")
                    print(f"      - ZetaChain: {token_info['token']['zc_contract_address']}")
                else:
                    print(f"   ❌ Error getting token info: {response.status_code}")
    else:
        print("   ⏩ Skipping token deployment")
        contract_address_input = input("   Enter a contract address to verify (or press Enter to skip): ")
        if contract_address_input:
            TEST_VERIFICATION["contract_address"] = contract_address_input
            contract_address = contract_address_input
    
    # Test contract verification if we have a contract address
    if contract_address:
        print("\n5. Testing contract verification...")
        print(f"   Verifying contract {TEST_VERIFICATION['contract_address']} on chain {TEST_VERIFICATION['chain_id']}")
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{BASE_URL}/api/verify", 
                json=TEST_VERIFICATION
            )
            
            if response.status_code == 200:
                result = response.json()
                print(f"   ✅ Verification request submitted")
                print(f"      - Success: {result.get('success')}")
                print(f"      - Status: {result.get('status')}")
                print(f"      - Message: {result.get('message')}")
                explorer_url = result.get('explorer_url')
                if explorer_url:
                    print(f"      - Explorer URL: {explorer_url}")
            else:
                print(f"   ❌ Verification error: {response.status_code}")
                print(response.text)
    else:
        print("\n5. ⏩ Skipping contract verification (no contract address available)")
    
    print("\n=== API Testing Complete ===")


if __name__ == "__main__":
    # Ensure contract data is loaded
    load_contract_data()
    
    print("Universal Token Launcher API Testing Utility")
    print("-------------------------------------------")
    print("This will test the API endpoints for deployment and verification.")
    print("Ensure the API server is running on http://localhost:8000\n")
    
    # Get available chains
    print("Available chains for testing:")
    chains = get_enabled_chains()
    for chain in chains:
        tag = "🔵" if chain.get("testnet") else "🟢"
        name = chain.get("name")
        chain_id = chain.get("chain_id")
        print(f"{tag} {name} (Chain ID: {chain_id})")
    
    input("\nPress Enter to begin testing...")
    asyncio.run(test_api_endpoints()) 