#!/usr/bin/env python3

"""Test script for NFT contract deployment and verification."""

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


# Shared variable to store contract address between tests
deployed_contract_address = None


@pytest.fixture
def contract_address():
    """Fixture providing a test NFT contract address for verification.
    
    If test_nft_deployment_api has successfully deployed a contract,
    use that address. Otherwise, use a fallback address.
    """
    if deployed_contract_address:
        return deployed_contract_address
    
    # Fallback address if no contract was just deployed
    return "0xB0f7cbd91290265079d1e15C0dC71b0450A7E2e5"


def test_nft_deployment_api():
    """Test the NFT contract deployment API."""
    global deployed_contract_address
    
    print("\n===== Testing NFT Contract Deployment API =====")
    
    try:
        # Prepare deployment data
        deployment_data = {
            "contract_name": "TestNFT",
            "collection_name": "Test NFT Collection",
            "collection_symbol": "TNFT",
            "chain_id": "7001",
            "owner_address": "0x358AA13c52544ECCEF6B0ADD0f801012ADAD5eE3",
            "mint_amount": 5,
            # Add missing required fields
            "base_uri": "https://example.com/metadata/",
            "max_supply": 1000,
            "selected_chains": ["7001"],
            "deployer_address": "0x358AA13c52544ECCEF6B0ADD0f801012ADAD5eE3"
        }
        
        print("Deployment data:")
        print(json.dumps(deployment_data, indent=2))
        
        # Make API request
        response = requests.post(
            f"{API_URL}/api/nft/deploy",
            json=deployment_data,
            timeout=120  # Longer timeout for deployment
        )
        
        # Print response
        print("\nDeployment Response:")
        print(f"Status Code: {response.status_code}")
        
        # Pretty print JSON response
        try:
            response_json = response.json()
            print(json.dumps(response_json, indent=2))
            
            if response_json.get("success"):
                print("✅ Deployment successful")
                
                # Extract contract address from nested structure
                zeta_chain_details = response_json.get("deployment", {}).get("details", {}).get("zetaChain", {})
                if zeta_chain_details and zeta_chain_details.get("success"):
                    contract_address = zeta_chain_details.get("contract_address")
                    deployed_contract_address = contract_address  # Store for fixture
                    chain_id = "7001"  # ZetaChain testnet
                    print(f"Contract Address: {contract_address}")
                    print(f"Chain ID: {chain_id}")
                    
                    # Don't verify here - let pytest run the verification test separately
                    return contract_address
                else:
                    print("❌ Contract address not found in response")
                    return None
            else:
                print("❌ Deployment failed")
                return None
            
        except json.JSONDecodeError:
            print("Error decoding JSON response")
            print(response.text)
            return None
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return None


def test_nft_verification_api(contract_address, chain_id="7001"):
    """Test the NFT contract verification API."""
    
    print("\n===== Testing NFT Contract Verification API =====")
    print(f"Contract Address: {contract_address}")
    print(f"Chain ID: {chain_id}")
    
    try:
        # Wait a moment for the transaction to be fully processed
        print("Waiting 5 seconds before verification...")
        time.sleep(5)
        
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
                assert True
                return True
            else:
                print("❌ Verification failed")
                assert False, "Verification failed"
                return False
            
        except json.JSONDecodeError:
            print("Error decoding JSON response")
            print(response.text)
            assert False, "Error decoding JSON response"
            return False
        
    except Exception as e:
        print(f"Error: {str(e)}")
        assert False, f"Exception during verification: {str(e)}"
        return False


def main():
    """Main entry point for the test script."""
    contract_address = test_nft_deployment_api()
    if contract_address:
        test_nft_verification_api(contract_address)


if __name__ == "__main__":
    main() 