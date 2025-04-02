"""Deployment routes for token deployment and verification."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Dict, Any, List

from app.models import TokenSchema, TokenVerifySchema, TokenResponse
from app.services.deployment import deployment_service
from app.services.verification import verification_service
from app.db import get_db
from app.utils.logger import logger
from app.config import Config
from app.utils.chain_config import get_supported_chains

router = APIRouter(prefix="/api", tags=["deployment"])


@router.post(
    "/deploy",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    description="Deploy Universal Token contracts on multiple chains"
)
async def deploy_token(token_data: TokenSchema, db: Session = Depends(get_db)):
    """Deploy Universal Token contracts on multiple chains."""
    try:
        logger.info(f"Received deployment request for token '{token_data.token_name}'")
        
        # Prepare token configuration
        token_config = {
            "token_name": token_data.token_name,
            "token_symbol": token_data.token_symbol,
            "decimals": token_data.decimals,
            "total_supply": token_data.total_supply,
            "allocations": [a.model_dump() for a in token_data.allocations] 
                          if token_data.allocations else []
        }
        
        # Convert string chain identifiers to numeric chain IDs
        numeric_chain_ids = []
        for chain_id in token_data.selected_chains:
            # Check if the chain_id is already numeric
            if chain_id.isdigit():
                numeric_chain_ids.append(chain_id)
            else:
                # Look up chain ID in config
                chain_config = Config.CHAINS.get(chain_id)
                if chain_config:
                    numeric_chain_ids.append(str(chain_config["chain_id"]))
                else:
                    raise ValueError(f"Unsupported chain: {chain_id}")
        
        if not numeric_chain_ids:
            raise ValueError("No valid chains selected")
        
        logger.info(f"Deploying to chains: {numeric_chain_ids}")
        
        # Deploy tokens
        deployment_result = await deployment_service.deploy_universal_token(
            token_config,
            numeric_chain_ids,
            token_data.deployer_address,
            db
        )
        
        # Check for deployment errors
        has_errors = False
        error_details = []
        
        # Check for ZetaChain errors
        if (deployment_result.get("zetaChain") and 
                deployment_result["zetaChain"].get("error")):
            has_errors = True
            error_details.append(
                f"ZetaChain: {deployment_result['zetaChain'].get('message', 'Unknown error')}"
            )
        
        # Check for EVM chain errors
        for chain_id, chain_result in deployment_result.get("evmChains", {}).items():
            if chain_result.get("error"):
                has_errors = True
                error_details.append(
                    f"Chain {chain_id}: {chain_result.get('message', 'Unknown error')}"
                )
        
        # Return appropriate response
        if has_errors:
            # Partial success - some deployments succeeded but others failed
            return TokenResponse(
                success=True,
                message="Deployment partially successful",
                detail="Some chains were deployed successfully, but others encountered errors",
                errors=error_details,
                deployment=deployment_result,
                verification_status="pending",
                deployment_id=deployment_result.get("deploymentId")
            )
        else:
            # Complete success
            return TokenResponse(
                success=True,
                message="Deployment successful",
                deployment=deployment_result,
                verification_status="pending",
                deployment_id=deployment_result.get("deploymentId")
            )
    
    except ValueError as e:
        logger.error(f"Deployment failed due to validation error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Deployment failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Deployment failed: {str(e)}"
        )


@router.post(
    "/verify",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    description="Verify a deployed contract"
)
async def verify_contract(verify_data: TokenVerifySchema):
    """Verify a deployed contract on the specified chain."""
    try:
        logger.info(
            f"Received verification request for contract "
            f"{verify_data.contract_address} on chain {verify_data.chain_id}"
        )
        
        # Determine contract name based on type
        contract_type = verify_data.contract_type.lower()
        
        # Verify contract
        verification_result = await verification_service.verify_contract(
            verify_data.contract_address,
            verify_data.chain_id,
            contract_type
        )
        
        return TokenResponse(
            success=verification_result.get("success", False),
            message=verification_result.get("message", "Verification failed"),
            detail=f"Contract verification {verification_result.get('status', 'unknown')}",
            verification_status=verification_result.get("status")
        )
    
    except Exception as e:
        logger.error(f"Verification failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Verification failed: {str(e)}"
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
        formatted_chains.append({
            "id": chain_id,
            "name": chain_info["name"],
            "currency": chain_info["currency_symbol"],
            "testnet": chain_info["testnet"],
            "isZetaChain": "ZetaChain" in chain_info["name"],
            "enabled": chain_info.get("enabled", True)
        })
    
    return {
        "success": True,
        "chains": formatted_chains
    } 