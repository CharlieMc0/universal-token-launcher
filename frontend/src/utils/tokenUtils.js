import { ethers } from 'ethers';
import { CHAIN_IDS } from './contracts';

/**
 * Get a user-friendly name for a chain
 * 
 * @param {number|string} chainId - The chain ID
 * @returns {string} - Human-readable chain name
 */
export function getChainName(chainId) {
  const chainIdNum = parseInt(chainId, 10);
  
  const chainNames = {
    [CHAIN_IDS.ZETACHAIN]: 'ZetaChain',
    [CHAIN_IDS.ETHEREUM_SEPOLIA]: 'Ethereum Sepolia',
    [CHAIN_IDS.BSC_TESTNET]: 'BSC Testnet',
    [CHAIN_IDS.BASE_SEPOLIA]: 'Base Sepolia'
  };
  
  return chainNames[chainIdNum] || `Chain ${chainIdNum}`;
}

/**
 * Format token balance with appropriate decimal precision
 * 
 * @param {string} balance - Token balance as a string
 * @param {number} decimals - Token decimals
 * @returns {string} - Formatted balance
 */
export function formatTokenBalance(balance, decimals = 18) {
  if (!balance) return '0';
  
  try {
    // Convert balance to BigInt
    const bigBalance = ethers.toBigInt(balance);
    
    // Format with ethers utils
    const formatted = ethers.formatUnits(bigBalance, decimals);
    
    // Determine display precision based on value
    const value = parseFloat(formatted);
    
    if (value === 0) return '0';
    if (value < 0.0001) return '<0.0001';
    if (value < 1) return value.toFixed(4);
    if (value < 1000) return value.toFixed(2);
    
    return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  } catch (error) {
    console.error('Error formatting token balance:', error);
    return '0';
  }
}

/**
 * Get block explorer URL for a specific chain and address
 * 
 * @param {number|string} chainId - Chain ID
 * @param {string} address - Contract or wallet address
 * @returns {string} - Block explorer URL
 */
export function getExplorerUrl(chainId, address) {
  const chainIdNum = parseInt(chainId, 10);
  
  const explorers = {
    [CHAIN_IDS.ZETACHAIN]: 'https://explorer.zetachain.com/address/',
    [CHAIN_IDS.ETHEREUM_SEPOLIA]: 'https://sepolia.etherscan.io/address/',
    [CHAIN_IDS.BSC_TESTNET]: 'https://testnet.bscscan.com/address/',
    [CHAIN_IDS.BASE_SEPOLIA]: 'https://sepolia.basescan.org/address/'
  };
  
  const baseUrl = explorers[chainIdNum];
  return baseUrl ? `${baseUrl}${address}` : null;
}

/**
 * Group token chains information for better UI display
 * 
 * @param {Object} token - Token data from API
 * @returns {Array} - Token chains with contract info and balances
 */
export function getTokenChainInfo(token) {
  if (!token || !token.deployedContracts) return [];
  
  return Object.entries(token.deployedContracts).map(([chainId, contractAddress]) => {
    const balance = token.balances?.[chainId] || '0';
    
    return {
      chainId,
      chainName: getChainName(chainId),
      contractAddress,
      balance,
      formattedBalance: formatTokenBalance(balance, token.decimals || 18),
      explorerUrl: getExplorerUrl(chainId, contractAddress)
    };
  });
}

/**
 * Organize tokens for display in the transfer interface
 * 
 * @param {Array} tokens - Array of token objects
 * @returns {Array} - Organized tokens with chain information
 */
export function organizeTokensForTransfer(tokens) {
  if (!tokens || !Array.isArray(tokens)) return [];
  
  return tokens.map(token => {
    const chainInfo = getTokenChainInfo(token);
    
    return {
      ...token,
      chainInfo,
      // Sort chains with non-zero balances first
      sortedChains: chainInfo.sort((a, b) => {
        const aHasBalance = a.balance && a.balance !== '0';
        const bHasBalance = b.balance && b.balance !== '0';
        
        if (aHasBalance && !bHasBalance) return -1;
        if (!aHasBalance && bHasBalance) return 1;
        
        // If both have balance or both have no balance, sort by chain ID
        // ZetaChain first, then other chains
        if (parseInt(a.chainId, 10) === CHAIN_IDS.ZETACHAIN) return -1;
        if (parseInt(b.chainId, 10) === CHAIN_IDS.ZETACHAIN) return 1;
        
        return parseInt(a.chainId, 10) - parseInt(b.chainId, 10);
      })
    };
  });
} 