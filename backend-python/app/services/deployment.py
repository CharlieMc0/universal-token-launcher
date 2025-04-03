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
    get_zrc20_address
)
from app.utils.chain_config import get_chain_config


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
        Deploy a universal token across multiple chains, connect them,
        handle initial allocations, and transfer ownership.
        
        Args:
            token_config: Token configuration information
            selected_chains: List of chain IDs to deploy on
            final_owner_address: Address that will receive final ownership
            allocations: List of addresses and amounts for initial distribution
            db: Database session
            
        Returns:
            Dict with deployment results
        """
        logger.info(
            f"Deploying token {token_config['token_name']} "
            f"for owner {final_owner_address} on {len(selected_chains)} chains "
            f"with {len(allocations)} allocations."
        )
        
        # Get service deployer account (used for transactions)
        service_account = get_account()
        if not service_account:
            # Handle error: Cannot proceed without service deployer account
            # (Existing error handling logic seems appropriate here)
            
            # Create deployment record with initial status
            deployment = TokenModel(
                token_name=token_config["token_name"],
                token_symbol=token_config["token_symbol"],
                decimals=token_config["decimals"],
                total_supply=token_config["total_supply"],
                deployer_address=final_owner_address,  # Store final owner
                deployment_status="failed",
                connected_chains_json={},
                error_message="Failed to load service deployer account"
            )
            db.add(deployment)
            db.commit()
            return {
                "deploymentId": deployment.id,  # Return ID on early failure
                "error": True,
                "message": "Failed to load service deployer account. Cannot deploy."
            }

        logger.info(f"Service deployer address: {service_account.address}")

        # Create deployment record
        deployment = TokenModel(
            token_name=token_config["token_name"],
            token_symbol=token_config["token_symbol"],
            decimals=token_config["decimals"],
            total_supply=token_config["total_supply"],
            deployer_address=final_owner_address,
            # Store final owner
            deployment_status="in_progress",
            connected_chains_json={},
            # TODO: Add allocations to model?
        )
        
        db.add(deployment)
        db.commit()
        db.refresh(deployment)

        # Initialize result structure
        deployment_result = {
            "deploymentId": deployment.id,
            "zetaChain": {"status": "pending"},
            "evmChains": {chain_id: {"status": "pending"} for chain_id in selected_chains if chain_id != "7001"}
        }
        
        zc_contract_address = None
        zc_web3 = None
        
        # --- Step 1: Deploy to ZetaChain ---
        zeta_chain_id_str = "7001"
        zeta_chain_id_int = 7001
        if zeta_chain_id_str in selected_chains:
            logger.info("Deploying ZetaChain contract...")
            zc_web3 = get_web3(zeta_chain_id_int)
            if not zc_web3:
                # (Existing error handling)
                deployment.deployment_status = "failed"
                deployment.error_message = "Failed to connect to ZetaChain"
                db.add(deployment)
                db.commit()
                deployment_result["zetaChain"]["status"] = "failed"
                deployment_result["zetaChain"]["message"] = "Failed to connect to ZetaChain"
                # Note: Consider if returning immediately vs continuing EVM
                return deployment_result # Early exit if ZC connection fails

            # Use SERVICE ACCOUNT for deployment and initial ownership
            constructor_args = [
                str(token_config["token_name"]),
                str(token_config["token_symbol"]),
                int(token_config["decimals"]),
                int(token_config["total_supply"]),  # Initial supply minted to deployer
                service_account.address  # SERVICE ACCOUNT is initial owner
            ]
            
            logger.info(f"ZetaChain constructor args: {constructor_args}")
            
            try:
                zc_result = deploy_contract(
                    web3=zc_web3,
                    account=service_account,
                    contract_abi=ZC_UNIVERSAL_TOKEN_ABI,
                    contract_bytecode=ZC_UNIVERSAL_TOKEN_BYTECODE,
                    constructor_args=constructor_args
                )
                deployment_result["zetaChain"] = zc_result # Store full result
                
                if zc_result["success"]:
                    zc_contract_address = zc_result["contract_address"]
                    deployment.zc_contract_address = zc_contract_address
                    deployment_result["zetaChain"]["status"] = "deployed"
                    logger.info(f"ZetaChain contract deployed at: {zc_contract_address}")
                    
                    # Immediately commit to ensure zc_contract_address is saved
                    db.add(deployment)
                    db.commit()
                    logger.info(
                        f"Saved ZetaChain contract address to database: {zc_contract_address}"
                    )
                else:
                    error_msg = zc_result.get('message', 'Unknown ZetaChain deployment error')
                    deployment.error_message = f"ZetaChain deployment failed: {error_msg}"
                    deployment_result["zetaChain"]["status"] = "failed"
                    deployment_result["zetaChain"]["message"] = error_msg
                    # Consider if we should stop here if ZC deployment fails

            except Exception as e:
                logger.error(f"ZetaChain deployment exception: {str(e)}", exc_info=True)
                error_msg = f"ZetaChain deployment exception: {str(e)}"
                deployment_result["zetaChain"] = {
                    "success": False, "error": True, "message": error_msg, "status": "failed"
                }
                deployment.error_message = error_msg
                # Consider stopping if ZC fails

        # Check if ZetaChain deployment was successful before proceeding
        if not zc_contract_address or deployment_result["zetaChain"]["status"] == "failed":
             logger.error("ZetaChain contract deployment failed or skipped. Cannot proceed with EVM deployments or setup.")
             deployment.deployment_status = "failed" # Mark overall status
             db.add(deployment)
             db.commit()
             return deployment_result # Exit


        # --- Step 2: Deploy to EVM Chains ---
        deployed_evm_contracts = {} # Store {chain_id: address} for successful deployments
        for chain_id_str in selected_chains:
            if chain_id_str == zeta_chain_id_str:
                continue
            
            logger.info(f"Deploying contract to EVM chain {chain_id_str}...")
            numeric_chain_id = int(chain_id_str)
            evm_web3 = get_web3(numeric_chain_id)

            if not evm_web3:
                # (Existing error handling for connection failure)
                message = f"Failed to connect to EVM chain {chain_id_str}"
                deployment_result["evmChains"][chain_id_str] = {
                    "success": False, "error": True, "message": message, "status": "failed"
                }
                if not deployment.connected_chains_json: deployment.connected_chains_json = {}
                deployment.connected_chains_json[chain_id_str] = {"status": "failed", "error_message": message}
                continue # Try next chain

            # Use SERVICE ACCOUNT for deployment
            # Get chain config to find the gateway address
            chain_config = get_chain_config(numeric_chain_id)
            # gateway_address is NOT needed for this constructor based on ABI
            # default_gas_for_cc is NOT needed for this constructor

            # --- DEPLOY EVM CONTRACT (with constructor args) ---
            # Constructor args based on EVMUniversalToken.json ABI:
            # (name_, symbol_, decimals_, initialSupply, currentChainId, initialOwner)
            constructor_args = [
                str(token_config["token_name"]),
                str(token_config["token_symbol"]),
                int(token_config["decimals"]),
                0,  # initialSupply - confirmed 0 is okay
                numeric_chain_id,           # currentChainId
                service_account.address   # initialOwner (service account)
            ]
            logger.info(f"EVM Chain {chain_id_str} constructor args: {constructor_args}")

            try:
                # Deploy the contract with constructor args
                deploy_result = deploy_contract(
                    web3=evm_web3,
                    account=service_account,
                    contract_abi=UNIVERSAL_TOKEN_ABI,
                    contract_bytecode=UNIVERSAL_TOKEN_BYTECODE,
                    constructor_args=constructor_args
                )

                # Check deployment result
                if deploy_result and deploy_result["success"]:
                    evm_contract_address = deploy_result["contract_address"]
                    deployed_evm_contracts[chain_id_str] = evm_contract_address
                    logger.info(f"EVM contract deployed on chain {chain_id_str} at: {evm_contract_address}")

                    # --- Record Success --- 
                    deployment_result["evmChains"][chain_id_str] = {
                        "success": True,
                        "error": False,
                        "contract_address": evm_contract_address,
                        "transaction_hash": deploy_result.get("transaction_hash"),
                        "status": "deployed", # Status after successful deployment
                    }
                    if not deployment.connected_chains_json: deployment.connected_chains_json = {}
                    deployment.connected_chains_json[chain_id_str] = {
                        "contract_address": evm_contract_address,
                        "transaction_hash": deploy_result.get("transaction_hash"), 
                        "status": "deployed",
                        "verification_status": "pending",
                        "setup_status": "pending" # Needs setUniversal etc.
                    }
                    
                    # Immediately commit to ensure connected_chains_json is saved
                    db.add(deployment)
                    db.commit()
                    logger.info(
                        f"Saved EVM contract for chain {chain_id_str} to database: "
                        f"{evm_contract_address}"
                    )
                else:
                    # Deployment failed
                    error_msg = f"EVM contract deployment failed: {deploy_result.get('message', 'Unknown error')}"
                    logger.error(error_msg)
                    # Store failure information
                    if not deployment.connected_chains_json: deployment.connected_chains_json = {}
                    deployment.connected_chains_json[chain_id_str] = {
                        "status": "failed",
                        "error_message": error_msg
                    }
                    deployment_result["evmChains"][chain_id_str] = {
                        "success": False,
                        "error": True,
                        "message": error_msg,
                        "status": "failed"
                    }
                    continue # Continue to next chain

            except Exception as e:
                # Catch other exceptions during deployment attempt
                logger.error(f"EVM Chain {chain_id_str} deployment exception: {str(e)}", exc_info=True)
                error_msg = f"EVM Chain {chain_id_str} deployment exception: {str(e)}"
                deployment_result["evmChains"][chain_id_str] = {
                    "success": False, "error": True, "message": error_msg, "status": "deploy_failed"
                }
                if not deployment.connected_chains_json: deployment.connected_chains_json = {}
                deployment.connected_chains_json[chain_id_str] = {"status": "deploy_failed", "error_message": error_msg}
                continue # Continue to next chain

        # --- Step 3 & 4: Connect Contracts (setConnected & setUniversal) ---
        logger.info("Connecting deployed contracts...")
        for chain_id_str, evm_contract_address in deployed_evm_contracts.items():
            numeric_chain_id = int(chain_id_str)
            logger.info(f"Connecting ZetaChain contract to EVM contract on chain {chain_id_str} ({evm_contract_address})")
            
            # --- 3a: Call setConnectedContract on ZetaChain contract ---
            try:
                 # We don't need the ZRC-20 address for setConnectedContract
                 # We need the target chainId and the deployed EVM contract address

                logger.info(f"Calling setConnectedContract on {zc_contract_address} with "
                            f"Chain ID: {numeric_chain_id} and EVM addr: {evm_contract_address}")
                tx_receipt_connected = await call_contract_method(
                    web3=zc_web3,
                    account=service_account,
                    contract_address=zc_contract_address,
                    contract_abi=ZC_UNIVERSAL_TOKEN_ABI, # Correct ABI
                    method_name="setConnectedContract", # <<< ENSURE THIS IS CORRECT
                    args=(numeric_chain_id, evm_contract_address) # Correct args
                )
                # Check tx_receipt_connected for success
                if tx_receipt_connected and tx_receipt_connected.get('success') is True:
                     logger.info(f"setConnectedContract successful for chain {chain_id_str}")
                     deployment.connected_chains_json[chain_id_str]["setup_status"] = "setConnected_done" # Update status
                else:
                    raise Exception(
                        f"setConnectedContract transaction failed or reverted for chain {chain_id_str}. "
                        f"Result: {tx_receipt_connected}"
                    )

            except Exception as e:
                logger.error(f"Failed to call setConnectedContract for chain {chain_id_str}: {str(e)}", exc_info=True)
                deployment.connected_chains_json[chain_id_str]["setup_status"] = "setConnected_failed"
                deployment.connected_chains_json[chain_id_str]["error_message"] = f"setConnectedContract failed: {str(e)}"

            # --- 3b: Call setUniversal on EVM contract ---
            # Check if the EVM contract has a method like setUniversal or setZetaChainContract
            # Assuming the EVM artifact has setZetaChainContract based on ZC contract
            # TODO: Verify EVMUniversalToken.json ABI for this method name!
            evm_set_method_name = "setZetaChainContract" # Assuming based on ZC ABI pattern

            # Only proceed if setConnectedContract was attempted and didn't fail hard
            if deployment.connected_chains_json[chain_id_str].get("setup_status") == "setConnected_done":
                try:
                    evm_web3 = get_web3(numeric_chain_id)
                    if not evm_web3:
                         raise ConnectionError(f"Failed to reconnect to EVM chain {chain_id_str} for {evm_set_method_name}")

                    logger.info(f"Calling {evm_set_method_name} on EVM contract {evm_contract_address} "
                                f"(Chain {chain_id_str}) with ZC addr: {zc_contract_address}")
                    tx_receipt_universal = await call_contract_method(
                        web3=evm_web3,
                        account=service_account,
                        contract_address=evm_contract_address,
                        contract_abi=UNIVERSAL_TOKEN_ABI, # Use EVM ABI
                        method_name=evm_set_method_name, # Use assumed/verified method name
                        args=(zc_contract_address,)
                    )
                    # Check tx_receipt_universal for success
                    if tx_receipt_universal and tx_receipt_universal.get('success') is True:
                        logger.info(f"{evm_set_method_name} successful for chain {chain_id_str}")
                        deployment.connected_chains_json[chain_id_str]["setup_status"] = "connected" # Both steps done
                    else:
                         raise Exception(
                            f"{evm_set_method_name} transaction failed or reverted for chain {chain_id_str}. "
                            f"Result: {tx_receipt_universal}"
                         )

                except Exception as e:
                    logger.error(f"Failed to call {evm_set_method_name} for chain {chain_id_str}: {str(e)}", exc_info=True)
                    deployment.connected_chains_json[chain_id_str]["setup_status"] = "setUniversal_failed" # Keep generic failure status name?
                    error_key = "error_message"
                    existing_error = deployment.connected_chains_json[chain_id_str].get(error_key, "")
                    new_error = f"{evm_set_method_name} failed: {str(e)}"
                    deployment.connected_chains_json[chain_id_str][error_key] = (
                        f"{existing_error}; {new_error}" if existing_error else new_error
                    )
            else:
                 logger.warning(
                    f"Skipping {evm_set_method_name} for chain {chain_id_str} because "
                    f"setConnectedContract did not succeed."
                 )


        # --- Step 5: Handle Initial Allocations (on ZetaChain) ---
        logger.info("Processing initial token allocations on ZetaChain...")
        allocation_errors = False
        if zc_contract_address and allocations:
             # Ensure we have a valid web3 instance for ZetaChain
             if not zc_web3: zc_web3 = get_web3(zeta_chain_id_int)

             if zc_web3:
                for allocation in allocations:
                    to_address = allocation.get("address")
                    amount_str = allocation.get("amount")
                    if (not to_address or not isinstance(to_address, str) or
                            not to_address.startswith("0x") or amount_str is None):
                        logger.warning(f"Skipping invalid allocation format: {allocation}")
                        allocation_errors = True  # Mark potential issue
                        continue
                    
                    try:
                        # Validate address checksum
                        try:
                             to_address = zc_web3.to_checksum_address(to_address)
                        except ValueError:
                             logger.error(f"Invalid checksum address in allocation: {to_address}")
                             allocation_errors = True
                             continue

                        amount_int = int(amount_str)
                        if amount_int < 0:
                             logger.error(
                                 f"Invalid negative amount in allocation: {amount_int}"
                             )
                             allocation_errors = True
                             continue
                        
                        if amount_int == 0:
                             logger.info(f"Skipping zero amount allocation to {to_address}")
                             continue


                        logger.info(
                            f"Transferring {amount_int} tokens to {to_address} "
                            f"on ZetaChain ({zc_contract_address})"
                        )
                        
                        # TODO: Need call_contract_method helper
                        tx_receipt_transfer = await call_contract_method(
                            web3=zc_web3,
                            account=service_account, # Use service account (current owner)
                            contract_address=zc_contract_address,
                            contract_abi=ZC_UNIVERSAL_TOKEN_ABI, # ABI includes ERC20 transfer
                            method_name="transfer",
                            args=(to_address, amount_int)
                        )
                        # Check tx_receipt_transfer status CORRECTLY
                        if tx_receipt_transfer and tx_receipt_transfer.get('success') is True:
                            logger.info(f"Successfully transferred {amount_int} to {to_address}")
                            # TODO: Optionally record allocation success/failure in DB?
                        else:
                             allocation_errors = True
                             receipt_info = tx_receipt_transfer or {"message": "No receipt"}
                             logger.error(
                                 f"Initial transfer transaction failed for {to_address}. "
                                 f"Result: {receipt_info}"
                             )
                             # Optionally store specific error per allocation?

                    except ValueError:
                         logger.error(
                             f"Invalid non-integer amount in allocation: {allocation}"
                         )
                         allocation_errors = True
                    except Exception as e:
                        logger.error(
                            f"Failed to transfer initial allocation to {to_address}: {e}",
                            exc_info=True
                        )
                        allocation_errors = True
                        # TODO: Decide how to handle allocation failures.
                
                if allocation_errors:
                     deployment.error_message = (
                         (deployment.error_message or "") +
                         "; One or more allocation transfers failed"
                     )

             else:
                 logger.error("Cannot process allocations: ZetaChain connection lost.")
                 deployment.error_message = (
                     (deployment.error_message or "") +
                     "; Could not connect to ZetaChain for allocations"
                 )
                 allocation_errors = True


        # --- Step 6: Transfer Ownership ---
        logger.info(f"Transferring ownership to final owner: {final_owner_address}")
        ownership_transfer_failed = False
        # Validate final owner address
        try:
            final_owner_address_checksum = zc_web3.to_checksum_address(
                final_owner_address) if zc_web3 else final_owner_address
        except ValueError:
             logger.error(
                 f"Invalid final_owner_address: {final_owner_address}. "
                 f"Skipping ownership transfer."
             )
             ownership_transfer_failed = True
             final_owner_address_checksum = None  # Prevent transfer attempts
             deployment.error_message = (
                 (deployment.error_message or "") +
                 f"; Invalid final owner address ({final_owner_address})"
             )

        # Transfer ownership on ZetaChain
        if zc_contract_address and zc_web3 and final_owner_address_checksum:
            try:
                logger.info(f"Transferring ownership of ZetaChain contract {zc_contract_address}...")
                # TODO: Need call_contract_method helper
                tx_receipt_own_zc = await call_contract_method(
                    web3=zc_web3,
                    account=service_account,
                    contract_address=zc_contract_address,
                    contract_abi=ZC_UNIVERSAL_TOKEN_ABI, # Use appropriate ABI (OwnableUpgradeable is inherited)
                    method_name="transferOwnership",
                    args=(final_owner_address_checksum,)
                )
                if tx_receipt_own_zc and tx_receipt_own_zc.get('status') == 1:
                    logger.info(f"ZetaChain ownership transferred successfully.")
                    deployment_result["zetaChain"]["ownership_status"] = "transferred"
                else:
                    raise Exception(
                        f"ZetaChain transferOwnership transaction failed. "
                        f"Receipt: {tx_receipt_own_zc}"
                    )
            except Exception as e:
                logger.error(f"Failed to transfer ownership on ZetaChain: {e}",
                             exc_info=True)
                ownership_transfer_failed = True
                deployment_result["zetaChain"]["ownership_status"] = "failed"
                deployment.error_message = (
                    (deployment.error_message or "") +
                    "; ZetaChain ownership transfer failed"
                )


        # Transfer ownership on EVM chains
        for chain_id_str, evm_contract_address in deployed_evm_contracts.items():
             if not final_owner_address_checksum: continue # Skip if owner address invalid

             # Check if the contract setup was successful enough to warrant ownership transfer
             chain_info = deployment.connected_chains_json.get(chain_id_str, {})
             setup_status = chain_info.get("setup_status")
             deployment_status = chain_info.get("status")
             
             # Only attempt transfer if deployment succeeded and connection steps didn't fail hard
             should_transfer_evm_ownership = (
                 deployment_status == "deployed" and 
                 setup_status not in ["setConnected_failed", "setUniversal_failed"] 
             )

             if not should_transfer_evm_ownership:
                 logger.warning(
                     f"Skipping ownership transfer on chain {chain_id_str} due to "
                     f"prior deployment/setup status: {setup_status or deployment_status}."
                 )
                 deployment_result["evmChains"][chain_id_str]["ownership_status"] = "skipped"
                 # Ensure setup status reflects completion or failure
                 if setup_status == "connected":  # If connection was done
                      chain_info["setup_status"] = "connected_ownership_skipped"
                 continue

             numeric_chain_id = int(chain_id_str)
             evm_web3 = get_web3(numeric_chain_id)
             if not evm_web3:
                 logger.error(
                     f"Cannot transfer ownership on chain {chain_id_str}: "
                     f"connection failed."
                 )
                 ownership_transfer_failed = True
                 deployment_result["evmChains"][chain_id_str]["ownership_status"] = \
                     "failed_connection"
                 chain_info["error_message"] = (
                     chain_info.get("error_message","") +
                     "; Connection failed for ownership transfer"
                 )
                 chain_info["setup_status"] = "ownership_failed_connection"
                 continue

             # Validate final owner address checksum for this specific chain
             try:
                  final_owner_address_checksum_evm = \
                      evm_web3.to_checksum_address(final_owner_address)
             except ValueError:
                  logger.error(
                      f"Invalid final_owner_address for EVM chain {chain_id_str}: "
                      f"{final_owner_address}. Skipping transfer."
                  )
                  ownership_transfer_failed = True
                  deployment_result["evmChains"][chain_id_str]["ownership_status"] = \
                      "failed_invalid_address"
                  chain_info["error_message"] = (
                      chain_info.get("error_message","") +
                      "; Invalid final owner address for this chain"
                  )
                  chain_info["setup_status"] = "ownership_failed_invalid_address"
                  continue


             try:
                 logger.info(f"Transferring ownership of EVM contract {evm_contract_address} on chain {chain_id_str}...")
                 # TODO: Need call_contract_method helper
                 tx_receipt_own_evm = await call_contract_method(
                     web3=evm_web3,
                     account=service_account,
                     contract_address=evm_contract_address,
                     contract_abi=UNIVERSAL_TOKEN_ABI, # Use appropriate ABI
                     method_name="transferOwnership",
                     args=(final_owner_address_checksum_evm,)
                 )
                 if tx_receipt_own_evm and tx_receipt_own_evm.get('status') == 1:
                     logger.info(f"EVM chain {chain_id_str} ownership transferred.")
                     deployment_result["evmChains"][chain_id_str]["ownership_status"] = \
                         "transferred"
                     # Mark overall setup done including ownership
                     chain_info["setup_status"] = "completed"
                 else:
                     raise Exception(
                         f"EVM chain {chain_id_str} transferOwnership tx failed. "
                         f"Receipt: {tx_receipt_own_evm}"
                     )

             except Exception as e:
                 logger.error(
                     f"Failed to transfer ownership on EVM chain {chain_id_str}: {e}",
                     exc_info=True
                 )
                 ownership_transfer_failed = True
                 deployment_result["evmChains"][chain_id_str]["ownership_status"] = \
                     "failed"
                 chain_info["error_message"] = (
                     chain_info.get("error_message","") +
                     f"; Ownership transfer failed: {str(e)}"
                 )
                 # Final status
                 chain_info["setup_status"] = "ownership_failed"


        # --- Step 7: Update Final Deployment Status ---
        # Determine overall status based on deployment, connection, allocation, and ownership steps
        all_steps_successful = True
        partial_success = False
        any_successful_deployment = False

        # Check ZetaChain status
        zc_status = deployment_result["zetaChain"].get("status")
        zc_ownership = deployment_result["zetaChain"].get("ownership_status")
        if zc_status != "deployed":
             all_steps_successful = False
             # If ZC deploy failed, it's a total failure unless EVMs worked
        else:
             any_successful_deployment = True
             if zc_ownership != "transferred":
                  all_steps_successful = False # Deployed but ownership failed/skipped

        # Check EVM chains status
        for chain_id_str in deployment_result["evmChains"]:
            chain_info = deployment.connected_chains_json.get(chain_id_str, {})
            if chain_info.get("status") == "deployed":
                 any_successful_deployment = True
                 partial_success = True # If at least one EVM deployed, it's at least partial
                 if chain_info.get("setup_status") != "completed":
                      all_steps_successful = False # If any EVM chain setup/ownership failed/skipped
            else:
                 # If an EVM chain failed deployment itself
                 all_steps_successful = False


        # Check if any significant operational errors occurred
        if allocation_errors or ownership_transfer_failed:
             all_steps_successful = False
             # If deployment happened but these failed, ensure partial status
             if any_successful_deployment:
                  partial_success = True


        if all_steps_successful:
            deployment.deployment_status = "completed"
            logger.info(f"Deployment {deployment.id} completed successfully.")
        elif partial_success:  # Deployed/partially setup but not perfect
             deployment.deployment_status = "partial"
             logger.warning(
                 f"Deployment {deployment.id} completed with partial success or errors. "
                 f"Check error messages and chain statuses."
             )
        else: # Complete failure
            deployment.deployment_status = "failed"
            logger.error(f"Deployment {deployment.id} failed. Check logs for details.")


        # Persist final connected_chains_json state and ensure zc_contract_address is saved
        # Make sure all updated fields are explicitly set before committing
        # This will ensure these critical fields are saved to the database
        db_deployment = db.query(TokenModel).filter(TokenModel.id == deployment.id).first()
        if db_deployment:
            # Explicitly set the fields that need to be updated
            db_deployment.zc_contract_address = deployment.zc_contract_address
            db_deployment.connected_chains_json = deployment.connected_chains_json
            db_deployment.deployment_status = deployment.deployment_status
            db_deployment.error_message = deployment.error_message
            # Add to session and commit
            db.add(db_deployment)
            db.commit()
            logger.info(f"Successfully saved deployment {deployment.id} with ZC address: {deployment.zc_contract_address}")
        else:
            logger.error(f"Failed to find deployment with ID {deployment.id} to update final state!")
        
        return deployment_result

# Singleton instance
deployment_service = DeploymentService() 