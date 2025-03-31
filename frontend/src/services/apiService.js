/**
 * API Service for the Universal Token Launcher
 * Handles communication with the backend API endpoints
 */

class ApiService {
  constructor() {
    // Use environment variable for API URL or default to localhost in development
    this.baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
  }

  /**
   * Get auth header with the connected wallet address
   * @private
   * @returns {Object} Header object with Authorization
   */
  _getAuthHeader() {
    // This would be enhanced later to use actual JWT tokens
    // For now, during development, there's likely a bypass on the backend
    return {
      'Content-Type': 'application/json',
    };
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
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
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
    return this._fetchWithErrorHandling('/api/v1/tokens', {
      method: 'POST',
      body: formData,
      headers: {
        // No Content-Type for FormData (browser will set it with boundary)
        ...this._getAuthHeader(),
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
    return this._fetchWithErrorHandling(`/api/v1/tokens/${tokenId}/deploy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this._getAuthHeader(),
      },
      body: JSON.stringify(deployData),
    });
  }

  /**
   * Get token configuration details
   * @param {number} tokenId - Token configuration ID
   * @returns {Promise<Object>} Token configuration details
   */
  async getToken(tokenId) {
    return this._fetchWithErrorHandling(`/api/v1/tokens/${tokenId}`);
  }

  /**
   * Get all tokens created by the current wallet
   * @returns {Promise<Array>} List of token configurations
   */
  async getTokens() {
    return this._fetchWithErrorHandling('/api/v1/tokens');
  }

  /**
   * Get deployment logs for a token
   * @param {number} tokenId - Token configuration ID
   * @returns {Promise<Array>} List of deployment logs
   */
  async getDeploymentLogs(tokenId) {
    return this._fetchWithErrorHandling(`/api/v1/tokens/${tokenId}/deployments`);
  }

  /**
   * Get all universal tokens held by a user
   * @param {string} walletAddress - User's wallet address
   * @returns {Promise<Array>} List of tokens with balances
   */
  async getUserTokens(walletAddress) {
    // MOCK IMPLEMENTATION - Replace with actual API call when backend is ready
    // In production this would be:
    // return this._fetchWithErrorHandling(`/api/v1/users/${walletAddress}/tokens`);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Mock data
    return [
      {
        id: 'token1',
        name: 'My Universal Token',
        symbol: 'MUT',
        deployedChains: ['7001', '11155111', '97'],
        balances: {
          '7001': '1000',
          '11155111': '500',
          '97': '750'
        }
      },
      {
        id: 'token2',
        name: 'Another Token',
        symbol: 'ATK',
        deployedChains: ['7001', '84532'],
        balances: {
          '7001': '2000',
          '84532': '1500'
        }
      }
    ];
  }
  
  /**
   * Transfer tokens between chains
   * @param {Object} transferData - Transfer details
   * @returns {Promise<Object>} Transfer result
   */
  async transferTokens(transferData) {
    // MOCK IMPLEMENTATION - Replace with actual API call when backend is ready
    // In production this would be:
    // return this._fetchWithErrorHandling('/api/v1/transfers', {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     ...this._getAuthHeader(),
    //   },
    //   body: JSON.stringify(transferData),
    // });
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1200));
    
    // Mock successful transfer
    return {
      success: true,
      transactionHash: '0x' + Math.random().toString(16).substring(2, 42),
      sourceChain: transferData.sourceChain,
      destinationChains: transferData.destinationChain,
      amount: transferData.transferAmount
    };
  }
}

// Create and export a singleton instance
const apiService = new ApiService();
export default apiService; 