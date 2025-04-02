import { ethers } from 'ethers';
import { CHAIN_IDS, getAbiForChain } from './contracts';

// RPC endpoints for different chains
const RPC_ENDPOINTS = {
  [CHAIN_IDS.ZETACHAIN]: 'https://zetachain-evm.blockpi.network/v1/rpc/public',
  [CHAIN_IDS.ETHEREUM_SEPOLIA]: 'https://ethereum-sepolia.publicnode.com',
  [CHAIN_IDS.BSC_TESTNET]: 'https://bsc-testnet.publicnode.com',
  [CHAIN_IDS.BASE_SEPOLIA]: 'https://sepolia.base.org'
};

/**
 * Get token balance for a specific address on a specific chain
 * 
 * @param {string} contractAddress - Token contract address
 * @param {string} walletAddress - Wallet address to check balance for
 * @param {number} chainId - Chain ID
 * @returns {Promise<string>} - Token balance as a string
 */
export async function getTokenBalance(contractAddress, walletAddress, chainId) {
  if (!contractAddress || !walletAddress || !chainId) {
    return '0';
  }

  try {
    const rpcUrl = RPC_ENDPOINTS[chainId];
    if (!rpcUrl) {
      console.error(`No RPC endpoint configured for chain ID: ${chainId}`);
      return '0';
    }

    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const abi = getAbiForChain(chainId);
    const contract = new ethers.Contract(contractAddress, abi, provider);
    
    const balance = await contract.balanceOf(walletAddress);
    const decimals = await contract.decimals();
    
    // Format balance with proper decimals
    return ethers.utils.formatUnits(balance, decimals);
  } catch (error) {
    console.error(`Error fetching balance for chain ${chainId}:`, error);
    return '0';
  }
}

/**
 * Get token balances across all chains
 * 
 * @param {Object} contractAddresses - Map of chainId to contract address
 * @param {string} walletAddress - Wallet address to check balances for
 * @returns {Promise<Object>} - Map of chainId to token balance
 */
export async function getTokenBalancesAcrossChains(contractAddresses, walletAddress) {
  if (!contractAddresses || !walletAddress) {
    return {};
  }

  const balances = {};
  const balancePromises = Object.entries(contractAddresses).map(async ([chainId, contractAddress]) => {
    try {
      const balance = await getTokenBalance(contractAddress, walletAddress, parseInt(chainId, 10));
      balances[chainId] = balance;
    } catch (error) {
      console.error(`Error fetching balance for chain ${chainId}:`, error);
      balances[chainId] = '0';
    }
  });

  await Promise.all(balancePromises);
  return balances;
}

/**
 * Get token metadata (name, symbol, decimals) for a contract
 * 
 * @param {string} contractAddress - Token contract address
 * @param {number} chainId - Chain ID
 * @returns {Promise<Object>} - Token metadata
 */
export async function getTokenMetadata(contractAddress, chainId) {
  if (!contractAddress || !chainId) {
    return null;
  }

  try {
    const rpcUrl = RPC_ENDPOINTS[chainId];
    if (!rpcUrl) {
      console.error(`No RPC endpoint configured for chain ID: ${chainId}`);
      return null;
    }

    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const abi = getAbiForChain(chainId);
    const contract = new ethers.Contract(contractAddress, abi, provider);
    
    const [name, symbol, decimals] = await Promise.all([
      contract.name(),
      contract.symbol(),
      contract.decimals()
    ]);
    
    return { name, symbol, decimals: decimals.toString() };
  } catch (error) {
    console.error(`Error fetching metadata for chain ${chainId}:`, error);
    return null;
  }
} 