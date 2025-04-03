import { switchNetwork } from 'wagmi/actions';
import { CHAIN_IDS } from './contracts';

// Add mainnet ZetaChain chain ID if not defined
if (!CHAIN_IDS.ZETACHAIN_MAINNET) {
  CHAIN_IDS.ZETACHAIN_MAINNET = 7000;
}

/**
 * Switches the user's wallet to the ZetaChain network
 * Handles both switching to an existing network and adding a new network if needed
 * 
 * @param {number} [targetChainId=CHAIN_IDS.ZETACHAIN] - Target ZetaChain ID (testnet or mainnet)
 * @returns {Promise<boolean>} Success status
 */
export async function switchToZetaChain(targetChainId = CHAIN_IDS.ZETACHAIN) {
  try {
    console.log(`Starting ZetaChain network switch to chain ID: ${targetChainId}...`);
    
    const isTestnet = targetChainId === CHAIN_IDS.ZETACHAIN;
    const networkName = isTestnet ? 'ZetaChain Testnet (Athens)' : 'ZetaChain';
    const rpcUrl = isTestnet 
      ? 'https://zetachain-athens-evm.blockpi.network/v1/rpc/public'
      : 'https://zetachain.g.allthatnode.com/archive/evm';
    
    // Check current network first
    if (window.ethereum) {
      const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
      const currentChainId = parseInt(chainIdHex, 16);
      console.log('Current chain ID before switch:', currentChainId);
      
      if (currentChainId === targetChainId) {
        console.log(`Already on ${networkName} network, no switch needed`);
        return true;
      }
    }
    
    // First try to just switch to the network
    console.log(`Attempting to switch to ${networkName} with chainId:`, targetChainId);
    await switchNetwork({ chainId: targetChainId });
    
    // Add a delay to allow the switch to complete
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Verify the switch was successful
    if (window.ethereum) {
      const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
      const newChainId = parseInt(chainIdHex, 16);
      console.log('Chain ID after switchNetwork:', newChainId);
      
      if (newChainId === targetChainId) {
        console.log(`Successfully switched to ${networkName} network`);
        return true;
      }
    }
    
    // If we reach here, the switch wasn't successful, try adding the network
    throw new Error('Switch network failed, trying to add network');
  } catch (switchError) {
    console.error('Error switching to ZetaChain:', switchError);
    const isTestnet = targetChainId === CHAIN_IDS.ZETACHAIN;
    const networkName = isTestnet ? 'ZetaChain Testnet (Athens)' : 'ZetaChain';
    const rpcUrl = isTestnet 
      ? 'https://zetachain-athens-evm.blockpi.network/v1/rpc/public'
      : 'https://zetachain.g.allthatnode.com/archive/evm';
    const explorerUrl = 'https://explorer.zetachain.com';
    
    // If the network is not added, try to add it
    if (window.ethereum) {
      try {
        console.log(`Attempting to add ${networkName} network...`);
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: `0x${targetChainId.toString(16)}`,
            chainName: networkName,
            nativeCurrency: {
              name: 'ZETA',
              symbol: 'ZETA',
              decimals: 18,
            },
            rpcUrls: [rpcUrl],
            blockExplorerUrls: [explorerUrl]
          }]
        });
        
        // Add a delay to allow the wallet to process adding the network
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Verify the network was added and switched to
        const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
        const newChainId = parseInt(chainIdHex, 16);
        console.log('Chain ID after adding network:', newChainId);
        
        if (newChainId === targetChainId) {
          console.log(`Successfully added and switched to ${networkName} network`);
          return true;
        } else {
          console.log(`Added ${networkName} network but not switched to it. Attempting manual switch...`);
          // Try one more explicit switch
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: `0x${targetChainId.toString(16)}` }],
          });
          
          // Final check
          await new Promise(resolve => setTimeout(resolve, 1500));
          const finalChainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
          const finalChainId = parseInt(finalChainIdHex, 16);
          
          return finalChainId === targetChainId;
        }
      } catch (addError) {
        console.error(`Error adding ${networkName} network:`, addError);
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
  // Special case for ZetaChain (either testnet or mainnet)
  if (chainId === CHAIN_IDS.ZETACHAIN || chainId === CHAIN_IDS.ZETACHAIN_MAINNET) {
    return switchToZetaChain(chainId);
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
    case CHAIN_IDS.ZETACHAIN_MAINNET:
      return {
        chainId: `0x${chainIdNum.toString(16)}`,
        chainName: 'ZetaChain',
        nativeCurrency: {
          name: 'ZETA',
          symbol: 'ZETA',
          decimals: 18,
        },
        rpcUrls: ['https://zetachain.g.allthatnode.com/archive/evm'],
        blockExplorerUrls: ['https://explorer.zetachain.com']
      };
      
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
      
    case CHAIN_IDS.ETHEREUM_MAINNET:
      return {
        chainId: `0x${chainIdNum.toString(16)}`,
        chainName: 'Ethereum Mainnet',
        nativeCurrency: {
          name: 'Ether',
          symbol: 'ETH',
          decimals: 18,
        },
        rpcUrls: ['https://ethereum.publicnode.com'],
        blockExplorerUrls: ['https://etherscan.io']
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
      
    case CHAIN_IDS.BSC_MAINNET:
      return {
        chainId: `0x${chainIdNum.toString(16)}`,
        chainName: 'BNB Chain',
        nativeCurrency: {
          name: 'Binance Coin',
          symbol: 'BNB',
          decimals: 18,
        },
        rpcUrls: ['https://bsc-dataseed.binance.org/'],
        blockExplorerUrls: ['https://bscscan.com']
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
      
    case CHAIN_IDS.BASE_MAINNET:
      return {
        chainId: `0x${chainIdNum.toString(16)}`,
        chainName: 'Base',
        nativeCurrency: {
          name: 'Ether',
          symbol: 'ETH',
          decimals: 18,
        },
        rpcUrls: ['https://mainnet.base.org'],
        blockExplorerUrls: ['https://basescan.org']
      };
      
    default:
      return null;
  }
} 