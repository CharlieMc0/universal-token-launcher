import asyncio
import os
import sys
import json
import argparse

# Add parent directory to path if running script directly
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(os.path.dirname(current_dir))

# Import the required modules
from app.services.deployment import DeploymentService # Import the class
from app.db import SessionLocal, engine, Base # Removed unused get_db
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
    Test token deployment to enabled chains.
    
    Args:
        testnet_only: If True, only deploy to testnet chains.
        max_chains: Maximum number of chains to deploy to (for testing).
    """
    # Create tables if they don't exist
    Base.metadata.create_all(bind=engine)
    
    # Get account for deployment
    account = get_account()
    if not account:
        logger.error("Failed to get account. Check .env DEPLOYER_PRIVATE_KEY.")
        return {"error": True,
                "message": "Deployer account not configured"}
    
    logger.info(f"Using deployer account: {account.address}")
    
    # Get enabled chains
    enabled_chains = get_enabled_chains(testnet_only=testnet_only)
    
    if not enabled_chains:
        logger.error("No enabled chains found in configuration.")
        return {"error": True, "message": "No enabled chains found"}
    
    # Get the chain IDs to deploy to
    chain_ids = list(enabled_chains.keys())
    
    # Limit the number of chains if specified
    if max_chains and 0 < max_chains < len(chain_ids):
        chain_ids = chain_ids[:max_chains]
        logger.info(f"Limiting deployment to {max_chains} chains.")
    
    # Log the chains we're deploying to
    chain_names = [enabled_chains[chain_id]['name'] for chain_id in chain_ids]
    logger.info(f"Will deploy to {len(chain_ids)} chains: {', '.join(chain_names)}")
    
    # Create a database session
    db = SessionLocal()
    deployment_service = DeploymentService() # Instantiate the service
    
    try:
        # Configure test token
        token_config = {
            "token_name": "Universal Test Token",
            "token_symbol": "UTT",
            "decimals": 18,
            "total_supply": "1000000000000000000000000", # 1M tokens
        }
        allocations_data = [
            {
                "address": account.address,
                "amount": "1000000000000000000000000" # Allocate all to deployer
            }
        ]
        
        logger.info(f"Deploying token {token_config['token_name']} to chains: {chain_ids}")
        
        # Call the deployment service directly with correct arguments
        result = await deployment_service.deploy_universal_token(
            token_config=token_config,
            selected_chains=chain_ids,
            final_owner_address=account.address,
            allocations=allocations_data,
            db=db # Pass the db session last
        )
        
        # Log the results
        logger.info("Deployment result:")
        logger.info(json.dumps(result, indent=2))
        
        # Check for success
        zc_result = result.get("zetaChain", {})
        if zc_result.get("success", False):
            zc_addr = result['zetaChain'].get('contract_address', 'N/A')
            logger.info(f"✅ ZetaChain deployment successful! Contract: {zc_addr}")
        else:
            error_msg = result.get('zetaChain', {}).get('message', 'Unknown error')
            logger.error(f"❌ ZetaChain deployment failed: {error_msg}")
        
        # Check EVM deployments
        success_count = 0
        failure_count = 0
        
        for chain_id_str, chain_result in result.get("evmChains", {}).items():
            # Check based on status or presence of contract_address
            is_successful_deploy = (
                chain_result.get("status") in ["deployed", "completed"] or
                chain_result.get("setup_status") == "completed" or
                (chain_result.get("contract_address") and 
                 not chain_result.get("error_message"))
            )

            chain_id = int(chain_id_str)
            chain_name = enabled_chains.get(chain_id, {}).get('name', 'Unknown')
            if is_successful_deploy:
                success_count += 1
                contract = chain_result.get('contract_address', 'N/A')
                logger.info(
                    f"✅ Chain {chain_id} ({chain_name}) deployment successful! "
                    f"Contract: {contract}"
                )
            else:
                failure_count += 1
                error = chain_result.get('message', 'Unknown error')
                logger.error(
                    f"❌ Chain {chain_id} ({chain_name}) deployment failed: {error}"
                )
        
        logger.info(f"Deployment summary: {success_count} successful EVM, {failure_count} failed EVM")
        
        # Determine overall success based on ZetaChain result mainly
        overall_success = zc_result.get("success", False)
        return {"error": not overall_success, "message": "Test completed", "result": result}

    except Exception as e:
        logger.error(f"Test deployment failed unexpectedly: {str(e)}", exc_info=True)
        return {"error": True, "message": str(e)}
    finally:
        db.close()


if __name__ == "__main__":
    # Set up command-line arguments
    parser = argparse.ArgumentParser(description='Test token deployment')
    parser.add_argument('--testnet-only', action='store_true',
                        help='Deploy only to testnet chains')
    parser.add_argument('--max-chains', type=int, default=None,
                        help='Maximum number of chains to deploy to')
    args = parser.parse_args()
    
    logger.info("Starting token deployment test...")
    # Run the test
    run_result = asyncio.run(test_token_deployment(
        testnet_only=args.testnet_only,
        max_chains=args.max_chains
    ))
    
    # Print final status
    if run_result.get("error", True):
        print(f"❌ Deployment test failed! Message: {run_result.get('message')}")
        sys.exit(1)
    else:
        print("✅ Deployment test completed successfully!")
        sys.exit(0) 