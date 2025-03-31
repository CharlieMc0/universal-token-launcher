from typing import Optional, List
from decimal import Decimal
from datetime import datetime
from pydantic import BaseModel, Field


class TokenConfigurationBase(BaseModel):
    """Base schema for token configuration"""
    token_name: str = Field(..., description="Name of the token")
    token_symbol: str = Field(..., description="Symbol of the token")
    decimals: int = Field(..., ge=0, le=18, description="Number of decimal places")
    total_supply: Decimal = Field(..., gt=0, description="Total supply of tokens")
    icon_url: Optional[str] = Field(None, description="URL of the token icon")


class TokenConfigurationCreate(TokenConfigurationBase):
    """Schema for creating a token configuration"""
    creator_wallet: str = Field(..., description="Wallet address of token creator")
    csv_data: Optional[dict] = Field(None, description="Token distribution data in JSON format")


class TokenConfigurationUpdate(BaseModel):
    """Schema for updating a token configuration"""
    deployment_status: Optional[str] = Field(None, description="Status of token deployment")
    fee_paid_tx: Optional[str] = Field(None, description="Transaction hash of fee payment")


class TokenConfigurationResponse(TokenConfigurationBase):
    """Schema for token configuration response"""
    id: int
    creator_wallet: str
    deployment_status: Optional[str] = "pending"
    fee_paid_tx: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True 