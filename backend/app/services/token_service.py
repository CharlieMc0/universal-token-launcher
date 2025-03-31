from typing import List, Dict, Any, Optional
import json
from web3 import Web3
from sqlalchemy.orm import Session
from fastapi import HTTPException
from decimal import Decimal

from app.models.token import TokenConfiguration, TokenDistribution, DeploymentLog
from app.core.config import settings
from app.models.schemas import TokenCreationRequest, TokenDistributionEntry


class TokenService:
    """Service for handling token deployment and distribution."""
    
    def __init__(self):
        """Initialize the token service."""
        self.web3 = Web3(Web3.HTTPProvider(settings.ZETA_CHAIN_RPC_URL))
    
    def create_token_configuration(
        self, 
        db: Session, 
        creator_wallet: str, 
        token_request: TokenCreationRequest,
        icon_url: Optional[str] = None
    ) -> TokenConfiguration:
        """Create a new token configuration record."""
        # Create token configuration
        token_config = TokenConfiguration(
            creator_wallet=creator_wallet,
            token_name=token_request.token_name,
            token_symbol=token_request.token_symbol,
            icon_url=icon_url,
            decimals=token_request.decimals,
            total_supply=token_request.total_supply,
            csv_data=json.dumps([dist.dict() for dist in token_request.distributions]),
            deployment_status="pending"
        )
        
        db.add(token_config)
        db.commit()
        db.refresh(token_config)
        
        # Create distribution records
        for dist in token_request.distributions:
            distribution = TokenDistribution(
                token_config_id=token_config.id,
                recipient_address=dist.recipient_address,
                chain_id=dist.chain_id,
                token_amount=dist.token_amount,
                status="pending"
            )
            db.add(distribution)
        
        # Create deployment logs for selected chains
        for chain_id in token_request.selected_chains:
            chain_name = settings.CHAIN_NAMES.get(int(chain_id), f"Chain {chain_id}")
            deployment_log = DeploymentLog(
                token_config_id=token_config.id,
                chain_name=chain_name,
                chain_id=chain_id,
                status="pending"
            )
            db.add(deployment_log)
        
        db.commit()
        return token_config
    
    def verify_fee_payment(self, tx_hash: str) -> bool:
        """
        Verify that the fee was paid to the service wallet.
        
        Returns True if the payment was verified, False otherwise.
        """
        try:
            # Get transaction details
            tx = self.web3.eth.get_transaction(tx_hash)
            tx_receipt = self.web3.eth.get_transaction_receipt(tx_hash)
            
            # Check if transaction was successful
            if tx_receipt.status != 1:
                return False
                
            # Check if the recipient is the service wallet
            if tx.to.lower() != settings.UNIVERSAL_TOKEN_SERVICE_WALLET.lower():
                return False
                
            # Check if the amount is correct (ZETA fee)
            value_in_zeta = Decimal(self.web3.from_wei(tx.value, 'ether'))
            if value_in_zeta < Decimal(settings.FIXED_ZETA_FEE):
                return False
                
            return True
        except Exception as e:
            # Log the error for debugging
            print(f"Error verifying fee payment: {str(e)}")
            return False
    
    def update_deployment_status(
        self, 
        db: Session, 
        token_id: int, 
        fee_paid_tx: str
    ) -> TokenConfiguration:
        """
        Update token deployment status after fee payment.
        """
        # Get token configuration
        token_config = db.query(TokenConfiguration).filter(
            TokenConfiguration.id == token_id
        ).first()
        
        if not token_config:
            raise HTTPException(status_code=404, detail="Token configuration not found")
        
        # Verify fee payment
        if not self.verify_fee_payment(fee_paid_tx):
            raise HTTPException(status_code=400, detail="Fee payment verification failed")
        
        # Update token configuration
        token_config.fee_paid_tx = fee_paid_tx
        token_config.deployment_status = "deploying"
        db.commit()
        db.refresh(token_config)
        
        # In a real implementation, this would trigger an async task to deploy 
        # contracts on the selected chains
        
        return token_config
    
    def get_token_configuration(
        self, 
        db: Session, 
        token_id: int, 
        wallet_address: Optional[str] = None
    ) -> TokenConfiguration:
        """
        Get token configuration by ID, optionally filtering by creator wallet.
        """
        query = db.query(TokenConfiguration).filter(TokenConfiguration.id == token_id)
        
        if wallet_address:
            query = query.filter(TokenConfiguration.creator_wallet == wallet_address)
        
        token_config = query.first()
        
        if not token_config:
            raise HTTPException(status_code=404, detail="Token configuration not found")
        
        return token_config
    
    def get_token_deployments(
        self, 
        db: Session, 
        token_id: int
    ) -> List[DeploymentLog]:
        """
        Get deployment logs for a token.
        """
        return db.query(DeploymentLog).filter(
            DeploymentLog.token_config_id == token_id
        ).all()
    
    def get_token_distributions(
        self, 
        db: Session, 
        token_id: int
    ) -> List[TokenDistribution]:
        """
        Get distribution records for a token.
        """
        return db.query(TokenDistribution).filter(
            TokenDistribution.token_config_id == token_id
        ).all()


# Singleton instance
token_service = TokenService() 