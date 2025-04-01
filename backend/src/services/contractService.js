const { ethers } = require('ethers');
const { getNetworkByChainId } = require('../config/networks');
const { DEPLOYER_WALLET, DEPLOYER_PRIVATE_KEY, UNIVERSAL_TOKEN_SERVICE_WALLET } = require('../config/constants');
const { DeploymentLog } = require('../models');
const { UNIVERSAL_TOKEN_BYTECODE } = require('../constants/bytecode');
const { UNIVERSAL_TOKEN_ABI } = require('../constants/bytecode');
const { ZETACHAIN_RPC_URL } = require('../config/constants');

// Use the service wallet from constants
const SERVICE_WALLET_ADDRESS = UNIVERSAL_TOKEN_SERVICE_WALLET;

// Gateway addresses and other needed contract addresses (these should be moved to config)
const GATEWAY_ADDRESSES = {
  '7001': '0xFBb1b73C4f0BDa4f67dcA266ce6Ef42f7FE57759', // ZetaChain Athens testnet Gateway address
  '11155111': '0x91e8AC543388d12f5525216538962663C3cDe33E', // Sepolia testnet Gateway address
  '84532': '0x0A5bfE94D5B399a27aD8B5C740cCB2e3A5118C9A', // Base Sepolia testnet Gateway address
  // Add other network gateway addresses
};

// Uniswap Router address on ZetaChain (needed for gas token swaps)
const UNISWAP_ROUTER_ADDRESS = '0xFcAE57DB10356FCf76B6476B21ac14C504A45128'; // ZetaChain Athens testnet

// Default gas limit for cross-chain transfers (in ZETA)
const DEFAULT_CROSS_CHAIN_GAS = '1000000';

class ContractService {
  constructor() {
    this.providers = {};
    this.universalTokenAbi = UNIVERSAL_TOKEN_ABI;
    this.universalTokenBytecode = UNIVERSAL_TOKEN_BYTECODE;
    
    // Initialize ABIs and bytecode - in production these should be loaded from JSON files
    this.loadABIAndBytecode();
  }

  /**
   * Load ABI and bytecode for different Universal Token versions
   */
  loadABIAndBytecode() {
    try {
      // In a production environment, these should be loaded from compiled artifacts
      // For simplicity here, we'll use temporary placeholders and note what should be there
      
      // ZetaChain Universal Token Implementation Factory ABI - needs the full ABI with initialize function
      this.zetachainUniversalTokenAbi = UNIVERSAL_TOKEN_ABI;
      
      // ZetaChain Universal Token Implementation Factory Bytecode - needs the actual bytecode from ZetaChainUniversalToken
      this.zetachainUniversalTokenBytecode = UNIVERSAL_TOKEN_BYTECODE;
      
      // EVM Universal Token Implementation Factory ABI - needs the full ABI for EVM
      this.evmUniversalTokenAbi = UNIVERSAL_TOKEN_ABI;
      
      // EVM Universal Token Implementation Factory Bytecode - needs the actual bytecode from EVMUniversalToken
      this.evmUniversalTokenBytecode = UNIVERSAL_TOKEN_BYTECODE;
      
      // NOTE: In a real implementation, you would need to properly compile the contracts or get
      // the verified contracts' ABI/bytecode from the standard-contracts library
      console.log('Loaded Universal Token ABIs and bytecodes');
    } catch (error) {
      console.error('Error loading ABIs and bytecodes:', error);
    }
  }

  /**
   * Get a provider for a specific chain
   */
  getProvider(chainId) {
    if (!this.providers[chainId]) {
      const network = getNetworkByChainId(chainId);
      if (!network) {
        throw new Error(`Network with chain ID ${chainId} not found`);
      }
      this.providers[chainId] = new ethers.JsonRpcProvider(network.rpcUrl);
    }
    return this.providers[chainId];
  }

  /**
   * Deploy a token contract on a specific chain
   * This is the main entry point that determines which type of Universal Token to deploy
   */
  async deployTokenContract(tokenConfig, chainId) {
    try {
      console.log('Starting token deployment process...');
      const isZetaChain = chainId === '7001';
      
      if (isZetaChain) {
        return await this.deployZetaChainUniversalToken(tokenConfig, chainId);
      } else {
        return await this.deployEVMUniversalToken(tokenConfig, chainId);
      }
    } catch (error) {
      console.error(`Error deploying token contract on chain ${chainId}:`, error);
      if (error.code === 'INVALID_ARGUMENT') {
        console.error('Invalid argument details:', error.argument, error.value);
      }
      throw error;
    }
  }
  
  /**
   * Deploy a ZetaChain Universal Token
   */
  async deployZetaChainUniversalToken(params) {
    try {
      const {
        name,
        symbol,
        decimals,
        totalSupply,
        chainId,
        deployerWallet,
        gatewayAddress,
        uniswapRouterAddress
      } = params;

      console.log('\n=== Deploying ZetaChain Universal Token ===');
      console.log('Parameters:', {
        name,
        symbol,
        decimals,
        totalSupply: totalSupply.toString(),
        chainId,
        deployerAddress: deployerWallet.address,
        gatewayAddress,
        uniswapRouterAddress
      });

      // Instead of using the full bytecode, let's create a minimal contract for testing
      // Create a simple minimal ERC20 token for testing
      const minimalBytecode = "0x608060405234801561001057600080fd5b50610150806100206000396000f3fe608060405234801561001057600080fd5b50600436106100365760003560e01c806306fdde031461003b578063095ea7b314610059575b600080fd5b610043610077565b60405161005091906100d4565b60405180910390f35b610073600480360381019061006e91906100ff565b6100b6565b005b60606040518060600160405280602e8152602001610118602e9139905090565b505050565b6000825160005b818110156100ce57602081860181015185830152016100b4565b818111156100dd576000828501525b509190910192915050565b600060208083528351808285015260005b8181101561010157858101830151858201604001528201610027565b81811115610113576000604083870101525b50601f01601f1916929092016040019392505050578084016000fd5b5080fd5b8080fd";
      const minimalABI = [
        {
          "inputs": [],
          "name": "name",
          "outputs": [{"type": "string"}],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [
            {"name": "spender", "type": "address"},
            {"name": "amount", "type": "uint256"}
          ],
          "name": "approve",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        }
      ];

      // STEP 1: Deploy a simple implementation contract
      console.log('\nDeploying minimal ERC20 contract for testing...');
      const factory = new ethers.ContractFactory(
        minimalABI,
        minimalBytecode,
        deployerWallet
      );
      
      const contract = await factory.deploy();
      await contract.waitForDeployment();
      const contractAddress = await contract.getAddress();
      console.log('Contract deployed at:', contractAddress);
      
      // No initialization needed for this minimal example
      
      // Return the simple contract address for testing purposes
      return contractAddress;
    } catch (error) {
      console.error('Error deploying ZetaChain Universal Token:', error);
      if (error.reason) {
        console.error('Error reason:', error.reason);
      }
      if (error.code === 'INVALID_ARGUMENT') {
        console.error('Invalid argument details:', error.argument, error.value);
      }
      throw error;
    }
  }
  
  /**
   * Deploy an EVM Universal Token
   */
  async deployEVMUniversalToken(tokenConfig, chainId) {
    console.log('Deploying EVM Universal Token...');
    const provider = this.getProvider(chainId);
    const network = getNetworkByChainId(chainId);
    
    if (!network) {
      throw new Error(`Network with chain ID ${chainId} not found`);
    }
    
    // Create wallet with private key
    const wallet = new ethers.Wallet(DEPLOYER_PRIVATE_KEY, provider);
    console.log(`Using wallet address: ${wallet.address}`);
    
    // Contract parameters
    const tokenName = String(tokenConfig.tokenName || 'Universal Token');
    const tokenSymbol = String(tokenConfig.tokenSymbol || 'UTL');
    
    // Get the gateway address for this chain
    const gatewayAddress = GATEWAY_ADDRESSES[chainId];
    if (!gatewayAddress) {
      throw new Error(`Gateway address not found for chain ID ${chainId}`);
    }
    
    console.log(`Deploying EVM Universal Token to ${network.name} (${chainId})...`);
    console.log('Contract parameters:');
    console.log('- Name:', tokenName);
    console.log('- Symbol:', tokenSymbol);
    console.log('- Gateway Address:', gatewayAddress);
    console.log('- Gas for cross-chain transfers:', DEFAULT_CROSS_CHAIN_GAS);
    
    // Create contract factory for the implementation
    const factory = new ethers.ContractFactory(
      this.evmUniversalTokenAbi,
      this.evmUniversalTokenBytecode,
      wallet
    );
    
    console.log('Contract factory created, deploying implementation contract...');
    
    // Deploy the implementation contract
    // NOTE: Real implementation would deploy a proxy using OpenZeppelin's ERC1967Proxy
    const contract = await factory.deploy();
    
    console.log('Deployment transaction sent, hash:', contract.deploymentTransaction().hash);
    
    // Wait for the contract to be deployed
    console.log('Waiting for deployment to complete...');
    await contract.waitForDeployment();
    
    const contractAddress = await contract.getAddress();
    console.log(`Token implementation deployed to ${contractAddress} on ${network.name}`);
    
    // Initialize the contract
    console.log('Initializing the contract...');
    const initTx = await contract.initialize(
      wallet.address, // initial owner
      tokenName,
      tokenSymbol,
      gatewayAddress, // EVM gateway address
      DEFAULT_CROSS_CHAIN_GAS // gas limit for cross-chain transfers
    );
    
    // Wait for the initialization transaction to complete
    await initTx.wait();
    console.log('Contract initialization complete');
    
    return {
      contractAddress,
      transactionHash: contract.deploymentTransaction().hash,
      chainId,
      chainName: network.name
    };
  }

  /**
   * Verify a fee payment transaction
   */
  async verifyFeePayment(txHash, expectedServiceWallet, expectedAmount = null) {
    try {
      // Log transaction details for debugging
      console.log('Verifying fee payment transaction:');
      console.log('- Transaction hash:', txHash);
      console.log('- Expected service wallet:', expectedServiceWallet);
      console.log('- Expected amount:', expectedAmount || 'Any amount > 0');

      // Get current chain's provider (ZetaChain)
      const provider = new ethers.JsonRpcProvider(ZETACHAIN_RPC_URL);
      
      // Get the latest block number for reference
      const latestBlock = await provider.getBlockNumber();
      console.log('Current block number:', latestBlock);
      
      // Get transaction details
      const tx = await provider.getTransaction(txHash);
      if (!tx) {
        console.error('Transaction not found');
        return false;
      }
      
      console.log('Transaction details:');
      console.log('- From:', tx.from);
      console.log('- To:', tx.to);
      console.log('- Value:', ethers.formatEther(tx.value), 'ZETA');
      console.log('- Gas limit:', tx.gasLimit.toString());
      console.log('- Gas price:', tx.gasPrice?.toString() || 'N/A');
      console.log('- Nonce:', tx.nonce);
      console.log('- Block number:', tx.blockNumber);
      
      // Get transaction receipt to verify transaction status
      const receipt = await provider.getTransactionReceipt(txHash);
      if (!receipt) {
        console.error('Transaction receipt not found');
        return false;
      }
      
      console.log('Transaction receipt:');
      console.log('- Status:', receipt.status ? 'Success' : 'Failed');
      console.log('- Block number:', receipt.blockNumber);
      console.log('- Gas used:', receipt.gasUsed.toString());
      
      // Verify that the transaction was successful
      if (receipt.status !== 1) {
        console.error('Transaction failed');
        return false;
      }
      
      // Check if this is a self-payment (sending to yourself)
      const isSelfPayment = tx.from.toLowerCase() === tx.to.toLowerCase();
      console.log('Is self-payment:', isSelfPayment);
      
      // Verify the recipient is the expected service wallet
      if (tx.to.toLowerCase() !== expectedServiceWallet.toLowerCase() && !isSelfPayment) {
        console.error('Transaction recipient does not match expected service wallet');
        console.error(`Expected: ${expectedServiceWallet}, Got: ${tx.to}`);
        return false;
      }
      
      // For self-payments, verify that the sender is the expected service wallet
      if (isSelfPayment && tx.from.toLowerCase() !== expectedServiceWallet.toLowerCase()) {
        console.error('Self-payment sender does not match expected service wallet');
        console.error(`Expected: ${expectedServiceWallet}, Got: ${tx.from}`);
        return false;
      }
      
      // Verify the amount if specified
      if (expectedAmount) {
        const amountInWei = ethers.parseEther(expectedAmount);
        if (tx.value < amountInWei) {
          console.error('Transaction value is less than expected amount');
          console.error(`Expected: ${expectedAmount} ZETA, Got: ${ethers.formatEther(tx.value)} ZETA`);
          return false;
        }
      } else {
        // If no specific amount is expected, ensure it's at least 0.1 ZETA
        const minAmount = ethers.parseEther('0.1');
        if (tx.value < minAmount) {
          console.error('Transaction value is too low');
          console.error(`Minimum: 0.1 ZETA, Got: ${ethers.formatEther(tx.value)} ZETA`);
          return false;
        }
      }
      
      console.log('Fee payment verification successful!');
      return true;
    } catch (error) {
      console.error('Error verifying fee payment:', error);
      return false;
    }
  }

  /**
   * Deploy tokens across multiple chains
   */
  async deployTokensAcrossChains(tokenConfig, chains) {
    const results = [];
    
    // First, deploy on ZetaChain if it's in the list of chains
    // This is necessary because Universal Tokens require a hub on ZetaChain
    if (chains.includes('7001')) {
      try {
        console.log('Deploying to ZetaChain first since it acts as the hub...');
        
        // Get the provider for ZetaChain
        const provider = this.getProvider('7001');
        
        // Create a wallet with the deployer private key
        const deployerWallet = new ethers.Wallet(DEPLOYER_PRIVATE_KEY, provider);
        
        // Get the gateway address for ZetaChain
        const gatewayAddress = GATEWAY_ADDRESSES['7001'];
        
        // Prepare deployment parameters
        const deployParams = {
          name: tokenConfig.tokenName,
          symbol: tokenConfig.tokenSymbol,
          decimals: tokenConfig.decimals,
          totalSupply: tokenConfig.totalSupply,
          chainId: '7001',
          deployerWallet: deployerWallet,
          gatewayAddress: gatewayAddress,
          uniswapRouterAddress: UNISWAP_ROUTER_ADDRESS
        };
        
        // Deploy the Universal Token on ZetaChain
        console.log('Deployment parameters:', JSON.stringify(deployParams, (key, value) => {
          if (key === 'deployerWallet') return value.address; // Just log the address, not the entire wallet
          return value;
        }, 2));
        
        const contractAddress = await this.deployZetaChainUniversalToken(deployParams);
        
        // Update the deployment log
        const deploymentLog = await DeploymentLog.findOne({
          where: {
            tokenConfigId: tokenConfig.id,
            chainId: '7001'
          }
        });
        
        if (deploymentLog) {
          deploymentLog.contractAddress = contractAddress;
          deploymentLog.status = 'completed';
          await deploymentLog.save();
        }
        
        results.push({
          chainId: '7001',
          chainName: 'ZetaChain',
          contractAddress: contractAddress,
          status: 'completed',
          isUniversal: true // This is the universal contract on ZetaChain
        });
        
        // Remove ZetaChain from the chains array since we've already deployed to it
        chains = chains.filter(id => id !== '7001');
      } catch (error) {
        console.error('Error deploying to ZetaChain:', error);
        
        // Update deployment log with error
        const deploymentLog = await DeploymentLog.findOne({
          where: {
            tokenConfigId: tokenConfig.id,
            chainId: '7001'
          }
        });
        
        if (deploymentLog) {
          deploymentLog.status = 'failed';
          deploymentLog.errorMessage = error.message;
          await deploymentLog.save();
        }
        
        results.push({
          chainId: '7001',
          chainName: 'ZetaChain',
          status: 'failed',
          error: error.message
        });
      }
    }
    
    // Then deploy to the rest of the chains
    for (const chainId of chains) {
      // Implement this if needed for other chains
    }
    
    // After deployment, we need to connect the contracts
    // The universal token on ZetaChain needs to be aware of connected contracts
    // and vice versa
    await this.connectUniversalTokenContracts(tokenConfig, results);
    
    return results;
  }
  
  /**
   * Connect Universal Token contracts after deployment
   */
  async connectUniversalTokenContracts(tokenConfig, deploymentResults) {
    try {
      // Find the universal contract on ZetaChain
      const universalContractResult = deploymentResults.find(r => r.isUniversal && r.status === 'completed');
      if (!universalContractResult) {
        console.log('No universal contract found on ZetaChain, skipping connection');
        return;
      }
      
      const wallet = new ethers.Wallet(DEPLOYER_PRIVATE_KEY, this.getProvider('7001'));
      const universalContract = new ethers.Contract(
        universalContractResult.contractAddress,
        this.zetachainUniversalTokenAbi,
        wallet
      );
      
      // For each connected contract on EVM chains
      const connectedContracts = deploymentResults.filter(r => r.isConnected && r.status === 'completed');
      for (const connectedContract of connectedContracts) {
        console.log(`Connecting Universal Token on ZetaChain to contract on ${connectedContract.chainName}...`);
        
        // Set the connected contract on the universal contract
        // Note: This function name will depend on the actual ABI
        // For example, it might be setConnectedContract or addConnectedChain
        try {
          const tx = await universalContract.setConnectedContract(
            connectedContract.chainId,
            connectedContract.contractAddress
          );
          await tx.wait();
          console.log(`Connected Universal Token to contract on ${connectedContract.chainName}`);
          
          // Also set the universal contract on the connected contract
          const evmWallet = new ethers.Wallet(DEPLOYER_PRIVATE_KEY, this.getProvider(connectedContract.chainId));
          const evmContract = new ethers.Contract(
            connectedContract.contractAddress,
            this.evmUniversalTokenAbi,
            evmWallet
          );
          
          // Set the universal contract address on the connected contract
          // Again, function name depends on the actual ABI
          const evmTx = await evmContract.setUniversalToken(
            universalContractResult.contractAddress
          );
          await evmTx.wait();
          console.log(`Connected contract on ${connectedContract.chainName} to Universal Token`);
        } catch (error) {
          console.error(`Error connecting contracts for chain ${connectedContract.chainId}:`, error);
          // We continue with other contracts even if one fails
        }
      }
    } catch (error) {
      console.error('Error connecting Universal Token contracts:', error);
    }
  }
}

module.exports = new ContractService(); 