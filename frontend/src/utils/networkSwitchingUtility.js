import { switchNetwork } from 'wagmi/actions';
import { CHAIN_IDS } from './contracts';

/**
 * Switches the user's wallet to the ZetaChain network
 * Handles both switching to an existing network and adding a new network if needed
 * 
 * @returns {Promise<boolean>} Success status
 */
export async function switchToZetaChain() {
  try {
    // First try to just switch to the network
    await switchNetwork({ chainId: CHAIN_IDS.ZETACHAIN });
    return true;
  } catch (switchError) {
    console.error('Error switching to ZetaChain:', switchError);
    
    // If the network is not added, try to add it
    if (window.ethereum) {
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: `0x${CHAIN_IDS.ZETACHAIN.toString(16)}`,
            chainName: 'ZetaChain Testnet (Athens)',
            nativeCurrency: {
              name: 'ZETA',
              symbol: 'ZETA',
              decimals: 18,
            },
            rpcUrls: ['https://zetachain-athens-evm.blockpi.network/v1/rpc/public'],
            blockExplorerUrls: ['https://explorer.zetachain.com']
          }]
        });
        return true;
      } catch (addError) {
        console.error('Error adding ZetaChain network:', addError);
        return false;
      }
    }
    return false;
  }
}

/**
 * Switches the user's wallet to a specific network
 * Handles both switching to an existing network and adding a new network if needed
 * 
 * @param {number} chainId - Target chain ID
 * @returns {Promise<boolean>} Success status
 */
export async function switchToNetwork(chainId) {
  // Special case for ZetaChain
  if (chainId === CHAIN_IDS.ZETACHAIN) {
    return switchToZetaChain();
  }
  
  try {
    // First try to just switch to the network
    await switchNetwork({ chainId: parseInt(chainId, 10) });
    return true;
  } catch (switchError) {
    console.error(`Error switching to network ${chainId}:`, switchError);
    
    // Different networks require different parameters for wallet_addEthereumChain
    if (window.ethereum) {
      try {
        // Network parameters based on chain ID
        const networkParams = getNetworkParams(chainId);
        
        if (networkParams) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [networkParams]
          });
          return true;
        }
      } catch (addError) {
        console.error(`Error adding network ${chainId}:`, addError);
        return false;
      }
    }
    return false;
  }
}

/**
 * Returns network parameters for wallet_addEthereumChain based on chain ID
 * 
 * @param {string|number} chainId - Chain ID
 * @returns {Object|null} Network parameters or null if not supported
 */
function getNetworkParams(chainId) {
  const chainIdNum = parseInt(chainId, 10);
  
  // Define parameters for supported chains
  switch (chainIdNum) {
    case CHAIN_IDS.ETHEREUM_SEPOLIA:
      return {
        chainId: `0x${chainIdNum.toString(16)}`,
        chainName: 'Ethereum Sepolia',
        nativeCurrency: {
          name: 'Sepolia Ether',
          symbol: 'ETH',
          decimals: 18,
        },
        rpcUrls: ['https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161'],
        blockExplorerUrls: ['https://sepolia.etherscan.io']
      };
      
    case CHAIN_IDS.BSC_TESTNET:
      return {
        chainId: `0x${chainIdNum.toString(16)}`,
        chainName: 'BSC Testnet',
        nativeCurrency: {
          name: 'Binance Coin',
          symbol: 'BNB',
          decimals: 18,
        },
        rpcUrls: ['https://data-seed-prebsc-1-s1.binance.org:8545/'],
        blockExplorerUrls: ['https://testnet.bscscan.com']
      };
      
    case CHAIN_IDS.BASE_SEPOLIA:
      return {
        chainId: `0x${chainIdNum.toString(16)}`,
        chainName: 'Base Sepolia',
        nativeCurrency: {
          name: 'Sepolia Ether',
          symbol: 'ETH',
          decimals: 18,
        },
        rpcUrls: ['https://sepolia.base.org'],
        blockExplorerUrls: ['https://sepolia.basescan.org']
      };
      
    default:
      return null;
  }
} 