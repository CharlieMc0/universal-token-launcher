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
    console.log('Account information:', account);
    
    if (!account.isConnected) {
      throw new Error('Wallet not connected');
    }
    
    // Convert sourceChain to integer for comparison
    const sourceChainId = parseInt(sourceChain, 10);
    const destinationChainId = parseInt(destinationChain, 10);
    
    // Get current chain ID from provider directly if wagmi's account.chainId is undefined
    let currentChainId = account.chainId;
    
    if (!currentChainId && window.ethereum) {
      try {
        // Get chain ID directly from ethereum provider
        const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
        currentChainId = parseInt(chainIdHex, 16);
        console.log('Retrieved chain ID directly from provider:', currentChainId);
      } catch (error) {
        console.error('Error getting chain ID from provider:', error);
      }
    }
    
    // Ensure we're on the correct source chain
    console.log('Current chain ID:', currentChainId, 'Target chain ID:', sourceChainId);
    
    if (currentChainId !== sourceChainId) {
      console.log('Switching network to source chain:', sourceChainId);
      const switched = await switchToNetwork(sourceChainId);
      if (!switched) {
        throw new Error(`Failed to switch to network ${sourceChain}. Please switch manually in your wallet.`);
      }
      
      // Wait a moment for the network switch to take effect
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check again if we're on the right network - using direct provider check
      if (window.ethereum) {
        const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
        const updatedChainId = parseInt(chainIdHex, 16);
        console.log('After switch, chain ID is:', updatedChainId);
        
        if (updatedChainId !== sourceChainId) {
          throw new Error(`Failed to switch to source chain (${sourceChain}). Please try again.`);
        }
      }
      
      console.log('Successfully switched to source chain');
    }
    
    // Get wallet client for the source chain specifically
    console.log('Getting wallet client for source chain...');
    const walletClient = await getWalletClient({
      chainId: sourceChainId
    });
    
    if (!walletClient) {
      throw new Error('Failed to get wallet client for source chain. Please check your wallet connection.');
    }
    console.log('Got wallet client:', !!walletClient);

    // Create ethers provider from window.ethereum
    console.log('Creating provider...');
    if (!window.ethereum) {
      throw new Error('No ethereum provider found. Please make sure your wallet is connected.');
    }
    const provider = new ethers.BrowserProvider(window.ethereum);
    console.log('Provider created');
    
    // Get signer for transactions and verify chain
    console.log('Getting signer...');
    const signer = await provider.getSigner();
    console.log('Got signer:', signer.address);
    
    // Verify we're still on the correct chain - in ethers v6, use provider.getNetwork().chainId
    console.log('Checking provider chain...');
    const network = await provider.getNetwork();
    const providerChainId = Number(network.chainId);
    console.log('Provider chain ID:', providerChainId);
    
    if (providerChainId !== sourceChainId) {
      console.error(`Network mismatch: Provider is on ${providerChainId}, but source chain is ${sourceChainId}`);
      
      // Try one final network switch
      console.log('Attempting final network switch...');
      await switchToNetwork(sourceChainId);
      
      // Wait for network switch and check again
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Get updated chain ID
      const updatedNetwork = await provider.getNetwork();
      const finalChainId = Number(updatedNetwork.chainId);
      console.log('Final chain ID check:', finalChainId);
      
      if (finalChainId !== sourceChainId) {
        throw new Error(`Network mismatch: Provider is on ${finalChainId}, but source chain is ${sourceChainId}`);
      }
      
      // Get new signer after network switch
      const newSigner = await provider.getSigner();
      console.log('Got new signer after network switch:', newSigner.address);
    }
    
    // Create contract instance
    console.log('Creating contract instance at address:', tokenAddress);
    
    // Enhanced fallback ABI that matches actual implementation
    const ENHANCED_ZETACHAIN_UNIVERSAL_TOKEN_ABI = [
      // Core ERC20 functions
      "function balanceOf(address owner) view returns (uint256)",
      "function decimals() view returns (uint8)",
      "function symbol() view returns (string)",
      "function name() view returns (string)",
      "function transfer(address to, uint256 amount) returns (bool)",
      "function totalSupply() view returns (uint256)",
      
      // Cross-chain functions
      "function crossChainTransfer(uint256 destChainId, address recipient, uint256 amount) external",
      "function connectedContracts(uint256 chainId) view returns (address)",
      
      // Owner functions
      "function mint(address to, uint256 amount) external",
      "function owner() view returns (address)",
      
      // Events
      "event CrossChainTransferInitiated(address from, uint256 destChainId, address to, uint256 amount)",
      "event CrossChainTransferReceived(uint256 sourceChainId, address from, address to, uint256 amount)",
      "event Transfer(address indexed from, address indexed to, uint256 value)"
    ];
    
    // Get the appropriate ABI and ensure it's valid
    const abi = getAbiForChain(sourceChain);
    if (!abi || !Array.isArray(abi) || abi.length === 0) {
      console.error('Invalid ABI returned for chain', sourceChain);
      console.log('Using enhanced fallback ABI with standard ERC20 + crossChainTransfer');
      
      const tokenContract = new ethers.Contract(tokenAddress, ENHANCED_ZETACHAIN_UNIVERSAL_TOKEN_ABI, signer);
      console.log('Contract instance created with enhanced fallback ABI');
      
      // Safely check contract methods
      try {
        console.log('Checking contract methods...');
        // First check if balance method works to verify contract
        const balance = await tokenContract.balanceOf(signer.address);
        console.log('Successfully got balance:', balance.toString());
        
        // Then check if token has expected methods
        if (typeof tokenContract.crossChainTransfer !== 'function') {
          throw new Error('Contract does not have crossChainTransfer function even with fallback ABI');
        }
        
        // Log available methods for debugging
        console.log('Contract methods available:', 
          Object.keys(tokenContract.interface.functions).join(', '));
          
        return processTransfer(tokenContract, destinationChainId, recipientAddress, amount, sourceChainId);
      } catch (methodError) {
        console.error('Contract method check failed:', methodError);
        throw new Error(`Contract at ${tokenAddress} does not appear to be a valid Universal Token. Error: ${methodError.message}`);
      }
    }
    
    const tokenContract = new ethers.Contract(tokenAddress, abi, signer);
    console.log('Contract instance created with standard ABI');
    
    return processTransfer(tokenContract, destinationChainId, recipientAddress, amount, sourceChainId);
  } catch (error) {
    console.error('Cross-chain transfer failed:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    throw new Error(`Transfer failed: ${error.message}`);
  }
}

/**
 * Helper function to process the actual transfer once the contract is created
 * Separated to allow for fallback ABI handling
 */
async function processTransfer(tokenContract, destinationChain, recipientAddress, amount, sourceChain) {
  try {
    // Check token balance before trying to transfer
    console.log('Checking token balance...');
    const balance = await tokenContract.balanceOf(tokenContract.runner.address);
    console.log('Token balance:', balance.toString());
    
    const amountBigInt = ethers.toBigInt(amount);
    if (balance < amountBigInt) {
      throw new Error(`Insufficient token balance. You have ${balance.toString()} but trying to transfer ${amount}`);
    }
    
    // Safe check for contract interface and functions
    console.log('Contract address:', tokenContract.target);
    console.log('Contract runner:', tokenContract.runner.address);
    
    // Check if destination chain has a connected contract
    try {
      const connectedContract = await tokenContract.connectedContracts(destinationChain);
      console.log(`Connected contract for chain ${destinationChain}:`, connectedContract);
      
      if (connectedContract === ethers.ZeroAddress) {
        throw new Error(`No connected contract found for chain ID ${destinationChain}. Cross-chain transfer not possible.`);
      }
    } catch (err) {
      console.log('Could not check connected contracts, continuing anyway:', err.message);
    }
    
    // Get symbol and decimals for better error messages
    let symbol = "tokens";
    let decimals = 18;
    try {
      symbol = await tokenContract.symbol();
      decimals = await tokenContract.decimals();
      console.log(`Token has ${decimals} decimals and symbol ${symbol}`);
    } catch (e) {
      console.log('Could not get token details:', e.message);
    }
    
    // Get estimated gas from the contract itself
    console.log('Estimating gas...');
    let gasEstimate;
    try {
      gasEstimate = await tokenContract.crossChainTransfer.estimateGas(
        destinationChain,
        recipientAddress,
        amountBigInt
      );
      console.log('Estimated gas from contract:', gasEstimate.toString());
      // Add 50% buffer to gas estimate for ZetaChain safety
      gasEstimate = ethers.toBigInt(Math.floor(Number(gasEstimate) * 1.5));
    } catch (gasError) {
      console.error('Gas estimation failed:', gasError);
      // Fallback to default gas estimate with a high value for safety
      gasEstimate = ethers.toBigInt(1000000);
      console.log('Using fallback gas estimate:', gasEstimate.toString());
    }
    
    console.log('Executing crossChainTransfer with parameters:', {
      destinationChain: destinationChain,
      recipient: recipientAddress,
      amount: amount
    });
    
    // Prepare transaction options with ample gas limit for ZetaChain
    const txOptions = {
      gasLimit: gasEstimate,
    };
    
    // Execute cross-chain transfer
    console.log('Calling contract method crossChainTransfer with options:', txOptions);
    try {
      const tx = await tokenContract.crossChainTransfer(
        destinationChain,
        recipientAddress,
        amountBigInt,
        txOptions
      );
      
      console.log('Transaction submitted:', tx.hash);
      
      // Wait for transaction to be mined with extended timeout
      console.log('Waiting for transaction confirmation...');
      const receipt = await tx.wait(3); // Increased confirmations
      console.log('Transaction confirmed:', receipt);
      
      // Check transaction success
      if (receipt.status === 0) {
        throw new Error('Transaction failed on-chain. The contract execution was reverted.');
      }
      
      // Return transfer details
      return {
        transactionHash: tx.hash,
        sourceChain,
        destinationChains: [destinationChain],
        amount,
        recipientAddress,
        status: 'success'
      };
    } catch (txError) {
      console.error('Transaction execution failed:', txError);
      
      // Try to get a more detailed error message from the revert
      const revertReason = txError.reason || 
                        (txError.data ? `Error data: ${txError.data}` : 'Unknown revert reason');
      
      // Check for possible reasons based on contract code
      let errorMessage = `Transaction reverted: ${revertReason}`;
      
      if (txError.message.includes('cannot transfer to same chain')) {
        errorMessage = 'Cannot transfer to the same chain. Please select a different destination chain.';
      } else if (txError.message.includes('no connected contract')) {
        errorMessage = `No connected contract found for chain ${destinationChain}. Please check the destination chain support.`;
      } else if (txError.message.includes('insufficient funds')) {
        errorMessage = 'Insufficient funds for gas. Please add more ZETA to your wallet.';
      } else if (txError.message.includes('execution reverted')) {
        // Try one more time with higher gas limit as a backup plan
        console.log('Retrying with higher gas limit...');
        try {
          // Use a very high gas limit for the retry
          const retryTx = await tokenContract.crossChainTransfer(
            destinationChain,
            recipientAddress,
            amountBigInt,
            { gasLimit: ethers.toBigInt(3000000) } // Use high fixed value for retry
          );
          
          console.log('Retry transaction submitted:', retryTx.hash);
          const retryReceipt = await retryTx.wait(2);
          console.log('Retry transaction confirmed:', retryReceipt);
          
          if (retryReceipt.status === 0) {
            throw new Error('Retry transaction also failed on-chain.');
          }
          
          return {
            transactionHash: retryTx.hash,
            sourceChain,
            destinationChains: [destinationChain],
            amount,
            recipientAddress,
            status: 'success'
          };
        } catch (retryError) {
          console.error('Retry also failed:', retryError);
          
          // Check for specific errors that could be helpful
          if (retryError.message.includes('No connected contract')) {
            errorMessage = `This token doesn't support cross-chain transfers to chain ${destinationChain}. Please select a different destination chain.`;
          } else if (retryError.message.includes('Invalid recipient')) {
            errorMessage = 'Invalid recipient address. Please check the address format.';
          } else if (retryError.message.includes('cannot transfer to same chain')) {
            errorMessage = 'Cannot transfer to the same chain. Source and destination chains must be different.';
          } else {
            errorMessage = `Transfer failed: ${revertReason}. Retry also failed.`;
          }
          
          throw new Error(errorMessage);
        }
      }
      
      throw new Error(`Transfer failed: ${errorMessage}`);
    }
  } catch (error) {
    console.error('Process transfer failed:', error);
    throw error;
  }
}

/**
 * Executes a regular token transfer (not cross-chain) using the token contract
 * 
 * @param {Object} params - Transfer parameters
 * @param {string} params.chainId - Chain ID
 * @param {string} params.tokenAddress - Token contract address
 * @param {string} params.recipientAddress - Recipient address
 * @param {string} params.amount - Amount to transfer (as a string)
 * @returns {Promise<Object>} Transfer result with transaction hash
 */
export async function executeTokenTransfer({
  chainId,
  tokenAddress,
  recipientAddress,
  amount
}) {
  try {
    console.log('Starting token transfer with params:', {
      chainId,
      tokenAddress,
      recipientAddress,
      amount
    });

    // Get the connected account
    const account = getAccount();
    if (!account.isConnected) {
      throw new Error('Wallet not connected');
    }
    
    // Convert chainId to number for comparison
    const targetChainId = parseInt(chainId, 10);
    
    // Get current chain ID directly if needed
    let currentChainId = account.chainId;
    
    if (!currentChainId && window.ethereum) {
      try {
        const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
        currentChainId = parseInt(chainIdHex, 16);
        console.log('Retrieved chain ID directly from provider:', currentChainId);
      } catch (error) {
        console.error('Error getting chain ID from provider:', error);
      }
    }
    
    // Ensure we're on the correct chain
    console.log('Current chain ID:', currentChainId, 'Target chain ID:', targetChainId);
    
    if (currentChainId !== targetChainId) {
      console.log('Switching to target chain:', targetChainId);
      const switched = await switchToNetwork(targetChainId);
      if (!switched) {
        throw new Error(`Failed to switch to network ${chainId}`);
      }
      
      // Wait for the switch to take effect
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Create ethers provider
    const provider = new ethers.BrowserProvider(window.ethereum);
    
    // Verify we're on the correct chain after switching
    const network = await provider.getNetwork();
    const providerChainId = Number(network.chainId);
    console.log('Provider chain ID after switch:', providerChainId);
    
    if (providerChainId !== targetChainId) {
      throw new Error(`Network switch failed. Expected chain ${targetChainId}, but got ${providerChainId}`);
    }
    
    // Get signer for transactions
    const signer = await provider.getSigner();
    console.log('Got signer:', signer.address);
    
    // Get the appropriate ABI
    const abi = getAbiForChain(chainId);
    
    // Create contract instance
    const tokenContract = new ethers.Contract(tokenAddress, abi, signer);
    console.log('Contract instance created');
    
    // Execute transfer
    console.log('Executing transfer...');
    const tx = await tokenContract.transfer(recipientAddress, amount);
    
    console.log('Transaction submitted:', tx.hash);
    
    // Wait for transaction to be mined
    const receipt = await tx.wait();
    console.log('Transaction confirmed:', receipt);
    
    // Return transfer details
    return {
      transactionHash: tx.hash,
      chainId,
      amount,
      recipientAddress,
      status: 'success'
    };
  } catch (error) {
    console.error('Token transfer failed:', error);
    throw new Error(`Transfer failed: ${error.message}`);
  }
}

/**
 * Checks if the current wallet is the owner/deployer of the token
 * 
 * @param {Object} params - Parameters
 * @param {string} params.chainId - Chain ID
 * @param {string} params.tokenAddress - Token contract address
 * @returns {Promise<boolean>} Whether the current wallet is the owner
 */
export async function isTokenOwner({ chainId, tokenAddress }) {
  try {
    // Get the connected account
    const account = getAccount();
    if (!account.isConnected) {
      return false;
    }
    
    // Create ethers provider
    const provider = new ethers.BrowserProvider(window.ethereum);
    
    // Get the appropriate ABI
    const abi = getAbiForChain(chainId);
    
    // Create contract instance
    const tokenContract = new ethers.Contract(tokenAddress, abi, provider);
    
    // Get the owner address
    const ownerAddress = await tokenContract.owner();
    
    // Check if current wallet is the owner
    return ownerAddress.toLowerCase() === account.address.toLowerCase();
  } catch (error) {
    console.error('Failed to check token owner:', error);
    return false;
  }
}

/**
 * Mints new tokens to the specified address (only callable by owner)
 * 
 * @param {Object} params - Parameters
 * @param {string} params.chainId - Chain ID
 * @param {string} params.tokenAddress - Token contract address
 * @param {string} params.recipientAddress - Recipient address for the minted tokens
 * @param {string} params.amount - Amount to mint (as a string)
 * @returns {Promise<Object>} Mint result with transaction hash
 */
export async function mintTokens({
  chainId,
  tokenAddress,
  recipientAddress,
  amount
}) {
  try {
    console.log('Starting token minting with params:', {
      chainId,
      tokenAddress,
      recipientAddress,
      amount
    });

    // Get the connected account
    const account = getAccount();
    if (!account.isConnected) {
      throw new Error('Wallet not connected');
    }
    
    // Convert chainId to number for comparison
    const targetChainId = parseInt(chainId, 10);
    
    // Get current chain ID directly if needed
    let currentChainId = account.chainId;
    
    if (!currentChainId && window.ethereum) {
      try {
        const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
        currentChainId = parseInt(chainIdHex, 16);
        console.log('Retrieved chain ID directly from provider:', currentChainId);
      } catch (error) {
        console.error('Error getting chain ID from provider:', error);
      }
    }
    
    // Ensure we're on the correct chain
    console.log('Current chain ID:', currentChainId, 'Target chain ID:', targetChainId);
    
    if (currentChainId !== targetChainId) {
      console.log('Switching to target chain:', targetChainId);
      const switched = await switchToNetwork(targetChainId);
      if (!switched) {
        throw new Error(`Failed to switch to network ${chainId}`);
      }
      
      // Wait for the switch to take effect
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Create ethers provider
    const provider = new ethers.BrowserProvider(window.ethereum);
    
    // Verify we're on the correct chain after switching
    const network = await provider.getNetwork();
    const providerChainId = Number(network.chainId);
    console.log('Provider chain ID after switch:', providerChainId);
    
    if (providerChainId !== targetChainId) {
      throw new Error(`Network switch failed. Expected chain ${targetChainId}, but got ${providerChainId}`);
    }
    
    // Get signer for transactions
    const signer = await provider.getSigner();
    console.log('Got signer:', signer.address);
    
    // Enhanced fallback ABI with explicit mint method
    const ENHANCED_UNIVERSAL_TOKEN_ABI = [
      // Core ERC20 functions
      "function balanceOf(address owner) view returns (uint256)",
      "function decimals() view returns (uint8)",
      "function symbol() view returns (string)",
      "function name() view returns (string)",
      "function transfer(address to, uint256 amount) returns (bool)",
      "function totalSupply() view returns (uint256)",
      
      // Owner functions
      "function mint(address to, uint256 amount) external",
      "function owner() view returns (address)",
      "function burn(address from, uint256 amount) external"
    ];
    
    // Get the appropriate ABI
    const abi = getAbiForChain(chainId);
    
    // Create contract instance with fallback to enhanced ABI if needed
    let tokenContract;
    try {
      tokenContract = new ethers.Contract(tokenAddress, abi, signer);
      console.log('Contract instance created using standard ABI');
      
      // Test if contract methods are accessible
      await tokenContract.owner();
    } catch (abiError) {
      console.error('Error with standard ABI, using enhanced fallback:', abiError);
      tokenContract = new ethers.Contract(tokenAddress, ENHANCED_UNIVERSAL_TOKEN_ABI, signer);
      console.log('Contract instance created using enhanced fallback ABI');
    }
    
    // Check if user is the owner
    const ownerAddress = await tokenContract.owner();
    if (ownerAddress.toLowerCase() !== account.address.toLowerCase()) {
      throw new Error('Only the token owner can mint new tokens');
    }
    
    // Execute mint with proper gas estimation and fallback
    console.log('Executing mint...');
    
    // Prepare the amount as BigInt
    const amountBigInt = ethers.toBigInt(amount);
    
    // Try to estimate gas first
    let gasEstimate;
    try {
      console.log('Estimating gas for mint operation...');
      gasEstimate = await tokenContract.mint.estimateGas(recipientAddress, amountBigInt);
      console.log('Estimated gas from contract:', gasEstimate.toString());
      // Add 50% buffer to gas estimate for safety
      gasEstimate = ethers.toBigInt(Math.floor(Number(gasEstimate) * 1.5));
    } catch (gasError) {
      console.error('Gas estimation failed:', gasError);
      // Fallback to default gas estimate
      gasEstimate = ethers.toBigInt(500000);
      console.log('Using fallback gas estimate:', gasEstimate.toString());
    }
    
    // Prepare transaction options with gas limit
    const txOptions = {
      gasLimit: gasEstimate,
    };
    
    // Execute mint with gas options
    try {
      const tx = await tokenContract.mint(recipientAddress, amountBigInt, txOptions);
      console.log('Mint transaction submitted:', tx.hash);
      
      // Wait for transaction to be mined
      const receipt = await tx.wait();
      console.log('Mint transaction confirmed:', receipt);
      
      // Return mint details
      return {
        transactionHash: tx.hash,
        chainId,
        amount,
        recipientAddress,
        status: 'success'
      };
    } catch (txError) {
      console.error('Mint transaction execution failed:', txError);
      
      // Try to get a more detailed error message
      const revertReason = txError.reason || 
                       (txError.data ? `Error data: ${txError.data}` : 'Unknown revert reason');
      
      // Try one more time with higher gas limit as a backup plan
      if (txError.message.includes('execution reverted')) {
        console.log('Retrying mint with higher gas limit...');
        try {
          // Use a very high gas limit for the retry
          const retryTx = await tokenContract.mint(
            recipientAddress,
            amountBigInt,
            { gasLimit: ethers.toBigInt(1000000) } // Use high fixed value for retry
          );
          
          console.log('Retry mint transaction submitted:', retryTx.hash);
          const retryReceipt = await retryTx.wait(2);
          console.log('Retry mint transaction confirmed:', retryReceipt);
          
          return {
            transactionHash: retryTx.hash,
            chainId,
            amount,
            recipientAddress,
            status: 'success'
          };
        } catch (retryError) {
          console.error('Retry mint also failed:', retryError);
          throw new Error(`Minting failed: ${revertReason}. Retry also failed.`);
        }
      }
      
      throw new Error(`Minting failed: ${revertReason}`);
    }
  } catch (error) {
    console.error('Token minting failed:', error);
    throw new Error(`Minting failed: ${error.message}`);
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
    console.log('Getting token details for:', tokenAddress, 'on chain:', chainId);
    
    // Create ethers provider - use window.ethereum directly for read operations
    const provider = new ethers.BrowserProvider(window.ethereum);
    console.log('Created BrowserProvider for token details');
    
    // Get the provider's chain ID to verify if we need to switch networks
    const network = await provider.getNetwork();
    const providerChainId = Number(network.chainId);
    console.log('Provider chain ID:', providerChainId, 'Target chain ID:', parseInt(chainId, 10));
    
    // Get the appropriate ABI
    const abi = getAbiForChain(chainId);
    
    // Create contract instance (read-only)
    const tokenContract = new ethers.Contract(tokenAddress, abi, provider);
    console.log('Created contract instance');
    
    // Get token details
    console.log('Fetching token details...');
    const [name, symbol, decimals] = await Promise.all([
      tokenContract.name(),
      tokenContract.symbol(),
      tokenContract.decimals()
    ]);
    
    console.log('Token details retrieved:', { name, symbol, decimals: Number(decimals) });
    
    return {
      name,
      symbol,
      decimals: Number(decimals)
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
    console.log('Getting token balance for:', walletAddress, 'on token:', tokenAddress, 'chain:', chainId);
    
    // Create ethers provider
    const provider = new ethers.BrowserProvider(window.ethereum);
    
    // Get the appropriate ABI
    const abi = getAbiForChain(chainId);
    
    // Create contract instance (read-only)
    const tokenContract = new ethers.Contract(tokenAddress, abi, provider);
    
    // Get balance
    console.log('Calling balanceOf...');
    const balance = await tokenContract.balanceOf(walletAddress);
    console.log('Raw balance result:', balance.toString());
    
    return balance.toString();
  } catch (error) {
    console.error('Failed to get token balance:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      reason: error.reason
    });
    return '0';
  }
} 