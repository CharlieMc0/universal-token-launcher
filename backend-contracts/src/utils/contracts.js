const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');
const logger = require('./logger');

// Path to smart contracts directory (assuming they're in the parent directory)
const CONTRACTS_DIR = path.resolve(__dirname, '../../../smart-contracts');

/**
 * Load contract artifacts from the smart-contracts directory
 * @param {string} contractName - Name of the contract
 * @returns {Object} Contract artifacts with abi and bytecode
 */
function loadContractArtifact(contractName) {
  try {
    // Construct path to the artifact JSON
    const artifactPath = path.join(
      CONTRACTS_DIR,
      'artifacts',
      'contracts',
      `${contractName}.sol`,
      `${contractName}.json`
    );
    
    // Verify file exists
    if (!fs.existsSync(artifactPath)) {
      throw new Error(`Contract artifact not found: ${artifactPath}`);
    }
    
    // Load and parse the artifact JSON
    const artifactJson = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    
    return {
      abi: artifactJson.abi,
      bytecode: artifactJson.bytecode
    };
  } catch (error) {
    logger.error(`Failed to load contract artifact for ${contractName}: ${error.message}`);
    throw error;
  }
}

/**
 * Create a contract factory using ethers.js
 * @param {ethers.JsonRpcProvider} provider - Ethers provider
 * @param {string} contractName - Name of the contract
 * @returns {ethers.ContractFactory} Contract factory
 */
function createContractFactory(provider, contractName) {
  try {
    const { abi, bytecode } = loadContractArtifact(contractName);
    const wallet = new ethers.Wallet(getPrivateKey(), provider);
    return new ethers.ContractFactory(abi, bytecode, wallet);
  } catch (error) {
    logger.error(`Failed to create contract factory for ${contractName}: ${error.message}`);
    throw error;
  }
}

/**
 * Get the formatted private key
 * @returns {string} Private key with 0x prefix
 */
function getPrivateKey() {
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('DEPLOYER_PRIVATE_KEY not found in environment variables');
  }
  
  // Ensure it has 0x prefix
  return privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
}

/**
 * Generate the Standard JSON Input for Solidity contract verification
 * @param {string} contractName - Name of the contract
 * @returns {Object} Formatted JSON input for verification
 */
function generateStandardJsonInput(contractName) {
  try {
    // Construct the base path
    const contractsPath = path.join(CONTRACTS_DIR, 'contracts');
    
    // Get the main contract file
    const mainContractPath = path.join(contractsPath, `${contractName}.sol`);
    if (!fs.existsSync(mainContractPath)) {
      throw new Error(`Main contract file not found: ${mainContractPath}`);
    }
    
    // Read the main contract content
    const mainContractContent = fs.readFileSync(mainContractPath, 'utf8');
    
    // Base structure for standard JSON input
    const standardInput = {
      language: 'Solidity',
      sources: {
        [`contracts/${contractName}.sol`]: {
          content: mainContractContent
        }
      },
      settings: {
        optimizer: {
          enabled: true,
          runs: 200
        },
        outputSelection: {
          '*': {
            '*': ['abi', 'evm.bytecode', 'evm.deployedBytecode']
          }
        }
      }
    };
    
    // Extract imports from main contract to add to sources
    const importRegex = /import\s+["'](.+?)["'];/g;
    let importMatch;
    
    while ((importMatch = importRegex.exec(mainContractContent)) !== null) {
      const importPath = importMatch[1];
      
      // Handle local imports
      if (importPath.startsWith('./') || importPath.startsWith('../')) {
        const resolvedPath = path.resolve(path.dirname(mainContractPath), importPath);
        const relativePath = path.relative(CONTRACTS_DIR, resolvedPath);
        if (fs.existsSync(resolvedPath)) {
          standardInput.sources[relativePath] = {
            content: fs.readFileSync(resolvedPath, 'utf8')
          };
        }
      }
      // Handle absolute imports (e.g. OpenZeppelin)
      else if (importPath.startsWith('@')) {
        // For OpenZeppelin, we need to find it in node_modules
        const nodeModulesImportPath = path.join(CONTRACTS_DIR, 'node_modules', importPath);
        if (fs.existsSync(nodeModulesImportPath)) {
          standardInput.sources[importPath] = {
            content: fs.readFileSync(nodeModulesImportPath, 'utf8')
          };
        }
      }
    }
    
    return standardInput;
  } catch (error) {
    logger.error(`Failed to generate standard JSON input for ${contractName}: ${error.message}`);
    throw error;
  }
}

module.exports = {
  loadContractArtifact,
  createContractFactory,
  getPrivateKey,
  generateStandardJsonInput
}; 