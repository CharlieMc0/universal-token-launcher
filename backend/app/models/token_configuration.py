from decimal import Decimal
from typing import List, Optional
from sqlalchemy import String, Numeric, Integer, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base


class TokenConfiguration(Base):
    """Model for storing token configuration data"""
    
    __tablename__ = "token_configurations"

    # Basic token information
    creator_wallet: Mapped[str] = mapped_column(String, nullable=False, index=True)
    token_name: Mapped[str] = mapped_column(String, nullable=False)
    token_symbol: Mapped[str] = mapped_column(String, nullable=False)
    icon_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    decimals: Mapped[int] = mapped_column(Integer, nullable=False)
    total_supply: Mapped[Decimal] = mapped_column(Numeric, nullable=False)
    
    # Distribution and deployment data
    csv_data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    fee_paid_tx: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    deployment_status: Mapped[str] = mapped_column(
        String,
        nullable=True,
        server_default="pending"
    )

    # Relationships
    distributions: Mapped[List["TokenDistribution"]] = relationship(
        "TokenDistribution",
        back_populates="token_config",
        cascade="all, delete-orphan"
    )
    deployment_logs: Mapped[List["DeploymentLog"]] = relationship(
        "DeploymentLog",
        back_populates="token_config",
        cascade="all, delete-orphan"
    )
    transfer_transactions: Mapped[List["TransferTransaction"]] = relationship(
        "TransferTransaction",
        back_populates="token_config",
        cascade="all, delete"
    ) 