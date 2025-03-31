from typing import List, Optional, Dict
from web3 import Web3
from sqlalchemy.orm import Session
import json
from decimal import Decimal
from pathlib import Path

from app.models.token import TokenConfiguration, DeploymentLog, TokenDistribution
from app.core.config import settings


class ContractService:
    """Service for handling smart contract deployments and interactions."""
    
    def __init__(self, chain_rpc_urls: Dict[str, str]):
        """Initialize the contract service with RPC URLs for different chains."""
        self.chain_rpc_urls = chain_rpc_urls
        self.web3_instances: Dict[str, Web3] = {}
        self.contract_abis: Dict[str, Dict] = {}
        
        # Initialize Web3 instances for each chain
        for chain, url in chain_rpc_urls.items():
            self.web3_instances[chain] = Web3(Web3.HTTPProvider(url))
            
        # Load contract ABI
        contract_path = Path(__file__).parent.parent / "contracts" / "UniversalToken.sol"
        self._load_contract_abi(contract_path)
    
    def _load_contract_abi(self, contract_path: Path):
        """Load the contract ABI from the Solidity file."""
        # TODO: Implement ABI loading from Solidity file
        # For now, we'll use a placeholder ABI
        self.contract_abis["UniversalToken"] = {
            "abi": [
                {
                    "inputs": [
                        {"name": "name", "type": "string"},
                        {"name": "symbol", "type": "string"},
                        {"name": "decimals", "type": "uint8"},
                        {"name": "totalSupply", "type": "uint256"}
                    ],
                    "stateMutability": "nonpayable",
                    "type": "constructor"
                }
            ],
            "bytecode": "0x"  # TODO: Add actual bytecode
        }
    
    async def deploy_token(
        self,
        chain: str,
        name: str,
        symbol: str,
        decimals: int,
        total_supply: int,
        deployer_address: str,
        deployer_key: str
    ) -> Optional[str]:
        """Deploy a new token contract on the specified chain."""
        if chain not in self.web3_instances:
            raise ValueError(f"Chain {chain} not supported")
            
        web3 = self.web3_instances[chain]
        
        # Get the contract factory
        contract_factory = web3.eth.contract(
            abi=self.contract_abis["UniversalToken"]["abi"],
            bytecode=self.contract_abis["UniversalToken"]["bytecode"]
        )
        
        # Build the transaction
        transaction = contract_factory.constructor(
            name,
            symbol,
            decimals,
            total_supply
        ).build_transaction({
            'from': deployer_address,
            'nonce': web3.eth.get_transaction_count(deployer_address),
            'gas': 2000000,
            'gasPrice': web3.eth.gas_price
        })
        
        # Sign and send the transaction
        signed_txn = web3.eth.account.sign_transaction(transaction, deployer_key)
        tx_hash = web3.eth.send_raw_transaction(signed_txn.rawTransaction)
        
        # Wait for transaction receipt
        receipt = web3.eth.wait_for_transaction_receipt(tx_hash)
        
        return receipt.contractAddress
    
    async def verify_token(
        self,
        chain: str,
        contract_address: str
    ) -> bool:
        """Verify that a contract at the given address is a valid UniversalToken."""
        if chain not in self.web3_instances:
            raise ValueError(f"Chain {chain} not supported")
            
        web3 = self.web3_instances[chain]
        
        try:
            contract = web3.eth.contract(
                address=contract_address,
                abi=self.contract_abis["UniversalToken"]["abi"]
            )
            
            # Try to call a function that only exists in our contract
            # This will fail if the contract is not a UniversalToken
            contract.functions.isBridgeContract(contract_address).call()
            return True
            
        except Exception:
            return False
    
    async def deploy_token_contract(
        self,
        db: Session,
        token_config: TokenConfiguration,
        chain_id: str
    ) -> Optional[str]:
        """
        Deploy the Universal Token contract on the specified chain.
        
        Args:
            db: Database session
            token_config: Token configuration data
            chain_id: Chain ID to deploy on
            
        Returns:
            Contract address if successful, None otherwise
        """
        try:
            # Get Web3 connection for the chain
            web3 = self.web3_instances.get(chain_id)
            if not web3:
                raise ValueError(f"No RPC URL configured for chain {chain_id}")
            
            # Get the contract bytecode and ABI
            # TODO: Load from a file or database
            contract_bytecode = "..."  # Universal Token contract bytecode
            contract_abi = [...]  # Universal Token contract ABI
            
            # Create contract
            contract = web3.eth.contract(
                abi=contract_abi,
                bytecode=contract_bytecode
            )
            
            # Prepare deployment transaction
            deploy_tx = contract.constructor(
                token_config.token_name,
                token_config.token_symbol,
                token_config.decimals,
                int(Decimal(token_config.total_supply) * (10 ** token_config.decimals))
            ).build_transaction({
                'from': settings.DEPLOYER_WALLET,
                'nonce': web3.eth.get_transaction_count(settings.DEPLOYER_WALLET),
                'gas': 2000000,
                'gasPrice': web3.eth.gas_price
            })
            
            # Sign and send transaction
            signed_tx = web3.eth.account.sign_transaction(
                deploy_tx,
                private_key=settings.DEPLOYER_PRIVATE_KEY
            )
            tx_hash = web3.eth.send_raw_transaction(signed_tx.rawTransaction)
            
            # Wait for transaction receipt
            tx_receipt = web3.eth.wait_for_transaction_receipt(tx_hash)
            
            if tx_receipt.status == 1:
                contract_address = tx_receipt.contractAddress
                
                # Update deployment log
                deployment_log = db.query(DeploymentLog).filter(
                    DeploymentLog.token_config_id == token_config.id,
                    DeploymentLog.chain_id == chain_id
                ).first()
                
                if deployment_log:
                    deployment_log.contract_address = contract_address
                    deployment_log.status = "success"
                    db.commit()
                
                return contract_address
            else:
                raise Exception("Contract deployment transaction failed")
                
        except Exception as e:
            # Update deployment log with error
            deployment_log = db.query(DeploymentLog).filter(
                DeploymentLog.token_config_id == token_config.id,
                DeploymentLog.chain_id == chain_id
            ).first()
            
            if deployment_log:
                deployment_log.status = "failed"
                deployment_log.error_message = str(e)
                db.commit()
            
            print(f"Error deploying contract on chain {chain_id}: {str(e)}")
            return None
    
    async def distribute_tokens(
        self,
        db: Session,
        token_config: TokenConfiguration,
        chain_id: str
    ) -> bool:
        """
        Distribute tokens to recipients on the specified chain.
        
        Args:
            db: Database session
            token_config: Token configuration data
            chain_id: Chain ID to distribute on
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Get Web3 connection for the chain
            web3 = self.web3_instances.get(chain_id)
            if not web3:
                raise ValueError(f"No RPC URL configured for chain {chain_id}")
            
            # Get deployment log to get contract address
            deployment_log = db.query(DeploymentLog).filter(
                DeploymentLog.token_config_id == token_config.id,
                DeploymentLog.chain_id == chain_id,
                DeploymentLog.status == "success"
            ).first()
            
            if not deployment_log or not deployment_log.contract_address:
                raise ValueError("Contract not deployed on this chain")
            
            # Get token contract instance
            # TODO: Load ABI from a file or database
            contract_abi = [...]  # Universal Token contract ABI
            contract = web3.eth.contract(
                address=deployment_log.contract_address,
                abi=contract_abi
            )
            
            # Get distributions for this chain
            distributions = db.query(TokenDistribution).filter(
                TokenDistribution.token_config_id == token_config.id,
                TokenDistribution.chain_id == chain_id,
                TokenDistribution.status == "pending"
            ).all()
            
            # Process each distribution
            for dist in distributions:
                # Prepare transfer transaction
                transfer_tx = contract.functions.transfer(
                    dist.recipient_address,
                    int(Decimal(dist.token_amount) * (10 ** token_config.decimals))
                ).build_transaction({
                    'from': settings.DEPLOYER_WALLET,
                    'nonce': web3.eth.get_transaction_count(settings.DEPLOYER_WALLET),
                    'gas': 100000,
                    'gasPrice': web3.eth.gas_price
                })
                
                # Sign and send transaction
                signed_tx = web3.eth.account.sign_transaction(
                    transfer_tx,
                    private_key=settings.DEPLOYER_PRIVATE_KEY
                )
                tx_hash = web3.eth.send_raw_transaction(signed_tx.rawTransaction)
                
                # Wait for transaction receipt
                tx_receipt = web3.eth.wait_for_transaction_receipt(tx_hash)
                
                if tx_receipt.status == 1:
                    # Update distribution status
                    dist.status = "success"
                    dist.transaction_hash = tx_hash.hex()
                else:
                    dist.status = "failed"
                    dist.error_message = "Transfer transaction failed"
            
            db.commit()
            return True
            
        except Exception as e:
            print(f"Error distributing tokens on chain {chain_id}: {str(e)}")
            return False

# Create a singleton instance
contract_service = ContractService(settings.CHAIN_RPC_URLS) 