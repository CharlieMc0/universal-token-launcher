from decimal import Decimal
from typing import Optional
from sqlalchemy import String, Numeric, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base
from .token_configuration import TokenConfiguration


class TransferTransaction(Base):
    """Model for tracking cross-chain token transfers"""
    
    __tablename__ = "transfer_transactions"

    # User and token information
    user_wallet: Mapped[str] = mapped_column(String, nullable=False, index=True)
    token_config_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("token_configurations.id"),
        nullable=False
    )

    # Transfer details
    source_chain: Mapped[str] = mapped_column(String, nullable=False)
    destination_chain: Mapped[str] = mapped_column(String, nullable=False)
    token_amount: Mapped[Decimal] = mapped_column(Numeric, nullable=False)
    transaction_hash: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    status: Mapped[str] = mapped_column(
        String,
        nullable=True,
        server_default="pending"
    )

    # Relationship
    token_config: Mapped[TokenConfiguration] = relationship(
        "TokenConfiguration",
        back_populates="transfer_transactions"
    ) 