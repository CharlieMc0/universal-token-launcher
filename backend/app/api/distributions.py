from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..core.database import get_db
from ..models.token_distribution import TokenDistribution
from ..schemas.distribution import (
    TokenDistributionCreate,
    TokenDistributionUpdate,
    TokenDistributionResponse
)

router = APIRouter(prefix="/api/v1/distributions", tags=["distributions"])


@router.post("/", response_model=TokenDistributionResponse)
def create_distribution(
    distribution: TokenDistributionCreate,
    db: Session = Depends(get_db)
):
    """Create a new token distribution."""
    db_distribution = TokenDistribution(**distribution.model_dump())
    db.add(db_distribution)
    db.commit()
    db.refresh(db_distribution)
    return db_distribution


@router.get("/{distribution_id}", response_model=TokenDistributionResponse)
def get_distribution(distribution_id: int, db: Session = Depends(get_db)):
    """Get a token distribution by ID."""
    db_distribution = db.query(TokenDistribution).filter(
        TokenDistribution.id == distribution_id
    ).first()
    if not db_distribution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Distribution not found"
        )
    return db_distribution


@router.get("/by-token/{token_id}", response_model=List[TokenDistributionResponse])
def list_distributions_by_token(
    token_id: int,
    skip: int = 0,
    limit: int = 10,
    db: Session = Depends(get_db)
):
    """List all distributions for a specific token."""
    distributions = db.query(TokenDistribution).filter(
        TokenDistribution.token_config_id == token_id
    ).offset(skip).limit(limit).all()
    return distributions


@router.patch("/{distribution_id}", response_model=TokenDistributionResponse)
def update_distribution(
    distribution_id: int,
    distribution: TokenDistributionUpdate,
    db: Session = Depends(get_db)
):
    """Update a token distribution."""
    db_distribution = db.query(TokenDistribution).filter(
        TokenDistribution.id == distribution_id
    ).first()
    if not db_distribution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Distribution not found"
        )
    
    # Update only provided fields
    distribution_data = distribution.model_dump(exclude_unset=True)
    for field, value in distribution_data.items():
        setattr(db_distribution, field, value)
    
    db.commit()
    db.refresh(db_distribution)
    return db_distribution 