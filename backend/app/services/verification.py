"""Verification service for token contracts."""

from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified
import json
import asyncio
import sys
import re

from app.utils.logger import logger
from app.utils.chain_config import get_chain_config
from app.utils.web3_helper import verify_contract_submission, get_web3
from app.models import TokenModel
from app.models.nft import NFTCollectionModel


class VerificationService:
    """Service for verifying deployed contracts on block explorers."""

    async def verify_contract(
        self,
        contract_address: str,
        chain_id: str,
        contract_type: str,
        contract_args: dict = None,
        is_token: bool = True,
        db: Session = None
    ) -> Dict[str, Any]:
        """
        Verify a contract on a block explorer.
        
        Args:
            contract_address: Address of the deployed contract
            chain_id: Chain ID where contract is deployed
            contract_type: Type of contract (zetachain or evm)
            contract_args: Optional constructor arguments for the contract
            is_token: Flag to indicate if this is a token (True) or NFT (False) contract
            db: Optional database session for updating status
            
        Returns:
            Dict with verification results
        """
        logger.info(
            f"Verifying {contract_type} {'token' if is_token else 'NFT'} contract {contract_address} on chain {chain_id}"
        )
        
        try:
            numeric_chain_id = int(chain_id)
        except ValueError:
            return {"success": False, "message": f"Invalid chain ID: {chain_id}", "status": "failed"}
        
        chain_config = get_chain_config(numeric_chain_id)
        if not chain_config:
            return {"success": False, "message": f"Chain ID {chain_id} not supported", "status": "failed"}
        
        is_zetachain = (contract_type.lower() == "zetachain")
        
        # Determine contract name based on type and whether it's a token or NFT
        if is_token:
            contract_name = "ZetaChainUniversalToken" if is_zetachain else "EVMUniversalToken"
        else:
            contract_name = "ZetaChainUniversalNFT" if is_zetachain else "EVMUniversalNFT"
            
        logger.info(f"Using contract name: {contract_name} for verification")
        
        # Prepare constructor arguments list if provided
        constructor_arg_list = None
        if contract_args and not is_zetachain:
            logger.info(f"Processing constructor arguments: {contract_args}")
            if contract_name == "EVMUniversalToken":
                constructor_arg_list = [
                    contract_args.get("name", ""),
                    contract_args.get("symbol", ""),
                    int(contract_args.get("decimals", 18)),
                    int(contract_args.get("supply", 0)),
                    int(chain_id),
                    contract_args.get("owner", "0x0000000000000000000000000000000000000000")
                ]
                logger.info(f"Prepared constructor args: {constructor_arg_list}")
            elif contract_name == "EVMUniversalNFT":
                # Handle NFT constructor args if needed
                pass
        
        # Submit verification request to block explorer
        verification_result = verify_contract_submission(
            chain_id=numeric_chain_id,
            contract_address=contract_address,
            contract_name=contract_name,
            is_zetachain=is_zetachain,
            constructor_args=constructor_arg_list
        )
        
        # Update database if session provided
        if db and verification_result:
            await self._update_verification_status(
                db=db,
                chain_id=chain_id,
                contract_address=contract_address,
                is_zetachain=is_zetachain,
                verification_result=verification_result,
                is_token=is_token
            )
        
        return verification_result
    
    async def _update_evm_verification_status(
        self,
        model_instance: TokenModel | NFTCollectionModel,
        chain_id: str,
        verification_result: Dict[str, Any]
    ) -> None:
        """Helper to update verification status in connected_chains_json for EVM chains."""
        status = verification_result.get("status", "unknown")
        message = verification_result.get("message", "")
        guid = verification_result.get("guid") # Etherscan GUID
        
        if not model_instance.connected_chains_json:
            model_instance.connected_chains_json = {}
        
        if chain_id not in model_instance.connected_chains_json:
            model_instance.connected_chains_json[chain_id] = {}
        
        chain_data = model_instance.connected_chains_json[chain_id]
        chain_data["verification_status"] = status
        chain_data["verification_message"] = message
        if guid:
             chain_data["verification_guid"] = guid # Store GUID if available

        # Mark the JSON field as modified for SQLAlchemy
        # (Needed if modifying nested structures in JSONB)
        flag_modified(model_instance, "connected_chains_json")

        logger.info(
            f"Updated EVM verification status for chain {chain_id} "
            f"contract {chain_data.get('contract_address')} to {status}"
        )

    async def _update_verification_status(
        self,
        db: Session,
        chain_id: str,
        contract_address: str,
        is_zetachain: bool,
        verification_result: Dict[str, Any],
        is_token: bool = True
    ) -> None:
        """
        Update verification status in the database for Token or NFT.
        Handles ZetaChain and EVM chain updates separately.
        """
        record = None
        model_cls = TokenModel if is_token else NFTCollectionModel
        asset_type = "token" if is_token else "NFT collection"

        try:
            # Find the record based on contract address and chain type
            if is_zetachain:
                record = db.query(model_cls).filter(
                    model_cls.zc_contract_address.ilike(contract_address)
                ).first()
            else: # EVM chain
                # Need to query differently as address is inside JSON
                records = db.query(model_cls).filter(
                     # Use JSONB path exists query if possible, or iterate
                     # This is a basic iteration approach
                     model_cls.connected_chains_json != None # Ensure JSON is not null
                 ).all()
                
                for r in records:
                     if not r.connected_chains_json: continue
                     chain_data = r.connected_chains_json.get(chain_id)
                     if chain_data and chain_data.get("contract_address") == contract_address:
                         record = r
                         break
            
            if not record:
                logger.warning(
                    f"No {asset_type} found with contract {contract_address} on chain {chain_id} for status update."
                )
                return

            # Update status based on chain type
            status = verification_result.get("status", "unknown")
            message = verification_result.get("message", "")

            if is_zetachain:
                logger.info(
                    f"ZetaChain {asset_type} contract {contract_address} "
                    f"verification status update: {status}. Message: {message}"
                )
                
                if is_token:
                    # For tokens, use the existing logic (which might just log without DB update)
                    pass
                else:
                    # For NFTs, use connected_chains_json instead of metadata for ZetaChain
                    # since NFTCollectionModel doesn't have a metadata field
                    if not record.connected_chains_json:
                        record.connected_chains_json = {}
                    
                    # Use a special "zetachain" key in connected_chains_json for ZetaChain verification
                    if "zetachain" not in record.connected_chains_json:
                        record.connected_chains_json["zetachain"] = {}
                    
                    record.connected_chains_json["zetachain"]["verification_status"] = status
                    record.connected_chains_json["zetachain"]["verification_message"] = message
                    flag_modified(record, "connected_chains_json")
                    logger.info(f"Updated NFT ZetaChain verification status to {status}")
            else: # EVM chain
                await self._update_evm_verification_status(
                    model_instance=record,
                    chain_id=chain_id,
                    verification_result=verification_result
                )
            
            # Commit changes
            db.add(record)
            db.commit()
            logger.info(f"Committed verification status update for {asset_type} ID {record.id}")
                
        except Exception as e:
            logger.error(f"Failed to update verification status in DB: {e}", exc_info=True)
            db.rollback()


# Singleton instance
verification_service = VerificationService() 