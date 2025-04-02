const { TokenConfiguration, DeploymentLog, TokenDistribution } = require('../models');
const contractService = require('./ContractService');
const verificationService = require('./VerificationService');
const chainInfo = require('../utils/chainInfo');
const { SUPPORTED_CHAINS } = require('../constants/chains');
const { ZETACHAIN_ID, ZETACHAIN_TESTNET_ID } = require('../constants/bytecode');
const { Sequelize } = require('sequelize');
const { logger, logDeployment } = require('../utils/logger');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const axios = require('axios');
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
   * Add token distribution records.
   * @param {number} tokenId - The token configuration ID
   * @param {Array} distributions - Array of distribution objects with recipient, chainId, and amount
   * @returns {Promise<Array>} - The created distribution records
   */
  async addTokenDistributions(tokenId, distributions) {
    try {
      // First validate the token exists
      const tokenConfig = await TokenConfiguration.findByPk(tokenId);
      if (!tokenConfig) {
        throw new Error(`Token configuration with ID ${tokenId} not found`);
      }

      // Then validate all distributions
      if (!Array.isArray(distributions) || distributions.length === 0) {
        throw new Error('No valid distributions provided');
      }

      // Create distribution records
      const createdDistributions = [];
      for (const dist of distributions) {
        const { recipientAddress, chainId, tokenAmount } = dist;
        
        // Basic validation
        if (!recipientAddress || !chainId || !tokenAmount) {
          logger.warn(`Skipping invalid distribution record`, {
            tokenId,
            recipientAddress,
            chainId,
            tokenAmount
          });
          continue;
        }

        // Check if chain is in the token's selected chains
        if (!tokenConfig.selectedChains.includes(chainId)) {
          logger.warn(`Chain ${chainId} not selected for token ${tokenId}`, {
            tokenId,
            selectedChains: tokenConfig.selectedChains,
            requestedChain: chainId
          });
          continue;
        }

        // Create the distribution record
        const distribution = await TokenDistribution.create({
          tokenConfigId: tokenId,
          recipientAddress,
          chainId,
          tokenAmount,
          status: 'pending'
        });
        
        createdDistributions.push(distribution);
      }

      logger.info(`Added ${createdDistributions.length} distributions to token ${tokenId}`, {
        tokenId,
        distributionCount: createdDistributions.length
      });

      return createdDistributions;
    } catch (error) {
      logger.error(`Error adding token distributions`, {
        tokenId,
        error: error.message,
        stack: error.stack,
        distributions
      });
      throw error;
    }
  }

  /**
   * Get known tokens for a specific wallet address
   * @param {string} address - Wallet address
   * @returns {Array} - List of known tokens for the wallet
   */
  getKnownTokens(address) {
    logger.info(`Getting known tokens for wallet: ${address}`);
    // Import the utility function here to avoid circular dependencies
    const getKnownTokens = require('../utils/getKnownTokens');
    return getKnownTokens(address);
  }

  /**
   * Process and format matched tokens from Blockscout API
   * @param {Array} matchedTokens - Tokens that match our deployed contracts
   * @param {string} address - Wallet address
   * @returns {Array} - Processed token data in the format expected by the controller
   */
  processTokens(matchedTokens, address) {
    logger.info(`Processing ${matchedTokens.length} matched tokens for ${address}`);
    
    return matchedTokens.map(matchedToken => {
      const { config, ...tokenData } = matchedToken;
      // Access nested data correctly
      const deploymentLog = config.deploymentLog;
      const tokenConfig = config.tokenConfig; 
      const contractAddress = tokenData.address.toLowerCase();
      
      // Create deployment contracts object with chain IDs as keys
      const deployedContracts = {};
      deployedContracts[deploymentLog.chainId] = contractAddress; // Use chain ID from the log
      
      // Format token data for the response
      return {
        id: tokenConfig ? tokenConfig.id : null,
        tokenName: tokenData.name || (tokenConfig ? tokenConfig.tokenName : "Unknown Token"),
        tokenSymbol: tokenData.symbol || (tokenConfig ? tokenConfig.tokenSymbol : "???"),
        iconUrl: tokenConfig ? tokenConfig.iconUrl : null,
        deployedContracts: deployedContracts,
        balances: {
          // Use chainId from the specific deployment log for balance key
          [deploymentLog.chainId]: tokenData.balance || "0" 
        },
        source: "blockscout"
      };
    });
  }

  /**
   * Finds Universal Tokens deployed by this application that are held by a specific user.
   * Queries Blockscout API for tokens held on ZetaChain and matches against database records.
   * @param {string} walletAddress - The user\'s wallet address.
   * @returns {Promise<Array>} - List of token configurations held by the user, including deployed contract addresses.
   */
  async findUserUniversalTokens(address) {
    try {
      logger.info(`Finding universal tokens for wallet: ${address}`);
      // Get known tokens if available, but don't immediately return them
      // We'll combine them with API results instead
      const knownTokens = this.getKnownTokens(address);
      logger.info(`Found ${knownTokens.length} known hardcoded tokens for ${address}`);
      
      logger.info(`Querying database for ZetaChain token contracts`);
      
      // Get all successful ZetaChain deployments created by the specified address
      const deployments = await DeploymentLog.findAll({
        where: {
          status: 'success', // Only include successful deployments
          chainId: { [Op.in]: chainInfo.getAllZetaChainIds() } // Match any ZetaChain ID
        },
        include: [{
          model: TokenConfiguration,
          where: { creatorWallet: address }, // Filter by the creator wallet
          required: true // Ensures only logs linked to the creator are returned
        }]
      });
      
      // Create a mapping of contract addresses to token configurations
      // We'll use this to quickly look up tokens when checking the Blockscout results
      logger.info(`Found ${deployments.length} relevant ZetaChain deployments.`);
      
      // Map contract addresses (lowercase) to their deployment log and token config
      const contractsMap = {};
      deployments.forEach(deployment => {
        if (deployment.contractAddress) {
          contractsMap[deployment.contractAddress.toLowerCase()] = {
            deploymentLog: deployment,
            tokenConfig: deployment.TokenConfiguration // Access the included TokenConfiguration
          };
        }
      });
      
      // Construct the URL for the Blockscout API
      // Using the correct API URL format with 'api/v2' in the path
      const baseUrl = 'https://zetachain-testnet.blockscout.com/api/v2/';
      // Make sure to use a valid path format with a leading slash if needed
      const apiUrl = `${baseUrl}addresses/${address}/tokens?type=ERC-20%2CERC-721%2CERC-1155`;
      
      logger.info(`Querying Blockscout v2 API: ${apiUrl}`);
      
      // Fetch token data from the Blockscout API
      const response = await axios.get(apiUrl);
      
      // Check if the API returned a 200 status and has a data property
      if (response.status === 200 && response.data) {
        const tokensData = response.data.items || [];
        logger.info(`Blockscout API returned ${tokensData.length} tokens for address ${address}`);
        
        // Filter tokens that match our deployed contracts
        const matchedTokens = [];
        tokensData.forEach(token => {
          const contractAddress = token.address ? token.address.toLowerCase() : null;
          if (contractAddress && contractsMap[contractAddress]) {
            logger.info(`Found matching token: ${token.name} (${token.symbol}) at address ${contractAddress}`);
            matchedTokens.push({
              ...token,
              // Pass the nested structure
              config: contractsMap[contractAddress] 
            });
          }
        });
        
        if (matchedTokens.length > 0) {
          logger.info(`Found ${matchedTokens.length} matching tokens`);
          // Process matched tokens to include connected contracts
          const processedTokens = await this.processTokensWithConnectedContracts(matchedTokens, address);
          logger.info(`Combining ${processedTokens.length} processed tokens with ${knownTokens.length} known tokens`);
          return [...processedTokens, ...knownTokens];
        } else {
          logger.info(`No matching tokens found in API, using database deployments directly`);
          
          // If no matches through API but we have deployments, create token entries from the deployments
          if (deployments.length > 0) {
            const dbTokens = await Promise.all(deployments.map(async deployment => {
              const tokenConfig = deployment.TokenConfiguration;
              
              // Get connected contracts for this token
              const connectedContracts = await this.getConnectedContractsForToken(deployment.contractAddress);
              
              // Get balances across chains
              const balances = await this.getBalancesAcrossChains(connectedContracts, address);
              
              return {
                id: tokenConfig.id,
                tokenName: tokenConfig.tokenName,
                tokenSymbol: tokenConfig.tokenSymbol,
                iconUrl: tokenConfig.iconUrl,
                // Include all connected contracts, not just ZetaChain
                deployedContracts: connectedContracts,
                balances: balances,
                source: "database"
              };
            }));
            
            logger.info(`Created ${dbTokens.length} tokens from database deployments with connected contracts`);
            // Combine with known tokens and return
            return [...dbTokens, ...knownTokens];
          }
          
          // If no matches and no direct deployments, fall back to just known tokens
          logger.info(`No matches or deployments found, returning ${knownTokens.length} known tokens`);
          return knownTokens;
        }
      } else {
        logger.info(`Blockscout API did not return valid data, using database deployments`);
        
        // If API call failed but we have deployments, create token entries from the deployments
        if (deployments.length > 0) {
          const dbTokens = await Promise.all(deployments.map(async deployment => {
            const tokenConfig = deployment.TokenConfiguration;
            
            // Get connected contracts for this token
            const connectedContracts = await this.getConnectedContractsForToken(deployment.contractAddress);
            
            // Get balances across chains
            const balances = await this.getBalancesAcrossChains(connectedContracts, address);
            
            return {
              id: tokenConfig.id,
              tokenName: tokenConfig.tokenName,
              tokenSymbol: tokenConfig.tokenSymbol,
              iconUrl: tokenConfig.iconUrl,
              // Include all connected contracts, not just ZetaChain
              deployedContracts: connectedContracts,
              balances: balances,
              source: "database"
            };
          }));
          
          logger.info(`Created ${dbTokens.length} tokens from database deployments`);
          // Combine with known tokens and return
          return [...dbTokens, ...knownTokens];
        }
        
        // Last resort fallback to known tokens
        return knownTokens;
      }
    } catch (error) {
      logger.error(`Blockscout API v2 call failed: ${error.message}`);
      
      // Even if API fails, try to get tokens from the database
      try {
        if (deployments && deployments.length > 0) {
          const dbTokens = await Promise.all(deployments.map(async deployment => {
            const tokenConfig = deployment.TokenConfiguration;
            
            // Get connected contracts for this token
            const connectedContracts = await this.getConnectedContractsForToken(deployment.contractAddress);
            
            // Get balances across chains
            const balances = await this.getBalancesAcrossChains(connectedContracts, address);
            
            return {
              id: tokenConfig.id,
              tokenName: tokenConfig.tokenName,
              tokenSymbol: tokenConfig.tokenSymbol,
              iconUrl: tokenConfig.iconUrl,
              // Include all connected contracts, not just ZetaChain
              deployedContracts: connectedContracts,
              balances: balances,
              source: "database"
            };
          }));
          
          logger.info(`Created ${dbTokens.length} tokens from database after API error`);
          // Combine with known tokens and return
          return [...dbTokens, ...knownTokens];
        }
      } catch (dbError) {
        logger.error(`Failed to get tokens from database after API error: ${dbError.message}`);
      }
      
      // Fallback to known tokens on error
      return knownTokens;
    }
  }

  /**
   * Process tokens to include connected contracts across all chains
   * @param {Array} matchedTokens - Tokens matched from Blockscout API
   * @param {string} address - User's wallet address
   * @returns {Promise<Array>} - Enhanced token objects with connected contracts
   */
  async processTokensWithConnectedContracts(matchedTokens, address) {
    logger.info(`Processing ${matchedTokens.length} matched tokens for ${address}`);
    
    const processedTokensPromises = matchedTokens.map(async matchedToken => {
      const { config, ...tokenData } = matchedToken;
      // Access nested data correctly
      const deploymentLog = config.deploymentLog;
      const tokenConfig = config.tokenConfig; 
      const contractAddress = tokenData.address.toLowerCase();
      
      // Get connected contracts across all chains
      const connectedContracts = await this.getConnectedContractsForToken(contractAddress);
      
      // Get token balances across all chains
      const balances = await this.getBalancesAcrossChains(connectedContracts, address);
      
      // Format token data for the response
      return {
        id: tokenConfig ? tokenConfig.id : null,
        tokenName: tokenData.name || (tokenConfig ? tokenConfig.tokenName : "Unknown Token"),
        tokenSymbol: tokenData.symbol || (tokenConfig ? tokenConfig.tokenSymbol : "???"),
        iconUrl: tokenConfig ? tokenConfig.iconUrl : null,
        deployedContracts: connectedContracts,
        balances: balances,
        source: "blockscout"
      };
    });
    
    return Promise.all(processedTokensPromises);
  }
  
  /**
   * Get connected contracts for a token from ZetaChain
   * @param {string} zetaContractAddress - ZetaChain contract address
   * @returns {Promise<Object>} - Map of chainId to contract address
   */
  async getConnectedContractsForToken(zetaContractAddress) {
    try {
      // Import the connectedContracts utility
      const { getConnectedContracts } = require('../utils/connectedContracts');
      
      // Get connected contracts
      const connectedContracts = await getConnectedContracts(zetaContractAddress);
      logger.info(`Found ${Object.keys(connectedContracts).length} connected contracts for ${zetaContractAddress}`);
      
      return connectedContracts;
    } catch (error) {
      logger.error(`Error getting connected contracts: ${error.message}`, {
        zetaContractAddress,
        stack: error.stack
      });
      
      // Return just the ZetaChain contract as fallback
      const zetaChainId = chainInfo.getPrimaryZetaChainId();
      return {
        [zetaChainId]: zetaContractAddress
      };
    }
  }
  
  /**
   * Get token balances across all chains
   * @param {Object} contractAddresses - Map of chainId to contract address
   * @param {string} walletAddress - User's wallet address
   * @returns {Promise<Object>} - Map of chainId to token balance
   */
  async getBalancesAcrossChains(contractAddresses, walletAddress) {
    try {
      // Import the balances utility
      const { getTokenBalancesAcrossChains } = require('../utils/connectedContracts');
      
      // Get balances across chains
      const balances = await getTokenBalancesAcrossChains(contractAddresses, walletAddress);
      return balances;
    } catch (error) {
      logger.error(`Error getting balances across chains: ${error.message}`, {
        walletAddress,
        contractAddresses: Object.keys(contractAddresses).join(','),
        stack: error.stack
      });
      
      // Return empty balances as fallback
      const defaultBalances = {};
      Object.keys(contractAddresses).forEach(chainId => {
        defaultBalances[chainId] = "0";
      });
      
      return defaultBalances;
    }
  }
}

module.exports = new TokenService(); 