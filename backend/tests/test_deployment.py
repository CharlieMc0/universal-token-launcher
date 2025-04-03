"""Script to test token deployment via the API."""

import asyncio
import json
import argparse
import pytest  # Import pytest
import os
# from dotenv import load_dotenv # Removed unused import

# Add parent directory to path if running script directly
import sys

parent_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, parent_dir)

from app.services.deployment import DeploymentService
from app.utils.web3_helper import load_contract_data
from app.utils.chain_config import get_enabled_chains
from app.db import SessionLocal  # Import SessionLocal
from app.config import Config


# Load environment variables if running directly
# if __name__ == "__main__":
#     load_dotenv()


def get_default_deployment_payload():
    """Returns the default payload for testing deployment."""
    return {
        "user_address": "0x7C1739ff2D1E3BaB231Cd728C6f99DadF801c60E",
        "token_name": "Test Universal Token",
        "token_symbol": "TUT",
        "decimals": 18,
        "initial_supply": "1000000",
        "target_chain_ids": ["7001", "11155111"],  # ZetaChain Testnet, Sepolia
        "initial_distribution": [
            {
                "address": "0x7C1739ff2D1E3BaB231Cd728C6f99DadF801c60E",
                "amount": "500000",
                "chain_id": "7001",
            },
            {
                "address": "0x7C1739ff2D1E3BaB231Cd728C6f99DadF801c60E",
                "amount": "500000",
                "chain_id": "11155111",
            },
        ],
    }


@pytest.mark.asyncio  # Add the asyncio marker
async def test_token_deployment(testnet_only=False, max_chains=None):
    """
    Tests the token deployment functionality.

    Args:
        testnet_only (bool): If True, only deploy to testnet chains.
                             Defaults to False.
        max_chains (int, optional): Max number of EVM chains to deploy to.
                                  Defaults to None (all configured chains).
    """
    print("Starting token deployment test...")
    config = Config()
    print(f"Using deployer key from config: {bool(config.DEPLOYER_PRIVATE_KEY)}")

    # Load contract data
    load_contract_data()

    payload = get_default_deployment_payload()

    # Get enabled chains
    enabled_chains_dict = get_enabled_chains()
    target_chain_ids = payload["target_chain_ids"]

    if testnet_only:
        testnet_ids = [
            chain_id for chain_id, info in enabled_chains_dict.items() if info.get("testnet")
        ]
        target_chain_ids = [cid for cid in target_chain_ids if cid in testnet_ids]
        print(f"Filtering to testnets: {target_chain_ids}")

    if max_chains is not None:
        # Ensure ZetaChain (if present) is included, then add EVM chains
        zetachain_id = str(config.ZETACHAIN_ID)
        evm_chains = [cid for cid in target_chain_ids if cid != zetachain_id]
        if zetachain_id in target_chain_ids:
            target_chain_ids = [zetachain_id] + evm_chains[: max_chains - 1]
        else:
            target_chain_ids = evm_chains[:max_chains]
        print(f"Limiting to {max_chains} chains: {target_chain_ids}")

    payload["target_chain_ids"] = target_chain_ids

    # Adjust initial distribution to match filtered chains
    payload["initial_distribution"] = [
        dist
        for dist in payload["initial_distribution"]
        if dist["chain_id"] in target_chain_ids
    ]

    print("\nDeployment Payload:")
    print(json.dumps(payload, indent=2))

    deployer = DeploymentService()
    db = SessionLocal()  # Create DB session
    print("\nInitiating deployment...")

    try:
        # Extract args from payload and call correct method
        token_config_args = {
            "token_name": payload["token_name"],
            "token_symbol": payload["token_symbol"],
            "decimals": payload["decimals"],
            "total_supply": payload["initial_supply"], # Assuming payload's initial_supply is total_supply for the contract
        }
        result = await deployer.deploy_universal_token(
            token_config=token_config_args,
            selected_chains=payload["target_chain_ids"],
            final_owner_address=payload["user_address"],
            allocations=payload["initial_distribution"],
            db=db  # Pass the db session
        )
        print("\nDeployment Result:")
        print(json.dumps(result, indent=2))

        assert result["final_status"] == "completed"
        assert "deploymentId" in result
        # Check if the number of deployed contracts matches expected chains
        deployed_count = 0
        if "zetaChain" in result and result["zetaChain"].get("contract_address"):
            deployed_count += 1
        if "evmChains" in result:
            deployed_count += len(result["evmChains"])
        assert deployed_count == len(target_chain_ids)

        print("\nBasic deployment checks passed.")

        # Further checks (contract connection, ownership, etc.) could be added
        # if needed, potentially using direct web3 calls after deployment.

    except Exception as e:
        print(f"\nDeployment failed with exception: {e}")
        pytest.fail(f"Deployment raised an exception: {e}")
    finally:
        db.close() # Ensure DB session is closed


# if __name__ == "__main__":
#     parser = argparse.ArgumentParser(
#         description="Test Token Deployment Script"
#     )
#     parser.add_argument(
#         "--testnet-only",
#         action="store_true",
#         help="Only deploy to configured testnet chains.",
#     )
#     parser.add_argument(
#         "--max-chains",
#         type=int,
#         help="Maximum number of EVM chains to deploy to (excluding ZetaChain).",
#         default=None,
#     )
#     args = parser.parse_args()

#     asyncio.run(
#         test_token_deployment(
#             testnet_only=args.testnet_only, max_chains=args.max_chains
#         )
#     ) 