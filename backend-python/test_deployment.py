import asyncio
import os
import sys
import json
import argparse

# Add the current directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import the required modules
from app.services.deployment import deployment_service
from app.db import SessionLocal, engine, Base
from app.utils.logger import logger
from app.utils.web3_helper import get_account
from app.utils.chain_config import get_supported_chains


def get_enabled_chains(testnet_only=False):
    """Get all enabled chains from the rpc_config.json file."""
    # Get all chains
    all_chains = get_supported_chains(testnet_only=testnet_only)
    
    # Filter for enabled chains only
    enabled_chains = {
        chain_id: chain_info 
        for chain_id, chain_info in all_chains.items() 
        if chain_info.get('enabled', False)
    }
    
    return enabled_chains


async def test_token_deployment(testnet_only=False, max_chains=None):
    """
    Test token deployment to all enabled chains.
    
    Args:
        testnet_only: If True, only deploy to testnet chains
        max_chains: Maximum number of chains to deploy to (for testing purposes)
    """
    # Create tables if they don't exist
    Base.metadata.create_all(bind=engine)
    
    # Get account for verification
    account = get_account()
    if not account:
        logger.error("Failed to get account from private key. Check your .env file.")
        return False
    
    logger.info(f"Using deployer account: {account.address}")
    
    # Get enabled chains
    enabled_chains = get_enabled_chains(testnet_only=testnet_only)
    
    if not enabled_chains:
        logger.error("No enabled chains found in configuration.")
        return {"error": True, "message": "No enabled chains found"}
    
    # Get the chain IDs to deploy to
    chain_ids = list(enabled_chains.keys())
    
    # Limit the number of chains if specified
    if max_chains and max_chains > 0 and max_chains < len(chain_ids):
        chain_ids = chain_ids[:max_chains]
    
    # Log the chains we're deploying to
    chain_names = [enabled_chains[chain_id]['name'] for chain_id in chain_ids]
    logger.info(f"Will deploy to {len(chain_ids)} chains: {', '.join(chain_names)}")
    
    # Create a database session
    db = SessionLocal()
    
    try:
        # Configure test token
        token_config = {
            "token_name": "Universal Test Token",
            "token_symbol": "UTT",
            "decimals": 18,
            # 1,000,000 tokens with 18 decimals
            "total_supply": "1000000000000000000000000",  
            "allocations": [
                {
                    "address": account.address,
                    "amount": "1000000000000000000000000"
                }
            ]
        }
        
        logger.info(f"Deploying token {token_config['token_name']} to chains: {chain_ids}")
        
        # Call the deployment service directly
        result = await deployment_service.deploy_universal_token(
            token_config,
            chain_ids,
            account.address,
            db
        )
        
        # Log the results
        logger.info("Deployment result:")
        logger.info(json.dumps(result, indent=2))
        
        # Check for success
        if result.get("zetaChain", {}).get("success", False):
            zcchain_addr = result['zetaChain'].get('contract_address')
            logger.info(f"ZetaChain deployment successful! Contract: {zcchain_addr}")
        elif "zetaChain" in result:
            error_msg = result.get('zetaChain', {}).get('message', 'Unknown error')
            logger.error(f"ZetaChain deployment failed: {error_msg}")
        
        # Check EVM deployments
        success_count = 0
        failure_count = 0
        
        for chain_id, chain_result in result.get("evmChains", {}).items():
            chain_name = enabled_chains.get(chain_id, {}).get('name', 'Unknown')
            if chain_result.get("success", False):
                success_count += 1
                contract = chain_result.get('contract_address')
                logger.info(
                    f"Chain {chain_id} ({chain_name}) deployment successful! "
                    f"Contract: {contract}"
                )
            else:
                failure_count += 1
                error = chain_result.get('message', 'Unknown error')
                logger.error(
                    f"Chain {chain_id} ({chain_name}) deployment failed: {error}"
                )
        
        logger.info(f"Deployment summary: {success_count} successful, {failure_count} failed")
        
        return result
    except Exception as e:
        logger.error(f"Test deployment failed: {str(e)}")
        return {"error": True, "message": str(e)}
    finally:
        db.close()


if __name__ == "__main__":
    # Set up command-line arguments
    parser = argparse.ArgumentParser(description='Test token deployment to all enabled chains')
    parser.add_argument('--testnet-only', action='store_true', 
                        help='Deploy only to testnet chains')
    parser.add_argument('--max-chains', type=int, default=None, 
                        help='Maximum number of chains to deploy to')
    args = parser.parse_args()
    
    # Run the test
    result = asyncio.run(test_token_deployment(
        testnet_only=args.testnet_only, 
        max_chains=args.max_chains
    ))
    
    # Print final status
    if result.get("error", False):
        print("❌ Deployment test failed!")
        sys.exit(1)
    else:
        print("✅ Deployment test completed!")
        sys.exit(0) 