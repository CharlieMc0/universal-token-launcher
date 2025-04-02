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

export default {
  getUserTokens,
  getTokenDetails,
  initiateTokenTransfer,
  setWalletAddress
}; 