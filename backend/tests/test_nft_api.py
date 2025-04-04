"""Test script for NFT API endpoints."""

import requests
import json
import sys
import os
import time

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import app config
from app.config import Config

# API URL
API_URL = f"http://{Config.HOST}:{Config.PORT}"

def test_nft_deployment_api():
    """Test the NFT collection deployment API endpoint."""
    
    # Test NFT collection configuration
    collection_data = {
        "collection_name": "API Test NFT Collection",
        "collection_symbol": "ATNFT",
        "base_uri": "https://metadata.example.com/api-test/",
        "max_supply": 500,
        "selected_chains": ["7001", "11155111"],  # ZetaChain Testnet and Sepolia
        "deployer_address": "0x4f1684A28E33F42cdf50AB96e29a709e17249E63"
    }
    
    print("Testing NFT collection deployment API...")
    print(f"Collection: {collection_data['collection_name']} ({collection_data['collection_symbol']})")
    print(f"Selected chains: {', '.join(collection_data['selected_chains'])}")
    
    try:
        # Make API request
        response = requests.post(
            f"{API_URL}/api/nft/deploy",
            json=collection_data,
            timeout=30
        )
        
        # Print response
        print("\nAPI Response:")
        print(f"Status Code: {response.status_code}")
        
        # Pretty print JSON response
        try:
            response_json = response.json()
            print(json.dumps(response_json, indent=2))
            
            # Save deployment ID for future reference
            if response_json.get("success") and response_json.get("deployment_id"):
                deployment_id = response_json["deployment_id"]
                print(f"\nSaved deployment ID: {deployment_id}")
                
                # Wait for deployment to complete
                print("\nWaiting for deployment to complete...")
                time.sleep(10)  # Wait 10 seconds
                
                # Check deployment status
                check_deployment_status(deployment_id)
                
                return deployment_id
            
        except json.JSONDecodeError:
            print("Error decoding JSON response")
            print(response.text)
        
    except Exception as e:
        print(f"Error: {str(e)}")
    
    return None


def test_nft_verification_api(contract_address=None, chain_id="7001"):
    """Test the NFT contract verification API."""
    
    print("\n===== Testing NFT Contract Verification API =====")
    
    if not contract_address:
        print("No contract address provided, skipping verification test")
        return None
    
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
                print(f"✅ Verification initiated successfully")
                print(f"Verification Status: {response_json.get('verification_status', 'unknown')}")
                return True
            else:
                print(f"❌ Verification failed: {response_json.get('message', 'Unknown error')}")
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
    
    # Test NFT collection deployment API
    deployment_id = test_nft_deployment_api()
    
    if deployment_id:
        # Wait a bit longer and check status again
        print("\nWaiting 30 seconds for deployment to progress...")
        time.sleep(30)
        
        # Check deployment status
        collection_data = check_deployment_status(deployment_id)
        
        # Extract contract address from collection data for verification
        if collection_data and collection_data.get("success"):
            collection = collection_data.get("collection", {})
            zc_contract_address = collection.get("zc_contract_address")
            
            if zc_contract_address:
                print(f"\nFound ZetaChain contract address: {zc_contract_address}")
                
                # Wait a bit more before verification to ensure contract is available on explorer
                print("\nWaiting 30 seconds before attempting verification...")
                time.sleep(30)
                
                # Test verification
                test_nft_verification_api(zc_contract_address, "7001")


def check_deployment_status(deployment_id):
    """Check the status of an NFT collection deployment."""
    
    print(f"\nChecking deployment status for ID: {deployment_id}")
    
    try:
        # Make API request
        response = requests.get(
            f"{API_URL}/api/nft/collection/{deployment_id}",
            timeout=30
        )
        
        # Print response
        print("\nStatus Response:")
        print(f"Status Code: {response.status_code}")
        
        # Pretty print JSON response
        try:
            response_json = response.json()
            
            # Extract the important parts for a cleaner output
            if response_json.get("success") and "collection" in response_json:
                collection = response_json["collection"]
                print(f"Collection Name: {collection.get('collection_name')}")
                print(f"Deployment Status: {collection.get('deployment_status')}")
                
                # ZetaChain details
                zc_address = collection.get('zc_contract_address')
                print(f"ZetaChain Contract: {zc_address or 'Not deployed'}")
                
                # Connected chains
                print("\nConnected Chains:")
                connected_chains = collection.get("connected_chains_json", {})
                for chain_id, chain_data in connected_chains.items():
                    status = chain_data.get("status", "unknown")
                    contract = chain_data.get("contract_address", "N/A")
                    print(f"  Chain {chain_id}: {status}, Contract: {contract}")
                
                if collection.get("error_message"):
                    print(f"\nError: {collection.get('error_message')}")
            else:
                # Full response if no collection data
                print(json.dumps(response_json, indent=2))
            
            return response_json
                
        except json.JSONDecodeError:
            print("Error decoding JSON response")
            print(response.text)
            return None
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return None


if __name__ == "__main__":
    main() 