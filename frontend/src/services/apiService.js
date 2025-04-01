/**
 * API Service for the Universal Token Launcher
 * Handles communication with the backend API endpoints
 */

class ApiService {
  constructor() {
    // Use environment variable for API URL or default to localhost in development
    this.baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
    console.log('API URL:', this.baseUrl);
    this.walletAddress = null;
  }

  /**
   * Set the connected wallet address
   * @param {string} address - Wallet address
   */
  setWalletAddress(address) {
    this.walletAddress = address;
    console.log('Set wallet address:', address);
  }

  /**
   * Get auth header with the connected wallet address
   * @private
   * @param {boolean} includeContentType - Whether to include Content-Type in the headers
   * @returns {Object} Header object with Authorization
   */
  _getAuthHeader(includeContentType = true) {
    const headers = {};

    // Add Content-Type if requested
    if (includeContentType) {
      headers['Content-Type'] = 'application/json';
    }
    
    // Add wallet address if available
    if (this.walletAddress) {
      headers['X-Wallet-Address'] = this.walletAddress;
    }

    return headers;
  }

  /**
   * Generic fetch wrapper with error handling
   * @private
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Fetch options
   * @returns {Promise<any>} Response data
   */
  async _fetchWithErrorHandling(endpoint, options = {}) {
    try {
      console.log(`Making API request to: ${this.baseUrl}${endpoint}`);
      
      // Always include wallet address in query params for all requests
      // This is a fallback in case headers aren't processed correctly
      const separator = endpoint.includes('?') ? '&' : '?';
      const walletParam = this.walletAddress ? `${separator}wallet=${this.walletAddress}` : '';
      const url = `${this.baseUrl}${endpoint}${walletParam}`;
      
      const response = await fetch(url, {
        ...options,
        mode: 'cors',
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', response.status, errorText);
        throw new Error(`API Error (${response.status}): ${errorText || 'Unknown error'}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Error in ${options.method || 'GET'} ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Create a new token configuration
   * @param {FormData} formData - Token configuration data
   * @returns {Promise<Object>} Token configuration response
   */
  async createToken(formData) {
    return this._fetchWithErrorHandling('/api/tokens', {
      method: 'POST',
      body: formData,
      headers: {
        // Remove Content-Type header - browser will set it automatically with boundary
        'X-Wallet-Address': this.walletAddress
      },
    });
  }

  /**
   * Start token deployment process with fee payment transaction
   * @param {number} tokenId - Token configuration ID
   * @param {Object} deployData - Deployment data with transaction hash
   * @returns {Promise<Object>} Deployment response
   */
  async deployToken(tokenId, deployData) {
    return this._fetchWithErrorHandling(`/api/tokens/${tokenId}/deploy`, {
      method: 'POST',
      headers: this._getAuthHeader(true),
      body: JSON.stringify(deployData),
    });
  }

  /**
   * Get token configuration details
   * @param {number} tokenId - Token configuration ID
   * @returns {Promise<Object>} Token configuration details
   */
  async getToken(tokenId) {
    return this._fetchWithErrorHandling(`/api/tokens/${tokenId}`);
  }

  /**
   * Get all tokens created by the current wallet
   * @returns {Promise<Array>} List of token configurations
   */
  async getTokens() {
    return this._fetchWithErrorHandling('/api/tokens');
  }

  /**
   * Get deployment logs for a token
   * @param {number} tokenId - Token configuration ID
   * @returns {Promise<Array>} List of deployment logs
   */
  async getDeploymentLogs(tokenId) {
    return this._fetchWithErrorHandling(`/api/tokens/${tokenId}/logs`);
  }

  /**
   * Get all universal tokens held by a user
   * @param {string} walletAddress - User's wallet address
   * @returns {Promise<Array>} List of tokens with balances
   */
  async getUserTokens(walletAddress) {
    return this._fetchWithErrorHandling(`/api/users/${walletAddress}/tokens`);
  }
  
  /**
   * Transfer tokens between chains
   * @param {Object} transferData - Transfer details
   * @returns {Promise<Object>} Transfer result
   */
  async transferTokens(transferData) {
    return this._fetchWithErrorHandling('/api/transfers', {
      method: 'POST',
      headers: this._getAuthHeader(true),
      body: JSON.stringify(transferData),
    });
  }
}

// Create and export a singleton instance
const apiService = new ApiService();
export default apiService; 