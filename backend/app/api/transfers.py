from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.models.database import get_db
from app.models.schemas import TransferRequest, TransferResponse
from app.core.auth.web3_auth import get_current_wallet
from app.services.transfer_service import transfer_service

router = APIRouter(prefix="/transfers", tags=["transfers"])


@router.post("/", response_model=TransferResponse)
async def create_transfer(
    transfer_request: TransferRequest,
    wallet: str = Depends(get_current_wallet),
    db: Session = Depends(get_db)
):
    """
    Create a new transfer transaction.
    """
    return transfer_service.create_transfer(db, wallet, transfer_request)


@router.get("/{transfer_id}", response_model=TransferResponse)
async def get_transfer(
    transfer_id: int,
    wallet: str = Depends(get_current_wallet),
    db: Session = Depends(get_db)
):
    """
    Get transfer transaction by ID.
    """
    return transfer_service.get_transfer(db, transfer_id, wallet)


@router.get("/", response_model=List[TransferResponse])
async def get_user_transfers(
    token_id: int = None,
    wallet: str = Depends(get_current_wallet),
    db: Session = Depends(get_db)
):
    """
    Get all transfer transactions for the authenticated user.
    Optionally filter by token ID.
    """
    return transfer_service.get_user_transfers(db, wallet, token_id) 