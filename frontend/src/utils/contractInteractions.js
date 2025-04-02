import { ethers } from 'ethers';
import { getAccount, getPublicClient, getWalletClient } from 'wagmi/actions';
import { getAbiForChain, estimateCrossChainGas, CHAIN_IDS } from './contracts';
import { switchToNetwork } from './networkSwitchingUtility';

/**
 * Executes a cross-chain token transfer using the Universal Token contracts
 * 
 * @param {Object} params - Transfer parameters
 * @param {string} params.sourceChain - Source chain ID
 * @param {string} params.destinationChain - Destination chain ID
 * @param {string} params.tokenAddress - Token contract address on the source chain
 * @param {string} params.recipientAddress - Recipient address on the destination chain
 * @param {string} params.amount - Amount to transfer (as a string)
 * @returns {Promise<Object>} Transfer result with transaction hash
 */
export async function executeCrossChainTransfer({
  sourceChain,
  destinationChain,
  tokenAddress,
  recipientAddress,
  amount
}) {
  try {
    console.log('Starting cross-chain transfer with params:', {
      sourceChain,
      destinationChain,
      tokenAddress,
      recipientAddress,
      amount
    });

    // Get the connected account
    const account = getAccount();
    if (!account.isConnected) {
      throw new Error('Wallet not connected');
    }
    
    // Ensure we're on the correct source chain
    if (account.chainId !== parseInt(sourceChain, 10)) {
      const switched = await switchToNetwork(parseInt(sourceChain, 10));
      if (!switched) {
        throw new Error(`Failed to switch to network ${sourceChain}`);
      }
    }
    
    // Get wallet client for the source chain
    const walletClient = await getWalletClient({
      chainId: parseInt(sourceChain, 10)
    });
    
    if (!walletClient) {
      throw new Error('Failed to get wallet client');
    }

    // Create ethers provider from public client
    const publicClient = getPublicClient({
      chainId: parseInt(sourceChain, 10)
    });
    
    // Get the appropriate ABI for the source chain
    const abi = getAbiForChain(sourceChain);
    
    // Create ethers provider from public client
    const provider = new ethers.BrowserProvider(window.ethereum);
    
    // Get signer for transactions
    const signer = await provider.getSigner();
    
    // Create contract instance
    const tokenContract = new ethers.Contract(tokenAddress, abi, signer);
    
    // Estimate gas for the transaction
    const gasLimit = estimateCrossChainGas(sourceChain, destinationChain);
    
    console.log('Executing crossChainTransfer with parameters:', {
      destinationChain: destinationChain,
      recipient: recipientAddress,
      amount: amount
    });
    
    // Execute cross-chain transfer
    const tx = await tokenContract.crossChainTransfer(
      destinationChain,
      recipientAddress,
      amount,
      { gasLimit }
    );
    
    console.log('Transaction submitted:', tx.hash);
    
    // Wait for transaction to be mined
    const receipt = await tx.wait();
    console.log('Transaction confirmed:', receipt);
    
    // Return transfer details
    return {
      transactionHash: tx.hash,
      sourceChain,
      destinationChains: [destinationChain],
      amount,
      recipientAddress,
      status: 'success'
    };
  } catch (error) {
    console.error('Cross-chain transfer failed:', error);
    throw new Error(`Transfer failed: ${error.message}`);
  }
}

/**
 * Gets token details from contract
 * 
 * @param {Object} params - Parameters
 * @param {string} params.chainId - Chain ID
 * @param {string} params.tokenAddress - Token contract address
 * @returns {Promise<Object>} Token details
 */
export async function getTokenDetails({ chainId, tokenAddress }) {
  try {
    // Get public client for read-only operations
    const publicClient = getPublicClient({
      chainId: parseInt(chainId, 10)
    });
    
    if (!publicClient) {
      throw new Error('Failed to get public client');
    }
    
    // Create ethers provider
    const provider = new ethers.BrowserProvider(window.ethereum);
    
    // Get the appropriate ABI
    const abi = getAbiForChain(chainId);
    
    // Create contract instance (read-only)
    const tokenContract = new ethers.Contract(tokenAddress, abi, provider);
    
    // Get token details
    const [name, symbol, decimals] = await Promise.all([
      tokenContract.name(),
      tokenContract.symbol(),
      tokenContract.decimals()
    ]);
    
    return {
      name,
      symbol,
      decimals
    };
  } catch (error) {
    console.error('Failed to get token details:', error);
    throw error;
  }
}

/**
 * Gets token balance for an address
 * 
 * @param {Object} params - Parameters
 * @param {string} params.chainId - Chain ID
 * @param {string} params.tokenAddress - Token contract address
 * @param {string} params.walletAddress - Wallet address to check balance for
 * @returns {Promise<string>} Token balance as a string
 */
export async function getTokenBalance({ chainId, tokenAddress, walletAddress }) {
  try {
    // Create ethers provider
    const provider = new ethers.BrowserProvider(window.ethereum);
    
    // Get the appropriate ABI
    const abi = getAbiForChain(chainId);
    
    // Create contract instance (read-only)
    const tokenContract = new ethers.Contract(tokenAddress, abi, provider);
    
    // Get balance
    const balance = await tokenContract.balanceOf(walletAddress);
    
    return balance.toString();
  } catch (error) {
    console.error('Failed to get token balance:', error);
    return '0';
  }
} 