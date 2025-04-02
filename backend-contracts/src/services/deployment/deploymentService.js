const { ethers } = require('ethers');
const config = require('../../config');
const logger = require('../../utils/logger');
const { createContractFactory, getPrivateKey, loadContractArtifact } = require('../../utils/contracts');

/**
 * Deploy ZetaChain Universal Token
 * @param {string} tokenName - Token name
 * @param {string} tokenSymbol - Token symbol
 * @param {number} decimals - Token decimals
 * @param {string} totalSupply - Token total supply as string (in smallest unit)
 * @param {string} deployerAddress - Address of the deployer (will become initial owner)
 * @param {Array<Object>} allocations - Optional array of {address, amount} for initial distribution
 * @returns {Promise<object>} Deployment result with contract address and tx hash
 */
async function deployZetaChainToken(tokenName, tokenSymbol, decimals, totalSupply, deployerAddress, allocations = []) {
  try {
    // Get deployer configuration
    const privateKey = getPrivateKey();
    // Use chain ID '7001' for ZetaChain testnet
    const zetaChainConfig = config.chains['7001']; // Using testnet by default
    if (!zetaChainConfig) {
      throw new Error('ZetaChain configuration not found');
    }
    const rpcUrl = zetaChainConfig.rpcUrl;
    
    logger.info(`Deploying ZetaChainUniversalToken (${tokenName}, ${tokenSymbol}) on ZetaChain`);
    
    // Get contract bytecode and ABI
    const artifact = loadContractArtifact('ZetaChainUniversalToken');
    
    // Create a contract factory
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);
    const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
    
    // Deploy the contract - keep deployer wallet as initial owner
    const deployTransaction = await factory.getDeployTransaction(
      tokenName,
      tokenSymbol,
      decimals,
      totalSupply,
      wallet.address
    );
    
    // Estimate gas and add buffer (30%)
    const estimatedGas = await provider.estimateGas(deployTransaction);
    const gasLimit = Math.ceil(Number(estimatedGas) * 1.3);
    
    // Deploy with owner set to the deployment wallet initially
    const contract = await factory.deploy(
      tokenName,
      tokenSymbol,
      decimals,
      totalSupply,
      wallet.address,
      {
        gasLimit
      }
    );
    
    // Wait for deployment confirmation
    const receipt = await contract.deploymentTransaction().wait(config.deployer.confirmations);
    
    const contractAddress = receipt.contractAddress;
    logger.info(`ZetaChainUniversalToken deployed to: ${contractAddress}`);
    
    // Set total supply by minting to the current owner (deployment wallet)
    // We'll transfer tokens to the actual owner later
    try {
      // Mint total supply to the deployment wallet
      // Note that we're keeping the tokens here temporarily
      const mintTx = await contract.mint(wallet.address, totalSupply, {
        gasLimit: 300000
      });
      await mintTx.wait(config.deployer.confirmations);
      logger.info(`Minted ${totalSupply} tokens to deployment wallet (temporary holder)`);
    } catch (mintError) {
      logger.error(`Error minting initial supply: ${mintError.message}`);
      throw mintError;
    }
    
    // Note: We do NOT transfer ownership to deployerAddress yet
    // That will happen after all cross-chain connections are established
    
    return {
      contractAddress,
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      deploymentWallet: wallet.address // Store the deployment wallet address
    };
  } catch (error) {
    logger.error(`ZetaChain token deployment failed: ${error.message}`);
    logger.error(error.stack);
    throw error;
  }
}

/**
 * Deploy EVM Universal Token
 * @param {string} chainId - Chain ID
 * @param {string} tokenName - Token name
 * @param {string} tokenSymbol - Token symbol
 * @param {number} decimals - Token decimals
 * @param {string} totalSupply - Token total supply as string (in smallest unit)
 * @param {string} deployerAddress - Address of the deployer (will become owner after connections)
 * @param {Array<Object>} allocations - Optional array of {address, amount} for initial distribution
 * @returns {Promise<object>} Deployment result with contract address and tx hash
 */
async function deployEVMToken(chainId, tokenName, tokenSymbol, decimals, totalSupply, deployerAddress, allocations = []) {
  try {
    // Get deployer configuration
    const privateKey = getPrivateKey();
    
    // Get chain configuration
    const chainConfig = config.chains[chainId];
    if (!chainConfig) {
      throw new Error(`Chain configuration not found for chain ID: ${chainId}`);
    }
    
    logger.info(`Deploying EVMUniversalToken (${tokenName}, ${tokenSymbol}) on ${chainConfig.name}`);
    
    // Get contract bytecode and ABI
    const artifact = loadContractArtifact('EVMUniversalToken');
    
    // Create a contract factory
    const provider = new ethers.JsonRpcProvider(chainConfig.rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);
    const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
    
    // Deploy the contract - keep deployer wallet as initial owner
    const deployTransaction = await factory.getDeployTransaction(
      tokenName, 
      tokenSymbol,
      decimals,
      totalSupply,
      parseInt(chainId, 10),
      wallet.address
    );
    
    // Estimate gas and add buffer (30%)
    const estimatedGas = await provider.estimateGas(deployTransaction);
    const gasLimit = Math.ceil(Number(estimatedGas) * 1.3);
    
    // Deploy with owner set to the deployment wallet initially
    const contract = await factory.deploy(
      tokenName,
      tokenSymbol,
      decimals,
      totalSupply,
      parseInt(chainId, 10),
      wallet.address,
      {
        gasLimit
      }
    );
    
    // Wait for deployment confirmation
    const receipt = await contract.deploymentTransaction().wait(config.deployer.confirmations);
    
    const contractAddress = receipt.contractAddress;
    logger.info(`EVMUniversalToken deployed to: ${contractAddress} on ${chainConfig.name}`);
    
    // Set total supply by minting to the current owner (deployment wallet)
    try {
      // Mint total supply to the deployment wallet
      // Note that we're keeping the tokens here temporarily
      const mintTx = await contract.mint(wallet.address, totalSupply, {
        gasLimit: 300000
      });
      await mintTx.wait(config.deployer.confirmations);
      logger.info(`Minted ${totalSupply} tokens to deployment wallet (temporary holder) on ${chainConfig.name}`);
    } catch (mintError) {
      logger.error(`Error minting initial supply on ${chainConfig.name}: ${mintError.message}`);
      throw mintError;
    }
    
    // Note: We do NOT transfer ownership to deployerAddress yet
    // That will happen after all cross-chain connections are established
    
    return {
      contractAddress,
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      chainId: chainId,
      deploymentWallet: wallet.address // Store the deployment wallet address
    };
  } catch (error) {
    logger.error(`EVM token deployment failed on chain ${chainId}: ${error.message}`);
    logger.error(error.stack);
    throw error;
  }
}

/**
 * Helper function to distribute tokens to multiple addresses
 * @param {object} contract - The deployed token contract instance
 * @param {string} deployerAddress - The deployer address that owns the initial token supply
 * @param {Array<Object>} allocations - Array of {address, amount} for token distribution
 */
async function distributeTokens(contract, deployerAddress, allocations) {
  try {
    // Get the signer from private key
    const privateKey = getPrivateKey();
    const provider = contract.runner.provider;
    const wallet = new ethers.Wallet(privateKey, provider);
    
    // Ensure the sender is the contract owner
    const owner = await contract.owner();
    if (owner.toLowerCase() !== deployerAddress.toLowerCase()) {
      throw new Error('Deployer address is not the contract owner');
    }
    
    // Connect the wallet to the contract
    const contractWithSigner = contract.connect(wallet);
    
    // Process each allocation
    for (const allocation of allocations) {
      try {
        // Transfer tokens from the deployer to the recipient
        const tx = await contractWithSigner.transfer(allocation.address, allocation.amount);
        await tx.wait();
        
        logger.info(`Transferred ${allocation.amount} tokens to ${allocation.address}`);
      } catch (error) {
        logger.error(`Failed to transfer tokens to ${allocation.address}: ${error.message}`);
        // Continue with other allocations even if one fails
      }
    }
    
    logger.info('Token distribution completed');
  } catch (error) {
    logger.error(`Failed to distribute tokens: ${error.message}`);
    throw error;
  }
}

/**
 * Connect an EVM chain token to the ZetaChain token
 * @param {string} evmContractAddress - The EVM contract address
 * @param {string} zetaContractAddress - The ZetaChain contract address
 * @param {string} chainId - The EVM chain ID
 * @returns {Promise<object>} Connection result with transaction hash
 */
async function connectEVMToZetaChain(evmContractAddress, zetaContractAddress, chainId) {
  try {
    // Get chain configuration
    const chainConfig = config.chains[chainId];
    if (!chainConfig) {
      throw new Error(`Chain configuration not found for chain ID: ${chainId}`);
    }
    
    logger.info(`Connecting EVM token ${evmContractAddress} to ZetaChain token ${zetaContractAddress}`);
    
    // Create provider and connect to contract
    const provider = new ethers.JsonRpcProvider(chainConfig.rpcUrl);
    const privateKey = getPrivateKey();
    const wallet = new ethers.Wallet(privateKey, provider);
    
    // Get contract ABI
    const artifact = loadContractArtifact('EVMUniversalToken');
    
    // Debug: Log ABI to ensure setZetaChainContract is included
    logger.debug(`EVMUniversalToken ABI has ${artifact.abi.length} entries`);
    const setZetaChainContractAbi = artifact.abi.find(entry => 
      entry.name === 'setZetaChainContract' && entry.type === 'function'
    );
    if (!setZetaChainContractAbi) {
      logger.error('setZetaChainContract method not found in ABI!');
      throw new Error('setZetaChainContract method not found in ABI');
    }
    logger.debug(`Found setZetaChainContract in ABI: ${JSON.stringify(setZetaChainContractAbi)}`);
    
    // Create contract instance
    const contract = new ethers.Contract(evmContractAddress, artifact.abi, wallet);
    
    // Debug: Check if deployer is the owner
    try {
      const owner = await contract.owner();
      logger.info(`Contract owner: ${owner}, Wallet address: ${wallet.address}`);
      if (owner.toLowerCase() !== wallet.address.toLowerCase()) {
        logger.error('Wallet is not the contract owner, transaction will likely fail');
      }
    } catch (ownerError) {
      logger.warn(`Failed to check contract owner: ${ownerError.message}`);
    }
    
    try {
      // Debug: Log the function call parameters
      logger.debug(`Calling setZetaChainContract with param: address=${zetaContractAddress}`);
      
      // Try to estimate gas first
      let gasLimit = 500000; // Default fallback
      try {
        const estimatedGas = await contract.setZetaChainContract.estimateGas(
          zetaContractAddress
        );
        // Add 30% buffer to the estimated gas
        gasLimit = Math.ceil(Number(estimatedGas) * 1.3);
        logger.debug(`Estimated gas: ${estimatedGas}, using gas limit: ${gasLimit}`);
      } catch (gasError) {
        logger.warn(`Failed to estimate gas: ${gasError.message}, using default value: ${gasLimit}`);
      }
      
      // Set the ZetaChain contract address with explicit parameter name
      const tx = await contract.setZetaChainContract(
        zetaContractAddress,
        {
          gasLimit: gasLimit
        }
      );
      
      // Debug: Log transaction data
      logger.info(`Transaction data: ${tx.data}`);
      logger.info(`Transaction hash: ${tx.hash}`);
      
      const receipt = await tx.wait(config.deployer.confirmations);
      
      // Log detailed transaction receipt for debugging
      logger.debug(`Full transaction receipt: ${JSON.stringify(receipt)}`);
      logger.info(`Connected EVM token to ZetaChain with tx hash ${receipt.hash}`);
      
      return {
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber
      };
    } catch (txError) {
      logger.error(`Failed to connect EVM token to ZetaChain: ${txError.message}`);
      
      // Log detailed error information
      if (txError.transaction) {
        logger.debug(`Failed transaction data: ${txError.transaction.data || 'No data'}`);
        logger.debug(`Failed transaction to: ${txError.transaction.to || 'No recipient'}`);
        logger.debug(`Failed transaction gas limit: ${txError.transaction.gasLimit || 'No gas limit'}`);
      }
      
      if (txError.receipt) {
        logger.debug(`Transaction receipt: ${JSON.stringify(txError.receipt)}`);
      }
      
      if (txError.code) {
        logger.debug(`Error code: ${txError.code}`);
      }
      
      // Try to get a more detailed reason if possible
      if (txError.reason) {
        logger.error(`Transaction failed reason: ${txError.reason}`);
      }
      
      // Check if this is a revert error and try to decode it
      if (txError.errorName || txError.errorArgs) {
        logger.error(`Contract error: ${txError.errorName} ${JSON.stringify(txError.errorArgs || {})}`);
      }
      
      return {
        error: true,
        message: txError.message
      };
    }
  } catch (error) {
    logger.error(`Failed to connect EVM token to ZetaChain: ${error.message}`);
    logger.error(error.stack);
    // Return error instead of throwing to allow deployment to continue
    return {
      error: true,
      message: error.message
    };
  }
}

/**
 * Connect a ZetaChain token to an EVM chain token
 * @param {string} zetaContractAddress - The ZetaChain contract address
 * @param {string} evmContractAddress - The EVM contract address
 * @param {string} chainId - The EVM chain ID
 * @returns {Promise<object>} Connection result with transaction hash
 */
async function connectZetaChainToEVM(zetaContractAddress, evmContractAddress, chainId) {
  try {
    // Get ZetaChain configuration
    const zetaChainConfig = config.chains['7001']; // Using testnet by default
    
    logger.info(`Connecting ZetaChain token ${zetaContractAddress} to EVM token ${evmContractAddress} on chain ${chainId}`);
    
    // Create provider and connect to contract
    const provider = new ethers.JsonRpcProvider(zetaChainConfig.rpcUrl);
    const privateKey = getPrivateKey();
    const wallet = new ethers.Wallet(privateKey, provider);
    
    // Get contract ABI
    const artifact = loadContractArtifact('ZetaChainUniversalToken');
    
    // Debug: Log ABI to ensure setConnectedContract is included
    logger.debug(`ZetaChainUniversalToken ABI has ${artifact.abi.length} entries`);
    const setConnectedContractAbi = artifact.abi.find(entry => 
      entry.name === 'setConnectedContract' && entry.type === 'function'
    );
    if (!setConnectedContractAbi) {
      logger.error('setConnectedContract method not found in ABI!');
      throw new Error('setConnectedContract method not found in ABI');
    }
    logger.debug(`Found setConnectedContract in ABI: ${JSON.stringify(setConnectedContractAbi)}`);
    
    // Create contract instance
    const contract = new ethers.Contract(zetaContractAddress, artifact.abi, wallet);
    
    // Debug: Check if deployer is the owner
    try {
      const owner = await contract.owner();
      logger.info(`Contract owner: ${owner}, Wallet address: ${wallet.address}`);
      if (owner.toLowerCase() !== wallet.address.toLowerCase()) {
        logger.error('Wallet is not the contract owner, transaction will likely fail');
      }
    } catch (ownerError) {
      logger.warn(`Failed to check contract owner: ${ownerError.message}`);
    }
    
    try {
      // Convert chainId to numeric to ensure proper encoding
      const numericChainId = parseInt(chainId, 10);
      
      // Debug: Log the function call parameters
      logger.debug(`Calling setConnectedContract with params: chainId=${numericChainId}, address=${evmContractAddress}`);
      
      // Try to estimate gas first
      let gasLimit = 500000; // Default fallback
      try {
        const estimatedGas = await contract.setConnectedContract.estimateGas(
          numericChainId,
          evmContractAddress
        );
        // Add 30% buffer to the estimated gas
        gasLimit = Math.ceil(Number(estimatedGas) * 1.3);
        logger.debug(`Estimated gas: ${estimatedGas}, using gas limit: ${gasLimit}`);
      } catch (gasError) {
        logger.warn(`Failed to estimate gas: ${gasError.message}, using default value: ${gasLimit}`);
      }
      
      // Set the connected contract for the specified chain with explicit parameter names
      const tx = await contract.setConnectedContract(
        numericChainId,
        evmContractAddress,
        {
          gasLimit: gasLimit
        }
      );
      
      // Debug: Log transaction data
      logger.info(`Transaction data: ${tx.data}`);
      logger.info(`Transaction hash: ${tx.hash}`);
      
      const receipt = await tx.wait(config.deployer.confirmations);
      
      // Log detailed transaction receipt for debugging
      logger.debug(`Full transaction receipt: ${JSON.stringify(receipt)}`);
      logger.info(`Connected ZetaChain token to EVM chain ${chainId} with tx hash ${receipt.hash}`);
      
      return {
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber
      };
    } catch (txError) {
      logger.error(`Failed to connect ZetaChain token to EVM chain: ${txError.message}`);
      
      // Log detailed error information
      if (txError.transaction) {
        logger.debug(`Failed transaction data: ${txError.transaction.data || 'No data'}`);
        logger.debug(`Failed transaction to: ${txError.transaction.to || 'No recipient'}`);
        logger.debug(`Failed transaction gas limit: ${txError.transaction.gasLimit || 'No gas limit'}`);
      }
      
      if (txError.receipt) {
        logger.debug(`Transaction receipt: ${JSON.stringify(txError.receipt)}`);
      }
      
      if (txError.code) {
        logger.debug(`Error code: ${txError.code}`);
      }
      
      // Try to get a more detailed reason if possible
      if (txError.reason) {
        logger.error(`Transaction failed reason: ${txError.reason}`);
      }
      
      // Check if this is a revert error and try to decode it
      if (txError.errorName || txError.errorArgs) {
        logger.error(`Contract error: ${txError.errorName} ${JSON.stringify(txError.errorArgs || {})}`);
      }
      
      return {
        error: true,
        message: txError.message
      };
    }
  } catch (error) {
    logger.error(`Failed to connect ZetaChain token to EVM chain: ${error.message}`);
    logger.error(error.stack);
    // Return error instead of throwing to allow deployment to continue
    return {
      error: true,
      message: error.message
    };
  }
}

/**
 * Deploy a Universal Token across multiple chains
 * @param {object} tokenConfig - Token configuration
 * @param {string} tokenConfig.tokenName - Token name
 * @param {string} tokenConfig.tokenSymbol - Token symbol
 * @param {number} tokenConfig.decimals - Token decimals
 * @param {string} tokenConfig.totalSupply - Token total supply (in smallest unit)
 * @param {Array<Object>} tokenConfig.allocations - Optional array of {address, amount} for initial token distribution
 * @param {Array<string>} selectedChains - Array of chain IDs to deploy to
 * @param {string} deployerAddress - Address of the deployer
 * @returns {Promise<object>} Deployment results for all chains
 */
async function deployUniversalToken(tokenConfig, selectedChains, deployerAddress) {
  try {
    const deploymentResults = {
      zetaChain: null,
      evmChains: {}
    };
    
    // Check if ZetaChain is included in the deployment
    const includesZetaChain = selectedChains.includes('7001') || selectedChains.includes('7000');
    const zetaChainId = selectedChains.includes('7001') ? '7001' : '7000';
    
    // First deploy on ZetaChain if included
    if (includesZetaChain) {
      deploymentResults.zetaChain = await deployZetaChainToken(
        tokenConfig.tokenName,
        tokenConfig.tokenSymbol,
        tokenConfig.decimals,
        tokenConfig.totalSupply,
        deployerAddress,
        tokenConfig.allocations
      );
      logger.info(`ZetaChain deployment completed: ${deploymentResults.zetaChain.contractAddress}`);
    }
    
    // Deploy on EVM chains
    for (const chainId of selectedChains) {
      // Skip ZetaChain as it's already deployed
      if (chainId === '7001' || chainId === '7000') continue;
      
      try {
        const evmResult = await deployEVMToken(
          chainId,
          tokenConfig.tokenName,
          tokenConfig.tokenSymbol,
          tokenConfig.decimals,
          tokenConfig.totalSupply,
          deployerAddress,
          tokenConfig.allocations
        );
        
        deploymentResults.evmChains[chainId] = evmResult;
        logger.info(`EVM chain ${chainId} deployment completed: ${evmResult.contractAddress}`);
        
        // Connect ZetaChain to this EVM chain
        if (includesZetaChain && deploymentResults.zetaChain) {
          logger.info(`Connecting ZetaChain token ${deploymentResults.zetaChain.contractAddress} to EVM token ${evmResult.contractAddress} on chain ${chainId}`);
          
          // First connect ZetaChain to EVM
          try {
            // Attempt to connect the contracts with a retry mechanism
            let zetaToEvmResult;
            let retryCount = 0;
            const maxRetries = 3;
            
            while (retryCount < maxRetries) {
              zetaToEvmResult = await connectZetaChainToEVM(
                deploymentResults.zetaChain.contractAddress,
                evmResult.contractAddress,
                chainId
              );
              
              if (!zetaToEvmResult.error) {
                logger.info(`Successfully connected ZetaChain to EVM chain ${chainId} on attempt ${retryCount + 1}`);
                break;
              }
              
              logger.warn(`Connection attempt ${retryCount + 1} failed: ${zetaToEvmResult.message}`);
              retryCount++;
              
              if (retryCount < maxRetries) {
                // Wait before retrying (exponential backoff)
                const delay = 2000 * Math.pow(2, retryCount);
                logger.info(`Waiting ${delay}ms before retry...`);
                await new Promise(resolve => setTimeout(resolve, delay));
              }
            }
            
            if (zetaToEvmResult.error) {
              logger.warn(`Failed to connect ZetaChain to EVM after ${maxRetries} attempts: ${zetaToEvmResult.message}`);
            }
            
            // Now connect EVM to ZetaChain (only if first connection was successful)
            if (!zetaToEvmResult.error) {
              retryCount = 0;
              let evmToZetaResult;
              
              while (retryCount < maxRetries) {
                evmToZetaResult = await connectEVMToZetaChain(
                  evmResult.contractAddress,
                  deploymentResults.zetaChain.contractAddress,
                  chainId
                );
                
                if (!evmToZetaResult.error) {
                  logger.info(`Successfully connected EVM chain ${chainId} to ZetaChain on attempt ${retryCount + 1}`);
                  break;
                }
                
                logger.warn(`Connection attempt ${retryCount + 1} failed: ${evmToZetaResult.message}`);
                retryCount++;
                
                if (retryCount < maxRetries) {
                  // Wait before retrying (exponential backoff)
                  const delay = 2000 * Math.pow(2, retryCount);
                  logger.info(`Waiting ${delay}ms before retry...`);
                  await new Promise(resolve => setTimeout(resolve, delay));
                }
              }
              
              if (evmToZetaResult.error) {
                logger.warn(`Failed to connect EVM to ZetaChain after ${maxRetries} attempts: ${evmToZetaResult.message}`);
              }
            }
          } catch (connectionError) {
            logger.error(`Failed to connect tokens: ${connectionError.message}`);
          }
        }
      } catch (evmError) {
        logger.error(`Failed to deploy on EVM chain ${chainId}: ${evmError.message}`);
        deploymentResults.evmChains[chainId] = {
          error: true,
          message: evmError.message
        };
      }
    }
    
    // Now that all connections are done, transfer ownership and tokens to the final user
    logger.info("All token connections completed. Transferring ownership to the final user...");
    
    // Transfer ownership for ZetaChain token if it was deployed
    if (includesZetaChain && deploymentResults.zetaChain) {
      try {
        const zetaChainConfig = config.chains[zetaChainId];
        if (!zetaChainConfig) {
          throw new Error(`ZetaChain configuration not found for chain ID: ${zetaChainId}`);
        }
        
        await transferTokenOwnership(
          'ZetaChainUniversalToken',
          deploymentResults.zetaChain.contractAddress, 
          deployerAddress,
          zetaChainConfig.rpcUrl
        );
        
        // Transfer any tokens from deployment wallet to final user
        await transferTokens(
          'ZetaChainUniversalToken',
          deploymentResults.zetaChain.contractAddress,
          deployerAddress,
          tokenConfig.totalSupply,
          zetaChainConfig.rpcUrl
        );
        
        logger.info(`Ownership and tokens for ZetaChain token transferred to ${deployerAddress}`);
      } catch (transferError) {
        logger.error(`Failed to transfer ZetaChain token ownership: ${transferError.message}`);
      }
    }
    
    // Transfer ownership for all EVM tokens
    for (const chainId in deploymentResults.evmChains) {
      const evmResult = deploymentResults.evmChains[chainId];
      if (evmResult.error) continue;
      
      try {
        const chainConfig = config.chains[chainId];
        await transferTokenOwnership(
          'EVMUniversalToken',
          evmResult.contractAddress,
          deployerAddress,
          chainConfig.rpcUrl
        );
        
        // Transfer any tokens from deployment wallet to final user
        await transferTokens(
          'EVMUniversalToken',
          evmResult.contractAddress,
          deployerAddress,
          tokenConfig.totalSupply,
          chainConfig.rpcUrl
        );
        
        logger.info(`Ownership and tokens for EVM token on chain ${chainId} transferred to ${deployerAddress}`);
      } catch (transferError) {
        logger.error(`Failed to transfer token ownership on chain ${chainId}: ${transferError.message}`);
      }
    }
    
    return deploymentResults;
  } catch (error) {
    logger.error(`Universal token deployment failed: ${error.message}`);
    throw error;
  }
}

/**
 * Transfer token ownership to a new owner
 * @param {string} contractType - Contract type (ZetaChainUniversalToken or EVMUniversalToken)
 * @param {string} contractAddress - Contract address
 * @param {string} newOwner - New owner address
 * @param {string} rpcUrl - RPC URL for the chain
 * @returns {Promise<boolean>} True if successful
 */
async function transferTokenOwnership(contractType, contractAddress, newOwner, rpcUrl) {
  try {
    // Get the private key of the deployment wallet
    const privateKey = getPrivateKey();
    
    // Create provider and wallet
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);
    
    // Get contract artifact
    const artifact = loadContractArtifact(contractType);
    
    // Create contract instance
    const contract = new ethers.Contract(contractAddress, artifact.abi, wallet);
    
    // Transfer ownership
    logger.info(`Transferring ownership of ${contractType} at ${contractAddress} to ${newOwner}`);
    
    // Try to estimate gas first
    let gasLimit = 200000; // Default fallback
    try {
      const estimatedGas = await contract.transferOwnership.estimateGas(newOwner);
      // Add 30% buffer to the estimated gas
      gasLimit = Math.ceil(Number(estimatedGas) * 1.3);
      logger.debug(`Estimated gas for ownership transfer: ${estimatedGas}, using gas limit: ${gasLimit}`);
    } catch (gasError) {
      logger.warn(`Failed to estimate gas for ownership transfer: ${gasError.message}, using default value: ${gasLimit}`);
    }
    
    // Execute the transaction
    const tx = await contract.transferOwnership(newOwner, {
      gasLimit: gasLimit
    });
    
    // Wait for confirmation
    const receipt = await tx.wait(config.deployer.confirmations);
    
    logger.info(`Ownership transferred successfully: ${receipt.hash}`);
    return true;
  } catch (error) {
    logger.error(`Failed to transfer ownership: ${error.message}`);
    logger.error(error.stack);
    throw error;
  }
}

/**
 * Transfer tokens from deployment wallet to final owner
 * @param {string} contractType - Contract type (ZetaChainUniversalToken or EVMUniversalToken)
 * @param {string} contractAddress - Contract address
 * @param {string} recipient - Recipient address
 * @param {string} amount - Amount to transfer (in smallest unit)
 * @param {string} rpcUrl - RPC URL for the chain
 * @returns {Promise<boolean>} True if successful
 */
async function transferTokens(contractType, contractAddress, recipient, amount, rpcUrl) {
  try {
    // Get the private key of the deployment wallet
    const privateKey = getPrivateKey();
    
    // Create provider and wallet
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);
    
    // Get contract artifact
    const artifact = loadContractArtifact(contractType);
    
    // Create contract instance
    const contract = new ethers.Contract(contractAddress, artifact.abi, wallet);
    
    // Check current balance
    const balance = await contract.balanceOf(wallet.address);
    logger.info(`Current deployment wallet balance: ${balance.toString()} tokens`);
    
    // Transfer tokens
    logger.info(`Transferring ${amount} tokens from ${wallet.address} to ${recipient}`);
    
    // Try to estimate gas first
    let gasLimit = 200000; // Default fallback
    try {
      const estimatedGas = await contract.transfer.estimateGas(recipient, amount);
      // Add 30% buffer to the estimated gas
      gasLimit = Math.ceil(Number(estimatedGas) * 1.3);
      logger.debug(`Estimated gas for token transfer: ${estimatedGas}, using gas limit: ${gasLimit}`);
    } catch (gasError) {
      logger.warn(`Failed to estimate gas for token transfer: ${gasError.message}, using default value: ${gasLimit}`);
    }
    
    // Execute the transaction
    const tx = await contract.transfer(recipient, amount, {
      gasLimit: gasLimit
    });
    
    // Wait for confirmation
    const receipt = await tx.wait(config.deployer.confirmations);
    
    logger.info(`Tokens transferred successfully: ${receipt.hash}`);
    return true;
  } catch (error) {
    logger.error(`Failed to transfer tokens: ${error.message}`);
    logger.error(error.stack);
    throw error;
  }
}

module.exports = {
  deployUniversalToken,
  deployZetaChainToken,
  deployEVMToken,
  connectZetaChainToEVM,
  connectEVMToZetaChain,
  transferTokenOwnership,
  transferTokens
}; 