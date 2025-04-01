/**
 * Utility to get known tokens for specific wallet addresses
 * This is a temporary solution until we have a proper database of tokens
 */

// Define known tokens for specific wallet addresses
const getKnownTokens = (walletAddress) => {
  if (!walletAddress) return [];
  
  // Normalize the wallet address
  const normalizedAddress = walletAddress.toLowerCase();
  
  // Known tokens for the Universal Token Service wallet
  if (normalizedAddress === '0x04da1034e7d84c004092671bbceb6b1c8dcda7ae') {
    return [
      {
        id: null, // No database ID
        name: "Universal Token",
        symbol: "UTKN",
        iconUrl: null,
        deployedContracts: { 
          "7001": "0x51d5D00dfB9e1f4D60BBD6eda288F44Fb3158E16",
          "11155111": "0x0b3D12246660b41f982f07CdCd27536a79a16296" 
        },
        deployedChains: ["7001", "11155111"],
        chainInfo: [
          {
            name: "ZetaChain Testnet",
            chainId: "7001",
            rpcUrl: "https://zetachain-athens-evm.blockpi.network/v1/rpc/public",
            explorerUrl: "https://zetachain-testnet.blockscout.com",
            contractAddress: "0x51d5D00dfB9e1f4D60BBD6eda288F44Fb3158E16",
            deploymentStatus: "success"
          },
          {
            name: "Sepolia",
            chainId: "11155111",
            rpcUrl: "https://ethereum-sepolia.publicnode.com",
            explorerUrl: "https://sepolia.etherscan.io",
            contractAddress: "0x0b3D12246660b41f982f07CdCd27536a79a16296",
            deploymentStatus: "success"
          }
        ],
        balances: { 
          "7001": "1000010000000000000000000",
          "11155111": "0"
        },
        source: "documentation"
      }
    ];
  }
  
  // Add more wallet addresses here if needed
  if (normalizedAddress === '0x4f1684a28e33f42cdf50ab96e29a709e17249e63') {
    return [
      {
        id: null, // No database ID
        name: "Universal Token",
        symbol: "UTKN",
        iconUrl: null,
        deployedContracts: { 
          "7001": "0x51d5D00dfB9e1f4D60BBD6eda288F44Fb3158E16"
        },
        deployedChains: ["7001"],
        chainInfo: [
          {
            name: "ZetaChain Testnet",
            chainId: "7001",
            rpcUrl: "https://zetachain-athens-evm.blockpi.network/v1/rpc/public",
            explorerUrl: "https://zetachain-testnet.blockscout.com",
            contractAddress: "0x51d5D00dfB9e1f4D60BBD6eda288F44Fb3158E16",
            deploymentStatus: "success"
          }
        ],
        balances: { 
          "7001": "1000000000000000000"
        },
        source: "documentation"
      }
    ];
  }
  
  // Return empty array for unknown wallet addresses
  return [];
};

module.exports = getKnownTokens; 