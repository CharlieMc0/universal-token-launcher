// Chain configuration for supported networks
// Contains the network details needed for contract deployment and interactions

const SUPPORTED_CHAINS = {
  // ZetaChain networks
  '7000': {
    name: 'ZetaChain',
    chainId: '7000',
    rpcUrl: process.env.ZETA_CHAIN_RPC_URL || 'https://zetachain-evm.blockpi.network/v1/rpc/public',
    explorerUrl: 'https://explorer.zetachain.com',
    isZetaChain: true
  },
  '7001': {
    name: 'ZetaChain Testnet',
    chainId: '7001',
    rpcUrl: process.env.ZETA_TESTNET_RPC_URL || 'https://zetachain-athens-evm.blockpi.network/v1/rpc/public',
    explorerUrl: 'https://athens.explorer.zetachain.com',
    isZetaChain: true
  },
  
  // Ethereum networks
  '1': {
    name: 'Ethereum',
    chainId: '1',
    rpcUrl: process.env.ETH_RPC_URL || 'https://ethereum.publicnode.com',
    explorerUrl: 'https://etherscan.io',
    isZetaChain: false
  },
  '11155111': {
    name: 'Sepolia',
    chainId: '11155111',
    rpcUrl: process.env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia.publicnode.com',
    explorerUrl: 'https://sepolia.etherscan.io',
    isZetaChain: false
  },
  
  // Polygon networks
  '137': {
    name: 'Polygon',
    chainId: '137',
    rpcUrl: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com',
    explorerUrl: 'https://polygonscan.com',
    isZetaChain: false
  },
  '80001': {
    name: 'Polygon Mumbai',
    chainId: '80001',
    rpcUrl: process.env.MUMBAI_RPC_URL || 'https://rpc-mumbai.maticvigil.com',
    explorerUrl: 'https://mumbai.polygonscan.com',
    isZetaChain: false
  },
  
  // Base networks
  '8453': {
    name: 'Base',
    chainId: '8453',
    rpcUrl: process.env.BASE_RPC_URL || 'https://mainnet.base.org',
    explorerUrl: 'https://basescan.org',
    isZetaChain: false
  },
  '84531': {
    name: 'Base Goerli',
    chainId: '84531',
    rpcUrl: process.env.BASE_GOERLI_RPC_URL || 'https://goerli.base.org',
    explorerUrl: 'https://goerli.basescan.org',
    isZetaChain: false
  }
};

module.exports = {
  SUPPORTED_CHAINS,
  
  // Get chain info by ID
  getChainInfo: (chainId) => {
    return SUPPORTED_CHAINS[chainId];
  },
  
  // Get all supported chain IDs
  getSupportedChainIds: () => {
    return Object.keys(SUPPORTED_CHAINS);
  },
  
  // Get all ZetaChain networks
  getZetaChainNetworks: () => {
    return Object.values(SUPPORTED_CHAINS).filter(chain => chain.isZetaChain);
  },
  
  // Get all EVM networks (non-ZetaChain)
  getEVMNetworks: () => {
    return Object.values(SUPPORTED_CHAINS).filter(chain => !chain.isZetaChain);
  }
}; 