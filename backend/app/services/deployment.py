"""Deployment service for universal token contracts."""

from sqlalchemy.orm import Session
from typing import Dict, List, Any

from app.models import TokenModel
from app.utils.logger import logger
from app.utils.web3_helper import (
    get_web3, 
    get_account, 
    deploy_contract, 
    UNIVERSAL_TOKEN_ABI, 
    UNIVERSAL_TOKEN_BYTECODE, 
    ZC_UNIVERSAL_TOKEN_ABI, 
    ZC_UNIVERSAL_TOKEN_BYTECODE,
    call_contract_method,
    # get_zrc20_address # Currently unused in this service
)
# from app.utils.chain_config import get_chain_config # Imported but unused
from web3 import Web3 # Import Web3 directly for to_checksum_address
from sqlalchemy.orm.attributes import flag_modified


class DeploymentService:
    """Service for deploying universal token contracts."""

    async def deploy_universal_token(
        self,
        token_config: Dict[str, Any],
        selected_chains: List[str],
        final_owner_address: str,
        allocations: List[Dict[str, Any]],
        db: Session
    ) -> Dict[str, Any]:
        """
        Deploy, connect, allocate, and transfer ownership for universal tokens.
        
        Args:
            token_config: Token details (name, symbol, decimals, total_supply)
            selected_chains: List of chain IDs to deploy on (strings)
            final_owner_address: Address for final ownership
            allocations: List of {address, amount} for initial distribution
            db: Database session
            
        Returns:
            Dict with deployment results and status.
        """
        logger.info(
            f"Deploying {token_config['token_name']} for {final_owner_address} "
            f"on {len(selected_chains)} chains with {len(allocations)} allocations."
        )
        
        # Get service deployer account (used for transactions)
        service_account = get_account()
        if not service_account:
            deployment = TokenModel(
                token_name=token_config["token_name"],
                token_symbol=token_config["token_symbol"],
                decimals=token_config["decimals"],
                total_supply=token_config["total_supply"],
                deployer_address=final_owner_address,
                deployment_status="failed",
                connected_chains_json={},
                error_message="Failed to load service deployer account"
            )
            db.add(deployment)
            db.commit()
            return {"deploymentId": deployment.id,
                    "error": True,
                    "message": "Failed to load service deployer account"}

        logger.info(f"Service deployer address: {service_account.address}")

        # Create deployment record
        deployment = TokenModel(
            token_name=token_config["token_name"],
            token_symbol=token_config["token_symbol"],
            decimals=token_config["decimals"],
            total_supply=token_config["total_supply"],
            deployer_address=final_owner_address,
            deployment_status="in_progress",
            connected_chains_json={},
        )
        db.add(deployment)
        db.commit()
        db.refresh(deployment)

        deployment_result = {
            "deploymentId": deployment.id,
            "zetaChain": {"status": "pending"},
            "evmChains": {cid: {"status": "pending"} for cid in selected_chains if cid != "7001"}
        }
        
        zc_contract_address = None
        zc_web3 = None
        
        # --- Step 1: Deploy to ZetaChain (Hardcoded ID 7001) ---
        zeta_chain_id_str = "7001"
        zeta_chain_id_int = 7001
        if zeta_chain_id_str in selected_chains:
            logger.info("Deploying ZetaChain contract...")
            zc_web3 = get_web3(zeta_chain_id_int)
            if not zc_web3:
                deployment.deployment_status = "failed"
                err_msg = "Failed to connect to ZetaChain"
                deployment.error_message = err_msg
                db.add(deployment)
                db.commit()
                deployment_result["zetaChain"] = {"status": "failed", "message": err_msg}
                return deployment_result # Early exit

            # ZC Constructor: name, symbol, decimals, initialSupply, initialOwner
            constructor_args = [
                str(token_config["token_name"]),
                str(token_config["token_symbol"]),
                int(token_config["decimals"]),
                int(token_config["total_supply"]), # Minted to service account
                service_account.address # SERVICE ACCOUNT is initial owner
            ]
            logger.info(f"ZetaChain constructor args: {constructor_args}")
            
            try:
                zc_result = deploy_contract(
                    web3=zc_web3, account=service_account,
                    contract_abi=ZC_UNIVERSAL_TOKEN_ABI,
                    contract_bytecode=ZC_UNIVERSAL_TOKEN_BYTECODE,
                    constructor_args=constructor_args
                )
                deployment_result["zetaChain"] = zc_result # Store full result
                
                if zc_result["success"]:
                    zc_contract_address = zc_result["contract_address"]
                    deployment.zc_contract_address = zc_contract_address
                    deployment_result["zetaChain"]["status"] = "deployed"
                    logger.info(f"ZetaChain contract deployed: {zc_contract_address}")
                    db.add(deployment)
                    db.commit() # Commit zc_contract_address immediately
                    logger.info("Saved ZetaChain contract address to database.")
                else:
                    err_msg = zc_result.get('message', 'Unknown ZC deploy error')
                    deployment.error_message = f"ZetaChain deployment failed: {err_msg}"
                    deployment_result["zetaChain"] = {"status": "failed", "message": err_msg}

            except Exception as e:
                logger.error(f"ZetaChain deploy exception: {e}", exc_info=True)
                err_msg = f"ZetaChain deployment exception: {e}"
                deployment_result["zetaChain"] = {"success": False, "error": True,
                                                "message": err_msg, "status": "failed"}
                deployment.error_message = err_msg

        # Check if ZetaChain deployment succeeded before proceeding
        if not zc_contract_address or deployment_result["zetaChain"].get("status") == "failed":
            logger.error("ZC deployment failed/skipped. Aborting further steps.")
            deployment.deployment_status = "failed"
            db.add(deployment)
            db.commit()
            return deployment_result # Exit


        # --- Step 2: Deploy to EVM Chains ---
        deployed_evm_contracts = {} # Store {chain_id_str: address}
        for chain_id_str in selected_chains:
            if chain_id_str == zeta_chain_id_str:
                continue
            
            logger.info(f"Deploying contract to EVM chain {chain_id_str}...")
            try:
                numeric_chain_id = int(chain_id_str)
            except ValueError:
                msg = f"Invalid numeric chain ID: {chain_id_str}"
                deployment_result["evmChains"][chain_id_str] = {"status": "failed", "message": msg}
                continue

            evm_web3 = get_web3(numeric_chain_id)
            if not evm_web3:
                msg = f"Failed to connect to EVM chain {chain_id_str}"
                deployment_result["evmChains"][chain_id_str] = {"status": "failed", "message": msg}
                # Update DB record for this chain
                if not deployment.connected_chains_json: deployment.connected_chains_json = {}
                deployment.connected_chains_json[chain_id_str] = {"status": "failed", "error_message": msg}
                flag_modified(deployment, "connected_chains_json")
                continue # Try next chain

            # EVM Constructor: name, symbol, decimals, initialSupply, currentChainId, initialOwner
            constructor_args = [
                str(token_config["token_name"]),
                str(token_config["token_symbol"]),
                int(token_config["decimals"]),
                0, # Initial supply for EVM contracts is 0
                numeric_chain_id, # Current chain ID
                service_account.address # SERVICE ACCOUNT is initial owner
            ]
            logger.info(f"EVM Chain {chain_id_str} constructor args: {constructor_args}")

            try:
                deploy_result = deploy_contract(
                    web3=evm_web3, account=service_account,
                    contract_abi=UNIVERSAL_TOKEN_ABI,
                    contract_bytecode=UNIVERSAL_TOKEN_BYTECODE,
                    constructor_args=constructor_args
                )

                if deploy_result and deploy_result["success"]:
                    evm_contract_address = deploy_result["contract_address"]
                    deployed_evm_contracts[chain_id_str] = evm_contract_address
                    logger.info(f"EVM contract deployed on {chain_id_str}: {evm_contract_address}")
                    evm_status = {
                        "contract_address": evm_contract_address,
                        "transaction_hash": deploy_result.get("transaction_hash"), 
                        "status": "deployed", # Deployed but not connected/setup yet
                        "verification_status": "pending",
                    }
                    deployment_result["evmChains"][chain_id_str] = evm_status
                    # Update DB immediately with deployment info
                    if not deployment.connected_chains_json: deployment.connected_chains_json = {}
                    deployment.connected_chains_json[chain_id_str] = evm_status
                    flag_modified(deployment, "connected_chains_json")
                else:
                    err_msg = deploy_result.get('message', f'Unknown EVM deploy error on {chain_id_str}')
                    deployment_result["evmChains"][chain_id_str] = {"status": "failed", "message": err_msg}
                    if not deployment.connected_chains_json: deployment.connected_chains_json = {}
                    deployment.connected_chains_json[chain_id_str] = {"status": "failed", "error_message": err_msg}
                    flag_modified(deployment, "connected_chains_json")

            except Exception as e:
                logger.error(f"EVM deploy exception on {chain_id_str}: {e}", exc_info=True)
                err_msg = f"EVM deploy exception: {e}"
                deployment_result["evmChains"][chain_id_str] = {"status": "failed", "message": err_msg}
                if not deployment.connected_chains_json: deployment.connected_chains_json = {}
                deployment.connected_chains_json[chain_id_str] = {"status": "failed", "error_message": err_msg}
                flag_modified(deployment, "connected_chains_json")
        
        # Commit intermediate EVM deployment statuses
        db.add(deployment)
        db.commit()
        db.refresh(deployment) # Ensure we have the latest state

        # --- Step 3: Connect EVM Contracts back to ZetaChain contract ---
        logger.info("Connecting EVM contracts to ZetaChain contract...")
        connection_success_count = 0
        connection_failure_count = 0
        
        if not zc_web3 or not zc_contract_address:
            logger.error("Cannot connect contracts: ZC web3/address unavailable.")
            # Should have exited earlier, but double-check
            deployment.deployment_status = "failed"
            deployment.error_message = deployment.error_message or "ZC connection failed pre-connect step"
            db.add(deployment)
            db.commit()
            return deployment_result

        for chain_id_str, evm_contract_address in deployed_evm_contracts.items():
            logger.info(f"Calling setConnectedContract for chain {chain_id_str} ({evm_contract_address})")
            
            args = None # Initialize args
            status_update = {} # Initialize status update dict
            try:
                # Validate arguments *before* the call
                if not isinstance(evm_contract_address, str) or not evm_contract_address.startswith("0x"):
                    raise ValueError(f"Invalid EVM address format: {evm_contract_address}")
                
                # Args: (uint256 _chainId, address _contractAddress)
                args = (
                    int(chain_id_str), 
                    Web3.to_checksum_address(evm_contract_address)
                )
                logger.debug(f"Prepared args for setConnectedContract: {args}")

                connection_result = await call_contract_method(
                    web3=zc_web3, # Call method on ZetaChain contract
                    account=service_account,
                    contract_address=zc_contract_address,
                    contract_abi=ZC_UNIVERSAL_TOKEN_ABI, # Use ZetaChain ABI
                    method_name="setConnectedContract",
                    args=args
                )

                if connection_result.get("success"):
                    connection_success_count += 1
                    logger.info(f"Successfully connected chain {chain_id_str}")
                    status_update = {"connection_status": "connected"}
                else:
                    connection_failure_count += 1
                    error_msg = connection_result.get("message", "Unknown connection error")
                    logger.error(f"Failed to connect chain {chain_id_str}: {error_msg}")
                    status_update = {"connection_status": "failed", 
                                       "connection_error": error_msg}

            except ValueError as val_err: # Catch specific validation errors
                connection_failure_count += 1
                error_to_report = f"Arg validation failed: {val_err}"
                logger.error(f"Failed preparing setConnectedContract for {chain_id_str}: {error_to_report}",
                             exc_info=True)
                status_update = {"connection_status": "failed", 
                                   "connection_error": error_to_report}
            except Exception as e: # Catch other unexpected errors
                connection_failure_count += 1
                error_to_report = f"Exception during connection: {type(e).__name__} - {e}"
                logger.error(f"Exception connecting {chain_id_str}: {error_to_report}",
                             exc_info=True)
                status_update = {"connection_status": "failed", 
                                   "connection_error": error_to_report}
            
            # Update status in deployment record (ensure key exists)
            if chain_id_str not in deployment.connected_chains_json:
                 logger.warning(f"Chain {chain_id_str} missing in JSON during connection update.")
                 if not deployment.connected_chains_json: deployment.connected_chains_json = {}
                 deployment.connected_chains_json[chain_id_str] = {} # Initialize
            
            deployment.connected_chains_json[chain_id_str].update(status_update)
            flag_modified(deployment, "connected_chains_json") # Mark JSONB as modified

        # Commit connection status updates after the loop
        db.add(deployment)
        db.commit() 
        db.refresh(deployment) # Get latest state again

        # --- Step 4: Connect ZetaChain contract back to EVM contracts ---
        logger.info("Connecting ZetaChain contract back to EVM contracts...")
        set_zeta_success_count = 0
        set_zeta_failure_count = 0

        for chain_id_str, evm_contract_address in deployed_evm_contracts.items():
            # Only try if connection step didn't fail hard for this chain
            current_status = deployment.connected_chains_json.get(chain_id_str, {})
            if current_status.get("connection_status") != "connected":
                logger.warning(f"Skipping setZetaChainContract for {chain_id_str}, connection failed.")
                continue

            logger.info(f"Calling setZetaChainContract on {chain_id_str} ({evm_contract_address})")
            status_update = {} # Reset status update
            try:
                numeric_chain_id = int(chain_id_str)
                evm_web3 = get_web3(numeric_chain_id)
                if not evm_web3:
                    raise ConnectionError(f"Failed to get web3 for chain {chain_id_str}")

                # Args: (address _zetaChainContract)
                args = (Web3.to_checksum_address(zc_contract_address),)

                set_zeta_result = await call_contract_method(
                    web3=evm_web3, # Call on the EVM chain
                    account=service_account,
                    contract_address=evm_contract_address,
                    contract_abi=UNIVERSAL_TOKEN_ABI, # Use EVM ABI
                    method_name="setZetaChainContract", # Assuming this is the method
                    args=args
                )

                if set_zeta_result.get("success"):
                    set_zeta_success_count += 1
                    logger.info(f"Successfully set ZetaChainContract on chain {chain_id_str}")
                    # Final setup status for this chain
                    status_update = {"setup_status": "completed"} 
                else:
                    set_zeta_failure_count += 1
                    error_msg = set_zeta_result.get("message", "Unknown error")
                    logger.error(f"Failed setZetaChainContract on {chain_id_str}: {error_msg}")
                    status_update = {"setup_status": "setZeta_failed", 
                                       "setup_error": error_msg}

            except Exception as e:
                set_zeta_failure_count += 1
                error_to_report = f"Exception setting ZetaContract: {type(e).__name__} - {e}"
                logger.error(f"Exception setting ZC on {chain_id_str}: {error_to_report}",
                             exc_info=True)
                status_update = {"setup_status": "setZeta_failed", 
                                   "setup_error": error_to_report}
            
            # Update status in deployment record
            if chain_id_str in deployment.connected_chains_json:
                deployment.connected_chains_json[chain_id_str].update(status_update)
            else:
                 logger.warning(f"Chain {chain_id_str} missing in JSON during setZeta update.")
                 if not deployment.connected_chains_json: deployment.connected_chains_json = {}
                 deployment.connected_chains_json[chain_id_str] = status_update # Initialize

            flag_modified(deployment, "connected_chains_json")

        # Commit setup status updates after the loop
        db.add(deployment)
        db.commit()
        db.refresh(deployment)

        # --- Step 5: Handle Initial Allocations (on ZetaChain) ---
        logger.info(f"Processing {len(allocations)} initial allocations...")
        allocation_success_count = 0
        allocation_failure_count = 0

        if not zc_web3 or not zc_contract_address:
            logger.error("Cannot allocate: ZetaChain deployment failed.")
            # Update overall status and return
            deployment.deployment_status = "failed"
            deployment.error_message = deployment.error_message or "ZC unavailable for alloc"
            db.add(deployment)
            db.commit()
            return deployment_result

        for allocation in allocations:
            to_address = allocation['address']
            amount_str = allocation['amount']
            logger.info(f"Allocating {amount_str} tokens to {to_address}")
            
            try:
                amount_int = int(amount_str)
                if amount_int <= 0: raise ValueError("Amount must be positive")
                
                # Use transfer from SERVICE ACCOUNT (which owns initial supply)
                # Args: (address recipient, uint256 amount)
                args = (
                    Web3.to_checksum_address(to_address),
                    amount_int
                )

                transfer_result = await call_contract_method(
                    web3=zc_web3, # On ZetaChain
                    account=service_account,
                    contract_address=zc_contract_address,
                    contract_abi=ZC_UNIVERSAL_TOKEN_ABI,
                    method_name="transfer",
                    args=args
                )

                if transfer_result.get("success"):
                    allocation_success_count += 1
                    logger.info(f"Successfully transferred {amount_str} to {to_address}")
                else:
                    allocation_failure_count += 1
                    error_msg = transfer_result.get("message", "Unknown transfer error")
                    logger.error(f"Failed allocation to {to_address}: {error_msg}")
                    # TODO: Record allocation failures? Add to error_message?

            except ValueError as val_err:
                allocation_failure_count += 1
                logger.error(f"Invalid allocation data for {to_address}: {val_err}")
            except Exception as e:
                allocation_failure_count += 1
                logger.error(f"Exception during allocation to {to_address}: {e}",
                             exc_info=True)

        logger.info(f"Allocation summary: {allocation_success_count} successful, {allocation_failure_count} failed")
        if allocation_failure_count > 0:
            # Append general error message if needed
            alloc_err = "Some initial allocations failed."
            deployment.error_message = f"{deployment.error_message or ''}; {alloc_err}".strip("; ")


        # --- Step 6: Transfer Ownership ---
        logger.info(f"Transferring ownership to final owner: {final_owner_address}")
        ownership_success_count = 0
        ownership_failure_count = 0
        final_owner_checksum = Web3.to_checksum_address(final_owner_address)

        # 6a: Transfer ZetaChain contract ownership
        logger.info(f"Transferring ownership of ZetaChain contract {zc_contract_address}")
        try:
            # Args: (address newOwner)
            args = (final_owner_checksum,)
            transfer_zc_owner_result = await call_contract_method(
                web3=zc_web3,
                account=service_account, # Current owner
                contract_address=zc_contract_address,
                contract_abi=ZC_UNIVERSAL_TOKEN_ABI,
                method_name="transferOwnership", # Standard Ownable method
                args=args
            )
            if transfer_zc_owner_result.get("success"):
                ownership_success_count += 1
                logger.info(f"Successfully initiated ownership transfer on ZetaChain")
                deployment_result["zetaChain"]["ownership_status"] = "transferred"
            else:
                ownership_failure_count += 1
                error_msg = transfer_zc_owner_result.get("message", "Unknown error")
                logger.error(f"Failed ZC ownership transfer: {error_msg}")
                deployment_result["zetaChain"]["ownership_status"] = "failed"
                deployment_result["zetaChain"]["ownership_error"] = error_msg

        except Exception as e:
            ownership_failure_count += 1
            error_to_report = f"Exception transferring ZC ownership: {type(e).__name__} - {e}"
            logger.error(error_to_report, exc_info=True)
            deployment_result["zetaChain"]["ownership_status"] = "failed"
            deployment_result["zetaChain"]["ownership_error"] = error_to_report


        # 6b: Transfer EVM contracts ownership
        for chain_id_str, evm_contract_address in deployed_evm_contracts.items():
            # Only transfer ownership if deployment & connection were likely ok
            # Check setup_status from Step 4
            current_status = deployment.connected_chains_json.get(chain_id_str, {})
            if current_status.get("setup_status") != "completed":
                logger.warning(f"Skipping ownership transfer for {chain_id_str}, setup not completed.")
                continue

            logger.info(f"Transferring ownership of EVM contract on {chain_id_str} ({evm_contract_address})")
            status_update = {}
            try:
                numeric_chain_id = int(chain_id_str)
                evm_web3 = get_web3(numeric_chain_id)
                if not evm_web3:
                    raise ConnectionError(f"Failed to get web3 for chain {chain_id_str}")

                # Args: (address newOwner)
                args = (final_owner_checksum,)
                transfer_evm_owner_result = await call_contract_method(
                    web3=evm_web3,
                    account=service_account, # Current owner
                    contract_address=evm_contract_address,
                    contract_abi=UNIVERSAL_TOKEN_ABI, # EVM ABI
                    method_name="transferOwnership",
                    args=args
                )

                if transfer_evm_owner_result.get("success"):
                    ownership_success_count += 1
                    logger.info(f"Successfully initiated ownership transfer on {chain_id_str}")
                    status_update = {"ownership_status": "transferred"}
                else:
                    ownership_failure_count += 1
                    error_msg = transfer_evm_owner_result.get("message", "Unknown error")
                    logger.error(f"Failed EVM ownership transfer on {chain_id_str}: {error_msg}")
                    status_update = {"ownership_status": "failed", 
                                       "ownership_error": error_msg}

            except Exception as e:
                ownership_failure_count += 1
                error_to_report = f"Exception transferring EVM ownership: {type(e).__name__} - {e}"
                logger.error(f"Exception transferring EVM ownership on {chain_id_str}: {error_to_report}",
                             exc_info=True)
                status_update = {"ownership_status": "failed", 
                                   "ownership_error": error_to_report}

            # Update status in deployment record
            if chain_id_str in deployment.connected_chains_json:
                deployment.connected_chains_json[chain_id_str].update(status_update)
            else:
                 logger.warning(f"Chain {chain_id_str} missing in JSON during ownership update.")
                 if not deployment.connected_chains_json: deployment.connected_chains_json = {}
                 deployment.connected_chains_json[chain_id_str] = status_update # Initialize
             
            flag_modified(deployment, "connected_chains_json")

        logger.info(f"Ownership transfer summary: {ownership_success_count} successful, {ownership_failure_count} failed")
        if ownership_failure_count > 0:
            owner_err = "Some ownership transfers failed."
            deployment.error_message = f"{deployment.error_message or ''}; {owner_err}".strip("; ")


        # --- Step 7: Final Update and Return --- 
        # Determine overall status based on critical steps (ZC deploy, connections, ownership)
        final_status = "completed"
        if deployment_result["zetaChain"].get("status") == "failed" or \
           connection_failure_count > 0 or \
           set_zeta_failure_count > 0 or \
           ownership_failure_count > 0:
            final_status = "completed_with_errors"
        
        # If ZC deploy failed critically earlier, status might already be 'failed'
        if deployment.deployment_status == "failed":
            final_status = "failed"
        else:
            deployment.deployment_status = final_status  # Update status in DB

        logger.info(f"Final deployment status: {deployment.deployment_status}")
        
        # Final commit
        db.add(deployment)
        db.commit()
        
        # Return the detailed results collected throughout the process
        # Ensure the returned dict includes final statuses from the DB model if needed
        deployment_result["final_status"] = deployment.deployment_status
        deployment_result["error_message"] = deployment.error_message
        return deployment_result

# Instantiate service
deployment_service = DeploymentService() 