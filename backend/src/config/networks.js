require('dotenv').config();

// Define network categories
const NETWORK_CATEGORIES = {
  TESTNETS: 'testnets',
  MAINNETS: 'mainnets'
};

// Parse chain RPC URLs from environment variable
let CHAIN_RPC_URLS = {};
try {
  CHAIN_RPC_URLS = JSON.parse(process.env.CHAIN_RPC_URLS || '{}');
} catch (error) {
  console.warn('Failed to parse CHAIN_RPC_URLS from environment:', error.message);
}

// Network configurations grouped by category
const NETWORKS = {
  // Testnets
  [NETWORK_CATEGORIES.TESTNETS]: {
    // ZetaChain Athens Testnet
    '7001': {
      name: 'ZetaChain Athens Testnet',
      chainId: '7001',
      currency: {
        name: 'ZETA',
        symbol: 'ZETA',
        decimals: 18
      },
      rpcUrl: process.env.ZETA_CHAIN_RPC_URL || 'https://zetachain-athens.g.allthatnode.com/archive/evm',
      explorerUrl: 'https://athens.explorer.zetachain.com',
      isTestnet: true
    },
    // Ethereum Goerli Testnet
    '5': {
      name: 'Ethereum Goerli Testnet',
      chainId: '5',
      currency: {
        name: 'Goerli Ether',
        symbol: 'ETH',
        decimals: 18
      },
      rpcUrl: CHAIN_RPC_URLS['5'] || 'https://goerli.infura.io/v3/your-api-key',
      explorerUrl: 'https://goerli.etherscan.io',
      isTestnet: true
    },
    // Polygon Mumbai Testnet
    '80001': {
      name: 'Polygon Mumbai Testnet',
      chainId: '80001',
      currency: {
        name: 'Mumbai Matic',
        symbol: 'MATIC',
        decimals: 18
      },
      rpcUrl: CHAIN_RPC_URLS['80001'] || 'https://polygon-mumbai.infura.io/v3/your-api-key',
      explorerUrl: 'https://mumbai.polygonscan.com',
      isTestnet: true
    },
    // BSC Testnet
    '97': {
      name: 'BSC Testnet',
      chainId: '97',
      currency: {
        name: 'Testnet BNB',
        symbol: 'tBNB',
        decimals: 18
      },
      rpcUrl: CHAIN_RPC_URLS['97'] || 'https://data-seed-prebsc-1-s1.binance.org:8545',
      explorerUrl: 'https://testnet.bscscan.com',
      isTestnet: true
    }
  },
  
  // Mainnets
  [NETWORK_CATEGORIES.MAINNETS]: {
    // ZetaChain Mainnet
    '7000': {
      name: 'ZetaChain Mainnet',
      chainId: '7000',
      currency: {
        name: 'ZETA',
        symbol: 'ZETA',
        decimals: 18
      },
      rpcUrl: CHAIN_RPC_URLS['7000'] || 'https://zetachain-evm.blockpi.network/v1/rpc/public',
      explorerUrl: 'https://explorer.zetachain.com',
      isTestnet: false
    },
    // Ethereum Mainnet
    '1': {
      name: 'Ethereum Mainnet',
      chainId: '1',
      currency: {
        name: 'Ether',
        symbol: 'ETH',
        decimals: 18
      },
      rpcUrl: CHAIN_RPC_URLS['1'] || 'https://eth-mainnet.g.alchemy.com/v2/your-api-key',
      explorerUrl: 'https://etherscan.io',
      isTestnet: false
    },
    // Polygon Mainnet
    '137': {
      name: 'Polygon Mainnet',
      chainId: '137',
      currency: {
        name: 'Matic',
        symbol: 'MATIC',
        decimals: 18
      },
      rpcUrl: CHAIN_RPC_URLS['137'] || 'https://polygon-rpc.com',
      explorerUrl: 'https://polygonscan.com',
      isTestnet: false
    },
    // BSC Mainnet
    '56': {
      name: 'BSC Mainnet',
      chainId: '56',
      currency: {
        name: 'BNB',
        symbol: 'BNB',
        decimals: 18
      },
      rpcUrl: CHAIN_RPC_URLS['56'] || 'https://bsc-dataseed.binance.org',
      explorerUrl: 'https://bscscan.com',
      isTestnet: false
    }
  }
};

// Get all networks as a flat object
const getAllNetworks = () => {
  return {
    ...NETWORKS[NETWORK_CATEGORIES.TESTNETS],
    ...NETWORKS[NETWORK_CATEGORIES.MAINNETS]
  };
};

// Get networks by category
const getNetworksByCategory = (category) => {
  return NETWORKS[category] || {};
};

// Get a specific network by chain ID
const getNetworkByChainId = (chainId) => {
  const allNetworks = getAllNetworks();
  return allNetworks[chainId] || null;
};

module.exports = {
  NETWORK_CATEGORIES,
  NETWORKS,
  getAllNetworks,
  getNetworksByCategory,
  getNetworkByChainId
}; 