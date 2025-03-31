from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.models.schemas import AuthRequest, AuthResponse
from app.models.database import get_db
from app.core.auth.web3_auth import (
    generate_nonce,
    create_message_to_sign,
    verify_signature,
    create_access_token
)

router = APIRouter(prefix="/auth", tags=["auth"])

# Store nonces for wallet addresses (in a real app, use Redis or similar)
nonce_store = {}


@router.get("/nonce/{wallet_address}")
async def get_auth_nonce(wallet_address: str):
    """
    Generate a nonce for authentication and store it temporarily.
    """
    wallet_address = wallet_address.lower()
    nonce = generate_nonce()
    nonce_store[wallet_address] = nonce
    
    # Create a message that the client needs to sign
    message = create_message_to_sign(wallet_address, nonce)
    
    return {
        "wallet_address": wallet_address,
        "nonce": nonce,
        "message": message
    }


@router.post("/login", response_model=AuthResponse)
async def login(auth_request: AuthRequest, db: Session = Depends(get_db)):
    """
    Verify the signature and create an access token if valid.
    """
    wallet_address = auth_request.wallet_address.lower()
    
    # Check if the nonce exists for this wallet
    stored_nonce = nonce_store.get(wallet_address)
    if not stored_nonce or stored_nonce != auth_request.nonce:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired nonce"
        )
    
    # Create the message that should have been signed
    message = create_message_to_sign(wallet_address, auth_request.nonce)
    
    # Verify the signature
    if not verify_signature(message, auth_request.signature, wallet_address):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid signature"
        )
    
    # Clean up the used nonce
    del nonce_store[wallet_address]
    
    # Create and return a JWT token
    access_token = create_access_token(wallet_address)
    return {"access_token": access_token, "token_type": "bearer"} 