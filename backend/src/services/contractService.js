const { ethers } = require('ethers');
const { JsonRpcProvider } = require('ethers');
const chainInfo = require('../utils/chainInfo');
const verificationService = require('./VerificationService');
const { 
  logger, 
  logDeploymentAttempt 
} = require('../utils/logger');
const {
  ZETACHAIN_UNIVERSAL_TOKEN_ABI,
  ZETACHAIN_UNIVERSAL_TOKEN_BYTECODE,
  EVM_UNIVERSAL_TOKEN_ABI,
  EVM_UNIVERSAL_TOKEN_BYTECODE,
  ZETACHAIN_ID,
  ZETACHAIN_TESTNET_ID
} = require('../constants/bytecode');

class ContractService {
  constructor() {
    // Initialize providers for different chains
    this.providers = {};
    this.setupProviders();
  }

  /**
   * Setup providers for all supported chains
   */
  setupProviders() {
    const networks = chainInfo.getSupportedNetworks();
    for (const network of networks) {
      this.providers[network.chainId] = new JsonRpcProvider(network.rpcUrl);
    }
  }

  /**
   * Get a wallet instance for a specific chain
   * @param {string} chainId - The chain ID
   * @returns {ethers.Wallet} - The wallet instance
   */
  getWallet(chainId) {
    // Make sure we have a private key
    const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('Deployer private key not configured');
    }

    // Format private key correctly (add 0x prefix if needed)
    const formattedKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
    
    // Create and return wallet
    const provider = this.providers[chainId];
    if (!provider) {
      throw new Error(`No provider available for chain ID ${chainId}`);
    }
    
    return new ethers.Wallet(formattedKey, provider);
  }

  /**
   * Deploy a ZetaChainUniversalToken on ZetaChain
   * @param {string} tokenName - The token name
   * @param {string} tokenSymbol - The token symbol
   * @param {number} decimals - The token decimals
   * @param {string} totalSupply - The token total supply (as string to handle large numbers)
   * @param {string} creatorWallet - The creator's wallet address
   * @param {number} attempt - The attempt number (1 for first attempt, 2+ for retries)
   * @returns {Promise<{contractAddress: string, transactionHash: string}>} - Deployment result
   */
  async deployZetaChainUniversalToken(tokenName, tokenSymbol, decimals, totalSupply, creatorWallet, attempt = 1) {
    try {
      // Determine ZetaChain network (mainnet or testnet)
      const chainId = chainInfo.getPrimaryZetaChainId();
      const network = chainInfo.getChainInfo(chainId);
      const wallet = this.getWallet(chainId);
      
      // Log deployment attempt
      logDeploymentAttempt(
        `${tokenName}_${tokenSymbol}`, 
        chainId, 
        attempt, 
        'ZetaChainUniversalToken',
        {
          chainName: network.name,
          tokenName,
          tokenSymbol,
          decimals,
          totalSupply,
          creatorWallet
        }
      );
      
      logger.info(`Deploying ZetaChainUniversalToken on chain ${chainId} (${network.name})...`, {
        attempt,
        tokenName,
        tokenSymbol,
        chainId,
        chainName: network.name
      });
      
      // Create contract factory
      const factory = new ethers.ContractFactory(
        ZETACHAIN_UNIVERSAL_TOKEN_ABI,
        ZETACHAIN_UNIVERSAL_TOKEN_BYTECODE,
        wallet
      );
      
      // Prepare constructor arguments
      // Convert totalSupply to BigInt with proper decimals
      const totalSupplyBigInt = ethers.parseUnits(totalSupply, decimals);
      
      // Deploy contract
      const contract = await factory.deploy(
        tokenName,
        tokenSymbol,
        decimals,
        totalSupplyBigInt,
        creatorWallet
      );
      
      // Wait for deployment to complete
      const receipt = await contract.deploymentTransaction().wait();
      
      logger.info(`ZetaChainUniversalToken deployed to ${contract.target}`, {
        contractAddress: contract.target,
        transactionHash: receipt.hash,
        gasUsed: receipt.gasUsed.toString(),
        blockNumber: receipt.blockNumber,
        tokenName,
        tokenSymbol,
        chainId,
        chainName: network.name,
        attempt
      });
      
      logger.info(`Explorer URL: ${chainInfo.getExplorerTxUrl(chainId, receipt.hash)}`);
      
      // After successful deployment, attempt to verify the contract
      try {
        logger.info(`Attempting to verify contract on ${network.name}...`, {
          contractAddress: contract.target,
          chainId,
          chainName: network.name
        });
        
        // We need to wait a bit for the contract to be indexed
        await new Promise(resolve => setTimeout(resolve, 10000)); // 10 second delay
        
        const verificationResult = await verificationService.verifyContract(
          chainId,
          contract.target,
          'ZetaChainUniversalToken',
          {
            compilerVersion: '0.8.26',
            optimization: true,
            runs: 200
          }
        );
        
        logger.info(`Verification result:`, verificationResult);
      } catch (verificationError) {
        logger.error(`Contract verification failed: ${verificationError.message}`, {
          contractAddress: contract.target,
          chainId,
          chainName: network.name,
          error: verificationError.message,
          stack: verificationError.stack
        });
        // Continue even if verification fails - this is non-blocking
      }
      
      return {
        contractAddress: contract.target,
        transactionHash: receipt.hash
      };
    } catch (error) {
      logger.error(`Error deploying ZetaChainUniversalToken: ${error.message}`, {
        attempt,
        tokenName,
        tokenSymbol,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Deploy an EVMUniversalToken on an EVM chain
   * @param {string} chainId - The chain ID
   * @param {string} tokenName - The token name
   * @param {string} tokenSymbol - The token symbol
   * @param {number} decimals - The token decimals
   * @param {string} totalSupply - The token total supply (as string to handle large numbers)
   * @param {string} creatorWallet - The creator's wallet address
   * @param {number} attempt - The attempt number (1 for first attempt, 2+ for retries)
   * @returns {Promise<{contractAddress: string, transactionHash: string}>} - Deployment result
   */
  async deployEVMUniversalToken(chainId, tokenName, tokenSymbol, decimals, totalSupply, creatorWallet, attempt = 1) {
    try {
      // Validate chain ID
      const network = chainInfo.getChainInfo(chainId);
      if (!network || chainInfo.isZetaChain(chainId)) {
        throw new Error(`Invalid chain ID ${chainId} for EVM token deployment`);
      }
      
      const wallet = this.getWallet(chainId);
      
      // Log deployment attempt
      logDeploymentAttempt(
        `${tokenName}_${tokenSymbol}`, 
        chainId, 
        attempt, 
        'EVMUniversalToken',
        {
          chainName: network.name,
          tokenName,
          tokenSymbol,
          decimals,
          totalSupply,
          creatorWallet
        }
      );
      
      logger.info(`Deploying EVMUniversalToken on chain ${chainId} (${network.name})...`, {
        attempt,
        tokenName,
        tokenSymbol,
        chainId,
        chainName: network.name
      });
      
      // Create contract factory
      const factory = new ethers.ContractFactory(
        EVM_UNIVERSAL_TOKEN_ABI,
        EVM_UNIVERSAL_TOKEN_BYTECODE,
        wallet
      );
      
      // Convert totalSupply to BigInt with proper decimals
      const totalSupplyBigInt = ethers.parseUnits(totalSupply, decimals);
      
      // Deploy contract
      const contract = await factory.deploy(
        tokenName,
        tokenSymbol,
        decimals,
        totalSupplyBigInt,
        chainId,
        creatorWallet
      );
      
      // Wait for deployment to complete
      const receipt = await contract.deploymentTransaction().wait();
      
      logger.info(`EVMUniversalToken deployed to ${contract.target}`, {
        contractAddress: contract.target,
        transactionHash: receipt.hash,
        gasUsed: receipt.gasUsed.toString(),
        blockNumber: receipt.blockNumber,
        tokenName,
        tokenSymbol,
        chainId,
        chainName: network.name,
        attempt
      });
      
      logger.info(`Explorer URL: ${chainInfo.getExplorerTxUrl(chainId, receipt.hash)}`);
      
      // After successful deployment, attempt to verify the contract
      try {
        logger.info(`Attempting to verify contract on ${network.name}...`, {
          contractAddress: contract.target,
          chainId,
          chainName: network.name
        });
        
        // We need to wait a bit for the contract to be indexed
        await new Promise(resolve => setTimeout(resolve, 10000)); // 10 second delay
        
        const verificationResult = await verificationService.verifyContract(
          chainId,
          contract.target,
          'EVMUniversalToken',
          {
            compilerVersion: '0.8.26',
            optimization: true,
            runs: 200
          }
        );
        
        logger.info(`Verification result:`, verificationResult);
      } catch (verificationError) {
        logger.error(`Contract verification failed: ${verificationError.message}`, {
          contractAddress: contract.target,
          chainId,
          chainName: network.name,
          error: verificationError.message,
          stack: verificationError.stack
        });
        // Continue even if verification fails - this is non-blocking
      }
      
      return {
        contractAddress: contract.target,
        transactionHash: receipt.hash
      };
    } catch (error) {
      logger.error(`Error deploying EVMUniversalToken on chain ${chainId}: ${error.message}`, {
        attempt,
        tokenName,
        tokenSymbol,
        chainId,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Connect a ZetaChain token to an EVM chain token
   * @param {string} zetaChainId - The ZetaChain ID
   * @param {string} zetaChainTokenAddress - The ZetaChain token address
   * @param {string} evmChainId - The EVM chain ID
   * @param {string} evmTokenAddress - The EVM token address
   * @returns {Promise<{zetaChainTxHash: string, evmTxHash: string}>} - Transaction result
   */
  async connectTokens(zetaChainId, zetaChainTokenAddress, evmChainId, evmTokenAddress) {
    try {
      // Validate ZetaChain ID
      if (!chainInfo.isZetaChain(zetaChainId)) {
        throw new Error(`Invalid ZetaChain ID: ${zetaChainId}`);
      }
      
      // Get ZetaChain network information
      const zetaNetwork = chainInfo.getChainInfo(zetaChainId);
      const evmNetwork = chainInfo.getChainInfo(evmChainId);
      
      if (!zetaNetwork || !evmNetwork) {
        throw new Error(`Invalid chain information for chains ${zetaChainId} or ${evmChainId}`);
      }
      
      // Get wallets
      const zetaChainWallet = this.getWallet(zetaChainId);
      const evmWallet = this.getWallet(evmChainId);
      
      console.log(`Connecting tokens on chains ${zetaNetwork.name} and ${evmNetwork.name}...`);
      
      // Step 1: Set connected contract on ZetaChain token
      const zetaChainToken = new ethers.Contract(
        zetaChainTokenAddress,
        ZETACHAIN_UNIVERSAL_TOKEN_ABI,
        zetaChainWallet
      );
      
      const zetaTx = await zetaChainToken.setConnectedContract(
        evmChainId,
        evmTokenAddress
      );
      
      await zetaTx.wait();
      
      console.log(`Set ${evmTokenAddress} as connected contract on ZetaChain token ${zetaChainTokenAddress}`);
      
      // Step 2: Set ZetaChain contract on EVM token
      const evmToken = new ethers.Contract(
        evmTokenAddress, 
        EVM_UNIVERSAL_TOKEN_ABI,
        evmWallet
      );
      
      const evmTx = await evmToken.setZetaChainContract(zetaChainTokenAddress);
      await evmTx.wait();
      
      console.log(`Set ${zetaChainTokenAddress} as ZetaChain contract on EVM token ${evmTokenAddress}`);
      
      // Log transaction URLs
      const zetaExplorerUrl = chainInfo.getExplorerTxUrl(zetaChainId, zetaTx.hash);
      const evmExplorerUrl = chainInfo.getExplorerTxUrl(evmChainId, evmTx.hash);
      
      if (zetaExplorerUrl) console.log(`ZetaChain explorer URL: ${zetaExplorerUrl}`);
      if (evmExplorerUrl) console.log(`EVM explorer URL: ${evmExplorerUrl}`);
      
      return {
        zetaChainTxHash: zetaTx.hash,
        evmTxHash: evmTx.hash
      };
    } catch (error) {
      console.error(`Error connecting tokens: ${error.message}`);
      throw error;
    }
  }

  /**
   * Verify a fee payment transaction on ZetaChain
   * @param {string} txHash - The transaction hash
   * @returns {Promise<boolean>} - Whether the fee payment is valid
   */
  async verifyFeePayment(txHash) {
    const chainId = chainInfo.getPrimaryZetaChainId();
    const provider = this.providers[chainId];
    const serviceWallet = process.env.UNIVERSAL_TOKEN_SERVICE_WALLET;
    const minFee = process.env.FIXED_ZETA_FEE || '1';
    const minFeeWei = ethers.parseEther(minFee);

    logger.info(`Verifying fee payment for tx: ${txHash} on chain: ${chainId}`, {
      txHash,
      chainId,
      expectedRecipient: serviceWallet,
      expectedMinFee: `${minFee} ZETA (${minFeeWei.toString()} wei)`
    });

    try {
      if (!provider) {
        logger.error(`No provider available for ZetaChain (ID: ${chainId})`, { txHash, chainId });
        throw new Error(`No provider available for ZetaChain (ID: ${chainId})`);
      }

      if (!serviceWallet) {
        logger.error('Universal token service wallet not configured in .env', { txHash });
        throw new Error('Universal token service wallet not configured');
      }

      // Get transaction details
      logger.debug(`Fetching transaction details for ${txHash}...`, { txHash });
      const tx = await provider.getTransaction(txHash);
      if (!tx) {
        logger.warn(`Transaction ${txHash} not found on chain ${chainId}`, { txHash, chainId });
        throw new Error(`Transaction ${txHash} not found`);
      }
      logger.debug(`Transaction details fetched`, { txHash, from: tx.from, to: tx.to, value: tx.value.toString() });

      // Get transaction receipt to check status
      logger.debug(`Fetching transaction receipt for ${txHash}...`, { txHash });
      const receipt = await provider.getTransactionReceipt(txHash);
      if (!receipt) {
        logger.warn(`Transaction receipt for ${txHash} not found on chain ${chainId}`, { txHash, chainId });
        // Adding a small delay and retry once, in case of RPC lag
        await new Promise(resolve => setTimeout(resolve, 3000)); // 3 second delay
        logger.debug(`Retrying fetch transaction receipt for ${txHash} after delay...`, { txHash });
        receipt = await provider.getTransactionReceipt(txHash);
        if (!receipt) {
          logger.error(`Transaction receipt for ${txHash} still not found after retry`, { txHash, chainId });
          throw new Error(`Transaction receipt for ${txHash} not found`);
        }
      }
      logger.debug(`Transaction receipt fetched`, { txHash, status: receipt.status, blockNumber: receipt.blockNumber });

      // Check transaction was successful
      if (receipt.status !== 1) {
        logger.warn(`Transaction ${txHash} was not successful (status: ${receipt.status})`, { txHash, status: receipt.status });
        return false;
      }
      logger.debug(`Transaction status check passed (status: 1)`, { txHash });

      // Check recipient is the service wallet
      if (tx.to.toLowerCase() !== serviceWallet.toLowerCase()) {
        logger.warn(`Transaction recipient mismatch for ${txHash}`, {
          txHash,
          expectedRecipient: serviceWallet.toLowerCase(),
          actualRecipient: tx.to.toLowerCase()
        });
        return false;
      }
      logger.debug(`Transaction recipient check passed`, { txHash, recipient: tx.to });

      // Check payment amount meets minimum fee
      if (tx.value < minFeeWei) {
        logger.warn(`Transaction value insufficient for ${txHash}`, {
          txHash,
          expectedMinFeeWei: minFeeWei.toString(),
          actualValueWei: tx.value.toString()
        });
        return false;
      }
      logger.debug(`Transaction value check passed`, { txHash, value: tx.value.toString() });

      logger.info(`Fee payment verified successfully for tx: ${txHash}`, { txHash });
      return true;
    } catch (error) {
      logger.error(`Error verifying fee payment: ${error.message}`, {
        txHash,
        error: error.message,
        stack: error.stack // Include stack trace for better debugging
       });
      return false; // Ensure false is returned on any error
    }
  }
}

module.exports = new ContractService(); 