import { ethers } from "hardhat";

/**
 * This script simulates a cross-chain transfer.
 * It simulates both the source chain operation (burn) and the destination chain operation (mint).
 * 
 * In a real environment with actual ZetaChain cross-chain messaging, you would run the first part 
 * on the source chain, and the ZetaChain protocol would automatically trigger the second part.
 */

// Configuration - update these addresses
const configuration = {
  // Source chain settings
  sourceChainId: 11155111, // Sepolia
  sourceTokenAddress: "0x0b3D12246660b41f982f07CdCd27536a79a16296", // Address on Sepolia
  sourceAccount: "0x04dA1034E7d84c004092671bBcEb6B1c8DCda7AE", // Our testing account
  
  // Destination chain settings
  destChainId: 7001, // ZetaChain Testnet
  destTokenAddress: "0x51d5D00dfB9e1f4D60BBD6eda288F44Fb3158E16", // Address on ZetaChain Testnet
  destAccount: "0x04dA1034E7d84c004092671bBcEb6B1c8DCda7AE", // Our testing account
  
  // ZetaChain settings
  zetaChainId: 7001,
  zetaChainTokenAddress: "0x51d5D00dfB9e1f4D60BBD6eda288F44Fb3158E16", // Address on ZetaChain Testnet
  
  // Transfer amount (in token units)
  amount: "10.0"
};

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Simulating cross-chain transfer with account:", deployer.address);

  // Get the current chain ID
  const { chainId } = await ethers.provider.getNetwork();
  console.log("Current chain ID:", chainId);

  // Validate configuration
  if (!configuration.sourceTokenAddress || !configuration.destTokenAddress || !configuration.zetaChainTokenAddress) {
    console.error("Error: Token addresses not configured properly");
    process.exit(1);
  }

  if (!configuration.sourceAccount || !configuration.destAccount) {
    console.error("Error: Source or destination account not configured");
    process.exit(1);
  }

  // Determine the current simulation part
  if (chainId === BigInt(configuration.sourceChainId)) {
    await simulateSourceChain();
  } else if (chainId === BigInt(configuration.destChainId)) {
    await simulateDestChain();
  } else if (chainId === BigInt(configuration.zetaChainId)) {
    await simulateZetaChain();
  } else {
    console.error(`Error: Current chain ${chainId} is not configured for simulation`);
    process.exit(1);
  }
}

async function simulateSourceChain() {
  console.log("Simulating source chain (burn) operation...");
  
  // Get the source chain token contract
  const EVMUniversalToken = await ethers.getContractFactory("EVMUniversalToken");
  const sourceToken = await EVMUniversalToken.attach(configuration.sourceTokenAddress) as any;
  
  // Get token details
  console.log("Source token details:");
  console.log("  Name:", await sourceToken.name());
  console.log("  Symbol:", await sourceToken.symbol());
  console.log("  Decimals:", await sourceToken.decimals());
  
  // Convert amount to the right decimals
  const decimals = await sourceToken.decimals();
  const transferAmount = ethers.parseUnits(configuration.amount, decimals);
  
  // Check balances
  const sourceBalance = await sourceToken.balanceOf(configuration.sourceAccount);
  console.log(`  Source account balance: ${ethers.formatUnits(sourceBalance, decimals)}`);
  
  if (sourceBalance < transferAmount) {
    console.error("Error: Insufficient balance for transfer");
    process.exit(1);
  }
  
  // Initiate cross-chain transfer
  console.log(`Initiating cross-chain transfer of ${configuration.amount} tokens to chain ${configuration.destChainId}`);
  
  try {
    // If the caller is not the source account, we need to make the source account call this function
    // This is just for simulation, in a real scenario this would be directly called by the user
    const tx = await sourceToken.crossChainTransfer(
      configuration.destChainId,
      configuration.destAccount,
      transferAmount
    );
    
    await tx.wait();
    console.log(`Cross-chain transfer initiated. Transaction hash: ${tx.hash}`);
    
    // Check new balance
    const newBalance = await sourceToken.balanceOf(configuration.sourceAccount);
    console.log(`  New source account balance: ${ethers.formatUnits(newBalance, decimals)}`);
  } catch (error) {
    console.error("Error initiating cross-chain transfer:", error);
  }
}

async function simulateZetaChain() {
  console.log("Simulating ZetaChain relay operation...");
  
  // In a real scenario, ZetaChain would automatically relay the message between chains
  // This simulation shows how that would work
  
  // Get the ZetaChain token contract
  const ZetaChainUniversalToken = await ethers.getContractFactory("ZetaChainUniversalToken");
  const zetaToken = await ZetaChainUniversalToken.attach(configuration.zetaChainTokenAddress) as any;
  
  // Check if the contracts are properly connected
  const sourceConnected = await zetaToken.connectedContracts(configuration.sourceChainId);
  const destConnected = await zetaToken.connectedContracts(configuration.destChainId);
  
  console.log(`Source chain contract registered: ${sourceConnected}`);
  console.log(`Destination chain contract registered: ${destConnected}`);
  
  if (sourceConnected === "0x0000000000000000000000000000000000000000" || 
      destConnected === "0x0000000000000000000000000000000000000000") {
    console.error("Error: Source or destination chain not properly connected");
    process.exit(1);
  }
  
  console.log("ZetaChain would automatically relay the message between chains");
  console.log("Simulation complete - run the destination chain script to complete the simulated transfer");
}

async function simulateDestChain() {
  console.log("Simulating destination chain (mint) operation...");
  
  // Get the destination chain token contract
  const EVMUniversalToken = await ethers.getContractFactory("EVMUniversalToken");
  const destToken = await EVMUniversalToken.attach(configuration.destTokenAddress) as any;
  
  // Get token details
  console.log("Destination token details:");
  console.log("  Name:", await destToken.name());
  console.log("  Symbol:", await destToken.symbol());
  console.log("  Decimals:", await destToken.decimals());
  
  // Convert amount to the right decimals
  const decimals = await destToken.decimals();
  const transferAmount = ethers.parseUnits(configuration.amount, decimals);
  
  // Check initial balance
  const initialBalance = await destToken.balanceOf(configuration.destAccount);
  console.log(`  Initial destination account balance: ${ethers.formatUnits(initialBalance, decimals)}`);
  
  // Simulate the receiving part of the cross-chain transfer
  // In a real scenario, this would be called by the ZetaChain connector
  console.log(`Simulating receiving ${configuration.amount} tokens from chain ${configuration.sourceChainId}`);
  
  try {
    // Only the contract owner can call receiveCrossChainTransfer
    const tx = await destToken.receiveCrossChainTransfer(
      configuration.sourceChainId,
      configuration.sourceAccount,
      configuration.destAccount,
      transferAmount
    );
    
    await tx.wait();
    console.log(`Cross-chain transfer received. Transaction hash: ${tx.hash}`);
    
    // Check new balance
    const newBalance = await destToken.balanceOf(configuration.destAccount);
    console.log(`  New destination account balance: ${ethers.formatUnits(newBalance, decimals)}`);
  } catch (error) {
    console.error("Error receiving cross-chain transfer:", error);
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 