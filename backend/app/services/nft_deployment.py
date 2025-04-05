"""Deployment service for universal NFT collections (disabled)."""

from sqlalchemy.orm import Session
from typing import Dict, List, Any

from app.utils.logger import logger

class NFTDeploymentService:
    """Service for deploying NFT contracts. Currently disabled/out of scope."""
    
    async def deploy_universal_nft(
        self,
        collection_config: Dict[str, Any] = None,
        selected_chains: List[str] = None,
        deployer_address: str = None,
        db: Session = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        NFT deployment is currently disabled/out of scope.
        
        Returns:
            Dict with error status.
        """
        logger.error("NFT deployment is out of scope and disabled")
        return {"error": True, "message": "NFT deployment is out of scope"}


# Create singleton instance
nft_deployment_service = NFTDeploymentService() 