#!/usr/bin/env python3

import asyncio
import json
import os
from datetime import datetime
from dotenv import load_dotenv

from app.utils.web3_helper import (
    get_web3, 
    get_account, 
    load_contract_data,
    UNIVERSAL_TOKEN_ABI,
    UNIVERSAL_TOKEN_BYTECODE,
    ZC_UNIVERSAL_TOKEN_ABI,
    ZC_UNIVERSAL_TOKEN_BYTECODE
)
from app.services.deployment import deployment_service
from app.utils.logger import logger

# Load environment variables
load_dotenv()

# Test configuration
TEST_TOKEN_NAME = "Universal Test Token"
TEST_TOKEN_SYMBOL = "UTT"
TEST_TOKEN_DECIMALS = 18
TEST_TOKEN_SUPPLY = 1000000  # 1 million tokens
SELECTED_CHAINS = ["7001", "11155111"]  # ZetaChain Testnet and Sepolia
TEST_WALLET = os.environ.get("TEST_WALLET_ADDRESS")  # Will fallback to deployer if not set

async def test_single_chain_deployment(chain_id):
    """Test deployment on a single chain"""
    logger.info(f"Testing deployment on chain {chain_id}...")
    
    # Get Web3 instance and account
    web3 = await get_web3(chain_id)
    account = get_account()
    
    if not web3 or not account:
        logger.error(f"Failed to get web3 or account for chain {chain_id}")
        return False
    
    logger.info(f"Connected to chain {chain_id} with account {account.address}")
    
    # Use appropriate ABI and bytecode based on chain
    if chain_id == 7001:  # ZetaChain
        contract_abi = ZC_UNIVERSAL_TOKEN_ABI
        contract_bytecode = ZC_UNIVERSAL_TOKEN_BYTECODE
    else:  # EVM chain
        contract_abi = UNIVERSAL_TOKEN_ABI
        contract_bytecode = UNIVERSAL_TOKEN_BYTECODE
    
    # Create contract factory
    contract_factory = web3.eth.contract(
        abi=contract_abi,
        bytecode=contract_bytecode
    )
    
    # Display gas price
    gas_price = web3.eth.gas_price
    logger.info(f"Current gas price on chain {chain_id}: {gas_price}")
    
    # Get current balance
    balance = web3.eth.get_balance(account.address)
    logger.info(f"Account balance on chain {chain_id}: {web3.from_wei(balance, 'ether')} ETH")
    
    if balance == 0:
        logger.error(f"Account has no balance on chain {chain_id}")
        return False
    
    logger.info(f"Chain {chain_id} setup successful, ready for deployment")
    return True

async def test_token_deployment():
    """Test full token deployment workflow"""
    logger.info("Starting token deployment test...")
    
    # Ensure contract data is loaded
    if not load_contract_data():
        logger.error("Failed to load contract data")
        return False
    
    # Check if we have the necessary chain connections
    for chain_id in [int(c) for c in SELECTED_CHAINS]:
        if not await test_single_chain_deployment(chain_id):
            logger.error(f"Single chain test failed for {chain_id}")
            return False
    
    # Set up deployment parameters
    owner_address = TEST_WALLET or get_account().address
    logger.info(f"Using owner address: {owner_address}")
    
    # Token configuration
    token_config = {
        "token_name": TEST_TOKEN_NAME,
        "token_symbol": TEST_TOKEN_SYMBOL,
        "decimals": TEST_TOKEN_DECIMALS,
        "total_supply": TEST_TOKEN_SUPPLY
    }
    
    # Sample allocations (empty for this test)
    allocations = []
    
    # Create mock DB session
    class MockDB:
        def add(self, obj):
            logger.info(f"Mock DB: Adding {obj}")
        
        def commit(self):
            logger.info("Mock DB: Committing")
        
        def refresh(self, obj):
            logger.info(f"Mock DB: Refreshing {obj}")
    
    mock_db = MockDB()
    
    # Call the deployment service
    logger.info("Starting deployment through service...")
    result = await deployment_service.deploy_universal_token(
        token_config=token_config,
        selected_chains=SELECTED_CHAINS,
        final_owner_address=owner_address,
        allocations=allocations,
        db=mock_db
    )
    
    # Save the result for later analysis
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    with open(f"deployment_result_{timestamp}.json", "w") as f:
        json.dump(result, f, indent=2)
    
    logger.info(f"Deployment result saved to deployment_result_{timestamp}.json")
    
    # Check deployment result
    if result.get("final_status") == "completed" or result.get("final_status") == "completed_with_warnings":
        logger.info("Deployment successful!")
        
        # Log contract addresses
        logger.info(f"ZetaChain contract: {result.get('zetaChain', {}).get('proxy_address')}")
        for chain_id in SELECTED_CHAINS:
            if chain_id != "7001":  # Skip ZetaChain (already logged)
                chain_result = result.get("evmChains", {}).get(chain_id, {})
                logger.info(f"Chain {chain_id} contract: {chain_result.get('proxy_address')}")
                
        return True
    else:
        logger.error(f"Deployment failed: {result.get('final_status')}")
        logger.error(f"Error message: {result.get('error_message', 'No error message provided')}")
        return False

async def main():
    """Main function to run the test"""
    logger.info("Starting Universal Token deployment test")
    
    try:
        success = await test_token_deployment()
        if success:
            logger.info("✅ Test successful!")
        else:
            logger.error("❌ Test failed!")
    except Exception as e:
        logger.error(f"❌ Test failed with exception: {e}", exc_info=True)
        return False
    
    return success

if __name__ == "__main__":
    success = asyncio.run(main())
    exit(0 if success else 1) 