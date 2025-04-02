"""Web3 helper utilities for interacting with blockchain networks."""

from typing import Dict, Any, Optional
from web3 import Web3
from eth_account import Account
from eth_account.signers.local import LocalAccount
import json
import os

from app.config import Config, get_chain_config
from app.utils.logger import logger

# Universal Token contract data - will be loaded from ABIs
UNIVERSAL_TOKEN_ABI = None
UNIVERSAL_TOKEN_BYTECODE = None
ZC_UNIVERSAL_TOKEN_ABI = None
ZC_UNIVERSAL_TOKEN_BYTECODE = None

# Path to contract artifacts
ABI_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "artifacts")


def load_contract_data():
    """Load contract ABIs and bytecodes from artifact files."""
    global UNIVERSAL_TOKEN_ABI, UNIVERSAL_TOKEN_BYTECODE, ZC_UNIVERSAL_TOKEN_ABI, ZC_UNIVERSAL_TOKEN_BYTECODE
    
    try:
        # For now, we're using placeholders - in a real implementation, we'd load from artifact files
        # Example path: ABI_DIR + "/EVMUniversalToken.json"
        
        # Universal Token ABI (placeholder)
        UNIVERSAL_TOKEN_ABI = [
            {"inputs": [], "stateMutability": "nonpayable", "type": "constructor"},
            {"inputs": [{"internalType": "address", "name": "to", "type": "address"}, {"internalType": "uint256", "name": "amount", "type": "uint256"}], "name": "mint", "outputs": [], "stateMutability": "nonpayable", "type": "function"},
        ]
        
        # Universal Token bytecode (placeholder)
        UNIVERSAL_TOKEN_BYTECODE = "0x608060405234801561001057600080fd5b506040516100..."
        
        # ZetaChain Universal Token ABI (placeholder)
        ZC_UNIVERSAL_TOKEN_ABI = UNIVERSAL_TOKEN_ABI
        
        # ZetaChain Universal Token bytecode (placeholder) 
        ZC_UNIVERSAL_TOKEN_BYTECODE = UNIVERSAL_TOKEN_BYTECODE
        
        logger.info("Contract data loaded successfully")
        return True
    except Exception as e:
        logger.error(f"Error loading contract data: {str(e)}")
        return False


# Initialize Web3 connection for a specific chain
def get_web3(chain_id: int) -> Optional[Web3]:
    """Get Web3 instance for the specified chain."""
    chain_config = get_chain_config(chain_id)
    if not chain_config:
        logger.error(f"Chain ID {chain_id} not supported")
        return None
    
    try:
        web3 = Web3(Web3.HTTPProvider(chain_config["rpc_url"]))
        if not web3.is_connected():
            logger.error(f"Failed to connect to RPC for chain {chain_id}")
            return None
        
        logger.info(f"Connected to {chain_config['name']} (Chain ID: {chain_id})")
        return web3
    except Exception as e:
        logger.error(f"Error initializing Web3 for chain {chain_id}: {str(e)}")
        return None


def get_account() -> Optional[LocalAccount]:
    """Get the deployer account from private key."""
    try:
        private_key = Config.DEPLOYER_PRIVATE_KEY
        if not private_key or private_key.startswith("0x"):
            private_key = "0x" + private_key.lstrip("0x")
        
        account = Account.from_key(private_key)
        return account
    except Exception as e:
        logger.error(f"Failed to create account from private key: {str(e)}")
        return None


def deploy_contract(
    web3: Web3,
    account: LocalAccount,
    contract_abi: list,
    contract_bytecode: str,
    constructor_args: list = []
) -> Dict[str, Any]:
    """
    Deploy a contract to the specified chain.
    
    Args:
        web3: Web3 instance for the target chain
        account: Account to deploy from
        contract_abi: Contract ABI
        contract_bytecode: Contract bytecode
        constructor_args: Constructor arguments
        
    Returns:
        Dict with deployment results
    """
    try:
        # Create contract factory
        contract = web3.eth.contract(abi=contract_abi, bytecode=contract_bytecode)
        
        # Prepare constructor transaction
        construct_txn = contract.constructor(*constructor_args).build_transaction({
            'from': account.address,
            'nonce': web3.eth.get_transaction_count(account.address),
            'gas': 3000000,  # Adjust gas limit as needed
            'gasPrice': web3.eth.gas_price,
            'chainId': web3.eth.chain_id,
        })
        
        # Sign and send transaction
        signed_txn = account.sign_transaction(construct_txn)
        tx_hash = web3.eth.send_raw_transaction(signed_txn.rawTransaction)
        
        # Wait for transaction receipt
        tx_receipt = web3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
        
        if tx_receipt.status != 1:
            return {
                "success": False,
                "error": True,
                "message": "Transaction failed",
                "transaction_hash": tx_hash.hex()
            }
        
        return {
            "success": True,
            "error": False,
            "contract_address": tx_receipt.contractAddress,
            "transaction_hash": tx_hash.hex(),
            "gas_used": tx_receipt.gasUsed
        }
    except Exception as e:
        logger.error(f"Contract deployment failed: {str(e)}")
        return {
            "success": False,
            "error": True,
            "message": str(e)
        }


def verify_contract_submission(
    chain_id: int,
    contract_address: str,
    contract_name: str,
    is_zetachain: bool = False
) -> Dict[str, Any]:
    """
    Submit contract for verification on block explorer.
    
    Args:
        chain_id: Chain ID
        contract_address: Deployed contract address
        contract_name: Name of the contract (for API reference)
        is_zetachain: Whether the contract is on ZetaChain
        
    Returns:
        Dict with verification results
    """
    chain_config = get_chain_config(chain_id)
    if not chain_config:
        return {
            "success": False,
            "message": f"Chain ID {chain_id} not supported",
            "status": "failed"
        }
    
    # In a real implementation, this would call the block explorer's API
    # For now, return a mock result
    return {
        "success": True,
        "message": "Contract verification submitted",
        "status": "pending",
        "explorer_url": f"{chain_config['explorer_url']}/address/{contract_address}",
        "verification_id": "123456789"
    }


# Load contract data when module is imported
load_contract_data() 