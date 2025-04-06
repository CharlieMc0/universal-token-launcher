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
    load_contract_data,
    UNIVERSAL_TOKEN_ABI,
    UNIVERSAL_TOKEN_BYTECODE,
    ZC_UNIVERSAL_TOKEN_ABI,
    ZC_UNIVERSAL_TOKEN_BYTECODE,
    encode_initialize_data,
    deploy_implementation,
    deploy_erc1967_proxy
)
from app.utils.logger import logger
from app.utils.chain_config import get_chain_config
from app.config import Config

# Test configuration
TEST_TOKEN_NAME = "Universal Test Token"
TEST_TOKEN_SYMBOL = "UTT"
TEST_TOKEN_DECIMALS = 18
TEST_TOKEN_SUPPLY = 1000000  # 1 million tokens
SELECTED_CHAINS = ["7001", "11155111"]  # ZetaChain Testnet and Sepolia
TEST_WALLET = os.environ.get("TEST_WALLET_ADDRESS")  # Will fallback to deployer if not set

async def test_single_chain_deployment(chain_id):
    """Test web3 connection and contract validation on a single chain"""
    logger.info(f"Testing basic connection for chain {chain_id}...")
    
    # Get Web3 instance and account
    web3 = await get_web3(chain_id)
    account = get_account()
    
    if not web3 or not account:
        logger.error(f"Failed to get web3 or account for chain {chain_id}")
        return False
    
    logger.info(f"Connected to chain {chain_id} with account {account.address}")
    
    # Use appropriate ABI and bytecode based on chain
    if str(chain_id) == "7001":  # ZetaChain
        contract_abi = ZC_UNIVERSAL_TOKEN_ABI
        contract_bytecode = ZC_UNIVERSAL_TOKEN_BYTECODE
    else:  # EVM chain
        contract_abi = UNIVERSAL_TOKEN_ABI
        contract_bytecode = UNIVERSAL_TOKEN_BYTECODE
    
    # Display gas price
    gas_price = web3.eth.gas_price
    logger.info(f"Current gas price on chain {chain_id}: {gas_price}")
    
    # Get current balance
    balance = web3.eth.get_balance(account.address)
    logger.info(f"Account balance on chain {chain_id}: {web3.from_wei(balance, 'ether')} ETH")
    
    if balance == 0:
        logger.error(f"Account has no balance on chain {chain_id}")
        return False
    
    # Validate contract ABI contains key methods
    required_methods = ["initialize", "transferOwnership", "mint"]
    for method in required_methods:
        method_exists = any(entry.get('name') == method for entry in contract_abi if isinstance(entry, dict) and 'name' in entry)
        if method_exists:
            logger.info(f"Contract ABI contains required method: {method}")
        else:
            logger.error(f"Contract ABI missing required method: {method}")
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

async def test_deploy_contract_on_chain(chain_id):
    """Test contract deployment on a specific chain"""
    logger.info(f"Testing contract deployment on chain {chain_id}...")
    
    # Get Web3 instance and account
    web3 = await get_web3(int(chain_id))
    account = get_account()
    
    # Use appropriate ABI and bytecode based on chain
    if chain_id == "7001":  # ZetaChain
        contract_abi = ZC_UNIVERSAL_TOKEN_ABI
        contract_bytecode = ZC_UNIVERSAL_TOKEN_BYTECODE
        
        # Get chain configuration
        chain_config = get_chain_config(int(chain_id))
        gateway_address = chain_config.get("gateway_address")
        uniswap_router_address = chain_config.get("uniswap_router_address")
        
        if not uniswap_router_address:
            uniswap_router_address = "0x2ca7d64A7EFE2D62A725E2B35Cf7230D6677FfEe"  # Default for testnet
            logger.warning(f"Using default Uniswap router address: {uniswap_router_address}")
        
        # Deploy implementation
        logger.info("Deploying ZetaChain implementation contract...")
        impl_result = await deploy_implementation(
            web3=web3,
            account=account,
            contract_abi=contract_abi,
            contract_bytecode=contract_bytecode,
            constructor_args=None,
            gas_limit_override=5000000
        )
        
        if not impl_result.get("success"):
            logger.error(f"Failed to deploy ZetaChain implementation: {impl_result.get('message')}")
            return False
        
        impl_address = impl_result.get("contract_address")
        logger.info(f"ZetaChain implementation deployed at: {impl_address}")
        
        # Create initialization data
        logger.info("Preparing initialization data...")
        init_data = encode_initialize_data(
            web3=web3,
            contract_abi=contract_abi,
            name=TEST_TOKEN_NAME,
            symbol=TEST_TOKEN_SYMBOL,
            gateway_address=gateway_address,
            owner_address=account.address,  # Use the service account as initial owner
            gas=3000000,
            uniswap_router_address=uniswap_router_address
        )
        
        # Deploy proxy
        logger.info("Deploying ZetaChain proxy contract...")
        proxy_result = await deploy_erc1967_proxy(
            web3=web3,
            account=account,
            implementation_address=impl_address,
            init_data=init_data,
            gas_limit_override=5000000
        )
        
        if not proxy_result.get("success"):
            logger.error(f"Failed to deploy ZetaChain proxy: {proxy_result.get('message')}")
            return False
        
        proxy_address = proxy_result.get("contract_address")
        logger.info(f"ZetaChain proxy deployed at: {proxy_address}")
        
    else:  # EVM chain
        contract_abi = UNIVERSAL_TOKEN_ABI
        contract_bytecode = UNIVERSAL_TOKEN_BYTECODE
        
        # Get chain configuration
        chain_config = get_chain_config(int(chain_id))
        gateway_address = chain_config.get("gateway_address")
        
        # Deploy implementation
        logger.info(f"Deploying EVM implementation contract on chain {chain_id}...")
        impl_result = await deploy_implementation(
            web3=web3,
            account=account,
            contract_abi=contract_abi,
            contract_bytecode=contract_bytecode,
            constructor_args=None,
            gas_limit_override=5000000
        )
        
        if not impl_result.get("success"):
            logger.error(f"Failed to deploy EVM implementation: {impl_result.get('message')}")
            return False
        
        impl_address = impl_result.get("contract_address")
        logger.info(f"EVM implementation deployed at: {impl_address}")
        
        # Create initialization data
        logger.info("Preparing initialization data...")
        init_data = encode_initialize_data(
            web3=web3,
            contract_abi=contract_abi,
            name=TEST_TOKEN_NAME,
            symbol=TEST_TOKEN_SYMBOL,
            gateway_address=gateway_address,
            owner_address=account.address,  # Use the service account as initial owner
            gas=3000000
        )
        
        # Deploy proxy
        logger.info(f"Deploying EVM proxy contract on chain {chain_id}...")
        proxy_result = await deploy_erc1967_proxy(
            web3=web3,
            account=account,
            implementation_address=impl_address,
            init_data=init_data,
            gas_limit_override=5000000
        )
        
        if not proxy_result.get("success"):
            logger.error(f"Failed to deploy EVM proxy: {proxy_result.get('message')}")
            return False
        
        proxy_address = proxy_result.get("contract_address")
        logger.info(f"EVM proxy deployed at: {proxy_address}")
    
    # Verify contract on explorer (limited to logging deployment success)
    logger.info(f"Successfully deployed contract on chain {chain_id} at {proxy_address}")
    
    # Save deployment info to a JSON file
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    deployment_info = {
        "chain_id": chain_id,
        "implementation_address": impl_address,
        "proxy_address": proxy_address,
        "token_name": TEST_TOKEN_NAME,
        "token_symbol": TEST_TOKEN_SYMBOL,
        "deployer": account.address,
        "timestamp": timestamp
    }
    
    with open(f"deployment_{chain_id}_{timestamp}.json", "w") as f:
        json.dump(deployment_info, f, indent=2)
    
    logger.info(f"Deployment info saved to deployment_{chain_id}_{timestamp}.json")
    return True

async def main():
    """Main function to run the test"""
    logger.info("Starting Universal Token deployment test")
    
    # Ensure contract data is loaded
    logger.info("Loading contract data...")
    if not load_contract_data():
        logger.error("Failed to load contract data")
        return False
    
    # Test basic chain connections first
    logger.info("Testing chain connections...")
    for chain_id in SELECTED_CHAINS:
        if not await test_single_chain_deployment(chain_id):
            logger.error(f"Chain connection test failed for {chain_id}")
            return False
    
    # Deploy contracts on each chain
    for chain_id in SELECTED_CHAINS:
        logger.info(f"Starting deployment test on chain {chain_id}...")
        try:
            success = await test_deploy_contract_on_chain(chain_id)
            if success:
                logger.info(f"Deployment on chain {chain_id} successful!")
            else:
                logger.error(f"Deployment on chain {chain_id} failed!")
                return False
        except Exception as e:
            logger.error(f"Exception during deployment on chain {chain_id}: {e}", exc_info=True)
            return False
    
    logger.info("All deployment tests completed successfully!")
    return True

if __name__ == "__main__":
    success = asyncio.run(main())
    exit(0 if success else 1) 