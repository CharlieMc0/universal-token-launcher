"""User routes for retrieving user information."""

from fastapi import APIRouter, Depends, HTTPException, status, Path
from sqlalchemy.orm import Session
import re

from app.models import (
    UserTokenResponse, UserTokenInfo, TokenBalanceInfo, TokenModel
)
from app.services.blockscout import blockscout_service
from app.services.token import token_service
from app.services.explorer import explorer_service
from app.db import get_db
from app.utils.logger import logger
from app.utils.chain_config import get_chain_config

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get(
    "/{address}",
    response_model=UserTokenResponse,
    status_code=status.HTTP_200_OK,
    description="Get tokens for a specific wallet address across all chains"
)
async def get_user_tokens(
    address: str = Path(..., description="User wallet address"),
    db: Session = Depends(get_db)
):
    """
    Get tokens for a specific wallet address across all chains.
    
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
        
        # Get the user's tokens from all chains
        all_balances = await explorer_service.get_all_user_balances(address)
        
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
        chain_balances = {}
        
        # First, process tokens from ZetaChain
        zeta_chain_id = "7001"  # ZetaChain testnet
        zetachain_tokens = all_balances.get(zeta_chain_id, [])
        
        # Process each token the user has on ZetaChain
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
                
                # Store token info by token ID and chain ID for easy lookup later
                chain_balances[db_token.id] = {}
                chain_balances[db_token.id][zeta_chain_id] = balance
                
                # Create token info object with initial ZetaChain balance
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
                
                # Add connected chain data
                connected_chains = token_info.get("connected_chains_json", {})
                
                # Process other chains' balances
                for chain_id, chain_data in connected_chains.items():
                    chain_contract = chain_data.get("contract_address")
                    if not chain_contract:
                        continue
                        
                    chain_tokens = all_balances.get(chain_id, [])
                    chain_balance = "0"
                    
                    # Look for this contract in the chain's tokens
                    for chain_token_data in chain_tokens:
                        chain_token_obj = chain_token_data.get("token", {})
                        chain_token_address = chain_token_obj.get("address", "").lower()
                        
                        if chain_token_address.lower() == chain_contract.lower():
                            chain_balance = chain_token_data.get("value", "0")
                            chain_balances[db_token.id][chain_id] = chain_balance
                            break
                    
                    # Add this chain's balance
                    chain_config = get_chain_config(int(chain_id))
                    if chain_config:
                        user_token.balances.append(TokenBalanceInfo(
                            chain_id=chain_id,
                            chain_name=chain_config.get(
                                "name", f"Chain {chain_id}"
                            ),
                            balance=chain_balance,
                            contract_address=chain_contract,
                            explorer_url=chain_config.get("explorer_url"),
                            blockscout_url=chain_config.get("blockscout_url")
                        ))
                
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
            
            # Add ZetaChain balance (check if we found it in all_balances)
            zeta_chain_id = "7001"  # ZetaChain testnet
            zeta_chain_config = get_chain_config(int(zeta_chain_id))
            
            # Default to 0 if no balance found
            zetachain_balance = "0"
            
            if token.zc_contract_address:
                zetachain_tokens = all_balances.get(zeta_chain_id, [])
                
                # Look for this contract in the chain's tokens
                for zetachain_token_data in zetachain_tokens:
                    zetachain_token_obj = zetachain_token_data.get("token", {})
                    zetachain_address = zetachain_token_obj.get("address", "").lower()
                    
                    if token.zc_contract_address.lower() == zetachain_address:
                        zetachain_balance = zetachain_token_data.get("value", "0")
                        break
                
                balances.append(TokenBalanceInfo(
                    chain_id=zeta_chain_id,
                    chain_name=zeta_chain_config.get("name", "ZetaChain"),
                    balance=zetachain_balance,
                    contract_address=token.zc_contract_address,
                    explorer_url=zeta_chain_config.get("explorer_url"),
                    blockscout_url=zeta_chain_config.get("blockscout_url")
                ))
            
            # Add connected chains with actual balances
            connected_chains = token_info.get("connected_chains_json", {})
            for chain_id, chain_data in connected_chains.items():
                chain_contract = chain_data.get("contract_address")
                if chain_contract:
                    chain_config = get_chain_config(int(chain_id))
                    if not chain_config:
                        continue
                        
                    # Check for balance on this chain
                    chain_tokens = all_balances.get(chain_id, [])
                    chain_balance = "0"
                    
                    # Look for this contract in the chain's tokens
                    for chain_token_data in chain_tokens:
                        chain_token_obj = chain_token_data.get("token", {})
                        chain_token_address = chain_token_obj.get("address", "").lower()
                        
                        if chain_token_address.lower() == chain_contract.lower():
                            chain_balance = chain_token_data.get("value", "0")
                            break
                            
                    balances.append(TokenBalanceInfo(
                        chain_id=chain_id,
                        chain_name=chain_config.get(
                            "name", f"Chain {chain_id}"
                        ),
                        balance=chain_balance,
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
            
        # Process Universal tokens that are not in our database
        # Check for tokens with "Universal" in the name or "UT/UTT" symbol
        for chain_id, tokens in all_balances.items():
            chain_config = get_chain_config(int(chain_id))
            if not chain_config:
                continue
                
            for token_data in tokens:
                token_obj = token_data.get("token", {})
                token_address = token_obj.get("address", "").lower()
                token_name = token_obj.get("name", "")
                token_symbol = token_obj.get("symbol", "")
                
                # Skip if already processed via DB tokens or no address
                if not token_address:
                    continue
                    
                # Skip if this token is one of our DB tokens
                if any(token_address == t.zc_contract_address.lower() 
                      for t in user_tokens if t.zc_contract_address):
                    continue
                    
                # If chain is ZetaChain, check if this is in any known token's connected chains
                if chain_id == zeta_chain_id:
                    in_connected_chains = False
                    for ut in user_tokens:
                        token_info = next((t for t in db_tokens if t.token_name == ut.token_name), None)
                        if token_info and token_info.connected_chains_json:
                            for _, cc_data in token_info.connected_chains_json.items():
                                if cc_data.get("contract_address", "").lower() == token_address:
                                    in_connected_chains = True
                                    break
                        if in_connected_chains:
                            break
                    if in_connected_chains:
                        continue
                
                # Check if this might be a universal token not in our DB
                is_universal = (
                    "universal" in token_name.lower() or 
                    token_symbol in ["UT", "UTT", "UTKN"]
                )
                
                if is_universal:
                    # Look for matching token in results
                    matching_token = next(
                        (t for t in user_tokens if t.token_name.lower() == token_name.lower()),
                        None
                    )
                    
                    if matching_token:
                        # Add this chain's balance if not already present
                        if not any(b.chain_id == chain_id for b in matching_token.balances):
                            matching_token.balances.append(TokenBalanceInfo(
                                chain_id=chain_id,
                                chain_name=chain_config.get("name", f"Chain {chain_id}"),
                                balance=token_data.get("value", "0"),
                                contract_address=token_address,
                                explorer_url=chain_config.get("explorer_url"),
                                blockscout_url=chain_config.get("blockscout_url")
                            ))
                    else:
                        # Create a new token entry for this universal token
                        new_token = UserTokenInfo(
                            token_name=token_name,
                            token_symbol=token_symbol,
                            decimals=int(token_obj.get("decimals", 18)),
                            is_deployer=False,  # Unknown, not in our DB
                            zc_contract_address=token_address if chain_id == zeta_chain_id else None,
                            balances=[TokenBalanceInfo(
                                chain_id=chain_id,
                                chain_name=chain_config.get("name", f"Chain {chain_id}"),
                                balance=token_data.get("value", "0"),
                                contract_address=token_address,
                                explorer_url=chain_config.get("explorer_url"),
                                blockscout_url=chain_config.get("blockscout_url")
                            )]
                        )
                        user_tokens.append(new_token)
        
        # Create response
        return UserTokenResponse(
            success=True,
            message="User tokens retrieved successfully across all chains",
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