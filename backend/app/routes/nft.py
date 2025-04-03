"""API routes for NFT collections."""

from fastapi import APIRouter, Depends, HTTPException, Path, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.db import get_db
from app.models.nft import (
    NFTCollectionModel, 
    NFTCollectionSchema, 
    NFTCollectionResponse,
    NFTVerifySchema
)
from app.services.nft_deployment import NFTDeploymentService
from app.services.verification import VerificationService
from app.utils.logger import logger
from app.utils.chain_config import get_chain_config, get_enabled_chains

# Create router
router = APIRouter(prefix="/api/nft", tags=["nft"])

# Services
nft_service = NFTDeploymentService()
verification_service = VerificationService()


@router.post("/deploy", response_model=NFTCollectionResponse)
async def deploy_nft_collection(
    collection: NFTCollectionSchema,
    db: Session = Depends(get_db)
):
    """
    Deploy a new NFT collection across multiple chains.
    
    This endpoint handles universal NFT collection deployment to ZetaChain and other EVM chains.
    """
    try:
        # Validate chain IDs
        all_chains = get_enabled_chains()
        supported_chains = set(str(chain_id) for chain_id in all_chains.keys())
        
        for chain_id in collection.selected_chains:
            if chain_id not in supported_chains:
                return NFTCollectionResponse(
                    success=False,
                    message=f"Chain ID '{chain_id}' is not supported",
                    errors=[f"Unsupported chain ID: {chain_id}"]
                )
        
        # Ensure ZetaChain is included
        if "7001" not in collection.selected_chains and "zeta_testnet" not in collection.selected_chains:
            return NFTCollectionResponse(
                success=False,
                message="ZetaChain (ID: 7001) must be included in selected chains",
                errors=["ZetaChain is required for cross-chain functionality"]
            )
        
        # Deploy collection
        deployment_result = await nft_service.deploy_universal_nft(
            collection_config={
                "collection_name": collection.collection_name,
                "collection_symbol": collection.collection_symbol,
                "base_uri": collection.base_uri,
                "max_supply": collection.max_supply
            },
            selected_chains=collection.selected_chains,
            deployer_address=collection.deployer_address,
            db=db
        )
        
        if "error" in deployment_result and deployment_result["error"]:
            return NFTCollectionResponse(
                success=False,
                message=deployment_result.get("message", "Deployment failed"),
                errors=[deployment_result.get("message", "Unknown error")]
            )
        
        # Return successful response
        return NFTCollectionResponse(
            success=True,
            message="NFT collection deployment started",
            deployment_id=deployment_result["deploymentId"],
            deployment={
                "status": deployment_result.get("status", "in_progress"),
                "deploymentId": deployment_result["deploymentId"],
                "details": deployment_result.get("result", {})
            }
        )
        
    except Exception as e:
        logger.error(f"NFT collection deployment error: {str(e)}")
        return NFTCollectionResponse(
            success=False,
            message="Internal server error during NFT collection deployment",
            errors=[str(e)]
        )


@router.get("/collection/{identifier}")
async def get_nft_collection(
    identifier: str = Path(..., description="Collection ID or contract address"),
    db: Session = Depends(get_db)
):
    """
    Get NFT collection details by ID or contract address.
    
    This endpoint retrieves details about an NFT collection, including deployment status
    and contract addresses across chains.
    """
    try:
        # Check if identifier is numeric (ID) or an address
        collection = None
        if identifier.isdigit():
            collection = db.query(NFTCollectionModel).filter(
                NFTCollectionModel.id == int(identifier)
            ).first()
        else:
            # Try to find by ZetaChain address or any connected chain
            collection = db.query(NFTCollectionModel).filter(
                NFTCollectionModel.zc_contract_address == identifier
            ).first()
            
            if not collection:
                # Search in connected chains
                collections = db.query(NFTCollectionModel).all()
                for coll in collections:
                    for chain_id, chain_data in coll.connected_chains_json.items():
                        if chain_data.get("contract_address") == identifier:
                            collection = coll
                            break
                    if collection:
                        break
        
        if not collection:
            return {
                "success": False,
                "message": f"NFT collection with identifier '{identifier}' not found"
            }
        
        # Format and return the collection data
        collection_data = collection.to_dict()
        
        # Add ZetaChain information in a more structured way
        if collection.zc_contract_address:
            zeta_chain_info = {
                "chain_id": "7001",
                "contract_address": collection.zc_contract_address,
                "status": "completed",
            }
            
            # Add explorer URLs
            chain_config = get_chain_config(7001)
            if chain_config:
                zeta_chain_info["explorer_url"] = chain_config.get("explorer_url")
                zeta_chain_info["blockscout_url"] = chain_config.get("blockscout_url")
                
                # Add contract URL based on explorer
                if chain_config.get("blockscout_url"):
                    zeta_chain_info["contract_url"] = (
                        f"{chain_config['blockscout_url']}/"
                        f"address/{collection.zc_contract_address}"
                    )
                elif chain_config.get("explorer_url"):
                    zeta_chain_info["contract_url"] = (
                        f"{chain_config['explorer_url']}/address/"
                        f"{collection.zc_contract_address}"
                    )
                
                # Add verification status
                zeta_chain_info["verification_status"] = "unknown"
            
            collection_data["zeta_chain_info"] = zeta_chain_info
        
        # Add chain information to connected chains
        for chain_id, chain_data in collection_data["connected_chains_json"].items():
            chain_config = get_chain_config(int(chain_id))
            if chain_config:
                chain_data["chain_id"] = chain_id
                chain_data["chain_name"] = chain_config.get("name", "Unknown Chain")
                chain_data["explorer_url"] = chain_config.get("explorer_url")
                chain_data["blockscout_url"] = chain_config.get("blockscout_url")
                
                # Add contract URL based on explorer
                if "contract_address" in chain_data:
                    contract_address = chain_data["contract_address"]
                    if chain_config.get("blockscout_url"):
                        chain_data["contract_url"] = (
                            f"{chain_config['blockscout_url']}/address/{contract_address}"
                        )
                    elif chain_config.get("explorer_url"):
                        chain_data["contract_url"] = (
                            f"{chain_config['explorer_url']}/address/{contract_address}"
                        )
        
        return {
            "success": True,
            "collection": collection_data
        }
        
    except Exception as e:
        logger.error(f"Error retrieving NFT collection: {str(e)}")
        return {
            "success": False,
            "message": "Internal server error while retrieving NFT collection",
            "detail": str(e)
        }


@router.post("/verify", response_model=NFTCollectionResponse)
async def verify_nft_contract(
    verification: NFTVerifySchema,
    db: Session = Depends(get_db)
):
    """
    Verify an NFT collection contract on the blockchain explorer.
    
    This endpoint initiates the verification process for a deployed NFT collection contract.
    """
    try:
        # Find collections with the given contract address
        collection = None
        
        # Check if it's a ZetaChain contract
        if verification.contract_type == "zetachain":
            collection = db.query(NFTCollectionModel).filter(
                NFTCollectionModel.zc_contract_address == verification.contract_address
            ).first()
        else:
            # Search in connected chains
            collections = db.query(NFTCollectionModel).all()
            for coll in collections:
                chain_data = coll.connected_chains_json.get(verification.chain_id)
                if chain_data and chain_data.get("contract_address") == verification.contract_address:
                    collection = coll
                    break
        
        if not collection:
            return NFTCollectionResponse(
                success=False,
                message="NFT collection contract not found",
                errors=[f"No contract found with address {verification.contract_address} on chain {verification.chain_id}"]
            )
        
        # Verify the contract
        verify_result = await verification_service.verify_contract(
            contract_address=verification.contract_address,
            chain_id=verification.chain_id,
            contract_type=verification.contract_type,
            contract_args={
                "name": collection.collection_name,
                "symbol": collection.collection_symbol,
                "baseURI": collection.base_uri,
                "maxSupply": collection.max_supply
            },
            is_token=False,  # Indicate this is an NFT contract
            db=db
        )
        
        if not verify_result["success"]:
            return NFTCollectionResponse(
                success=False,
                message="Contract verification failed",
                errors=[verify_result.get("message", "Unknown error")],
                verification_status="failed"
            )
        
        return NFTCollectionResponse(
            success=True,
            message="Contract verification initiated",
            verification_status=verify_result.get("status", "pending")
        )
        
    except Exception as e:
        logger.error(f"NFT contract verification error: {str(e)}")
        return NFTCollectionResponse(
            success=False,
            message="Internal server error during contract verification",
            errors=[str(e)],
            verification_status="error"
        ) 