# Token Service

The Token Service manages token configurations, deployment processes, and user token retrieval. Create `src/services/TokenService.ts`:

```typescript
import db from '../db';
import contractService from './ContractService';
import logger, { logDeployment } from '../utils/logger';
import chainInfo from '../utils/chainInfo';
import axios from 'axios';
import getKnownTokens from '../utils/getKnownTokens';

class TokenService {
  /**
   * Create a new token configuration
   */
  async createTokenConfiguration(tokenData: any) {
    try {
      // Create token configuration in database
      const token = await db.TokenConfiguration.create({
        creatorWallet: tokenData.creatorWallet,
        tokenName: tokenData.token_name,
        tokenSymbol: tokenData.token_symbol,
        decimals: tokenData.decimals || 18,
        totalSupply: tokenData.total_supply,
        selectedChains: JSON.parse(tokenData.selected_chains),
        iconUrl: tokenData.iconUrl || null,
        deploymentStatus: 'pending'
      });
      
      // Create deployment logs for each selected chain
      const selectedChains = JSON.parse(tokenData.selected_chains);
      const deploymentPromises = selectedChains.map(async (chainId: string) => {
        return db.DeploymentLog.create({
          tokenId: token.id,
          chainId,
          deploymentStatus: 'pending',
          verificationStatus: 'pending',
          deployAttempts: 0
        });
      });
      
      await Promise.all(deploymentPromises);
      
      // Process token distributions if provided
      if (tokenData.distributions_json) {
        const distributions = JSON.parse(tokenData.distributions_json);
        const distributionPromises = distributions.map(async (dist: any) => {
          return db.TokenDistribution.create({
            tokenId: token.id,
            recipientAddress: dist.recipient_address,
            chainId: dist.chain_id,
            tokenAmount: dist.token_amount,
            distributionStatus: 'pending'
          });
        });
        
        await Promise.all(distributionPromises);
      }
      
      // Return token with formatted chain info
      return this.getTokenById(token.id);
    } catch (error) {
      logger.error('Error creating token configuration:', error);
      throw error;
    }
  }

  /**
   * Get token by ID with formatted chain info
   */
  async getTokenById(tokenId: number) {
    try {
      const token = await db.TokenConfiguration.findByPk(tokenId, {
        include: [
          {
            model: db.DeploymentLog,
            as: 'DeploymentLogs'
          }
        ]
      });
      
      if (!token) {
        return null;
      }
      
      // Format response with chain info
      const formattedToken = token.toJSON();
      
      // Add chainInfo array with deployment details
      formattedToken.chainInfo = formattedToken.selectedChains.map((chainId: string) => {
        const deploymentLog = formattedToken.DeploymentLogs.find(
          (log: any) => log.chainId === chainId
        );
        
        // Get base chain info
        const baseChainInfo = chainInfo.getChainInfo(chainId);
        
        // Add deployment details to chain info
        return {
          ...baseChainInfo,
          contractAddress: deploymentLog?.contractAddress || null,
          deploymentStatus: deploymentLog?.deploymentStatus || 'pending',
          verificationStatus: deploymentLog?.verificationStatus || 'pending',
          verificationError: deploymentLog?.verificationError || null,
          verifiedUrl: deploymentLog?.verifiedUrl || null,
          explorerUrl: deploymentLog?.contractAddress 
            ? chainInfo.getExplorerAddressUrl(chainId, deploymentLog.contractAddress)
            : null
        };
      });
      
      // Remove DeploymentLogs from response
      delete formattedToken.DeploymentLogs;
      
      return formattedToken;
    } catch (error) {
      logger.error(`Error getting token ${tokenId}:`, error);
      throw error;
    }
  }

  /**
   * Deploy token to all selected chains
   */
  async deployToken(tokenId: number, feePaidTx: string) {
    try {
      // Get token configuration
      const token = await db.TokenConfiguration.findByPk(tokenId, {
        include: [
          {
            model: db.DeploymentLog,
            as: 'DeploymentLogs'
          }
        ]
      });
      
      if (!token) {
        throw new Error(`Token with ID ${tokenId} not found`);
      }
      
      // Update token status to deploying
      await token.update({ deploymentStatus: 'deploying' });
      
      // Log deployment start
      logDeployment('start', tokenId, 'all', 'started', {
        feePaidTx,
        selectedChains: token.selectedChains
      });
      
      // Find ZetaChain ID from selected chains
      const zetaChainId = token.selectedChains.find((chainId: string) => 
        chainInfo.isZetaChain(chainId)
      );
      
      // Deploy to ZetaChain first if included
      let zetaChainDeployment = null;
      if (zetaChainId) {
        zetaChainDeployment = await contractService.deployContract(
          tokenId,
          token,
          zetaChainId
        );
      }
      
      // Deploy to other chains
      const nonZetaChainIds = token.selectedChains.filter(
        (chainId: string) => !chainInfo.isZetaChain(chainId)
      );
      
      const deploymentPromises = nonZetaChainIds.map(async (chainId: string) => {
        return {
          chainId,
          result: await contractService.deployContract(tokenId, token, chainId)
        };
      });
      
      const deploymentResults = await Promise.all(deploymentPromises);
      
      // Connect tokens if ZetaChain deployment was successful
      if (zetaChainDeployment?.success && zetaChainId) {
        const zetaChainAddress = zetaChainDeployment.contractAddress;
        
        const connectionPromises = deploymentResults
          .filter(result => result.result.success)
          .map(async (result) => {
            return contractService.connectTokens(
              zetaChainId,
              zetaChainAddress,
              result.chainId,
              result.result.contractAddress
            );
          });
        
        await Promise.all(connectionPromises);
      }
      
      // Determine overall deployment status
      const successCount = [
        zetaChainDeployment?.success ? 1 : 0,
        ...deploymentResults.map(r => r.result.success ? 1 : 0)
      ].reduce((a, b) => a + b, 0);
      
      const totalCount = token.selectedChains.length;
      const failedCount = totalCount - successCount;
      
      const deploymentStatus = failedCount === 0 
        ? 'completed' 
        : successCount === 0 
          ? 'failed' 
          : 'partial';
      
      // Update token status
      await token.update({ deploymentStatus });
      
      // Log deployment completion
      logDeployment('complete', tokenId, 'all', deploymentStatus, {
        successCount,
        failedCount
      });
      
      return {
        success: successCount > 0,
        status: deploymentStatus,
        message: `Token deployment ${deploymentStatus}. ${successCount} successful, ${failedCount} failed.`
      };
    } catch (error) {
      logger.error(`Error deploying token ${tokenId}:`, error);
      
      // Update token status
      await db.TokenConfiguration.update(
        { 
          deploymentStatus: 'failed',
          deploymentError: error.message
        },
        { where: { id: tokenId } }
      );
      
      throw error;
    }
  }

  /**
   * Get all tokens created by a wallet address
   */
  async findUserUniversalTokens(walletAddress: string) {
    try {
      // Normalize wallet address
      const normalizedAddress = walletAddress.toLowerCase();
      
      // Get known tokens (for development/testing)
      const knownTokens = getKnownTokens(normalizedAddress);
      
      // Get tokens from database
      const tokens = await db.TokenConfiguration.findAll({
        where: {
          creatorWallet: walletAddress
        },
        include: [
          {
            model: db.DeploymentLog,
            as: 'DeploymentLogs'
          }
        ]
      });
      
      // Format database tokens with chain info
      const formattedDbTokens = tokens.map((token: any) => {
        const tokenData = token.toJSON();
        
        // Add chainInfo array with deployment details
        tokenData.chainInfo = tokenData.selectedChains.map((chainId: string) => {
          const deploymentLog = tokenData.DeploymentLogs.find(
            (log: any) => log.chainId === chainId
          );
          
          // Get base chain info
          const baseChainInfo = chainInfo.getChainInfo(chainId);
          
          // Add deployment details to chain info
          return {
            ...baseChainInfo,
            contractAddress: deploymentLog?.contractAddress || null,
            deploymentStatus: deploymentLog?.deploymentStatus || 'pending',
            verificationStatus: deploymentLog?.verificationStatus || 'pending',
            verificationError: deploymentLog?.verificationError || null,
            verifiedUrl: deploymentLog?.verifiedUrl || null,
            explorerUrl: deploymentLog?.contractAddress 
              ? chainInfo.getExplorerAddressUrl(chainId, deploymentLog.contractAddress)
              : null
          };
        });
        
        // Remove DeploymentLogs from response
        delete tokenData.DeploymentLogs;
        
        return tokenData;
      });
      
      // Try to get tokens from ZetaChain Explorer API
      let apiTokens = [];
      try {
        if (chainInfo.isZetaChain('7001')) {
          const zetaChain = chainInfo.getChainInfo('7001');
          const blockscoutApiUrl = chainInfo.getBlockscoutApiUrl('7001');
          
          if (blockscoutApiUrl) {
            const apiUrl = `${blockscoutApiUrl}/addresses/${walletAddress}/tokens?type=ERC-20`;
            const response = await axios.get(apiUrl);
            
            if (response.data && response.data.items) {
              apiTokens = response.data.items.map((item: any) => ({
                id: `api-${item.address}`,
                creatorWallet: walletAddress,
                tokenName: item.name,
                tokenSymbol: item.symbol,
                decimals: parseInt(item.decimals),
                totalSupply: item.total_supply,
                deploymentStatus: 'completed',
                selectedChains: ['7001'],
                chainInfo: [
                  {
                    ...chainInfo.getChainInfo('7001'),
                    contractAddress: item.address,
                    deploymentStatus: 'success',
                    verificationStatus: 'verified',
                    explorerUrl: `${zetaChain.explorerUrl}/address/${item.address}`
                  }
                ]
              }));
            }
          }
        }
      } catch (error) {
        logger.warn(`Error fetching tokens from Blockscout API:`, error);
        // Continue with local tokens on API error
      }
      
      // Combine tokens from all sources
      const allTokens = [
        ...formattedDbTokens,
        // Only include API tokens that don't exist in DB or known tokens
        ...apiTokens.filter(apiToken => 
          !formattedDbTokens.some(dbToken => 
            dbToken.chainInfo.some(chain => 
              chain.contractAddress === apiToken.chainInfo[0].contractAddress
            )
          ) &&
          !knownTokens.some(knownToken => 
            knownToken.chainInfo.some(chain => 
              chain.contractAddress === apiToken.chainInfo[0].contractAddress
            )
          )
        ),
        // Only include known tokens if we don't have any from DB or API
        ...(formattedDbTokens.length === 0 && apiTokens.length === 0 ? knownTokens : [])
      ];
      
      return allTokens;
    } catch (error) {
      logger.error(`Error finding tokens for wallet ${walletAddress}:`, error);
      
      // Fallback to known tokens on error
      return getKnownTokens(walletAddress);
    }
  }

  /**
   * Get deployment logs for a token
   */
  async getDeploymentLogs(tokenId: number) {
    try {
      const deploymentLogs = await db.DeploymentLog.findAll({
        where: { tokenId },
        order: [['createdAt', 'DESC']]
      });
      
      return deploymentLogs;
    } catch (error) {
      logger.error(`Error getting deployment logs for token ${tokenId}:`, error);
      throw error;
    }
  }

  /**
   * Check if fee has been paid
   */
  async verifyFeePaid(txHash: string, expectedAmount: string = '1000000000000000000') {
    try {
      // In a production implementation, you would:
      // 1. Connect to ZetaChain using ethers
      // 2. Get transaction receipt and verify it succeeded
      // 3. Check that the transaction sent the right amount to the fee wallet
      // 4. Confirm transaction is finalized
      
      logger.info(`Verifying fee payment transaction: ${txHash}`);
      
      // For this example, we'll assume the fee is valid
      return {
        success: true,
        amount: expectedAmount,
        recipient: '0xServiceFeeWalletAddress'
      };
    } catch (error) {
      logger.error(`Error verifying fee payment:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default new TokenService(); 