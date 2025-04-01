const axios = require('axios');
const { ethers } = require('ethers');
const { NETWORKS, NETWORK_CATEGORIES } = require('../config/networks');
const { UNIVERSAL_TOKEN_ABI, UNIVERSAL_TOKEN_BYTECODE } = require('../constants/bytecode');
const { UNIVERSAL_TOKEN_SERVICE_WALLET } = require('../config/constants');
require('dotenv').config();

const API_URL = 'http://localhost:3000/api';
let authToken = null;

// Use the service wallet from constants
const SERVICE_WALLET_ADDRESS = UNIVERSAL_TOKEN_SERVICE_WALLET;

// Get ZetaChain Athens testnet RPC URL
const ZETACHAIN_RPC_URL = NETWORKS[NETWORK_CATEGORIES.TESTNETS]['7001'].rpcUrl;

async function authenticate() {
  try {
    // Create a test wallet
    const wallet = ethers.Wallet.createRandom();
    
    // Create a message to sign
    const message = 'Sign this message to authenticate with Universal Token Launcher';
    const signature = await wallet.signMessage(message);

    // Send authentication request
    const response = await axios.post(`${API_URL}/auth/authenticate`, {
      wallet: wallet.address,
      signature,
      message
    });

    authToken = response.data.token;
    console.log('Authentication successful');
    return wallet;
  } catch (error) {
    console.error('Authentication failed:', error.response?.data || error.message);
    throw error;
  }
}

async function createToken(wallet) {
  try {
    const tokenData = {
      tokenName: 'Test Universal Token',
      tokenSymbol: 'TUT',
      decimals: 18,
      totalSupply: '1000000000', // 1 billion tokens
      iconUrl: 'https://example.com/token-icon.png',
      selectedChains: ['7001'], // ZetaChain Athens testnet
      csvDataRaw: 'address,amount\n0x123...abc,1000000\n0x456...def,2000000'
    };

    console.log('\n=== Creating Token ===');
    console.log('Token data:', JSON.stringify(tokenData, null, 2));
    console.log('Authorization header present:', !!authToken);
    
    const response = await axios.post(`${API_URL}/tokens`, tokenData, {
      headers: {
        Authorization: `Bearer ${authToken}`
      }
    });

    console.log('\nToken creation response:');
    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(response.data, null, 2));
    
    // Verify token exists by making a GET request
    console.log('\nVerifying token exists...');
    try {
      const verifyResponse = await axios.get(`${API_URL}/tokens/${response.data.id}`, {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      });
      console.log('Token verification success:', verifyResponse.status === 200);
      console.log('Token data:', JSON.stringify(verifyResponse.data, null, 2));
    } catch (verifyError) {
      console.error('Token verification failed:', verifyError.response?.data || verifyError.message);
    }

    return response.data;
  } catch (error) {
    console.error('Token creation failed:', error.response?.data || error.message);
    throw error;
  }
}

async function sendFeePayment() {
  try {
    const provider = new ethers.JsonRpcProvider(ZETACHAIN_RPC_URL);
    const wallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);
    
    // Get latest block number and wallet balance
    const latestBlock = await provider.getBlockNumber();
    const balance = await provider.getBalance(wallet.address);
    
    console.log('\n=== Fee Payment Details ===');
    console.log('From wallet address:', wallet.address);
    console.log('Wallet balance:', ethers.formatEther(balance), 'ZETA');
    console.log('To service wallet address:', SERVICE_WALLET_ADDRESS);
    console.log('Amount: 1.0 ZETA');
    console.log('Network:', ZETACHAIN_RPC_URL);
    console.log('Latest block number:', latestBlock);
    
    // Check if sending to self
    if (wallet.address.toLowerCase() === SERVICE_WALLET_ADDRESS.toLowerCase()) {
      console.log('\n⚠️ WARNING: You are sending a payment to yourself!');
      console.log('The deployer wallet and service wallet are the same address.');
      console.log('This may cause verification issues unless the service is configured to accept self-payments.');
    }
    
    console.log('========================\n');
    
    // For a simple ETH transfer, we can use a fixed gas limit of 21000
    const GAS_LIMIT = 21000n;
    
    // Get current gas price
    const gasPrice = await provider.getFeeData();
    console.log('Current gas price:', gasPrice.gasPrice?.toString());
    console.log('Max fee per gas:', gasPrice.maxFeePerGas?.toString());
    console.log('Max priority fee per gas:', gasPrice.maxPriorityFeePerGas?.toString());
    
    // Send 1 ZETA to the service wallet
    const tx = await wallet.sendTransaction({
      to: SERVICE_WALLET_ADDRESS,
      value: ethers.parseEther('1.0'),
      gasLimit: GAS_LIMIT,
      maxFeePerGas: gasPrice.maxFeePerGas,
      maxPriorityFeePerGas: gasPrice.maxPriorityFeePerGas
    });
    
    console.log('\nTransaction sent:');
    console.log('Transaction hash:', tx.hash);
    console.log('Transaction data:', tx.data);
    console.log('Gas limit:', tx.gasLimit.toString());
    console.log('Gas price:', tx.gasPrice?.toString());
    console.log('Max fee per gas:', tx.maxFeePerGas?.toString());
    console.log('Max priority fee per gas:', tx.maxPriorityFeePerGas?.toString());
    console.log('Nonce:', tx.nonce);
    console.log('Chain ID:', tx.chainId);
    
    // Wait for transaction to be mined
    console.log('\nWaiting for transaction to be mined...');
    const receipt = await tx.wait();
    console.log('Transaction mined!');
    console.log('Block number:', receipt.blockNumber);
    console.log('Gas used:', receipt.gasUsed.toString());
    
    // Handle both legacy and EIP-1559 transactions
    if (receipt.effectiveGasPrice) {
      console.log('Effective gas price:', receipt.effectiveGasPrice.toString());
    } else if (receipt.gasPrice) {
      console.log('Gas price:', receipt.gasPrice.toString());
    }
    
    console.log('Status:', receipt.status === 1 ? 'Success' : 'Failed');
    console.log('Logs:', receipt.logs);
    
    // Get latest block number after mining
    const latestBlockAfterMining = await provider.getBlockNumber();
    console.log('Latest block number after mining:', latestBlockAfterMining);
    console.log('Blocks mined during transaction:', latestBlockAfterMining - latestBlock);
    
    // Check wallet balance after transaction
    const newBalance = await provider.getBalance(wallet.address);
    console.log('New wallet balance:', ethers.formatEther(newBalance), 'ZETA');
    
    // Wait additional 10 seconds to ensure transaction is fully confirmed
    console.log('\nWaiting 10 seconds for confirmation...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    console.log('Ready to proceed with deployment');
    
    return tx.hash;
  } catch (error) {
    console.error('Error sending fee payment:', error);
    if (error.transaction) {
      console.error('Failed transaction details:', {
        hash: error.transaction.hash,
        from: error.transaction.from,
        to: error.transaction.to,
        value: error.transaction.value?.toString(),
        data: error.transaction.data,
        gasLimit: error.transaction.gasLimit?.toString(),
        gasPrice: error.transaction.gasPrice?.toString(),
        nonce: error.transaction.nonce,
        chainId: error.transaction.chainId
      });
    }
    throw error;
  }
}

async function deployToken(tokenId, feeTxHash) {
  try {
    console.log('\n=== Deploying Token ===');
    console.log('Token ID:', tokenId);
    console.log('Fee transaction hash:', feeTxHash);
    console.log('Authorization header present:', !!authToken);
    
    const deployData = { feeTxHash };
    console.log('Request data:', JSON.stringify(deployData, null, 2));
    
    const url = `${API_URL}/tokens/${tokenId}/deploy`;
    console.log('Request URL:', url);
    
    const response = await axios.post(
      url,
      deployData,
      {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      }
    );

    console.log('\nDeployment initiated:');
    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('\nDeployment failed:');
    console.error('Status:', error.response?.status);
    console.error('Error data:', error.response?.data);
    console.error('Error message:', error.message);
    
    if (error.response?.status === 500) {
      console.error('\nServer error detected. Possible causes:');
      console.error('1. Token configuration may not exist in the database');
      console.error('2. Fee payment verification might have failed');
      console.error('3. Internal server error during deployment process');
    }
    
    throw error;
  }
}

async function checkDeploymentStatus(tokenId) {
  try {
    const url = `${API_URL}/deployments/token/${tokenId}`;
    console.log('Checking deployment status at URL:', url);
    
    const response = await axios.get(
      url,
      {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      }
    );

    console.log('Deployment status:', response.data);
    return response.data;
  } catch (error) {
    console.error('Failed to check deployment status:', error.response?.data || error.message);
    throw error;
  }
}

async function main() {
  try {
    // Step 1: Authenticate
    const wallet = await authenticate();

    // Step 2: Create token
    const token = await createToken(wallet);

    // Step 3: Send fee payment
    const feeTxHash = await sendFeePayment();

    // Step 4: Deploy token with real fee transaction hash
    await deployToken(token.id, feeTxHash);

    // Step 5: Check deployment status
    await checkDeploymentStatus(token.id);
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

main(); 