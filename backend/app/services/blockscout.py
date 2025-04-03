"""Service for interacting with Blockscout API."""

import httpx
from typing import Dict, List, Any, Optional
from app.utils.logger import logger
from app.utils.chain_config import get_chain_config


class BlockscoutService:
    """Service for interacting with the Blockscout API."""

    async def get_user_tokens(self, address: str, chain_id: str = "7001") -> List[Dict[str, Any]]:
        """
        Get tokens owned by a user address from Blockscout API.
        
        Args:
            address: The wallet address to query
            chain_id: The chain ID (default: ZetaChain testnet)
            
        Returns:
            List of tokens owned by the address
        """
        try:
            # Get chain configuration
            chain_config = get_chain_config(int(chain_id))
            if not chain_config or not chain_config.get('blockscout_url'):
                logger.error(f"No Blockscout URL configured for chain {chain_id}")
                return []
                
            blockscout_url = chain_config['blockscout_url'].rstrip('/')
            
            # Build API URL for token balance endpoint
            api_url = f"{blockscout_url}/api/v2/addresses/{address}/tokens"
            
            # Make API request
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(api_url)
                
                if response.status_code != 200:
                    logger.error(
                        f"Error retrieving tokens from Blockscout: "
                        f"Status {response.status_code}, Response: {response.text}"
                    )
                    return []
                
                # Parse JSON response
                data = response.json()
                
                # Return items from the response
                return data.get("items", [])
                
        except Exception as e:
            logger.error(f"Error retrieving tokens from Blockscout: {str(e)}")
            return []
            
    async def get_token_info(self, contract_address: str, chain_id: str = "7001") -> Optional[Dict[str, Any]]:
        """
        Get information about a specific token contract.
        
        Args:
            contract_address: The token contract address
            chain_id: The chain ID (default: ZetaChain testnet)
            
        Returns:
            Token information or None if not found
        """
        try:
            # Get chain configuration
            chain_config = get_chain_config(int(chain_id))
            if not chain_config or not chain_config.get('blockscout_url'):
                logger.error(f"No Blockscout URL configured for chain {chain_id}")
                return None
                
            blockscout_url = chain_config['blockscout_url'].rstrip('/')
            
            # Build API URL for token info endpoint
            api_url = f"{blockscout_url}/api/v2/tokens/{contract_address}"
            
            # Make API request
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(api_url)
                
                if response.status_code != 200:
                    logger.error(
                        f"Error retrieving token info from Blockscout: "
                        f"Status {response.status_code}, Response: {response.text}"
                    )
                    return None
                
                # Return JSON response
                return response.json()
                
        except Exception as e:
            logger.error(f"Error retrieving token info from Blockscout: {str(e)}")
            return None
            
    async def get_token_holders(self, contract_address: str, chain_id: str = "7001") -> List[Dict[str, Any]]:
        """
        Get holders of a specific token.
        
        Args:
            contract_address: The token contract address
            chain_id: The chain ID (default: ZetaChain testnet)
            
        Returns:
            List of token holders with their balances
        """
        try:
            # Get chain configuration
            chain_config = get_chain_config(int(chain_id))
            if not chain_config or not chain_config.get('blockscout_url'):
                logger.error(f"No Blockscout URL configured for chain {chain_id}")
                return []
                
            blockscout_url = chain_config['blockscout_url'].rstrip('/')
            
            # Build API URL for token holders endpoint
            api_url = f"{blockscout_url}/api/v2/tokens/{contract_address}/holders"
            
            # Make API request
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(api_url)
                
                if response.status_code != 200:
                    logger.error(
                        f"Error retrieving token holders from Blockscout: "
                        f"Status {response.status_code}, Response: {response.text}"
                    )
                    return []
                
                # Parse JSON response
                data = response.json()
                
                # Return items from the response
                return data.get("items", [])
                
        except Exception as e:
            logger.error(f"Error retrieving token holders from Blockscout: {str(e)}")
            return []


# Singleton instance
blockscout_service = BlockscoutService() 