"""Deployment service for universal token contracts."""

from sqlalchemy.orm import Session
from typing import Dict, List, Any

from app.models import TokenModel
from app.utils.logger import logger
from app.utils.web3_helper import (
    get_web3, 
    get_account, 
    deploy_contract, 
    UNIVERSAL_TOKEN_ABI, 
    UNIVERSAL_TOKEN_BYTECODE, 
    ZC_UNIVERSAL_TOKEN_ABI, 
    ZC_UNIVERSAL_TOKEN_BYTECODE
)


class DeploymentService:
    """Service for deploying universal token contracts."""

    async def deploy_universal_token(
        self,
        token_config: Dict[str, Any],
        selected_chains: List[str],
        deployer_address: str,
        db: Session
    ) -> Dict[str, Any]:
        """
        Deploy a universal token across multiple chains.
        
        Args:
            token_config: Token configuration information
            selected_chains: List of chain IDs to deploy on
            deployer_address: Address that will receive ownership
            db: Database session
            
        Returns:
            Dict with deployment results
        """
        logger.info(
            f"Deploying token {token_config['token_name']} on {len(selected_chains)} chains"
        )
        
        # Create deployment record
        deployment = TokenModel(
            token_name=token_config["token_name"],
            token_symbol=token_config["token_symbol"],
            decimals=token_config["decimals"],
            total_supply=token_config["total_supply"],
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
            "zetaChain": {},
            "evmChains": {}
        }
        
        # First deploy to ZetaChain (required for cross-chain functionality)
        zeta_chain_id = 7001  # ZetaChain Testnet
        if "7001" in selected_chains or "zeta_testnet" in selected_chains:
            logger.info("Deploying ZetaChain contract...")
            
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
            # ZetaChainUniversalToken(name_, symbol_, decimals_, initialSupply, initialOwner)
            constructor_args = [
                str(token_config["token_name"]),      # name (string)
                str(token_config["token_symbol"]),    # symbol (string)
                int(token_config["decimals"]),        # decimals (uint8)
                int(token_config["total_supply"]),    # initialSupply (uint256)
                deployer_address                      # initialOwner (address)
            ]
            
            logger.info(f"ZetaChain constructor args: {constructor_args}")
            
            # In development mode, use a try-except block to handle deployments
            try:
                # Deploy the contract
                zc_result = deploy_contract(
                    web3=web3,
                    account=account,
                    contract_abi=ZC_UNIVERSAL_TOKEN_ABI,
                    contract_bytecode=ZC_UNIVERSAL_TOKEN_BYTECODE,
                    constructor_args=constructor_args
                )
                
                deployment_result["zetaChain"] = zc_result
                
                if zc_result["success"]:
                    # Update deployment record
                    deployment.zc_contract_address = zc_result["contract_address"]
                else:
                    error_msg = zc_result.get('message', 'Unknown error')
                    deployment.error_message = f"ZetaChain deployment failed: {error_msg}"
            except Exception as e:
                logger.error(f"ZetaChain deployment failed: {str(e)}")
                deployment_result["zetaChain"] = {
                    "success": False,
                    "error": True,
                    "message": str(e)
                }
                deployment.error_message = f"ZetaChain deployment failed: {str(e)}"
        
        # Deploy to other EVM chains
        for chain_id in selected_chains:
            if chain_id == "7001" or chain_id == "zeta_testnet":
                continue  # Already handled ZetaChain above
            
            logger.info(f"Deploying contract to chain {chain_id}...")
            
            # Get numeric chain ID
            numeric_chain_id = int(chain_id)
            
            # Connect to chain
            web3 = get_web3(numeric_chain_id)
            if not web3:
                deployment_result["evmChains"][chain_id] = {
                    "success": False,
                    "error": True,
                    "message": f"Failed to connect to chain {chain_id}"
                }
                continue
            
            # Prepare constructor arguments with proper type conversion
            # EVMUniversalToken(name, symbol, decimals, initialSupply, chainId, owner)
            constructor_args = [
                str(token_config["token_name"]),      # name (string)
                str(token_config["token_symbol"]),    # symbol (string)
                int(token_config["decimals"]),        # decimals (uint8)
                int(token_config["total_supply"]),    # initialSupply (uint256)
                numeric_chain_id,                     # currentChainId (uint256)
                deployer_address                      # initialOwner (address)
            ]
            
            logger.info(f"EVM constructor args: {constructor_args}")
            
            # In development mode, use a try-except block to handle deployments
            try:
                # Deploy the contract
                evm_result = deploy_contract(
                    web3=web3,
                    account=account,
                    contract_abi=UNIVERSAL_TOKEN_ABI,
                    contract_bytecode=UNIVERSAL_TOKEN_BYTECODE,
                    constructor_args=constructor_args
                )
                
                deployment_result["evmChains"][chain_id] = evm_result
                
                if evm_result["success"]:
                    # Update deployment record with connected chain
                    if not deployment.connected_chains_json:
                        deployment.connected_chains_json = {}
                    
                    deployment.connected_chains_json[chain_id] = {
                        "contract_address": evm_result["contract_address"],
                        "transaction_hash": evm_result["transaction_hash"]
                    }
            except Exception as e:
                logger.error(f"Chain {chain_id} deployment failed: {str(e)}")
                deployment_result["evmChains"][chain_id] = {
                    "success": False,
                    "error": True,
                    "message": str(e)
                }
        
        # Update deployment status
        has_errors = (
            (deployment_result["zetaChain"].get("error", False)) or
            any(chain.get("error", False) 
                for chain in deployment_result["evmChains"].values())
        )
        
        if has_errors and not deployment.connected_chains_json:
            # Complete failure - no chains were deployed
            deployment.deployment_status = "failed"
        elif has_errors:
            # Partial success - some chains deployed
            deployment.deployment_status = "partial"
        else:
            # Complete success
            deployment.deployment_status = "completed"
        
        db.add(deployment)
        db.commit()
        
        return deployment_result


# Singleton instance
deployment_service = DeploymentService() 