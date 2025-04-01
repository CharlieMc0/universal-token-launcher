const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');
const chainInfo = require('../utils/chainInfo');

/**
 * Service for verifying deployed contracts on block explorers
 */
class VerificationService {
  constructor() {
    // Initialize API keys
    this.apiKeys = {
      // Etherscan and compatible explorers
      etherscan: process.env.ETHERSCAN_API_KEY || '',
      polygonscan: process.env.POLYGONSCAN_API_KEY || '',
      basescan: process.env.BASESCAN_API_KEY || '',
      // Add more API keys as needed
    };
  }

  /**
   * Verify a contract on Blockscout explorer (e.g., ZetaChain)
   * @param {string} chainId - The chain ID
   * @param {string} contractAddress - The contract address
   * @param {string} contractName - The contract name
   * @param {Object} compilerOptions - Compiler options
   * @returns {Promise<Object>} - Verification result
   */
  async verifyContractOnBlockscout(chainId, contractAddress, contractName, compilerOptions = {}) {
    try {
      const chain = chainInfo.getChainInfo(chainId);
      if (!chain || !chain.explorerUrl) {
        throw new Error(`Explorer URL not found for chain ${chainId}`);
      }

      console.log(`Verifying contract ${contractName} at ${contractAddress} on Blockscout (Chain: ${chain.name})...`);

      // Get JSON input for verification
      const jsonInput = await this.generateStandardJsonInput(contractName, compilerOptions);

      // Create form data for API request
      const formData = new URLSearchParams();
      formData.append('address', contractAddress);
      formData.append('name', contractName);
      formData.append('compiler', compilerOptions.compiler || 'solidity');
      formData.append('optimization', compilerOptions.optimization ? 'true' : 'false');
      formData.append('contract_source_code', jsonInput);
      formData.append('verification_type', 'standard_json');

      // API endpoint (remove trailing slash if present)
      const baseUrl = chain.explorerUrl.endsWith('/')
        ? chain.explorerUrl.slice(0, -1)
        : chain.explorerUrl;
      
      const verificationUrl = `${baseUrl}/api/v2/smart-contracts/verify`;

      // Make API request
      const response = await axios.post(verificationUrl, formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 30000, // 30 seconds
      });

      console.log(`Verification response from Blockscout:`, response.data);

      // Blockscout returns different formats based on success/failure
      if (response.data.message === 'ok' || response.data.status === 'success') {
        console.log(`Contract ${contractAddress} successfully verified on ${chain.name}`);
        return {
          success: true,
          message: 'Contract successfully verified',
          explorerUrl: `${chain.explorerUrl}/address/${contractAddress}`
        };
      } else {
        throw new Error(`Verification failed: ${response.data.message || JSON.stringify(response.data)}`);
      }
    } catch (error) {
      console.error(`Error verifying contract on Blockscout: ${error.message}`);
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Verify a contract on Etherscan or compatible explorer
   * @param {string} chainId - The chain ID
   * @param {string} contractAddress - The contract address
   * @param {string} contractName - The contract name
   * @param {Object} compilerOptions - Compiler options
   * @returns {Promise<Object>} - Verification result
   */
  async verifyContractOnEtherscan(chainId, contractAddress, contractName, compilerOptions = {}) {
    try {
      const chain = chainInfo.getChainInfo(chainId);
      if (!chain || !chain.explorerUrl) {
        throw new Error(`Explorer URL not found for chain ${chainId}`);
      }

      console.log(`Verifying contract ${contractName} at ${contractAddress} on Etherscan-compatible explorer (Chain: ${chain.name})...`);

      // Determine API key based on chain
      let apiKey = '';
      if (chain.name.toLowerCase().includes('ethereum')) {
        apiKey = this.apiKeys.etherscan;
      } else if (chain.name.toLowerCase().includes('polygon')) {
        apiKey = this.apiKeys.polygonscan;
      } else if (chain.name.toLowerCase().includes('base')) {
        apiKey = this.apiKeys.basescan;
      }

      if (!apiKey) {
        throw new Error(`API key not found for chain ${chain.name}`);
      }

      // Get JSON input for verification
      const jsonInput = await this.generateStandardJsonInput(contractName, compilerOptions);

      // Create form data for API request
      const formData = new URLSearchParams();
      formData.append('apikey', apiKey);
      formData.append('module', 'contract');
      formData.append('action', 'verifysourcecode');
      formData.append('contractaddress', contractAddress);
      formData.append('sourceCode', jsonInput);
      formData.append('codeformat', 'solidity-standard-json-input');
      formData.append('contractname', contractName);
      formData.append('compilerversion', `v${compilerOptions.compilerVersion || '0.8.26'}`);
      formData.append('optimizationUsed', compilerOptions.optimization ? '1' : '0');
      if (compilerOptions.optimization) {
        formData.append('runs', compilerOptions.runs || '200');
      }
      formData.append('chainId', chainId);

      // Extract API endpoint from explorer URL
      const apiDomain = chain.explorerUrl.replace('https://', '').replace('http://', '').split('/')[0];
      const apiUrl = `https://api.${apiDomain}/api`;

      // Make API request
      const response = await axios.post(apiUrl, formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 30000, // 30 seconds
      });

      console.log(`Verification submission response:`, response.data);

      // Check if the submission was successful
      if (response.data.status === '1') {
        // Get the GUID for checking the verification status
        const guid = response.data.result;
        
        // Wait for verification to complete (poll status)
        return await this.pollEtherscanVerificationStatus(apiUrl, guid, apiKey, chain, contractAddress);
      } else {
        throw new Error(`Verification submission failed: ${response.data.result}`);
      }
    } catch (error) {
      console.error(`Error verifying contract on Etherscan: ${error.message}`);
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Poll Etherscan verification status
   * @param {string} apiUrl - The API URL
   * @param {string} guid - The GUID from the submission response
   * @param {string} apiKey - The API key
   * @param {Object} chain - The chain information
   * @param {string} contractAddress - The contract address
   * @returns {Promise<Object>} - Verification result
   */
  async pollEtherscanVerificationStatus(apiUrl, guid, apiKey, chain, contractAddress) {
    try {
      let verified = false;
      let attempts = 0;
      const maxAttempts = 10;
      const delay = 5000; // 5 seconds between polls

      while (!verified && attempts < maxAttempts) {
        attempts++;
        
        // Wait before polling
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Create form data for status check
        const formData = new URLSearchParams();
        formData.append('apikey', apiKey);
        formData.append('module', 'contract');
        formData.append('action', 'checkverifystatus');
        formData.append('guid', guid);

        // Make API request
        const response = await axios.post(apiUrl, formData, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        });

        console.log(`Verification status (attempt ${attempts}):`, response.data);

        // Check if verification is complete
        if (response.data.status === '1') {
          verified = true;
          console.log(`Contract ${contractAddress} successfully verified on ${chain.name}`);
          return {
            success: true,
            message: 'Contract successfully verified',
            explorerUrl: `${chain.explorerUrl}/address/${contractAddress}#code`
          };
        } else if (response.data.result === 'Pending in queue') {
          console.log(`Verification still pending, waiting...`);
        } else {
          throw new Error(`Verification failed: ${response.data.result}`);
        }
      }

      if (!verified) {
        throw new Error(`Verification timed out after ${maxAttempts} attempts`);
      }
    } catch (error) {
      console.error(`Error polling verification status: ${error.message}`);
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Generate standard JSON input for contract verification
   * @param {string} contractName - The contract name
   * @param {Object} compilerOptions - Compiler options
   * @returns {Promise<string>} - JSON input for verification
   */
  async generateStandardJsonInput(contractName, compilerOptions = {}) {
    try {
      const standardInput = {
        language: 'Solidity',
        sources: {},
        settings: {
          optimizer: {
            enabled: compilerOptions.optimization || false,
            runs: compilerOptions.runs || 200
          },
          outputSelection: {
            '*': {
              '*': ['abi', 'evm.bytecode', 'evm.deployedBytecode', 'metadata']
            }
          },
          libraries: {}
        }
      };

      // Add source files
      const contractPath = path.resolve(
        __dirname, 
        '../../../smart-contracts/contracts',
        `${contractName}.sol`
      );
      
      // Get main contract content
      const contractContent = fs.readFileSync(contractPath, 'utf8');
      standardInput.sources[`${contractName}.sol`] = { content: contractContent };

      // Parse imports to add dependencies
      const importRegex = /import\s+["'](.+?)["'];/g;
      let match;
      const importSet = new Set();
      
      while ((match = importRegex.exec(contractContent)) !== null) {
        importSet.add(match[1]);
      }

      // Add imported files recursively
      await this.addImportedSources(importSet, standardInput.sources, '../../../smart-contracts/contracts');

      return JSON.stringify(standardInput);
    } catch (error) {
      console.error(`Error generating standard JSON input: ${error.message}`);
      throw error;
    }
  }

  /**
   * Add imported sources to the standard JSON input
   * @param {Set<string>} imports - Set of import paths
   * @param {Object} sources - Sources object to update
   * @param {string} basePath - Base path for resolving imports
   * @returns {Promise<void>}
   */
  async addImportedSources(imports, sources, basePath) {
    const newImports = new Set();
    
    for (const importPath of imports) {
      // Skip if already processed
      if (sources[importPath]) continue;
      
      try {
        // Handle node_modules imports
        let resolvedPath;
        if (importPath.startsWith('@')) {
          resolvedPath = path.resolve(__dirname, basePath, 'node_modules', importPath);
        } else {
          resolvedPath = path.resolve(__dirname, basePath, importPath);
        }
        
        const content = fs.readFileSync(resolvedPath, 'utf8');
        sources[importPath] = { content };
        
        // Extract further imports
        const importRegex = /import\s+["'](.+?)["'];/g;
        let match;
        while ((match = importRegex.exec(content)) !== null) {
          newImports.add(match[1]);
        }
      } catch (error) {
        console.warn(`Warning: Could not resolve import ${importPath}: ${error.message}`);
        // Continue with other imports
      }
    }
    
    // Process new imports if any
    if (newImports.size > 0) {
      await this.addImportedSources(newImports, sources, basePath);
    }
  }

  /**
   * Verify a contract on the appropriate explorer based on chain ID
   * @param {string} chainId - The chain ID
   * @param {string} contractAddress - The contract address
   * @param {string} contractName - The contract name (e.g., "ZetaChainUniversalToken" or "EVMUniversalToken")
   * @param {Object} compilerOptions - Compiler options
   * @returns {Promise<Object>} - Verification result
   */
  async verifyContract(chainId, contractAddress, contractName, compilerOptions = {}) {
    try {
      const chain = chainInfo.getChainInfo(chainId);
      if (!chain) {
        throw new Error(`Chain information not found for chain ID ${chainId}`);
      }
      
      // Add default compiler options if not provided
      const defaults = {
        compilerVersion: '0.8.26',
        optimization: true,
        runs: 200,
        compiler: 'solidity'
      };
      
      const options = { ...defaults, ...compilerOptions };
      
      // Check if the explorer is Blockscout or Etherscan-compatible
      // This is a simple heuristic - in production, you might want to maintain a more explicit list
      const isBlockscout = chain.explorerUrl.includes('blockscout') || 
                          chainInfo.isZetaChain(chainId);
      
      if (isBlockscout) {
        return await this.verifyContractOnBlockscout(chainId, contractAddress, contractName, options);
      } else {
        return await this.verifyContractOnEtherscan(chainId, contractAddress, contractName, options);
      }
    } catch (error) {
      console.error(`Error verifying contract: ${error.message}`);
      return {
        success: false,
        message: error.message
      };
    }
  }
}

module.exports = new VerificationService(); 