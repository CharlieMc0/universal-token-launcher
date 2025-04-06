#!/usr/bin/env python3

import asyncio
import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Custom path handling for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.utils.web3_helper import (
    get_web3, 
    get_account, 
    _load_artifact,
    ZC_TOKEN_PATH
)
from app.utils.logger import logger
from web3 import Web3

# Default to ZetaChain
CHAIN_ID = sys.argv[1] if len(sys.argv) > 1 else "7001"
CONTRACT_ADDRESS = sys.argv[2] if len(sys.argv) > 2 else "0x6bb61589271a248c594A694A277F32270D14a5D0"  # Default from last run

async def check_contract():
    """Check details of a deployed contract on the blockchain"""
    logger.info(f"Checking contract at {CONTRACT_ADDRESS} on chain {CHAIN_ID}...")
    
    # Get Web3 instance
    web3 = await get_web3(int(CHAIN_ID))
    
    if not web3:
        logger.error("Failed to get web3 connection")
        return False
    
    # Check if contract exists
    code = web3.eth.get_code(CONTRACT_ADDRESS)
    if not code or code == '0x' or code == b'0x':
        logger.error(f"No code found at address {CONTRACT_ADDRESS}")
        return False
    
    logger.info(f"Contract exists with {len(code)} bytes of code")
    
    # Load contract ABI
    token_abi, _ = _load_artifact(ZC_TOKEN_PATH)
    if not token_abi:
        logger.error(f"Failed to load ABI from {ZC_TOKEN_PATH}")
        return False
    
    # Create contract instance
    contract = web3.eth.contract(address=CONTRACT_ADDRESS, abi=token_abi)
    
    # Try to call various view functions to see contract state
    logger.info("Checking contract state...")
    
    # Find all view/pure functions in ABI
    view_functions = []
    for item in token_abi:
        if isinstance(item, dict) and item.get('type') == 'function':
            if item.get('stateMutability') in ['view', 'pure']:
                view_functions.append(item.get('name'))
    
    logger.info(f"Found {len(view_functions)} view functions in ABI")
    
    # Call each view function to check state
    for func_name in view_functions:
        try:
            if hasattr(contract.functions, func_name) and callable(getattr(contract.functions, func_name)):
                func = getattr(contract.functions, func_name)
                
                # Skip functions with arguments
                signature = None
                for item in token_abi:
                    if isinstance(item, dict) and item.get('type') == 'function' and item.get('name') == func_name:
                        signature = item
                        break
                
                if signature and len(signature.get('inputs', [])) > 0:
                    logger.info(f"Skipping {func_name}() - requires arguments")
                    continue
                
                result = func().call()
                logger.info(f"{func_name}() => {result}")
        except Exception as e:
            logger.error(f"Error calling {func_name}(): {e}")
    
    # Check for initialize function and its parameters
    for item in token_abi:
        if isinstance(item, dict) and item.get('type') == 'function' and item.get('name') == 'initialize':
            logger.info("Found initialize function in ABI:")
            inputs = item.get('inputs', [])
            for idx, inp in enumerate(inputs):
                logger.info(f"  Parameter {idx}: {inp.get('name')} ({inp.get('type')})")
    
    # Check for initialization status (common pattern in upgradeable contracts)
    try:
        if hasattr(contract.functions, 'initialized'):
            initialized = contract.functions.initialized().call()
            logger.info(f"initialized() => {initialized}")
        elif hasattr(contract.functions, '_initialized'):
            initialized = contract.functions._initialized().call()
            logger.info(f"_initialized() => {initialized}")
        else:
            logger.info("No direct initialization status variable found")
    except Exception as e:
        logger.error(f"Error checking initialization status: {e}")
    
    return True

async def main():
    """Main function to run the check"""
    logger.info("Starting Contract State Check")
    success = await check_contract()
    return success

if __name__ == "__main__":
    asyncio.run(main()) 