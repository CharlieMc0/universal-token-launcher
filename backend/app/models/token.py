from sqlalchemy import Column, Integer, String, Numeric, DateTime, ForeignKey, JSON, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.models.database import Base


class TokenConfiguration(Base):
    """Token configuration model for storing token details and deployment status."""
    __tablename__ = "token_configurations"

    id = Column(Integer, primary_key=True, index=True)
    creator_wallet = Column(String, nullable=False, index=True)
    token_name = Column(String, nullable=False)
    token_symbol = Column(String, nullable=False)
    icon_url = Column(String)
    decimals = Column(Integer, nullable=False)
    total_supply = Column(Numeric, nullable=False)
    csv_data = Column(JSON)
    fee_paid_tx = Column(String)
    deployment_status = Column(String, default="pending")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    distributions = relationship("TokenDistribution", back_populates="token_config", cascade="all, delete-orphan")
    deployment_logs = relationship("DeploymentLog", back_populates="token_config", cascade="all, delete-orphan")


class TokenDistribution(Base):
    """Token distribution model for storing individual CSV entries for token distributions."""
    __tablename__ = "token_distributions"

    id = Column(Integer, primary_key=True, index=True)
    token_config_id = Column(Integer, ForeignKey("token_configurations.id", ondelete="CASCADE"), nullable=False)
    recipient_address = Column(String, nullable=False)
    chain_id = Column(String, nullable=False)
    token_amount = Column(Numeric, nullable=False)
    status = Column(String, default="pending")
    transaction_hash = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    token_config = relationship("TokenConfiguration", back_populates="distributions")


class DeploymentLog(Base):
    """Deployment log model for storing deployment status on each chain."""
    __tablename__ = "deployment_logs"

    id = Column(Integer, primary_key=True, index=True)
    token_config_id = Column(Integer, ForeignKey("token_configurations.id", ondelete="CASCADE"), nullable=False)
    chain_name = Column(String, nullable=False)
    chain_id = Column(String, nullable=False)
    contract_address = Column(String)
    status = Column(String, default="pending")
    error_message = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    token_config = relationship("TokenConfiguration", back_populates="deployment_logs")


class TransferTransaction(Base):
    """Transfer transaction model for recording all token transfer actions."""
    __tablename__ = "transfer_transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_wallet = Column(String, nullable=False, index=True)
    token_config_id = Column(Integer, ForeignKey("token_configurations.id"), nullable=False)
    source_chain = Column(String, nullable=False)
    destination_chain = Column(String, nullable=False)
    token_amount = Column(Numeric, nullable=False)
    transaction_hash = Column(String)
    status = Column(String, default="pending")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    token_config = relationship("TokenConfiguration") 