"""Web3 helper utilities for interacting with blockchain networks."""

from typing import Dict, Any, Optional, List, Union, Tuple
from web3 import Web3
from eth_account import Account
from eth_account.signers.local import LocalAccount
import json
import os
import time
from web3.exceptions import TransactionNotFound

from app.utils.logger import logger
from app.utils.chain_config import get_chain_config
from app.config import Config

# --- Token contract data ---
UNIVERSAL_TOKEN_ABI = None
UNIVERSAL_TOKEN_BYTECODE = None
ZC_UNIVERSAL_TOKEN_ABI = None
ZC_UNIVERSAL_TOKEN_BYTECODE = None

# --- ERC1967 Proxy contract data ---
ERC1967_PROXY_ABI = None
ERC1967_PROXY_BYTECODE = None

# Path to artifacts - relative to the backend directory
ARTIFACTS_DIR = os.path.abspath(os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 
    "artifacts"
))

# --- Token contract paths ---
EVM_TOKEN_PATH = os.path.join(ARTIFACTS_DIR, "EVMUniversalToken.json")
ZC_TOKEN_PATH = os.path.join(ARTIFACTS_DIR, "ZetaChainUniversalToken.json")

# --- ERC1967 Proxy path ---
ERC1967_PROXY_PATH = os.path.join(ARTIFACTS_DIR, "ERC1967Proxy.json")

# TODO: Replace with a dynamic lookup or configuration
# Addresses of ZRC-20 gas tokens on ZetaChain Testnet (7001)
# REMOVED Hardcoded dictionary: ZRC20_GAS_TOKEN_ADDRESSES = {...}

async def get_zrc20_address(chain_id: int) -> str | None:
    """Get ZRC-20 gas token address for a given EVM chain ID from chain config."""
    try:
        # Use get_chain_config which should handle looking up by ID
        chain_config = get_chain_config(str(chain_id))
        if not chain_config:
            logger.warning(f"Chain config not found for chain ID: {chain_id}")
            return None
            
        # The key name might need adjustment based on actual rpc_config.json structure
        address = chain_config.get(
            "zrc20_gas_token_address"
        ) or chain_config.get(
            "zrc20_address"
        )
        
        if not address:
            logger.warning(
                f"ZRC-20 gas token address not found in config "
                f"for chain ID: {chain_id}"
            )
            return None
            
        # Validate address format (basic check)
        if not Web3.is_address(address):
            logger.warning(
                f"Invalid ZRC-20 address format found in config "
                f"for chain ID {chain_id}: {address}"
            )
            return None
             
        logger.info(
            f"Found ZRC-20 address {address} for chain {chain_id} in config."
        )
        return address
        
    except Exception as e:
        logger.error(f"Error retrieving ZRC-20 address for chain {chain_id} from config: {e}", exc_info=True)
        return None


async def call_contract_method(
    web3: Web3,
    account: LocalAccount,
    contract_address: str,
    contract_abi: List,
    method_name: str,
    args: List = None,
    value: int = 0,
    gas_limit: int = 1000000,
    max_retries: int = 3,
    retry_delay: int = 5
) -> Dict[str, Any]:
    """Builds, signs, and sends a transaction to call a contract method."""
    try:
        contract_address = web3.to_checksum_address(contract_address)
        contract = web3.eth.contract(address=contract_address, abi=contract_abi)
        
        # Get nonce
        try:
            nonce = web3.eth.get_transaction_count(account.address)
        except Exception as e:
            logger.error(f"Failed to get nonce: {e}")
            return {"success": False, "error": True, "message": f"Failed to get nonce: {e}"}
        
        # Prepare the transaction dictionary
        try:
            gas_price = web3.eth.gas_price
            tx_params = {
                'from': account.address,
                'nonce': nonce,
                'value': value,
                'gasPrice': gas_price,  # Use current gas price
            }
        except Exception as e:
            logger.error(f"Failed to prepare transaction parameters: {e}")
            return {"success": False, "error": True, "message": f"Failed to prepare parameters: {e}"}

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
        try:
            signed_tx = account.sign_transaction(transaction)
        except Exception as e:
            logger.error(f"Failed to sign transaction: {e}")
            return {"success": False, "error": True, "message": f"Failed to sign transaction: {e}"}

        # Send transaction using the correct attribute access
        logger.info(f"Transaction sent for {method_name}. Hash: {web3.to_hex(signed_tx.hash)}")
        
        # Access the raw transaction based on web3.py version
        try:
            # Try different attribute names for raw transaction
            raw_tx = None
            if hasattr(signed_tx, 'rawTransaction'):
                raw_tx = signed_tx.rawTransaction
            elif hasattr(signed_tx, 'raw_transaction'):
                raw_tx = signed_tx.raw_transaction
            else:
                # Try direct inspection for newer versions
                for attr_name in dir(signed_tx):
                    if 'raw' in attr_name.lower() and isinstance(getattr(signed_tx, attr_name), bytes):
                        raw_tx = getattr(signed_tx, attr_name)
                        logger.info(f"Found raw transaction at attribute: {attr_name}")
                        break
            
            # Try dictionary access if attributes don't work
            if not raw_tx and isinstance(signed_tx, dict):
                if 'rawTransaction' in signed_tx:
                    raw_tx = signed_tx['rawTransaction']
                elif 'raw_transaction' in signed_tx:
                    raw_tx = signed_tx['raw_transaction']
            
            if not raw_tx:
                logger.error(f"Could not find raw transaction. SignedTx type: {type(signed_tx)}")
                logger.error(f"SignedTx attributes: {dir(signed_tx)}")
                raise ValueError("Could not access raw transaction data from signed transaction")
                
            tx_hash = web3.eth.send_raw_transaction(raw_tx)
            logger.info(f"Transaction {web3.to_hex(tx_hash)} sent")
        except Exception as e:
            logger.error(f"Failed to send transaction: {e}")
            return {"success": False, "error": True, "message": f"Failed to send transaction: {e}"}
        
        # Wait for transaction receipt with retries
        receipt = None
        for attempt in range(max_retries):
            try:
                receipt = web3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)  # Increased timeout
                logger.info(f"Transaction {web3.to_hex(tx_hash)} confirmed in block {receipt.blockNumber}")
                break  # Success, exit retry loop
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


def load_contract_data() -> bool:
    """Load contract ABIs and bytecode from filesystem (artifact files)."""
    global UNIVERSAL_TOKEN_ABI, UNIVERSAL_TOKEN_BYTECODE
    global ZC_UNIVERSAL_TOKEN_ABI, ZC_UNIVERSAL_TOKEN_BYTECODE
    global ERC1967_PROXY_ABI, ERC1967_PROXY_BYTECODE

    try:
        # --- Load EVM Token Artifact ---
        if not os.path.exists(EVM_TOKEN_PATH):
            logger.error(f"EVM token artifact not found at {EVM_TOKEN_PATH}")
            return False
            
        with open(EVM_TOKEN_PATH, 'r') as f:
            evm_token_artifact = json.load(f)
            UNIVERSAL_TOKEN_ABI = evm_token_artifact.get('abi')
            UNIVERSAL_TOKEN_BYTECODE = evm_token_artifact.get('bytecode')
            
            if not UNIVERSAL_TOKEN_ABI or not UNIVERSAL_TOKEN_BYTECODE:
                logger.error(f"EVM token artifact at {EVM_TOKEN_PATH} missing ABI/bytecode")
                return False
                
            logger.info(f"Loaded EVM token artifact from {EVM_TOKEN_PATH}")
            logger.info(f"EVM bytecode length: {len(UNIVERSAL_TOKEN_BYTECODE) if UNIVERSAL_TOKEN_BYTECODE else 0}")
            logger.info(f"EVM ABI has initialize: {any(m.get('name') == 'initialize' for m in UNIVERSAL_TOKEN_ABI if isinstance(m, dict) and 'name' in m)}")

        # --- Load ZetaChain Token Artifact ---
        if not os.path.exists(ZC_TOKEN_PATH):
            logger.error(f"ZetaChain token artifact not found at {ZC_TOKEN_PATH}")
            return False
            
        with open(ZC_TOKEN_PATH, 'r') as f:
            zc_token_artifact = json.load(f)
            ZC_UNIVERSAL_TOKEN_ABI = zc_token_artifact.get('abi')
            ZC_UNIVERSAL_TOKEN_BYTECODE = zc_token_artifact.get('bytecode')
            
            if not ZC_UNIVERSAL_TOKEN_ABI or not ZC_UNIVERSAL_TOKEN_BYTECODE:
                logger.error(f"ZetaChain token artifact at {ZC_TOKEN_PATH} missing ABI/bytecode")
                return False
                
            logger.info(f"Loaded ZetaChain token artifact from {ZC_TOKEN_PATH}")
            logger.info(f"ZetaChain bytecode length: {len(ZC_UNIVERSAL_TOKEN_BYTECODE) if ZC_UNIVERSAL_TOKEN_BYTECODE else 0}")
            logger.info(f"ZetaChain ABI has initialize: {any(m.get('name') == 'initialize' for m in ZC_UNIVERSAL_TOKEN_ABI if isinstance(m, dict) and 'name' in m)}")
            
        # --- Load ERC1967 Proxy Artifact ---
        if not os.path.exists(ERC1967_PROXY_PATH):
            logger.error(f"ERC1967 Proxy artifact not found at {ERC1967_PROXY_PATH}")
            return False
            
        with open(ERC1967_PROXY_PATH, 'r') as f:
            proxy_artifact = json.load(f)
            ERC1967_PROXY_ABI = proxy_artifact.get('abi')
            ERC1967_PROXY_BYTECODE = proxy_artifact.get('bytecode')
            if not ERC1967_PROXY_ABI or not ERC1967_PROXY_BYTECODE:
                logger.error(f"ERC1967 Proxy artifact at {ERC1967_PROXY_PATH} missing ABI/bytecode")
                return False
            logger.info(f"Loaded ERC1967 Proxy artifact from {ERC1967_PROXY_PATH}")
            logger.info(f"Proxy bytecode length: {len(ERC1967_PROXY_BYTECODE) if ERC1967_PROXY_BYTECODE else 0}")

        logger.info("Contract data loaded successfully")
        return True

    except Exception as e:
        logger.error(f"Error loading contract data: {e}", exc_info=True)
        return False

# Load contract data when this module is imported
load_contract_data()

async def get_web3(chain_id: Union[int, str]) -> Web3:
    """
    Get a Web3 instance connected to the specified chain.

    Args:
        chain_id: Chain ID or name of the chain to connect to

    Returns:
        Web3 instance connected to the specified chain
    """
    # Convert chain_id to string if it's an integer
    if isinstance(chain_id, int):
        chain_id = str(chain_id)
    
    # Get chain config
    chain_config = get_chain_config(chain_id)
    if not chain_config:
        logger.error(f"Chain config not found for chain ID: {chain_id}")
        raise ValueError(f"Chain config not found for chain ID: {chain_id}")
    
    rpc_url = chain_config.get("rpc_url")
    
    if not rpc_url:
        logger.error(f"RPC URL not found for chain ID: {chain_id}")
        raise ValueError(f"RPC URL not found for chain ID: {chain_id}")
    
    # Initialize web3 instance
    web3 = Web3(Web3.HTTPProvider(rpc_url))
    
    logger.info(f"Connected to chain ID {chain_id} at {rpc_url}")
    
    return web3

def get_account():
    """Get a local account from private key."""
    private_key = os.environ.get('DEPLOYER_PRIVATE_KEY')
    if not private_key:
        logger.error("No DEPLOYER_PRIVATE_KEY found in environment variables")
        return None
    
    if not private_key.startswith('0x'):
        private_key = '0x' + private_key
    
    return Account.from_key(private_key)

async def deploy_contract(
    web3: Web3,
    account: LocalAccount,
    contract_abi: List,
    contract_bytecode: str,
    constructor_args: List = None,
    gas_limit_override: Optional[int] = None
) -> Dict[str, Any]:
    """
    Deploy a contract to the blockchain.
    
    Args:
        web3: Web3 instance
        account: Account to deploy from
        contract_abi: Contract ABI
        contract_bytecode: Contract bytecode
        constructor_args: Constructor arguments
        gas_limit_override: Gas limit override
        
    Returns:
        Dict with deployment result
    """
    try:
        contract = web3.eth.contract(abi=contract_abi, bytecode=contract_bytecode)
        
        # Get nonce
        nonce = web3.eth.get_transaction_count(account.address)
        
        # Prepare transaction dictionary
        tx_params = {
            'from': account.address,
            'nonce': nonce,
            'gasPrice': web3.eth.gas_price
        }
        
        if gas_limit_override:
            tx_params['gas'] = gas_limit_override
        
        # Build constructor transaction
        if constructor_args:
            constructor_tx = contract.constructor(*constructor_args).build_transaction(tx_params)
        else:
            constructor_tx = contract.constructor().build_transaction(tx_params)
        
        # Sign transaction
        signed_tx = account.sign_transaction(constructor_tx)
        
        # Send signed transaction
        # Access the raw transaction attribute - different web3.py versions use different names
        raw_tx = None
        if hasattr(signed_tx, 'rawTransaction'):
            raw_tx = signed_tx.rawTransaction
        elif hasattr(signed_tx, 'raw_transaction'):
            raw_tx = signed_tx.raw_transaction
        else:
            # Try direct inspection for newer versions
            for attr_name in dir(signed_tx):
                if 'raw' in attr_name.lower() and isinstance(getattr(signed_tx, attr_name), bytes):
                    raw_tx = getattr(signed_tx, attr_name)
                    logger.info(f"Found raw transaction at attribute: {attr_name}")
                    break
        
        if not raw_tx:
            # If still not found, try to access as dictionary
            if isinstance(signed_tx, dict) and 'rawTransaction' in signed_tx:
                raw_tx = signed_tx['rawTransaction']
            elif isinstance(signed_tx, dict) and 'raw_transaction' in signed_tx:
                raw_tx = signed_tx['raw_transaction']
        
        if not raw_tx:
            # Last resort - print the signed transaction structure for debugging
            logger.error(f"Could not find raw transaction. SignedTx type: {type(signed_tx)}")
            logger.error(f"SignedTx attributes: {dir(signed_tx)}")
            logger.error(f"SignedTx repr: {repr(signed_tx)}")
            raise ValueError("Could not access raw transaction data from signed transaction")
        
        tx_hash = web3.eth.send_raw_transaction(raw_tx)
        logger.info(f"Transaction sent. Hash: {web3.to_hex(tx_hash)}")
        
        # Wait for transaction receipt
        receipt = web3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
        
        if receipt.status != 1:
            logger.error(f"Contract deployment failed. Transaction reverted.")
            return {"success": False, "error": True, "message": "Transaction reverted"}
        
        contract_address = receipt.contractAddress
        logger.info(f"Contract deployed at: {contract_address}")
        
        return {
            "success": True, 
            "error": False, 
            "contract_address": contract_address,
            "transaction_hash": web3.to_hex(tx_hash)
        }
        
    except Exception as e:
        logger.error(f"Error deploying contract: {e}", exc_info=True)
        return {"success": False, "error": True, "message": f"Error deploying contract: {e}"}

async def deploy_implementation(
    web3: Web3,
    account: LocalAccount,
    contract_abi: List,
    contract_bytecode: str,
    constructor_args: List = None,
    gas_limit_override: Optional[int] = None
) -> Dict[str, Any]:
    """
    Deploy an implementation contract for use with a proxy.
    Simply a wrapper around deploy_contract with better logging.
    """
    logger.info(f"Deploying implementation contract...")
    result = await deploy_contract(
        web3=web3,
        account=account,
        contract_abi=contract_abi,
        contract_bytecode=contract_bytecode,
        constructor_args=constructor_args,
        gas_limit_override=gas_limit_override
    )
    
    if result.get("success"):
        logger.info(f"Implementation contract successfully deployed at: {result['contract_address']}")
    else:
        logger.error(f"Implementation contract deployment failed: {result.get('message')}")
        
    return result

async def deploy_erc1967_proxy(
    web3: Web3,
    account: LocalAccount,
    implementation_address: str,
    init_data: bytes = b'',  # Usually encode_function_data for initializer
    gas_limit_override: Optional[int] = None
) -> Dict[str, Any]:
    """
    Deploy an ERC1967 proxy contract pointing to an implementation.
    
    Args:
        web3: Web3 instance
        account: Account to deploy from
        implementation_address: Address of the implementation contract
        init_data: Initialization data (encoded initialize function call) 
        gas_limit_override: Optional gas limit override
        
    Returns:
        Dict with deployment result
    """
    if not ERC1967_PROXY_ABI or not ERC1967_PROXY_BYTECODE:
        logger.error("ERC1967 Proxy ABI or bytecode not loaded")
        return {"success": False, "error": True, "message": "ERC1967 Proxy ABI or bytecode not loaded"}
    
    try:
        # ERC1967Proxy constructor takes implementation address and initialization data
        constructor_args = [
            web3.to_checksum_address(implementation_address),
            init_data
        ]
        
        logger.info(f"Deploying ERC1967 Proxy pointing to implementation: {implementation_address}")
        logger.info(f"Initialization data length: {len(init_data)}")
        
        result = await deploy_contract(
            web3=web3,
            account=account,
            contract_abi=ERC1967_PROXY_ABI,
            contract_bytecode=ERC1967_PROXY_BYTECODE,
            constructor_args=constructor_args,
            gas_limit_override=gas_limit_override or 3000000  # Higher gas limit for proxy deployment
        )
        
        if result.get("success"):
            logger.info(f"ERC1967 Proxy successfully deployed at: {result['contract_address']}")
        else:
            logger.error(f"ERC1967 Proxy deployment failed: {result.get('message')}")
            
        return result
        
    except Exception as e:
        logger.error(f"Error deploying ERC1967 Proxy: {e}", exc_info=True)
        return {"success": False, "error": True, "message": f"Error deploying ERC1967 Proxy: {e}"}

def encode_initialize_data(web3: Web3, contract_abi: List, name: str, symbol: str, gateway_address: str, owner_address: str, gas: int = 3000000, uniswap_router_address: str = None) -> bytes:
    """
    Encode initialize function call data for token contracts.
    Determines argument list based on ABI signature.
    
    Args:
        web3: Web3 instance
        contract_abi: Contract ABI
        name: Token name
        symbol: Token symbol
        gateway_address: Gateway address
        owner_address: Initial owner address
        gas: Gas limit (used in initialize signature)
        uniswap_router_address: Optional Uniswap router address (for ZetaChain token)
        
    Returns:
        Encoded function call data
    """
    # Create a contract without an address (needed for data encoding)
    contract = web3.eth.contract(abi=contract_abi)
    
    try:
        # Find the initialize function in the ABI
        initialize_abi = None
        for item in contract_abi:
            if isinstance(item, dict) and item.get('type') == 'function' and item.get('name') == 'initialize':
                initialize_abi = item
                break
        
        if not initialize_abi:
            raise ValueError("Initialize function not found in ABI")
        
        # Log the function signature to help with debugging
        inputs = initialize_abi.get('inputs', [])
        num_params = len(inputs)
        signature = f"initialize({','.join(inp.get('type', '') for inp in inputs)})"
        logger.info(f"Found initialize function signature: {signature} with {num_params} parameters.")
        
        args_list = []
        
        # Determine arguments based on the number of parameters found in the ABI
        if num_params == 6: # Assumed ZetaChain version
            if not uniswap_router_address:
                 raise ValueError("Uniswap router address is required for 6-parameter initialize function (ZetaChain)")
            
            # Validate the uniswap_router_address is a valid address
            if not web3.is_address(uniswap_router_address):
                raise ValueError(f"Invalid Uniswap router address format: {uniswap_router_address}")
                 
            logger.info("Using 6-parameter initialize (assumed ZetaChain)")
            args_list = [
                web3.to_checksum_address(owner_address),
                name,
                symbol,
                web3.to_checksum_address(gateway_address),
                gas, # gas parameter expected by ZC token
                web3.to_checksum_address(uniswap_router_address)
            ]
            
        elif num_params == 5: # Assumed EVM version
            logger.info("Using 5-parameter initialize (assumed EVM)")
            # Order needs to match the EVMUniversalToken.sol initialize signature
            # Example: initialize(address _owner, string memory _name, string memory _symbol, address _gatewayAddress, uint256 _gas)
            args_list = [
                web3.to_checksum_address(owner_address),
                name,
                symbol,
                web3.to_checksum_address(gateway_address),
                gas # gas parameter also expected by EVM token
            ]
        else:
            raise ValueError(f"Unsupported initialize function signature: Expected 5 or 6 parameters, found {num_params}")
            
        # Encode the function call using web3.py's built-in method
        # Use encodeABI which is preferred for getting call data
        encoded_data = contract.encodeABI(fn_name="initialize", args=args_list)
        
        logger.info(f"Successfully generated initialization data ({len(encoded_data)} bytes) using ABI encoding.")
        return bytes.fromhex(encoded_data[2:]) # Return bytes, remove 0x prefix

    except Exception as e:
        logger.error(f"Fatal error encoding initialize data using ABI: {e}", exc_info=True)
        # Do NOT use fallback. Raise the error so the root cause can be fixed.
        raise ValueError(f"Failed to encode initialize data: {e}")

def get_chain_details(chain_id: int):
    """Get chain details from configuration."""
    chain_config = get_chain_config(str(chain_id))
    if not chain_config:
        return None
    return chain_config

def extract_compiler_version(contract_path: str) -> str:
    """Extract compiler version from contract json file."""
    if not os.path.exists(contract_path):
        logger.error(f"Contract file not found: {contract_path}")
        return "v0.8.17+commit.8df45f5f"  # Default version

    try:
        with open(contract_path, 'r') as f:
            data = json.load(f)
            metadata = json.loads(data.get('metadata', '{}'))
            compiler = metadata.get('compiler', {})
            version = compiler.get('version', '')
            
            if version:
                # Normalize version string to match what verification APIs expect
                if version.startswith('v'):
                    return version
                else:
                    return f"v{version}"
            
            # Fallback to default version
            return "v0.8.17+commit.8df45f5f"
    except Exception as e:
        logger.error(f"Error extracting compiler version: {e}")
        return "v0.8.17+commit.8df45f5f"  # Default version


async def verify_contract_submission(
    explorer_base_url: str,
    api_key: str,
    contract_address: str,
    contract_name: str,
    compiler_version: str,
    optimization_used: bool = True,
    optimization_runs: int = 200,
    source_code: str = "",
    contract_path: str = "",
    constructor_args: str = "",
    is_blockscout: bool = False,
) -> Dict[str, Any]:
    """
    Submit a contract for verification on a block explorer (Etherscan, Blockscout, etc.).
    
    Args:
        explorer_base_url: Base URL of the explorer API
        api_key: API key for the explorer
        contract_address: Address of the deployed contract to verify
        contract_name: Name of the contract
        compiler_version: Solidity compiler version
        optimization_used: Whether optimization was used for compilation
        optimization_runs: Number of optimization runs
        source_code: Source code of the contract
        contract_path: Path to the contract file
        constructor_args: ABI-encoded constructor arguments
        is_blockscout: Whether the explorer is Blockscout
        
    Returns:
        Dict with verification results
    """
    try:
        # If source code not provided but contract path is, read from file
        if not source_code and contract_path:
            if os.path.exists(contract_path):
                with open(contract_path, 'r') as f:
                    source_code = f.read()
            else:
                logger.error(f"Contract file not found: {contract_path}")
                return {
                    "success": False,
                    "error": True,
                    "message": f"Contract file not found: {contract_path}"
                }
                
        if not source_code:
            logger.error("No source code provided for verification")
            return {
                "success": False,
                "error": True,
                "message": "No source code provided for verification"
            }
        
        # Extract compiler version from source if not provided
        if not compiler_version and contract_path:
            compiler_version = extract_compiler_version(contract_path)
        
        # Prepare parameters based on explorer type
        if is_blockscout:
            # Blockscout format
            url = f"{explorer_base_url.rstrip('/')}/api"
            params = {
                "module": "contract",
                "action": "verify",
                "addressHash": contract_address,
                "name": contract_name,
                "compilerVersion": f"v{compiler_version}",
                "optimization": "true" if optimization_used else "false",
                "optimizationRuns": optimization_runs,
                "contractSourceCode": source_code
            }
            if constructor_args:
                params["constructorArguments"] = constructor_args
        else:
            # Etherscan-compatible format
            url = f"{explorer_base_url.rstrip('/')}/api"
            params = {
                "module": "contract",
                "action": "verifysourcecode",
                "contractaddress": contract_address,
                "sourceCode": source_code,
                "codeformat": "solidity-single-file",
                "contractname": contract_name,
                "compilerversion": f"v{compiler_version}",
                "optimizationUsed": "1" if optimization_used else "0",
                "runs": optimization_runs,
                "apikey": api_key
            }
            if constructor_args:
                params["constructorArguements"] = constructor_args  # Note: Etherscan's misspelling
        
        logger.info(f"Submitting verification request to {url} for contract {contract_address}")
        
        # Send verification request
        import httpx
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(url, data=params)
            
            if response.status_code != 200:
                logger.error(f"HTTP error {response.status_code} from verification endpoint")
                return {
                    "success": False,
                    "error": True,
                    "message": f"HTTP error {response.status_code} from verification endpoint: {response.text}"
                }
                
            result = response.json()
            logger.info(f"Verification submission response: {result}")
            
            # Handle different response formats
            if is_blockscout:
                if result.get("status") == "1":
                    return {
                        "success": True,
                        "error": False,
                        "guid": result.get("message", ""),
                        "result": result,
                        "is_blockscout": True
                    }
                else:
                    return {
                        "success": False,
                        "error": True,
                        "message": result.get("message", "Unknown error"),
                        "result": result,
                        "is_blockscout": True
                    }
            else:
                if result.get("status") == "1":
                    return {
                        "success": True,
                        "error": False,
                        "guid": result.get("result", ""),
                        "result": result,
                        "is_blockscout": False
                    }
                else:
                    return {
                        "success": False,
                        "error": True,
                        "message": result.get("result", "Unknown error"),
                        "result": result,
                        "is_blockscout": False
                    }
                
    except Exception as e:
        logger.error(f"Error submitting contract verification: {e}", exc_info=True)
        return {
            "success": False,
            "error": True,
            "message": f"Error submitting contract verification: {str(e)}"
        }


async def check_verification_status(
    explorer_base_url: str,
    guid: str,
    api_key: str = "",
    is_blockscout: bool = False
) -> Dict[str, Any]:
    """
    Check the status of a contract verification request.
    
    Args:
        explorer_base_url: Base URL of the explorer API
        guid: Verification GUID from verification submission
        api_key: API key for the explorer (for Etherscan-compatible)
        is_blockscout: Whether the explorer is Blockscout
        
    Returns:
        Dict with verification status
    """
    try:
        # Prepare URL and parameters based on explorer type
        url = f"{explorer_base_url.rstrip('/')}/api"
        
        if is_blockscout:
            # For Blockscout, we don't need to check status as verification is synchronous
            return {
                "success": True,
                "error": False,
                "status": "Verified",
                "is_complete": True,
                "is_blockscout": True
            }
        else:
            # Etherscan-compatible
            params = {
                "module": "contract",
                "action": "checkverifystatus",
                "guid": guid,
                "apikey": api_key
            }
            
            import httpx
            async with httpx.AsyncClient(timeout=15) as client:
                response = await client.get(url, params=params)
                
                if response.status_code != 200:
                    logger.error(f"HTTP error {response.status_code} checking verification status")
                    return {
                        "success": False,
                        "error": True,
                        "message": f"HTTP error {response.status_code}: {response.text}",
                        "is_complete": False
                    }
                    
                result = response.json()
                logger.info(f"Verification status response: {result}")
                
                is_complete = result.get("result", "").lower() == "pass"
                is_error = "error" in result.get("result", "").lower() or "invalid" in result.get("result", "").lower()
                
                return {
                    "success": is_complete,
                    "error": is_error,
                    "status": result.get("result", "Unknown"),
                    "is_complete": is_complete or is_error,
                    "message": result.get("result", ""),
                    "is_blockscout": False
                }
                
    except Exception as e:
        logger.error(f"Error checking verification status: {e}", exc_info=True)
        return {
            "success": False,
            "error": True,
            "message": f"Error checking verification status: {str(e)}",
            "is_complete": False
        }

# ... (existing functions: extract_compiler_version, verify_contract_submission, check_verification_status, etc.) ... 