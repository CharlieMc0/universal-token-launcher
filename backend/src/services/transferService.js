const { ethers } = require('ethers');
const { TokenConfiguration, DeploymentLog } = require('../models');
const { getNetworkByChainId } = require('../config/networks');
const { DEPLOYER_WALLET, DEPLOYER_PRIVATE_KEY } = require('../config/constants');
const contractService = require('./contractService');

class TransferService {
  /**
   * Initialize a cross-chain token transfer
   */
  async initiateTransfer({
    tokenId,
    sourceChainId,
    destinationChainId,
    senderAddress,
    recipientAddress,
    amount
  }) {
    try {
      // Get token configuration
      const tokenConfig = await TokenConfiguration.findByPk(tokenId);
      if (!tokenConfig) {
        throw new Error('Token configuration not found');
      }

      // Get deployment logs for both chains
      const sourceDeployment = await DeploymentLog.findOne({
        where: {
          tokenConfigId: tokenId,
          chainId: sourceChainId
        }
      });

      const destinationDeployment = await DeploymentLog.findOne({
        where: {
          tokenConfigId: tokenId,
          chainId: destinationChainId
        }
      });

      if (!sourceDeployment || !destinationDeployment) {
        throw new Error('Token not deployed on one or both chains');
      }

      // Get network configurations
      const sourceNetwork = getNetworkByChainId(sourceChainId);
      const destinationNetwork = getNetworkByChainId(destinationChainId);

      if (!sourceNetwork || !destinationNetwork) {
        throw new Error('Invalid network configuration');
      }

      // Create contract instances
      const sourceProvider = contractService.getProvider(sourceChainId);
      const destinationProvider = contractService.getProvider(destinationChainId);

      const sourceContract = new ethers.Contract(
        sourceDeployment.contractAddress,
        contractService.universalTokenAbi,
        sourceProvider
      );

      const destinationContract = new ethers.Contract(
        destinationDeployment.contractAddress,
        contractService.universalTokenAbi,
        destinationProvider
      );

      // Create wallet for transaction signing
      const wallet = new ethers.Wallet(DEPLOYER_PRIVATE_KEY, sourceProvider);

      // Calculate amount with decimals
      const amountBN = ethers.parseUnits(amount.toString(), tokenConfig.decimals);

      // Check balance
      const balance = await sourceContract.balanceOf(senderAddress);
      if (balance < amountBN) {
        throw new Error('Insufficient balance');
      }

      // Execute burn on source chain
      console.log(`Burning ${amount} tokens on ${sourceNetwork.name}...`);
      const burnTx = await sourceContract.connect(wallet).burn(senderAddress, amountBN);
      const burnReceipt = await burnTx.wait();

      // Execute mint on destination chain
      console.log(`Minting ${amount} tokens on ${destinationNetwork.name}...`);
      const mintTx = await destinationContract.connect(wallet).mint(recipientAddress, amountBN);
      const mintReceipt = await mintTx.wait();

      return {
        burnTransactionHash: burnReceipt.hash,
        mintTransactionHash: mintReceipt.hash,
        sourceChain: sourceNetwork.name,
        destinationChain: destinationNetwork.name,
        amount: amount.toString()
      };
    } catch (error) {
      console.error('Error initiating transfer:', error);
      throw error;
    }
  }

  /**
   * Get transfer history for a token
   */
  async getTransferHistory(tokenId) {
    try {
      const tokenConfig = await TokenConfiguration.findByPk(tokenId);
      if (!tokenConfig) {
        throw new Error('Token configuration not found');
      }

      // Get all deployment logs for the token
      const deployments = await DeploymentLog.findAll({
        where: { tokenConfigId: tokenId }
      });

      // Get transfer events from each chain
      const transferHistory = await Promise.all(
        deployments.map(async (deployment) => {
          const provider = contractService.getProvider(deployment.chainId);
          const contract = new ethers.Contract(
            deployment.contractAddress,
            contractService.universalTokenAbi,
            provider
          );

          // Get transfer events
          const transferEvents = await contract.queryFilter('Transfer');
          
          return {
            chainId: deployment.chainId,
            chainName: deployment.chainName,
            transfers: transferEvents.map(event => ({
              from: event.args[0],
              to: event.args[1],
              amount: ethers.formatUnits(event.args[2], tokenConfig.decimals),
              transactionHash: event.transactionHash,
              blockNumber: event.blockNumber
            }))
          };
        })
      );

      return transferHistory;
    } catch (error) {
      console.error('Error getting transfer history:', error);
      throw error;
    }
  }
}

module.exports = new TransferService(); 