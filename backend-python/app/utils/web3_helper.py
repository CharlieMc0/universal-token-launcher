"""Web3 helper utilities for interacting with blockchain networks."""

from typing import Dict, Any, Optional
from web3 import Web3
from eth_account import Account
from eth_account.signers.local import LocalAccount
import json
import os
import subprocess
import requests
import re

from app.config import Config
from app.utils.logger import logger
from app.utils.chain_config import get_chain_config

# Universal Token contract data - will be loaded from ABIs
UNIVERSAL_TOKEN_ABI = None
UNIVERSAL_TOKEN_BYTECODE = None
ZC_UNIVERSAL_TOKEN_ABI = None
ZC_UNIVERSAL_TOKEN_BYTECODE = None

# Universal NFT contract data - will be loaded from ABIs
UNIVERSAL_NFT_ABI = None
UNIVERSAL_NFT_BYTECODE = None
ZC_UNIVERSAL_NFT_ABI = None
ZC_UNIVERSAL_NFT_BYTECODE = None

# Path to contract artifacts - relative to the workspace root
SMART_CONTRACTS_DIR = os.path.abspath(os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 
    "..", 
    "smart-contracts"
))

# Token contract paths
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

# NFT contract paths
EVM_NFT_PATH = os.path.join(
    SMART_CONTRACTS_DIR, 
    "artifacts", 
    "contracts", 
    "EVMUniversalNFT.sol", 
    "EVMUniversalNFT.json"
)
ZC_NFT_PATH = os.path.join(
    SMART_CONTRACTS_DIR, 
    "artifacts", 
    "contracts", 
    "ZetaChainUniversalNFT.sol", 
    "ZetaChainUniversalNFT.json"
)


def load_contract_data():
    """Load contract ABIs and bytecodes from artifact files."""
    global UNIVERSAL_TOKEN_ABI, UNIVERSAL_TOKEN_BYTECODE
    global ZC_UNIVERSAL_TOKEN_ABI, ZC_UNIVERSAL_TOKEN_BYTECODE
    global UNIVERSAL_NFT_ABI, UNIVERSAL_NFT_BYTECODE
    global ZC_UNIVERSAL_NFT_ABI, ZC_UNIVERSAL_NFT_BYTECODE
    
    try:
        # Load Token contracts
        
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
        
        # Load NFT contracts
        
        # Check if artifact files exist
        if not os.path.exists(EVM_NFT_PATH):
            logger.warning(
                f"EVM NFT artifact not found at {EVM_NFT_PATH}, "
                "using placeholder data"
            )
            # Fallback to placeholder data for EVMUniversalNFT (6 args)
            UNIVERSAL_NFT_ABI = [
                {"inputs": [
                    {"internalType": "string", "name": "name_", "type": "string"}, 
                    {"internalType": "string", "name": "symbol_", "type": "string"},
                    {"internalType": "string", "name": "baseURI_", "type": "string"},
                    {
                        "internalType": "uint256", 
                        "name": "maxSupply_", 
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
                    {"internalType": "address", "name": "to", "type": "address"}
                ], 
                "name": "mint", 
                "outputs": [
                    {"internalType": "uint256", "name": "", "type": "uint256"}
                ], 
                "stateMutability": "nonpayable", 
                "type": "function"},
            ]
            # Complete bytecode for testing purposes (longer than placeholder)
            UNIVERSAL_NFT_BYTECODE = "0x60806040523480156200001157600080fd5b5060405162000a4838038062000a488339810160408190526200003491620001db565b8251839083906200004d90600390602085019062000068565b5080516200006390600490602084019062000068565b5050505062000281565b828054620000769062000245565b90600052602060002090601f0160209004810192826200009a5760008555620000e5565b82601f10620000b557805160ff1916838001178555620000e5565b82800160010185558215620000e5579182015b82811115620000e5578251825591602001919060010190620000c8565b50620000f3929150620000f7565b5090565b5b80821115620000f35760008155600101620000f8565b634e487b7160e01b600052604160045260246000fd5b600082601f8301126200013657600080fd5b81516001600160401b03808211156200015357620001536200010e565b604051601f8301601f19908116603f011681019082821181831017156200017e576200017e6200010e565b816040528381526020925086838588010111156200019b57600080fd5b600091505b83821015620001bf5785820183015181830184015290820190620001a0565b83821115620001d15760008385830101525b9695505050505050565b600080600060608486031215620001f157600080fd5b83516001600160a01b03811681146200020957600080fd5b60208501519093506001600160401b03808211156200022757600080fd5b6200023587838801620001245b604086015191508082111562000250566200025062000110565b506200025f8682860162000124565b9150509250925092565b600181811c908216806200025457607f821691505b602082108114156200027b57634e487b7160e01b600052602260045260246000fd5b50919050565b6107b780620002916000396000f300"
        else:
            # Load EVM NFT artifact
            with open(EVM_NFT_PATH, 'r') as f:
                evm_nft_data = json.load(f)
                UNIVERSAL_NFT_ABI = evm_nft_data.get('abi')
                UNIVERSAL_NFT_BYTECODE = evm_nft_data.get('bytecode')
                logger.info(f"Loaded EVM NFT artifact from {EVM_NFT_PATH}")
        
        if not os.path.exists(ZC_NFT_PATH):
            logger.warning(
                f"ZetaChain NFT artifact not found at {ZC_NFT_PATH}, "
                "using EVM NFT data"
            )
            # Fallback to EVM data
            ZC_UNIVERSAL_NFT_ABI = UNIVERSAL_NFT_ABI
            ZC_UNIVERSAL_NFT_BYTECODE = UNIVERSAL_NFT_BYTECODE
        else:
            # Load ZetaChain NFT artifact
            with open(ZC_NFT_PATH, 'r') as f:
                zc_nft_data = json.load(f)
                ZC_UNIVERSAL_NFT_ABI = zc_nft_data.get('abi')
                ZC_UNIVERSAL_NFT_BYTECODE = zc_nft_data.get('bytecode')
                logger.info(f"Loaded ZetaChain NFT artifact from {ZC_NFT_PATH}")
        
        logger.info("Contract data loaded successfully")
        return True
    except Exception as e:
        logger.error(f"Error loading contract data: {str(e)}")
        # Fallback to placeholder data with minimal ABI for tokens
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
        
        # Fallback to placeholder data with minimal ABI for NFTs
        UNIVERSAL_NFT_ABI = [
            {"inputs": [
                {"internalType": "string", "name": "name_", "type": "string"}, 
                {"internalType": "string", "name": "symbol_", "type": "string"}, 
                {"internalType": "string", "name": "baseURI_", "type": "string"}
            ], "stateMutability": "nonpayable", "type": "constructor"},
            {"inputs": [
                {"internalType": "address", "name": "to", "type": "address"}
            ], "name": "mint", "outputs": [
                {"internalType": "uint256", "name": "", "type": "uint256"}
            ], "stateMutability": "nonpayable", "type": "function"},
        ]
        # Minimal bytecode for testing
        UNIVERSAL_NFT_BYTECODE = "0x60806040523480156200001157600080fd5b50604051620000a4..."
        ZC_UNIVERSAL_NFT_ABI = UNIVERSAL_NFT_ABI
        ZC_UNIVERSAL_NFT_BYTECODE = UNIVERSAL_NFT_BYTECODE
        
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
            'gas': 5000000,  # Gas limit
            'gasPrice': web3.eth.gas_price,
        })
        
        # Sign transaction
        signed_txn = account.sign_transaction(construct_txn)
        
        # Send transaction
        # Web3.py v6 uses .raw_transaction instead of .rawTransaction
        if hasattr(signed_txn, 'raw_transaction'):
            tx_hash = web3.eth.send_raw_transaction(signed_txn.raw_transaction)
        else:
            # Fallback for older versions
            tx_hash = web3.eth.send_raw_transaction(signed_txn.rawTransaction)
        
        # Wait for transaction receipt
        logger.info(f"Waiting for transaction receipt...")
        tx_receipt = web3.eth.wait_for_transaction_receipt(tx_hash)
        
        # Get contract address
        contract_address = tx_receipt.contractAddress
        
        logger.info(f"Contract deployed at: {contract_address}")
        
        # Return deployment information
        return {
            "success": True,
            "contract_address": contract_address,
            "transaction_hash": tx_hash.hex(),
            "gas_used": tx_receipt.gasUsed,
            "block_number": tx_receipt.blockNumber
        }
    except Exception as e:
        logger.error(f"Contract deployment failed: {str(e)}")
        return {
            "success": False,
            "error": True,
            "message": str(e)
        }


def extract_compiler_version(source_code: str) -> str:
    """
    Extract the compiler version from Solidity source code.
    
    Args:
        source_code: The source code to parse
        
    Returns:
        Compiler version in the format expected by verification APIs
    """
    # Find the pragma statement
    pragma_match = re.search(r'pragma solidity\s+([^;]+);', source_code)
    if not pragma_match:
        # Default to a common version if not found
        return "v0.8.19+commit.7dd6d404"
    
    # Extract the version constraint
    version_constraint = pragma_match.group(1).strip()
    
    # Handle different version formats
    # ^0.8.0 -> use 0.8.19
    # >=0.8.0 <0.9.0 -> use 0.8.19
    # 0.8.19 -> use 0.8.19
    if '^0.8.' in version_constraint or '0.8.' in version_constraint:
        # For 0.8.x versions, use 0.8.19
        compiler_version = "v0.8.19+commit.7dd6d404"
    elif '^0.7.' in version_constraint or '0.7.' in version_constraint:
        # For 0.7.x versions, use 0.7.6
        compiler_version = "v0.7.6+commit.7338295f"
    elif '^0.6.' in version_constraint or '0.6.' in version_constraint:
        # For 0.6.x versions, use 0.6.12
        compiler_version = "v0.6.12+commit.27d51765"
    else:
        # Default to 0.8.19 for newer projects
        compiler_version = "v0.8.19+commit.7dd6d404"
    
    logger.info(f"Extracted compiler version: {compiler_version} from pragma: {version_constraint}")
    return compiler_version


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
    is_blockscout = is_zetachain or chain_config.get("blockscout_url")
    explorer_url = (
        chain_config.get("blockscout_url") 
        if is_blockscout 
        else chain_config.get("explorer_url")
    )
    
    if not explorer_url:
        return {
            "success": False,
            "message": f"No explorer URL found for chain ID {chain_id}",
            "status": "failed"
        }
    
    # Make sure explorer_url doesn't end with a slash
    explorer_url = explorer_url.rstrip('/')
    
    try:
        # Get appropriate API key
        api_key = None
        
        # For ZetaChain/Blockscout, we don't need an API key
        if not is_blockscout:
            # For other chains, get the appropriate API key based on chain ID
            if chain_id == 1 or chain_id == 5 or chain_id == 11155111:  # Ethereum
                api_key = Config.ETHERSCAN_API_KEY
            elif chain_id == 137:  # Polygon
                api_key = Config.POLYGONSCAN_API_KEY
            elif chain_id == 56 or chain_id == 97:  # BSC
                api_key = Config.BSCSCAN_API_KEY
            elif chain_id == 8453 or chain_id == 84532:  # Base
                api_key = Config.BASESCAN_API_KEY
            elif chain_id == 42161 or chain_id == 421614:  # Arbitrum
                api_key = Config.ARBISCAN_API_KEY
            elif chain_id == 10 or chain_id == 11155420:  # Optimism
                api_key = Config.OPTIMISM_API_KEY
            else:
                # For other chains, try to use Etherscan API key
                api_key = Config.ETHERSCAN_API_KEY
        
        # Log information about verification attempt
        logger.info(
            f"Verifying contract {contract_address} "
            f"on {chain_config.get('name')} using "
            f"{'Blockscout' if is_blockscout else 'Etherscan'} API"
        )
        
        # For Blockscout (ZetaChain), use direct API call
        if is_blockscout:
            # Read contract source
            contract_path = os.path.join(
                SMART_CONTRACTS_DIR,
                "contracts",
                f"{contract_name}.sol"
            )
            
            if not os.path.exists(contract_path):
                return {
                    "success": False,
                    "message": f"Contract source not found at {contract_path}",
                    "status": "failed"
                }
            
            try:
                with open(contract_path, 'r') as f:
                    contract_source = f.read()
            except Exception as e:
                logger.error(f"Error reading contract source: {str(e)}")
                return {
                    "success": False,
                    "message": f"Error reading contract source: {str(e)}",
                    "status": "failed"
                }
                
            # Extract compiler version from source code
            compiler_version = extract_compiler_version(contract_source)
            
            # Construct API URL for Blockscout verification
            verification_url = f"{explorer_url}/api"
            
            # Prepare verification data according to BlockScout API docs
            verification_data = {
                "module": "contract",
                "action": "verifysourcecode",
                "contractaddress": contract_address,
                "contractname": contract_name,
                "compilerversion": compiler_version,
                "optimizationUsed": "1",  # 1 for true, 0 for false
                "runs": "200",
                "sourceCode": contract_source,
                "evmversion": "paris",
                "constructorArguments": "",  # Leave empty for autodetection
                "codeformat": "solidity-single-file"
            }
            
            # Save verification data to a file for debugging
            debug_filename = f"{contract_name}_verification_data.json"
            try:
                # Check if source code is included
                source_code_length = len(verification_data.get("sourceCode", ""))
                logger.info(f"Saving verification data with source code (length: {source_code_length} chars)")
                
                with open(debug_filename, "w") as f:
                    json.dump(verification_data, f, indent=2)
                logger.info(f"Saved verification data to {debug_filename}")
            except Exception as e:
                logger.error(f"Failed to save verification data: {str(e)}")
            
            # Make API request
            headers = {
                "Content-Type": "application/x-www-form-urlencoded"
            }
            
            logger.info(f"Submitting verification request to {verification_url}")
            
            response = requests.post(
                verification_url, 
                data=verification_data,
                headers=headers
            )
            
            logger.info(f"Blockscout verification API response: {response.status_code}")
            
            # Save response for debugging
            response_filename = f"{contract_name}_verification_response.json"
            try:
                response_data = response.json() if response.text else {}
                with open(response_filename, "w") as f:
                    json.dump(response_data, f, indent=2)
                logger.info(f"Saved verification response to {response_filename}")
            except Exception as e:
                logger.error(f"Failed to save verification response: {str(e)}")
            
            if response.status_code in (200, 201, 202):
                try:
                    response_data = response.json()
                    logger.info(f"Verification response: {response_data}")
                    
                    if "result" in response_data and "status" in response_data:
                        if response_data["status"] == "1":
                            return {
                                "success": True,
                                "message": "Contract verification submitted successfully",
                                "status": "pending",
                                "explorer_url": f"{explorer_url}/address/{contract_address}",
                                "response_data": response_data
                            }
                        else:
                            # Error with validation
                            error_message = response_data.get("result", "Unknown error")
                            logger.error(f"Blockscout validation error: {error_message}")
                            return {
                                "success": False,
                                "message": f"Contract verification failed: {error_message}",
                                "status": "failed"
                            }
                    else:
                        return {
                            "success": True,
                            "message": "Contract verification submitted successfully",
                            "status": "pending",
                            "explorer_url": f"{explorer_url}/address/{contract_address}",
                            "response_data": response_data
                        }
                except Exception as json_err:
                    logger.error(f"Error parsing JSON response: {str(json_err)}")
                    # If we can't parse the response but got a success code, assume it worked
                    return {
                        "success": True,
                        "message": "Contract verification submitted, but couldn't parse response",
                        "status": "pending",
                        "explorer_url": f"{explorer_url}/address/{contract_address}"
                    }
            else:
                error_info = f"Status: {response.status_code}, Response: {response.text}"
                logger.error(f"Blockscout API error: {error_info}")
                return {
                    "success": False,
                    "message": f"Contract verification failed: {error_info}",
                    "status": "failed"
                }
            
        # For Etherscan-like explorers, use their API
        else:
            if not api_key:
                return {
                    "success": False,
                    "message": f"No API key available for chain {chain_id}",
                    "status": "failed"
                }
                
            # Construct proper Etherscan verification API call
            verification_url = f"{explorer_url}/api"
            
            try:
                # Read contract source
                contract_path = os.path.join(
                    SMART_CONTRACTS_DIR,
                    "contracts",
                    f"{contract_name}.sol"
                )
                
                if not os.path.exists(contract_path):
                    return {
                        "success": False,
                        "message": "Contract source not found",
                        "status": "failed"
                    }
                
                with open(contract_path, 'r') as f:
                    contract_source = f.read()
                
                # Extract compiler version from source code
                compiler_version = extract_compiler_version(contract_source)
                
                # Prepare verification data
                verification_data = {
                    "apikey": api_key,
                    "module": "contract",
                    "action": "verifysourcecode",
                    "contractaddress": contract_address,
                    "sourceCode": contract_source,
                    "contractname": contract_name,
                    "compilerversion": compiler_version,
                    "optimizationUsed": 1,
                    "runs": 200,
                    "evmversion": "paris",
                    "constructorArguments": "",  # Empty for auto-detection
                    "codeformat": "solidity-single-file"  # Required format for Etherscan
                }
                
                headers = {
                    "Content-Type": "application/x-www-form-urlencoded"
                }
                
                logger.info(f"Sending verification request to Etherscan API: {verification_url}")
                
                response = requests.post(
                    verification_url, 
                    data=verification_data,
                    headers=headers
                )
                
                if response.status_code == 200:
                    response_data = response.json()
                    if response_data.get("status") == "1":
                        return {
                            "success": True,
                            "message": "Contract verification submitted via Etherscan API",
                            "status": "pending",
                            "explorer_url": f"{explorer_url}/address/{contract_address}",
                            "guid": response_data.get("result")
                        }
                    else:
                        error_message = response_data.get("result", "Unknown error")
                        return {
                            "success": False,
                            "message": f"Verification failed: {error_message}",
                            "status": "failed"
                        }
                else:
                    return {
                        "success": False,
                        "message": f"Verification failed: HTTP {response.status_code}",
                        "status": "failed"
                    }
            except Exception as e:
                logger.error(f"Error during Etherscan verification: {str(e)}")
                return {
                    "success": False,
                    "message": f"Verification error: {str(e)}",
                    "status": "failed"
                }
            
    except Exception as e:
        logger.error(f"Error submitting contract verification: {str(e)}")
        return {
            "success": False,
            "message": f"Verification submission failed: {str(e)}",
            "status": "failed"
        }


# Ensure contract data is loaded when module is imported
load_contract_data() 