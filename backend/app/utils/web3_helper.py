"""Web3 helper utilities for interacting with blockchain networks."""

from typing import Dict, Any, Optional, List
from web3 import Web3
from eth_account import Account
from eth_account.signers.local import LocalAccount
import json
import os
import requests
import re
import time
from web3.exceptions import TransactionNotFound

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

# TODO: Replace with a dynamic lookup or configuration
# Addresses of ZRC-20 gas tokens on ZetaChain Testnet (7001)
ZRC20_GAS_TOKEN_ADDRESSES = {
    11155111: "0x48f80608B672DC30DC7e3dbBd0343c5F02C738Eb",  # Sepolia ETH (gETH)
    80001: "0x99e4Ab14cBC175B89BC7d151C50B9769477b9111",  # Mumbai MATIC
    97: "0x66c9bd2f316539f881311c7f8b7c761498631f5c",     # BSC Testnet BNB
    421614: "0x08d9D2C4759E9a18F4A5915c9f848Ab1E2188f73", # Arbitrum Sepolia ETH
    11155420: "0x2F4Baf06533A60Ae8e3132F011aF126656102918", # Optimism Sepolia ETH
    84532: "0xFA7ab9A9976aFa523B61F602E33988f17ECD3583",    # Base Sepolia ETH
    43113: "0x9fd402f8981564FB789785C5442100A67771ea84",    # Fuji AVAX
    # Add other relevant chain IDs and their ZRC-20 addresses here
}

async def get_zrc20_address(chain_id: int) -> str | None:
    """Get ZRC-20 gas token address for a given EVM chain ID on ZetaChain Testnet."""
    address = ZRC20_GAS_TOKEN_ADDRESSES.get(chain_id)
    if not address:
        logger.warning(f"ZRC-20 gas token address not found for chain ID: {chain_id}")
    return address


async def call_contract_method(
    web3: Web3,
    account,
    contract_address: str,
    contract_abi: List[Dict],
    method_name: str,
    args: tuple = (),
    value: int = 0,           # Optional value for payable functions
    gas_limit: int = 1_000_000, # Default gas limit, adjust as needed
    max_retries: int = 3,
    retry_delay: int = 5,     # seconds
) -> Dict[str, Any]:
    """Builds, signs, and sends a transaction to call a contract method."""
    try:
        contract_address = web3.to_checksum_address(contract_address)
        contract = web3.eth.contract(address=contract_address, abi=contract_abi)
        
        # Get nonce
        nonce = web3.eth.get_transaction_count(account.address)
        
        # Prepare the transaction dictionary
        tx_params = {
            'from': account.address,
            'nonce': nonce,
            'value': value,
            'gasPrice': web3.eth.gas_price,  # Use current gas price
            # 'gas': gas_limit  # Gas estimation can be tricky, use build_transaction
        }

        logger.info(
            f"Calling method '{method_name}' on {contract_address} with args {args}"
        )
        
        # Build transaction using the contract function
        # Use build_transaction() which includes gas estimation
        try:
            transaction = contract.functions[method_name](*args).build_transaction(tx_params)
        except Exception as build_err:
            logger.error(f"Failed to build transaction for {method_name}: {build_err}")
            # Try again with a fixed gas limit if estimation failed
            logger.warning(f"Retrying build with fixed gas limit: {gas_limit}")
            tx_params['gas'] = gas_limit
            try:
                transaction = contract.functions[method_name](*args).build_transaction(tx_params)
            except Exception as build_err_fixed:
                logger.error(f"Failed to build transaction with fixed gas: {build_err_fixed}")
                return {"success": False, "error": True, "message": f"Failed to build transaction: {build_err_fixed}"}

        # Sign transaction
        signed_tx = web3.eth.account.sign_transaction(transaction, private_key=account.key)

        # Send transaction using the CORRECT attribute name
        tx_hash = web3.eth.send_raw_transaction(signed_tx.raw_transaction)
        logger.info(f"Transaction sent for {method_name}. Hash: {web3.to_hex(tx_hash)}")
        
        # Wait for transaction receipt with retries
        receipt = None
        for attempt in range(max_retries):
            try:
                receipt = web3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)  # Increased timeout
                logger.info(f"Transaction {web3.to_hex(tx_hash)} confirmed in block {receipt.blockNumber}")
                break  # Success, exit retry loop
            except TransactionNotFound:
                logger.warning(
                    f"Tx {web3.to_hex(tx_hash)} not found, attempt {attempt + 1}/" 
                    f"{max_retries}. Retrying in {retry_delay}s..."
                )
                time.sleep(retry_delay)
            except Exception as wait_err:  # Catch other potential wait errors
                logger.error(f"Error waiting for receipt for {web3.to_hex(tx_hash)}: {wait_err}")
                # Decide if this error is retryable or fatal
                if attempt == max_retries - 1:
                    return {"success": False, "error": True, "transaction_hash": web3.to_hex(tx_hash), "message": f"Error waiting for receipt: {wait_err}"}
                time.sleep(retry_delay)

        if receipt:
            # Check transaction status
            if receipt.status == 1:
                logger.info(f"Method '{method_name}' call successful. Tx: {web3.to_hex(tx_hash)}")
                # Convert receipt to dict for JSON serialization
                # Handle potential bytes that are not JSON serializable
                receipt_dict = {}
                try:
                    receipt_dict = {
                        k: (web3.to_hex(v) if isinstance(v, bytes) else v) 
                        for k, v in receipt.items()
                    }
                except Exception as serial_err:
                    logger.warning(f"Could not fully serialize receipt: {serial_err}")
                    receipt_dict = {"blockNumber": receipt.blockNumber, "gasUsed": receipt.gasUsed, "status": receipt.status} # Fallback
                
                return {"success": True, "error": False, "transaction_hash": web3.to_hex(tx_hash), "receipt": receipt_dict}
            else:
                logger.error(f"Method '{method_name}' call failed (reverted). Tx: {web3.to_hex(tx_hash)}")
                receipt_dict = dict(receipt) # Attempt conversion, may fail if bytes exist
                return {"success": False, "error": True, "transaction_hash": web3.to_hex(tx_hash), "message": "Transaction reverted", "receipt": receipt_dict}
        else:
            logger.error(f"Transaction {web3.to_hex(tx_hash)} timed out after {max_retries} attempts.")
            return {"success": False, "error": True, "transaction_hash": web3.to_hex(tx_hash), "message": "Transaction timed out or not found after retries"}

    except Exception as e:
        logger.error(f"Error calling contract method '{method_name}' on {contract_address}: {str(e)}", exc_info=True)
        return {"success": False, "error": True, "message": f"Error calling contract method: {str(e)}"}


def load_contract_data():
    """Load contract ABIs and bytecode."""
    global UNIVERSAL_TOKEN_ABI, UNIVERSAL_TOKEN_BYTECODE
    global ZC_UNIVERSAL_TOKEN_ABI, ZC_UNIVERSAL_TOKEN_BYTECODE
    global UNIVERSAL_NFT_ABI, UNIVERSAL_NFT_BYTECODE
    global ZC_UNIVERSAL_NFT_ABI, ZC_UNIVERSAL_NFT_BYTECODE

    try:
        # Load ZetaChain token artifact first
        zc_token_path = os.path.join(SMART_CONTRACTS_DIR, "ZetaChainUniversalToken_bytecode.json")
        zc_abi_path = os.path.join(SMART_CONTRACTS_DIR, "ZetaChainUniversalToken_abi.json")
        
        if os.path.exists(zc_token_path) and os.path.exists(zc_abi_path):
            with open(zc_token_path, 'r') as f:
                ZC_UNIVERSAL_TOKEN_BYTECODE = json.load(f)
            with open(zc_abi_path, 'r') as f:
                ZC_UNIVERSAL_TOKEN_ABI = json.load(f)
            logger.info("Loaded ZetaChain token artifacts from JSON files")
        else:
            logger.warning("ZetaChain token artifacts not found, using fallback")
            # Fallback ABI and bytecode
            ZC_UNIVERSAL_TOKEN_ABI = [
                {"inputs": [
                    {"internalType": "string", "name": "name_", "type": "string"},
                    {"internalType": "string", "name": "symbol_", "type": "string"},
                    {"internalType": "uint8", "name": "decimals_", "type": "uint8"},
                    {"internalType": "uint256", "name": "initialSupply", "type": "uint256"},
                    {"internalType": "address", "name": "initialOwner", "type": "address"}
                ], "stateMutability": "nonpayable", "type": "constructor"},
                {"inputs": [
                    {"internalType": "address", "name": "to", "type": "address"},
                    {"internalType": "uint256", "name": "amount", "type": "uint256"}
                ],
                "name": "mint",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"}
            ]
            # Placeholder bytecode for testing
            ZC_UNIVERSAL_TOKEN_BYTECODE = "0x60806040523480156200001157600080fd5b50604051620000a4..."
        
        # Use ZetaChain token ABI/bytecode for EVM token initially
        UNIVERSAL_TOKEN_ABI = ZC_UNIVERSAL_TOKEN_ABI
        UNIVERSAL_TOKEN_BYTECODE = ZC_UNIVERSAL_TOKEN_BYTECODE
        
        # Load NFT contracts (placeholder for now)
        UNIVERSAL_NFT_ABI = [
            {"inputs": [
                {"internalType": "string", "name": "name_", "type": "string"},
                {"internalType": "string", "name": "symbol_", "type": "string"},
                {"internalType": "string", "name": "baseURI_", "type": "string"}
            ], "stateMutability": "nonpayable", "type": "constructor"},
            {"inputs": [
                {"internalType": "address", "name": "to", "type": "address"}
            ],
            "name": "mint",
            "outputs": [
                {"internalType": "uint256", "name": "", "type": "uint256"}
            ],
            "stateMutability": "nonpayable",
            "type": "function"}
        ]
        # Placeholder bytecode for NFT
        UNIVERSAL_NFT_BYTECODE = "0x60806040523480156200001157600080fd5b50604051620000a4..."
        ZC_UNIVERSAL_NFT_ABI = UNIVERSAL_NFT_ABI
        ZC_UNIVERSAL_NFT_BYTECODE = UNIVERSAL_NFT_BYTECODE
        
        logger.info("Contract data loaded successfully")
        return True

    except Exception as e:
        logger.error(f"Error loading contract data: {e}", exc_info=True)
        # Set fallback minimal data
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
        
        UNIVERSAL_NFT_ABI = [
            {"inputs": [
                {"internalType": "string", "name": "name_", "type": "string"},
                {"internalType": "string", "name": "symbol_", "type": "string"},
                {"internalType": "string", "name": "baseURI_", "type": "string"}
            ], "stateMutability": "nonpayable", "type": "constructor"},
            {"inputs": [
                {"internalType": "address", "name": "to", "type": "address"}
            ],
            "name": "mint",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"}
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
    """Get the deployer account from the environment variable."""
    private_key = Config.DEPLOYER_PRIVATE_KEY
    if not private_key:
        logger.error("DEPLOYER_PRIVATE_KEY not set in environment.")
        return None
    try:
        account: LocalAccount = Account.from_key(private_key)
        logger.info(f"Loaded deployer account: {account.address}")
        return account
    except Exception as e:
        logger.error(f"Failed to load account from private key: {e}")
        return None


def deploy_contract(web3: Web3, account, contract_abi: List, contract_bytecode: str, constructor_args: List = [], gas_limit_override: Optional[int] = None) -> Dict[str, Any]:
    """Deploy a contract to the blockchain."""
    try:
        Contract = web3.eth.contract(abi=contract_abi, bytecode=contract_bytecode)
        
        # Get nonce
        nonce = web3.eth.get_transaction_count(account.address)
        logger.info(f"Using nonce: {nonce}")

        # Set a higher default gas limit for deployment
        deploy_gas_limit = gas_limit_override if gas_limit_override else 3_000_000

        # Prepare transaction
        tx_params = {
            'from': account.address,
            'nonce': nonce,
            'gas': deploy_gas_limit, # Use a higher fixed limit initially
            'gasPrice': web3.eth.gas_price 
        }
        
        # Build transaction
        logger.info(f"Building deployment transaction with args: {constructor_args}")
        try:
             # estimate_gas might fail if limit is too low, but we set a high one above
             # For deployment, build transaction is part of the Contract object constructor call
             transaction = Contract.constructor(*constructor_args).build_transaction(tx_params)
        except Exception as build_err:
             logger.error(f"Failed to build deployment transaction: {build_err}", exc_info=True)
             # Fallback if needed, maybe try gas estimation again? Less likely needed now.
             return {"success": False, "error": True, "message": f"Failed to build deployment transaction: {build_err}"}


        # Sign transaction
        signed_tx = web3.eth.account.sign_transaction(transaction, private_key=account.key)
        
        # Send transaction
        tx_hash = web3.eth.send_raw_transaction(signed_tx.raw_transaction)
        
        # --- Log TX Hash Immediately ---
        hex_tx_hash = web3.to_hex(tx_hash)
        logger.info(f"Deployment transaction sent. Hash: {hex_tx_hash}")
        # --- End Log ---

        # Wait for transaction receipt
        logger.info("Waiting for transaction receipt...")
        try:
            # Increased timeout to 300 seconds (5 minutes)
            receipt = web3.eth.wait_for_transaction_receipt(tx_hash, timeout=300) 
            
            if receipt.status == 1:
                contract_address = receipt.contractAddress
                logger.info(f"Contract deployed at: {contract_address}")
                
                # Convert receipt to a serializable dictionary with primitive Python types
                receipt_dict = {}
                try:
                    # Extract only the essential receipt data
                    receipt_dict = {
                        "blockHash": web3.to_hex(receipt.blockHash) if receipt.blockHash else None,
                        "blockNumber": receipt.blockNumber,
                        "gasUsed": receipt.gasUsed,
                        "status": receipt.status
                    }
                except Exception as e:
                    logger.warning(f"Could not fully convert receipt to dict: {str(e)}")
                
                return {
                    "success": True, 
                    "error": False,
                    "contract_address": contract_address,
                    "transaction_hash": hex_tx_hash,
                    "receipt": receipt_dict
                }
            else:
                logger.error(f"Contract deployment failed (reverted). Tx: {hex_tx_hash}")
                return {
                    "success": False, 
                    "error": True,
                    "transaction_hash": hex_tx_hash, 
                    "message": "Deployment transaction reverted"
                }
        except Exception as e: # Catch timeout errors etc.
            logger.error(f"Error waiting for deployment receipt for {hex_tx_hash}: {e}", exc_info=True)
            return {
                "success": False, 
                "error": True,
                "transaction_hash": hex_tx_hash, 
                "message": f"Error or timeout waiting for receipt: {e}"
            }

    except Exception as e:
        logger.error(f"Contract deployment failed: {str(e)}", exc_info=True)
        return {"success": False, "error": True, "message": f"Contract deployment failed: {str(e)}"}


def extract_compiler_version(source_code: str) -> str:
    """Extract Solidity compiler version from source code using regex."""
    # Regex to find pragma solidity line (flexible for different spacings)
    # Example: pragma solidity ^0.8.0; pragma solidity >=0.8.0 <0.9.0;
    # We need the exact version, often found in artifacts or compiled output,
    # but the pragma gives a clue. Blockscout requires a specific version format.
    # Example: v0.8.19+commit.7dd6d404
    
    match = re.search(r"pragma\s+solidity\s+([\^<>=]*\d+\.\d+\.\d+)", source_code)
    if match:
        version_pragma = match.group(1)
        logger.info(f"Found pragma version: {version_pragma}")
        # This is a simplification. Blockscout needs a specific version like
        # v0.8.19+commit.7dd6d404. This usually comes from the compiler output,
        # not just the pragma. We'll use a common recent version as a placeholder
        # if the exact format isn't easily derived.
        # TODO: Enhance this to use the exact compiler version used for deployment
        # For now, try to format common versions
        if version_pragma.startswith("^") or version_pragma.startswith(">="):
            base_version = version_pragma[1:].split("<")[0].strip()
            # Use a known recent commit for a common version - adjust as needed
            if base_version == "0.8.19":
                return "v0.8.19+commit.7dd6d404"
            if base_version == "0.8.20":
                 return "v0.8.20+commit.a1b79de6"
            if base_version == "0.8.26":
                 return "v0.8.26+commit.8a97fa7a"
            # Fallback if specific commit isn't known
            return f"v{base_version}" # Blockscout might accept this, needs testing
            
        # If it's an exact version (e.g., 0.8.19)
        return f"v{version_pragma}+commit.7dd6d404" # Assume a common commit

    logger.warning("Could not extract compiler version from source code.")
    # Return a default version if not found - adjust as needed
    return "v0.8.19+commit.7dd6d404"


def verify_contract_submission(
    chain_id: int,
    contract_address: str,
    contract_name: str,
    is_zetachain: bool = False
) -> Dict[str, Any]:
    """
    Submit contract verification to the appropriate block explorer API.
    Handles both Etherscan-like APIs and Blockscout.
    """
    chain_config = get_chain_config(chain_id)
    if not chain_config:
        return {"success": False, "message": f"Chain ID {chain_id} not configured", "status": "failed"}

    api_url = None
    api_key = None
    explorer_type = "etherscan" # Default

    if is_zetachain:
        if chain_config.get("blockscout_url"):
            api_url = f"{chain_config['blockscout_url'].rstrip('/')}/api"
            explorer_type = "blockscout"
            logger.info(f"Using Blockscout API for ZetaChain: {api_url}")
        else:
            logger.error(f"Blockscout URL not configured for ZetaChain ID {chain_id}")
            return {"success": False, "message": "Blockscout URL not configured for ZetaChain", "status": "failed"}
    else:
        # For EVM chains, prioritize Blockscout if configured, else use Etherscan
        if chain_config.get("blockscout_url"):
            api_url = f"{chain_config['blockscout_url'].rstrip('/')}/api"
            explorer_type = "blockscout"
            logger.info(f"Using Blockscout API for EVM chain {chain_id}: {api_url}")
        elif chain_config.get("api_url"):
            api_url = chain_config["api_url"]
            api_key = chain_config.get("api_key")
            if not api_key:
                 logger.warning(f"API key not found for Etherscan-like explorer on chain {chain_id}")
                 # Allow proceeding without API key for some explorers, but log warning
                 # return {"success": False, "message": f"API key not found for chain {chain_id}", "status": "failed"}
            logger.info(f"Using Etherscan-like API for EVM chain {chain_id}: {api_url}")
        else:
             logger.error(f"No API URL configured for chain {chain_id}")
             return {"success": False, "message": f"No API URL configured for chain {chain_id}", "status": "failed"}

    if not api_url:
        return {"success": False, "message": "Could not determine API URL", "status": "failed"}

    # Determine contract source file path
    contract_file = f"{contract_name}.sol"
    contract_path = os.path.join(SMART_CONTRACTS_DIR, "contracts", contract_file)

    if not os.path.exists(contract_path):
        logger.error(f"Contract source file not found at {contract_path}")
        # Check if the parent directory exists and list files for debugging
        parent_dir = os.path.dirname(contract_path)
        if not os.path.exists(parent_dir):
            logger.error(f"Parent directory not found: {parent_dir}")
        else:
            logger.info(f"Parent directory exists: {parent_dir}. Files: {os.listdir(parent_dir)}")
        return {"success": False, "message": f"Contract source file not found: {contract_file}", "status": "failed"}

    logger.info(f"Reading contract source from {contract_path}")
    with open(contract_path, 'r') as f:
        source_code = f.read()

    compiler_version = extract_compiler_version(source_code)
    logger.info(f"Using compiler version for verification: {compiler_version}")

    # --- Verification Payload and Request ---
    payload = {}
    headers = {}
    request_method = "POST"

    if explorer_type == "blockscout":
        logger.info(f"Preparing Blockscout verification payload for {contract_name}")
        payload = {
            "module": "contract",
            "action": "verifysourcecode",
            "contractaddress": contract_address,
            "contractname": contract_name,
            "compilerversion": compiler_version,
            "optimizationUsed": "1",  # Assuming optimization is always used (common practice)
            "runs": "200",  # Standard optimization runs
            "sourceCode": source_code,
            "evmversion": "paris",  # Default or check based on compiler version if needed
            "constructorArguments": "",  # Keep empty, let Blockscout handle if possible
            "codeformat": "solidity-single-file"  # Key setting for Blockscout
        }
        headers = {"Content-Type": "application/x-www-form-urlencoded"}
        # Blockscout uses POST with form data

        # Save verification data locally for debugging
        try:
            # Ensure filename is safe
            safe_contract_name = re.sub(r'[\\/*?"<>|]', "_", contract_name)
            data_filename = f"{safe_contract_name}_verification_data.json"
            with open(data_filename, 'w') as f:
                json.dump(payload, f, indent=2)
            logger.info(f"Saved Blockscout verification data to {data_filename}")
        except Exception as e:
            logger.warning(f"Could not save verification data: {e}")

    elif explorer_type == "etherscan":
        logger.info(f"Preparing Etherscan-like verification payload for {contract_name}")
        payload = {
            "apikey": api_key,
            "module": "contract",
            "action": "verifysourcecode",
            "contractaddress": contract_address,
            "sourceCode": source_code,
            "contractname": contract_name,
            "compilerversion": compiler_version,  # Ensure format matches (e.g., v0.8.19+commit...)
            "optimizationUsed": 1,  # 1 for true, 0 for false
            "runs": 200,  # Optimization runs
            # Add other fields like constructor arguments if needed
        }
        headers = {"Content-Type": "application/x-www-form-urlencoded"}
        # Etherscan also uses POST with form data

    else:
        return {"success": False, "message": f"Unsupported explorer type: {explorer_type}", "status": "failed"}

    # Make the API request
    try:
        logger.info(f"Sending verification request to {api_url}")
        # Log payload without source code for brevity
        log_payload = {k: (v if k != 'sourceCode' else f'<source code {len(v)} chars>') for k, v in payload.items()}
        logger.debug(f"Payload: {json.dumps(log_payload)}")

        response = requests.request(
            method=request_method,
            url=api_url,
            data=payload, # Use data for form-urlencoded
            headers=headers,
            timeout=60 # Increased timeout for verification
        )

        logger.info(f"Verification response status code: {response.status_code}")
        logger.debug(f"Verification response text: {response.text[:500]}...") # Log beginning of response

        # Save response locally for debugging
        try:
            response_filename = f"{contract_name}_verification_response.json"
            with open(response_filename, 'w') as f:
                try:
                    # Try saving as JSON if possible
                    json.dump(response.json(), f, indent=2)
                except json.JSONDecodeError:
                    # Save as text if not JSON
                    f.write(response.text)
            logger.info(f"Saved verification response to {response_filename}")
        except Exception as e:
            logger.warning(f"Could not save verification response: {e}")


        if response.status_code == 200:
            try:
                response_data = response.json()
                # Check response format (varies between Etherscan and Blockscout)
                if explorer_type == "blockscout":
                    # Blockscout success: status="1", result=guid OR status="0", result=error message
                    if response_data.get("status") == "1":
                        logger.info(f"Blockscout verification submitted successfully. GUID: {response_data.get('result')}")
                        # Blockscout submission doesn't mean instant verification
                        return {"success": True, "message": f"Verification submitted: {response_data.get('result')}", "status": "pending"}
                    else:
                        error_message = response_data.get("result", "Unknown Blockscout error")
                        logger.error(f"Blockscout verification submission failed: {error_message}")
                        return {"success": False, "message": error_message, "status": "failed"}
                
                elif explorer_type == "etherscan":
                    # Etherscan success: status="1", result=guid | status="0", result=error
                    if response_data.get("status") == "1":
                        guid = response_data.get("result")
                        logger.info(f"Etherscan verification submitted successfully. GUID: {guid}")
                        # Start checking status using the GUID
                        # For simplicity now, return pending. A separate check status function is better.
                        return {"success": True, "message": f"Verification submitted: {guid}", "status": "pending"}
                    else:
                        error_message = response_data.get("result", "Unknown Etherscan error")
                        logger.error(f"Etherscan verification submission failed: {error_message}")
                        return {"success": False, "message": error_message, "status": "failed"}

            except json.JSONDecodeError:
                logger.error("Failed to decode JSON response from explorer API")
                return {"success": False, "message": "Invalid JSON response from API", "status": "failed"}
        else:
            logger.error(f"Explorer API request failed with status {response.status_code}")
            return {"success": False, "message": f"API request failed with status {response.status_code}: {response.text[:200]}", "status": "failed"}

    except requests.exceptions.RequestException as e:
        logger.error(f"Error sending verification request: {e}", exc_info=True)
        return {"success": False, "message": f"Network error during verification: {e}", "status": "failed"}
    except Exception as e:
        logger.error(f"Unexpected error during verification submission: {e}", exc_info=True)
        return {"success": False, "message": f"Unexpected error: {e}", "status": "failed"}


async def check_verification_status(chain_id: int, guid: str) -> Dict[str, Any]:
    """Check the verification status using the GUID provided by the explorer API."""
    chain_config = get_chain_config(chain_id)
    if not chain_config:
        return {"success": False, "message": f"Chain ID {chain_id} not configured"}

    # Determine API URL and type (assuming Etherscan-like for status check for now)
    # Blockscout might require different handling or may not have a separate
    # status check API easily usable
    api_url = chain_config.get("api_url")
    api_key = chain_config.get("api_key")
    is_blockscout = chain_config.get("blockscout_url") and not api_url
    # Assume Blockscout if only blockscout_url exists

    if is_blockscout:
         logger.warning("Automatic status check for Blockscout GUID not implemented, returning pending.")
         # Blockscout verification often happens quickly or might require manual check
         # For now, assume it's still pending or succeeded if submission was ok.
         # A more robust solution might involve polling the contract page or a
         # specific API if available.
         return {"success": True, "status": "pending", "message": "Blockscout status check not implemented"}


    if not api_url:
        return {"success": False, "message": f"API URL not configured for chain {chain_id}"}

    params = {
        "apikey": api_key,
        "module": "contract",
        "action": "checkverifystatus",
        "guid": guid
    }

    try:
        response = requests.get(api_url, params=params, timeout=30)
        if response.status_code == 200:
            data = response.json()
            result_message = data.get("result", "")
            
            if data.get("status") == "1": # Etherscan success status
                logger.info(f"Verification status for GUID {guid}: Success")
                return {"success": True, "status": "success", "message": result_message}
            elif data.get("status") == "0" and "Pending" in result_message:
                logger.info(f"Verification status for GUID {guid}: Pending")
                return {"success": True, "status": "pending", "message": result_message}
            else:
                 logger.error(f"Verification status check failed for GUID {guid}: {result_message}")
                 return {"success": False, "status": "failed", "message": result_message}
        else:
             logger.error(f"API request for status check failed: {response.status_code}")
             return {"success": False, "message": f"API Error: {response.status_code}"}

    except Exception as e:
        logger.error(f"Error checking verification status: {e}")
        return {"success": False, "message": f"Error: {e}"}


# Ensure contract data is loaded when module is imported
load_contract_data() 