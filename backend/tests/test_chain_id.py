#!/usr/bin/env python3

"""
Test script to check the ZetaChain ID in the contracts.
"""

import os
import asyncio
import sys
import re
from web3 import Web3

# Add the parent directory to PYTHONPATH
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

# Now import from app
from app.utils.web3_helper import load_contract_data, ZC_UNIVERSAL_TOKEN_ABI, UNIVERSAL_TOKEN_ABI


async def check_contract_chain_ids():
    """Check the ZetaChain ID in both contracts."""
    print("\n=== Checking ZetaChain ID in Contracts ===")
    
    # Make sure contract data is loaded
    load_contract_data()
    
    # Check ZetaChainUniversalToken
    zc_abi = ZC_UNIVERSAL_TOKEN_ABI
    try:
        # Create a dummy Web3 instance
        w3 = Web3()
        
        # Create a contract instance without an address
        _ = w3.eth.contract(abi=zc_abi)
        
        # Get the ZETACHAIN_ID from the ABI
        zc_id = None
        for item in zc_abi:
            if item.get('name') == 'ZETACHAIN_ID' and item.get('type') == 'function':
                zc_id = "Found in ABI, but need contract instance to call"
        
        print(f"ZetaChainUniversalToken ZETACHAIN_ID: {zc_id}")
        print("Note: To get the actual value, we need a deployed contract instance")
        
        # Check if the constant is defined in the ABI (better approach)
        zetachain_constant = None
        for item in zc_abi:
            if (item.get('name') == 'ZETACHAIN_ID' and 
                item.get('type') == 'function' and 
                item.get('stateMutability') == 'view'):
                zetachain_constant = "Function found in ABI"
                break
        
        print(f"ZetaChain ZETACHAIN_ID constant: {zetachain_constant}")
        
    except Exception as e:
        print(f"❌ Error checking ZetaChainUniversalToken: {e}")
    
    # Check EVMUniversalToken
    evm_abi = UNIVERSAL_TOKEN_ABI
    try:
        # Create a contract instance without an address
        _ = w3.eth.contract(abi=evm_abi)
        
        # Get the ZETACHAIN_ID from the ABI
        evm_id = None
        for item in evm_abi:
            if item.get('name') == 'ZETACHAIN_ID' and item.get('type') == 'function':
                evm_id = "Found in ABI, but need contract instance to call"
        
        print(f"EVMUniversalToken ZETACHAIN_ID: {evm_id}")
        print("Note: To get the actual value, we need a deployed contract instance")
        
        # Check if the constant is defined in the ABI
        evm_constant = None
        for item in evm_abi:
            if (item.get('name') == 'ZETACHAIN_ID' and 
                item.get('type') == 'function' and 
                item.get('stateMutability') == 'view'):
                evm_constant = "Function found in ABI"
                break
        
        print(f"EVM ZETACHAIN_ID constant: {evm_constant}")
        
    except Exception as e:
        print(f"❌ Error checking EVMUniversalToken: {e}")
    
    # Instead of checking through ABIs, let's check the source code directly
    print("\nChecking source code for ZETACHAIN_ID:")
    
    # Get the path to the contracts directory
    contracts_dir = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 
        "smart-contracts", "contracts"
    )
    
    # Check ZetaChainUniversalToken.sol
    zc_contract_path = os.path.join(contracts_dir, "ZetaChainUniversalToken.sol")
    if os.path.exists(zc_contract_path):
        with open(zc_contract_path, "r") as f:
            content = f.read()
            match = re.search(r"ZETACHAIN_ID\s*=\s*(\d+)", content)
            if match:
                zc_id_value = match.group(1)
                print(f"✅ ZetaChainUniversalToken.sol ZETACHAIN_ID = {zc_id_value}")
                if zc_id_value == "7001":
                    print("   This is the correct value for ZetaChain testnet")
                else:
                    print("❌ This is NOT the correct value for ZetaChain testnet (should be 7001)")
    else:
        print(f"❌ ZetaChainUniversalToken.sol not found at {zc_contract_path}")
    
    # Check EVMUniversalToken.sol
    evm_contract_path = os.path.join(contracts_dir, "EVMUniversalToken.sol")
    if os.path.exists(evm_contract_path):
        with open(evm_contract_path, "r") as f:
            content = f.read()
            match = re.search(r"ZETACHAIN_ID\s*=\s*(\d+)", content)
            if match:
                evm_id_value = match.group(1)
                print(f"✅ EVMUniversalToken.sol ZETACHAIN_ID = {evm_id_value}")
                if evm_id_value == "7001":
                    print("   This is the correct value for ZetaChain testnet")
                else:
                    print("❌ This is NOT the correct value for ZetaChain testnet (should be 7001)")
    else:
        print(f"❌ EVMUniversalToken.sol not found at {evm_contract_path}")
    
    print("\n=== Verification Complete ===")
    
    return True


if __name__ == "__main__":
    # Run the verification test
    result = asyncio.run(check_contract_chain_ids())
    
    # Exit with appropriate code
    if not result:
        print("\nVerification test failed")
        exit(1)
    else:
        print("\nVerification test completed successfully")
        exit(0) 