"""User routes for retrieving user information."""

from fastapi import APIRouter, Depends, HTTPException, status, Path
from sqlalchemy.orm import Session
import re

from app.models import (
    UserTokenResponse, UserTokenInfo, TokenBalanceInfo, TokenModel
)
from app.services.blockscout import blockscout_service
from app.services.token import token_service
from app.db import get_db
from app.utils.logger import logger
from app.utils.chain_config import get_chain_config

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get(
    "/{address}",
    response_model=UserTokenResponse,
    status_code=status.HTTP_200_OK,
    description="Get tokens for a specific wallet address"
)
async def get_user_tokens(
    address: str = Path(..., description="User wallet address"),
    db: Session = Depends(get_db)
):
    """
    Get tokens for a specific wallet address.
    
    Args:
        address: Wallet address to lookup
        db: Database session
        
    Returns:
        Information about tokens owned by the address
    """
    try:
        # Validate address format
        if not re.match(r"^0x[a-fA-F0-9]{40}$", address):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid Ethereum address format"
            )
            
        logger.info(f"Retrieving tokens for address: {address}")
        
        # Get the user's tokens from ZetaChain via Blockscout API
        zetachain_tokens = await blockscout_service.get_user_tokens(address)
        
        # Get all our deployed tokens from database
        db_tokens = db.query(TokenModel).all()
        
        # Convert to a dictionary by contract address for easier lookup
        our_token_addresses = {}
        for token in db_tokens:
            if token.zc_contract_address:
                our_token_addresses[token.zc_contract_address.lower()] = token
        
        # Initialize response data
        user_tokens = []
        
        # Set to track tokens we've already added to avoid duplicates
        processed_token_ids = set()
        
        # Process each token the user has
        for token_data in zetachain_tokens:
            # Extract token details
            token_obj = token_data.get("token", {})
            contract_address = token_obj.get("address", "").lower()
            
            # Check if this is one of our deployed tokens
            if contract_address in our_token_addresses:
                db_token = our_token_addresses[contract_address]
                
                # Skip if we've already processed this token
                if db_token.id in processed_token_ids:
                    continue
                    
                processed_token_ids.add(db_token.id)
                
                # Get complete token data with chain information
                token_info = await token_service.get_token_by_id(
                    db_token.id, db
                )
                
                if not token_info:
                    continue
                
                # Initialize balances list
                balances = []
                
                # Get ZetaChain balance
                balance = token_data.get("value", "0")
                zeta_chain_id = "7001"  # ZetaChain testnet
                
                zeta_chain_config = get_chain_config(int(zeta_chain_id))
                
                # Add ZetaChain balance
                balances.append(TokenBalanceInfo(
                    chain_id=zeta_chain_id,
                    chain_name=zeta_chain_config.get("name", "ZetaChain"),
                    balance=balance,
                    contract_address=contract_address,
                    explorer_url=zeta_chain_config.get("explorer_url"),
                    blockscout_url=zeta_chain_config.get("blockscout_url")
                ))
                
                # Add connected chains (would require checking balances on other chains)
                # For now, we'll just include the chain info
                connected_chains = token_info.get("connected_chains_json", {})
                for chain_id, chain_data in connected_chains.items():
                    chain_contract = chain_data.get("contract_address")
                    if chain_contract:
                        chain_config = get_chain_config(int(chain_id))
                        if chain_config:
                            # In a full implementation, we would query the balance
                            # on each chain. For now, we'll set it to 0
                            balances.append(TokenBalanceInfo(
                                chain_id=chain_id,
                                chain_name=chain_config.get(
                                    "name", f"Chain {chain_id}"
                                ),
                                balance="0",  # Default to 0 for now
                                contract_address=chain_contract,
                                explorer_url=chain_config.get("explorer_url"),
                                blockscout_url=chain_config.get("blockscout_url")
                            ))
                
                # Create token info object
                user_token = UserTokenInfo(
                    token_name=db_token.token_name,
                    token_symbol=db_token.token_symbol,
                    decimals=db_token.decimals,
                    is_deployer=(
                        db_token.deployer_address.lower() == address.lower()
                    ),
                    zc_contract_address=db_token.zc_contract_address,
                    created_at=token_info.get("created_at"),
                    balances=balances
                )
                
                user_tokens.append(user_token)
        
        # Find tokens where the user is the deployer but may not have a balance
        deployer_filter = TokenModel.deployer_address.ilike(address.lower())
        deployed_tokens = db.query(TokenModel).filter(deployer_filter).all()
        
        # Add tokens where the user is the deployer but not already processed
        for token in deployed_tokens:
            if token.id in processed_token_ids:
                continue
                
            processed_token_ids.add(token.id)
            
            # Get enhanced token data
            token_info = await token_service.get_token_by_id(token.id, db)
            
            if not token_info:
                continue
                
            # Initialize balances list
            balances = []
            
            # Add ZetaChain with 0 balance since we didn't find it in BlockScout
            zeta_chain_id = "7001"  # ZetaChain testnet
            zeta_chain_config = get_chain_config(int(zeta_chain_id))
            
            if token.zc_contract_address:
                balances.append(TokenBalanceInfo(
                    chain_id=zeta_chain_id,
                    chain_name=zeta_chain_config.get("name", "ZetaChain"),
                    balance="0",  # No balance found via BlockScout
                    contract_address=token.zc_contract_address,
                    explorer_url=zeta_chain_config.get("explorer_url"),
                    blockscout_url=zeta_chain_config.get("blockscout_url")
                ))
            
            # Add connected chains
            connected_chains = token_info.get("connected_chains_json", {})
            for chain_id, chain_data in connected_chains.items():
                chain_contract = chain_data.get("contract_address")
                if chain_contract:
                    chain_config = get_chain_config(int(chain_id))
                    if chain_config:
                        balances.append(TokenBalanceInfo(
                            chain_id=chain_id,
                            chain_name=chain_config.get(
                                "name", f"Chain {chain_id}"
                            ),
                            balance="0",  # Default to 0
                            contract_address=chain_contract,
                            explorer_url=chain_config.get("explorer_url"),
                            blockscout_url=chain_config.get("blockscout_url")
                        ))
            
            # Create token info object
            user_token = UserTokenInfo(
                token_name=token.token_name,
                token_symbol=token.token_symbol,
                decimals=token.decimals,
                is_deployer=True,  # Definitely the deployer
                zc_contract_address=token.zc_contract_address,
                created_at=token_info.get("created_at"),
                balances=balances
            )
            
            user_tokens.append(user_token)
        
        # Create response
        return UserTokenResponse(
            success=True,
            message="User tokens retrieved successfully",
            wallet_address=address,
            tokens=user_tokens
        )
    
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error(f"Error retrieving user tokens: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving user tokens: {str(e)}"
        ) 