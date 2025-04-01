const contractService = require('../src/services/ContractService');
const { ZETACHAIN_TESTNET_ID } = require('../src/constants/bytecode');
const { SUPPORTED_CHAINS } = require('../src/constants/chains');

/**
 * Connect tokens between ZetaChain and EVM chain
 * 
 * Usage:
 * node scripts/connectTokens.js <zetaChainTokenAddress> <evmChainId> <evmTokenAddress>
 * 
 * Example:
 * node scripts/connectTokens.js 0x1234567890123456789012345678901234567890 11155111 0x9876543210987654321098765432109876543210
 */
async function connectTokens() {
  try {
    // Get command line arguments
    const [,, zetaChainTokenAddress, evmChainId, evmTokenAddress] = process.argv;
    
    // Validate arguments
    if (!zetaChainTokenAddress || !evmChainId || !evmTokenAddress) {
      console.error('Missing required arguments!');
      console.error('Usage: node scripts/connectTokens.js <zetaChainTokenAddress> <evmChainId> <evmTokenAddress>');
      process.exit(1);
    }
    
    // Use testnet ID for now
    const zetaChainId = ZETACHAIN_TESTNET_ID.toString();
    
    // Validate chains
    const zetaChain = SUPPORTED_CHAINS[zetaChainId];
    const evmChain = SUPPORTED_CHAINS[evmChainId];
    
    if (!zetaChain) {
      console.error(`Invalid ZetaChain ID: ${zetaChainId}`);
      process.exit(1);
    }
    
    if (!evmChain) {
      console.error(`Invalid EVM chain ID: ${evmChainId}`);
      process.exit(1);
    }
    
    console.log('\n====== CONNECTING TOKENS BETWEEN CHAINS ======');
    console.log(`ZetaChain (${zetaChainId}): ${zetaChain.name}`);
    console.log(`ZetaChain Token Address: ${zetaChainTokenAddress}`);
    console.log(`ZetaChain Explorer: ${zetaChain.explorerUrl}/address/${zetaChainTokenAddress}`);
    console.log(`EVM Chain (${evmChainId}): ${evmChain.name}`);
    console.log(`EVM Token Address: ${evmTokenAddress}`);
    console.log(`EVM Explorer: ${evmChain.explorerUrl}/address/${evmTokenAddress}`);
    console.log('==============================================\n');
    
    console.log('Connecting tokens...');
    
    try {
      // Connect the tokens
      const result = await contractService.connectTokens(
        zetaChainId,
        zetaChainTokenAddress,
        evmChainId,
        evmTokenAddress
      );
      
      console.log('\n=========== CONNECTION SUCCESSFUL ===========');
      console.log(`ZETACHAIN TX HASH: ${result.zetaChainTxHash}`);
      console.log(`ZETACHAIN TX EXPLORER: ${zetaChain.explorerUrl}/tx/${result.zetaChainTxHash}`);
      console.log(`EVM TX HASH: ${result.evmTxHash}`);
      console.log(`EVM TX EXPLORER: ${evmChain.explorerUrl}/tx/${result.evmTxHash}`);
      console.log('============================================\n');
    } catch (error) {
      console.error(`\nERROR: ${error.message}`);
      
      if (error.message.includes('Deployer private key not configured')) {
        console.log('\nMake sure you have set the DEPLOYER_PRIVATE_KEY environment variable!');
        console.log('Example: export DEPLOYER_PRIVATE_KEY=0x123...\n');
      }
      
      process.exit(1);
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

// Run the script
connectTokens(); 