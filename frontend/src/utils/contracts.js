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
  "function transfer(address to, uint256 amount) returns (bool)",
  "function totalSupply() view returns (uint256)",
  
  // Cross-chain functions
  "function crossChainTransfer(uint256 destChainId, address recipient, uint256 amount) external",
  "function connectedContracts(uint256 chainId) view returns (address)",
  
  // Owner functions
  "function mint(address to, uint256 amount) external",
  "function owner() view returns (address)",
  "function burn(address from, uint256 amount) external",
  
  // Events
  "event ConnectedContractSet(uint256 chainId, address contractAddress)",
  "event CrossChainTransferInitiated(address from, uint256 destChainId, address to, uint256 amount)",
  "event CrossChainTransferReceived(uint256 sourceChainId, address from, address to, uint256 amount)",
  "event Transfer(address indexed from, address indexed to, uint256 value)"
];

// ABI for EVMUniversalToken
export const EVM_UNIVERSAL_TOKEN_ABI = [
  // Core ERC20 functions
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function name() view returns (string)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function totalSupply() view returns (uint256)",
  
  // Cross-chain functions
  "function crossChainTransfer(uint256 destChainId, address recipient, uint256 amount) external",
  "function zetaChainContract() view returns (address)",
  "function chainId() view returns (uint256)",
  
  // Owner functions
  "function mint(address to, uint256 amount) external",
  "function owner() view returns (address)",
  "function burn(address from, uint256 amount) external",
  
  // Events
  "event ZetaChainContractSet(address contractAddress)",
  "event CrossChainTransferInitiated(address from, uint256 destChainId, address to, uint256 amount)",
  "event CrossChainTransferReceived(uint256 sourceChainId, address from, address to, uint256 amount)",
  "event Transfer(address indexed from, address indexed to, uint256 value)"
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

// Utility function to estimate gas for cross-chain transfers
// For ZetaChain, we need higher gas limits due to the complexity of cross-chain operations
export function estimateCrossChainGas(sourceChain, destChain) {
  // Convert to numbers to ensure proper comparison
  const sourceChainNum = parseInt(sourceChain, 10);
  const destChainNum = parseInt(destChain, 10);
  
  // ZetaChain requires substantially more gas for cross-chain operations
  if (sourceChainNum === CHAIN_IDS.ZETACHAIN) {
    return '3000000'; // Higher default for ZetaChain as source
  } else if (destChainNum === CHAIN_IDS.ZETACHAIN) {
    return '1000000'; // Medium gas for transfers to ZetaChain
  } else {
    return '500000'; // Standard gas for other chains
  }
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