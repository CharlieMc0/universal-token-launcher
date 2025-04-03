#!/usr/bin/env python3

"""
Test the BlockScout API verification process directly to diagnose issues
with contract verification on ZetaChain's explorer.
"""

import os
import requests
import json
import pytest
from app.utils.web3_helper import SMART_CONTRACTS_DIR, extract_compiler_version
from app.utils.chain_config import get_chain_config


@pytest.fixture
def contract_address():
    """Fixture providing a known contract address on ZetaChain testnet for verification testing."""
    # This is a sample contract address - update with a real one if needed
    return "0x9A8f92a830A5cB89a3816e3D267CB7791c16b04D"


@pytest.fixture
def chain_id():
    """Fixture providing ZetaChain testnet chain ID."""
    return "7001"


def test_blockscout_api_verification(
    contract_address, 
    chain_id, 
    contract_name="ZetaChainUniversalToken"
):
    """Test verification using BlockScout API directly."""
    print(f"\n=== Testing BlockScout API Verification for {contract_name} ===")
    
    # Get chain configuration
    chain_config = get_chain_config(int(chain_id))
    if not chain_config:
        print(f"❌ Chain ID {chain_id} not configured")
        return
        
    # Get explorer URL
    explorer_url = chain_config.get('blockscout_url')
    if not explorer_url:
        print(f"❌ No BlockScout URL configured for chain {chain_id}")
        return
    
    # Make sure URL doesn't end with slash
    explorer_url = explorer_url.rstrip('/')
    
    # Check if contract source exists
    contract_file = f"{contract_name}.sol"
    contract_path = os.path.join(
        SMART_CONTRACTS_DIR,
        "contracts",
        contract_file
    )
    
    if not os.path.exists(contract_path):
        print(f"❌ Contract source not found at {contract_path}")
        # Check if the parent directory exists
        parent_dir = os.path.dirname(contract_path)
        if not os.path.exists(parent_dir):
            print(f"❌ Parent directory not found: {parent_dir}")
        else:
            print(f"✅ Parent directory exists: {parent_dir}")
            # List files in the directory
            print("Files in the directory:")
            for file in os.listdir(parent_dir):
                print(f"  - {file}")
        return
    
    print(f"✅ Contract source found at {contract_path}")
    
    # Read contract source
    with open(contract_path, 'r') as f:
        contract_source = f.read()
        compiler_version = extract_compiler_version(contract_source)
        print(f"✅ Detected compiler version: {compiler_version}")
    
    # Try verification with primary API endpoint
    print("\n=== Testing Primary BlockScout API Endpoint ===")
    verification_url = f"{explorer_url}/api"
    
    # Prepare verification data according to BlockScout API
    verification_data = {
        "module": "contract",
        "action": "verifysourcecode",
        "contractaddress": contract_address,
        "contractname": contract_name,
        "compilerversion": compiler_version,
        "optimizationUsed": "1",  # 1 for true, 0 for false
        "runs": "200",
        "sourceCode": contract_source,
        "evmversion": "paris",
        "constructorArguments": "",  # Leave empty for autodetection
        "codeformat": "solidity-single-file"  # Required format for BlockScout
    }
    
    # Save full verification data to file (including source code)
    full_data_filename = f"{contract_name}_full_verification_data.json"
    with open(full_data_filename, 'w') as f:
        json.dump(verification_data, f, indent=2)
    print(f"✅ Full verification data saved to: {full_data_filename}")
    
    headers = {
        "Content-Type": "application/x-www-form-urlencoded"
    }
    
    print(f"Sending verification request to: {verification_url}")
    print("Request data:")
    data_display = {
        k: (v if k != 'sourceCode' else '...source truncated...') 
        for k, v in verification_data.items()
    }
    print(json.dumps(data_display, indent=2))
    
    try:
        response = requests.post(
            verification_url, 
            data=verification_data,
            headers=headers
        )
        
        print(f"\nResponse status code: {response.status_code}")
        
        if response.status_code in (200, 201, 202):
            try:
                response_data = response.json()
                print("Response data:")
                print(json.dumps(response_data, indent=2))
                
                # Save response to file
                response_filename = f"{contract_name}_verification_response.json"
                with open(response_filename, 'w') as f:
                    json.dump(response_data, f, indent=2)
                print(f"✅ Response data saved to: {response_filename}")
                
                if "result" in response_data and "status" in response_data:
                    if response_data["status"] == "1":
                        print("✅ Verification request submitted successfully")
                    else:
                        error_msg = response_data.get('result', 'Unknown error')
                        print(f"❌ Verification request failed: {error_msg}")
                else:
                    print("✅ Verification request submitted (no status information)")
            except Exception as e:
                print(f"❌ Error parsing JSON response: {str(e)}")
                print(f"Response text: {response.text}")
        else:
            print(f"❌ Request failed with status {response.status_code}")
            print(f"Response text: {response.text}")
            
            # Try alternative API endpoint
            print("\n=== Testing Alternative BlockScout API Endpoint ===")
            verification_url_v2 = (
                f"{explorer_url}/api/v2/smart-contracts/verify/standard-json"
            )
            
            # Prepare verification data for v2 API (different format)
            verification_data_v2 = {
                "address": contract_address,
                "compiler_version": compiler_version,
                "evm_version": "paris",
                "optimization": True,
                "optimization_runs": 200,
                "contract_libraries": {},
                "source_files": {
                    f"{contract_name}.sol": contract_source
                },
                "contract_name": contract_name
            }
            
            # Save full v2 verification data to file
            full_data_v2_filename = f"{contract_name}_full_verification_data_v2.json"
            with open(full_data_v2_filename, 'w') as f:
                json.dump(verification_data_v2, f, indent=2)
            print(f"✅ Full v2 verification data saved to: {full_data_v2_filename}")
            
            headers = {
                "Content-Type": "application/json"
            }
            
            print("Sending verification request to alternative endpoint:")
            print(verification_url_v2)
            
            try:
                response = requests.post(
                    verification_url_v2, 
                    json=verification_data_v2,
                    headers=headers
                )
                
                print(f"\nResponse status code: {response.status_code}")
                
                if response.status_code in (200, 201, 202):
                    try:
                        response_data = response.json()
                        print("Response data:")
                        print(json.dumps(response_data, indent=2))
                        
                        # Save v2 response to file
                        response_v2_filename = f"{contract_name}_verification_response_v2.json"
                        with open(response_v2_filename, 'w') as f:
                            json.dump(response_data, f, indent=2)
                        print(f"✅ v2 Response data saved to: {response_v2_filename}")
                        
                        print("✅ Verification request submitted via alternative API")
                    except Exception as e:
                        print(f"❌ Error parsing JSON response: {str(e)}")
                        print(f"Response text: {response.text}")
                else:
                    failed_status = response.status_code
                    print(f"❌ Alternative API request failed with status {failed_status}")
                    print(f"Response text: {response.text}")
            except Exception as e:
                print(f"❌ Error with alternative API request: {str(e)}")
    except Exception as e:
        print(f"❌ Error sending verification request: {str(e)}")
    
    # Print directory structure for debugging
    print("\n=== Smart Contracts Directory Structure ===")
    print(f"SMART_CONTRACTS_DIR: {SMART_CONTRACTS_DIR}")
    
    try:
        # List the main directory
        if os.path.exists(SMART_CONTRACTS_DIR):
            print(f"✅ Directory exists: {SMART_CONTRACTS_DIR}")
            print("Contents:")
            for item in os.listdir(SMART_CONTRACTS_DIR):
                item_path = os.path.join(SMART_CONTRACTS_DIR, item)
                if os.path.isdir(item_path):
                    print(f"  📁 {item}/")
                else:
                    print(f"  📄 {item}")
            
            # Check if contracts directory exists
            contracts_dir = os.path.join(SMART_CONTRACTS_DIR, "contracts")
            if os.path.exists(contracts_dir):
                print("\n✅ Contracts directory exists:")
                print(contracts_dir)
                print("Contents:")
                for item in os.listdir(contracts_dir):
                    print(f"  📄 {item}")
            else:
                print("\n❌ Contracts directory not found:")
                print(contracts_dir)
        else:
            print("\n❌ SMART_CONTRACTS_DIR not found:")
            print(SMART_CONTRACTS_DIR)
    except Exception as e:
        print(f"❌ Exception listing directories: {str(e)}")


if __name__ == "__main__":
    # Configuration - replace with real values to test
    CONTRACT_ADDRESS = "0x7c9037d10c4BC877268cb4fe900490Ff98b5D52b"
    CHAIN_ID = "7001"  # ZetaChain testnet
    CONTRACT_NAME = "ZetaChainUniversalToken"  # Default contract
    
    print("===== BlockScout API Verification Test =====")
    print("This script tests the BlockScout API for contract verification.")
    print("Testing with:")
    print(f"- Contract address: {CONTRACT_ADDRESS}")
    print(f"- Chain ID: {CHAIN_ID}")
    print(f"- Contract name: {CONTRACT_NAME}")
    
    test_blockscout_api_verification(CONTRACT_ADDRESS, CHAIN_ID, CONTRACT_NAME)
    
    print("\nDone! Check the output above for verification results.") 