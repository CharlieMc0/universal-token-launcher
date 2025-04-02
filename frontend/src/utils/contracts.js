// Contract addresses and ABIs for interacting with Universal Tokens
import { ethers } from 'ethers';

// Chain IDs
export const CHAIN_IDS = {
  ZETACHAIN: 7001, // Athens Testnet
  ETHEREUM_SEPOLIA: 11155111,
  BSC_TESTNET: 97,
  BASE_SEPOLIA: 84532
};

// ABI for ZetaChainUniversalToken
export const ZETACHAIN_UNIVERSAL_TOKEN_ABI = [
  // Core ERC20 functions
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function name() view returns (string)",
  
  // Cross-chain functions
  "function crossChainTransfer(uint256 destChainId, address recipient, uint256 amount) external",
  "function connectedContracts(uint256 chainId) view returns (address)",
  
  // Events
  "event CrossChainTransferInitiated(address from, uint256 destChainId, address to, uint256 amount)",
  "event CrossChainTransferReceived(uint256 sourceChainId, address from, address to, uint256 amount)"
];

// ABI for EVMUniversalToken
export const EVM_UNIVERSAL_TOKEN_ABI = [
  // Core ERC20 functions
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function name() view returns (string)",
  
  // Cross-chain functions
  "function crossChainTransfer(uint256 destChainId, address recipient, uint256 amount) external",
  "function zetaChainContract() view returns (address)",
  
  // Events
  "event CrossChainTransferInitiated(address from, uint256 destChainId, address to, uint256 amount)",
  "event CrossChainTransferReceived(uint256 sourceChainId, address from, address to, uint256 amount)"
];

// Utility function to get appropriate ABI based on chain ID
export function getAbiForChain(chainId) {
  const chainIdNum = parseInt(chainId, 10);
  
  if (chainIdNum === CHAIN_IDS.ZETACHAIN) {
    return ZETACHAIN_UNIVERSAL_TOKEN_ABI;
  } else {
    return EVM_UNIVERSAL_TOKEN_ABI;
  }
}

// Function to estimate gas needed for cross-chain transfers
export function estimateCrossChainGas(sourceChainId, destinationChainId) {
  // In a real implementation, this would provide more accurate estimates
  // based on network conditions and historical data
  
  // For now, just return a reasonable default with some variation by chain
  const baseGas = 300000; // Base gas for transfer
  
  // Add chain-specific adjustments
  if (parseInt(sourceChainId, 10) === CHAIN_IDS.ZETACHAIN) {
    return baseGas + 50000; // ZetaChain transfers need slightly more gas
  }
  
  return baseGas;
}

// Function to get connected contract addresses and chain info for a Universal Token
export async function getConnectedContracts(provider, zetaChainContractAddress) {
  if (!provider || !zetaChainContractAddress) return {};
  
  try {
    // Create contract instance for ZetaChain contract
    // In ethers v6, Contract constructor takes (address, abi, runner)
    const contract = new ethers.Contract(
      zetaChainContractAddress,
      ZETACHAIN_UNIVERSAL_TOKEN_ABI,
      provider
    );
    
    // Query connected contracts for each supported chain
    const connectedContracts = {};
    const supportedChainIds = Object.values(CHAIN_IDS);
    
    for (const chainId of supportedChainIds) {
      if (chainId === CHAIN_IDS.ZETACHAIN) {
        // For ZetaChain, use the main contract address
        connectedContracts[chainId] = zetaChainContractAddress;
      } else {
        try {
          // For other chains, query the connected contract address
          const contractAddress = await contract.connectedContracts(chainId);
          // ZeroAddress is now a constant at the top level in ethers v6
          if (contractAddress && contractAddress !== ethers.ZeroAddress) {
            connectedContracts[chainId] = contractAddress;
          }
        } catch (error) {
          console.error(`Error fetching connected contract for chain ${chainId}:`, error);
        }
      }
    }
    
    return connectedContracts;
  } catch (error) {
    console.error('Error fetching connected contracts:', error);
    return {};
  }
} 