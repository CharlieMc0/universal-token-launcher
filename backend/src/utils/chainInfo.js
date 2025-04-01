const { SUPPORTED_CHAINS, getChainInfo } = require('../constants/chains');
const { ZETACHAIN_ID, ZETACHAIN_TESTNET_ID } = require('../constants/bytecode');

/**
 * Enhanced chain information utilities for token operations
 */
class ChainInfoService {
  /**
   * Get chain information by chain ID
   * @param {string} chainId - The chain ID
   * @returns {Object|null} - Chain information object or null if not found
   */
  getChainInfo(chainId) {
    if (!chainId) return null;
    
    // Convert to string to ensure consistent lookup
    const chainIdStr = chainId.toString();
    return getChainInfo(chainIdStr);
  }

  /**
   * Check if a chain ID is a ZetaChain network
   * @param {string} chainId - The chain ID to check
   * @returns {boolean} - Whether the chain is a ZetaChain network
   */
  isZetaChain(chainId) {
    const chain = this.getChainInfo(chainId);
    return chain ? chain.isZetaChain : false;
  }

  /**
   * Get the primary ZetaChain ID based on environment
   * @returns {string} - The ZetaChain ID for the current environment
   */
  getPrimaryZetaChainId() {
    return process.env.NODE_ENV === 'production' 
      ? ZETACHAIN_ID.toString() 
      : ZETACHAIN_TESTNET_ID.toString();
  }

  /**
   * Get all possible ZetaChain IDs
   * @returns {string[]} - Array of all ZetaChain IDs
   */
  getAllZetaChainIds() {
    return [ZETACHAIN_ID.toString(), ZETACHAIN_TESTNET_ID.toString()];
  }

  /**
   * Find a ZetaChain ID in an array of chain IDs
   * @param {string[]} chainIds - Array of chain IDs to search
   * @returns {string|null} - The found ZetaChain ID or null if not found
   */
  findZetaChainId(chainIds) {
    if (!chainIds || !Array.isArray(chainIds)) return null;
    
    // First check for primary ZetaChain ID
    const primaryId = this.getPrimaryZetaChainId();
    if (chainIds.includes(primaryId)) {
      return primaryId;
    }
    
    // Then check for any ZetaChain ID
    for (const chainId of chainIds) {
      if (this.isZetaChain(chainId)) {
        return chainId;
      }
    }
    
    return null;
  }

  /**
   * Get all supported networks
   * @param {boolean} testnetOnly - Whether to only return testnet networks
   * @returns {Object[]} - Array of chain information objects
   */
  getSupportedNetworks(testnetOnly = false) {
    const networks = Object.values(SUPPORTED_CHAINS);
    
    if (testnetOnly) {
      // Simple heuristic: mainnet chain IDs are usually shorter than testnet IDs
      // This can be improved with a more explicit flag in the chain config
      return networks.filter(network => {
        // Known testnet networks
        const testnetIds = ['11155111', '80001', '84531', '7001'];
        return testnetIds.includes(network.chainId);
      });
    }
    
    return networks;
  }

  /**
   * Get chain explorer URL for a transaction
   * @param {string} chainId - The chain ID
   * @param {string} txHash - The transaction hash
   * @returns {string|null} - Explorer URL for the transaction or null if chain not supported
   */
  getExplorerTxUrl(chainId, txHash) {
    const chain = this.getChainInfo(chainId);
    if (!chain || !chain.explorerUrl) return null;
    
    return `${chain.explorerUrl}/tx/${txHash}`;
  }

  /**
   * Get chain explorer URL for an address
   * @param {string} chainId - The chain ID
   * @param {string} address - The address to view
   * @returns {string|null} - Explorer URL for the address or null if chain not supported
   */
  getExplorerAddressUrl(chainId, address) {
    const chain = this.getChainInfo(chainId);
    if (!chain || !chain.explorerUrl) return null;
    
    return `${chain.explorerUrl}/address/${address}`;
  }

  /**
   * Format chain information for display
   * @param {string} chainId - The chain ID
   * @returns {Object} - Formatted chain information with display properties
   */
  getFormattedChainInfo(chainId) {
    const chain = this.getChainInfo(chainId);
    if (!chain) {
      return { 
        chainId, 
        name: `Unknown Chain (${chainId})`,
        isSupported: false
      };
    }
    
    // Get a network color for display purposes
    const networkColors = {
      '7000': '#00B386', // ZetaChain
      '7001': '#00B386', // ZetaChain Testnet
      '1': '#627EEA',    // Ethereum
      '11155111': '#627EEA', // Sepolia
      '137': '#8247E5',  // Polygon
      '80001': '#8247E5', // Mumbai
      '8453': '#0052FF', // Base
      '84531': '#0052FF' // Base Goerli
    };
    
    // Define blockscout explorers for supported chains
    const blockscoutExplorers = {
      // ZetaChain networks
      '7000': 'https://explorer.zetachain.com',
      '7001': 'https://athens.explorer.zetachain.com',
      // Base networks
      '8453': 'https://base.blockscout.com',
      '84531': 'https://base-sepolia.blockscout.com',
      // You can add other blockscout explorers here as they become available
    };
    
    return {
      ...chain,
      color: networkColors[chainId] || '#888888',
      shortName: chain.name.split(' ')[0], // First word of name (e.g., "Ethereum" from "Ethereum Mainnet")
      isTestnet: chain.name.toLowerCase().includes('testnet') || 
                 chain.name.toLowerCase().includes('goerli') ||
                 chain.name.toLowerCase().includes('sepolia') ||
                 chain.name.toLowerCase().includes('mumbai'),
      isSupported: true,
      // Add blockscout URL if available
      blockscoutUrl: blockscoutExplorers[chainId] || null
    };
  }

  /**
   * Get formatted chain information for all chains in an array
   * @param {string[]} chainIds - Array of chain IDs
   * @returns {Object[]} - Array of formatted chain information objects
   */
  getFormattedChainInfoList(chainIds) {
    if (!chainIds || !Array.isArray(chainIds)) return [];
    
    return chainIds.map(chainId => this.getFormattedChainInfo(chainId));
  }
}

module.exports = new ChainInfoService(); 