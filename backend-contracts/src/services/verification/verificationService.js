const axios = require('axios');
const config = require('../../config');
const logger = require('../../utils/logger');
const { generateStandardJsonInput } = require('../../utils/contracts');

/**
 * Verify a contract on Etherscan or compatible API (Polygonscan, etc.)
 * @param {string} contractAddress - Deployed contract address
 * @param {string} chainId - Chain ID where the contract is deployed
 * @param {object} verificationData - Data needed for verification
 * @param {string} verificationData.contractName - Name of the contract
 * @param {string} verificationData.compilerVersion - Solidity compiler version
 * @param {boolean} verificationData.optimizationEnabled - Whether optimization is enabled
 * @param {number} verificationData.optimizationRuns - Number of optimization runs
 * @returns {Promise<object>} Verification result
 */
async function verifyContractEtherscan(contractAddress, chainId, verificationData) {
  try {
    const chainConfig = config.chains[chainId];
    if (!chainConfig) {
      throw new Error(`Chain configuration not found for chain ID: ${chainId}`);
    }
    
    if (chainConfig.verifier !== 'etherscan' && 
        chainConfig.verifier !== 'polygonscan' && 
        chainConfig.verifier !== 'basescan') {
      throw new Error(`Unsupported verifier for chain ID: ${chainId}`);
    }
    
    const apiKey = config.apiKeys[chainConfig.verifier];
    if (!apiKey) {
      throw new Error(`API key not found for ${chainConfig.verifier}`);
    }
    
    logger.info(`Verifying contract ${contractAddress} on ${chainConfig.name} (${chainConfig.verifier})`);
    
    // Get the standard JSON input for verification
    const standardInput = JSON.stringify(
      generateStandardJsonInput(verificationData.contractName)
    );
    
    // Prepare the request data
    const data = new URLSearchParams();
    data.append('apikey', apiKey);
    data.append('module', 'contract');
    data.append('action', 'verifysourcecode');
    data.append('contractaddress', contractAddress);
    data.append('sourceCode', standardInput);
    data.append('codeformat', 'solidity-standard-json-input');
    data.append('contractname', `contracts/${verificationData.contractName}.sol:${verificationData.contractName}`);
    data.append('compilerversion', `v${verificationData.compilerVersion}`);
    data.append('optimizationUsed', verificationData.optimizationEnabled ? '1' : '0');
    data.append('runs', verificationData.optimizationRuns.toString());
    data.append('evmversion', 'london');
    
    // Make the API request
    const apiUrl = chainConfig.apiUrl;
    if (!apiUrl) {
      throw new Error(`API URL not found in config for chain ID: ${chainId}`);
    }
    const response = await axios.post(apiUrl, data, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    logger.debug(`Etherscan API response: ${JSON.stringify(response.data)}`);
    
    if (response.data && response.data.status === '1') {
      logger.info(`Verification submitted for ${contractAddress} on ${chainConfig.name}. GUID: ${response.data.result}`);
      
      // Check verification status (this could be moved to a separate function for polling)
      const verificationStatus = await checkEtherscanVerificationStatus(
        response.data.result, 
        chainConfig.explorerUrl,
        apiKey,
        chainConfig.apiUrl
      );
      
      return {
        success: true,
        status: verificationStatus.status,
        message: verificationStatus.message,
        explorerUrl: `${chainConfig.explorerUrl}/address/${contractAddress}#code`,
        guid: response.data.result
      };
    } else {
      const errorMsg = response.data && response.data.result ? response.data.result : 'Unknown error';
      logger.error(`Verification submission failed: ${errorMsg}`);
      return {
        success: false,
        status: 'failed',
        message: errorMsg
      };
    }
  } catch (error) {
    logger.error(`Contract verification failed for ${contractAddress} on chain ${chainId}: ${error.message}`);
    return {
      success: false,
      status: 'failed',
      message: error.message
    };
  }
}

/**
 * Check verification status on Etherscan-compatible APIs
 * @param {string} guid - Verification GUID
 * @param {string} explorerUrl - Block explorer URL
 * @param {string} apiKey - API key for the explorer
 * @param {string} apiUrl - API URL for the explorer
 * @returns {Promise<object>} Verification status
 */
async function checkEtherscanVerificationStatus(guid, explorerUrl, apiKey, apiUrl) {
  try {
    // Prepare the request data
    const data = new URLSearchParams();
    data.append('apikey', apiKey);
    data.append('module', 'contract');
    data.append('action', 'checkverifystatus');
    data.append('guid', guid);
    
    // Make the API request
    const effectiveApiUrl = apiUrl;
    if (!effectiveApiUrl) {
      logger.warn(`API URL not provided for checking status on ${explorerUrl}, attempting to construct one.`);
      effectiveApiUrl = `${explorerUrl}/api`; // Fallback, might not work
    }
    const response = await axios.get(`${effectiveApiUrl}?${data.toString()}`);
    
    if (response.data.status === '1') {
      logger.info(`Verification successful: ${response.data.result}`);
      return {
        status: 'verified',
        message: response.data.result
      };
    } else {
      // Status could be either "Pending in queue" or a failure
      const isPending = response.data.result.includes('Pending');
      logger.info(`Verification ${isPending ? 'pending' : 'failed'}: ${response.data.result}`);
      
      return {
        status: isPending ? 'pending' : 'failed',
        message: response.data.result
      };
    }
  } catch (error) {
    logger.error(`Failed to check verification status: ${error.message}`);
    return {
      status: 'error',
      message: error.message
    };
  }
}

/**
 * Try to verify using Blockscout V2 API as a fallback
 * @param {string} contractAddress - Deployed contract address
 * @param {object} verificationData - Verification data
 * @param {string} chainName - Name of the chain for logging
 * @returns {Promise<object>} Verification result
 */
async function tryBlockscoutV2Api(contractAddress, verificationData, chainName) {
  try {
    logger.info(`Trying Blockscout V2 API for ${contractAddress}`);
    
    // Get the standard JSON input for verification
    const standardInput = generateStandardJsonInput(verificationData.contractName);
    
    // Prepare the request data for Blockscout V2 API
    const requestData = {
      address: contractAddress,
      name: verificationData.contractName,
      compilerVersion: `v${verificationData.compilerVersion}`,
      optimization: verificationData.optimizationEnabled,
      optimizationRuns: verificationData.optimizationRuns,
      sourceCode: standardInput,
      evmVersion: "london",
      contractLibraries: {}
    };
    
    // Make the API request to the V2 endpoint
    const v2ApiUrl = 'https://zetachain-testnet.blockscout.com/api/v2/verifier/solidity/sources';
    
    const response = await axios.post(v2ApiUrl, requestData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    logger.debug(`Blockscout V2 API response: ${JSON.stringify(response.data)}`);
    
    if (response.status === 200 && response.data && response.data.message === 'OK') {
      logger.info(`V2 API verification submitted successfully for ${contractAddress} on ${chainName}`);
      
      return {
        success: true,
        status: 'pending',
        message: 'Contract verification submitted successfully via V2 API',
        explorerUrl: `https://zetachain-testnet.blockscout.com/address/${contractAddress}/contracts`
      };
    } else {
      logger.error(`V2 API verification failed: ${JSON.stringify(response.data)}`);
      return {
        success: false,
        status: 'failed',
        message: response.data.message || 'Unknown error'
      };
    }
  } catch (error) {
    logger.error(`V2 API verification failed: ${error.message}`);
    logger.error(error.stack);
    return {
      success: false,
      status: 'failed',
      message: error.message
    };
  }
}

/**
 * Verify a contract on Blockscout
 * @param {string} contractAddress - Deployed contract address
 * @param {string} chainId - Chain ID where the contract is deployed
 * @param {object} verificationData - Data needed for verification
 * @param {string} verificationData.contractName - Name of the contract
 * @param {string} verificationData.compilerVersion - Solidity compiler version
 * @param {boolean} verificationData.optimizationEnabled - Whether optimization is enabled
 * @param {number} verificationData.optimizationRuns - Number of optimization runs
 * @returns {Promise<object>} Verification result
 */
async function verifyContractBlockscout(contractAddress, chainId, verificationData) {
  try {
    const chainConfig = config.chains[chainId];
    if (!chainConfig) {
      throw new Error(`Chain configuration not found for chain ID: ${chainId}`);
    }
    
    if (chainConfig.verifier !== 'blockscout') {
      throw new Error(`Unsupported verifier for chain ID: ${chainId}`);
    }
    
    logger.info(`Verifying contract ${contractAddress} on ${chainConfig.name} (Blockscout Standard API)`);
    
    // Get the standard JSON input for verification
    const standardInput = generateStandardJsonInput(verificationData.contractName);
    
    // Use the direct ZetaChain testnet Blockscout API endpoint
    const blockscoutApiUrl = 'https://zetachain-testnet.blockscout.com/api';
    
    const formData = new URLSearchParams();
    formData.append('module', 'contract');
    formData.append('action', 'verifysourcecode');
    formData.append('contractaddress', contractAddress);
    formData.append('compilerversion', `v${verificationData.compilerVersion}`);
    formData.append('sourceCode', standardInput);
    formData.append('contractname', `contracts/${verificationData.contractName}.sol:${verificationData.contractName}`);
    formData.append('optimizationUsed', verificationData.optimizationEnabled ? '1' : '0');
    formData.append('runs', verificationData.optimizationRuns.toString());
    formData.append('codeformat', 'solidity-standard-json-input');
    
    // Make the API request
    const response = await axios.post(blockscoutApiUrl, formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    logger.debug(`Blockscout API response: ${JSON.stringify(response.data)}`);
    
    if (response.status === 200 && response.data) {
      // Check if verification was accepted
      if (response.data.status === '1' || response.data.message === 'OK') {
        logger.info(`Verification submitted successfully for ${contractAddress} on ${chainConfig.name}`);
        
        return {
          success: true,
          status: 'pending',
          message: 'Contract verification submitted successfully',
          explorerUrl: `https://zetachain-testnet.blockscout.com/address/${contractAddress}/contracts`
        };
      } else {
        logger.error(`Verification submission failed: ${response.data.result || response.data.message || 'Unknown error'}`);
        return {
          success: false,
          status: 'failed',
          message: response.data.result || response.data.message || 'Unknown error'
        };
      }
    } else {
      logger.error(`Verification submission failed with status: ${response.status}`);
      return {
        success: false,
        status: 'failed',
        message: `HTTP Error: ${response.status}`
      };
    }
  } catch (error) {
    logger.error(`Contract verification failed for ${contractAddress} on chain ${chainId}: ${error.message}`);
    logger.error(error.stack);
    return {
      success: false,
      status: 'failed',
      message: error.message
    };
  }
}

/**
 * Verify a contract on the appropriate block explorer
 * @param {string} contractAddress - Deployed contract address
 * @param {string} chainId - Chain ID where the contract is deployed
 * @param {string} contractName - Name of the contract to verify
 * @returns {Promise<object>} Verification result
 */
async function verifyContract(contractAddress, chainId, contractName) {
  try {
    const chainConfig = config.chains[chainId];
    if (!chainConfig) {
      throw new Error(`Chain configuration not found for chain ID: ${chainId}`);
    }
    
    // Common verification data
    const verificationData = {
      contractName: contractName,
      compilerVersion: '0.8.26',
      optimizationEnabled: true,
      optimizationRuns: 200
    };
    
    // Determine which verifier to use
    if (chainConfig.verifier === 'blockscout') {
      return await verifyContractBlockscout(contractAddress, chainId, verificationData);
    } else if (['etherscan', 'polygonscan', 'basescan'].includes(chainConfig.verifier)) {
      return await verifyContractEtherscan(contractAddress, chainId, verificationData);
    } else {
      throw new Error(`Unsupported verifier for chain ID: ${chainId}`);
    }
  } catch (error) {
    logger.error(`Contract verification failed for ${contractAddress} on chain ${chainId}: ${error.message}`);
    return {
      success: false,
      status: 'failed',
      message: error.message
    };
  }
}

module.exports = {
  verifyContract,
  verifyContractEtherscan,
  verifyContractBlockscout,
  checkEtherscanVerificationStatus
}; 