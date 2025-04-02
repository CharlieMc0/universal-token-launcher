import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

// Get private key from environment or use a dummy one for local testing
function getPrivateKey(): string {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey || privateKey.length === 0) {
    return "0000000000000000000000000000000000000000000000000000000000000001";
  }
  
  // Remove '0x' prefix if it exists
  return privateKey.startsWith("0x") ? privateKey.slice(2) : privateKey;
}

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.26",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    hardhat: {
      // For testing
    },
    zetachain: {
      url: process.env.ZETA_RPC_URL || "https://zetachain-evm.blockpi.network/v1/rpc/public",
      accounts: [getPrivateKey()],
      chainId: 7000,
    },
    zetachain_testnet: {
      url: process.env.ZETA_TESTNET_RPC_URL || "https://zetachain-athens-evm.blockpi.network/v1/rpc/public",
      accounts: [getPrivateKey()],
      chainId: 7001,
    },
    // Add other networks as needed
    ethereum: {
      url: process.env.ETH_RPC_URL || "https://ethereum.publicnode.com",
      accounts: [getPrivateKey()],
      chainId: 1,
    },
    polygon: {
      url: process.env.POLYGON_RPC_URL || "https://polygon-rpc.com",
      accounts: [getPrivateKey()],
      chainId: 137,
    },
    base: {
      url: process.env.BASE_RPC_URL || "https://mainnet.base.org",
      accounts: [getPrivateKey()],
      chainId: 8453,
    },
    // Test networks
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia.publicnode.com",
      accounts: [getPrivateKey()],
      chainId: 11155111,
    },
    mumbai: {
      url: process.env.MUMBAI_RPC_URL || "https://rpc-mumbai.maticvigil.com",
      accounts: [getPrivateKey()],
      chainId: 80001,
    }
  },
  etherscan: {
    apiKey: {
      mainnet: process.env.ETHERSCAN_API_KEY || "",
      polygon: process.env.POLYGONSCAN_API_KEY || "",
      base: process.env.BASESCAN_API_KEY || "",
      sepolia: process.env.ETHERSCAN_API_KEY || "",
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  sourcify: {
    enabled: true,
    // Optional: specify a different Sourcify server
    apiUrl: "https://sourcify.dev/server",
    // Optional: specify a different Sourcify repository
    browserUrl: "https://repo.sourcify.dev",
  }
};

export default config;

