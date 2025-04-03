"""Token models and schemas."""

import re
from typing import Dict, List, Optional, Any
from sqlalchemy import Column, Integer, String, Text, TIMESTAMP
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from pydantic import BaseModel, Field, field_validator, model_validator

from app.db import Base


# Database Model
class TokenModel(Base):
    """Model for tracking token deployment status across multiple chains."""
    
    __tablename__ = "token_deployments"

    id = Column(Integer, primary_key=True, index=True)
    token_name = Column(String, nullable=False)
    token_symbol = Column(String, nullable=False)
    decimals = Column(Integer, nullable=False, default=18)
    total_supply = Column(String, nullable=False)
    zc_contract_address = Column(String, nullable=True)
    deployer_address = Column(String, nullable=False)
    connected_chains_json = Column(JSONB, nullable=False, default={})
    deployment_status = Column(String, nullable=False, default='starting')
    verification_status = Column(String, nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(
        TIMESTAMP(timezone=True),
        nullable=False,
        server_default=func.now()
    )
    updated_at = Column(
        TIMESTAMP(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now()
    )

    def to_dict(self):
        """Convert model instance to dictionary for API responses."""
        return {
            "id": self.id,
            "token_name": self.token_name,
            "token_symbol": self.token_symbol,
            "decimals": self.decimals,
            "total_supply": self.total_supply,
            "zc_contract_address": self.zc_contract_address,
            "deployer_address": self.deployer_address,
            "connected_chains_json": self.connected_chains_json,
            "deployment_status": self.deployment_status,
            "verification_status": self.verification_status,
            "error_message": self.error_message,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }


# Pydantic Schemas
class TokenAllocation(BaseModel):
    """Schema for token allocation to an address."""
    
    address: str
    amount: str

    @field_validator("address")
    def validate_address(cls, v):
        """Validate that address is in proper Ethereum format."""
        if not re.match(r"^0x[a-fA-F0-9]{40}$", v):
            raise ValueError("Address must be a valid Ethereum address")
        return v

    @field_validator("amount")
    def validate_amount(cls, v):
        """Validate that amount is a positive number."""
        try:
            amount = int(v)
            if amount <= 0:
                raise ValueError("Amount must be positive")
        except ValueError:
            raise ValueError("Amount must be a valid number")
        return v


class TokenSchema(BaseModel):
    """Schema for token creation request."""
    
    token_name: str = Field(..., description="Name of the token")
    token_symbol: str = Field(..., description="Symbol of the token")
    decimals: Optional[int] = Field(18, description="Number of decimals")
    total_supply: Optional[str] = Field(
        "1000000000000000000000",
        description="Total supply in wei (default 1000 tokens)"
    )
    selected_chains: List[str] = Field(
        ...,
        description="List of chain IDs to deploy on"
    )
    deployer_address: str = Field(
        ...,
        description="Address that will receive ownership"
    )
    allocations: Optional[List[TokenAllocation]] = Field(
        None,
        description="List of token allocations"
    )

    @field_validator("deployer_address")
    def validate_deployer_address(cls, v):
        """Validate deployer address format."""
        if not re.match(r"^0x[a-fA-F0-9]{40}$", v):
            raise ValueError("Deployer address must be a valid Ethereum address")
        return v

    @model_validator(mode="after")
    def validate_selected_chains(self):
        """Validate that selected chains is a non-empty array."""
        if not self.selected_chains:
            raise ValueError("At least one chain must be selected")
        return self


class TokenVerifySchema(BaseModel):
    """Schema for contract verification request."""
    
    contract_address: str = Field(
        ...,
        description="Address of the deployed contract"
    )
    chain_id: str = Field(..., description="Chain ID where contract is deployed")
    contract_type: str = Field(
        ...,
        description="Type of contract (zetachain or evm)"
    )

    @field_validator("contract_address")
    def validate_contract_address(cls, v):
        """Validate contract address format."""
        if not re.match(r"^0x[a-fA-F0-9]{40}$", v):
            raise ValueError("Contract address must be a valid Ethereum address")
        return v

    @field_validator("contract_type")
    def validate_contract_type(cls, v):
        """Validate contract type is either zetachain or evm."""
        if v not in ["zetachain", "evm"]:
            raise ValueError("Contract type must be either 'zetachain' or 'evm'")
        return v


class TokenResponse(BaseModel):
    """Schema for token deployment response."""
    
    success: bool
    message: str
    deployment_id: Optional[int] = None
    detail: Optional[str] = None
    errors: Optional[List[str]] = None
    deployment: Optional[Dict[str, Any]] = None
    verification_status: Optional[str] = None

# Schema for user token data
class TokenBalanceInfo(BaseModel):
    """Schema for token balance information."""
    
    chain_id: str
    chain_name: str
    balance: str
    contract_address: str
    explorer_url: Optional[str] = None
    blockscout_url: Optional[str] = None

class UserTokenInfo(BaseModel):
    """Schema for token information in user response."""
    
    token_name: str
    token_symbol: str
    decimals: int
    is_deployer: bool
    zc_contract_address: Optional[str] = None
    created_at: Optional[str] = None
    balances: List[TokenBalanceInfo]

class UserTokenResponse(BaseModel):
    """Schema for user tokens response."""
    
    success: bool
    message: str
    wallet_address: str
    tokens: List[UserTokenInfo] = [] 