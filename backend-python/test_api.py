"""Test script for the API endpoints."""

import json
import os
import sys
import requests
import argparse

# Add the parent directory to the path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Parse command line arguments
parser = argparse.ArgumentParser(description="Test the API endpoint for token deployment")
parser.add_argument(
    "--host", type=str, default="localhost", help="API host (default: localhost)"
)
parser.add_argument(
    "--port", type=int, default=8000, help="API port (default: 8000)"
)
parser.add_argument(
    "--test-token-id", type=int, default=1, help="Token ID to test (default: 1)"
)
parser.add_argument(
    "--test-contract-address", type=str, 
    default="0x66aa78987ab5AF0d3C21D9D3b5AdA054Eb4C689D",
    help="Contract address to test (default: 0x66aa78987ab5AF0d3C21D9D3b5AdA054Eb4C689D)"
)
args = parser.parse_args()

# Set up the API URL
API_URL = f"http://{args.host}:{args.port}/api"

# Test data for token deployment
test_data = {
    "token_name": "Test Token",
    "token_symbol": "TST",
    "decimals": 18,
    "total_supply": "1000000000000000000000000",
    "selected_chains": ["7001", "11155111"],
    "deployer_address": "0x4f1684A28E33F42cdf50AB96e29a709e17249E63",
    "allocations": [
        {
            "address": "0x4f1684A28E33F42cdf50AB96e29a709e17249E63",
            "amount": "1000000000000000000000000"
        }
    ]
}


def test_deploy_endpoint():
    """Test the /api/deploy endpoint."""
    print("\n--- Testing /api/deploy endpoint ---")
    try:
        response = requests.post(f"{API_URL}/deploy", json=test_data)
        print(f"Status Code: {response.status_code}")
        response_data = response.json()
        print(json.dumps(response_data, indent=2))
        
        if response.status_code == 200 and response_data.get("success", False):
            print("Token deployment request successful")
            return response_data.get("deployment_id")
        else:
            print("Token deployment request failed")
            return None
    except Exception as e:
        print(f"Error testing deploy endpoint: {str(e)}")
        return None


def test_chains_endpoint():
    """Test the /api/chains endpoint."""
    print("\n--- Testing /api/chains endpoint ---")
    try:
        response = requests.get(f"{API_URL}/chains")
        print(f"Status Code: {response.status_code}")
        response_data = response.json()
        
        # Show just the first few chains
        chains = response_data.get("chains", [])[:3]
        print(json.dumps({"chains": chains}, indent=2))
        print(f"Total chains: {len(response_data.get('chains', []))}")
        
        if response.status_code == 200 and response_data.get("success", False):
            print("Chains endpoint request successful")
            return True
        else:
            print("Chains endpoint request failed")
            return False
    except Exception as e:
        print(f"Error testing chains endpoint: {str(e)}")
        return False


def test_token_endpoint_by_id(token_id):
    """Test the /api/token/{id} endpoint."""
    print(f"\n--- Testing /api/token/{token_id} endpoint ---")
    try:
        response = requests.get(f"{API_URL}/token/{token_id}")
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            response_data = response.json()
            print(json.dumps(response_data, indent=2))
            print("Token lookup by ID successful")
            return True
        else:
            print(f"Token lookup by ID failed: {response.text}")
            return False
    except Exception as e:
        print(f"Error testing token endpoint by ID: {str(e)}")
        return False


def test_token_endpoint_by_address(contract_address):
    """Test the /api/token/{address} endpoint."""
    print(f"\n--- Testing /api/token/{contract_address} endpoint ---")
    try:
        response = requests.get(f"{API_URL}/token/{contract_address}")
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            response_data = response.json()
            print(json.dumps(response_data, indent=2))
            print("Token lookup by contract address successful")
            return True
        else:
            print(f"Token lookup by contract address failed: {response.text}")
            return False
    except Exception as e:
        print(f"Error testing token endpoint by address: {str(e)}")
        return False


if __name__ == "__main__":
    # Test endpoints
    deployment_id = test_deploy_endpoint()
    test_chains_endpoint()
    
    # Test token lookup by ID
    token_id_to_test = deployment_id if deployment_id else args.test_token_id
    test_token_endpoint_by_id(token_id_to_test)
    
    # Test token lookup by contract address
    test_token_endpoint_by_address(args.test_contract_address) 