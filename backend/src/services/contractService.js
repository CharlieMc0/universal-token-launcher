const { ethers } = require('ethers');
const chainInfo = require('../utils/chainInfo');
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
      this.providers[network.chainId] = new ethers.JsonRpcProvider(network.rpcUrl);
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
   * @returns {Promise<{contractAddress: string, transactionHash: string}>} - Deployment result
   */
  async deployZetaChainUniversalToken(tokenName, tokenSymbol, decimals, totalSupply, creatorWallet) {
    try {
      // Determine ZetaChain network (mainnet or testnet)
      const chainId = chainInfo.getPrimaryZetaChainId();
      const network = chainInfo.getChainInfo(chainId);
      const wallet = this.getWallet(chainId);
      
      console.log(`Deploying ZetaChainUniversalToken on chain ${chainId} (${network.name})...`);
      
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
      
      console.log(`ZetaChainUniversalToken deployed to ${contract.target}`);
      console.log(`Transaction hash: ${receipt.hash}`);
      console.log(`Explorer URL: ${chainInfo.getExplorerTxUrl(chainId, receipt.hash)}`);
      
      return {
        contractAddress: contract.target,
        transactionHash: receipt.hash
      };
    } catch (error) {
      console.error(`Error deploying ZetaChainUniversalToken: ${error.message}`);
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
   * @returns {Promise<{contractAddress: string, transactionHash: string}>} - Deployment result
   */
  async deployEVMUniversalToken(chainId, tokenName, tokenSymbol, decimals, totalSupply, creatorWallet) {
    try {
      // Validate chain ID
      const network = chainInfo.getChainInfo(chainId);
      if (!network || chainInfo.isZetaChain(chainId)) {
        throw new Error(`Invalid chain ID ${chainId} for EVM token deployment`);
      }
      
      const wallet = this.getWallet(chainId);
      
      console.log(`Deploying EVMUniversalToken on chain ${chainId} (${network.name})...`);
      
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
      
      console.log(`EVMUniversalToken deployed to ${contract.target}`);
      console.log(`Transaction hash: ${receipt.hash}`);
      console.log(`Explorer URL: ${chainInfo.getExplorerTxUrl(chainId, receipt.hash)}`);
      
      return {
        contractAddress: contract.target,
        transactionHash: receipt.hash
      };
    } catch (error) {
      console.error(`Error deploying EVMUniversalToken on chain ${chainId}: ${error.message}`);
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
    try {
      // Determine ZetaChain network (mainnet or testnet)
      const chainId = chainInfo.getPrimaryZetaChainId();
      const provider = this.providers[chainId];
      
      if (!provider) {
        throw new Error(`No provider available for ZetaChain (ID: ${chainId})`);
      }
      
      // Get transaction details
      const tx = await provider.getTransaction(txHash);
      if (!tx) {
        throw new Error(`Transaction ${txHash} not found`);
      }
      
      // Get transaction receipt to check status
      const receipt = await provider.getTransactionReceipt(txHash);
      if (!receipt) {
        throw new Error(`Transaction receipt for ${txHash} not found`);
      }
      
      // Check transaction was successful
      if (receipt.status !== 1) {
        return false;
      }
      
      // Check recipient is the service wallet
      const serviceWallet = process.env.UNIVERSAL_TOKEN_SERVICE_WALLET;
      if (!serviceWallet) {
        throw new Error('Universal token service wallet not configured');
      }
      
      if (tx.to.toLowerCase() !== serviceWallet.toLowerCase()) {
        return false;
      }
      
      // Check payment amount meets minimum fee
      const minFee = process.env.FIXED_ZETA_FEE || '1';
      const minFeeWei = ethers.parseEther(minFee);
      
      if (tx.value < minFeeWei) {
        return false;
      }
      
      return true;
    } catch (error) {
      console.error(`Error verifying fee payment: ${error.message}`);
      return false;
    }
  }
}

module.exports = new ContractService(); 