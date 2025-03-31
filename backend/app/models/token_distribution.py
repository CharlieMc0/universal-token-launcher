from decimal import Decimal
from typing import Optional
from sqlalchemy import String, Numeric, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base
from .token_configuration import TokenConfiguration


class TokenDistribution(Base):
    """Model for tracking token distributions to recipients"""
    
    __tablename__ = "token_distributions"

    # Distribution details
    token_config_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("token_configurations.id", ondelete="CASCADE"),
        nullable=False
    )
    recipient_address: Mapped[str] = mapped_column(String, nullable=False)
    chain_id: Mapped[str] = mapped_column(String, nullable=False)
    token_amount: Mapped[Decimal] = mapped_column(Numeric, nullable=False)
    status: Mapped[str] = mapped_column(
        String,
        nullable=True,
        server_default="pending"
    )
    transaction_hash: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    # Relationship
    token_config: Mapped[TokenConfiguration] = relationship(
        "TokenConfiguration",
        back_populates="distributions"
    ) 