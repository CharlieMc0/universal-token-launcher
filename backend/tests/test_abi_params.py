#!/usr/bin/env python3

import asyncio
import os
import sys
from web3 import Web3
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
from app.utils.chain_config import get_chain_config

# ZetaChain Testnet ID
CHAIN_ID = "7001"

async def inspect_initialize_function():
    """Inspect the initialize function in the token contract to determine correct parameters"""
    logger.info(f"Inspecting initialize function in the token contract")
    
    # Load the token ABI
    token_abi, _ = _load_artifact(ZC_TOKEN_PATH)
    if not token_abi:
        logger.error(f"Failed to load token ABI from {ZC_TOKEN_PATH}")
        return False
    
    # Find the initialize function in the ABI
    initialize_abi = None
    for item in token_abi:
        if isinstance(item, dict) and item.get('type') == 'function' and item.get('name') == 'initialize':
            initialize_abi = item
            break
    
    if not initialize_abi:
        logger.error("Initialize function not found in ABI")
        return False
    
    # Print detailed information about the initialize function
    inputs = initialize_abi.get('inputs', [])
    stateMutability = initialize_abi.get('stateMutability', 'unknown')
    
    logger.info(f"Initialize function has {len(inputs)} parameters")
    logger.info(f"State mutability: {stateMutability}")
    
    for i, param in enumerate(inputs):
        param_name = param.get('name', '')
        param_type = param.get('type', '')
        logger.info(f"  Parameter {i}: {param_name} ({param_type})")
    
    # Get output information
    outputs = initialize_abi.get('outputs', [])
    if outputs:
        logger.info(f"Initialize function has {len(outputs)} outputs:")
        for i, output in enumerate(outputs):
            output_name = output.get('name', '')
            output_type = output.get('type', '')
            logger.info(f"  Output {i}: {output_name} ({output_type})")
    else:
        logger.info("Initialize function has no outputs")
    
    return True

async def try_direct_initialization(contract_address=None):
    """Try to directly initialize a token contract using its ABI"""
    
    if not contract_address:
        logger.error("No contract address provided")
        return False
    
    logger.info(f"Attempting to initialize contract at {contract_address}")
    
    # Get Web3 instance and account
    web3 = await get_web3(CHAIN_ID)
    account = get_account()
    
    if not web3 or not account:
        logger.error("Failed to get web3 or account")
        return False
    
    # Load the token ABI
    token_abi, _ = _load_artifact(ZC_TOKEN_PATH)
    if not token_abi:
        logger.error(f"Failed to load token ABI from {ZC_TOKEN_PATH}")
        return False
    
    # Create contract instance
    contract = web3.eth.contract(address=contract_address, abi=token_abi)
    
    # Check if contract has code
    code = web3.eth.get_code(contract_address)
    if not code or code == '0x' or code == b'0x':
        logger.error(f"No code found at address {contract_address}!")
        return False
    
    # Get chain configuration
    chain_config = get_chain_config(CHAIN_ID)
    gateway_address = chain_config.get("gateway_address")
    if not gateway_address:
        gateway_address = "0x6c533f7fe93fae114d0954697069df33c9b74fd7"  # Default for testnet
    
    uniswap_router_address = chain_config.get("uniswap_router_address")
    if not uniswap_router_address:
        uniswap_router_address = "0x2ca7d64A7EFE2D62A725E2B35Cf7230D6677FfEe"  # Default for testnet
    
    # Try different parameter orders for initialize
    owner_address = account.address
    token_name = "TestToken"
    token_symbol = "TEST"
    gas_value = 3000000
    
    # Find the initialize function in the ABI
    initialize_abi = None
    for item in token_abi:
        if isinstance(item, dict) and item.get('type') == 'function' and item.get('name') == 'initialize':
            initialize_abi = item
            break
    
    if not initialize_abi:
        logger.error("Initialize function not found in ABI")
        return False
    
    # Get parameter information
    inputs = initialize_abi.get('inputs', [])
    logger.info(f"Detected {len(inputs)} parameters in initialize function")
    
    # Prepare transaction for eth_call (simulation)
    try:
        # Try different parameter orders
        parameter_sets = []
        
        # Set 1: Based on parameter names in ABI
        args1 = []
        for param in inputs:
            param_name = param.get('name', '').lower()
            param_type = param.get('type', '')
            
            if 'owner' in param_name and 'address' in param_type:
                args1.append(owner_address)
            elif 'name' in param_name and 'string' in param_type:
                args1.append(token_name)
            elif 'symbol' in param_name and 'string' in param_type:
                args1.append(token_symbol)
            elif 'gateway' in param_name and 'address' in param_type:
                args1.append(gateway_address)
            elif 'gas' in param_name and ('uint' in param_type or 'int' in param_type):
                args1.append(gas_value)
            elif 'router' in param_name and 'address' in param_type:
                args1.append(uniswap_router_address)
            elif 'address' in param_type:
                args1.append('0x0000000000000000000000000000000000000000')
            elif 'uint' in param_type or 'int' in param_type:
                args1.append(0)
            elif 'string' in param_type:
                args1.append('')
            elif 'bool' in param_type:
                args1.append(False)
            else:
                args1.append(None)
        
        parameter_sets.append(("ABI Name-Based", args1))
        
        # Set 2: Fixed order based on our original implementation
        args2 = [
            owner_address, 
            token_name, 
            token_symbol, 
            gateway_address, 
            gas_value, 
            uniswap_router_address
        ]
        # Truncate if needed
        args2 = args2[:len(inputs)]
        parameter_sets.append(("Fixed Order", args2))
        
        # Set 3: Order based on function signature in Solidity docs
        args3 = [
            token_name,
            token_symbol,
            owner_address,
            gateway_address,
            gas_value
        ]
        if len(inputs) == 6:
            args3.append(uniswap_router_address)
        # Truncate if needed
        args3 = args3[:len(inputs)]
        parameter_sets.append(("Doc Order", args3))
        
        # Try all parameter sets
        for set_name, args in parameter_sets:
            logger.info(f"Trying parameter set: {set_name}")
            for i, arg in enumerate(args):
                logger.info(f"  Argument {i}: {arg}")
            
            # Create transaction data
            call_tx = {
                'from': account.address,
                'to': contract_address,
                'data': contract.encodeABI(fn_name="initialize", args=args),
                'gas': 8000000
            }
            
            # Try to simulate call
            try:
                logger.info(f"Simulating initialize call with {set_name} parameter set...")
                web3.eth.call(call_tx)
                logger.info(f"✅ Simulation SUCCESSFUL with {set_name} parameter set!")
                
                # If simulation succeeds, try to send the actual transaction
                logger.info(f"Sending actual initialize transaction with {set_name} parameter set...")
                tx_hash = web3.eth.send_transaction(call_tx)
                logger.info(f"Transaction sent: {web3.to_hex(tx_hash)}")
                
                # Wait for receipt
                receipt = web3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
                if receipt.status == 1:
                    logger.info(f"✅ Transaction SUCCEEDED! Gas used: {receipt.gasUsed}")
                    logger.info(f"Contract initialization complete!")
                    return True
                else:
                    logger.error(f"❌ Transaction FAILED! Gas used: {receipt.gasUsed}")
            except Exception as e:
                logger.error(f"❌ Simulation FAILED with {set_name} parameter set: {e}")
        
        logger.error("All parameter sets failed")
        return False
        
    except Exception as e:
        logger.error(f"Error during initialization attempt: {e}")
        return False

async def check_contract_state(contract_address):
    """Check if the contract is already initialized by calling view functions"""
    logger.info(f"Checking contract state at {contract_address}")
    
    # Get Web3 instance
    web3 = await get_web3(CHAIN_ID)
    
    if not web3:
        logger.error("Failed to get web3")
        return False
    
    # Load the token ABI
    token_abi, _ = _load_artifact(ZC_TOKEN_PATH)
    if not token_abi:
        logger.error(f"Failed to load token ABI from {ZC_TOKEN_PATH}")
        return False
    
    # Create contract instance
    contract = web3.eth.contract(address=contract_address, abi=token_abi)
    
    # Check if contract has code
    code = web3.eth.get_code(contract_address)
    if not code or code == '0x' or code == b'0x':
        logger.error(f"No code found at address {contract_address}!")
        return False
    
    logger.info("Checking contract state...")
    
    # Check various methods to determine if initialized
    try:
        logger.info("Checking owner()...")
        owner = contract.functions.owner().call()
        logger.info(f"Contract owner: {owner}")
    except Exception as e:
        logger.error(f"Error calling owner(): {e}")
    
    try:
        logger.info("Checking name()...")
        name = contract.functions.name().call()
        logger.info(f"Contract name: {name}")
    except Exception as e:
        logger.error(f"Error calling name(): {e}")
    
    try:
        logger.info("Checking symbol()...")
        symbol = contract.functions.symbol().call()
        logger.info(f"Contract symbol: {symbol}")
    except Exception as e:
        logger.error(f"Error calling symbol(): {e}")
    
    try:
        logger.info("Checking paused()...")
        paused = contract.functions.paused().call()
        logger.info(f"Contract paused state: {paused}")
    except Exception as e:
        logger.error(f"Error calling paused(): {e}")
    
    # Advanced: Try to decode the 0xf92ee8a9 error code
    logger.info("Attempting to decode error signature: 0xf92ee8a9")
    error_signatures = {
        "0xf92ee8a9": "Error: Contract already initialized",
        "0x0826a628": "Error: Caller is not the owner"
    }
    
    if "0xf92ee8a9" in error_signatures:
        logger.info(f"Decoded error: {error_signatures['0xf92ee8a9']}")
    else:
        logger.info("Unknown error code")
    
    return True

async def main():
    """Main function to run the tests"""
    logger.info("Starting Token ABI Inspection and Initialization Test")
    
    # Inspect the initialize function
    await inspect_initialize_function()
    
    # Optionally try direct initialization if contract address is provided
    if len(sys.argv) > 1:
        contract_address = sys.argv[1]
        
        # First check the contract state
        await check_contract_state(contract_address)
        
        # Then try initialization
        await try_direct_initialization(contract_address)
    else:
        logger.info("No contract address provided. Skipping direct initialization test.")
        logger.info("To test initialization, run: python test_abi_params.py <contract_address>")
    
    return True

if __name__ == "__main__":
    asyncio.run(main()) 