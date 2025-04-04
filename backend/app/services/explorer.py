"""Service for interacting with multiple block explorer APIs."""

import httpx
from typing import Dict, List, Any, Tuple
from app.utils.logger import logger
from app.utils.chain_config import get_chain_config, get_enabled_chains


class ExplorerService:
    """Service for querying block explorer APIs for token balances."""

    async def get_user_balances_blockscout(
        self, address: str, chain_id: str
    ) -> List[Dict[str, Any]]:
        """
        Get token balances for a user using Blockscout API.
        
        Args:
            address: The wallet address to query
            chain_id: The chain ID
            
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
            api_url = (
                f"{blockscout_url}/api/v2/addresses/{address}/tokens"
                f"?type=ERC-20%2CERC-721%2CERC-1155"
            )
            
            # Make API request
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(api_url)
                
                if response.status_code != 200:
                    logger.error(
                        f"Error retrieving tokens from Blockscout for chain {chain_id}: "
                        f"Status {response.status_code}, Response: {response.text}"
                    )
                    return []
                
                # Parse JSON response
                data = response.json()
                
                # Return items from the response
                return data.get("items", [])
                
        except Exception as e:
            logger.error(
                f"Error retrieving tokens from Blockscout for chain {chain_id}: {str(e)}"
            )
            return []
    
    async def get_user_balances_etherscan(
        self, address: str, chain_id: str
    ) -> List[Dict[str, Any]]:
        """
        Get token balances for a user using Etherscan-compatible API.
        
        Args:
            address: The wallet address to query
            chain_id: The chain ID
            
        Returns:
            List of tokens owned by the address
        """
        try:
            # Get chain configuration
            chain_config = get_chain_config(int(chain_id))
            if not chain_config or not chain_config.get('explorer_url'):
                logger.error(f"No explorer URL configured for chain {chain_id}")
                return []
                
            explorer_url = chain_config['explorer_url'].rstrip('/')
            
            # Try to extract the API endpoint from the explorer URL
            if explorer_url.endswith("scan.io") or "scan.com" in explorer_url:
                api_url = f"{explorer_url}/api"
            else:
                logger.error(
                    f"Unsupported explorer URL format for chain {chain_id}: {explorer_url}"
                )
                return []
            
            # Make API request to get token list
            params = {
                "module": "account",
                "action": "tokenlist",
                "address": address,
                "apikey": ""  # API key should be configured if needed
            }
            
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(api_url, params=params)
                
                if response.status_code != 200:
                    logger.error(
                        f"Error retrieving tokens from Etherscan for chain {chain_id}: "
                        f"Status {response.status_code}, Response: {response.text}"
                    )
                    return []
                
                # Parse JSON response
                data = response.json()
                
                if data.get("status") != "1":
                    logger.error(
                        f"Error in Etherscan API response for chain {chain_id}: "
                        f"{data.get('message', 'Unknown error')}"
                    )
                    return []
                
                # Format the response to match our expected format
                result = []
                for token in data.get("result", []):
                    result.append({
                        "token": {
                            "address": token.get("contractAddress"),
                            "decimals": token.get("tokenDecimal"),
                            "name": token.get("name"),
                            "symbol": token.get("symbol"),
                            "type": "ERC-20"
                        },
                        "value": token.get("balance", "0")
                    })
                
                return result
                
        except Exception as e:
            logger.error(
                f"Error retrieving tokens from Etherscan for chain {chain_id}: {str(e)}"
            )
            return []
    
    async def get_user_balances_for_chain(
        self, address: str, chain_id: str
    ) -> Tuple[str, List[Dict[str, Any]]]:
        """
        Get token balances for a user for a specific chain, using the appropriate API.
        
        Args:
            address: The wallet address to query
            chain_id: The chain ID
            
        Returns:
            Tuple of (chain_id, list of tokens owned by the address)
        """
        chain_config = get_chain_config(int(chain_id))
        if not chain_config:
            return chain_id, []
        
        # Try Blockscout API first if available
        if chain_config.get('blockscout_url'):
            tokens = await self.get_user_balances_blockscout(address, chain_id)
            if tokens:
                return chain_id, tokens
        
        # Fall back to Etherscan-compatible API if available
        if chain_config.get('explorer_url'):
            tokens = await self.get_user_balances_etherscan(address, chain_id)
            return chain_id, tokens
        
        return chain_id, []
    
    async def get_all_user_balances(self, address: str) -> Dict[str, List[Dict[str, Any]]]:
        """
        Get token balances for a user across all enabled chains.
        
        Args:
            address: The wallet address to query
            
        Returns:
            Dictionary mapping chain IDs to lists of tokens owned by the address
        """
        # Get all enabled chains
        enabled_chains = get_enabled_chains()
        
        # Create tasks for each chain
        tasks = []
        for chain_id in enabled_chains.keys():
            task = self.get_user_balances_for_chain(address, chain_id)
            tasks.append(task)
        
        # Execute tasks concurrently
        results = {}
        for task in tasks:
            chain_id, tokens = await task
            results[chain_id] = tokens
        
        return results

    async def is_universal_token(self, token_address: str, chain_id: str) -> bool:
        """
        Check if a token is a Universal Token by looking for specific patterns.
        This is a simple heuristic and might need improvement.
        
        Args:
            token_address: The token contract address
            chain_id: The chain ID
            
        Returns:
            Boolean indicating if the token is likely a Universal Token
        """
        # For now, we'll check if the token name or symbol contains Universal
        # A more robust approach would be to check contract functions or properties
        try:
            chain_config = get_chain_config(int(chain_id))
            if not chain_config:
                return False
            
            # Try Blockscout API first if available
            if chain_config.get('blockscout_url'):
                blockscout_url = chain_config['blockscout_url'].rstrip('/')
                api_url = f"{blockscout_url}/api/v2/tokens/{token_address}"
                
                async with httpx.AsyncClient(timeout=10.0) as client:
                    response = await client.get(api_url)
                    
                    if response.status_code == 200:
                        data = response.json()
                        token_name = data.get("name", "").lower()
                        token_symbol = data.get("symbol", "").lower()
                        
                        # Check for Universal in name or symbol
                        return (
                            "universal" in token_name or 
                            "ut" == token_symbol or 
                            "utt" == token_symbol
                        )
            
            # Fall back to Etherscan-compatible API if available
            if chain_config.get('explorer_url'):
                explorer_url = chain_config['explorer_url'].rstrip('/')
                
                if explorer_url.endswith("scan.io") or "scan.com" in explorer_url:
                    api_url = f"{explorer_url}/api"
                    
                    params = {
                        "module": "token",
                        "action": "tokeninfo",
                        "contractaddress": token_address,
                        "apikey": ""  # API key should be configured if needed
                    }
                    
                    async with httpx.AsyncClient(timeout=10.0) as client:
                        response = await client.get(api_url, params=params)
                        
                        if response.status_code == 200:
                            data = response.json()
                            
                            if data.get("status") == "1" and data.get("result"):
                                token_info = (
                                    data.get("result", [])[0] 
                                    if isinstance(data.get("result"), list) 
                                    else data.get("result", {})
                                )
                                token_name = token_info.get("name", "").lower()
                                token_symbol = token_info.get("symbol", "").lower()
                                
                                # Check for Universal in name or symbol
                                return (
                                    "universal" in token_name or 
                                    "ut" == token_symbol or 
                                    "utt" == token_symbol
                                )
            
            return False
                
        except Exception as e:
            logger.error(f"Error checking if token is Universal: {str(e)}")
            return False


# Singleton instance
explorer_service = ExplorerService() 