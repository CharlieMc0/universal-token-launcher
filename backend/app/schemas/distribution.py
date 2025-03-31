from typing import Optional
from decimal import Decimal
from datetime import datetime
from pydantic import BaseModel, Field


class TokenDistributionBase(BaseModel):
    """Base schema for token distribution"""
    recipient_address: str = Field(..., description="Recipient wallet address")
    chain_id: str = Field(..., description="Chain ID for token distribution")
    token_amount: Decimal = Field(..., gt=0, description="Amount of tokens to distribute")


class TokenDistributionCreate(TokenDistributionBase):
    """Schema for creating a token distribution"""
    token_config_id: int = Field(..., description="ID of the token configuration")


class TokenDistributionUpdate(BaseModel):
    """Schema for updating a token distribution"""
    status: Optional[str] = Field(None, description="Status of the distribution")
    transaction_hash: Optional[str] = Field(None, description="Transaction hash")


class TokenDistributionResponse(TokenDistributionBase):
    """Schema for token distribution response"""
    id: int
    token_config_id: int
    status: str = "pending"
    transaction_hash: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True 