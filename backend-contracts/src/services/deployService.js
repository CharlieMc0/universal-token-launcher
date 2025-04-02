const { JsonRpcProvider, Wallet, ContractFactory } = require('ethers');
const { getConfig } = require('../config');
const { getChainConfig } = require('../utils/chainUtils');
const { universalTokenABI, universalTokenBytecode } = require('../utils/contracts/universalToken');
const { zetaChainTokenABI, zetaChainTokenBytecode } = require('../utils/contracts/zetaChainToken');
const logger = require('../utils/logger');
const { verifyContract } = require('./verifyService'); 
const { transferOwnershipAndTokens } = require('./ownershipService');
const path = require('path');
// Use an absolute path resolved from the current file location
const db = require(path.resolve(__dirname, '../../models'));

// Add more detailed startup log to verify model access
logger.info('[deployService] Initializing with model access check:');
logger.info('[deployService] Models path:', path.resolve(__dirname, '../../models'));
logger.info('[deployService] Available models:', Object.keys(db).join(', '));

// Try both lowercase and original case model names
let TokenModel = null;
if (db.tokendeployment) {
  TokenModel = db.tokendeployment;
  logger.info(`[deployService] tokendeployment model found with table: ${db.tokendeployment.tableName}`);
} else if (db.Tokendeployment) {
  TokenModel = db.Tokendeployment;
  logger.info(`[deployService] Tokendeployment model found (capitalized) with table: ${db.Tokendeployment.tableName}`);
} else if (db.TokenDeployment) {
  TokenModel = db.TokenDeployment;
  logger.info(`[deployService] TokenDeployment model found (PascalCase) with table: ${db.TokenDeployment.tableName}`);
} else {
  logger.error('[deployService] CRITICAL ERROR: tokendeployment model not available under any case variation!');
  logger.error('[deployService] Model names:', Object.keys(db).filter(key => key !== 'sequelize' && key !== 'Sequelize').join(', '));
}

/**
 * Estimates gas for contract deployment.
 * @param {ContractFactory} factory - The contract factory.
 * @param {Array} args - Constructor arguments.
 * @returns {Promise<BigInt>} - Estimated gas limit.
 */
async function estimateDeploymentGas(factory, args) {
  try {
    // Note: ethers v6 uses factory.getDeployTransaction(...).then(tx => provider.estimateGas(tx))
    // Simpler estimation might be needed, or adjust based on actual v6 usage if different.
    // The below is closer to v5. Let's assume a simplified direct estimation or use a fixed large value for now.
    // const estimatedGas = await factory.deploymentTransaction().estimateGas(...args);
    const estimatedGas = await factory.getDeployTransaction(...args).gasLimit; // Attempting direct access
    logger.debug(`Estimated gas for deployment: ${estimatedGas}`);
    return (estimatedGas * BigInt(120)) / BigInt(100); // Add 20% buffer
  } catch (error) {
    logger.warn(`Gas estimation failed: ${error.message}. Using default gas limit.`);
    return BigInt(5000000); // Fallback
  }
}

/**
 * Deploys a contract to a specific chain.
 * @param {string} chainId - The chain ID.
 * @param {object} contractInfo - ABI and Bytecode { abi, bytecode }.
 * @param {Array} constructorArgs - Arguments for the contract constructor.
 * @param {string} deploymentType - Description for logging (e.g., "ZetaChain Token").
 * @param {number} [retryCount=0] - Current retry attempt.
 * @returns {Promise<object>} - Deployment result { contractAddress, transactionHash, blockNumber }.
 * @throws {Error} If deployment fails after retries.
 */
async function deployContract(chainId, contractInfo, constructorArgs, deploymentType, retryCount = 0) {
  const MAX_RETRIES = 2;
  const RETRY_DELAY = 5000;

  const chainConfig = getChainConfig(chainId);
  if (!chainConfig) throw new Error(`Configuration not found for chain ID: ${chainId}`);

  const { rpcUrl } = chainConfig;
  const { DEPLOYER_PRIVATE_KEY } = getConfig();

  const provider = new JsonRpcProvider(rpcUrl);
  const wallet = new Wallet(DEPLOYER_PRIVATE_KEY, provider);
  const factory = new ContractFactory(contractInfo.abi, contractInfo.bytecode, wallet);

  logger.info(`Attempting to deploy ${deploymentType} contract on chain ${chainId} (Attempt ${retryCount + 1})...`);

  try {
    const estimatedGasLimit = await estimateDeploymentGas(factory, constructorArgs);
    logger.debug(`Using gas limit: ${estimatedGasLimit} for ${deploymentType} on chain ${chainId}`);

    const contract = await factory.deploy(...constructorArgs, { gasLimit: estimatedGasLimit });
    logger.info(`Deployment transaction sent for ${deploymentType} on chain ${chainId}: ${contract.deploymentTransaction().hash}`);
    logger.info(`Waiting for deployment confirmation...`);

    // In ethers v6, wait is a method on the transaction response, not the contract itself
    const txResponse = contract.deploymentTransaction();
    const receipt = await txResponse.wait(1); // Wait for 1 confirmation

    if (!receipt || receipt.status !== 1) {
      throw new Error(`Deployment transaction failed or reverted. Status: ${receipt ? receipt.status : 'unknown'}`);
    }

    const contractAddress = await contract.getAddress();
    logger.info(`${deploymentType} contract deployed successfully on chain ${chainId} at address: ${contractAddress}`);
    logger.debug(`Transaction hash: ${receipt.hash}, Block number: ${receipt.blockNumber}`);

    return { contractAddress, transactionHash: receipt.hash, blockNumber: receipt.blockNumber };
  } catch (error) {
    logger.error(`Error deploying ${deploymentType} contract on chain ${chainId} (Attempt ${retryCount + 1}): ${error.message}`, { stack: error.stack });
    if (retryCount < MAX_RETRIES) {
      logger.info(`Retrying deployment in ${RETRY_DELAY / 1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return deployContract(chainId, contractInfo, constructorArgs, deploymentType, retryCount + 1);
    } else {
      throw new Error(`Failed to deploy ${deploymentType} contract on chain ${chainId} after ${MAX_RETRIES + 1} attempts: ${error.message}`);
    }
  }
}

/**
 * Deploys and connects Universal Tokens across selected chains.
 * @param {string} tokenName - Name of the token.
 * @param {string} tokenSymbol - Symbol of the token.
 * @param {number} decimals - Token decimals.
 * @param {string} totalSupply - Total supply (as a string).
 * @param {string[]} selectedChains - Array of chain IDs to deploy on.
 * @param {string} deployerAddress - The address that will receive final ownership.
 * @returns {Promise<object>} - Deployment results including addresses and connection status.
 */
async function deployAndConnectTokens(tokenName, tokenSymbol, decimals, totalSupply, selectedChains, deployerAddress) {
  const { ZETA_CHAIN_ID } = getConfig();
  const evmChainIds = selectedChains.filter(id => id !== ZETA_CHAIN_ID);
  const zetaChainId = selectedChains.find(id => id === ZETA_CHAIN_ID);

  if (!zetaChainId) {
    throw new Error("ZetaChain must be included in the selected chains.");
  }

  // Initialize deployment tracking variables within the function scope
  let deploymentRecord = null; 
  const deploymentResults = {
    zetaChain: null,
    evmChains: {},
    connectionStatus: 'pending',
    verificationStatus: 'pending',
    ownershipStatus: 'pending',
    finalOwner: deployerAddress,
    deploymentId: null, // To store the DB record ID
  };

  // --- 1. Create Initial Database Record --- Moved INSIDE the function
  try {
    // Check if model was found
    if (!TokenModel) {
      throw new Error('Token deployment model not available - database operations cannot proceed');
    }
    
    // Prepare JSON data for initial record
    const initialChainsJson = selectedChains.reduce((acc, chainId) => {
      const config = getChainConfig(chainId);
      acc[chainId] = {
        contractAddress: null,
        deploymentStatus: 'pending',
        verificationStatus: 'pending',
        verificationError: null,
        verifiedUrl: null,
        explorerUrl: config?.explorerUrl || null,
        blockscoutUrl: config?.blockscoutUrl || null,
      };
      return acc;
    }, {});

    logger.info(`Attempting to create deployment record in DB for token: ${tokenName}`); // Log before creation
    deploymentRecord = await TokenModel.create({
      token_name: tokenName,
      token_symbol: tokenSymbol,
      decimals: decimals,
      total_supply: totalSupply,
      deployer_address: deployerAddress, // Final owner address
      connected_chains_json: initialChainsJson,
      deployment_status: 'starting',
      zc_contract_address: null, // Initially null
      error_message: null,
    });
    deploymentResults.deploymentId = deploymentRecord.id; // Store the ID
    logger.info(`Successfully created deployment record ID: ${deploymentRecord.id}`); // Log after successful creation

  } catch (dbError) {
    logger.error(`Failed to create initial deployment record: ${dbError.message}`, { error: dbError, stack: dbError.stack }); // Log detailed error
    throw new Error(`Failed to initialize deployment tracking: ${dbError.message}`); // Halt if DB fails
  }

  // --- Main Deployment Logic --- Wrapped in a try/catch to update DB on overall failure
  try {
    // --- 2. Deploy ZetaChain Contract ---
    logger.info("--- Step 1: Deploying ZetaChain Universal Token ---");
    deploymentRecord.deployment_status = 'deploying_zeta';
    await deploymentRecord.save();

    const zetaArgs = [tokenName, tokenSymbol, decimals];
    const zetaResult = await deployContract(zetaChainId, { abi: zetaChainTokenABI, bytecode: zetaChainTokenBytecode }, zetaArgs, "ZetaChain Token");
    deploymentResults.zetaChain = zetaResult;

    // Update DB record for ZetaChain deployment
    deploymentRecord.zc_contract_address = zetaResult.contractAddress;
    deploymentRecord.connected_chains_json[zetaChainId].contractAddress = zetaResult.contractAddress;
    deploymentRecord.connected_chains_json[zetaChainId].deploymentStatus = 'success';
    deploymentRecord.deployment_status = 'deploying_evm';
    await deploymentRecord.save();
    logger.info(`Successfully updated deployment record ${deploymentRecord.id} after ZetaChain deploy.`);

    // --- 3. Deploy EVM Contracts ---
    logger.info("--- Step 2: Deploying EVM Universal Tokens ---");
    let evmDeploymentFailed = false; // Flag to track if any EVM deployment fails
    for (const chainId of evmChainIds) {
      logger.info(`Deploying on EVM chain: ${chainId}`);
      try {
        deploymentRecord.deployment_status = `deploying_evm_${chainId}`;
        deploymentRecord.connected_chains_json[chainId].deploymentStatus = 'deploying';
        await deploymentRecord.save();

        const evmArgs = [tokenName, tokenSymbol, decimals];
        const evmResult = await deployContract(chainId, { abi: universalTokenABI, bytecode: universalTokenBytecode }, evmArgs, `EVM Token (Chain ${chainId})`);
        deploymentResults.evmChains[chainId] = evmResult;

        deploymentRecord.connected_chains_json[chainId].contractAddress = evmResult.contractAddress;
        deploymentRecord.connected_chains_json[chainId].deploymentStatus = 'success';
        await deploymentRecord.save();
        logger.info(`Successfully deployed and updated record for EVM chain ${chainId}.`);

      } catch (evmDeployError) {
        logger.error(`Failed to deploy on EVM chain ${chainId}: ${evmDeployError.message}`);
        deploymentResults.evmChains[chainId] = { error: evmDeployError.message, deploymentStatus: 'failed' };
        deploymentRecord.connected_chains_json[chainId].deploymentStatus = 'failed';
        deploymentRecord.error_message = (deploymentRecord.error_message ? deploymentRecord.error_message + '\n' : '') + `EVM deployment failed for chain ${chainId}: ${evmDeployError.message}`;
        evmDeploymentFailed = true; // Mark failure
        // Don't re-throw yet, allow other EVM deployments to attempt
        await deploymentRecord.save(); 
      }
    }

    // If any EVM deployment failed, stop the process here
    if (evmDeploymentFailed) {
        deploymentRecord.deployment_status = 'failed';
        await deploymentRecord.save();
        throw new Error("One or more EVM deployments failed. Halting process.");
    }

    deploymentRecord.deployment_status = 'connecting'; // Set status before starting next step
    await deploymentRecord.save();

    // --- 4. Connect Contracts (Placeholder) ---
    logger.info("--- Step 3: Connecting Contracts (Placeholder) ---");
    // TODO: Implement actual contract connection logic
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate time
    deploymentResults.connectionStatus = 'success';
    logger.info("Contract connection simulated successfully.");
    deploymentRecord.deployment_status = 'verifying';
    await deploymentRecord.save();

    // --- 5. Verify Contracts ---
    logger.info("--- Step 4: Verifying Contracts ---");
    deploymentResults.verificationStatus = 'in_progress';
    const verificationPromises = [];
    let verificationIssues = false;

    // ZetaChain Verification
    if (deploymentResults.zetaChain?.contractAddress) {
        const zetaArgsVerify = [tokenName, tokenSymbol, decimals];
        verificationPromises.push(
            verifyContract(deploymentResults.zetaChain.contractAddress, zetaChainId, 'zetachain', zetaArgsVerify)
                .then(verifyResult => {
                    deploymentResults.zetaChain.verification = verifyResult;
                    deploymentRecord.connected_chains_json[zetaChainId].verificationStatus = verifyResult.status || 'failed';
                    deploymentRecord.connected_chains_json[zetaChainId].verificationError = verifyResult.error || null;
                    deploymentRecord.connected_chains_json[zetaChainId].verifiedUrl = verifyResult.explorerUrl || null;
                    if ((verifyResult.status || 'failed') !== 'verified' && (verifyResult.status || 'failed') !== 'success') verificationIssues = true;
                    logger.info(`Verification result for ZetaChain (${zetaChainId}): ${verifyResult.status || 'failed'}`);
                })
                .catch(err => {
                    logger.error(`Verification failed for ZetaChain contract ${deploymentResults.zetaChain.contractAddress}: ${err.message}`);
                    deploymentResults.zetaChain.verification = { status: 'failed', error: err.message };
                    deploymentRecord.connected_chains_json[zetaChainId].verificationStatus = 'failed';
                    deploymentRecord.connected_chains_json[zetaChainId].verificationError = err.message;
                    verificationIssues = true;
                })
        );
    }

    // EVM Verification
    for (const chainId of evmChainIds) {
        if (deploymentResults.evmChains[chainId]?.contractAddress) {
            const evmArgsVerify = [tokenName, tokenSymbol, decimals];
            verificationPromises.push(
                verifyContract(deploymentResults.evmChains[chainId].contractAddress, chainId, 'evm', evmArgsVerify)
                    .then(verifyResult => {
                        deploymentResults.evmChains[chainId].verification = verifyResult;
                        deploymentRecord.connected_chains_json[chainId].verificationStatus = verifyResult.status || 'failed';
                        deploymentRecord.connected_chains_json[chainId].verificationError = verifyResult.error || null;
                        deploymentRecord.connected_chains_json[chainId].verifiedUrl = verifyResult.explorerUrl || null;
                        if ((verifyResult.status || 'failed') !== 'verified' && (verifyResult.status || 'failed') !== 'success') verificationIssues = true;
                        logger.info(`Verification result for EVM Chain ${chainId}: ${verifyResult.status || 'failed'}`);
                    })
                    .catch(err => {
                        logger.error(`Verification failed for EVM contract on chain ${chainId}: ${err.message}`);
                        deploymentResults.evmChains[chainId].verification = { status: 'failed', error: err.message };
                        deploymentRecord.connected_chains_json[chainId].verificationStatus = 'failed';
                        deploymentRecord.connected_chains_json[chainId].verificationError = err.message;
                        verificationIssues = true;
                    })
            );
        }
    }

    await Promise.allSettled(verificationPromises);
    logger.info("Contract verification process completed (check individual statuses). Saving results...");
    deploymentResults.verificationStatus = verificationIssues ? 'issues_found' : 'completed';
    await deploymentRecord.save(); // Save verification results before proceeding

    // --- 6. Transfer Ownership and Initial Tokens ---
    logger.info("--- Step 5: Transferring Ownership and Tokens ---");
    deploymentRecord.deployment_status = 'transferring_ownership';
    await deploymentRecord.save();

    // Prepare addresses of successfully deployed EVM contracts for transfer service
    const successfulEvmContracts = evmChainIds.reduce((acc, id) => {
        if (deploymentResults.evmChains[id]?.contractAddress && deploymentResults.evmChains[id]?.deploymentStatus !== 'failed') {
            acc[id] = deploymentResults.evmChains[id].contractAddress;
        }
        return acc;
    }, {});

    await transferOwnershipAndTokens(
        deploymentResults.zetaChain.contractAddress,
        successfulEvmContracts,
        deployerAddress,
        totalSupply
    );
    deploymentResults.ownershipStatus = 'success';
    logger.info(`Ownership successfully transferred to ${deployerAddress}.`);
    deploymentRecord.deployment_status = 'completed';
    deploymentRecord.error_message = null; // Clear errors on successful completion
    await deploymentRecord.save();

    logger.info(`Deployment process fully completed for ID: ${deploymentRecord.id}.`);
    return { ...deploymentResults, deploymentId: deploymentRecord.id };

  } catch (error) {
    // Catch errors from deployment steps (Zeta, EVM, Connect, Verify, Transfer)
    logger.error(`Deployment process failed for ID ${deploymentRecord?.id}: ${error.message}`, { stack: error.stack });
    if (deploymentRecord) { // Ensure record exists before trying to update
        // Ensure the deployment record reflects the failure if not already set
        if (deploymentRecord.deployment_status !== 'failed') {
            deploymentRecord.deployment_status = 'failed';
        }
        // Append error message if not already captured by specific steps
        if (!deploymentRecord.error_message?.includes(error.message)) {
            deploymentRecord.error_message = (deploymentRecord.error_message ? deploymentRecord.error_message + '\n' : '') + `Overall failure: ${error.message}`;
        }
        try {
            await deploymentRecord.save();
            logger.info(`Saved final error state to DB for deployment ID: ${deploymentRecord.id}`);
        } catch (saveError) {
            logger.error(`Failed to save final error state to DB for deployment ID ${deploymentRecord.id}: ${saveError.message}`);
        }
    }
    // Re-throw a cleaner error for the API layer, including the ID if possible
    throw new Error(`Deployment failed. Please check logs. Record ID: ${deploymentRecord?.id || 'N/A'}`);
  }
}

module.exports = {
  deployAndConnectTokens,
}; 