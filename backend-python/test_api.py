"""
Test script to directly call the API with the proper request format.
"""

import requests
import json
import os
import sys
from pprint import pprint

# URL for the deployment endpoint
API_URL = "http://localhost:8000/api/deploy"

# Example payload based on the expected format
payload = {
    "token_name": "Test Token API",
    "token_symbol": "TTA",
    "decimals": 18,
    "total_supply": "1000000000000000000000000",
    "selected_chains": ["7001"],  # For now, just deploy to ZetaChain testnet
    "deployer_address": "0x04dA1034E7d84c004092671bBcEb6B1c8DCda7AE",
    "allocations": [
        {
            "address": "0x04dA1034E7d84c004092671bBcEb6B1c8DCda7AE",
            "amount": "1000000000000000000000000"
        }
    ]
}

# Base URL for API requests
BASE_URL = "http://localhost:8000"

def test_api():
    """Send a request to the API to test deployment."""
    print("Sending deployment request to API...")
    try:
        # Make the API call
        response = requests.post(
            API_URL,
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        # Check if the request was successful
        if response.status_code == 200:
            print("Deployment request successful!")
            result = response.json()
            print(json.dumps(result, indent=2))
            
            # Check ZetaChain deployment status
            if result.get("deployment", {}).get("zetaChain", {}).get("success"):
                contract_address = result["deployment"]["zetaChain"]["contract_address"]
                print(f"ZetaChain contract deployed at: {contract_address}")
            else:
                error = result.get("deployment", {}).get("zetaChain", {}).get("message", "Unknown error")
                print(f"ZetaChain deployment failed: {error}")
            
            return True
        else:
            print(f"Deployment request failed with status code {response.status_code}")
            print(response.text)
            return False
    
    except Exception as e:
        print(f"Error sending request: {str(e)}")
        return False

def test_chains_endpoint():
    """
    Test the /api/chains endpoint to verify it returns the enabled status.
    """
    print("Testing /api/chains endpoint...")
    
    response = requests.get(f"{BASE_URL}/api/chains")
    
    if response.status_code == 200:
        data = response.json()
        print("Success! Response:")
        pprint(data)
        
        # Check if chains have the 'enabled' property
        if 'chains' in data and len(data['chains']) > 0:
            first_chain = data['chains'][0]
            if 'enabled' in first_chain:
                print("\n✅ 'enabled' property is successfully included in the response!")
            else:
                print("\n❌ 'enabled' property is missing from the chain data!")
                print(f"Chain data: {first_chain}")
        else:
            print("\n❌ No chains returned in the response!")
    else:
        print(f"Error: {response.status_code}")
        print(response.text)

if __name__ == "__main__":
    # Make sure the API server is running before executing this script
    print("Make sure the API server is running (python run_app.py)")
    test_api()
    test_chains_endpoint() 