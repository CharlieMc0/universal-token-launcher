#!/usr/bin/env python3
"""
Deploy and initialize a ZetaChain Universal Token with our payable address fix
"""

import os
import asyncio
import json
import logging
import sys
from web3 import Web3
from eth_account import Account

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s:%(funcName)s:%(lineno)d - %(message)s"
)
logger = logging.getLogger("test_deploy")

# Setup paths
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ZC_TOKEN_PATH = os.path.join(SCRIPT_DIR, "artifacts/ZetaChainUniversalToken.json")

# Get environment variables
PRIVATE_KEY = os.environ.get('DEPLOYER_PRIVATE_KEY')
RPC_URL = os.environ.get('ZETACHAIN_RPC_URL', 
                        'https://zetachain-athens-evm.blockpi.network/v1/rpc/public')

# Configuration
GATEWAY_ADDRESS = "0x6c533f7fe93fae114d0954697069df33c9b74fd7"  # Raw address
UNISWAP_ROUTER = "0x2ca7d64a7efe2d62a725e2b35cf7230d6677ffeee"  # Raw address
GAS_LIMIT = 3000000
TOKEN_NAME = "Zeta Test Token"
TOKEN_SYMBOL = "ZTT"

def encode_constructor_args(web3, contract_abi, bytecode, args_list):
    """Encode constructor arguments to hex for contract verification"""
    # Find constructor in ABI
    constructor_abi = None
    for item in contract_abi:
        if item.get('type') == 'constructor':
            constructor_abi = item
            break
    
    if not constructor_abi:
        logger.warning("Constructor not found in ABI")
        return None
    
    # Create temporary contract with bytecode
    contract = web3.eth.contract(abi=contract_abi, bytecode=bytecode)
    
    # Encode parameters
    encoded_args = None
    try:
        # For direct constructor args (even though we're using initializer pattern)
        constructor_data = contract.constructor(*args_list)._encode_constructor_data()
        
        # Extract just the args portion (without the bytecode)
        if bytecode and constructor_data.startswith(bytecode):
            encoded_args = constructor_data[len(bytecode):]
            # Remove 0x prefix if present
            if encoded_args.startswith('0x'):
                encoded_args = encoded_args[2:]
        else:
            encoded_args = constructor_data[2:]  # Remove 0x prefix
    except Exception as e:
        logger.error(f"Error encoding constructor args: {e}")
        return None
    
    return encoded_args

def encode_initialize_args(web3, contract_abi, args_list):
    """Encode initialize function call for verification"""
    # Create contract instance
    contract = web3.eth.contract(abi=contract_abi)
    
    # Encode function call
    try:
        func_obj = contract.functions.initialize(*args_list)
        encoded_data = func_obj._encode_transaction_data()
        return encoded_data
    except Exception as e:
        logger.error(f"Error encoding initialize args: {e}")
        return None

async def show_constructor_args_only():
    """Show constructor arguments without deployment - for manual verification"""
    # Setup Web3 connection
    web3 = Web3(Web3.HTTPProvider(RPC_URL))

    # Load contract artifact
    try:
        with open(ZC_TOKEN_PATH, 'r') as f:
            contract_data = json.load(f)
            contract_abi = contract_data['abi']
            contract_bytecode = contract_data['bytecode']
    except Exception as e:
        logger.error(f"Error loading contract artifact: {e}")
        return
    
    # Setup dummy address for constructor args
    owner_address = "0x04dA1034E7d84c004092671bBcEb6B1c8DCda7AE"
    
    # Prepare constructor arguments (for logging/verification purposes)
    constructor_args = [
        web3.to_checksum_address(owner_address),  # owner
        TOKEN_NAME,
        TOKEN_SYMBOL,
        GATEWAY_ADDRESS,  # gateway (raw, not checksummed)
        GAS_LIMIT,
        UNISWAP_ROUTER  # router (raw for payable)
    ]
    
    # Print nicely formatted output
    print("\n=================================================================")
    print("  CONSTRUCTOR ARGUMENTS FOR MANUAL CONTRACT VERIFICATION")
    print("=================================================================\n")
    
    print("Raw Arguments:")
    print(f"  Owner Address:       {constructor_args[0]}")
    print(f"  Token Name:          {constructor_args[1]}")
    print(f"  Token Symbol:        {constructor_args[2]}")
    print(f"  Gateway Address:     {constructor_args[3]}")
    print(f"  Gas Limit:           {constructor_args[4]}")
    print(f"  Router Address:      {constructor_args[5]}")
    
    # Encode constructor args (useful for manual verification)
    encoded_constructor = encode_constructor_args(web3, contract_abi, contract_bytecode, constructor_args)
    if encoded_constructor:
        print("\nEncoded Constructor Arguments (for contract verification):")
        print(encoded_constructor)
    
    # Encode initialize args (for proxy initialization)
    encoded_init = encode_initialize_args(web3, contract_abi, constructor_args)
    if encoded_init:
        print("\nEncoded Initialize Call (with 0x prefix):")
        print(encoded_init)
        
        print("\nInitialize Function Selector + Arguments (for verification):")
        print(encoded_init[2:])  # Remove 0x prefix
        
        # Extract function selector
        print("\nFunction Selector (first 4 bytes):")
        print(encoded_init[2:10])
    
    print("\n=================================================================")

async def main():
    """Main deployment test function"""
    # Check if user only wants constructor args
    if '--args-only' in sys.argv:
        await show_constructor_args_only()
        return
    
    # Setup Web3 connection
    web3 = Web3(Web3.HTTPProvider(RPC_URL))
    
    try:
        # Try to inject POA middleware if available
        from web3.middleware import geth_poa_middleware
        web3.middleware_onion.inject(geth_poa_middleware, layer=0)
        logger.info("POA middleware injected")
    except ImportError:
        logger.info("No POA middleware available")
    
    logger.info(f"Connected to chain ID: {web3.eth.chain_id}")
    
    # Load contract artifact
    try:
        with open(ZC_TOKEN_PATH, 'r') as f:
            contract_data = json.load(f)
            contract_abi = contract_data['abi']
            contract_bytecode = contract_data['bytecode']
    except Exception as e:
        logger.error(f"Error loading contract artifact: {e}")
        return
    
    # Setup account and address for constructor args
    owner_address = "0x04dA1034E7d84c004092671bBcEb6B1c8DCda7AE"  # Default dummy address
    account = None
    
    if PRIVATE_KEY:
        try:
            account = Account.from_key(PRIVATE_KEY)
            owner_address = account.address
            logger.info(f"Using account: {owner_address}")
        except Exception as e:
            logger.warning(f"Error loading private key: {e}")
            logger.info("Using dummy address for constructor args")
    else:
        logger.warning("DEPLOYER_PRIVATE_KEY not set, using dummy address for constructor args")
    
    # Prepare constructor arguments (for logging/verification purposes)
    constructor_args = [
        web3.to_checksum_address(owner_address),  # owner
        TOKEN_NAME,
        TOKEN_SYMBOL,
        GATEWAY_ADDRESS,  # gateway (raw, not checksummed)
        GAS_LIMIT,
        UNISWAP_ROUTER  # router (raw for payable)
    ]
    
    # Log the constructor arguments for verification
    logger.info("----- CONSTRUCTOR ARGUMENTS FOR VERIFICATION -----")
    logger.info("Raw arguments:")
    for i, arg in enumerate(constructor_args):
        logger.info(f"  {i}: {arg}")
    
    # Encode constructor args (useful for manual verification)
    encoded_constructor = encode_constructor_args(web3, contract_abi, contract_bytecode, constructor_args)
    if encoded_constructor:
        logger.info("\nEncoded constructor arguments (without 0x prefix):")
        logger.info(encoded_constructor)
    
    # Encode initialize args (for proxy initialization)
    encoded_init = encode_initialize_args(web3, contract_abi, constructor_args)
    if encoded_init:
        logger.info("\nEncoded initialize call (with 0x prefix):")
        logger.info(encoded_init)
        logger.info("\nInitialize function selector + arguments (for manual verification):")
        logger.info(encoded_init[2:])  # Remove 0x prefix
    
    # Stop here if no private key provided or account setup failed
    if not account:
        logger.info("\nNo valid account - stopping before deployment")
        logger.info("Use the above constructor arguments for manual verification")
        return
    
    # 1. Deploy token contract directly (no constructor args)
    logger.info("\n1. Deploying token contract directly...")
    
    try:
        from app.utils.web3_helper import deploy_token_direct, initialize_token
        
        deploy_result = await deploy_token_direct(
            web3=web3,
            account=account,
            contract_abi=contract_abi,
            contract_bytecode=contract_bytecode
        )
        
        if not deploy_result.get("success"):
            logger.error(f"Deployment failed: {deploy_result.get('message')}")
            return
        
        contract_address = deploy_result.get("contract_address")
        logger.info(f"Token deployed at: {contract_address}")
        
        # Log full bytecode + constructor args for manual verification
        if encoded_constructor:
            logger.info("\nFull bytecode + constructor args for manual verification:")
            logger.info(f"Bytecode + Constructor Args: {contract_bytecode + encoded_constructor}")
        
        # 2. Initialize the token with correct parameters
        logger.info("\n2. Initializing token...")
        logger.info(f"Gateway address (raw): {GATEWAY_ADDRESS}")
        
        init_result = await initialize_token(
            web3=web3,
            account=account,
            contract_address=contract_address,
            contract_abi=contract_abi,
            name=TOKEN_NAME,
            symbol=TOKEN_SYMBOL,
            gateway_address=GATEWAY_ADDRESS,  # Raw address, not checksummed
            owner_address=account.address,
            gas=GAS_LIMIT,
            uniswap_router_address=UNISWAP_ROUTER
        )
        
        if init_result.get("success"):
            logger.info("✅ Token initialization successful!")
            tx_hash = init_result.get("transaction_hash")
            logger.info(f"Initialization transaction: {tx_hash}")
        else:
            logger.error(f"❌ Token initialization failed: {init_result.get('message')}")
            logger.error(f"Failure details: {init_result}")
        
        # 3. Verify token state
        logger.info("\n3. Verifying token state...")
        try:
            token = web3.eth.contract(address=contract_address, abi=contract_abi)
            token_name = token.functions.name().call()
            token_symbol = token.functions.symbol().call()
            
            logger.info(f"Token name: {token_name}")
            logger.info(f"Token symbol: {token_symbol}")
            
            if token_name == TOKEN_NAME and token_symbol == TOKEN_SYMBOL:
                logger.info("✅ Token state verified successfully!")
            else:
                logger.warning("⚠️ Token state doesn't match expected values")
        except Exception as e:
            logger.error(f"Error verifying token state: {e}")
    
    except Exception as e:
        logger.error(f"Error in deployment process: {e}")
    
    logger.info("Deployment test complete")

if __name__ == "__main__":
    if '--help' in sys.argv or '-h' in sys.argv:
        print("\nUsage: python test_deploy_zeta_token.py [--args-only]")
        print("\nOptions:")
        print("  --args-only     Show constructor arguments for verification without deployment")
        print("  --help, -h      Show this help message")
        print("\nEnvironment Variables:")
        print("  DEPLOYER_PRIVATE_KEY    Private key for deployment (required for actual deployment)")
        print("  ZETACHAIN_RPC_URL       ZetaChain RPC URL (optional, has default)")
        print("")
        sys.exit(0)
    
    asyncio.run(main()) 