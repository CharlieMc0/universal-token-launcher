const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

// Chain configuration
const chains = {
  // ZetaChain networks
  '7000': {
    name: 'ZetaChain',
    chainId: '7000',
    rpcUrl: process.env.ZETA_RPC_URL || 'https://zetachain-evm.blockpi.network/v1/rpc/public',
    explorerUrl: 'https://explorer.zetachain.com',
    blockscoutUrl: 'https://explorer.zetachain.com',
    isZetaChain: true,
    color: '#00B386',
    shortName: 'ZetaChain',
    isTestnet: false,
    isSupported: true,
    verifier: 'blockscout'
  },
  '7001': {
    name: 'ZetaChain Testnet',
    chainId: '7001',
    rpcUrl: process.env.ZETA_TESTNET_RPC_URL || 'https://zetachain-athens-evm.blockpi.network/v1/rpc/public',
    explorerUrl: 'https://athens.explorer.zetachain.com',
    blockscoutUrl: 'https://athens.explorer.zetachain.com',
    isZetaChain: true,
    color: '#00B386',
    shortName: 'ZetaChain',
    isTestnet: true,
    isSupported: true,
    verifier: 'blockscout'
  },
  
  // Mainnet networks
  '1': {
    name: 'Ethereum',
    chainId: '1',
    rpcUrl: process.env.ETH_RPC_URL || 'https://ethereum.publicnode.com',
    explorerUrl: 'https://etherscan.io',
    apiUrl: 'https://api.etherscan.io/api',
    isZetaChain: false,
    color: '#627EEA',
    shortName: 'Ethereum',
    isTestnet: false,
    isSupported: true,
    verifier: 'etherscan'
  },
  '137': {
    name: 'Polygon',
    chainId: '137',
    rpcUrl: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com',
    explorerUrl: 'https://polygonscan.com',
    apiUrl: 'https://api.polygonscan.com/api',
    isZetaChain: false,
    color: '#8247E5',
    shortName: 'Polygon',
    isTestnet: false,
    isSupported: true,
    verifier: 'polygonscan'
  },
  '8453': {
    name: 'Base',
    chainId: '8453',
    rpcUrl: process.env.BASE_RPC_URL || 'https://mainnet.base.org',
    explorerUrl: 'https://basescan.org',
    apiUrl: 'https://api.basescan.org/api',
    isZetaChain: false,
    color: '#0052FF',
    shortName: 'Base',
    isTestnet: false,
    isSupported: true,
    verifier: 'basescan'
  },
  
  // Testnet networks
  '11155111': {
    name: 'Sepolia',
    chainId: '11155111',
    rpcUrl: process.env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia.publicnode.com',
    explorerUrl: 'https://sepolia.etherscan.io',
    apiUrl: 'https://api-sepolia.etherscan.io/api',
    isZetaChain: false,
    color: '#627EEA',
    shortName: 'Sepolia',
    isTestnet: true,
    isSupported: true,
    verifier: 'etherscan'
  },
  '80001': {
    name: 'Mumbai',
    chainId: '80001',
    rpcUrl: process.env.MUMBAI_RPC_URL || 'https://rpc-mumbai.maticvigil.com',
    explorerUrl: 'https://mumbai.polygonscan.com',
    apiUrl: 'https://api-testnet.polygonscan.com/api',
    isZetaChain: false,
    color: '#8247E5',
    shortName: 'Mumbai',
    isTestnet: true,
    isSupported: true,
    verifier: 'polygonscan'
  }
};

// API Keys for verification
const apiKeys = {
  etherscan: process.env.ETHERSCAN_API_KEY,
  polygonscan: process.env.POLYGONSCAN_API_KEY,
  basescan: process.env.BASESCAN_API_KEY,
  blockscout: process.env.BLOCKSCOUT_API_KEY
};

// Server configuration
const server = {
  port: process.env.PORT || 3002,
  env: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000'
};

// Contract deployment configuration
const deployer = {
  privateKey: process.env.DEPLOYER_PRIVATE_KEY,
  // Wait for n confirmations on transaction receipt
  confirmations: 2
};

module.exports = {
  chains,
  apiKeys,
  server,
  deployer
}; 