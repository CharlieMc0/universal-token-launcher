"""Deployment routes for token deployment and verification."""

from fastapi import APIRouter, Depends, HTTPException, status, Path
from sqlalchemy.orm import Session
from typing import Dict, Any
import re

from app.models import (
    TokenSchema, TokenVerifySchema, TokenResponse, TokenModel,
    UserTokenResponse, UserTokenInfo, TokenBalanceInfo, TokenAllocation
)
from app.services.deployment import deployment_service
from app.services.verification import verification_service
from app.services.token import token_service
from app.db import get_db
from app.utils.logger import logger
from app.utils.chain_config import (
    get_supported_chains, get_chain_config, get_enabled_chains
)
from app.utils.web3_helper import (
    get_web3, ZC_UNIVERSAL_TOKEN_ABI, UNIVERSAL_TOKEN_ABI
)
from app.config import Config  # Import Config for consistent chain IDs

router = APIRouter(prefix="/api", tags=["deployment"])

# Define ZetaChain IDs for both mainnet and testnet
ZETA_CHAIN_IDS = ["7000", "7001"]  # Mainnet and Testnet


@router.post(
    "/deploy",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    description="Manage Universal Token contracts on multiple chains",
    summary="Start Token Deployment"
)
async def deploy_token(token_data: TokenSchema, db: Session = Depends(get_db)):
    """Initiate Universal Token deployment across selected chains."""
    try:
        logger.info(f"Received deployment request for token '{token_data.token_name}'")
        
        # Prepare token configuration (excluding allocations)
        token_config = {
            "token_name": token_data.token_name,
            "token_symbol": token_data.token_symbol,
            "decimals": token_data.decimals,
            "total_supply": token_data.total_supply,
            # Allocations handled separately below
        }
        
        # Extract allocations
        allocations = [a.model_dump() for a in token_data.allocations] \
                      if token_data.allocations else []

        # Convert string chain identifiers to numeric chain IDs
        numeric_chain_ids = []
        enabled_chains = get_enabled_chains()
        for chain_id in token_data.selected_chains:
            if chain_id.isdigit():
                if chain_id not in enabled_chains:
                     raise ValueError(f"Chain {chain_id} is not enabled or supported.")
                numeric_chain_ids.append(chain_id)
            else:
                # Look up chain ID in config
                found = False
                for cid, config in enabled_chains.items():
                    if config.get("name", "").lower() == chain_id.lower():
                        numeric_chain_ids.append(cid)
                        found = True
                        break
                if not found:
                    raise ValueError(f"Unsupported or disabled chain name: {chain_id}")

        # Ensure ZetaChain (either mainnet or testnet) is included if EVM chains are selected
        # Define both ZetaChain IDs - testnet (7001) and mainnet (7000)
        has_zetachain = any(cid in ZETA_CHAIN_IDS for cid in numeric_chain_ids)
        has_evm_chains = any(cid not in ZETA_CHAIN_IDS for cid in numeric_chain_ids)
        
        if has_evm_chains and not has_zetachain:
            raise ValueError(f"ZetaChain (7000 or 7001) must be included for cross-chain deployment.")
        
        if not numeric_chain_ids:
            raise ValueError("No valid chains selected")
        
        logger.info(f"Deploying to chains: {numeric_chain_ids}")
        
        # Deploy tokens with updated service call signature
        deployment_result = await deployment_service.deploy_universal_token(
            token_config=token_config,
            selected_chains=numeric_chain_ids,
            final_owner_address=token_data.deployer_address,
            allocations=allocations, # Pass allocations separately
            db=db
        )
        
        # --- Refactored Response Handling ---
        # Get the deployment ID first
        deployment_id = deployment_result.get("deploymentId")
        if not deployment_id:
             # Handle case where deployment failed so early ID wasn't returned
             logger.error("Critical deployment failure: No deployment ID available.")
             # Raise internal server error as something went very wrong
             raise HTTPException(status_code=500, detail="Critical deployment failure, could not retrieve status.")

        # Fetch the final state of the deployment record from the DB
        db_deployment = db.query(TokenModel).filter(TokenModel.id == deployment_id).first()
        if not db_deployment:
             logger.error(f"Could not find deployment record with ID {deployment_id} in DB.")
             raise HTTPException(status_code=404, detail="Deployment record not found after process.")
        
        # Now use db_deployment for status checks and final response construction
        connected_chains_data = db_deployment.connected_chains_json or {}
        final_status_summary = {"zetaChain": {}, "evmChains": {}}
        has_major_errors = False
        is_partial = False
        overall_message = "Deployment completed successfully."
        error_details = []
        # Determine verification status for the response model
        # Since verification runs separately, default to pending or unknown
        # A more sophisticated approach could check individual chain statuses later.
        verification_status = "pending" # Default status after deployment

        # Analyze ZetaChain result (using deployment_result for initial call outcome, db_deployment for final state)
        zc_result = deployment_result.get("zetaChain", {}) # Keep using result for call details
        zc_ownership_status = zc_result.get("ownership_status") 
        # Check DB state for final success
        if db_deployment.zc_contract_address and zc_ownership_status == "transferred": # Check if ownership transfer *call* succeeded
             final_status_summary["zetaChain"] = {"status": "completed", "details": zc_result}
             verification_status = db_deployment.verification_status or "pending" 
        else:
             has_major_errors = True
             # Use details from DB if available, else from call result
             error_message = zc_result.get('message', f"Deployment status: {db_deployment.deployment_status}, Ownership: {zc_ownership_status}")
             error_details.append(f"ZetaChain: Failed - {error_message}")
             final_status_summary["zetaChain"] = {"status": "failed", "details": zc_result}
             # Don't set overall verification to failed just because ZC failed


        # Analyze EVM chain results (using connected_chains_data from DB for final state)
        requested_evm_chains = [cid for cid in numeric_chain_ids if cid not in ZETA_CHAIN_IDS]
        for chain_id in requested_evm_chains:
             chain_db_info = connected_chains_data.get(chain_id, {})
             final_setup_status = chain_db_info.get("setup_status")
             
             if final_setup_status == "completed":
                  final_status_summary["evmChains"][chain_id] = {"status": "completed", "details": chain_db_info}
                  is_partial = True 
             else:
                  has_major_errors = True 
                  error_message = chain_db_info.get("error_message", f"Setup status: {final_setup_status or 'unknown'}")
                  error_details.append(f"Chain {chain_id}: Failed - {error_message}")
                  final_status_summary["evmChains"][chain_id] = {"status": "failed", "details": chain_db_info}
                  if chain_db_info.get("contract_address"):
                        is_partial = True


        # Determine overall message and success status
        if has_major_errors:
            if final_status_summary["zetaChain"].get("status") != "completed" and not is_partial:
                 overall_message = "Deployment failed."
                 success_bool = False 
            else:
                 overall_message = "Deployment partially successful. Check details."
                 success_bool = True 
        else:
            overall_message = "Deployment completed successfully."
            success_bool = True

        # Automatically trigger verification for all successfully deployed contracts
        verification_results = []
        
        # Verify ZetaChain contract if it was deployed successfully
        if db_deployment.zc_contract_address and final_status_summary["zetaChain"].get("status") == "completed":
            logger.info(f"Automatically verifying ZetaChain contract: {db_deployment.zc_contract_address}")
            try:
                zc_verification = await verification_service.verify_contract(
                    contract_address=db_deployment.zc_contract_address,
                    chain_id=db_deployment.testnet and "7001" or "7000",  # Use correct chain ID based on testnet flag
                    contract_type="zetachain",
                    db=db
                )
                verification_results.append({
                    "chain": "ZetaChain",
                    "status": zc_verification.get("status", "unknown"),
                    "message": zc_verification.get("message", "")
                })
                logger.info(f"ZetaChain verification result: {zc_verification.get('status')}")
            except Exception as e:
                logger.error(f"Error triggering verification for ZetaChain contract: {e}")
        
        # Verify EVM contracts if they were deployed successfully
        for chain_id, chain_info in connected_chains_data.items():
            if chain_info.get("contract_address") and chain_info.get("setup_status") == "completed":
                logger.info(f"Automatically verifying EVM contract on chain {chain_id}: {chain_info['contract_address']}")
                try:
                    # Create constructor args for EVM contracts
                    contract_args = {
                        "name": db_deployment.token_name,
                        "symbol": db_deployment.token_symbol,
                        "decimals": db_deployment.decimals,
                        "supply": 0,  # EVM tokens have 0 initial supply
                        "owner": db_deployment.deployer_address
                    }
                    
                    evm_verification = await verification_service.verify_contract(
                        contract_address=chain_info["contract_address"],
                        chain_id=chain_id,
                        contract_type="evm",
                        contract_args=contract_args,
                        db=db
                    )
                    verification_results.append({
                        "chain": chain_id,
                        "status": evm_verification.get("status", "unknown"),
                        "message": evm_verification.get("message", "")
                    })
                    logger.info(f"Chain {chain_id} verification result: {evm_verification.get('status')}")
                except Exception as e:
                    logger.error(f"Error triggering verification for chain {chain_id}: {e}")
        
        # Update verification status from results
        if verification_results:
            # Find the most common status
            statuses = [r["status"] for r in verification_results]
            if "pending" in statuses:
                verification_status = "pending"
            elif "success" in statuses:
                verification_status = "success"
            elif "failed" in statuses:
                verification_status = "failed"
            
            logger.info(f"Automatic verification triggered for {len(verification_results)} contracts. Status: {verification_status}")
        
        # Construct the final response safely using db_deployment where needed
        response_data = {
             "success": success_bool,
             "message": overall_message,
             "deployment_id": db_deployment.id, # Use ID from DB model
             "verification_status": verification_status, # Use the determined default status
             "errors": error_details if error_details else None,
             "deployment": { 
                 "deploymentId": db_deployment.id, # Use ID from DB model
                 "zc_contract_address": db_deployment.zc_contract_address, 
                 "deployer_address": db_deployment.deployer_address, # Final owner
                 "chain_statuses": {
                     chain_id: status_info["status"]
                     for chain_id, status_info in final_status_summary["evmChains"].items()
                 },
                 "zeta_chain_status": final_status_summary["zetaChain"].get("status", "unknown"),
                 "testnet": db_deployment.testnet
             },
         }

        # Log the exact data before attempting to create the response object
        logger.debug(f"Attempting to return TokenResponse with data: {response_data}")

        try:
            # Return the response using the model
            return TokenResponse(**response_data)
        except Exception as response_err:
             # Log the specific error during response creation
             logger.error(f"Error creating TokenResponse object: {response_err}", exc_info=True)
             # Raise a more informative error
             raise HTTPException(status_code=500, detail=f"Failed to format deployment response: {response_err}")


    except ValueError as e:
        logger.error(f"Deployment failed due to validation error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Unexpected error during deployment processing: {e}",
                     exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Deployment failed due to unexpected server error: {str(e)}"
        )


@router.post(
    "/verify",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    description="Verify a deployed contract"
)
async def verify_contract(verify_data: TokenVerifySchema, db: Session = Depends(get_db)):
    """Verify a deployed contract on the specified chain."""
    try:
        logger.info(
            f"Received verification request for contract "
            f"{verify_data.contract_address} on chain {verify_data.chain_id}"
        )
        
        # Determine contract type
        contract_type = verify_data.contract_type.lower()
        is_zetachain = (contract_type == "zetachain")
        
        # For EVM contracts, we need constructor arguments
        contract_args = None
        numeric_chain_id = int(verify_data.chain_id)
        
        if not is_zetachain and verify_data.contract_args:
            # Use provided constructor args if available
            contract_args = verify_data.contract_args
            logger.info(f"Using provided constructor args: {contract_args}")
        elif not is_zetachain:
            # Try to find token in database to get constructor args
            token = None
            try:
                # Look through connected chains to find the token
                tokens = db.query(TokenModel).filter(
                    TokenModel.connected_chains_json.contains({verify_data.chain_id: {}})
                ).all()
                
                for t in tokens:
                    chain_data = t.connected_chains_json.get(verify_data.chain_id, {})
                    if (chain_data.get("contract_address") == 
                            verify_data.contract_address):
                        token = t
                        break
                
                if token:
                    logger.info(f"Found token {token.token_name} for verification")
                    # Create constructor args from token data
                    contract_args = {
                        "name": token.token_name,
                        "symbol": token.token_symbol,
                        "decimals": token.decimals,
                        "supply": 0,  # EVM tokens have 0 initial supply
                        "owner": token.deployer_address
                    }
                    logger.info(f"Generated constructor args: {contract_args}")
            except Exception as e:
                logger.warning(f"Error finding token for constructor args: {e}")
                # Continue without args
        
        # Verify contract
        verification_result = await verification_service.verify_contract(
            contract_address=verify_data.contract_address,
            chain_id=verify_data.chain_id,
            contract_type=contract_type,
            contract_args=contract_args,
            db=db,
            is_token=True
        )
        
        return TokenResponse(
            success=verification_result.get("success", False),
            message=verification_result.get("message", "Verification failed"),
            verification_status=verification_result.get("status")
        )
    
    except Exception as e:
        logger.error(f"Verification failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Verification process failed: {e}"
        )


@router.get(
    "/token/{identifier}",
    response_model=Dict[str, Any],
    status_code=status.HTTP_200_OK,
    description="Get token details by ID or ZetaChain contract address"
)
async def get_token(
    identifier: str = Path(..., description="Token ID or contract address"),
    db: Session = Depends(get_db)
):
    """
    Get token details by ID or ZetaChain contract address.
    
    Args:
        identifier: Either a numeric ID or a contract address with 0x prefix
        db: Database session
        
    Returns:
        Token details including deployment status and contract addresses
    """
    try:
        logger.info(f"Retrieving token with identifier: {identifier}")
        
        # Check if the identifier is a numeric ID
        if identifier.isdigit():
            token_id = int(identifier)
            token_data = await token_service.get_token_by_id(token_id, db)
            if not token_data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Token with ID {token_id} not found"
                )
        # Check if the identifier is an Ethereum address
        elif re.match(r"^0x[a-fA-F0-9]{40}$", identifier):
            token_data = await token_service.get_token_by_contract_address(identifier, db)
            if not token_data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Token with contract address {identifier} not found"
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid identifier. Must be a numeric ID or a valid contract address"
            )
        
        # Return token data
        return {
            "success": True,
            "token": token_data
        }
    
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error(f"Error retrieving token: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving token: {str(e)}"
        )


@router.get("/chains", summary="Get supported chains")
async def get_chains(testnet_only: bool = False, mainnet_only: bool = False):
    """
    Get a list of supported blockchain networks.
    
    Optionally filter by testnet or mainnet.
    """
    chains = get_supported_chains(testnet_only, mainnet_only)
    
    # Format the response to be more frontend-friendly
    formatted_chains = []
    for chain_id, chain_info in chains.items():
        chain_data = {
            "id": chain_id,
            "name": chain_info["name"],
            "currency": chain_info["currency_symbol"],
            "testnet": chain_info["testnet"],
            "isZetaChain": "ZetaChain" in chain_info["name"],
            "enabled": chain_info.get("enabled", True),
            "zrc20GasTokenAddress": chain_info.get("zrc20_gas_token_address", None)
        }
        
        formatted_chains.append(chain_data)
    
    return {
        "success": True,
        "chains": formatted_chains
    } 