"""Verification service for token contracts."""

from typing import Dict, Any
from sqlalchemy.orm import Session

from app.utils.logger import logger
from app.config import get_chain_config
from app.utils.web3_helper import verify_contract_submission
from app.models import TokenModel


class VerificationService:
    """Service for verifying deployed contracts on block explorers."""

    async def verify_contract(
        self,
        contract_address: str,
        chain_id: str,
        contract_type: str,
        db: Session = None
    ) -> Dict[str, Any]:
        """
        Verify a contract on a block explorer.
        
        Args:
            contract_address: Address of the deployed contract
            chain_id: Chain ID where contract is deployed
            contract_type: Type of contract (zetachain or evm)
            db: Optional database session for updating status
            
        Returns:
            Dict with verification results
        """
        logger.info(
            f"Verifying {contract_type} contract {contract_address} on chain {chain_id}"
        )
        
        # Get chain config
        numeric_chain_id = int(chain_id)
        chain_config = get_chain_config(numeric_chain_id)
        if not chain_config:
            return {
                "success": False,
                "message": f"Chain ID {chain_id} not supported",
                "status": "failed"
            }
        
        # Determine if this is a ZetaChain contract
        is_zetachain = (
            contract_type.lower() == "zetachain" 
            or numeric_chain_id in [7000, 7001]
        )
        
        # Check if explorer API key is available (skip for ZetaChain/Blockscout)
        if not is_zetachain and not chain_config.get("api_key"):
            return {
                "success": False,
                "message": f"No API key available for chain {chain_id}",
                "status": "failed"
            }
        
        # Determine contract name based on type
        contract_name = "ZetaChainUniversalToken" if is_zetachain else "EVMUniversalToken"
        
        # Submit verification request to block explorer
        verification_result = verify_contract_submission(
            chain_id=numeric_chain_id,
            contract_address=contract_address,
            contract_name=contract_name,
            is_zetachain=is_zetachain
        )
        
        # Update database if session provided
        if db and verification_result:
            await self._update_verification_status(
                db=db,
                chain_id=chain_id,
                contract_address=contract_address,
                is_zetachain=is_zetachain,
                verification_result=verification_result
            )
        
        return verification_result
    
    async def _update_verification_status(
        self,
        db: Session,
        chain_id: str,
        contract_address: str,
        is_zetachain: bool,
        verification_result: Dict[str, Any]
    ) -> None:
        """
        Update verification status in the database.
        
        Args:
            db: Database session
            chain_id: Chain ID where contract is deployed
            contract_address: Address of the verified contract
            is_zetachain: Whether it's a ZetaChain contract
            verification_result: Result from verification attempt
        """
        try:
            # Find token with matching contract address
            token = None
            
            if is_zetachain:
                # For ZetaChain contracts
                token = db.query(TokenModel).filter(
                    TokenModel.zc_contract_address.ilike(contract_address)
                ).first()
            else:
                # For other EVM chains, look in connected_chains_json
                tokens = db.query(TokenModel).all()
                for t in tokens:
                    # Skip tokens without connected chains data
                    if not t.connected_chains_json:
                        continue
                        
                    # Check if this chain's contract address matches
                    chain_data = t.connected_chains_json.get(chain_id)
                    if chain_data and chain_data.get("contract_address") == contract_address:
                        token = t
                        break
            
            if not token:
                logger.warning(
                    f"No token found with contract {contract_address} on chain {chain_id}"
                )
                return
            
            # Update verification status
            status = verification_result.get("status", "unknown")
            
            if is_zetachain:
                # For ZetaChain, we would update a dedicated field if it existed
                # For now, we'll log the verification status
                logger.info(
                    f"ZetaChain contract {contract_address} "
                    f"verification status: {status}"
                )
            else:
                # For other chains, update in connected_chains_json
                if not token.connected_chains_json:
                    token.connected_chains_json = {}
                
                if chain_id not in token.connected_chains_json:
                    token.connected_chains_json[chain_id] = {}
                
                token.connected_chains_json[chain_id]["verification_status"] = status
                token.connected_chains_json[chain_id]["verification_message"] = (
                    verification_result.get("message", "")
                )
                
                # Save changes
                db.add(token)
                db.commit()
                logger.info(
                    f"Updated verification status for chain {chain_id} "
                    f"contract {contract_address} to {status}"
                )
                
        except Exception as e:
            logger.error(f"Error updating verification status: {str(e)}")


# Singleton instance
verification_service = VerificationService() 