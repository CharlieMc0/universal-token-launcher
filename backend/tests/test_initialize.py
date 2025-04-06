#!/usr/bin/env python3
"""
Test script to debug ZetaChainUniversalToken initialization
This script will:
1. Deploy a ZetaChainUniversalToken contract
2. Initialize it properly with attention to the payable address parameter
"""

import asyncio
import os
import json
from web3 import Web3

# Setup paths
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ZC_TOKEN_PATH = os.path.join(SCRIPT_DIR, "artifacts/ZetaChainUniversalToken.json")

# Get environment variables
PRIVATE_KEY = os.environ.get('DEPLOYER_PRIVATE_KEY')
RPC_URL = os.environ.get('ZETACHAIN_RPC_URL', 'https://zetachain-athens-evm.blockpi.network/v1/rpc/public')

# Configuration
GATEWAY_ADDRESS = "0x6c533f7fe93fae114d0954697069df33c9b74fd7"  # Use actual gateway address
UNISWAP_ROUTER_ADDRESS = "0x2ca7d64A7EFE2D62A725E2B35Cf7230D6677FfEe"  # Use actual router
GAS_LIMIT = 3000000
TOKEN_NAME = "Test Universal Token"
TOKEN_SYMBOL = "TUT"

async def main():
    # Setup Web3 connection
    w3 = Web3(Web3.HTTPProvider(RPC_URL))
    
    # Try to inject POA middleware if available
    try:
        from web3.middleware import geth_poa_middleware
        w3.middleware_onion.inject(geth_poa_middleware, layer=0)
        print("POA middleware injected")
    except ImportError:
        # Handle newer web3.py versions
        try:
            # For Web3.py v6+
            from web3 import middleware
            from web3.middleware import async_construct_simple_cache_middleware
            w3.middleware_onion.add(async_construct_simple_cache_middleware)
            print("Cache middleware injected (Web3.py v6+)")
        except (ImportError, AttributeError):
            print("No middleware injected - using default configuration")
    
    print(f"Connected to chain ID: {w3.eth.chain_id}")
    
    # Setup account
    if not PRIVATE_KEY:
        print("ERROR: DEPLOYER_PRIVATE_KEY environment variable not set")
        return
    
    from eth_account import Account
    account = Account.from_key(PRIVATE_KEY)
    print(f"Using account: {account.address}")
    
    # Load contract artifact
    try:
        with open(ZC_TOKEN_PATH, 'r') as f:
            contract_data = json.load(f)
            contract_abi = contract_data['abi']
            contract_bytecode = contract_data['bytecode']
    except Exception as e:
        print(f"Error loading contract artifact: {e}")
        return
    
    # Deploy contract
    print("\n1. Deploying contract...")
    contract = w3.eth.contract(abi=contract_abi, bytecode=contract_bytecode)
    tx_params = {
        'from': account.address,
        'nonce': w3.eth.get_transaction_count(account.address),
        'gas': 5000000,
        'gasPrice': w3.eth.gas_price
    }
    
    # Note: No constructor arguments - use UUPS pattern
    constructor_tx = contract.constructor().build_transaction(tx_params)
    signed_tx = account.sign_transaction(constructor_tx)
    tx_hash = w3.eth.send_raw_transaction(signed_tx.rawTransaction)
    print(f"Transaction hash: {tx_hash.hex()}")
    
    # Wait for deployment
    print("Waiting for deployment transaction receipt...")
    tx_receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
    contract_address = tx_receipt.contractAddress
    print(f"Contract deployed at: {contract_address}")
    
    # Create contract instance
    token = w3.eth.contract(address=contract_address, abi=contract_abi)
    
    # Initialize contract
    print("\n2. Initializing contract...")
    # IMPORTANT: Don't checksum the gateway address - it's payable
    print(f"Gateway address (raw): {GATEWAY_ADDRESS}")
    
    # Prepare initialization transaction
    init_data = token.encodeABI(
        fn_name="initialize", 
        args=[
            account.address,  # initialOwner
            TOKEN_NAME,       # name
            TOKEN_SYMBOL,     # symbol
            GATEWAY_ADDRESS,  # gatewayAddress - don't checksum!
            GAS_LIMIT,        # gas
            UNISWAP_ROUTER_ADDRESS  # uniswapRouterAddress
        ]
    )
    
    # Print the initialization parameters for debugging
    print("Initialization parameters:")
    print(f"  Owner: {account.address}")
    print(f"  Name: {TOKEN_NAME}")
    print(f"  Symbol: {TOKEN_SYMBOL}")
    print(f"  Gateway (raw): {GATEWAY_ADDRESS}")
    print(f"  Gas: {GAS_LIMIT}")
    print(f"  Uniswap: {UNISWAP_ROUTER_ADDRESS}")
    
    # Create and send the initialization transaction
    init_tx = {
        'from': account.address,
        'to': contract_address,
        'gas': 5000000, 
        'gasPrice': w3.eth.gas_price,
        'nonce': w3.eth.get_transaction_count(account.address),
        'data': init_data
    }
    
    signed_init_tx = account.sign_transaction(init_tx)
    init_tx_hash = w3.eth.send_raw_transaction(signed_init_tx.rawTransaction)
    print(f"Initialization transaction hash: {init_tx_hash.hex()}")
    
    # Wait for initialization
    print("Waiting for initialization transaction receipt...")
    init_receipt = w3.eth.wait_for_transaction_receipt(init_tx_hash)
    
    if init_receipt.status == 1:
        print("✅ Contract initialization successful!")
    else:
        print("❌ Contract initialization failed!")
        
    # Check contract state
    print("\n3. Verifying contract state...")
    try:
        token_name = token.functions.name().call()
        token_symbol = token.functions.symbol().call()
        token_owner = token.functions.owner().call()
        gateway = token.functions.gateway().call()
        
        print(f"Token name: {token_name}")
        print(f"Token symbol: {token_symbol}")
        print(f"Token owner: {token_owner}")
        print(f"Gateway address: {gateway}")
        
        # Validation
        if token_name == TOKEN_NAME and token_symbol == TOKEN_SYMBOL:
            print("✅ Contract successfully initialized with correct parameters!")
        else:
            print("❌ Contract state doesn't match expected values.")
            
    except Exception as e:
        print(f"Error checking contract state: {e}")

if __name__ == "__main__":
    asyncio.run(main()) 