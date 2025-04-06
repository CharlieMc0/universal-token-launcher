#!/usr/bin/env python3

import asyncio
import json
import os
import sys
import time
import datetime
from datetime import datetime as dt
from dotenv import load_dotenv
from hexbytes import HexBytes

# Load environment variables
load_dotenv()

# Custom path handling for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.utils.web3_helper import (
    get_web3, 
    get_account, 
    _load_artifact,
    deploy_token_direct,
    call_contract_method,
    EVM_TOKEN_PATH,
    ZC_TOKEN_PATH
)
from app.utils.logger import logger
from app.utils.chain_config import get_chain_config

# Configuration
current_time = dt.now().strftime("%H%M%S")
TOKEN_NAME = f"Universal Token {current_time}"
TOKEN_SYMBOL = f"UT{current_time}"
# Use the first argument as chain ID if provided, or default to ZetaChain
CHAIN_ID = sys.argv[1] if len(sys.argv) > 1 else "7001"

async def deploy_token():
    """Deploy a token contract with the fixed approach"""
    logger.info(f"Deploying token on chain {CHAIN_ID} using fixed approach")
    
    # Get Web3 instance and account
    web3 = await get_web3(int(CHAIN_ID))
    account = get_account()
    
    if not web3 or not account:
        logger.error("Failed to get web3 or account")
        return False
    
    # Load the appropriate token artifacts
    artifact_path = ZC_TOKEN_PATH if CHAIN_ID == "7001" else EVM_TOKEN_PATH
    token_abi, token_bytecode = _load_artifact(artifact_path)
    
    if not token_abi or not token_bytecode:
        logger.error(f"Failed to load token artifacts from {artifact_path}")
        return False
        
    # Get chain configuration
    chain_config = get_chain_config(int(CHAIN_ID))
    if not chain_config:
        logger.error(f"Chain config not found for chain ID: {CHAIN_ID}")
        return False
    
    gateway_address = chain_config.get("gateway_address")
    if not gateway_address:
        logger.error(f"Gateway address not found for chain ID: {CHAIN_ID}")
        return False
    
    # Only ZetaChain needs the uniswap router address
    uniswap_router_address = None
    if CHAIN_ID == "7001":  # ZetaChain
        uniswap_router_address = chain_config.get("uniswap_router_address")
        if not uniswap_router_address:
            uniswap_router_address = "0x2ca7d64A7EFE2D62A725E2B35Cf7230D6677FfEe"  # Default for testnet
            logger.warning(f"Using default Uniswap router address: {uniswap_router_address}")
    
    # Step 1: Deploy token with no constructor arguments
    logger.info("Step 1: Deploying token contract with NO constructor arguments")
    deploy_result = await deploy_token_direct(
        web3=web3,
        account=account,
        contract_abi=token_abi,
        contract_bytecode=token_bytecode,
        gas_limit_override=8000000  # Higher gas limit for safety
    )
    
    if not deploy_result.get("success"):
        logger.error(f"Failed to deploy token: {deploy_result.get('message')}")
        return False
    
    contract_address = deploy_result.get("contract_address")
    logger.info(f"Token deployed successfully at: {contract_address}")
    
    # Wait a bit to ensure contract deployment is fully propagated
    logger.info("Waiting 5 seconds for deployment to propagate...")
    time.sleep(5)
    
    # Step 2: Verify contract exists with code
    logger.info("Step 2: Verifying contract has code")
    code = web3.eth.get_code(contract_address)
    if not code or code == '0x' or code == b'0x':
        logger.error(f"No code found at address {contract_address}!")
        return False
    
    logger.info(f"Contract verified! Code size: {len(code)} bytes")
    
    # Step 3: Initialize the deployed contract
    logger.info("Step 3: Initializing the contract with token parameters")
    
    # Prepare initialization arguments based on chain type
    init_args = []
    if CHAIN_ID == "7001":  # ZetaChain (6 params)
        # Try with different parameter handling for ZetaChain
        try:
            # Use raw addresses for gateway and router (don't checksum)
            # These might be payable addresses in the contract
            gateway_raw = gateway_address.lower()
            router_raw = uniswap_router_address.lower()
            
            logger.info(f"Using raw gateway address: {gateway_raw}")
            logger.info(f"Using raw router address: {router_raw}")
            
            # For ZetaChain, try with raw addresses (not checksummed)
            init_args = [
                web3.to_checksum_address(account.address),  # initialOwner (regular address)
                TOKEN_NAME,                                # name
                TOKEN_SYMBOL,                              # symbol
                gateway_raw,                               # gatewayAddress (raw address)
                3000000,                                   # gas
                router_raw                                 # uniswapRouterAddress (raw address)
            ]
            logger.info("Using ZetaChain initialize signature with raw addresses")
        except Exception as addr_err:
            logger.error(f"Error preparing ZetaChain initialize parameters: {addr_err}")
            return False
    else:  # EVM chains (5 params)
        # Convert gateway address to proper checksum format
        try:
            # First make sure the gateway address is a valid address
            if not web3.is_address(gateway_address):
                logger.error(f"Invalid gateway address: {gateway_address}")
                return False
                
            # Checksum the gateway address properly
            checksummed_gateway = web3.to_checksum_address(gateway_address)
            logger.info(f"Checksummed gateway address: {checksummed_gateway}")
            
            init_args = [
                web3.to_checksum_address(account.address),  # initialOwner
                TOKEN_NAME,                                # name
                TOKEN_SYMBOL,                              # symbol
                checksummed_gateway,                       # gatewayAddress (use checksummed)
                3000000                                    # gas
            ]
            logger.info("Using EVM initialize signature (5 parameters)")
        except Exception as addr_err:
            logger.error(f"Error preparing EVM initialize parameters: {addr_err}")
            return False
    
    # Log initialization arguments
    for i, arg in enumerate(init_args):
        logger.info(f"  Initialize arg {i}: {arg}")
    
    # Call initialize with detailed debugging
    logger.info(f"Calling initialize on {contract_address} with {len(init_args)} arguments")
    
    # Try to encode the initialization data manually to verify it
    contract = web3.eth.contract(address=contract_address, abi=token_abi)
    try:
        encoded_data = contract.encodeABI(fn_name="initialize", args=init_args)
        logger.info(f"Encoded initialize data: {encoded_data[:100]}...")
    except Exception as encode_err:
        logger.error(f"Error encoding initialize data: {encode_err}")
        # Continue with the call anyway
    
    init_result = await call_contract_method(
        web3=web3,
        account=account,
        contract_address=contract_address,
        contract_abi=token_abi,
        method_name="initialize",
        args=init_args,
        gas_limit=8000000  # Higher gas limit for safety
    )
    
    if not init_result.get("success"):
        logger.error(f"Contract initialization failed: {init_result.get('message')}")
        logger.error("Deployment incomplete - contract exists but not initialized!")
        
        # Check if there's a transaction hash
        tx_hash = init_result.get("transaction_hash")
        if tx_hash:
            logger.info(f"Failed initialization transaction hash: {tx_hash}")
            try:
                receipt = init_result.get("receipt")
                logger.info(f"Gas used: {receipt.get('gasUsed', 'unknown')}")
            except:
                pass
        
        # Save partial deployment info anyway for debugging
        save_deployment_info(contract_address, account.address, "failed_init")
        return False
    
    logger.info("Contract initialized successfully!")
    
    # Step 4: Verify initialization worked by checking contract data
    logger.info("Step 4: Verifying contract initialization")
    
    contract = web3.eth.contract(address=contract_address, abi=token_abi)
    
    try:
        owner = contract.functions.owner().call()
        name = contract.functions.name().call()
        symbol = contract.functions.symbol().call()
        
        logger.info(f"Contract data:")
        logger.info(f"  Owner: {owner}")
        logger.info(f"  Name: {name}")
        logger.info(f"  Symbol: {symbol}")
        
        if owner.lower() != account.address.lower():
            logger.warning(f"Owner mismatch! Expected: {account.address}, Got: {owner}")
        
        if name != TOKEN_NAME:
            logger.warning(f"Name mismatch! Expected: {TOKEN_NAME}, Got: {name}")
            
        if symbol != TOKEN_SYMBOL:
            logger.warning(f"Symbol mismatch! Expected: {TOKEN_SYMBOL}, Got: {symbol}")
    except Exception as e:
        logger.error(f"Error checking contract data: {e}")
    
    # Add ZetaChain specific verification for contract
    if CHAIN_ID == "7001":
        logger.info("Checking ZetaChain-specific contract properties:")
        try:
            # Check gateway address
            if hasattr(contract.functions, 'gatewayAddress'):
                gateway = contract.functions.gatewayAddress().call()
                logger.info(f"Contract gateway address: {gateway}")
                if gateway.lower() != gateway_address.lower():
                    logger.warning(f"Gateway address mismatch! Expected: {gateway_address}, Got: {gateway}")
            else:
                logger.info("Contract does not have gatewayAddress() method")
                
            # Check gas limit
            if hasattr(contract.functions, 'gas'):
                gas_limit = contract.functions.gas().call()
                logger.info(f"Contract gas limit: {gas_limit}")
            else:
                logger.info("Contract does not have gas() method")
                
            # Check router address
            if hasattr(contract.functions, 'uniswapRouterAddress'):
                router = contract.functions.uniswapRouterAddress().call()
                logger.info(f"Contract uniswap router: {router}")
                if router.lower() != uniswap_router_address.lower():
                    logger.warning(f"Router address mismatch! Expected: {uniswap_router_address}, Got: {router}")
            else:
                logger.info("Contract does not have uniswapRouterAddress() method")
        except Exception as e:
            logger.error(f"Error checking ZetaChain-specific properties: {e}")
    
    # Step 5: Try to mint some tokens
    logger.info("Step 5: Minting initial token supply")
    
    try:
        # Amount to mint (1 million tokens with 18 decimals)
        amount = web3.to_wei(1000000, "ether")
        
        mint_result = await call_contract_method(
            web3=web3,
            account=account,
            contract_address=contract_address,
            contract_abi=token_abi,
            method_name="mint",
            args=[account.address, amount],
            gas_limit=5000000
        )
        
        if mint_result.get("success"):
            logger.info(f"Successfully minted 1,000,000 tokens!")
            
            # Check balance
            balance = contract.functions.balanceOf(account.address).call()
            logger.info(f"Token balance: {web3.from_wei(balance, 'ether')} {TOKEN_SYMBOL}")
        else:
            logger.error(f"Minting failed: {mint_result.get('message')}")
    except Exception as e:
        logger.error(f"Error minting tokens: {e}")
    
    # Save deployment information
    save_deployment_info(contract_address, account.address, "success")
    
    logger.info("Deployment and initialization complete!")
    return True

def save_deployment_info(contract_address, deployer, status):
    """Save deployment information to a JSON file"""
    timestamp = dt.now().strftime("%Y%m%d_%H%M%S")
    deployment_info = {
        "chain_id": CHAIN_ID,
        "contract_address": contract_address,
        "token_name": TOKEN_NAME,
        "token_symbol": TOKEN_SYMBOL,
        "deployer": deployer,
        "timestamp": timestamp,
        "status": status
    }
    
    filename = f"fixed_deployment_{CHAIN_ID}_{timestamp}.json"
    with open(filename, "w") as f:
        json.dump(deployment_info, f, indent=2)
    
    logger.info(f"Deployment info saved to {filename}")

async def main():
    """Main function to run the deployment"""
    logger.info("Starting Fixed Token Deployment")
    
    # Deploy token
    success = await deploy_token()
    
    if success:
        logger.info("Deployment completed successfully!")
    else:
        logger.error("Deployment failed!")
    
    return success

if __name__ == "__main__":
    success = asyncio.run(main())
    exit(0 if success else 1) 