const { ethers } = require('ethers');
const { TokenConfiguration, DeploymentLog, TokenDistribution } = require('../models');
const { getNetworkByChainId } = require('../config/networks');
const { 
  UNIVERSAL_TOKEN_SERVICE_WALLET, 
  FIXED_ZETA_FEE,
  DEPLOYMENT_STATUS,
  DISTRIBUTION_STATUS
} = require('../config/constants');
const contractService = require('./contractService');

class TokenService {
  /**
   * Create a new token configuration
   */
  async createTokenConfiguration({
    tokenName,
    tokenSymbol,
    decimals,
    totalSupply,
    creatorWallet,
    iconUrl,
    selectedChains,
    csvDataRaw
  }) {
    try {
      // Create token configuration record
      const tokenConfig = await TokenConfiguration.create({
        tokenName,
        tokenSymbol,
        decimals,
        totalSupply,
        creatorWallet,
        iconUrl,
        selectedChains,
        csvDataRaw,
        deploymentStatus: DEPLOYMENT_STATUS.PENDING
      });

      // Create deployment log entries for each selected chain
      for (const chainId of selectedChains) {
        const network = getNetworkByChainId(chainId);
        if (!network) {
          throw new Error(`Network with chain ID ${chainId} not found`);
        }

        await DeploymentLog.create({
          tokenConfigId: tokenConfig.id,
          chainName: network.name,
          chainId,
          status: DEPLOYMENT_STATUS.PENDING
        });
      }

      return tokenConfig;
    } catch (error) {
      console.error('Error creating token configuration:', error);
      throw error;
    }
  }

  /**
   * Update deployment status after fee payment verification
   */
  async updateDeploymentStatus(tokenId, feeTxHash) {
    try {
      const tokenConfig = await TokenConfiguration.findByPk(tokenId);
      if (!tokenConfig) {
        throw new Error('Token configuration not found');
      }

      // Log the fee verification values for debugging
      console.log('Fee verification values:');
      console.log('- UNIVERSAL_TOKEN_SERVICE_WALLET:', UNIVERSAL_TOKEN_SERVICE_WALLET);
      console.log('- FIXED_ZETA_FEE:', FIXED_ZETA_FEE);
      console.log('- typeof FIXED_ZETA_FEE:', typeof FIXED_ZETA_FEE);
      console.log('- Fee Transaction Hash:', feeTxHash);
      
      // Use hardcoded value if FIXED_ZETA_FEE is undefined
      const fee = FIXED_ZETA_FEE || '1';
      console.log('- Using fee value:', fee);
      
      // Enable override for testing (for development only)
      const overrideVerification = process.env.NODE_ENV === 'development';
      console.log('- Override verification:', overrideVerification ? 'YES (development mode)' : 'NO');

      // Verify fee payment
      let feeVerified = false;
      
      if (overrideVerification) {
        console.log('⚠️ DEVELOPMENT MODE: Fee verification overridden');
        feeVerified = true;
      } else {
        feeVerified = await contractService.verifyFeePayment(
          feeTxHash,
          UNIVERSAL_TOKEN_SERVICE_WALLET,
          fee
        );
      }

      if (!feeVerified) {
        throw new Error('Fee payment verification failed');
      }
      
      console.log('Fee verification successful! Proceeding with deployment...');

      // Update token configuration
      tokenConfig.feeTransactionHash = feeTxHash;
      tokenConfig.deploymentStatus = DEPLOYMENT_STATUS.PROCESSING;
      await tokenConfig.save();

      // Start deployment process
      await this._deployTokenContracts(tokenConfig);

      return tokenConfig;
    } catch (error) {
      console.error('Error updating deployment status:', error);
      throw error;
    }
  }

  /**
   * Deploy token contracts across selected chains
   */
  async _deployTokenContracts(tokenConfig) {
    try {
      const results = await contractService.deployTokensAcrossChains(
        tokenConfig,
        tokenConfig.selectedChains
      );

      // Check if all deployments were successful
      const allSuccessful = results.every(result => result.status === 'completed');
      
      // Update overall deployment status
      tokenConfig.deploymentStatus = allSuccessful 
        ? DEPLOYMENT_STATUS.COMPLETED 
        : DEPLOYMENT_STATUS.FAILED;
      await tokenConfig.save();

      return results;
    } catch (error) {
      console.error('Error deploying token contracts:', error);
      tokenConfig.deploymentStatus = DEPLOYMENT_STATUS.FAILED;
      await tokenConfig.save();
      throw error;
    }
  }

  /**
   * Get token configuration by ID
   */
  async getTokenConfiguration(tokenId, creatorWallet = null) {
    try {
      const where = { id: tokenId };
      if (creatorWallet) {
        where.creatorWallet = creatorWallet;
      }

      const tokenConfig = await TokenConfiguration.findOne({ where });
      if (!tokenConfig) {
        throw new Error('Token configuration not found');
      }

      return tokenConfig;
    } catch (error) {
      console.error('Error getting token configuration:', error);
      throw error;
    }
  }

  /**
   * Get deployment logs for a token
   */
  async getTokenDeployments(tokenId) {
    try {
      return await DeploymentLog.findAll({
        where: { tokenConfigId: tokenId },
        order: [['createdAt', 'DESC']]
      });
    } catch (error) {
      console.error('Error getting token deployments:', error);
      throw error;
    }
  }

  /**
   * Get distribution records for a token
   */
  async getTokenDistributions(tokenId) {
    try {
      return await TokenDistribution.findAll({
        where: { tokenConfigId: tokenId },
        order: [['createdAt', 'DESC']]
      });
    } catch (error) {
      console.error('Error getting token distributions:', error);
      throw error;
    }
  }
}

module.exports = new TokenService(); 