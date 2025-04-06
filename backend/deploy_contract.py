import json
import os
from web3 import Web3
from dotenv import load_dotenv
import argparse


# Load environment variables
load_dotenv()


def deploy_contract(w3, artifact_path, constructor_args=None, private_key=None):
    """
    Deploy a contract using the compiled artifact
    
    Args:
        w3: Web3 instance
        artifact_path: Path to the compiled contract JSON file
        constructor_args: Arguments for the contract constructor
        private_key: Private key to sign the transaction
        
    Returns:
        Deployed contract address
    """
    # Load contract ABI and bytecode
    with open(artifact_path, 'r') as f:
        contract_json = json.load(f)
    
    abi = contract_json['abi']
    bytecode = contract_json['bytecode']
    
    # Get contract factory
    contract = w3.eth.contract(abi=abi, bytecode=bytecode)
    
    # Get transaction parameters
    account = w3.eth.account.from_key(private_key)
    nonce = w3.eth.get_transaction_count(account.address)
    
    # Build transaction
    if constructor_args:
        contract_txn = contract.constructor(*constructor_args).build_transaction({
            'from': account.address,
            'nonce': nonce,
            'gas': 3000000,
            'gasPrice': w3.eth.gas_price
        })
    else:
        contract_txn = contract.constructor().build_transaction({
            'from': account.address,
            'nonce': nonce,
            'gas': 3000000,
            'gasPrice': w3.eth.gas_price
        })
    
    # Sign transaction
    signed_txn = w3.eth.account.sign_transaction(contract_txn, private_key=private_key)
    
    # Send transaction
    tx_hash = w3.eth.send_raw_transaction(signed_txn.rawTransaction)
    
    # Wait for transaction receipt
    tx_receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
    
    return tx_receipt.contractAddress


def main():
    parser = argparse.ArgumentParser(description='Deploy contracts to Zetachain testnet')
    parser.add_argument('--rpc', default='https://zetachain-athens.g.allthatnode.com/archive/evm', help='RPC URL')
    args = parser.parse_args()
    
    # Connect to Zetachain testnet
    w3 = Web3(Web3.HTTPProvider(args.rpc))
    
    # Check connection
    if not w3.is_connected():
        print("Failed to connect to the RPC endpoint")
        return
    
    # Check chain ID
    chain_id = w3.eth.chain_id
    if chain_id != 7001:
        print(f"Warning: Connected to chain ID {chain_id}, expected 7001 (Zetachain testnet)")
    
    # Get private key
    private_key = os.getenv('PRIVATE_KEY')
    if not private_key:
        private_key = input("Enter your private key: ")
    
    # Deploy main contract
    print("Deploying ZetaChainUniversalToken...")
    token_address = deploy_contract(
        w3,
        'artifacts/ZetaChainUniversalToken.json',
        constructor_args=None,
        private_key=private_key
    )
    print(f"ZetaChainUniversalToken deployed at: {token_address}")
    
    # Deploy proxy
    print("Deploying ERC1967Proxy...")
    
    # For the proxy, we typically need the implementation address and initialization data
    # Note: This depends on your exact proxy setup, and might need adjustment
    # Assuming we need to initialize with the token address
    proxy_address = deploy_contract(
        w3,
        'artifacts/ERC1967Proxy.json',
        constructor_args=[token_address, b''],  # Adjust initialization data as needed
        private_key=private_key
    )
    print(f"ERC1967Proxy deployed at: {proxy_address}")
    print(f"Your token is now accessible through the proxy at: {proxy_address}")


if __name__ == "__main__":
    main()
