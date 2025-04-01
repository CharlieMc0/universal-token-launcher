const { TokenConfiguration, DeploymentLog, TokenDistribution } = require('../models');
const contractService = require('./ContractService');
const chainInfo = require('../utils/chainInfo');
const { SUPPORTED_CHAINS } = require('../constants/chains');
const { ZETACHAIN_ID, ZETACHAIN_TESTNET_ID } = require('../constants/bytecode');
const { Sequelize } = require('sequelize');

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

      // Create deployment logs for each selected chain
      const deploymentPromises = selectedChains.map(async (chainId) => {
        if (!SUPPORTED_CHAINS[chainId]) {
          console.warn(`Unsupported chain ID: ${chainId}`);
          return null;
        }

        const chainInfo = SUPPORTED_CHAINS[chainId];
        return DeploymentLog.create({
          tokenConfigId: tokenConfig.id,
          chainName: chainInfo.name,
          chainId,
          status: 'pending'
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
      console.error(`Error creating token configuration: ${error.message}`);
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

      // Verify fee payment
      const isFeeValid = await contractService.verifyFeePayment(feePaidTx);
      if (!isFeeValid) {
        throw new Error('Invalid fee payment transaction');
      }

      // Update token configuration with fee transaction
      await tokenConfig.update({
        feePaidTx,
        deploymentStatus: 'deploying'
      });

      // Start deployment process in background
      this.processDeployment(tokenConfig)
        .catch(error => {
          console.error(`Error in deployment process: ${error.message}`);
        });

      return true;
    } catch (error) {
      console.error(`Error deploying token: ${error.message}`);
      throw error;
    }
  }

  /**
   * Process the token deployment across all selected chains
   * @param {Object} tokenConfig - The token configuration object
   * @returns {Promise<void>}
   */
  async processDeployment(tokenConfig) {
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
      
      console.log(`Starting deployment process for token ${tokenName} (ID: ${id})`);

      // Step 1: Ensure ZetaChain is in the selected chains
      if (!actualZetaChainId) {
        throw new Error('ZetaChain must be included in selected chains');
      }

      // Step 2: Deploy on ZetaChain first
      console.log(`Deploying token on ZetaChain (ID: ${actualZetaChainId})...`);
      
      // Try to find the deployment log for ZetaChain using the actual chain ID found
      let zetaChainLog = await DeploymentLog.findOne({
        where: {
          tokenConfigId: id,
          chainId: actualZetaChainId
        }
      });

      // If not found, try looking for logs for any of the ZetaChain IDs
      if (!zetaChainLog) {
        console.log('Deployment log not found for specific ZetaChain ID, trying alternate lookup...');
        
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
          console.log(`Found ZetaChain deployment log with ID: ${zetaChainLog.chainId}`);
        }
      }

      // If still not found, create a new deployment log for ZetaChain
      if (!zetaChainLog) {
        console.log(`Creating new deployment log for ZetaChain (ID: ${actualZetaChainId})...`);
        const chain = chainInfo.getChainInfo(actualZetaChainId);
        
        if (!chain) {
          throw new Error(`Chain information not found for ZetaChain ID: ${actualZetaChainId}`);
        }
        
        zetaChainLog = await DeploymentLog.create({
          tokenConfigId: id,
          chainName: chain.name,
          chainId: actualZetaChainId,
          status: 'pending'
        });
      }

      await zetaChainLog.update({ status: 'deploying' });

      // Deploy on ZetaChain
      let zetaChainDeployment;
      try {
        zetaChainDeployment = await contractService.deployZetaChainUniversalToken(
          tokenName,
          tokenSymbol,
          decimals,
          totalSupply.toString(),
          creatorWallet
        );

        await zetaChainLog.update({
          status: 'success',
          contractAddress: zetaChainDeployment.contractAddress,
          transactionHash: zetaChainDeployment.transactionHash
        });
      } catch (error) {
        console.error(`Error deploying on ZetaChain: ${error.message}`);
        await zetaChainLog.update({
          status: 'failed',
          errorMessage: error.message
        });
        await tokenConfig.update({ deploymentStatus: 'failed' });
        return;
      }

      // Step 3: Deploy on other selected chains
      const evmChains = selectedChains.filter(chainId => chainId != actualZetaChainId);
      const evmDeployments = {};

      for (const chainId of evmChains) {
        const chain = chainInfo.getChainInfo(chainId);
        
        if (!chain) {
          console.warn(`Chain information not found for chain ID: ${chainId}`);
          continue;
        }
        
        if (chainInfo.isZetaChain(chainId)) {
          console.warn(`Skipping additional ZetaChain ID: ${chainId}`);
          continue;
        }

        console.log(`Deploying token on chain ${chainId} (${chain.name})...`);
        
        // Find deployment log for this chain
        let chainLog = await DeploymentLog.findOne({
          where: {
            tokenConfigId: id,
            chainId
          }
        });

        // If not found, create a new deployment log
        if (!chainLog) {
          console.log(`Creating new deployment log for chain ${chainId} (${chain.name})...`);
          chainLog = await DeploymentLog.create({
            tokenConfigId: id,
            chainName: chain.name,
            chainId,
            status: 'pending'
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
            transactionHash: evmDeployment.transactionHash
          });

          evmDeployments[chainId] = evmDeployment;
        } catch (error) {
          console.error(`Error deploying on chain ${chainId}: ${error.message}`);
          await chainLog.update({
            status: 'failed',
            errorMessage: error.message
          });
          // Continue with other chains despite failure
        }
      }

      // Step 4: Connect ZetaChain token to each EVM token
      for (const chainId in evmDeployments) {
        console.log(`Connecting tokens between ZetaChain and chain ${chainId}...`);
        
        try {
          const connectionResult = await contractService.connectTokens(
            actualZetaChainId, // Use the actual ZetaChain ID found earlier
            zetaChainDeployment.contractAddress,
            chainId,
            evmDeployments[chainId].contractAddress
          );
          
          console.log(`Successfully connected tokens between ZetaChain and chain ${chainId}`);
          console.log(`ZetaChain TX: ${connectionResult.zetaChainTxHash}`);
          console.log(`EVM Chain TX: ${connectionResult.evmTxHash}`);

          // Add explorer links
          const zetaChainTxUrl = chainInfo.getExplorerTxUrl(actualZetaChainId, connectionResult.zetaChainTxHash);
          const evmChainTxUrl = chainInfo.getExplorerTxUrl(chainId, connectionResult.evmTxHash);
          
          if (zetaChainTxUrl) console.log(`ZetaChain Explorer: ${zetaChainTxUrl}`);
          if (evmChainTxUrl) console.log(`EVM Chain Explorer: ${evmChainTxUrl}`);
        } catch (error) {
          console.error(`Error connecting tokens for chain ${chainId}: ${error.message}`);
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

      console.log(`Updating deployment status to: ${newStatus} (${successLogs.length} successful, ${failedLogs.length} failed, ${pendingLogs.length} pending)`);
      await tokenConfig.update({ deploymentStatus: newStatus });

      console.log(`Deployment process completed for token ${tokenName} (ID: ${id}) with status ${newStatus}`);
    } catch (error) {
      console.error(`Error in deployment process: ${error.message}`);
      console.error(error.stack);
      
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
              errorMessage: `Process error: ${error.message}`
            },
            { 
              where: { 
                tokenConfigId: tokenConfig.id,
                status: ['pending', 'deploying']
              } 
            }
          );
        } catch (updateError) {
          console.error(`Failed to update token status after error: ${updateError.message}`);
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
        throw new Error(`Token configuration with ID ${tokenId} not found`);
      }
      return tokenConfig;
    } catch (error) {
      console.error(`Error getting token configuration: ${error.message}`);
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
      console.error(`Error getting token configurations: ${error.message}`);
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
      return logs;
    } catch (error) {
      console.error(`Error getting deployment logs: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new TokenService(); 