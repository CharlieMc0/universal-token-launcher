import { ethers } from "hardhat";

/**
 * This script links Universal Tokens across chains.
 * It should be run after tokens have been deployed on all required chains.
 * 
 * Set the token addresses in the configuration below.
 */

const configuration = {
  // ZetaChain token address (ZetaChain Testnet)
  zetaChainTokenAddress: "0x51d5D00dfB9e1f4D60BBD6eda288F44Fb3158E16",
  
  // EVM tokens by chainId
  evmTokens: [
    { chainId: 11155111, address: "0x0b3D12246660b41f982f07CdCd27536a79a16296" },  // Sepolia
    // Add more chains as needed
  ]
};

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Connecting tokens with the account:", deployer.address);

  // Get the current chain ID
  const { chainId } = await ethers.provider.getNetwork();
  console.log("Current chain ID:", chainId);

  // Validate configuration
  if (!configuration.zetaChainTokenAddress) {
    console.error("Error: zetaChainTokenAddress is not set in configuration");
    process.exit(1);
  }

  if (configuration.evmTokens.length === 0) {
    console.error("Error: No EVM tokens configured");
    process.exit(1);
  }

  // Check if we're on ZetaChain Testnet
  if (chainId === 7001n) {
    console.log("Running on ZetaChain Testnet - setting up connected contracts...");
    
    // Get the ZetaChain token contract
    const ZetaChainUniversalToken = await ethers.getContractFactory("ZetaChainUniversalToken");
    const zetaChainToken = await ZetaChainUniversalToken.attach(configuration.zetaChainTokenAddress) as any;
    
    // Set up each EVM token as a connected contract
    for (const evmToken of configuration.evmTokens) {
      console.log(`Setting connected contract for chain ${evmToken.chainId}: ${evmToken.address}`);
      
      // Check if already set
      const currentAddress = await zetaChainToken.connectedContracts(evmToken.chainId);
      if (currentAddress !== "0x0000000000000000000000000000000000000000") {
        console.log(`Connected contract already set for chain ${evmToken.chainId}: ${currentAddress}`);
        
        // Update if different
        if (currentAddress.toLowerCase() !== evmToken.address.toLowerCase()) {
          console.log(`Updating connected contract for chain ${evmToken.chainId}`);
          const tx = await zetaChainToken.setConnectedContract(evmToken.chainId, evmToken.address);
          await tx.wait();
          console.log(`Transaction hash: ${tx.hash}`);
        }
      } else {
        // Set new connected contract
        const tx = await zetaChainToken.setConnectedContract(evmToken.chainId, evmToken.address);
        await tx.wait();
        console.log(`Connected contract set for chain ${evmToken.chainId}. Transaction hash: ${tx.hash}`);
      }
    }
    
    console.log("All connected contracts set successfully on ZetaChain Testnet");
  } else {
    console.log("Running on EVM chain - setting up ZetaChain connection...");
    
    // Find the current chain in the configuration
    const currentChainConfig = configuration.evmTokens.find(t => t.chainId === Number(chainId));
    
    if (!currentChainConfig) {
      console.error(`Error: No configuration found for current chain ID: ${chainId}`);
      process.exit(1);
    }
    
    // Get the EVM token contract
    const EVMUniversalToken = await ethers.getContractFactory("EVMUniversalToken");
    const evmToken = await EVMUniversalToken.attach(currentChainConfig.address) as any;
    
    // Check if ZetaChain contract is already set
    const currentZetaChainContract = await evmToken.zetaChainContract();
    if (currentZetaChainContract !== "0x0000000000000000000000000000000000000000") {
      console.log(`ZetaChain contract already set: ${currentZetaChainContract}`);
      
      // Update if different
      if (currentZetaChainContract.toLowerCase() !== configuration.zetaChainTokenAddress.toLowerCase()) {
        console.log("Updating ZetaChain contract address");
        const tx = await evmToken.setZetaChainContract(configuration.zetaChainTokenAddress);
        await tx.wait();
        console.log(`Transaction hash: ${tx.hash}`);
      }
    } else {
      // Set new ZetaChain contract
      const tx = await evmToken.setZetaChainContract(configuration.zetaChainTokenAddress);
      await tx.wait();
      console.log(`ZetaChain contract set. Transaction hash: ${tx.hash}`);
    }
    
    console.log("ZetaChain connection set successfully");
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 