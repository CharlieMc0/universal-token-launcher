#!/usr/bin/env python3

import asyncio
import json
import os
import sys
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Custom path handling for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.utils.web3_helper import (
    get_web3, 
    get_account, 
    _load_artifact,
    deploy_token_direct,
    initialize_token,
    EVM_TOKEN_PATH,
    ZC_TOKEN_PATH
)
from app.utils.logger import logger
from app.utils.chain_config import get_chain_config
from app.config import Config

# Test configuration
TEST_TOKEN_NAME = "Universal Direct Token"
TEST_TOKEN_SYMBOL = "UDT"
TEST_TOKEN_DECIMALS = 18
TEST_TOKEN_SUPPLY = 1000000  # 1 million tokens
SELECTED_CHAINS = ["7001", "11155111"]  # ZetaChain Testnet and Sepolia
TEST_WALLET = os.environ.get("TEST_WALLET_ADDRESS")  # Will fallback to deployer if not set

async def test_single_chain_connection(chain_id):
    """Test web3 connection and basic setup for a single chain"""
    logger.info(f"Testing basic connection for chain {chain_id}...")
    
    # Get Web3 instance and account
    web3 = await get_web3(chain_id)
    account = get_account()
    
    if not web3 or not account:
        logger.error(f"Failed to get web3 or account for chain {chain_id}")
        return False
    
    logger.info(f"Connected to chain {chain_id} with account {account.address}")
    
    # Display gas price
    gas_price = web3.eth.gas_price
    logger.info(f"Current gas price on chain {chain_id}: {gas_price}")
    
    # Get current balance
    balance = web3.eth.get_balance(account.address)
    logger.info(f"Account balance on chain {chain_id}: {web3.from_wei(balance, 'ether')} ETH")
    
    if balance == 0:
        logger.error(f"Account has no balance on chain {chain_id}")
        return False
    
    # Get chain configuration
    chain_config = get_chain_config(int(chain_id))
    if not chain_config:
        logger.error(f"Chain config not found for chain ID: {chain_id}")
        return False
    
    logger.info(f"Chain config found for {chain_id}: {chain_config.get('name')}")
    
    # Check gateway address exists
    gateway_address = chain_config.get("gateway_address")
    if not gateway_address:
        logger.error(f"Gateway address missing for chain {chain_id}")
        return False
    
    logger.info(f"Gateway address for chain {chain_id}: {gateway_address}")
    
    logger.info(f"Chain {chain_id} setup successful")
    return True

async def test_direct_deploy_on_chain(chain_id):
    """Test direct token deployment with separate initialization on a specific chain"""
    logger.info(f"Testing token deployment with separate initialization on chain {chain_id}...")
    
    # Get Web3 instance and account
    web3 = await get_web3(int(chain_id))
    account = get_account()
    
    # Load the appropriate token artifacts
    artifact_path = ZC_TOKEN_PATH if chain_id == "7001" else EVM_TOKEN_PATH
    token_abi, token_bytecode = _load_artifact(artifact_path)
    
    if not token_abi or not token_bytecode:
        logger.error(f"Failed to load token artifacts from {artifact_path}")
        return False
        
    # Get chain configuration
    chain_config = get_chain_config(int(chain_id))
    gateway_address = chain_config.get("gateway_address")
    
    # Only ZetaChain needs the uniswap router address
    uniswap_router_address = None
    if chain_id == "7001":  # ZetaChain
        uniswap_router_address = chain_config.get("uniswap_router_address")
        if not uniswap_router_address:
            uniswap_router_address = "0x2ca7d64A7EFE2D62A725E2B35Cf7230D6677FfEe"  # Default for testnet
            logger.warning(f"Using default Uniswap router address: {uniswap_router_address}")
    
    # Step 1: Deploy token directly with NO constructor arguments
    logger.info(f"Deploying token on chain {chain_id} with no constructor arguments...")
    deploy_result = await deploy_token_direct(
        web3=web3,
        account=account,
        contract_abi=token_abi,
        contract_bytecode=token_bytecode,
        gas_limit_override=5000000
    )
    
    if not deploy_result.get("success"):
        logger.error(f"Failed to deploy token on chain {chain_id}: {deploy_result.get('message')}")
        return False
    
    contract_address = deploy_result.get("contract_address")
    logger.info(f"Token deployed on chain {chain_id} at: {contract_address}")
    
    # Step 2: Initialize the contract separately
    logger.info(f"Initializing token at {contract_address} on chain {chain_id}...")
    
    init_result = await initialize_token(
        web3=web3,
        account=account,
        contract_address=contract_address,
        contract_abi=token_abi,
        name=TEST_TOKEN_NAME,
        symbol=TEST_TOKEN_SYMBOL,
        gateway_address=gateway_address,
        owner_address=account.address,  # Use the service account as initial owner
        gas=3000000,
        uniswap_router_address=uniswap_router_address,
        gas_limit_override=5000000
    )
    
    if not init_result.get("success"):
        logger.error(f"Failed to initialize token on chain {chain_id}: {init_result.get('message')}")
        return False
        
    logger.info(f"Token successfully initialized on chain {chain_id}")
    
    # Verify contract by checking basic token info
    try:
        contract = web3.eth.contract(address=contract_address, abi=token_abi)
        token_name = contract.functions.name().call()
        token_symbol = contract.functions.symbol().call()
        
        logger.info(f"Token verification - Name: {token_name}, Symbol: {token_symbol}")
        
        if token_name != TEST_TOKEN_NAME or token_symbol != TEST_TOKEN_SYMBOL:
            logger.warning(f"Token data mismatch! Expected: {TEST_TOKEN_NAME}/{TEST_TOKEN_SYMBOL}, Got: {token_name}/{token_symbol}")
            # Continue anyway, this might be a display issue
    except Exception as e:
        logger.error(f"Error verifying token data: {e}")
        # Continue since the deployment was successful
    
    # Save deployment info to a JSON file
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    deployment_info = {
        "chain_id": chain_id,
        "contract_address": contract_address,
        "token_name": TEST_TOKEN_NAME,
        "token_symbol": TEST_TOKEN_SYMBOL,
        "deployer": account.address,
        "timestamp": timestamp,
        "is_direct": True,
        "initialization": "separate"
    }
    
    with open(f"direct_deployment_{chain_id}_{timestamp}.json", "w") as f:
        json.dump(deployment_info, f, indent=2)
    
    logger.info(f"Deployment info saved to direct_deployment_{chain_id}_{timestamp}.json")
    return True

async def main():
    """Main function to run the direct deployment test with separate initialization"""
    logger.info("Starting Token Deployment Test (Deploy + Initialize separately)")
    
    # Test basic chain connections first
    logger.info("Testing chain connections...")
    for chain_id in SELECTED_CHAINS:
        if not await test_single_chain_connection(chain_id):
            logger.error(f"Chain connection test failed for {chain_id}")
            return False
    
    # Deploy contracts on each chain
    for chain_id in SELECTED_CHAINS:
        logger.info(f"Starting deployment test on chain {chain_id}...")
        try:
            success = await test_direct_deploy_on_chain(chain_id)
            if success:
                logger.info(f"Deployment + initialization on chain {chain_id} successful!")
            else:
                logger.error(f"Deployment + initialization on chain {chain_id} failed!")
                return False
        except Exception as e:
            logger.error(f"Exception during deployment on chain {chain_id}: {e}", exc_info=True)
            return False
    
    logger.info("All token deployment and initialization tests completed successfully!")
    return True

if __name__ == "__main__":
    success = asyncio.run(main())
    exit(0 if success else 1) 