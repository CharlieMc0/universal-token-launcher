"""Verification service for token contracts."""

from typing import Dict, Any

from app.utils.logger import logger
from app.config import get_chain_config
from app.utils.web3_helper import verify_contract_submission


class VerificationService:
    """Service for verifying deployed contracts on block explorers."""

    async def verify_contract(
        self,
        contract_address: str,
        chain_id: str,
        contract_type: str
    ) -> Dict[str, Any]:
        """
        Verify a contract on a block explorer.
        
        Args:
            contract_address: Address of the deployed contract
            chain_id: Chain ID where contract is deployed
            contract_type: Type of contract (zetachain or evm)
            
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
        
        # Check if explorer API key is available
        if not chain_config.get("api_key"):
            return {
                "success": False,
                "message": f"No API key available for chain {chain_id}",
                "status": "failed"
            }
        
        # Determine contract name based on type
        is_zetachain = contract_type.lower() == "zetachain"
        contract_name = "ZetaChainUniversalToken" if is_zetachain else "EVMUniversalToken"
        
        # Submit verification request to block explorer
        verification_result = verify_contract_submission(
            chain_id=numeric_chain_id,
            contract_address=contract_address,
            contract_name=contract_name,
            is_zetachain=is_zetachain
        )
        
        return verification_result


# Singleton instance
verification_service = VerificationService() 