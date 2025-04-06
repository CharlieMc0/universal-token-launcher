"""Deployment service for universal token contracts."""

from sqlalchemy.orm import Session
from typing import Dict, List, Any

from app.models import TokenModel
from app.utils.logger import logger
from app.utils.web3_helper import (
    get_web3, 
    get_account, 
    get_zrc20_address,
    call_contract_method,
    UNIVERSAL_TOKEN_ABI,
    UNIVERSAL_TOKEN_BYTECODE,
    ZC_UNIVERSAL_TOKEN_ABI,
    ZC_UNIVERSAL_TOKEN_BYTECODE,
    ERC1967_PROXY_ABI,
    ERC1967_PROXY_BYTECODE,
    deploy_implementation,
    deploy_erc1967_proxy,
    encode_initialize_data,
    get_chain_config
)
from web3 import Web3
from sqlalchemy.orm.attributes import flag_modified
from app.config import Config


class DeploymentService:
    """Service for deploying standard universal token contracts using UUPS Proxies."""

    async def deploy_universal_token(
        self,
        token_config: Dict[str, Any],
        selected_chains: List[str],
        final_owner_address: str,
        allocations: List[Dict[str, Any]],
        db: Session
    ) -> Dict[str, Any]:
        """
        Deploy (via UUPS proxy), initialize, connect, allocate, and transfer ownership.
        Uses standard contract artifacts from utl/standard-contracts.

        Args:
            token_config: Token details (name, symbol, decimals, total_supply)
            selected_chains: List of chain IDs to deploy on (strings)
            final_owner_address: Address for final ownership
            allocations: List of {address, amount} for initial distribution (on ZetaChain)
            db: Database session

        Returns:
            Dict with deployment results and status.
        """
        logger.info(
            f"Deploying Standard UUPS Universal Token {token_config['token_name']} for {final_owner_address} "
            f"on {len(selected_chains)} chains using artifacts from @standard-contracts."
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
        # Keep implementation address fields for verification/tracking purposes
        deployment = TokenModel(
            token_name=token_config["token_name"],
            token_symbol=token_config["token_symbol"],
            decimals=token_config["decimals"],
            total_supply=token_config["total_supply"],
            deployer_address=final_owner_address,
            deployment_status="in_progress",
            connected_chains_json={},
            zc_implementation_address=None,
            # zc_contract_address will store the PROXY address
        )
        db.add(deployment)
        db.commit()
        db.refresh(deployment)

        deployment_result = {
            "deploymentId": deployment.id,
            "zetaChain": {"status": "pending", "proxy_address": None, "implementation_address": None},
            "evmChains": {cid: {"status": "pending", "proxy_address": None, "implementation_address": None} for cid in selected_chains if cid != Config.ZETA_CHAIN_ID}
        }

        zc_proxy_address = None
        zc_impl_address = None
        zc_web3 = None

        # --- Step 1: Deploy to ZetaChain (Standard Impl + Proxy + Initialize) ---
        zeta_chain_id_str = Config.ZETA_CHAIN_ID
        zeta_chain_id_int = int(Config.ZETA_CHAIN_ID)
        if zeta_chain_id_str in selected_chains:
            logger.info("Deploying ZetaChain standard implementation and proxy...")
            zc_web3 = await get_web3(zeta_chain_id_int)
            if not zc_web3:
                deployment.deployment_status = "failed"
                err_msg = "Failed to connect to ZetaChain"
                deployment.error_message = err_msg
                db.add(deployment)
                db.commit()
                deployment_result["zetaChain"] = {"status": "failed", "message": err_msg}
                return deployment_result # Early exit

            try:
                # 1a. Deploy ZetaChain Implementation
                logger.info("Deploying ZetaChain implementation contract...")
                
                impl_deploy_result = await deploy_implementation(
                    web3=zc_web3,
                    account=service_account,
                    contract_abi=ZC_UNIVERSAL_TOKEN_ABI,
                    contract_bytecode=ZC_UNIVERSAL_TOKEN_BYTECODE,
                    constructor_args=None,
                    gas_limit_override=5000000
                )
                
                if not impl_deploy_result.get("success"):
                    raise ValueError(f"ZetaChain implementation deployment failed: {impl_deploy_result.get('message')}")
                
                zc_impl_address = impl_deploy_result.get("contract_address")
                deployment.zc_implementation_address = zc_impl_address
                deployment_result["zetaChain"]["implementation_address"] = zc_impl_address
                logger.info(f"ZetaChain implementation deployed: {zc_impl_address}")

                # 1b. Prepare initialization data for ZetaChain token
                chain_config = Config.get_chain_config(zeta_chain_id_str)
                if not chain_config:
                    raise ValueError(f"Chain config not found for ZetaChain: {zeta_chain_id_str}")
                
                gateway_address = chain_config.get("gateway_address")
                if not gateway_address:
                    raise ValueError(f"Gateway address not found for ZetaChain")
                
                # Ensure we have a uniswap router address for ZetaChain
                uniswap_router_address = chain_config.get("uniswap_router_address")
                if not uniswap_router_address:
                    # This is a critical issue - the ZetaChain token requires a valid Uniswap router
                    # Don't use gateway_address as a fallback as they serve different purposes
                    raise ValueError("Uniswap router address not found in ZetaChain config")
                
                logger.info(f"Using Uniswap router address for ZetaChain: {uniswap_router_address}")
                logger.info(f"Using gateway address for ZetaChain: {gateway_address}")
                init_data = encode_initialize_data(
                    web3=zc_web3,
                    contract_abi=ZC_UNIVERSAL_TOKEN_ABI,
                    name=token_config["token_name"],
                    symbol=token_config["token_symbol"],
                    gateway_address=gateway_address,
                    owner_address=service_account.address,
                    gas=3000000,
                    uniswap_router_address=uniswap_router_address
                )
                
                logger.info(f"ZetaChain initialization data prepared: {len(init_data)} bytes")

                # 1c. Deploy ERC1967 Proxy for ZetaChain
                logger.info(f"Deploying ZetaChain ERC1967 proxy with initialization data...")
                
                proxy_deploy_result = await deploy_erc1967_proxy(
                    web3=zc_web3,
                    account=service_account,
                    implementation_address=zc_impl_address,
                    init_data=init_data,
                    gas_limit_override=5000000,
                    is_zetachain=True  # This is a ZetaChain deployment
                )
                
                if not proxy_deploy_result.get("success"):
                    raise ValueError(f"ZetaChain proxy deployment failed: {proxy_deploy_result.get('message')}")
                
                zc_proxy_address = proxy_deploy_result.get("contract_address")
                deployment.zc_contract_address = zc_proxy_address # Store PROXY address here
                deployment_result["zetaChain"]["proxy_address"] = zc_proxy_address
                deployment_result["zetaChain"]["status"] = "deployed"
                logger.info(f"ZetaChain proxy deployed and initialized: {zc_proxy_address}")
                
                # --- Direct initialization as a fallback in case proxy constructor didn't execute init data ---
                try:
                    logger.info("Executing direct initialize call as a fallback...")
                    chain_config = get_chain_config(zeta_chain_id_str)
                    gateway_address = chain_config.get("gateway_address")
                    uniswap_router_address = chain_config.get("uniswap_router_address")
                    
                    # Call the initialize method directly on the proxy
                    init_result = await call_contract_method(
                        web3=zc_web3,
                        account=service_account,
                        contract_address=zc_proxy_address,
                        contract_abi=ZC_UNIVERSAL_TOKEN_ABI,
                        method_name="initialize",
                        args=[
                            service_account.address,  # initialOwner
                            token_config["token_name"],  # name
                            token_config["token_symbol"],  # symbol
                            gateway_address,  # gatewayAddress
                            3000000,  # gas
                            uniswap_router_address  # uniswapRouterAddress
                        ],
                        gas_limit=5000000
                    )
                    
                    if init_result.get("success"):
                        logger.info("✅ Direct initialize call succeeded!")
                        
                        # Verify router address was set correctly
                        zc_contract = zc_web3.eth.contract(address=zc_proxy_address, abi=ZC_UNIVERSAL_TOKEN_ABI)
                        if hasattr(zc_contract.functions, 'uniswapRouter'):
                            router_address = zc_contract.functions.uniswapRouter().call()
                            logger.info(f"ZetaChain contract uniswapRouter value: {router_address}")
                            if router_address.lower() != uniswap_router_address.lower():
                                logger.warning(f"⚠️ UniswapRouter address mismatch: Expected {uniswap_router_address}, Got {router_address}")
                            else:
                                logger.info(f"✅ UniswapRouter address correctly set: {router_address}")
                    else:
                        logger.warning(f"⚠️ Direct initialize call failed: {init_result.get('message')}")
                except Exception as init_error:
                    logger.warning(f"⚠️ Error in direct initialize call: {init_error}")
                    # Don't fail the deployment if this fallback initialization fails
                
                db.add(deployment)
                db.commit()

            except Exception as e:
                logger.error(f"ZetaChain deploy/init exception: {e}", exc_info=True)
                err_msg = f"ZetaChain deployment/init exception: {e}"
                # Update results and DB with failure
                deployment_result["zetaChain"]["status"] = "failed"
                deployment_result["zetaChain"]["message"] = err_msg
                deployment.deployment_status = "failed"
                deployment.error_message = err_msg
                if zc_impl_address: deployment.zc_implementation_address = zc_impl_address # Save impl even if proxy/init failed
                if zc_proxy_address: deployment.zc_contract_address = zc_proxy_address # Save proxy even if init failed
                db.add(deployment)
                db.commit()
                return deployment_result # Exit

        # Check if ZetaChain deployment succeeded before proceeding
        if not zc_proxy_address or deployment_result["zetaChain"].get("status") == "failed":
            logger.error("ZC deployment failed/skipped. Aborting further steps.")
            # Status already set to failed in exception block if needed
            if deployment.deployment_status != "failed": # Ensure status is failed if somehow missed
                 deployment.deployment_status = "failed"
                 deployment.error_message = deployment.error_message or "ZC deployment failed before EVM step"
                 db.add(deployment)
                 db.commit()
            return deployment_result # Exit

        # --- Step 1.5: Mint Initial Supply on ZetaChain Proxy ---
        logger.info(f"Minting initial supply of {token_config['total_supply']} to service account on ZetaChain")
        try:
            # Convert token amount to wei (considering decimals)
            token_decimals = int(token_config["decimals"])
            total_supply_wei = int(token_config["total_supply"]) * (10 ** token_decimals)
            
            # Mint tokens to the service account first (will be transferred to allocations later)
            mint_result = await call_contract_method(
                web3=zc_web3,
                account=service_account,
                contract_address=zc_proxy_address,
                contract_abi=ZC_UNIVERSAL_TOKEN_ABI,
                method_name="mint",
                args=[service_account.address, total_supply_wei],
                gas_limit=1000000
            )
            
            if not mint_result.get("success"):
                logger.error(f"Failed to mint initial supply: {mint_result.get('message')}")
                # This is not a critical error, we can continue with deployment
                logger.warning("Continuing deployment without initial supply")
            else:
                logger.info(f"Initial supply minted successfully")
        
        except Exception as e:
            logger.error(f"Error minting initial supply: {e}", exc_info=True)
            logger.warning("Continuing deployment without initial supply")

        # --- Step 2: Deploy to EVM Chains (Standard Impl + Proxy + Initialize) ---
        deployed_evm_proxies = {} # Store {chain_id_str: proxy_address}
        for chain_id_str in selected_chains:
            if chain_id_str == zeta_chain_id_str:
                continue

            logger.info(f"Deploying standard implementation and proxy to EVM chain {chain_id_str}...")
            evm_proxy_address = None
            evm_impl_address = None
            numeric_chain_id = -1

            try:
                numeric_chain_id = int(chain_id_str)
                evm_web3 = await get_web3(numeric_chain_id)
                if not evm_web3:
                    raise ConnectionError(f"Failed to connect to EVM chain {chain_id_str}")

                # 2a. Deploy implementation contract
                logger.info(f"Deploying EVM implementation contract on chain {chain_id_str}...")
                
                impl_deploy_result = await deploy_implementation(
                    web3=evm_web3,
                    account=service_account,
                    contract_abi=UNIVERSAL_TOKEN_ABI,
                    contract_bytecode=UNIVERSAL_TOKEN_BYTECODE,
                    constructor_args=None,
                    gas_limit_override=5000000
                )
                
                if not impl_deploy_result.get("success"):
                    raise ValueError(f"EVM implementation deployment failed: {impl_deploy_result.get('message')}")
                
                evm_impl_address = impl_deploy_result.get("contract_address")
                deployment_result["evmChains"][chain_id_str]["implementation_address"] = evm_impl_address
                if not deployment.connected_chains_json: deployment.connected_chains_json = {}
                if chain_id_str not in deployment.connected_chains_json: deployment.connected_chains_json[chain_id_str] = {}
                deployment.connected_chains_json[chain_id_str]["implementation_address"] = evm_impl_address
                flag_modified(deployment, "connected_chains_json")
                logger.info(f"EVM implementation deployed for {chain_id_str}: {evm_impl_address}")

                # 2b. Prepare initialization data for EVM token
                chain_config = Config.get_chain_config(chain_id_str)
                if not chain_config:
                    raise ValueError(f"Chain config not found for chain ID: {chain_id_str}")
                
                gateway_address = chain_config.get("gateway_address")
                if not gateway_address:
                    raise ValueError(f"Gateway address not found for chain ID: {chain_id_str}")
                
                init_data = encode_initialize_data(
                    web3=evm_web3,
                    contract_abi=UNIVERSAL_TOKEN_ABI,
                    name=token_config["token_name"],
                    symbol=token_config["token_symbol"],
                    gateway_address=gateway_address,
                    owner_address=service_account.address,
                    gas=3000000
                )
                
                logger.info(f"EVM initialization data prepared for {chain_id_str}: {len(init_data)} bytes")

                # 2c. Deploy ERC1967 Proxy for EVM
                logger.info(f"Deploying EVM ERC1967 proxy on chain {chain_id_str} with initialization data...")
                
                proxy_deploy_result = await deploy_erc1967_proxy(
                    web3=evm_web3,
                    account=service_account,
                    implementation_address=evm_impl_address,
                    init_data=init_data,
                    gas_limit_override=5000000,
                    is_zetachain=False  # This is an EVM chain deployment
                )
                
                if not proxy_deploy_result.get("success"):
                    raise ValueError(f"EVM proxy deployment failed: {proxy_deploy_result.get('message')}")
                
                evm_proxy_address = proxy_deploy_result.get("contract_address")
                deployed_evm_proxies[chain_id_str] = evm_proxy_address
                deployment_result["evmChains"][chain_id_str]["proxy_address"] = evm_proxy_address
                deployment.connected_chains_json[chain_id_str]["contract_address"] = evm_proxy_address
                deployment_result["evmChains"][chain_id_str]["status"] = "deployed"
                deployment.connected_chains_json[chain_id_str]["status"] = "deployed"
                flag_modified(deployment, "connected_chains_json")
                logger.info(f"EVM proxy deployed and initialized for {chain_id_str}: {evm_proxy_address}")

            except Exception as e:
                logger.error(f"EVM deploy/init exception on {chain_id_str}: {e}", exc_info=True)
                err_msg = f"EVM deploy/init exception on {chain_id_str}: {e}"
                deployment_result["evmChains"][chain_id_str]["status"] = "failed"
                deployment_result["evmChains"][chain_id_str]["message"] = err_msg
                if not deployment.connected_chains_json: deployment.connected_chains_json = {}
                if chain_id_str not in deployment.connected_chains_json: deployment.connected_chains_json[chain_id_str] = {}
                deployment.connected_chains_json[chain_id_str]["status"] = "failed"
                deployment.connected_chains_json[chain_id_str]["error_message"] = err_msg
                if evm_impl_address: deployment.connected_chains_json[chain_id_str]["implementation_address"] = evm_impl_address
                if evm_proxy_address: deployment.connected_chains_json[chain_id_str]["contract_address"] = evm_proxy_address
                flag_modified(deployment, "connected_chains_json")
                # Continue to the next chain

        # Commit intermediate EVM deployment statuses
        db.add(deployment)
        db.commit()
        db.refresh(deployment)

        # --- Step 3: Connect EVM Proxies back to ZetaChain Proxy (setConnected) ---
        logger.info("Connecting EVM proxies to ZetaChain proxy via setConnected...")
        connection_success_count = 0
        connection_failure_count = 0

        if not zc_web3 or not zc_proxy_address:
            logger.error("Cannot connect contracts: ZC web3/proxy_address unavailable.")
            deployment.deployment_status = "failed"
            deployment.error_message = deployment.error_message or "ZC connection failed pre-connect step"
            db.add(deployment)
            db.commit()
            return deployment_result

        for chain_id_str, evm_proxy_addr in deployed_evm_proxies.items():
            current_status_data = deployment.connected_chains_json.get(chain_id_str, {})
            if current_status_data.get("status") != "deployed":
                 logger.warning(f"Skipping setConnected for chain {chain_id_str}, deployment/init failed.")
                 continue

            logger.info(f"Calling setConnected on ZetaChain for chain {chain_id_str} ({evm_proxy_addr})")
            status_update = {}
            try:
                 numeric_chain_id = int(chain_id_str)
                 zrc20_address = await get_zrc20_address(numeric_chain_id)
                 if not zrc20_address:
                      raise ValueError(f"Could not find ZRC20 address for chain ID {numeric_chain_id}")

                 args = (
                     Web3.to_checksum_address(zrc20_address),
                     Web3.to_checksum_address(evm_proxy_addr)
                 )
                 logger.debug(f"Prepared args for setConnected: {args}")

                 connection_result = await call_contract_method(
                    web3=zc_web3,
                    account=service_account,
                    contract_address=zc_proxy_address, # ZetaChain PROXY address
                    contract_abi=ZC_UNIVERSAL_TOKEN_ABI, # ZetaChain ABI
                    method_name="setConnected",
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

            except ValueError as val_err:
                connection_failure_count += 1
                error_to_report = f"Arg validation/lookup failed: {val_err}"
                logger.error(f"Failed preparing setConnected for {chain_id_str}: {error_to_report}", exc_info=False)
                status_update = {"connection_status": "failed", "connection_error": error_to_report}
            except Exception as e:
                connection_failure_count += 1
                error_to_report = f"Exception during connection: {type(e).__name__} - {e}"
                logger.error(f"Exception connecting {chain_id_str}: {error_to_report}", exc_info=True)
                status_update = {"connection_status": "failed", "connection_error": error_to_report}

            if chain_id_str in deployment.connected_chains_json:
                 deployment.connected_chains_json[chain_id_str].update(status_update)
            else:
                 logger.warning(f"Chain {chain_id_str} missing in JSON during connection update.")
                 if not deployment.connected_chains_json: deployment.connected_chains_json = {}
                 deployment.connected_chains_json[chain_id_str] = status_update
            flag_modified(deployment, "connected_chains_json")

        # Commit connection status updates after the loop
        db.add(deployment)
        db.commit()
        db.refresh(deployment)

        # --- Step 4: Connect ZetaChain Proxy back to EVM Proxies (setUniversal) ---
        logger.info("Connecting ZetaChain proxy back to EVM proxies via setUniversal...")
        evm_connection_failures = 0
        
        for chain_id_str, contract_data in deployed_evm_proxies.items():
            # Handle both dictionary and direct string address cases
            evm_proxy_addr = None
            if isinstance(contract_data, dict):
                evm_proxy_addr = contract_data.get("proxy_address")
            elif isinstance(contract_data, str):
                evm_proxy_addr = contract_data
                
            if not evm_proxy_addr:
                logger.warning(f"Skipping setUniversal for {chain_id_str}, connection failed.")
                continue

            try:
                logger.info(f"Calling setUniversal on {chain_id_str} ({evm_proxy_addr})")
                
                # Get the Web3 instance for this chain
                numeric_chain_id = int(chain_id_str)
                evm_web3 = await get_web3(numeric_chain_id)
                
                # Set the ZetaChain contract address on the EVM contract
                logger.info(f"Setting ZetaChain contract address to {zc_proxy_address}")
                
                # Call the setUniversal method
                result = await call_contract_method(
                    web3=evm_web3,
                    account=service_account,
                    contract_address=evm_proxy_addr,
                    contract_abi=UNIVERSAL_TOKEN_ABI,
                    method_name="setUniversal",
                    args=[zc_proxy_address],
                    gas_limit=1000000
                )
                
                if result.get("success"):
                    logger.info(f"Successfully setUniversal on chain {chain_id_str}")
                    # Update chain status in database
                    if chain_id_str in deployment.connected_chains_json:
                        deployment.connected_chains_json[chain_id_str]["setup_status"] = "completed"
                        flag_modified(deployment, "connected_chains_json")
                else:
                    error_msg = result.get("message", "Unknown error")
                    logger.error(f"Failed setUniversal on {chain_id_str}: {error_msg}")
                    status_update = {"setup_status": "setUniversal_failed",
                                    "setup_error": error_msg}
                    evm_connection_failures += 1
                    
                    # Update status in database
                    if chain_id_str in deployment.connected_chains_json:
                        if len(error_msg) > 500: # truncate very long error messages
                            error_to_report = error_msg[:497] + "..."
                        else:
                            error_to_report = error_msg
                        status_update = {"setup_status": "setUniversal_failed", "setup_error": error_to_report}
                        deployment.connected_chains_json[chain_id_str].update(status_update)
                        flag_modified(deployment, "connected_chains_json")
                    else:
                        logger.warning(f"Chain {chain_id_str} missing in JSON during setUniversal update.")

            except Exception as e:
                evm_connection_failures += 1
                error_to_report = f"Exception during setUniversal: {type(e).__name__} - {e}"
                logger.error(f"Exception during setUniversal on {chain_id_str}: {error_to_report}", exc_info=True)
                status_update = {"setup_status": "setUniversal_failed", "setup_error": error_to_report}
                
                # Update status in database
                if chain_id_str in deployment.connected_chains_json:
                    if len(error_to_report) > 500: # truncate very long error messages
                        error_to_report = error_to_report[:497] + "..."
                    deployment.connected_chains_json[chain_id_str].update(status_update)
                    flag_modified(deployment, "connected_chains_json")
                else:
                    logger.warning(f"Chain {chain_id_str} missing in JSON during setUniversal update.")

        # Commit setup status updates after the loop
        db.add(deployment)
        db.commit()
        db.refresh(deployment)

        # --- Step 5: Process Allocations ---
        logger.info(f"Processing {len(allocations)} initial allocations via transfer")
        allocation_success_count = 0
        allocation_failure_count = 0

        try:
            # Group allocations by recipient address for efficiency
            address_allocations = {}
            for allocation in allocations:
                address = allocation.get("address")
                amount = int(allocation.get("amount", 0))
                if address and amount > 0:
                    if address in address_allocations:
                        address_allocations[address] += amount
                    else:
                        address_allocations[address] = amount
            
            # Process each allocation
            for address, amount in address_allocations.items():
                try:
                    # Convert amount to wei (considering decimals)
                    token_decimals = int(token_config["decimals"])
                    amount_wei = amount * (10 ** token_decimals)
                    
                    # Execute transfer from service account to recipient
                    transfer_result = await call_contract_method(
                        web3=zc_web3,
                        account=service_account,
                        contract_address=zc_proxy_address,
                        contract_abi=ZC_UNIVERSAL_TOKEN_ABI,
                        method_name="transfer",
                        args=[Web3.to_checksum_address(address), amount_wei],
                        gas_limit=500000
                    )
                    
                    if transfer_result.get("success"):
                        allocation_success_count += 1
                        logger.info(f"Successfully transferred {amount} tokens to {address}")
                    else:
                        allocation_failure_count += 1
                        logger.error(f"Failed to transfer {amount} tokens to {address}: {transfer_result.get('message')}")
                
                except Exception as e:
                    allocation_failure_count += 1
                    logger.error(f"Exception transferring tokens to {address}: {e}", exc_info=True)
        
        except Exception as e:
            logger.error(f"Error processing allocations: {e}", exc_info=True)
            
        logger.info(f"Allocation transfers: {allocation_success_count} successful, {allocation_failure_count} failed")

        # --- Step 6: Transfer Ownership ---
        logger.info(f"Transferring ownership to final owner: {final_owner_address}")
        ownership_success_count = 0
        ownership_failure_count = 0

        # 6a: Transfer ZetaChain proxy ownership
        try:
            logger.info(f"Transferring ownership of ZetaChain proxy {zc_proxy_address}")
            transfer_result = await call_contract_method(
                web3=zc_web3,
                account=service_account,
                contract_address=zc_proxy_address,
                contract_abi=ZC_UNIVERSAL_TOKEN_ABI,
                method_name="transferOwnership",
                args=[Web3.to_checksum_address(final_owner_address)],
                gas_limit=500000
            )
            
            if transfer_result.get("success"):
                ownership_success_count += 1
                logger.info(f"Successfully transferred ZetaChain ownership to {final_owner_address}")
                deployment_result["zetaChain"]["ownership_status"] = "transferred"
            else:
                ownership_failure_count += 1
                logger.error(f"Failed to transfer ZetaChain ownership: {transfer_result.get('message')}")
                deployment_result["zetaChain"]["ownership_status"] = "failed"
        
        except Exception as e:
            ownership_failure_count += 1
            logger.error(f"Exception transferring ZetaChain ownership: {e}", exc_info=True)
            deployment_result["zetaChain"]["ownership_status"] = "failed"
        
        # 6b: Transfer EVM proxy ownership
        for chain_id_str, evm_proxy_addr in deployed_evm_proxies.items():
            current_status = deployment.connected_chains_json.get(chain_id_str, {})
            if current_status.get("setup_status") != "completed":
                logger.warning(f"Skipping ownership transfer for {chain_id_str}, setup not completed.")
                continue
                
            try:
                numeric_chain_id = int(chain_id_str)
                evm_web3 = await get_web3(numeric_chain_id)
                if not evm_web3:
                    raise ConnectionError(f"Failed to get web3 for chain {chain_id_str}")
                    
                logger.info(f"Transferring ownership of EVM proxy on {chain_id_str}")
                transfer_result = await call_contract_method(
                    web3=evm_web3,
                    account=service_account,
                    contract_address=evm_proxy_addr,
                    contract_abi=UNIVERSAL_TOKEN_ABI,
                    method_name="transferOwnership",
                    args=[Web3.to_checksum_address(final_owner_address)],
                    gas_limit=500000
                )
                
                if transfer_result.get("success"):
                    ownership_success_count += 1
                    logger.info(f"Successfully transferred ownership on chain {chain_id_str}")
                    if chain_id_str in deployment.connected_chains_json:
                        deployment.connected_chains_json[chain_id_str]["ownership_status"] = "transferred"
                    else:
                        if not deployment.connected_chains_json: deployment.connected_chains_json = {}
                        deployment.connected_chains_json[chain_id_str] = {"ownership_status": "transferred"}
                else:
                    ownership_failure_count += 1
                    logger.error(f"Failed to transfer ownership on {chain_id_str}: {transfer_result.get('message')}")
                    if chain_id_str in deployment.connected_chains_json:
                        deployment.connected_chains_json[chain_id_str]["ownership_status"] = "failed"
                    else:
                        if not deployment.connected_chains_json: deployment.connected_chains_json = {}
                        deployment.connected_chains_json[chain_id_str] = {"ownership_status": "failed"}
                        
                flag_modified(deployment, "connected_chains_json")
            
            except Exception as e:
                ownership_failure_count += 1
                logger.error(f"Exception transferring ownership on {chain_id_str}: {e}", exc_info=True)
                if chain_id_str in deployment.connected_chains_json:
                    deployment.connected_chains_json[chain_id_str]["ownership_status"] = "failed"
                else:
                    if not deployment.connected_chains_json: deployment.connected_chains_json = {}
                    deployment.connected_chains_json[chain_id_str] = {"ownership_status": "failed"}
                flag_modified(deployment, "connected_chains_json")

        logger.info(f"Ownership transfer: {ownership_success_count} successful, {ownership_failure_count} failed")

        # --- Step 7: Final Update and Return ---
        final_status = "completed"
        if ownership_failure_count > 0:
            final_status = "completed_with_warnings"
        if deployment.deployment_status == "failed":
            final_status = "failed"
        else:
            deployment.deployment_status = final_status

        logger.info(f"Final deployment status: {deployment.deployment_status}")
        db.add(deployment)
        db.commit()
        deployment_result["final_status"] = deployment.deployment_status
        return deployment_result

# Instantiate service
deployment_service = DeploymentService() 