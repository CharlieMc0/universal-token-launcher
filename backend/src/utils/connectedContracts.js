const ethers = require('ethers');
const { SUPPORTED_CHAINS } = require('../constants/chains');
const logger = require('./logger');

// ABI for ZetaChainUniversalToken - we only need the connectedContracts function
const ZETA_CONTRACT_ABI = [
  "function connectedContracts(uint256 chainId) view returns (address)"
];

/**
 * Get all connected contract addresses for a Universal Token from the ZetaChain contract
 * @param {string} zetaContractAddress - The ZetaChain contract address
 * @returns {Promise<Object>} - Map of chainId to contract address
 */
async function getConnectedContracts(zetaContractAddress) {
  if (!zetaContractAddress) {
    logger.warn(`No ZetaChain contract address provided`);
    return {};
  }

  // Use ZetaChain RPC URL from environment or fallback to default
  const zetaRpc = process.env.ZETACHAIN_RPC_URL || 'https://zetachain-evm.blockpi.network/v1/rpc/public';
  
  try {
    // Create provider and contract instance - using ethers v6 API
    const provider = new ethers.JsonRpcProvider(zetaRpc);
    const contract = new ethers.Contract(zetaContractAddress, ZETA_CONTRACT_ABI, provider);
    
    // Map to store all connected contracts
    const connectedContracts = {
      // Add ZetaChain contract 
      [process.env.ZETACHAIN_ID || '7001']: zetaContractAddress
    };
    
    // Query connected contracts for each supported chain
    const queryPromises = Object.keys(SUPPORTED_CHAINS)
      .filter(chainId => !connectedContracts[chainId]) // Skip ZetaChain ID which we already added
      .map(async (chainId) => {
        try {
          // Convert chainId to number for the contract function call
          const chainIdNum = parseInt(chainId, 10);
          const contractAddress = await contract.connectedContracts(chainIdNum);
          
          // Only add non-zero addresses - using ethers v6 ZeroAddress constant
          if (contractAddress && contractAddress !== ethers.ZeroAddress) {
            connectedContracts[chainId] = contractAddress;
            logger.info(`Found connected contract for chain ${chainId}: ${contractAddress}`);
          }
        } catch (error) {
          logger.error(`Error querying connected contract for chain ${chainId}: ${error.message}`);
        }
      });
    
    await Promise.all(queryPromises);
    return connectedContracts;
  } catch (error) {
    logger.error(`Error getting connected contracts: ${error.message}`, {
      zetaContractAddress,
      stack: error.stack
    });
    return {};
  }
}

/**
 * Get RPC URL for a specific chain
 * @param {string} chainId - The chain ID
 * @returns {string|null} - RPC URL or null if not found
 */
function getRpcUrl(chainId) {
  const chain = SUPPORTED_CHAINS[chainId];
  return chain?.rpcUrl || null;
}

/**
 * Get token balance for a specific address on a specific chain
 * @param {string} contractAddress - Token contract address
 * @param {string} walletAddress - Wallet address to check balance for
 * @param {string} chainId - Chain ID
 * @returns {Promise<string>} - Token balance as a string
 */
async function getTokenBalance(contractAddress, walletAddress, chainId) {
  if (!contractAddress || !walletAddress || !chainId) {
    return '0';
  }

  const rpcUrl = getRpcUrl(chainId);
  if (!rpcUrl) {
    logger.warn(`No RPC URL configured for chain ${chainId}`);
    return '0';
  }

  try {
    // ABI for balanceOf function
    const balanceAbi = ["function balanceOf(address) view returns (uint256)"];
    
    // Use JsonRpcProvider in ethers v6
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const contract = new ethers.Contract(contractAddress, balanceAbi, provider);
    
    const balance = await contract.balanceOf(walletAddress);
    return balance.toString();
  } catch (error) {
    logger.error(`Error fetching balance for chain ${chainId}:`, error);
    return '0';
  }
}

/**
 * Get token balances across all chains for a wallet
 * @param {Object} contractAddresses - Map of chainId to contract address
 * @param {string} walletAddress - Wallet address to check balances for
 * @returns {Promise<Object>} - Map of chainId to token balance
 */
async function getTokenBalancesAcrossChains(contractAddresses, walletAddress) {
  if (!contractAddresses || !walletAddress) {
    return {};
  }

  const balances = {};
  const balancePromises = Object.entries(contractAddresses).map(async ([chainId, contractAddress]) => {
    try {
      const balance = await getTokenBalance(contractAddress, walletAddress, chainId);
      balances[chainId] = balance;
    } catch (error) {
      logger.error(`Error fetching balance for chain ${chainId}:`, error);
      balances[chainId] = '0';
    }
  });

  await Promise.all(balancePromises);
  return balances;
}

module.exports = {
  getConnectedContracts,
  getTokenBalancesAcrossChains
}; 