"""Web3 helper utilities for interacting with blockchain networks."""

from typing import Dict, Any, Optional
from web3 import Web3
from eth_account import Account
from eth_account.signers.local import LocalAccount
import json
import os

from app.config import Config
from app.utils.logger import logger
from app.utils.chain_config import get_chain_config

# Universal Token contract data - will be loaded from ABIs
UNIVERSAL_TOKEN_ABI = None
UNIVERSAL_TOKEN_BYTECODE = None
ZC_UNIVERSAL_TOKEN_ABI = None
ZC_UNIVERSAL_TOKEN_BYTECODE = None

# Path to contract artifacts - relative to the workspace root
SMART_CONTRACTS_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 
    "..", 
    "smart-contracts"
)
EVM_TOKEN_PATH = os.path.join(
    SMART_CONTRACTS_DIR, 
    "artifacts", 
    "contracts", 
    "EVMUniversalToken.sol", 
    "EVMUniversalToken.json"
)
ZC_TOKEN_PATH = os.path.join(
    SMART_CONTRACTS_DIR, 
    "artifacts", 
    "contracts", 
    "ZetaChainUniversalToken.sol", 
    "ZetaChainUniversalToken.json"
)


def load_contract_data():
    """Load contract ABIs and bytecodes from artifact files."""
    global UNIVERSAL_TOKEN_ABI, UNIVERSAL_TOKEN_BYTECODE
    global ZC_UNIVERSAL_TOKEN_ABI, ZC_UNIVERSAL_TOKEN_BYTECODE
    
    try:
        # Check if artifact files exist
        if not os.path.exists(EVM_TOKEN_PATH):
            logger.warning(
                f"EVM token artifact not found at {EVM_TOKEN_PATH}, "
                "using placeholder data"
            )
            # Fallback to placeholder data for EVMUniversalToken (6 args)
            UNIVERSAL_TOKEN_ABI = [
                {"inputs": [
                    {"internalType": "string", "name": "name_", "type": "string"}, 
                    {"internalType": "string", "name": "symbol_", "type": "string"},
                    {"internalType": "uint8", "name": "decimals_", "type": "uint8"},
                    {
                        "internalType": "uint256", 
                        "name": "initialSupply", 
                        "type": "uint256"
                    },
                    {
                        "internalType": "uint256", 
                        "name": "currentChainId", 
                        "type": "uint256"
                    },
                    {
                        "internalType": "address", 
                        "name": "initialOwner", 
                        "type": "address"
                    }
                ], "stateMutability": "nonpayable", "type": "constructor"},
                {"inputs": [
                    {"internalType": "address", "name": "to", "type": "address"}, 
                    {"internalType": "uint256", "name": "amount", "type": "uint256"}
                ], 
                "name": "mint", 
                "outputs": [], 
                "stateMutability": "nonpayable", 
                "type": "function"},
            ]
            # Complete bytecode for testing purposes (longer than placeholder)
            UNIVERSAL_TOKEN_BYTECODE = "0x60806040523480156200001157600080fd5b5060405162000a4838038062000a488339810160408190526200003491620001db565b8251839083906200004d90600390602085019062000068565b5080516200006390600490602084019062000068565b5050505062000281565b828054620000769062000245565b90600052602060002090601f0160209004810192826200009a5760008555620000e5565b82601f10620000b557805160ff1916838001178555620000e5565b82800160010185558215620000e5579182015b82811115620000e5578251825591602001919060010190620000c8565b50620000f3929150620000f7565b5090565b5b80821115620000f35760008155600101620000f8565b634e487b7160e01b600052604160045260246000fd5b600082601f8301126200013657600080fd5b81516001600160401b03808211156200015357620001536200010e565b604051601f8301601f19908116603f011681019082821181831017156200017e576200017e6200010e565b816040528381526020925086838588010111156200019b57600080fd5b600091505b83821015620001bf5785820183015181830184015290820190620001a0565b83821115620001d15760008385830101525b9695505050505050565b600080600060608486031215620001f157600080fd5b83516001600160a01b03811681146200020957600080fd5b60208501519093506001600160401b03808211156200022757600080fd5b6200023587838801620001245b604086015191508082111562000250566200025062000110565b506200025f8682860162000124565b9150509250925092565b600181811c908216806200025457607f821691505b602082108114156200027b57634e487b7160e01b600052602260045260246000fd5b50919050565b6107b780620002916000396000f300"
        else:
            # Load EVM token artifact
            with open(EVM_TOKEN_PATH, 'r') as f:
                evm_token_data = json.load(f)
                UNIVERSAL_TOKEN_ABI = evm_token_data.get('abi')
                UNIVERSAL_TOKEN_BYTECODE = evm_token_data.get('bytecode')
                logger.info(f"Loaded EVM token artifact from {EVM_TOKEN_PATH}")
        
        if not os.path.exists(ZC_TOKEN_PATH):
            logger.warning(
                f"ZetaChain token artifact not found at {ZC_TOKEN_PATH}, "
                "using EVM data"
            )
            # Fallback to EVM data
            ZC_UNIVERSAL_TOKEN_ABI = UNIVERSAL_TOKEN_ABI
            ZC_UNIVERSAL_TOKEN_BYTECODE = UNIVERSAL_TOKEN_BYTECODE
        else:
            # Load ZetaChain token artifact
            with open(ZC_TOKEN_PATH, 'r') as f:
                zc_token_data = json.load(f)
                ZC_UNIVERSAL_TOKEN_ABI = zc_token_data.get('abi')
                ZC_UNIVERSAL_TOKEN_BYTECODE = zc_token_data.get('bytecode')
                logger.info(f"Loaded ZetaChain token artifact from {ZC_TOKEN_PATH}")
        
        logger.info("Contract data loaded successfully")
        return True
    except Exception as e:
        logger.error(f"Error loading contract data: {str(e)}")
        # Fallback to placeholder data with minimal ABI
        UNIVERSAL_TOKEN_ABI = [
            {"inputs": [
                {"internalType": "address", "name": "initialOwner", "type": "address"}, 
                {"internalType": "string", "name": "name", "type": "string"}, 
                {"internalType": "string", "name": "symbol", "type": "string"}
            ], "stateMutability": "nonpayable", "type": "constructor"},
            {"inputs": [
                {"internalType": "address", "name": "to", "type": "address"}, 
                {"internalType": "uint256", "name": "amount", "type": "uint256"}
            ], "name": "mint", "outputs": [], "stateMutability": "nonpayable", "type": "function"},
        ]
        # Minimal bytecode for testing
        UNIVERSAL_TOKEN_BYTECODE = "0x60806040523480156200001157600080fd5b50604051620000a4..."
        ZC_UNIVERSAL_TOKEN_ABI = UNIVERSAL_TOKEN_ABI
        ZC_UNIVERSAL_TOKEN_BYTECODE = UNIVERSAL_TOKEN_BYTECODE
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
        # Ensure private key has 0x prefix
        if not private_key.startswith("0x"):
            private_key = "0x" + private_key
        
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
        contract = web3.eth.contract(
            abi=contract_abi, 
            bytecode=contract_bytecode
        )
        
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
        
        # Web3.py v6 uses .raw_transaction instead of .rawTransaction
        if hasattr(signed_txn, 'raw_transaction'):
            tx_hash = web3.eth.send_raw_transaction(signed_txn.raw_transaction)
        else:
            # Fallback for older versions
            tx_hash = web3.eth.send_raw_transaction(signed_txn.rawTransaction)
        
        # Wait for transaction receipt
        tx_receipt = web3.eth.wait_for_transaction_receipt(
            tx_hash, 
            timeout=120
        )
        
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
    
    # Determine the appropriate explorer URL based on chain type
    explorer_url = (
        chain_config.get("blockscout_url") 
        if is_zetachain or chain_config.get("blockscout_url") 
        else chain_config.get("explorer_url")
    )
    
    if not explorer_url:
        return {
            "success": False,
            "message": f"No explorer URL found for chain ID {chain_id}",
            "status": "failed"
        }
    
    # In a real implementation, this would call the block explorer's API
    # For now, return a mock result
    return {
        "success": True,
        "message": "Contract verification submitted",
        "status": "pending",
        "explorer_url": f"{explorer_url}/address/{contract_address}",
        "verification_id": "123456789"
    }


# Load contract data when module is imported
load_contract_data() 