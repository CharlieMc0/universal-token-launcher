from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, field_validator
from datetime import datetime
import re


class AuthRequest(BaseModel):
    wallet_address: str
    signature: str
    nonce: str

    @field_validator('wallet_address')
    def validate_wallet_address(cls, v):
        if not re.match(r'^0x[a-fA-F0-9]{40}$', v):
            raise ValueError('Invalid Ethereum address format')
        return v.lower()


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenDistributionEntry(BaseModel):
    recipient_address: str
    chain_id: str
    token_amount: str

    @field_validator('recipient_address')
    def validate_recipient_address(cls, v):
        if not re.match(r'^0x[a-fA-F0-9]{40}$', v):
            raise ValueError('Invalid Ethereum address format')
        return v.lower()


class TokenCreationRequest(BaseModel):
    token_name: str = Field(..., min_length=1, max_length=64)
    token_symbol: str = Field(..., min_length=1, max_length=8)
    decimals: int = Field(..., ge=0, le=18)
    total_supply: str = Field(...)  # Stored as string to handle large numbers
    distributions: List[TokenDistributionEntry] = []
    selected_chains: List[str] = []

    @field_validator('total_supply')
    def validate_total_supply(cls, v):
        try:
            value = float(v)
            if value <= 0:
                raise ValueError('Total supply must be greater than 0')
        except ValueError:
            raise ValueError('Invalid total supply format')
        return v


class TokenConfigurationResponse(BaseModel):
    id: int
    creator_wallet: str
    token_name: str
    token_symbol: str
    icon_url: Optional[str] = None
    decimals: int
    total_supply: str
    deployment_status: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class DeploymentStatusUpdate(BaseModel):
    fee_paid_tx: str

    @field_validator('fee_paid_tx')
    def validate_tx_hash(cls, v):
        if not re.match(r'^0x[a-fA-F0-9]{64}$', v):
            raise ValueError('Invalid transaction hash format')
        return v


class DeploymentLogResponse(BaseModel):
    id: int
    chain_name: str
    chain_id: str
    contract_address: Optional[str] = None
    status: str
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TransferRequest(BaseModel):
    token_config_id: int
    source_chain: str
    destination_chain: str
    token_amount: str

    @field_validator('token_amount')
    def validate_token_amount(cls, v):
        try:
            value = float(v)
            if value <= 0:
                raise ValueError('Token amount must be greater than 0')
        except ValueError:
            raise ValueError('Invalid token amount format')
        return v


class TransferResponse(BaseModel):
    id: int
    user_wallet: str
    token_config_id: int
    source_chain: str
    destination_chain: str
    token_amount: str
    transaction_hash: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class StatusResponse(BaseModel):
    status: str
    details: Dict[str, Any] = {} 