"""NFT models and schemas."""

import re
from typing import Dict, List, Optional, Any
from sqlalchemy import Column, Integer, String, Text, TIMESTAMP
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from pydantic import BaseModel, Field, field_validator, model_validator

from app.db import Base


# Database Model
class NFTCollectionModel(Base):
    """Model for tracking NFT collection deployment status across multiple chains."""
    
    __tablename__ = "nft_deployments"

    id = Column(Integer, primary_key=True, index=True)
    collection_name = Column(String, nullable=False)
    collection_symbol = Column(String, nullable=False)
    base_uri = Column(String, nullable=False)
    max_supply = Column(Integer, nullable=False)
    zc_contract_address = Column(String, nullable=True)
    deployer_address = Column(String, nullable=False)
    connected_chains_json = Column(JSONB, nullable=False, default={})
    deployment_status = Column(String, nullable=False, default='starting')
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
            "collection_name": self.collection_name,
            "collection_symbol": self.collection_symbol,
            "base_uri": self.base_uri,
            "max_supply": self.max_supply,
            "zc_contract_address": self.zc_contract_address,
            "deployer_address": self.deployer_address,
            "connected_chains_json": self.connected_chains_json,
            "deployment_status": self.deployment_status,
            "error_message": self.error_message,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }


# Pydantic Schemas
class NFTCollectionSchema(BaseModel):
    """Schema for NFT collection creation request."""
    
    collection_name: str = Field(..., description="Name of the collection")
    collection_symbol: str = Field(..., description="Symbol of the collection")
    base_uri: str = Field(..., description="Base URI for token metadata")
    max_supply: int = Field(..., description="Maximum supply of tokens in the collection")
    selected_chains: List[str] = Field(
        ...,
        description="List of chain IDs to deploy on"
    )
    deployer_address: str = Field(
        ...,
        description="Address that will receive ownership"
    )

    @field_validator("deployer_address")
    def validate_deployer_address(cls, v):
        """Validate deployer address format."""
        if not re.match(r"^0x[a-fA-F0-9]{40}$", v):
            raise ValueError("Deployer address must be a valid Ethereum address")
        return v

    @field_validator("base_uri")
    def validate_base_uri(cls, v):
        """Validate base URI format."""
        if not v.endswith('/'):
            v += '/'  # Ensure URI ends with trailing slash
        return v

    @field_validator("max_supply")
    def validate_max_supply(cls, v):
        """Validate max supply is reasonable."""
        if v <= 0:
            raise ValueError("Max supply must be positive")
        if v > 1000000:  # Arbitrary high limit
            raise ValueError("Max supply seems unreasonably high")
        return v

    @model_validator(mode="after")
    def validate_selected_chains(self):
        """Validate that selected chains is a non-empty array."""
        if not self.selected_chains:
            raise ValueError("At least one chain must be selected")
        return self


class NFTVerifySchema(BaseModel):
    """Schema for NFT contract verification request."""
    
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


class NFTCollectionResponse(BaseModel):
    """Schema for NFT collection deployment response."""
    
    success: bool
    message: str
    deployment_id: Optional[int] = None
    detail: Optional[str] = None
    errors: Optional[List[str]] = None
    deployment: Optional[Dict[str, Any]] = None
    verification_status: Optional[str] = None


# Schema for user NFT data
class NFTInfo(BaseModel):
    """Schema for NFT information."""
    
    token_id: int
    chain_id: str
    chain_name: str
    contract_address: str
    explorer_url: Optional[str] = None
    blockscout_url: Optional[str] = None
    metadata_uri: Optional[str] = None

class UserNFTCollection(BaseModel):
    """Schema for NFT collection in user response."""
    
    collection_name: str
    collection_symbol: str
    base_uri: str
    is_deployer: bool
    zc_contract_address: Optional[str] = None
    nfts: List[NFTInfo] = []

class UserNFTResponse(BaseModel):
    """Schema for user NFTs response."""
    
    success: bool
    message: str
    wallet_address: str
    collections: List[UserNFTCollection] = [] 