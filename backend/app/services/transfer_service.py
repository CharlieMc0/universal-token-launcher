from typing import Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.token import TransferTransaction, TokenConfiguration
from app.models.schemas import TransferRequest


class TransferService:
    """Service for handling token transfers between chains."""
    
    def create_transfer(
        self,
        db: Session,
        wallet_address: str,
        transfer_request: TransferRequest
    ) -> TransferTransaction:
        """
        Create a transfer transaction record and initiate the transfer process.
        """
        # Verify token configuration exists
        token_config = db.query(TokenConfiguration).filter(
            TokenConfiguration.id == transfer_request.token_config_id
        ).first()
        
        if not token_config:
            raise HTTPException(status_code=404, detail="Token configuration not found")
        
        # Create transfer transaction record
        transfer = TransferTransaction(
            user_wallet=wallet_address,
            token_config_id=transfer_request.token_config_id,
            source_chain=transfer_request.source_chain,
            destination_chain=transfer_request.destination_chain,
            token_amount=transfer_request.token_amount,
            status="pending"
        )
        
        db.add(transfer)
        db.commit()
        db.refresh(transfer)
        
        # In a real implementation, this would trigger an async task to 
        # initiate the actual token transfer on the blockchain
        
        return transfer
    
    def get_transfer(
        self,
        db: Session,
        transfer_id: int,
        wallet_address: Optional[str] = None
    ) -> TransferTransaction:
        """
        Get transfer transaction by ID, optionally filtering by user wallet.
        """
        query = db.query(TransferTransaction).filter(
            TransferTransaction.id == transfer_id
        )
        
        if wallet_address:
            query = query.filter(TransferTransaction.user_wallet == wallet_address)
        
        transfer = query.first()
        
        if not transfer:
            raise HTTPException(status_code=404, detail="Transfer transaction not found")
        
        return transfer
    
    def get_user_transfers(
        self,
        db: Session,
        wallet_address: str,
        token_id: Optional[int] = None
    ):
        """
        Get all transfer transactions for a user, optionally filtered by token ID.
        """
        query = db.query(TransferTransaction).filter(
            TransferTransaction.user_wallet == wallet_address
        )
        
        if token_id:
            query = query.filter(TransferTransaction.token_config_id == token_id)
        
        return query.order_by(TransferTransaction.created_at.desc()).all()


# Singleton instance
transfer_service = TransferService() 