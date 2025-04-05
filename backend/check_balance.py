#!/usr/bin/env python3

import asyncio
from app.utils.web3_helper import get_account, get_web3
from app.utils.logger import logger

async def check_balance():
    account = get_account()
    if not account:
        print("Failed to load account from private key")
        return
    
    print(f"Deployer address: {account.address}")
    
    # Check balance on ZetaChain Testnet
    zetachain_web3 = await get_web3(7001)
    balance = zetachain_web3.eth.get_balance(account.address)
    print(f"ZetaChain Testnet balance: {balance} wei")
    print(f"ZetaChain Testnet balance: {zetachain_web3.from_wei(balance, 'ether')} ZETA")
    
    # Also check Sepolia
    try:
        sepolia_web3 = await get_web3(11155111)
        sepolia_balance = sepolia_web3.eth.get_balance(account.address)
        print(f"Sepolia balance: {sepolia_balance} wei")
        print(f"Sepolia balance: {sepolia_web3.from_wei(sepolia_balance, 'ether')} ETH")
    except Exception as e:
        print(f"Failed to check Sepolia balance: {e}")

if __name__ == "__main__":
    asyncio.run(check_balance()) 