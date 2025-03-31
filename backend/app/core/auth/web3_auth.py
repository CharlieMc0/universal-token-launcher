import secrets
from datetime import datetime, timedelta
from typing import Optional

from jose import JWTError, jwt
from eth_account.messages import encode_defunct
from web3 import Web3
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.core.config import settings

# Security scheme for accessing protected endpoints
security = HTTPBearer()

# Web3 instance
w3 = Web3()


def generate_nonce() -> str:
    """
    Generate a random nonce for signing
    """
    return secrets.token_hex(32)


def create_message_to_sign(wallet_address: str, nonce: str) -> str:
    """
    Create a message for the user to sign that includes their wallet address and a nonce
    """
    return f"Sign this message to authenticate with Universal Token Launcher: {nonce}"


def verify_signature(message: str, signature: str, wallet_address: str) -> bool:
    """
    Verify that the signature was created by the wallet_address
    """
    try:
        message_hash = encode_defunct(text=message)
        recovered_address = w3.eth.account.recover_message(message_hash, signature=signature)
        return recovered_address.lower() == wallet_address.lower()
    except Exception:
        return False


def create_access_token(wallet_address: str) -> str:
    """
    Create a JWT access token that includes the wallet address
    """
    expire = datetime.utcnow() + timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode = {"sub": wallet_address, "exp": expire}
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt


def get_current_wallet(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    """
    Validate the JWT token and return the wallet address
    """
    try:
        token = credentials.credentials
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        wallet_address: str = payload.get("sub")
        
        if wallet_address is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
        return wallet_address
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        ) 