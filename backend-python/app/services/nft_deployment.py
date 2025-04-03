"""Deployment service for universal NFT collections."""

from sqlalchemy.orm import Session
from typing import Dict, List, Any

from app.models.nft import NFTCollectionModel
from app.utils.logger import logger
from app.utils.web3_helper import (
    get_web3, 
    get_account, 
    deploy_contract, 
    UNIVERSAL_NFT_ABI, 
    UNIVERSAL_NFT_BYTECODE, 
    ZC_UNIVERSAL_NFT_ABI, 
    ZC_UNIVERSAL_NFT_BYTECODE
)


class NFTDeploymentService:
    """Service for deploying universal NFT collections."""

    async def deploy_universal_nft(
        self,
        collection_config: Dict[str, Any],
        selected_chains: List[str],
        deployer_address: str,
        db: Session
    ) -> Dict[str, Any]:
        """
        Deploy a universal NFT collection across multiple chains.
        
        Args:
            collection_config: Collection configuration information
            selected_chains: List of chain IDs to deploy on
            deployer_address: Address that will receive ownership
            db: Database session
            
        Returns:
            Dict with deployment results
        """
        logger.info(
            f"Deploying collection {collection_config['collection_name']} "
            f"on {len(selected_chains)} chains"
        )
        
        # Create deployment record
        deployment = NFTCollectionModel(
            collection_name=collection_config["collection_name"],
            collection_symbol=collection_config["collection_symbol"],
            base_uri=collection_config["base_uri"],
            max_supply=collection_config["max_supply"],
            deployer_address=deployer_address,
            deployment_status="in_progress",
            connected_chains_json={}
        )
        
        db.add(deployment)
        db.commit()
        db.refresh(deployment)
        
        # Get deployer account
        account = get_account()
        if not account:
            deployment.deployment_status = "failed"
            deployment.error_message = "Failed to create deployer account"
            db.add(deployment)
            db.commit()
            return {
                "deploymentId": deployment.id,
                "error": True,
                "message": "Failed to create deployer account"
            }
        
        # Initialize result structure
        deployment_result = {
            "deploymentId": deployment.id,
            "result": {
                "zetaChain": {},
                "evmChains": {}
            }
        }
        
        # First deploy to ZetaChain (required for cross-chain functionality)
        zeta_chain_id = 7001  # ZetaChain Testnet
        if "7001" in selected_chains or "zeta_testnet" in selected_chains:
            logger.info("Deploying ZetaChain NFT collection...")
            
            # Connect to ZetaChain
            web3 = get_web3(zeta_chain_id)
            if not web3:
                deployment.deployment_status = "failed"
                deployment.error_message = "Failed to connect to ZetaChain"
                db.add(deployment)
                db.commit()
                return {
                    "deploymentId": deployment.id,
                    "error": True,
                    "message": "Failed to connect to ZetaChain"
                }
            
            # Prepare constructor arguments with proper type conversion
            # ZetaChainUniversalNFT(name_, symbol_, baseURI_, maxSupply_, initialOwner)
            constructor_args = [
                str(collection_config["collection_name"]),  # name (string)
                str(collection_config["collection_symbol"]), # symbol (string)
                str(collection_config["base_uri"]),         # baseURI (string)
                int(collection_config["max_supply"]),       # maxSupply (uint256)
                deployer_address                            # initialOwner (address)
            ]
            
            logger.info(f"ZetaChain constructor args: {constructor_args}")
            
            # Deploy the contract
            try:
                zc_result = deploy_contract(
                    web3=web3,
                    account=account,
                    contract_abi=ZC_UNIVERSAL_NFT_ABI,
                    contract_bytecode=ZC_UNIVERSAL_NFT_BYTECODE,
                    constructor_args=constructor_args
                )
                
                # Ensure receipt is properly JSON-serializable 
                if "receipt" in zc_result:
                    # Either remove receipt or convert to a serializable format
                    zc_result.pop("receipt", None)
                
                deployment_result["result"]["zetaChain"] = zc_result
                
                if zc_result["success"]:
                    # Update deployment record - save immediately to avoid loss
                    deployment.zc_contract_address = zc_result["contract_address"]
                    db.add(deployment)
                    db.commit()
                else:
                    error_msg = zc_result.get('message', 'Unknown error')
                    deployment.error_message = f"ZetaChain deployment failed: {error_msg}"
                    db.add(deployment)
                    db.commit()
            except Exception as e:
                logger.error(f"ZetaChain deployment failed: {str(e)}")
                deployment_result["result"]["zetaChain"] = {
                    "success": False,
                    "error": True,
                    "message": str(e)
                }
                deployment.error_message = f"ZetaChain deployment failed: {str(e)}"
                db.add(deployment)
                db.commit()
        
        # Deploy to other EVM chains
        for chain_id in selected_chains:
            if chain_id == "7001" or chain_id == "zeta_testnet":
                continue  # Already handled ZetaChain above
            
            logger.info(f"Deploying NFT collection to chain {chain_id}...")
            
            # Get numeric chain ID
            numeric_chain_id = int(chain_id)
            
            # Connect to chain
            web3 = get_web3(numeric_chain_id)
            if not web3:
                deployment_result["result"]["evmChains"][chain_id] = {
                    "success": False,
                    "error": True,
                    "message": f"Failed to connect to chain {chain_id}",
                    "status": "failed"
                }
                
                # Update connected_chains_json with status
                if not deployment.connected_chains_json:
                    deployment.connected_chains_json = {}
                
                deployment.connected_chains_json[chain_id] = {
                    "status": "failed",
                    "error_message": f"Failed to connect to chain {chain_id}"
                }
                
                continue
            
            # Prepare constructor arguments with proper type conversion
            # EVMUniversalNFT(name_, symbol_, baseURI_, maxSupply_, currentChainId, initialOwner)
            constructor_args = [
                str(collection_config["collection_name"]),  # name (string)
                str(collection_config["collection_symbol"]), # symbol (string)
                str(collection_config["base_uri"]),         # baseURI (string)
                int(collection_config["max_supply"]),       # maxSupply (uint256)
                numeric_chain_id,                           # currentChainId (uint256)
                deployer_address                            # initialOwner (address)
            ]
            
            logger.info(f"EVM constructor args: {constructor_args}")
            
            # Deploy the contract
            try:
                evm_result = deploy_contract(
                    web3=web3,
                    account=account,
                    contract_abi=UNIVERSAL_NFT_ABI,
                    contract_bytecode=UNIVERSAL_NFT_BYTECODE,
                    constructor_args=constructor_args
                )
                
                # Ensure receipt is properly JSON-serializable
                if "receipt" in evm_result:
                    # Either remove receipt or convert to a serializable format
                    evm_result.pop("receipt", None)
                
                # Add status to the result
                evm_result["status"] = "completed" if evm_result["success"] else "failed"
                deployment_result["result"]["evmChains"][chain_id] = evm_result
                
                if evm_result["success"]:
                    # Update deployment record with connected chain
                    if not deployment.connected_chains_json:
                        deployment.connected_chains_json = {}
                    
                    deployment.connected_chains_json[chain_id] = {
                        "status": "completed",
                        "contract_address": evm_result["contract_address"],
                        "transaction_hash": evm_result["transaction_hash"]
                    }
                else:
                    # Update with error
                    if not deployment.connected_chains_json:
                        deployment.connected_chains_json = {}
                    
                    error_msg = evm_result.get("message", "Unknown error")
                    deployment.connected_chains_json[chain_id] = {
                        "status": "failed",
                        "error_message": error_msg
                    }
                
                # Save after each chain deployment to avoid data loss
                db.add(deployment)
                db.commit()
            except Exception as e:
                logger.error(f"EVM chain {chain_id} deployment failed: {str(e)}")
                deployment_result["result"]["evmChains"][chain_id] = {
                    "success": False,
                    "error": True,
                    "message": str(e),
                    "status": "failed"
                }
                
                # Update with error
                if not deployment.connected_chains_json:
                    deployment.connected_chains_json = {}
                
                deployment.connected_chains_json[chain_id] = {
                    "status": "failed",
                    "error_message": str(e)
                }
                
                # Save after failure
                db.add(deployment)
                db.commit()
        
        # Update final deployment status
        has_errors = False
        
        # Check if any connected chains failed
        if deployment.connected_chains_json:
            for chain_data in deployment.connected_chains_json.values():
                if chain_data.get("status") == "failed":
                    has_errors = True
                    break
        
        if not deployment.zc_contract_address:
            deployment.deployment_status = "failed"
            if not deployment.error_message:
                deployment.error_message = "ZetaChain deployment required but failed"
        elif has_errors:
            deployment.deployment_status = "partial"
        else:
            deployment.deployment_status = "completed"
        
        # Final save
        db.add(deployment)
        db.commit()
        
        # Add status to the final response
        deployment_result["status"] = deployment.deployment_status
        deployment_result["error"] = (deployment.deployment_status == "failed")
        
        return deployment_result 