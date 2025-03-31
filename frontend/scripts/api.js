// API Service for interacting with backend

const ApiService = {
    // Base API URL
    baseUrl: CONFIG.API_URL,
    
    // Helper to handle API responses
    async _handleResponse(response) {
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `API Error: ${response.status}`);
        }
        return await response.json();
    },
    
    // Create token configuration
    async createToken(formData) {
        try {
            const response = await fetch(`${this.baseUrl}/tokens`, {
                method: 'POST',
                headers: {
                    ...WalletService.getAuthHeaders()
                    // No content-type as we're using FormData
                },
                body: formData
            });
            
            return await this._handleResponse(response);
        } catch (error) {
            console.error('Error creating token:', error);
            throw error;
        }
    },
    
    // Get token configuration
    async getToken(tokenId) {
        try {
            const response = await fetch(`${this.baseUrl}/tokens/${tokenId}`, {
                method: 'GET',
                headers: {
                    ...WalletService.getAuthHeaders()
                }
            });
            
            return await this._handleResponse(response);
        } catch (error) {
            console.error('Error fetching token:', error);
            throw error;
        }
    },
    
    // Trigger deployment after fee payment
    async deployToken(tokenId, feePaymentTxHash) {
        try {
            const response = await fetch(`${this.baseUrl}/tokens/${tokenId}/deploy`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...WalletService.getAuthHeaders()
                },
                body: JSON.stringify({
                    fee_paid_tx: feePaymentTxHash
                })
            });
            
            return await this._handleResponse(response);
        } catch (error) {
            console.error('Error deploying token:', error);
            throw error;
        }
    },
    
    // Get deployment logs
    async getDeploymentLogs(tokenId) {
        try {
            const response = await fetch(`${this.baseUrl}/tokens/${tokenId}/deployments`, {
                method: 'GET',
                headers: {
                    ...WalletService.getAuthHeaders()
                }
            });
            
            return await this._handleResponse(response);
        } catch (error) {
            console.error('Error fetching deployment logs:', error);
            throw error;
        }
    },
    
    // Create transfer transaction
    async createTransfer(transferData) {
        try {
            const response = await fetch(`${this.baseUrl}/transfers`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...WalletService.getAuthHeaders()
                },
                body: JSON.stringify(transferData)
            });
            
            return await this._handleResponse(response);
        } catch (error) {
            console.error('Error creating transfer:', error);
            throw error;
        }
    },
    
    // Get transfer status
    async getTransfer(transferId) {
        try {
            const response = await fetch(`${this.baseUrl}/transfers/${transferId}`, {
                method: 'GET',
                headers: {
                    ...WalletService.getAuthHeaders()
                }
            });
            
            return await this._handleResponse(response);
        } catch (error) {
            console.error('Error fetching transfer:', error);
            throw error;
        }
    },
    
    // Get user transfers
    async getUserTransfers(tokenId = null) {
        try {
            let url = `${this.baseUrl}/transfers`;
            if (tokenId) {
                url += `?token_id=${tokenId}`;
            }
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    ...WalletService.getAuthHeaders()
                }
            });
            
            return await this._handleResponse(response);
        } catch (error) {
            console.error('Error fetching user transfers:', error);
            throw error;
        }
    }
}; 