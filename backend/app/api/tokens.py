from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
import json

from app.models.database import get_db
from app.models.schemas import (
    TokenCreationRequest, 
    TokenConfigurationResponse,
    DeploymentStatusUpdate,
    DeploymentLogResponse
)
from app.core.auth.web3_auth import get_current_wallet
from app.services.token_service import token_service
from app.services.storage import storage_service
from ..core.database import get_db
from ..models.token_configuration import TokenConfiguration
from ..schemas.token import (
    TokenConfigurationCreate,
    TokenConfigurationUpdate
)

router = APIRouter(prefix="/api/tokens", tags=["tokens"])


@router.post("/", response_model=TokenConfigurationResponse)
async def create_token(
    token_name: str = Form(...),
    token_symbol: str = Form(...),
    decimals: int = Form(...),
    total_supply: str = Form(...),
    selected_chains: str = Form(...),  # JSON array of chain IDs
    distributions_json: str = Form(None),  # Optional JSON array of distributions
    icon: UploadFile = File(None),  # Optional token icon
    # Remove the wallet dependency for testing
    # wallet: str = Depends(get_current_wallet),
    db: Session = Depends(get_db)
):
    """
    Create a new token configuration.
    """
    # Hardcode a test wallet for now
    wallet = "0x4f1684A28E33F42cdf50AB96e29a709e17249E63"
    
    # Parse selected chains
    try:
        selected_chains_list = json.loads(selected_chains)
        if not isinstance(selected_chains_list, list):
            raise ValueError("Selected chains must be a list")
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid selected chains format"
        )
    
    # Parse distributions if provided
    distributions_list = []
    if distributions_json:
        try:
            distributions_list = json.loads(distributions_json)
            if not isinstance(distributions_list, list):
                raise ValueError("Distributions must be a list")
        except json.JSONDecodeError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid distributions format"
            )
    
    # Create token request object
    token_request = TokenCreationRequest(
        token_name=token_name,
        token_symbol=token_symbol,
        decimals=decimals,
        total_supply=total_supply,
        distributions=distributions_list,
        selected_chains=selected_chains_list
    )
    
    # Upload icon if provided
    icon_url = None
    if icon:
        icon_url = await storage_service.upload_icon(icon)
    
    # Create token configuration
    token_config = token_service.create_token_configuration(
        db, wallet, token_request, icon_url
    )
    
    return token_config


@router.get("/{token_id}", response_model=TokenConfigurationResponse)
def get_token(token_id: int, db: Session = Depends(get_db)):
    """Get a token configuration by ID."""
    db_token = db.query(TokenConfiguration).filter(
        TokenConfiguration.id == token_id
    ).first()
    if not db_token:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Token not found"
        )
    return db_token


@router.get("/", response_model=List[TokenConfigurationResponse])
def list_tokens(
    skip: int = 0,
    limit: int = 10,
    db: Session = Depends(get_db)
):
    """List all token configurations with pagination."""
    tokens = db.query(TokenConfiguration).offset(skip).limit(limit).all()
    return tokens


@router.patch("/{token_id}", response_model=TokenConfigurationResponse)
def update_token(
    token_id: int,
    token: TokenConfigurationUpdate,
    db: Session = Depends(get_db)
):
    """Update a token configuration."""
    db_token = db.query(TokenConfiguration).filter(
        TokenConfiguration.id == token_id
    ).first()
    if not db_token:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Token not found"
        )
    
    # Update only provided fields
    token_data = token.model_dump(exclude_unset=True)
    for field, value in token_data.items():
        setattr(db_token, field, value)
    
    db.commit()
    db.refresh(db_token)
    return db_token


@router.delete("/{token_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_token(token_id: int, db: Session = Depends(get_db)):
    """Delete a token configuration."""
    db_token = db.query(TokenConfiguration).filter(
        TokenConfiguration.id == token_id
    ).first()
    if not db_token:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Token not found"
        )
    
    db.delete(db_token)
    db.commit()
    return None


@router.post("/{token_id}/deploy", response_model=TokenConfigurationResponse)
async def deploy_token(
    token_id: int,
    deployment_update: DeploymentStatusUpdate,
    # Remove wallet dependency for testing
    # wallet: str = Depends(get_current_wallet),
    db: Session = Depends(get_db)
):
    """
    Update token deployment status after fee payment.
    """
    # Skip wallet verification for testing
    # token_config = token_service.get_token_configuration(db, token_id, wallet)
    
    # Update deployment status
    return token_service.update_deployment_status(
        db, token_id, deployment_update.fee_paid_tx
    )


@router.get("/{token_id}/deployments", response_model=List[DeploymentLogResponse])
async def get_token_deployments(
    token_id: int,
    # Remove wallet dependency for testing
    # wallet: str = Depends(get_current_wallet),
    db: Session = Depends(get_db)
):
    """
    Get deployment logs for a token.
    """
    # Skip wallet verification for testing
    # token_config = token_service.get_token_configuration(db, token_id, wallet)
    
    # Get deployment logs
    return token_service.get_token_deployments(db, token_id) 