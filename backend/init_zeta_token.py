#!/usr/bin/env python3

import asyncio
import json
import os
import sys
import eth_abi
from web3 import Web3
from eth_utils import to_checksum_address, remove_0x_prefix, to_hex
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

# Configuration
CONTRACT_ADDRESS = sys.argv[1] if len(sys.argv) > 1 else "0x6a8227cEF7eC11666936EBd182Fbe8154602e773"
TOKEN_NAME = sys.argv[2] if len(sys.argv) > 2 else "ZetaChain Test Token"
TOKEN_SYMBOL = sys.argv[3] if len(sys.argv) > 3 else "ZTT"
# Always use ZetaChain for this script 
CHAIN_ID = "7001"

async def init_token():
    """Initialize a ZetaChain token using direct ABI encoding"""
    logger.info(f"Initializing token at {CONTRACT_ADDRESS} on ZetaChain...")
    
    # Get Web3 instance and account
    web3 = await get_web3(int(CHAIN_ID))
    account = get_account()
    
    if not web3 or not account:
        logger.error("Failed to get web3 or account")
        return False
    
    # Load token ABI for contract interaction
    token_abi, _ = _load_artifact(ZC_TOKEN_PATH)
    if not token_abi:
        logger.error(f"Failed to load token ABI from {ZC_TOKEN_PATH}")
        return False
    
    # Get gateway and router addresses from chain config
    from app.utils.chain_config import get_chain_config
    chain_config = get_chain_config(int(CHAIN_ID))
    if not chain_config:
        logger.error(f"Chain config not found for ZetaChain")
        return False
    
    gateway_address = chain_config.get("gateway_address")
    if not gateway_address:
        gateway_address = "0x6c533f7fe93fae114d0954697069df33c9b74fd7"  # Default for testnet
        logger.warning(f"Using default gateway address: {gateway_address}")
    
    uniswap_router_address = chain_config.get("uniswap_router_address")
    if not uniswap_router_address:
        uniswap_router_address = "0x2ca7d64A7EFE2D62A725E2B35Cf7230D6677FfEe"  # Default for testnet
        logger.warning(f"Using default router address: {uniswap_router_address}")
    
    # Convert all addresses to checksum format
    owner_address = to_checksum_address(account.address)
    gateway_address = to_checksum_address(gateway_address)
    uniswap_router_address = to_checksum_address(uniswap_router_address)
    contract_address = to_checksum_address(CONTRACT_ADDRESS)
    
    logger.info(f"Owner address: {owner_address}")
    logger.info(f"Gateway address: {gateway_address}")
    logger.info(f"Router address: {uniswap_router_address}")
    
    # Find initialize function in ABI to get function selector
    initialize_abi = None
    for item in token_abi:
        if isinstance(item, dict) and item.get('type') == 'function' and item.get('name') == 'initialize':
            initialize_abi = item
            break
    
    if not initialize_abi:
        logger.error("Initialize function not found in ABI")
        return False
    
    # Extract parameter types from ABI
    param_types = [inp['type'] for inp in initialize_abi.get('inputs', [])]
    logger.info(f"Initialize function parameter types: {param_types}")
    
    # Prepare parameters
    params = [
        owner_address,           # initialOwner (address)
        TOKEN_NAME,              # name (string)
        TOKEN_SYMBOL,            # symbol (string)
        gateway_address,         # gatewayAddress (address)
        3000000,                 # gas (uint256)
        uniswap_router_address   # uniswapRouterAddress (address)
    ]
    
    # Log parameters
    for i, (p, t) in enumerate(zip(params, param_types)):
        logger.info(f"Parameter {i}: {p} ({t})")
    
    # Manual ABI encoding to work around web3.py checksum validation
    
    # 1. Create the function selector
    selector = Web3.keccak(text="initialize(address,string,string,address,uint256,address)")[0:4].hex()
    logger.info(f"Function selector: 0x{selector}")
    
    # 2. Encode parameters
    try:
        encoded_params = eth_abi.encode(
            param_types,
            params
        ).hex()
        logger.info(f"Encoded parameters: 0x{encoded_params[:64]}...")
    except Exception as e:
        logger.error(f"Error encoding parameters: {e}")
        return False
    
    # 3. Combine selector and encoded params
    data = f"0x{selector}{encoded_params}"
    logger.info(f"Transaction data: {data[:64]}...")
    
    # Prepare transaction
    tx = {
        'from': account.address,
        'to': contract_address,
        'data': data,
        'gas': 8000000,
        'gasPrice': web3.eth.gas_price,
        'nonce': web3.eth.get_transaction_count(account.address)
    }
    
    # Sign and send transaction
    try:
        signed_tx = account.sign_transaction(tx)
        tx_hash = web3.eth.send_raw_transaction(signed_tx.rawTransaction)
        logger.info(f"Transaction sent with hash: {web3.to_hex(tx_hash)}")
        
        # Wait for receipt
        receipt = web3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
        
        if receipt.status == 1:
            logger.info(f"Initialization successful! Gas used: {receipt.gasUsed}")
            
            # Verify the initialization worked
            contract = web3.eth.contract(address=contract_address, abi=token_abi)
            try:
                # Check name and symbol
                name = contract.functions.name().call()
                symbol = contract.functions.symbol().call()
                owner = contract.functions.owner().call()
                
                logger.info(f"Token name: {name}")
                logger.info(f"Token symbol: {symbol}")
                logger.info(f"Token owner: {owner}")
                
                if name == TOKEN_NAME and symbol == TOKEN_SYMBOL and owner.lower() == account.address.lower():
                    logger.info("Initialization verified successfully!")
                    return True
                else:
                    logger.warning("Initialization may have failed - token data mismatch")
                    logger.warning(f"Expected: {TOKEN_NAME}/{TOKEN_SYMBOL}/{account.address}")
                    logger.warning(f"Got: {name}/{symbol}/{owner}")
            except Exception as e:
                logger.error(f"Error verifying initialization: {e}")
                
            return True
        else:
            logger.error(f"Initialization failed! Transaction reverted.")
            return False
    except Exception as e:
        logger.error(f"Error sending transaction: {e}")
        return False

async def main():
    """Main function to run the initialization"""
    logger.info("Starting ZetaChain Token Initialization")
    
    # Initialize token
    success = await init_token()
    
    if success:
        logger.info("Initialization completed successfully!")
    else:
        logger.error("Initialization failed!")
    
    return success

if __name__ == "__main__":
    asyncio.run(main()) 