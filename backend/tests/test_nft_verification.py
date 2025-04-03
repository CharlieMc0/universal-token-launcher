#!/usr/bin/env python3

"""Test script for NFT contract verification."""

import requests
import json
import sys
import os
import time
import pytest

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import app config
from app.config import Config

# API URL 
API_URL = f"http://{Config.HOST}:{Config.PORT}"

@pytest.fixture
def contract_address():
    """Fixture providing a test NFT contract address for verification."""
    # This is a sample contract address - update with a real one if needed
    return "0xB0f7cbd91290265079d1e15C0dC71b0450A7E2e5"


def test_nft_verification_api(contract_address, chain_id="7001"):
    """Test the NFT contract verification API."""
    
    print("\n===== Testing NFT Contract Verification API =====")
    print(f"Contract Address: {contract_address}")
    print(f"Chain ID: {chain_id}")
    
    try:
        # Prepare verification data
        verification_data = {
            "contract_address": contract_address,
            "chain_id": chain_id,
            "contract_type": "zetachain" if chain_id in ["7000", "7001"] else "evm"
        }
        
        print("Verification data:")
        print(json.dumps(verification_data, indent=2))
        
        # Make API request
        response = requests.post(
            f"{API_URL}/api/nft/verify",
            json=verification_data,
            timeout=30
        )
        
        # Print response
        print("\nVerification Response:")
        print(f"Status Code: {response.status_code}")
        
        # Pretty print JSON response
        try:
            response_json = response.json()
            print(json.dumps(response_json, indent=2))
            
            if response_json.get("success"):
                print("✅ Verification initiated successfully")
                print(f"Verification Status: {response_json.get('verification_status', 'unknown')}")
                return True
            else:
                print("❌ Verification failed: {response_json.get('message', 'Unknown error')}")
                if response_json.get("errors"):
                    print(f"Errors: {response_json.get('errors')}")
                return False
            
        except json.JSONDecodeError:
            print("Error decoding JSON response")
            print(response.text)
            return False
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return False


def main():
    """Main entry point for the test script."""
    if len(sys.argv) > 1:
        contract_address = sys.argv[1]
    else:
        # Use a default NFT contract address from a previous successful deployment
        contract_address = "0xB0f7cbd91290265079d1e15C0dC71b0450A7E2e5"  # Example address
    
    chain_id = "7001"  # ZetaChain Testnet
    
    # Test NFT verification
    test_nft_verification_api(contract_address, chain_id)


if __name__ == "__main__":
    main() 