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
    load_contract_data,
    ZC_UNIVERSAL_TOKEN_ABI,
    ZC_UNIVERSAL_TOKEN_BYTECODE,
    deploy_implementation
)
from app.utils.logger import logger
from app.utils.chain_config import get_chain_config

async def test_minimal_deployment():
    """Test minimal deployment of just the implementation contract"""
    logger.info("Starting minimal deployment test")
    
    # Load contract data
    logger.info("Loading contract data...")
    if not load_contract_data():
        logger.error("Failed to load contract data")
        return False
    
    # Connect to ZetaChain
    chain_id = 7001  # ZetaChain Testnet
    logger.info(f"Connecting to ZetaChain Testnet (chain_id: {chain_id})...")
    web3 = await get_web3(chain_id)
    if not web3:
        logger.error("Failed to connect to ZetaChain Testnet")
        return False
    
    # Get account
    account = get_account()
    if not account:
        logger.error("Failed to get account")
        return False
    
    logger.info(f"Using account: {account.address}")
    
    # Check balance
    balance = web3.eth.get_balance(account.address)
    logger.info(f"Account balance: {web3.from_wei(balance, 'ether')} ZETA")
    if balance == 0:
        logger.error("Account has no balance")
        return False
    
    # Deploy implementation contract
    logger.info("Deploying implementation contract...")
    result = await deploy_implementation(
        web3=web3,
        account=account,
        contract_abi=ZC_UNIVERSAL_TOKEN_ABI,
        contract_bytecode=ZC_UNIVERSAL_TOKEN_BYTECODE,
        constructor_args=None,
        gas_limit_override=5000000
    )
    
    if not result.get("success"):
        logger.error(f"Failed to deploy implementation: {result.get('message')}")
        return False
    
    # Print success message
    impl_address = result.get("contract_address")
    logger.info(f"Implementation contract deployed at: {impl_address}")
    
    logger.info("Deployment test completed successfully!")
    return True

async def main():
    try:
        success = await test_minimal_deployment()
        if success:
            logger.info("✅ Minimal deployment test successful!")
        else:
            logger.error("❌ Minimal deployment test failed!")
            return False
    except Exception as e:
        logger.error(f"❌ Test failed with exception: {e}", exc_info=True)
        return False
    
    return success

if __name__ == "__main__":
    success = asyncio.run(main())
    exit(0 if success else 1) 