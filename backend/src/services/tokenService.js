const { TokenConfiguration, DeploymentLog, TokenDistribution } = require('../models');
const contractService = require('./ContractService');
const verificationService = require('./VerificationService');
const chainInfo = require('../utils/chainInfo');
const { SUPPORTED_CHAINS } = require('../constants/chains');
const { ZETACHAIN_ID, ZETACHAIN_TESTNET_ID } = require('../constants/bytecode');
const { Sequelize } = require('sequelize');
const { logger, logDeployment } = require('../utils/logger');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const { Op } = require('sequelize');

class TokenService {
  /**
   * Create a new token configuration
   * @param {Object} tokenData - The token configuration data
   * @returns {Promise<Object>} - The created token configuration
   */
  async createTokenConfiguration(tokenData) {
    try {
      const {
        creatorWallet,
        tokenName,
        tokenSymbol,
        decimals = 18,
        totalSupply,
        iconUrl,
        distributionsJson,
        selectedChains
      } = tokenData;

      // Validate required fields
      if (!creatorWallet || !tokenName || !tokenSymbol || !totalSupply || !selectedChains) {
        throw new Error('Missing required token configuration fields');
      }

      // Create token configuration
      const tokenConfig = await TokenConfiguration.create({
        creatorWallet,
        tokenName,
        tokenSymbol,
        decimals,
        totalSupply,
        iconUrl,
        distributionsJson,
        selectedChains,
        deploymentStatus: 'pending'
      });

      logger.info(`Token configuration created`, {
        tokenId: tokenConfig.id,
        tokenName,
        tokenSymbol,
        creatorWallet,
        selectedChains
      });

      // Create deployment logs for each selected chain
      const deploymentPromises = selectedChains.map(async (chainId) => {
        if (!SUPPORTED_CHAINS[chainId]) {
          logger.warn(`Unsupported chain ID: ${chainId}`, {
            tokenId: tokenConfig.id,
            chainId
          });
          return null;
        }

        const chainInfo = SUPPORTED_CHAINS[chainId];
        return DeploymentLog.create({
          tokenConfigId: tokenConfig.id,
          chainName: chainInfo.name,
          chainId,
          status: 'pending',
          verificationStatus: 'pending'
        });
      });

      await Promise.all(deploymentPromises.filter(p => p !== null));

      // If distributions are provided, create distribution records
      if (distributionsJson && Array.isArray(distributionsJson) && distributionsJson.length > 0) {
        const distributionPromises = distributionsJson.map(async (dist) => {
          return TokenDistribution.create({
            tokenConfigId: tokenConfig.id,
            recipientAddress: dist.recipient_address,
            chainId: dist.chain_id,
            tokenAmount: dist.token_amount,
            status: 'pending'
          });
        });

        await Promise.all(distributionPromises);
      }

      return tokenConfig;
    } catch (error) {
      logger.error(`Error creating token configuration`, {
        error: error.message,
        stack: error.stack,
        tokenData
      });
      throw error;
    }
  }

  /**
   * Deploy a token based on configuration
   * @param {number} tokenId - The token configuration ID
   * @param {string} feePaidTx - The fee payment transaction hash
   * @returns {Promise<boolean>} - Whether the deployment was initiated successfully
   */
  async deployToken(tokenId, feePaidTx) {
    try {
      // Get token configuration
      const tokenConfig = await TokenConfiguration.findByPk(tokenId);
      if (!tokenConfig) {
        throw new Error(`Token configuration with ID ${tokenId} not found`);
      }

      logger.info(`Initiating token deployment`, {
        tokenId,
        feePaidTx,
        tokenName: tokenConfig.tokenName
      });

      // Verify fee payment
      const isFeeValid = await contractService.verifyFeePayment(feePaidTx);
      if (!isFeeValid) {
        logger.warn(`Invalid fee payment transaction`, {
          tokenId,
          feePaidTx
        });
        throw new Error('Invalid fee payment transaction');
      }

      // Update token configuration with fee transaction
      await tokenConfig.update({
        feePaidTx,
        deploymentStatus: 'deploying'
      });

      logger.info(`Token deployment status updated to deploying`, {
        tokenId,
        feePaidTx
      });

      // Start deployment process in background
      this.processDeployment(tokenConfig)
        .catch(error => {
          logger.error(`Error in deployment process`, {
            tokenId: tokenConfig.id,
            error: error.message,
            stack: error.stack
          });
        });

      return true;
    } catch (error) {
      logger.error(`Error deploying token`, {
        tokenId,
        error: error.message,
        stack: error.stack,
        feePaidTx
      });
      throw error;
    }
  }

  /**
   * Process the token deployment across all selected chains
   * @param {Object} tokenConfig - The token configuration object
   * @param {number} maxRetries - Maximum number of retry attempts per deployment
   * @returns {Promise<void>}
   */
  async processDeployment(tokenConfig, maxRetries = 2) {
    try {
      // Check if token config is valid
      if (!tokenConfig || !tokenConfig.id) {
        throw new Error('Invalid token configuration');
      }

      const {
        id,
        tokenName,
        tokenSymbol,
        decimals,
        totalSupply,
        creatorWallet,
        selectedChains
      } = tokenConfig;

      // Determine ZetaChain ID based on current environment
      const actualZetaChainId = chainInfo.findZetaChainId(selectedChains);
      
      logDeployment('start', id, 'all', 'started', {
        tokenName,
        tokenSymbol,
        creatorWallet,
        selectedChains,
        maxRetries
      });

      // Step 1: Ensure ZetaChain is in the selected chains
      if (!actualZetaChainId) {
        throw new Error('ZetaChain must be included in selected chains');
      }

      // Step 2: Deploy on ZetaChain first
      logDeployment('deploy', id, actualZetaChainId, 'started', {
        chainName: 'ZetaChain',
        tokenName
      });
      
      // Try to find the deployment log for ZetaChain using the actual chain ID found
      let zetaChainLog = await DeploymentLog.findOne({
        where: {
          tokenConfigId: id,
          chainId: actualZetaChainId
        }
      });

      // If not found, try looking for logs for any of the ZetaChain IDs
      if (!zetaChainLog) {
        logger.debug('Deployment log not found for specific ZetaChain ID, trying alternate lookup...', {
          tokenId: id,
          chainId: actualZetaChainId
        });
        
        // Look for any deployment log with a ZetaChain chain name
        zetaChainLog = await DeploymentLog.findOne({
          where: {
            tokenConfigId: id,
            [Sequelize.Op.or]: [
              { chainId: { [Sequelize.Op.in]: chainInfo.getAllZetaChainIds() } },
              { chainName: { [Sequelize.Op.like]: '%ZetaChain%' } }
            ]
          }
        });
        
        // If found, update the log with the actual ZetaChain ID being used
        if (zetaChainLog) {
          logger.debug(`Found ZetaChain deployment log with ID: ${zetaChainLog.chainId}`, {
            tokenId: id,
            foundChainId: zetaChainLog.chainId,
            actualChainId: actualZetaChainId
          });
        }
      }

      // If still not found, create a new deployment log for ZetaChain
      if (!zetaChainLog) {
        logger.info(`Creating new deployment log for ZetaChain`, {
          tokenId: id,
          chainId: actualZetaChainId
        });
        
        const chain = chainInfo.getChainInfo(actualZetaChainId);
        
        if (!chain) {
          throw new Error(`Chain information not found for ZetaChain ID: ${actualZetaChainId}`);
        }
        
        zetaChainLog = await DeploymentLog.create({
          tokenConfigId: id,
          chainName: chain.name,
          chainId: actualZetaChainId,
          status: 'pending',
          verificationStatus: 'pending',
          deployAttempts: 0
        });
      }

      await zetaChainLog.update({ 
        status: 'deploying',
        deployAttempts: (zetaChainLog.deployAttempts || 0) + 1
      });

      // Deploy on ZetaChain with retry logic
      let zetaChainDeployment;
      let zetaDeployAttempt = 1;
      let zetaDeploySuccess = false;
      
      while (!zetaDeploySuccess && zetaDeployAttempt <= maxRetries) {
        try {
          // If this is a retry, update the attempt count
          if (zetaDeployAttempt > 1) {
            logger.info(`Retrying ZetaChain deployment, attempt ${zetaDeployAttempt} of ${maxRetries}`, {
              tokenId: id,
              chainId: actualZetaChainId,
              attempt: zetaDeployAttempt
            });
            
            await zetaChainLog.update({ 
              status: 'retrying',
              deployAttempts: zetaDeployAttempt,
              lastRetryAt: new Date()
            });
            
            // Wait a bit before retrying
            await new Promise(resolve => setTimeout(resolve, 5000));
          }
          
          zetaChainDeployment = await contractService.deployZetaChainUniversalToken(
            tokenName,
            tokenSymbol,
            decimals,
            totalSupply.toString(),
            creatorWallet,
            zetaDeployAttempt
          );
          
          zetaDeploySuccess = true;
        } catch (deployError) {
          if (zetaDeployAttempt >= maxRetries) {
            // Final attempt failed
            logger.error(`All deployment attempts failed for ZetaChain`, {
              tokenId: id,
              chainId: actualZetaChainId,
              maxRetries,
              error: deployError.message
            });
            
            await zetaChainLog.update({
              status: 'failed',
              errorMessage: `Failed after ${maxRetries} attempts: ${deployError.message}`,
              deployAttempts: zetaDeployAttempt,
              lastError: deployError.message
            });
            
            // Exit deployment process
            await tokenConfig.update({ 
              deploymentStatus: 'failed',
              deploymentError: `ZetaChain deployment failed after ${maxRetries} attempts`
            });
            
            logDeployment('deploy', id, actualZetaChainId, 'failed', {
              error: deployError.message,
              attempts: zetaDeployAttempt
            });
            
            return;
          } else {
            // Log the failure but continue to next attempt
            logger.warn(`ZetaChain deployment attempt ${zetaDeployAttempt} failed`, {
              tokenId: id,
              chainId: actualZetaChainId,
              attempt: zetaDeployAttempt,
              error: deployError.message
            });
            
            // Update log with failure info
            await zetaChainLog.update({
              lastError: deployError.message,
              deployAttempts: zetaDeployAttempt
            });
            
            zetaDeployAttempt++;
          }
        }
      }

      // If deployment was successful
      if (zetaDeploySuccess) {
        await zetaChainLog.update({
          status: 'success',
          contractAddress: zetaChainDeployment.contractAddress,
          transactionHash: zetaChainDeployment.transactionHash,
          verificationStatus: 'processing',
          deployAttempts: zetaDeployAttempt,
          completedAt: new Date()
        });
        
        logDeployment('deploy', id, actualZetaChainId, 'success', {
          contractAddress: zetaChainDeployment.contractAddress,
          transactionHash: zetaChainDeployment.transactionHash,
          attempts: zetaDeployAttempt
        });
        
        // Attempt to verify the contract
        try {
          logDeployment('verify', id, actualZetaChainId, 'started', {
            contractAddress: zetaChainDeployment.contractAddress
          });
          
          // Wait a bit longer for the contract to be properly indexed
          await new Promise(resolve => setTimeout(resolve, 15000)); // 15 second delay
          
          const verificationResult = await verificationService.verifyContract(
            actualZetaChainId,
            zetaChainDeployment.contractAddress,
            'ZetaChainUniversalToken',
            {
              compilerVersion: '0.8.26',
              optimization: true,
              runs: 200
            }
          );
          
          if (verificationResult.success) {
            await zetaChainLog.update({
              verificationStatus: 'verified',
              verifiedUrl: verificationResult.explorerUrl
            });
            
            logDeployment('verify', id, actualZetaChainId, 'success', {
              explorerUrl: verificationResult.explorerUrl
            });
          } else {
            await zetaChainLog.update({
              verificationStatus: 'failed',
              verificationError: verificationResult.message
            });
            
            logDeployment('verify', id, actualZetaChainId, 'failed', {
              error: verificationResult.message
            });
          }
        } catch (verificationError) {
          logger.error(`Error verifying ZetaChain contract`, {
            tokenId: id,
            chainId: actualZetaChainId,
            contractAddress: zetaChainDeployment.contractAddress,
            error: verificationError.message,
            stack: verificationError.stack
          });
          
          await zetaChainLog.update({
            verificationStatus: 'failed',
            verificationError: verificationError.message
          });
          
          logDeployment('verify', id, actualZetaChainId, 'error', {
            error: verificationError.message
          });
        }
      } else {
        // This should not happen with the retry logic above, but just in case
        throw new Error(`ZetaChain deployment failed after all attempts`);
      }

      // Step 3: Deploy on other selected chains
      const evmChains = selectedChains.filter(chainId => chainId != actualZetaChainId);
      const evmDeployments = {};

      for (const chainId of evmChains) {
        const chain = chainInfo.getChainInfo(chainId);
        
        if (!chain) {
          logger.warn(`Chain information not found for chain ID: ${chainId}`, {
            tokenId: id,
            chainId
          });
          continue;
        }
        
        if (chainInfo.isZetaChain(chainId)) {
          logger.warn(`Skipping additional ZetaChain ID: ${chainId}`, {
            tokenId: id,
            chainId,
            actualZetaChainId
          });
          continue;
        }

        logDeployment('deploy', id, chainId, 'started', {
          chainName: chain.name,
          tokenName
        });
        
        // Find deployment log for this chain
        let chainLog = await DeploymentLog.findOne({
          where: {
            tokenConfigId: id,
            chainId
          }
        });

        // If not found, create a new deployment log
        if (!chainLog) {
          logger.info(`Creating new deployment log for chain ${chainId}`, {
            tokenId: id,
            chainId,
            chainName: chain.name
          });
          
          chainLog = await DeploymentLog.create({
            tokenConfigId: id,
            chainName: chain.name,
            chainId,
            status: 'pending',
            verificationStatus: 'pending'
          });
        }

        await chainLog.update({ status: 'deploying' });
        
        // Deploy on the EVM chain
        try {
          const evmDeployment = await contractService.deployEVMUniversalToken(
            chainId,
            tokenName,
            tokenSymbol,
            decimals,
            totalSupply.toString(),
            creatorWallet
          );

          await chainLog.update({
            status: 'success',
            contractAddress: evmDeployment.contractAddress,
            transactionHash: evmDeployment.transactionHash,
            verificationStatus: 'processing'
          });

          evmDeployments[chainId] = evmDeployment;
          
          logDeployment('deploy', id, chainId, 'success', {
            contractAddress: evmDeployment.contractAddress,
            transactionHash: evmDeployment.transactionHash,
            chainName: chain.name
          });
          
          // Attempt to verify the contract
          try {
            logDeployment('verify', id, chainId, 'started', {
              contractAddress: evmDeployment.contractAddress,
              chainName: chain.name
            });
            
            // Wait a bit longer for the contract to be properly indexed
            await new Promise(resolve => setTimeout(resolve, 15000)); // 15 second delay
            
            const verificationResult = await verificationService.verifyContract(
              chainId,
              evmDeployment.contractAddress,
              'EVMUniversalToken',
              {
                compilerVersion: '0.8.26',
                optimization: true,
                runs: 200
              }
            );
            
            if (verificationResult.success) {
              await chainLog.update({
                verificationStatus: 'verified',
                verifiedUrl: verificationResult.explorerUrl
              });
              
              logDeployment('verify', id, chainId, 'success', {
                explorerUrl: verificationResult.explorerUrl,
                chainName: chain.name
              });
            } else {
              await chainLog.update({
                verificationStatus: 'failed',
                verificationError: verificationResult.message
              });
              
              logDeployment('verify', id, chainId, 'failed', {
                error: verificationResult.message,
                chainName: chain.name
              });
            }
          } catch (verificationError) {
            logger.error(`Error verifying contract on chain ${chainId}`, {
              tokenId: id,
              chainId,
              chainName: chain.name,
              contractAddress: evmDeployment.contractAddress,
              error: verificationError.message,
              stack: verificationError.stack
            });
            
            await chainLog.update({
              verificationStatus: 'failed',
              verificationError: verificationError.message
            });
            
            logDeployment('verify', id, chainId, 'error', {
              error: verificationError.message,
              chainName: chain.name
            });
          }
        } catch (error) {
          logger.error(`Error deploying on chain ${chainId}`, {
            tokenId: id,
            chainId,
            chainName: chain.name,
            error: error.message,
            stack: error.stack
          });
          
          await chainLog.update({
            status: 'failed',
            errorMessage: error.message,
            verificationStatus: 'skipped'
          });
          
          logDeployment('deploy', id, chainId, 'failed', {
            error: error.message,
            chainName: chain.name
          });
          
          // Continue with other chains despite failure
        }
      }

      // Step 4: Connect ZetaChain token to each EVM token
      for (const chainId in evmDeployments) {
        logDeployment('connect', id, chainId, 'started', {
          zetaChainAddress: zetaChainDeployment.contractAddress,
          evmAddress: evmDeployments[chainId].contractAddress,
          zetaChainId: actualZetaChainId
        });
        
        try {
          const connectionResult = await contractService.connectTokens(
            actualZetaChainId, // Use the actual ZetaChain ID found earlier
            zetaChainDeployment.contractAddress,
            chainId,
            evmDeployments[chainId].contractAddress
          );
          
          logDeployment('connect', id, chainId, 'success', {
            zetaChainTxHash: connectionResult.zetaChainTxHash,
            evmTxHash: connectionResult.evmTxHash,
            zetaChainId: actualZetaChainId
          });

          // Add explorer links
          const zetaChainTxUrl = chainInfo.getExplorerTxUrl(actualZetaChainId, connectionResult.zetaChainTxHash);
          const evmChainTxUrl = chainInfo.getExplorerTxUrl(chainId, connectionResult.evmTxHash);
          
          if (zetaChainTxUrl) {
            logger.info(`Connection ZetaChain TX URL: ${zetaChainTxUrl}`, {
              tokenId: id,
              chainId: actualZetaChainId,
              txHash: connectionResult.zetaChainTxHash
            });
          }
          
          if (evmChainTxUrl) {
            logger.info(`Connection EVM Chain TX URL: ${evmChainTxUrl}`, {
              tokenId: id,
              chainId,
              txHash: connectionResult.evmTxHash
            });
          }
        } catch (error) {
          logger.error(`Error connecting tokens for chain ${chainId}`, {
            tokenId: id,
            zetaChainId: actualZetaChainId,
            evmChainId: chainId,
            zetaChainAddress: zetaChainDeployment.contractAddress,
            evmAddress: evmDeployments[chainId].contractAddress,
            error: error.message,
            stack: error.stack
          });
          
          logDeployment('connect', id, chainId, 'failed', {
            error: error.message,
            zetaChainId: actualZetaChainId
          });
          
          // Continue with other connections despite failure
        }
      }

      // Step 5: Update overall deployment status
      const allLogs = await DeploymentLog.findAll({ where: { tokenConfigId: id } });

      const failedLogs = allLogs.filter(log => log.status === 'failed');
      const successLogs = allLogs.filter(log => log.status === 'success');
      // Check for logs actively deploying/retrying
      const activeDeployLogs = allLogs.filter(log => ['deploying', 'retrying'].includes(log.status));
      // Check for logs stuck in initial pending or verification processing
      // Note: 'processing' might be a status used by verificationService
      const stuckLogs = allLogs.filter(log => ['pending', 'processing'].includes(log.status)); 

      let newStatus;

      if (activeDeployLogs.length > 0) {
          // If anything is actively deploying or retrying, the overall status is still deploying
          newStatus = 'deploying';
      } else if (failedLogs.length === allLogs.length) {
          // All attempts failed
          newStatus = 'failed';
      } else if (successLogs.length === allLogs.length) {
          // All succeeded (and none are actively deploying/stuck)
          newStatus = 'completed';
      } else if (failedLogs.length > 0) {
          // Some failed, none are actively deploying/retrying (implies some succeeded or are stuck)
          newStatus = 'partial';
      } else if (stuckLogs.length > 0) {
           // None failed, none actively deploying, but some are stuck in pending/processing
           logger.warn(`Deployment ${id} has stuck logs in pending/processing state. Treating as partial.`, { stuckLogCount: stuckLogs.length });
           newStatus = 'partial'; // Treat as incomplete/partial
      } else {
           // Fallback case if logic misses something
           const totalAccounted = successLogs.length + failedLogs.length + activeDeployLogs.length + stuckLogs.length;
           // Check if all logs are accounted for and at least one succeeded
           if (totalAccounted === allLogs.length && successLogs.length > 0) {
               logger.warn(`All logs accounted for for deployment ${id}. Assuming 'completed' based on ${successLogs.length} successes.`);
               newStatus = 'completed';
           } else {
              logger.warn(`Unexpected log state combination for deployment ${id}. Defaulting to partial.`, { logCount: allLogs.length, successCount: successLogs.length, failedCount: failedLogs.length, activeCount: activeDeployLogs.length, stuckCount: stuckLogs.length });
              newStatus = 'partial'; // Safer default
           }
      }

      logger.info(`Updating deployment status for token ${id}`, {
        tokenId: id,
        newStatus,
        successCount: successLogs.length,
        failedCount: failedLogs.length,
        pendingCount: stuckLogs.length,
        totalCount: allLogs.length
      });
      
      await tokenConfig.update({ deploymentStatus: newStatus });

      logDeployment('complete', id, 'all', newStatus, {
        successCount: successLogs.length,
        failedCount: failedLogs.length,
        pendingCount: stuckLogs.length,
        totalCount: allLogs.length
      });
    } catch (error) {
      logger.error(`Error in deployment process`, {
        tokenId: tokenConfig ? tokenConfig.id : 'unknown',
        error: error.message,
        stack: error.stack
      });
      
      // Update token config status to failed
      if (tokenConfig && tokenConfig.id) {
        try {
          await tokenConfig.update({ 
            deploymentStatus: 'failed',
            deploymentError: error.message
          });

          // Also update any pending deployment logs to failed
          await DeploymentLog.update(
            { 
              status: 'failed',
              errorMessage: `Process error: ${error.message}`,
              verificationStatus: 'skipped'
            },
            { 
              where: { 
                tokenConfigId: tokenConfig.id,
                status: ['pending', 'deploying']
              } 
            }
          );
          
          logDeployment('error', tokenConfig.id, 'all', 'failed', {
            error: error.message
          });
        } catch (updateError) {
          logger.error(`Failed to update token status after error`, {
            tokenId: tokenConfig.id,
            originalError: error.message,
            updateError: updateError.message
          });
        }
      }
    }
  }

  /**
   * Get a token configuration by ID
   * @param {number} tokenId - The token configuration ID
   * @returns {Promise<Object>} - The token configuration
   */
  async getTokenById(tokenId) {
    try {
      const tokenConfig = await TokenConfiguration.findByPk(tokenId);
      if (!tokenConfig) {
        logger.warn(`Token configuration not found`, { tokenId });
        throw new Error(`Token configuration with ID ${tokenId} not found`);
      }
      return tokenConfig;
    } catch (error) {
      logger.error(`Error getting token configuration`, {
        tokenId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get all token configurations
   * @param {string} creatorWallet - Optional filter by creator wallet
   * @returns {Promise<Array>} - List of token configurations
   */
  async getTokens(creatorWallet = null) {
    try {
      const where = creatorWallet ? { creatorWallet } : {};
      const tokens = await TokenConfiguration.findAll({
        where,
        order: [['createdAt', 'DESC']]
      });
      return tokens;
    } catch (error) {
      logger.error(`Error getting token configurations`, {
        creatorWallet,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get deployment logs for a token
   * @param {number} tokenId - The token configuration ID
   * @returns {Promise<Array>} - List of deployment logs
   */
  async getDeploymentLogs(tokenId) {
    try {
      const logs = await DeploymentLog.findAll({
        where: { tokenConfigId: tokenId },
        order: [['created_at', 'DESC']]
      });
      
      logger.debug(`Retrieved deployment logs`, {
        tokenId,
        logCount: logs.length
      });
      
      return logs;
    } catch (error) {
      logger.error(`Error getting deployment logs`, {
        tokenId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Finds Universal Tokens deployed by this application that are held by a specific user.
   * Queries Blockscout API for tokens held on ZetaChain and matches against database records.
   * @param {string} walletAddress - The user's wallet address.
   * @returns {Promise<Array>} - List of token configurations held by the user, including deployed contract addresses.
   */
  async findUserUniversalTokens(walletAddress) {
    logger.info(`Finding universal tokens for wallet: ${walletAddress}`);
    try {
      // Define known contract addresses from documentation
      const knownContracts = {
        // ZetaChain Testnet (documentation mentions this contract address)
        '0x51d5D00dfB9e1f4D60BBD6eda288F44Fb3158E16': {
          tokenName: 'Universal Token',
          tokenSymbol: 'UTKN',
          chainId: String(ZETACHAIN_TESTNET_ID),
          isDocumented: true
        },
        // Sepolia Testnet
        '0x0b3D12246660b41f982f07CdCd27536a79a16296': {
          tokenName: 'Universal Token',
          tokenSymbol: 'UTKN',
          chainId: '11155111', // Sepolia chain ID
          isDocumented: true
        }
      };

      // 1. Get all *successful* ZetaChain Universal Token contract deployments from our DB
      logger.info('Querying database for ZetaChain token contracts');
      const ourZetaChainDeployments = await DeploymentLog.findAll({
        where: {
          chainId: String(ZETACHAIN_TESTNET_ID),
          status: 'success',
          contractAddress: { [Op.ne]: null } // Ensure contract address exists
        },
        attributes: ['contractAddress', 'tokenConfigId'], // Select only needed fields
        raw: true, // Get plain data objects
      });

      console.log(`[DEBUG] Found ${ourZetaChainDeployments?.length || 0} ZetaChain contract deployments in database`);
      
      if (ourZetaChainDeployments && ourZetaChainDeployments.length > 0) {
        console.log(`[DEBUG] First contract: ${JSON.stringify(ourZetaChainDeployments[0])}`);
      }

      // Create a map for quick lookup: zetaContractAddress -> tokenConfigId
      const ourZetaContractsMap = new Map();
      
      if (ourZetaChainDeployments && ourZetaChainDeployments.length > 0) {
        ourZetaChainDeployments.forEach(d => {
          ourZetaContractsMap.set(d.contractAddress.toLowerCase(), d.tokenConfigId);
        });
      }
      
      const ourZetaContractAddresses = Array.from(ourZetaContractsMap.keys());
      logger.info(`Found ${ourZetaContractAddresses.length} unique ZetaChain contracts deployed by us.`);

      // 2. Query Blockscout API v2 for tokens held by the user on ZetaChain Testnet
      // Use the v2 API format as per example
      const baseBlockscoutUrl = process.env.ZETACHAIN_TESTNET_BLOCKSCOUT_API || 'https://zetachain-testnet.blockscout.com/api';
      // Remove the trailing '/api' if present to construct the base URL
      const baseUrl = baseBlockscoutUrl.endsWith('/api') 
        ? baseBlockscoutUrl.slice(0, -4) 
        : baseBlockscoutUrl;
      
      console.log(`[DEBUG] Environment variable ZETACHAIN_TESTNET_BLOCKSCOUT_API: ${process.env.ZETACHAIN_TESTNET_BLOCKSCOUT_API}`);
      console.log(`[DEBUG] Constructed baseUrl: ${baseUrl}`);
      
      const blockscoutApiUrl = `${baseUrl}/v2/addresses/${walletAddress}/tokens?type=ERC-20%2CERC-721%2CERC-1155`;
      logger.info(`Querying Blockscout v2 API: ${blockscoutApiUrl}`);
      
      // Log the API URL for debugging
      console.log(`Making Blockscout API v2 request to: ${blockscoutApiUrl}`);
      
      let userTokensFromApi = [];
      try {
        // Add API key if available
        const headers = {};
        if (process.env.BLOCKSCOUT_API_KEY) {
          console.log(`[DEBUG] Using API key: ${process.env.BLOCKSCOUT_API_KEY.substring(0, 4)}...`);
          headers['api-key'] = process.env.BLOCKSCOUT_API_KEY;
        } else {
          console.log(`[DEBUG] No API key found in environment variables`);
        }
        
        console.log(`[DEBUG] Making fetch request with headers:`, headers);
        
        try {
          const response = await fetch(blockscoutApiUrl, { headers });
          console.log(`[DEBUG] Response status:`, response.status);
          console.log(`[DEBUG] Response headers:`, Object.fromEntries([...response.headers]));
          
          // Log the raw response for debugging
          const responseText = await response.text();
          console.log(`Blockscout API v2 raw response sample: ${responseText.substring(0, 500)}...`);
          
          if (!response.ok) {
            throw new Error(`Blockscout API v2 request failed with status ${response.status}: ${responseText}`);
          }
          
          // Parse JSON after we've already read the text
          let data;
          try {
            data = JSON.parse(responseText);
            console.log(`[DEBUG] Parsed JSON data structure keys:`, Object.keys(data));
          } catch (parseError) {
            throw new Error(`Failed to parse Blockscout API v2 response: ${parseError.message}, Response: ${responseText.substring(0, 200)}...`);
          }
          
          if (data && data.items && Array.isArray(data.items)) {
            userTokensFromApi = data.items;
            console.log(`[DEBUG] Found ${userTokensFromApi.length} tokens, first token keys:`, 
              userTokensFromApi.length > 0 ? Object.keys(userTokensFromApi[0]) : '[]');
            
            if (userTokensFromApi.length > 0 && userTokensFromApi[0].token) {
              console.log(`[DEBUG] First token structure:`, Object.keys(userTokensFromApi[0].token));
              console.log(`[DEBUG] First token address:`, userTokensFromApi[0].token.address);
            }
            
            logger.info(`Blockscout v2 returned ${userTokensFromApi.length} tokens for ${walletAddress}`);
            
            // Log a sample token for debugging
            if (userTokensFromApi.length > 0) {
              console.log(`Sample token data: ${JSON.stringify(userTokensFromApi[0])}`);
            }
          } else {
            // Handle case where no tokens are found
            console.log(`[DEBUG] No items array found in response or empty items`);
            logger.info(`Blockscout v2 found no tokens for ${walletAddress}`);
          }
        } catch (fetchError) {
          console.error(`[ERROR] Fetch operation failed:`, fetchError);
          throw fetchError;
        }
      } catch (apiError) {
         logger.error(`Blockscout API v2 call failed: ${apiError.message}`);
         // Return empty array instead of throwing - better UX when API has issues
         console.error(`Blockscout API error details:`, apiError);
         return []; // Return empty array instead of throwing error
      }

      // 3. Find universal tokens: match with DB deployments OR known contract addresses
      console.log(`[DEBUG] Looking for matching tokens in ${userTokensFromApi.length} user tokens`);
      
      // Array to store matching token data (both from DB and known contracts)
      const matchingTokens = [];
      
      // First check for matches with database deployments
      if (ourZetaContractsMap.size > 0) {
        console.log(`[DEBUG] Checking against ${ourZetaContractAddresses.length} app-deployed contracts`);
        
        // For each token held by user, check if it's in our database
        for (const token of userTokensFromApi) {
          const contractAddressLower = token.token?.address?.toLowerCase();
          console.log(`[DEBUG] Checking token address: ${contractAddressLower}`);
          
          if (contractAddressLower && ourZetaContractsMap.has(contractAddressLower)) {
            // This is a Universal Token deployed by our app, held by the user
            const tokenConfigId = ourZetaContractsMap.get(contractAddressLower);
            console.log(`[DEBUG] Found matching token with config ID: ${tokenConfigId}`);
            
            // Get the full token configuration
            const tokenConfig = await TokenConfiguration.findByPk(tokenConfigId, {
              include: [{
                model: DeploymentLog,
                as: 'deployments',
                where: { status: 'success', contractAddress: { [Op.ne]: null } },
                attributes: ['chainId', 'contractAddress'],
                required: false
              }]
            });
            
            if (tokenConfig) {
              // Prepare deployment contracts map
              const deployedContracts = {};
              const balances = {};
              
              if (tokenConfig.deployments && Array.isArray(tokenConfig.deployments)) {
                tokenConfig.deployments.forEach(depLog => {
                  deployedContracts[depLog.chainId] = depLog.contractAddress;
                  balances[depLog.chainId] = "0"; // Default balance
                });
              }
              
              // Add balance from BlockScout
              balances[ZETACHAIN_TESTNET_ID] = token.value || "0";
              
              // Add to results
              matchingTokens.push({
                id: tokenConfig.id,
                tokenName: tokenConfig.tokenName,
                tokenSymbol: tokenConfig.tokenSymbol,
                iconUrl: tokenConfig.iconUrl,
                deployedContracts: deployedContracts,
                balances: balances,
                source: 'database'
              });
            }
          }
        }
      }
      
      // Then check against known contract addresses
      console.log(`[DEBUG] Checking against known contract addresses from documentation`);
      for (const token of userTokensFromApi) {
        const contractAddress = token.token?.address;
        
        if (contractAddress && knownContracts[contractAddress]) {
          console.log(`[DEBUG] Found token matching known contract: ${contractAddress}`);
          
          const knownContract = knownContracts[contractAddress];
          const deployedContracts = {};
          const balances = {};
          
          // Set up contracts and balances
          deployedContracts[knownContract.chainId] = contractAddress;
          balances[knownContract.chainId] = token.value || "0";
          
          // Check if we've already added this token (avoid duplicates)
          const isDuplicate = matchingTokens.some(t => 
            t.deployedContracts[knownContract.chainId] === contractAddress
          );
          
          if (!isDuplicate) {
            // Add to results
            matchingTokens.push({
              id: null, // No database ID since it's from documentation
              tokenName: knownContract.tokenName,
              tokenSymbol: knownContract.tokenSymbol,
              iconUrl: null,
              deployedContracts: deployedContracts,
              balances: balances,
              source: 'documentation'
            });
          }
        }
      }
      
      logger.info(`Found ${matchingTokens.length} universal tokens for ${walletAddress}`);
      
      // Final debug output
      console.log(`[DEBUG] Final result: returning ${matchingTokens.length} tokens to frontend`);
      if (matchingTokens.length > 0) {
        matchingTokens.forEach((token, index) => {
          console.log(`[DEBUG] Token ${index + 1}: ${token.tokenName} (${token.tokenSymbol}) from ${token.source}`);
          console.log(`[DEBUG] Deployed on chains:`, Object.keys(token.deployedContracts));
          console.log(`[DEBUG] Balances:`, token.balances);
        });
      }
      
      return matchingTokens;

    } catch (error) {
      logger.error(`Error in findUserUniversalTokens for ${walletAddress}: ${error.message}`, { stack: error.stack });
      console.error(`[ERROR] Complete error details:`, error);
      // Rethrow or handle specific errors (e.g., database connection)
      throw error; 
    }
  }
}

module.exports = new TokenService(); 