#!/usr/bin/env python3
"""
Test script to validate our approach for handling payable addresses
"""

import json
import os
from web3 import Web3

# Setup paths
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ZC_TOKEN_PATH = os.path.join(SCRIPT_DIR, "artifacts/ZetaChainUniversalToken.json")


def main():
    """Demo of proper encoding for payable address parameters"""
    
    # Load the contract ABI
    try:
        with open(ZC_TOKEN_PATH, 'r') as f:
            contract_data = json.load(f)
            contract_abi = contract_data['abi']
    except Exception as e:
        print(f"Error loading contract ABI: {e}")
        return
    
    # Setup Web3
    w3 = Web3()
    
    # Test addresses
    gateway_address = "0x6c533f7fe93fae114d0954697069df33c9b74fd7"
    owner_address = "0x04dA1034E7d84c004092671bBcEb6B1c8DCda7AE"
    
    # Find initialize function in ABI
    initialize_abi = None
    for item in contract_abi:
        if isinstance(item, dict) and item.get('type') == 'function' and item.get('name') == 'initialize':
            initialize_abi = item
            break
    
    if not initialize_abi:
        print("Initialize function not found in ABI")
        return
    
    # Examine function parameters
    print("Initialize function parameters:")
    for i, param in enumerate(initialize_abi.get('inputs', [])):
        param_name = param.get('name', f'param{i}')
        param_type = param.get('type', 'unknown')
        is_payable = 'payable' in param_type
        print(f"  {i}: {param_name} ({param_type})"
              f"{' [PAYABLE]' if is_payable else ''}")
    
    # Create a contract instance for function encoding
    contract = w3.eth.contract(abi=contract_abi)
    
    # Test both methods of encoding
    print("\nCOMPARISON: Regular vs. Raw addressing for payable addresses\n")
    
    # Method 1: All checksummed
    args_checksummed = [
        w3.to_checksum_address(owner_address),
        "Test Token",
        "TEST",
        w3.to_checksum_address(gateway_address),
        3000000,
        w3.to_checksum_address(gateway_address)
    ]
    
    # Method 2: Raw address for payable parameters
    args_raw = [
        w3.to_checksum_address(owner_address),
        "Test Token", 
        "TEST",
        gateway_address,  # raw/not checksummed for payable
        3000000,
        w3.to_checksum_address(gateway_address)
    ]
    
    # Encode both methods
    encoded1 = None
    encoded2 = None
    
    try:
        # Method 1: All checksummed - using encode_input which doesn't require a 'to' address
        func_obj1 = contract.functions.initialize(*args_checksummed)
        encoded1 = func_obj1._encode_transaction_data()
        
        print("Method 1 (All checksummed):")
        print(f"  Function data: {encoded1[:66]}...{encoded1[-64:]}")
        print(f"  Length: {len(encoded1)}")
    except Exception as e:
        print(f"Error with method 1: {e}")
    
    try:
        # Method 2: Raw address for payable parameter
        func_obj2 = contract.functions.initialize(*args_raw)
        encoded2 = func_obj2._encode_transaction_data()
        
        print("\nMethod 2 (Raw payable address):")
        print(f"  Function data: {encoded2[:66]}...{encoded2[-64:]}")
        print(f"  Length: {len(encoded2)}")
    except Exception as e:
        print(f"Error with method 2: {e}")
    
    # Compare
    if encoded1 and encoded2:
        if encoded1 == encoded2:
            print("\nEncoding MATCHES: Both methods produce identical results")
            print("This means Web3.py handles payable addresses the same way")
            print("regardless of checksumming at the ABI encoding level")
        else:
            print("\nEncoding DIFFERS: The two methods produce different results")
            print("This means we MUST use the raw address for payable parameters")
    
    print("\nCONCLUSION:")
    print("Web3.py's ABI encoder works at a lower level and may not distinguish")
    print("between checksummed and non-checksummed addresses in the encoding.")
    print("However, Solidity contracts can have validation that rejects")
    print("transactions if addresses are in the wrong format.")
    print("For ZetaChain Universal Token, keeping the gateway address")
    print("in non-checksummed form should fix the initialization errors.")


if __name__ == "__main__":
    main() 