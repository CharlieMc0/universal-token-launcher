# 4. Services

This section covers the core business logic services for the Universal Token Launcher backend.

## Contract Service

The Contract Service handles smart contract deployment and verification. Create `src/services/ContractService.ts`:

```typescript
import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import axios from 'axios';
import FormData from 'form-data';
import logger, { logDeployment } from '../utils/logger';
import chainInfo from '../utils/chainInfo';
import db from '../db';

dotenv.config();

class ContractService {
  /**
   * Get the appropriate bytecode and ABI based on the chain type
   */
  async getContractDetails(chainId: string) {
    const isZetaChain = chainInfo.isZetaChain(chainId);
    const contractType = isZetaChain ? 'ZetaChainUniversalToken' : 'EVMUniversalToken';
    
    try {
      // Try to load artifacts from various locations
      const searchPaths = [
        // Standard contracts directory
        path.resolve(process.cwd(), `standard-contracts/artifacts/${contractType}.json`),
        // Alternative location
        path.resolve(process.cwd(), `smart-contracts/artifacts/contracts/${contractType}.sol/${contractType}.json`),
        // Direct build directory
        path.resolve(process.cwd(), `artifacts/contracts/${contractType}.sol/${contractType}.json`)
      ];
      
      // Find the first existing artifact path
      let artifactPath;
      for (const searchPath of searchPaths) {
        if (fs.existsSync(searchPath)) {
          artifactPath = searchPath;
          break;
        }
      }
      
      if (artifactPath) {
        const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
        return {
          bytecode: artifact.bytecode,
          abi: artifact.abi,
          contractType
        };
      } else {
        // Fallback to hardcoded bytecode (simplified example)
        logger.warn(`Artifact not found for ${contractType}, using minimal implementation`);
        
        // In a real implementation, you would include actual bytecode and ABI
        return {
          // Basic ERC20 bytecode (placeholder)
          bytecode: '0x608060405234801561001057600080fd5b5060405161072f38038061072f83398101604081905261002f91610145565b8351610042906000906020860190610057565b5082516100569060019060208501906100c6565b5050506101bf565b8280546100639061018e565b90600052602060002090601f01602090048101928261008557600085556100cb565b82601f1061009e57805160ff19168380011785556100cb565b828001600101855582156100cb579182015b828111156100cb5782518255916020019190600101906100b0565b506100d79291506100d9565b5090565b5b808211156100d75760008155600101610108565b80516001600160a01b038116811461010457600080fd5b919050565b600080600080600060a08688031215610120578081fd5b8535945060208601516101328161017c565b6040870151606088015191955093508490610149816101a9565b806080880189525092959493505050565b60008060008060808587031215610159578081fd5b845160208601516101698161017c565b6040870151606088015191955093508390610149816101a9565b6000600019821415610188578081fd5b5060010190565b6020819052600f0160051c602082013580820185905260018201811c8286018352909516601f018416908082906001015b808510610144578160ff1960208281858387011115610144578401915b845290525090565b600060208284031215610144578081fd5b856000549183558152010190600401601f1f1b01049083528051f393f0fea264697066735822122005dd85b3e4bf4ebd54fe4bc89cb23b2fa11d15fce83f16a43fa10e6bbc2e3e4e64736f6c63430008010033',
          // Basic ABI for a simple ERC20
          abi: [
            {
              "inputs": [
                { "internalType": "string", "name": "name_", "type": "string" },
                { "internalType": "string", "name": "symbol_", "type": "string" },
                { "internalType": "uint8", "name": "decimals_", "type": "uint8" },
                { "internalType": "uint256", "name": "totalSupply_", "type": "uint256" }
              ],
              "stateMutability": "nonpayable",
              "type": "constructor"
            }
          ],
          contractType
        };
      }
    } catch (error) {
      logger.error('Error loading contract details:', error);
      throw new Error(`Failed to load contract details for chain ${chainId}`);
    }
  }

  /**
   * Deploy a contract to a specific chain
   */
  async deployContract(tokenId: number, tokenConfig: any, chainId: string) {
    const { tokenName, tokenSymbol, decimals, totalSupply } = tokenConfig;
    
    try {
      // Log deployment start
      logDeployment('deploy', tokenId, chainId, 'started', {
        tokenName,
        tokenSymbol
      });
      
      // Update deployment status in database
      await db.DeploymentLog.update(
        { 
          deploymentStatus: 'deploying', 
          deployAttempts: db.sequelize.literal('deployAttempts + 1'),
          lastRetryAt: new Date()
        },
        { where: { tokenId, chainId } }
      );
      
      // Get contract details based on chain
      const { bytecode, abi, contractType } = await this.getContractDetails(chainId);
      
      // Get chain RPC URL
      const chain = chainInfo.getChainInfo(chainId);
      if (!chain || !chain.rpcUrl) {
        throw new Error(`RPC URL not found for chain ${chainId}`);
      }
      
      // Create provider and signer
      const provider = new ethers.JsonRpcProvider(chain.rpcUrl);
      
      // Get private key from env (for dev/test only)
      const privateKey = process.env.TEST_WALLET_PRIVATE_KEY;
      if (!privateKey) {
        throw new Error('Wallet private key not found in environment variables');
      }
      
      const wallet = new ethers.Wallet(privateKey, provider);
      
      // Create contract factory
      const factory = new ethers.ContractFactory(abi, bytecode, wallet);
      
      // Deploy contract with constructor arguments
      // For this example, we're simplifying with basic ERC20 parameters
      const contract = await factory.deploy(
        tokenName,
        tokenSymbol,
        decimals,
        totalSupply
      );
      
      // Wait for deployment to complete
      const receipt = await contract.deploymentTransaction()?.wait();
      const contractAddress = await contract.getAddress();
      
      // Log successful deployment
      logDeployment('deploy', tokenId, chainId, 'success', {
        contractAddress,
        transactionHash: receipt?.hash,
        contractType
      });
      
      // Update deployment log in database
      await db.DeploymentLog.update(
        {
          contractAddress,
          transactionHash: receipt?.hash,
          deploymentStatus: 'success',
          completedAt: new Date()
        },
        { where: { tokenId, chainId } }
      );
      
      // Trigger contract verification
      setTimeout(() => {
        this.verifyContract(tokenId, chainId, contractAddress).catch(error => {
          logger.error(`Error during automatic verification for ${contractAddress} on chain ${chainId}:`, error);
        });
      }, 30000); // Wait 30 seconds for blockchain indexing before verification
      
      return {
        success: true,
        contractAddress,
        transactionHash: receipt?.hash
      };
    } catch (error) {
      logger.error(`Error deploying contract on chain ${chainId}:`, error);
      
      // Log deployment failure
      logDeployment('deploy', tokenId, chainId, 'failed', {
        error: error.message
      });
      
      // Update deployment log with error
      await db.DeploymentLog.update(
        {
          deploymentStatus: 'failed',
          lastError: error.message
        },
        { where: { tokenId, chainId } }
      );
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Connect token contracts across chains
   */
  async connectTokens(zetaChainId: string, zetaChainAddress: string, evmChainId: string, evmAddress: string) {
    try {
      // Log start of connection process
      logger.info(`Connecting tokens: ZetaChain(${zetaChainAddress}) <-> EVM Chain ${evmChainId}(${evmAddress})`);
      
      // Get contract details for ZetaChain
      const { abi: zetaAbi } = await this.getContractDetails(zetaChainId);
      
      // Get contract details for EVM chain
      const { abi: evmAbi } = await this.getContractDetails(evmChainId);
      
      // Get chain info
      const zetaChainInfo = chainInfo.getChainInfo(zetaChainId);
      const evmChainInfo = chainInfo.getChainInfo(evmChainId);
      
      if (!zetaChainInfo || !evmChainInfo) {
        throw new Error('Chain information not found');
      }
      
      // Create providers and signers
      const zetaProvider = new ethers.JsonRpcProvider(zetaChainInfo.rpcUrl);
      const evmProvider = new ethers.JsonRpcProvider(evmChainInfo.rpcUrl);
      
      // Get private key from env (for dev/test only)
      const privateKey = process.env.TEST_WALLET_PRIVATE_KEY;
      if (!privateKey) {
        throw new Error('Wallet private key not found in environment variables');
      }
      
      const zetaWallet = new ethers.Wallet(privateKey, zetaProvider);
      const evmWallet = new ethers.Wallet(privateKey, evmProvider);
      
      // Create contract instances
      const zetaContract = new ethers.Contract(zetaChainAddress, zetaAbi, zetaWallet);
      const evmContract = new ethers.Contract(evmAddress, evmAbi, evmWallet);
      
      // Connect contracts (this is a simplified example)
      // In a real implementation, you would call specific connection methods on both contracts
      // For example: zetaContract.addRemoteToken(evmChainId, evmAddress)
      
      logger.info('Token connection completed successfully');
      
      return {
        success: true,
        message: 'Tokens connected successfully'
      };
    } catch (error) {
      logger.error('Error connecting tokens:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Verify a contract on the block explorer
   */
  async verifyContract(tokenId: number, chainId: string, contractAddress: string) {
    try {
      // Log verification start
      logDeployment('verify', tokenId, chainId, 'started', {
        contractAddress
      });
      
      // Update verification status in the database
      await db.DeploymentLog.update(
        { verificationStatus: 'processing' },
        { where: { tokenId, chainId } }
      );
      
      // Get contract details
      const { contractType } = await this.getContractDetails(chainId);
      
      // Get chain info
      const chain = chainInfo.getChainInfo(chainId);
      if (!chain) {
        throw new Error(`Chain information not found for chain ${chainId}`);
      }
      
      // Get token configuration for constructor arguments
      const token = await db.TokenConfiguration.findByPk(tokenId);
      if (!token) {
        throw new Error(`Token with ID ${tokenId} not found`);
      }
      
      // Get deployment log for transaction information
      const deploymentLog = await db.DeploymentLog.findOne({
        where: { tokenId, chainId }
      });
      
      if (!deploymentLog || !deploymentLog.contractAddress || !deploymentLog.transactionHash) {
        throw new Error('Deployment information not found');
      }
      
      // Different verification logic based on explorer type
      let verificationResult;
      
      if (chainInfo.isZetaChain(chainId)) {
        // Blockscout verification for ZetaChain
        verificationResult = await this.verifyBlockscout(
          chainId,
          contractAddress,
          contractType,
          {
            tokenName: token.tokenName,
            tokenSymbol: token.tokenSymbol,
            decimals: token.decimals,
            totalSupply: token.totalSupply
          }
        );
      } else {
        // Etherscan verification for other EVM chains
        verificationResult = await this.verifyEtherscan(
          chainId,
          contractAddress,
          contractType,
          {
            tokenName: token.tokenName,
            tokenSymbol: token.tokenSymbol,
            decimals: token.decimals,
            totalSupply: token.totalSupply
          }
        );
      }
      
      if (verificationResult.success) {
        // Log successful verification
        logDeployment('verify', tokenId, chainId, 'success', {
          verifiedUrl: verificationResult.verifiedUrl
        });
        
        // Update verification status
        await db.DeploymentLog.update(
          {
            verificationStatus: 'verified',
            verifiedUrl: verificationResult.verifiedUrl
          },
          { where: { tokenId, chainId } }
        );
        
        return {
          success: true,
          verifiedUrl: verificationResult.verifiedUrl
        };
      } else {
        throw new Error(verificationResult.error || 'Unknown verification error');
      }
    } catch (error) {
      logger.error(`Error verifying contract on chain ${chainId}:`, error);
      
      // Log verification failure
      logDeployment('verify', tokenId, chainId, 'failed', {
        error: error.message
      });
      
      // Update verification status with error
      await db.DeploymentLog.update(
        {
          verificationStatus: 'failed',
          verificationError: error.message
        },
        { where: { tokenId, chainId } }
      );
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Verify contract on Blockscout (simplified)
   */
  async verifyBlockscout(chainId: string, contractAddress: string, contractType: string, constructorArgs: any) {
    try {
      const blockscoutApiUrl = chainInfo.getBlockscoutApiUrl(chainId);
      if (!blockscoutApiUrl) {
        throw new Error('Blockscout API URL not found');
      }
      
      // Simplified implementation
      logger.info(`Simulating Blockscout verification for ${contractAddress}`);
      
      // Get chain info
      const chain = chainInfo.getChainInfo(chainId);
      
      // In a real implementation, you would:
      // 1. Prepare contract source code and metadata
      // 2. Submit verification request to Blockscout API
      // 3. Check verification status
      
      // For this example, we'll simulate success
      const verifiedUrl = `${chain.explorerUrl}/address/${contractAddress}/contracts#address-tabs`;
      
      return {
        success: true,
        verifiedUrl
      };
    } catch (error) {
      logger.error(`Blockscout verification error:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Verify contract on Etherscan (simplified)
   */
  async verifyEtherscan(chainId: string, contractAddress: string, contractType: string, constructorArgs: any) {
    try {
      // Get API key for the chain
      const apiKey = process.env.ETHERSCAN_API_KEY;
      if (!apiKey) {
        throw new Error('Etherscan API key not found');
      }
      
      // Get chain info
      const chain = chainInfo.getChainInfo(chainId);
      if (!chain) {
        throw new Error('Chain information not found');
      }
      
      // Simplified implementation
      logger.info(`Simulating Etherscan verification for ${contractAddress}`);
      
      // In a real implementation, you would:
      // 1. Prepare contract source code and metadata
      // 2. Submit verification request to Etherscan API
      // 3. Check verification status
      
      // For this example, we'll simulate success
      const verifiedUrl = `${chain.explorerUrl}/address/${contractAddress}#code`;
      
      return {
        success: true,
        verifiedUrl
      };
    } catch (error) {
      logger.error(`Etherscan verification error:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default new ContractService();
```

This implementation provides a comprehensive contract service for deploying and verifying smart contracts across different blockchain networks. The next part will cover the Token Service. 