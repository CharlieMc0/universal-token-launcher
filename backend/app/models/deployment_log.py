from typing import Optional
from sqlalchemy import String, Integer, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base
from .token_configuration import TokenConfiguration


class DeploymentLog(Base):
    """Model for tracking token deployment status across different chains"""
    
    __tablename__ = "deployment_logs"

    # Deployment details
    token_config_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("token_configurations.id", ondelete="CASCADE"),
        nullable=False
    )
    chain_name: Mapped[str] = mapped_column(String, nullable=False)
    chain_id: Mapped[str] = mapped_column(String, nullable=False)
    contract_address: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    status: Mapped[str] = mapped_column(
        String,
        nullable=True,
        server_default="pending"
    )
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationship
    token_config: Mapped[TokenConfiguration] = relationship(
        "TokenConfiguration",
        back_populates="deployment_logs"
    ) 