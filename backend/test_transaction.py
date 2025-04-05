#!/usr/bin/env python3

import asyncio
from app.utils.web3_helper import get_account, get_web3

async def send_test_transaction():
    account = get_account()
    if not account:
        print("Failed to load account from private key")
        return
    
    print(f"Deployer address: {account.address}")
    
    # Connect to ZetaChain Testnet
    web3 = await get_web3(7001)
    
    # Check initial balance
    balance = web3.eth.get_balance(account.address)
    print(f"Initial ZetaChain balance: {web3.from_wei(balance, 'ether')} ZETA")
    
    # Create a test transaction - sending 0 ZETA to self
    try:
        print("Creating test transaction...")
        
        # Get the nonce for the account
        nonce = web3.eth.get_transaction_count(account.address)
        print(f"Account nonce: {nonce}")
        
        # Build transaction
        tx = {
            'to': account.address,
            'value': 0,
            'gas': 21000,
            'gasPrice': web3.eth.gas_price,
            'nonce': nonce,
            'chainId': web3.eth.chain_id
        }
        
        # Sign transaction
        print("Signing transaction...")
        signed_tx = account.sign_transaction(tx)
        
        # Get raw transaction based on web3.py version
        # In web3.py v5, raw_tx is available as .rawTransaction
        # In web3.py v6+, it's available as .raw_transaction
        if hasattr(signed_tx, 'rawTransaction'):
            raw_tx = signed_tx.rawTransaction
        else:
            raw_tx = signed_tx.raw_transaction if hasattr(signed_tx, 'raw_transaction') else None
            
        if not raw_tx:
            raise ValueError("Could not access raw transaction data")
        
        # Send the raw transaction
        print("Sending signed transaction...")
        tx_hash = web3.eth.send_raw_transaction(raw_tx)
        print(f"Transaction hash: {tx_hash.hex()}")
        
        # Wait for transaction receipt
        print("Waiting for transaction confirmation...")
        receipt = web3.eth.wait_for_transaction_receipt(tx_hash)
        print(f"Transaction confirmed in block: {receipt.blockNumber}")
        print(f"Gas used: {receipt.gasUsed}")
        
        # Check final balance
        final_balance = web3.eth.get_balance(account.address)
        print(f"Final ZetaChain balance: {web3.from_wei(final_balance, 'ether')} ZETA")
        gas_cost = balance - final_balance
        print(f"Transaction cost: {web3.from_wei(gas_cost, 'ether')} ZETA")
        print("Test transaction successful!")
        
    except Exception as e:
        print(f"Failed to send test transaction: {e}")

if __name__ == "__main__":
    asyncio.run(send_test_transaction()) 