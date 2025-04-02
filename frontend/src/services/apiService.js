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
    const response = await api.post('/deploy', tokenData);
    return response.data;
  } catch (error) {
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
  try {
    const response = await api.get(`/tokens/${tokenId}`);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
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
    return response.data.chains;
  } catch (error) {
    return handleApiError(error);
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
    const response = await api.post('/verify', verificationData);
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