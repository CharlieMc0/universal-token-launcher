// Test script for Universal Token Launcher API and contract interactions
import { ethers } from 'ethers';

// Define constants for testing
const TEST_CHAIN_ID = "7001"; // ZetaChain Athens Testnet
const TEST_DESTINATION_CHAIN_ID = "11155111"; // Sepolia Testnet
const TEST_TOKEN_ADDRESS = "0x7d2A9fe6eC18d5Ae31138F829AD854C39f30Bc6D"; // Replace with your token address
const TEST_RECIPIENT = "0x4f1684A28E33F42cdf50AB96e29a709e17249E63"; // Replace with recipient address
const TEST_AMOUNT = "1000000000000000000"; // 1 token with 18 decimals

// Ethers v6 setup for browser environment
async function testCrossChainTransfer() {
  console.log("Starting cross-chain transfer test");
  
  // Check if we have ethereum provider
  if (!window.ethereum) {
    console.error("No Ethereum provider found. Please install MetaMask or another wallet.");
    return;
  }
  
  try {
    // Request account access
    await window.ethereum.request({ method: 'eth_requestAccounts' });
    
    // Create provider and signer
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    console.log("Connected with account:", signer.address);
    
    // Check that we're on ZetaChain
    const network = await provider.getNetwork();
    const chainId = Number(network.chainId);
    console.log("Current chain ID:", chainId);
    
    if (chainId !== 7001) {
      console.warn("Not on ZetaChain. Please switch to ZetaChain network before testing.");
      return;
    }
    
    // Define a minimal ABI for testing the transfer
    const tokenAbi = [
      "function balanceOf(address owner) view returns (uint256)",
      "function decimals() view returns (uint8)",
      "function symbol() view returns (string)",
      "function name() view returns (string)",
      "function connectedContracts(uint256 chainId) view returns (address)",
      "function crossChainTransfer(uint256 destChainId, address recipient, uint256 amount) external",
    ];
    
    // Create contract instance
    const tokenContract = new ethers.Contract(TEST_TOKEN_ADDRESS, tokenAbi, signer);
    
    // Check token details
    console.log("Checking token details...");
    const symbol = await tokenContract.symbol();
    const decimals = await tokenContract.decimals();
    const balance = await tokenContract.balanceOf(signer.address);
    console.log(`Token: ${symbol} (${decimals} decimals)`);
    console.log(`Balance: ${ethers.formatUnits(balance, decimals)} ${symbol}`);
    
    // Check if destination chain is connected
    try {
      const connectedContract = await tokenContract.connectedContracts(TEST_DESTINATION_CHAIN_ID);
      console.log(`Connected contract for chain ${TEST_DESTINATION_CHAIN_ID}:`, connectedContract);
      
      if (connectedContract === ethers.ZeroAddress) {
        console.error(`No connected contract found for chain ID ${TEST_DESTINATION_CHAIN_ID}. Transfer not possible.`);
        return;
      }
    } catch (err) {
      console.warn("Could not check connected contracts:", err.message);
    }
    
    // Ensure we have enough balance
    const transferAmount = ethers.toBigInt(TEST_AMOUNT);
    if (balance < transferAmount) {
      console.error(`Insufficient balance. Have ${balance.toString()}, need ${transferAmount.toString()}`);
      return;
    }
    
    // Estimate gas
    console.log("Estimating gas...");
    let gasEstimate;
    try {
      gasEstimate = await tokenContract.crossChainTransfer.estimateGas(
        TEST_DESTINATION_CHAIN_ID,
        TEST_RECIPIENT,
        transferAmount
      );
      console.log("Estimated gas:", gasEstimate.toString());
      
      // Add 50% buffer for safety
      gasEstimate = ethers.toBigInt(Math.floor(Number(gasEstimate) * 1.5));
    } catch (gasError) {
      console.error("Gas estimation failed:", gasError.message);
      // Use fallback gas limit
      gasEstimate = ethers.toBigInt(3000000);
      console.log("Using fallback gas estimate:", gasEstimate.toString());
    }
    
    // Execute the transfer
    console.log("Executing cross-chain transfer...");
    console.log("Parameters:", {
      destinationChain: TEST_DESTINATION_CHAIN_ID,
      recipient: TEST_RECIPIENT,
      amount: transferAmount.toString()
    });
    
    const tx = await tokenContract.crossChainTransfer(
      TEST_DESTINATION_CHAIN_ID,
      TEST_RECIPIENT,
      transferAmount,
      { gasLimit: gasEstimate }
    );
    
    console.log("Transaction submitted:", tx.hash);
    console.log("Waiting for confirmation...");
    
    const receipt = await tx.wait(2);
    console.log("Transaction confirmed!", receipt);
    
    if (receipt.status === 0) {
      console.error("Transaction failed on-chain");
    } else {
      console.log("Transfer successful!");
    }
    
  } catch (error) {
    console.error("Transfer test failed:", error);
    console.error("Error details:", {
      name: error.name,
      message: error.message,
      code: error.code
    });
  }
}

// Export for use in browser
window.testCrossChainTransfer = testCrossChainTransfer;

// Auto run if in browser environment
if (typeof window !== 'undefined') {
  console.log("Universal Token Launcher test script loaded");
  console.log("Run testCrossChainTransfer() to test");
} 