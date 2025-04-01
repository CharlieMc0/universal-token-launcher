const { TokenConfiguration, DeploymentLog, TokenDistribution } = require('../models');
const contractService = require('./ContractService');
const verificationService = require('./VerificationService');
const chainInfo = require('../utils/chainInfo');
const { SUPPORTED_CHAINS } = require('../constants/chains');
const { ZETACHAIN_ID, ZETACHAIN_TESTNET_ID } = require('../constants/bytecode');
const { Sequelize } = require('sequelize');
const { logger, logDeployment } = require('../utils/logger');

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
      const allLogs = await DeploymentLog.findAll({
        where: { tokenConfigId: id }
      });

      const failedLogs = allLogs.filter(log => log.status === 'failed');
      const successLogs = allLogs.filter(log => log.status === 'success');
      const pendingLogs = allLogs.filter(log => ['pending', 'deploying'].includes(log.status));

      let newStatus = 'completed';

      if (failedLogs.length === allLogs.length) {
        newStatus = 'failed';
      } else if (successLogs.length === allLogs.length) {
        newStatus = 'completed';
      } else if (pendingLogs.length > 0) {
        newStatus = 'deploying';
      } else if (failedLogs.length > 0) {
        newStatus = 'partial';
      }

      logger.info(`Updating deployment status for token ${id}`, {
        tokenId: id,
        newStatus,
        successCount: successLogs.length,
        failedCount: failedLogs.length,
        pendingCount: pendingLogs.length,
        totalCount: allLogs.length
      });
      
      await tokenConfig.update({ deploymentStatus: newStatus });

      logDeployment('complete', id, 'all', newStatus, {
        successCount: successLogs.length,
        failedCount: failedLogs.length,
        pendingCount: pendingLogs.length,
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
        order: [['updatedAt', 'DESC']]
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
}

module.exports = new TokenService(); 