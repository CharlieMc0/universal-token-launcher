"""Token service for querying token information."""

from sqlalchemy.orm import Session
from typing import Dict, Any, Optional

from app.models import TokenModel
from app.utils.logger import logger
from app.utils.chain_config import get_chain_config


class TokenService:
    """Service for querying token information."""

    async def get_token_by_id(
        self, 
        token_id: int, 
        db: Session
    ) -> Optional[Dict[str, Any]]:
        """
        Get token details by ID.
        
        Args:
            token_id: The token ID to look up
            db: Database session
            
        Returns:
            Token details as a dictionary, or None if not found
        """
        try:
            token = db.query(TokenModel).filter(TokenModel.id == token_id).first()
            if token:
                return self._enhance_token_data(token.to_dict())
            return None
        except Exception as e:
            logger.error(f"Error retrieving token by ID {token_id}: {str(e)}")
            return None

    async def get_token_by_contract_address(
        self, 
        contract_address: str, 
        db: Session
    ) -> Optional[Dict[str, Any]]:
        """
        Get token details by ZetaChain contract address.
        
        Args:
            contract_address: The ZetaChain contract address to look up
            db: Database session
            
        Returns:
            Token details as a dictionary, or None if not found
        """
        try:
            # Lowercase the address for consistent comparisons
            address = contract_address.lower()
            
            # First try to find by ZetaChain contract address
            token = db.query(TokenModel).filter(
                TokenModel.zc_contract_address.ilike(address)
            ).first()
            
            if token:
                return self._enhance_token_data(token.to_dict())
                
            # If not found, check for contract addresses in connected_chains_json
            tokens = db.query(TokenModel).all()
            for token in tokens:
                # Check each chain's contract address in connected_chains_json
                for chain_id, chain_data in token.connected_chains_json.items():
                    chain_contract = chain_data.get("contract_address", "").lower()
                    if chain_contract == address:
                        return self._enhance_token_data(token.to_dict())
            
            return None
        except Exception as e:
            logger.error(
                f"Error retrieving token by contract address {contract_address}: {str(e)}"
            )
            return None
    
    def _enhance_token_data(self, token_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Enhance token data with additional information for each chain.
        
        Args:
            token_data: Basic token data from the database
            
        Returns:
            Enhanced token data with additional chain information
        """
        if not token_data:
            return token_data
            
        # Get ZetaChain info if available
        if token_data.get("zc_contract_address"):
            zc_chain_id = "7001"  # ZetaChain Testnet
            zc_config = get_chain_config(int(zc_chain_id))
            
            # Create zeta_chain_info if it doesn't exist
            if "zeta_chain_info" not in token_data:
                token_data["zeta_chain_info"] = {}
                
            # Add explorer URLs
            explorer_url = zc_config.get("explorer_url") if zc_config else None
            blockscout_url = zc_config.get("blockscout_url") if zc_config else None
            
            token_data["zeta_chain_info"].update({
                "chain_id": zc_chain_id,
                "contract_address": token_data["zc_contract_address"],
                "status": token_data["deployment_status"],
                "explorer_url": explorer_url,
                "blockscout_url": blockscout_url,
                "verification_status": token_data.get("verification_status", "pending"),
                "contract_url": (
                    f"{blockscout_url}/address/{token_data['zc_contract_address']}"
                    if blockscout_url else None
                )
            })
        
        # Enhance connected chains data
        enhanced_chains = {}
        connected_chains = token_data.get("connected_chains_json", {})
        
        for chain_id, chain_data in connected_chains.items():
            # Get chain configuration
            chain_config = get_chain_config(int(chain_id))
            if not chain_config:
                # Keep original data if chain config not found
                enhanced_chains[chain_id] = chain_data
                continue
                
            # Create enhanced chain data with explorer URLs
            explorer_url = chain_config.get("explorer_url")
            blockscout_url = chain_config.get("blockscout_url")
            contract_address = chain_data.get("contract_address")
            
            enhanced_chain_data = {
                **chain_data,  # Keep existing data
                "chain_id": chain_id,
                "chain_name": chain_config.get("name", f"Chain {chain_id}"),
                "status": chain_data.get("status", "completed"),  # Default to completed
                "explorer_url": explorer_url,
                "blockscout_url": blockscout_url,
                "verification_status": chain_data.get("verification_status", "pending"),
                "contract_url": None  # Will be populated below
            }
            
            # Add contract URL based on available explorer
            if contract_address:
                if blockscout_url:
                    enhanced_chain_data["contract_url"] = (
                        f"{blockscout_url}/address/{contract_address}"
                    )
                elif explorer_url:
                    enhanced_chain_data["contract_url"] = (
                        f"{explorer_url}/address/{contract_address}"
                    )
            
            enhanced_chains[chain_id] = enhanced_chain_data
        
        # Replace the original connected_chains_json with enhanced data
        token_data["connected_chains_json"] = enhanced_chains
        
        return token_data


# Singleton instance
token_service = TokenService() 