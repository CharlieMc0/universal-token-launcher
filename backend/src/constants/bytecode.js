// Universal Token bytecode and ABI exports
// This file contains the compiled bytecode and ABIs for Universal Token contracts

/**
 * IMPORTANT PRODUCTION NOTE:
 * 
 * For a production deployment, you should:
 * 1. Compile the standard-contracts directly using Hardhat
 * 2. Extract the correct artifacts (ABIs and bytecode) for:
 *    - ZetaChainUniversalToken
 *    - EVMUniversalToken
 * 3. Use separate ABI files for readability
 * 
 * The current placeholders are for development only!
 */

// Import and use artifacts from the smart-contracts directory
const fs = require('fs');
const path = require('path');

// Helper function to load compiled contract artifacts
function loadContractArtifact(contractName) {
  try {
    const artifactPath = path.resolve(
      __dirname, 
      '../../../smart-contracts/artifacts/contracts',
      contractName.includes('/') ? contractName : `${contractName}.sol/${contractName}.json`
    );
    
    if (!fs.existsSync(artifactPath)) {
      console.error(`Contract artifact not found at ${artifactPath}`);
      throw new Error(`Contract artifact for ${contractName} not found. Please compile the contracts first.`);
    }
    
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    return {
      abi: artifact.abi,
      bytecode: artifact.bytecode
    };
  } catch (error) {
    console.error(`Error loading contract artifact for ${contractName}:`, error.message);
    throw error;
  }
}

// Load contract artifacts
let zetaChainTokenArtifact;
let evmTokenArtifact;

try {
  zetaChainTokenArtifact = loadContractArtifact('ZetaChainUniversalToken');
  evmTokenArtifact = loadContractArtifact('EVMUniversalToken');
  console.log('Successfully loaded contract artifacts');
} catch (error) {
  console.error('Failed to load contract artifacts:', error.message);
  console.warn('Using placeholder values for development. These should not be used in production.');
  
  // Placeholder values for development
  zetaChainTokenArtifact = {
    abi: [
      // Add minimum required ABI entries for testing
      {
        "inputs": [
          {"internalType": "string", "name": "name_", "type": "string"},
          {"internalType": "string", "name": "symbol_", "type": "string"},
          {"internalType": "uint8", "name": "decimals_", "type": "uint8"},
          {"internalType": "uint256", "name": "initialSupply", "type": "uint256"},
          {"internalType": "address", "name": "initialOwner", "type": "address"}
        ],
        "stateMutability": "nonpayable",
        "type": "constructor"
      }
    ],
    bytecode: '0x60806040...' // Placeholder, not for actual deployment
  };
  
  evmTokenArtifact = {
    abi: [
      // Add minimum required ABI entries for testing
      {
        "inputs": [
          {"internalType": "string", "name": "name_", "type": "string"},
          {"internalType": "string", "name": "symbol_", "type": "string"},
          {"internalType": "uint8", "name": "decimals_", "type": "uint8"},
          {"internalType": "uint256", "name": "initialSupply", "type": "uint256"},
          {"internalType": "uint256", "name": "currentChainId", "type": "uint256"},
          {"internalType": "address", "name": "initialOwner", "type": "address"}
        ],
        "stateMutability": "nonpayable",
        "type": "constructor"
      }
    ],
    bytecode: '0x60806040...' // Placeholder, not for actual deployment
  };
}

// Export the token bytecode and ABIs
exports.ZETACHAIN_UNIVERSAL_TOKEN_ABI = zetaChainTokenArtifact.abi;
exports.ZETACHAIN_UNIVERSAL_TOKEN_BYTECODE = zetaChainTokenArtifact.bytecode;

exports.EVM_UNIVERSAL_TOKEN_ABI = evmTokenArtifact.abi;
exports.EVM_UNIVERSAL_TOKEN_BYTECODE = evmTokenArtifact.bytecode;

// Export other constants
exports.ZETACHAIN_ID = 7000;
exports.ZETACHAIN_TESTNET_ID = 7001; 