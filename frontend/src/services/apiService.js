/**
 * API Service for the Universal Token Launcher
 * Handles communication with the backend API endpoints
 */

import axios from 'axios';
import { getChainName, organizeTokensForTransfer } from '../utils/tokenUtils';

// API base URL, configurable through env vars
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// Create an axios instance for API calls
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Store user wallet address for API calls
let currentWalletAddress = null;

/**
 * Set the wallet address for API calls
 * 
 * @param {string|null} address - User's wallet address or null to clear
 */
const setWalletAddress = (address) => {
  currentWalletAddress = address;
  console.log(`Wallet address set to: ${address || 'none'}`);
};

// Error handler helper
const handleApiError = (error) => {
  const errorMsg = error.response?.data?.message || error.message || 'An unknown error occurred';
  console.error('API Error:', errorMsg);
  throw new Error(errorMsg);
};

/**
 * Deploy a Universal Token using the new unified deployment endpoint
 * 
 * @param {Object} tokenData - Token deployment data
 * @returns {Promise<Object>} - Deployment result
 */
export const deployUniversalToken = async (tokenData) => {
  try {
    // Convert camelCase to snake_case for API compatibility
    const apiData = {
      token_name: tokenData.tokenName,
      token_symbol: tokenData.tokenSymbol,
      decimals: tokenData.decimals,
      total_supply: tokenData.totalSupply,
      selected_chains: tokenData.selectedChains,
      deployer_address: tokenData.deployerAddress,
      allocations: tokenData.allocations
    };
    
    // Log the data being sent to help debug validation issues
    console.log('Sending data to /deploy endpoint:');
    console.log(JSON.stringify(apiData, null, 2));
    
    const response = await api.post('/deploy', apiData);
    return response.data;
  } catch (error) {
    console.error('Error details:', error.response?.data || error.message);
    return handleApiError(error);
  }
};

/**
 * Get user tokens with connected contracts across all chains
 * 
 * @param {string} walletAddress - User's wallet address
 * @returns {Promise<Array>} - Array of user's tokens with connected contracts
 */
export const getUserTokens = async (walletAddress) => {
  try {
    const address = walletAddress || currentWalletAddress;
    const response = await api.get(`/users/${address}/tokens`);
    const tokens = response.data;
    
    // Use the token utility to organize tokens for the transfer UI
    return organizeTokensForTransfer(tokens);
  } catch (error) {
    return handleApiError(error);
  }
};

/**
 * Get token details including all connected contracts
 * 
 * @param {string} tokenId - Token ID
 * @returns {Promise<Object>} - Token details with connected contracts
 */
export const getTokenDetails = async (tokenId) => {
  try {
    const response = await api.get(`/tokens/${tokenId}`);
    const token = response.data;
    
    // Enhance token with chain information for UI
    const chainInfo = token.chainInfo || [];
    const deployedChains = token.deployedChains || [];
    
    // Group chains by mainnet/testnet for better UI organization
    const groupedChains = {
      mainnet: chainInfo.filter(chain => !chain.isTestnet),
      testnet: chainInfo.filter(chain => chain.isTestnet)
    };
    
    return {
      ...token,
      chainInfo,
      deployedChains,
      groupedChains
    };
  } catch (error) {
    return handleApiError(error);
  }
};

/**
 * Create a new token configuration 
 * 
 * @param {FormData} formData - Token configuration form data
 * @returns {Promise<Object>} - Created token information including token ID
 */
export const createToken = async (formData) => {
  try {
    // Use axios instance but override content-type to allow form data
    const response = await api.post('/tokens', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      }
    });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

/**
 * Get a specific token by ID
 * 
 * @param {string} tokenId - Token ID
 * @returns {Promise<Object>} - Token details
 */
export const getToken = async (tokenId) => {
  // Try multiple possible API endpoints in sequence
  const possibleEndpoints = [
    `/tokens/${tokenId}`,       // Standard endpoint
    `/deploy/${tokenId}`,       // Alternate endpoint
    `/deploy?id=${tokenId}`     // Query parameter style
  ];
  
  let lastError = null;
  
  for (const endpoint of possibleEndpoints) {
    try {
      console.log(`Trying to fetch token from endpoint: ${endpoint}`);
      const response = await api.get(endpoint);
      console.log(`Success with endpoint: ${endpoint}`);
      return response.data;
    } catch (error) {
      console.log(`Error with endpoint ${endpoint}:`, error.message);
      lastError = error;
      // Continue to the next endpoint if this one failed
    }
  }
  
  // If we've tried all endpoints and none worked, throw the last error
  console.error('Error fetching token from all possible endpoints:', lastError);
  throw lastError;
};

/**
 * Trigger token deployment after fee payment
 * 
 * @param {string} tokenId - Token ID to deploy
 * @param {Object} deployData - Deployment data including fee transaction
 * @returns {Promise<Object>} - Deployment result
 */
export const deployToken = async (tokenId, deployData) => {
  try {
    const response = await api.post(`/tokens/${tokenId}/deploy`, deployData);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

/**
 * Initiate a cross-chain token transfer
 * 
 * @param {Object} transferData - Transfer parameters
 * @returns {Promise<Object>} - Transfer result
 */
export const initiateTokenTransfer = async (transferData) => {
  try {
    const response = await api.post('/transfers', transferData);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

/**
 * Get deployment logs for a token
 * 
 * @param {string} tokenId - Token ID
 * @returns {Promise<Array>} - Array of deployment logs
 */
export const getDeploymentLogs = async (tokenId) => {
  try {
    const response = await api.get(`/tokens/${tokenId}/logs`);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

/**
 * Get supported chains information
 * 
 * @returns {Promise<Array>} - Array of supported chains
 */
export const getSupportedChains = async () => {
  try {
    const response = await api.get('/chains');
    
    // Make sure we have valid chain data
    if (response.data && response.data.chains && Array.isArray(response.data.chains)) {
      return response.data.chains;
    } else {
      throw new Error('Invalid chain data format received from API');
    }
  } catch (error) {
    console.error('Error fetching supported chains:', error);
    // Rethrow to allow the UI to handle the error
    throw new Error(`Failed to load supported chains: ${error.message || 'Unknown error'}`);
  }
};

/**
 * Verify a deployed contract
 * 
 * @param {Object} verificationData - Contract verification data
 * @returns {Promise<Object>} - Verification result
 */
export const verifyContract = async (verificationData) => {
  try {
    // Convert to snake_case for API
    const apiData = {
      contract_address: verificationData.contractAddress,
      chain_id: verificationData.chainId,
      contract_type: verificationData.contractType
    };
    
    const response = await api.post('/verify', apiData);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export default {
  getUserTokens,
  getTokenDetails,
  initiateTokenTransfer,
  setWalletAddress,
  createToken,
  getToken,
  deployToken,
  getDeploymentLogs,
  deployUniversalToken,
  getSupportedChains,
  verifyContract
}; 