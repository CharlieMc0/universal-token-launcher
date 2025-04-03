"""Test script for NFT collection deployment across chains."""

import argparse
import sys
from sqlalchemy.orm import Session
import json
import asyncio
import logging
import os

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import our modules
from app.models.nft import NFTCollectionModel
from app.services.nft_deployment import NFTDeploymentService
from app.db import engine, Base, get_db
from app.utils.chain_config import get_enabled_chains, get_chain_config
from app.utils.logger import logger

# Create tables if they don't exist
Base.metadata.create_all(bind=engine)


async def test_deployment(chain_ids, max_chains=None, testnet_only=False):
    """Test NFT collection deployment on selected chains."""
    
    # Filter chains if testnet_only is specified
    if testnet_only:
        filtered_chains = []
        for chain_id in chain_ids:
            config = get_chain_config(int(chain_id))
            if config and config.get("testnet", False):
                filtered_chains.append(chain_id)
        chain_ids = filtered_chains
        logger.info(f"Filtered to {len(chain_ids)} testnet chains")
    
    # Limit number of chains if specified
    if max_chains and len(chain_ids) > int(max_chains):
        chain_ids = chain_ids[:int(max_chains)]
        logger.info(f"Limited to {len(chain_ids)} chains")
    
    if not chain_ids:
        logger.error("No chains selected for testing")
        return False
    
    # Get database session
    db = next(get_db())
    
    # Create NFT deployment service
    nft_service = NFTDeploymentService()
    
    # Test NFT collection configuration
    collection_config = {
        "collection_name": "Test NFT Collection",
        "collection_symbol": "TNFT",
        "base_uri": "https://metadata.example.com/nft/",
        "max_supply": 1000
    }
    
    # Test deployer address (from config)
    deployer_address = "0x4f1684A28E33F42cdf50AB96e29a709e17249E63"
    
    logger.info(f"Testing NFT collection deployment on {len(chain_ids)} chains")
    logger.info(f"Collection: {collection_config['collection_name']} ({collection_config['collection_symbol']})")
    logger.info(f"Chain IDs: {', '.join(chain_ids)}")
    
    # Deploy NFT collection
    deployment_result = await nft_service.deploy_universal_nft(
        collection_config=collection_config,
        selected_chains=chain_ids,
        deployer_address=deployer_address,
        db=db
    )
    
    # Check deployment result - updated to handle new result structure
    if "error" in deployment_result and deployment_result.get("error", False):
        logger.error(f"Deployment failed: {deployment_result.get('message', 'Unknown error')}")
        return False
    
    deployment_id = deployment_result["deploymentId"]
    logger.info(f"Deployment ID: {deployment_id}")
    
    # Get deployment from database
    deployment = db.query(NFTCollectionModel).filter(NFTCollectionModel.id == deployment_id).first()
    if not deployment:
        logger.error(f"Deployment {deployment_id} not found in database")
        return False
    
    # Print ZetaChain deployment result - updated for new result structure
    if "7001" in chain_ids or "zeta_testnet" in chain_ids:
        zeta_result = deployment_result.get("result", {}).get("zetaChain", {})
        logger.info("ZetaChain deployment:")
        if zeta_result.get("success", False):
            logger.info(f"  Success! Contract address: {zeta_result.get('contract_address')}")
            logger.info(f"  Transaction: {zeta_result.get('transaction_hash')}")
        else:
            logger.error(f"  Failed: {zeta_result.get('message', 'Unknown error')}")
    
    # Print EVM chain deployment results - updated for new result structure
    evm_results = deployment_result.get("result", {}).get("evmChains", {})
    for chain_id, result in evm_results.items():
        chain_config = get_chain_config(int(chain_id))
        chain_name = chain_config.get("name", "Unknown Chain") if chain_config else f"Chain {chain_id}"
        
        logger.info(f"{chain_name} deployment:")
        if result.get("success", False):
            logger.info(f"  Success! Contract address: {result.get('contract_address')}")
            logger.info(f"  Transaction: {result.get('transaction_hash')}")
        else:
            logger.error(f"  Failed: {result.get('message', 'Unknown error')}")
    
    # Print final status
    logger.info(f"Deployment status: {deployment.deployment_status}")
    if deployment.error_message:
        logger.error(f"Error message: {deployment.error_message}")
    
    # Return success based on deployment status
    return deployment.deployment_status in ("completed", "partial")


def main():
    """Main entry point for the test script."""
    
    # Set up argument parser
    parser = argparse.ArgumentParser(description="Test NFT collection deployment across chains")
    parser.add_argument("--chain-ids", nargs="*", help="Specific chain IDs to deploy on")
    parser.add_argument("--max-chains", type=int, help="Maximum number of chains to deploy on")
    parser.add_argument("--testnet-only", action="store_true", help="Only deploy on testnets")
    args = parser.parse_args()
    
    # Get enabled chains
    enabled_chains = get_enabled_chains()
    
    # Use specified chains or all enabled chains
    if args.chain_ids:
        chain_ids = args.chain_ids
        # Validate chain IDs
        for chain_id in chain_ids:
            if chain_id not in [str(cid) for cid in enabled_chains.keys()]:
                logger.error(f"Chain ID {chain_id} is not a valid enabled chain")
                return False
    else:
        chain_ids = [str(chain_id) for chain_id in enabled_chains.keys()]
    
    # Run the deployment test
    success = asyncio.run(
        test_deployment(
            chain_ids=chain_ids,
            max_chains=args.max_chains,
            testnet_only=args.testnet_only
        )
    )
    
    if success:
        logger.info("NFT collection deployment test completed successfully")
    else:
        logger.error("NFT collection deployment test failed")


if __name__ == "__main__":
    main() 