// Token Service for handling token creation and deployment

const TokenService = {
    // Current token data
    currentToken: null,
    
    // Initialize token functionality
    init() {
        // Add event listeners
        this._setupEventListeners();
        
        // Initialize CSV handling
        this._setupCSVHandling();
    },
    
    // Create a new token
    async createToken(event) {
        event.preventDefault();
        
        // Validate form
        if (!this._validateTokenForm()) {
            return;
        }
        
        try {
            // Get selected chains
            const selectedChains = [];
            document.querySelectorAll('.chain-checkbox:checked').forEach(checkbox => {
                selectedChains.push(checkbox.value);
            });
            
            if (selectedChains.length === 0) {
                showModal('Error', 'Please select at least one chain for deployment', true);
                return;
            }
            
            // Create FormData object
            const formData = new FormData();
            formData.append('token_name', document.getElementById('token-name').value);
            formData.append('token_symbol', document.getElementById('token-symbol').value);
            formData.append('decimals', document.getElementById('token-decimals').value);
            formData.append('total_supply', document.getElementById('token-supply').value);
            formData.append('selected_chains', JSON.stringify(selectedChains));
            
            // Add icon if provided
            const iconFile = document.getElementById('token-icon').files[0];
            if (iconFile) {
                formData.append('icon', iconFile);
            }
            
            // Add distributions if provided
            const distributionsFile = document.getElementById('token-distributions').files[0];
            let distributions = [];
            
            if (distributionsFile) {
                // Parse CSV file
                distributions = await this._parseCSVFile(distributionsFile);
                if (!distributions) {
                    return; // Error while parsing
                }
                
                // Add distributions as JSON
                formData.append('distributions_json', JSON.stringify(distributions));
            }
            
            // Show loading
            showModal('Creating Token', 'Please wait while we create your token configuration...');
            
            // Call API to create token
            const tokenResponse = await ApiService.createToken(formData);
            
            // Store token data
            this.currentToken = tokenResponse;
            
            // Update UI for deployment phase
            this._showDeploymentView();
            
        } catch (error) {
            console.error('Error creating token:', error);
            showModal('Error', error.message || 'Failed to create token configuration', true);
        }
    },
    
    // Pay fee and deploy token
    async payFeeAndDeploy() {
        if (!this.currentToken) {
            showModal('Error', 'No token configuration found', true);
            return;
        }
        
        try {
            // Get fee amount from config
            const feeAmount = CONFIG.FIXED_ZETA_FEE;
            
            // Check if on ZetaChain
            const currentChainId = await WalletService.getChainId();
            if (currentChainId !== CONFIG.ZETA_CHAIN_ID) {
                const switchConfirm = confirm(`You need to switch to ZetaChain to pay the fee. Switch now?`);
                if (!switchConfirm) {
                    return;
                }
                
                const switched = await WalletService.switchChain(CONFIG.ZETA_CHAIN_ID);
                if (!switched) {
                    showModal('Error', 'Failed to switch to ZetaChain', true);
                    return;
                }
            }
            
            // Send ZETA fee transaction
            showModal('Processing', `Sending ${feeAmount} ZETA fee payment...`);
            
            const tx = await WalletService.sendTransaction(
                CONFIG.UNIVERSAL_TOKEN_SERVICE_WALLET,
                feeAmount
            );
            
            showModal('Transaction Sent', `Fee payment transaction sent! Tx hash: ${tx.hash}`);
            
            // Update UI with pending status
            document.getElementById('deployment-steps').innerHTML = `
                <div class="deployment-step">
                    <span class="step-status status-pending">⌛</span>
                    <span>Fee payment transaction sent (${tx.hash.slice(0, 6)}...${tx.hash.slice(-4)})</span>
                </div>
            `;
            
            // Wait for transaction confirmation
            try {
                await tx.wait();
                
                // Update UI
                document.getElementById('deployment-steps').innerHTML = `
                    <div class="deployment-step">
                        <span class="step-status status-success">✓</span>
                        <span>Fee payment confirmed (${tx.hash.slice(0, 6)}...${tx.hash.slice(-4)})</span>
                    </div>
                    <div class="deployment-step">
                        <span class="step-status status-pending">⌛</span>
                        <span>Initiating contract deployment...</span>
                    </div>
                `;
                
                // Trigger deployment on backend
                const deploymentResponse = await ApiService.deployToken(this.currentToken.id, tx.hash);
                
                // Update current token data
                this.currentToken = deploymentResponse;
                
                // Start polling for deployment status
                this._pollDeploymentStatus();
                
            } catch (waitError) {
                console.error('Transaction confirmation error:', waitError);
                showModal('Error', 'Transaction failed to confirm', true);
                
                // Update UI
                document.getElementById('deployment-steps').innerHTML = `
                    <div class="deployment-step">
                        <span class="step-status status-error">✗</span>
                        <span>Fee payment failed (${tx.hash.slice(0, 6)}...${tx.hash.slice(-4)})</span>
                    </div>
                `;
            }
            
        } catch (error) {
            console.error('Fee payment error:', error);
            showModal('Error', error.message || 'Failed to send fee payment', true);
        }
    },
    
    // Poll for deployment status
    async _pollDeploymentStatus() {
        if (!this.currentToken) return;
        
        // Create polling interval
        const pollingInterval = setInterval(async () => {
            try {
                // Get updated token data
                const tokenData = await ApiService.getToken(this.currentToken.id);
                
                // Update current token
                this.currentToken = tokenData;
                
                // Get deployment logs
                const deploymentLogs = await ApiService.getDeploymentLogs(this.currentToken.id);
                
                // Update UI
                let deploymentStepsHTML = `
                    <div class="deployment-step">
                        <span class="step-status status-success">✓</span>
                        <span>Fee payment confirmed</span>
                    </div>
                    <div class="deployment-step">
                        <span class="step-status ${tokenData.deployment_status === 'completed' ? 'status-success' : 'status-pending'}">
                            ${tokenData.deployment_status === 'completed' ? '✓' : '⌛'}
                        </span>
                        <span>Contract deployment: ${tokenData.deployment_status}</span>
                    </div>
                `;
                
                // Add chain-specific deployment status
                deploymentLogs.forEach(log => {
                    deploymentStepsHTML += `
                        <div class="deployment-step">
                            <span class="step-status ${this._getStatusClass(log.status)}">
                                ${this._getStatusIcon(log.status)}
                            </span>
                            <span>${log.chain_name} deployment: ${log.status}</span>
                        </div>
                    `;
                });
                
                document.getElementById('deployment-steps').innerHTML = deploymentStepsHTML;
                
                // If deployment is complete, show transfer button
                if (tokenData.deployment_status === 'completed') {
                    document.getElementById('pay-fee').classList.add('hidden');
                    document.getElementById('view-transfers').classList.remove('hidden');
                    
                    // Stop polling
                    clearInterval(pollingInterval);
                }
                
                // If deployment failed, stop polling
                if (tokenData.deployment_status === 'failed') {
                    clearInterval(pollingInterval);
                }
                
            } catch (error) {
                console.error('Error polling deployment status:', error);
                clearInterval(pollingInterval);
            }
        }, 5000); // Poll every 5 seconds
    },
    
    // Show deployment view with token details
    _showDeploymentView() {
        if (!this.currentToken) return;
        
        // Hide creator view, show deployment view
        document.getElementById('creator-view').classList.add('hidden');
        document.getElementById('deployment-view').classList.remove('hidden');
        
        // Update token details
        document.getElementById('token-details').innerHTML = `
            <div>
                <strong>Name:</strong> ${this.currentToken.token_name}
            </div>
            <div>
                <strong>Symbol:</strong> ${this.currentToken.token_symbol}
            </div>
            <div>
                <strong>Decimals:</strong> ${this.currentToken.decimals}
            </div>
            <div>
                <strong>Total Supply:</strong> ${this.currentToken.total_supply}
            </div>
            <div>
                <strong>Status:</strong> ${this.currentToken.deployment_status}
            </div>
        `;
        
        // Set initial deployment steps
        document.getElementById('deployment-steps').innerHTML = `
            <div class="deployment-step">
                <span class="step-status status-pending">⌛</span>
                <span>Waiting for fee payment...</span>
            </div>
        `;
    },
    
    // Parse CSV file for token distribution
    async _parseCSVFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (event) => {
                const csv = event.target.result;
                const lines = csv.split('\n');
                const distributions = [];
                
                let hasErrors = false;
                let errorMessage = '';
                
                // Check max rows
                if (lines.length > CONFIG.MAX_CSV_ROWS) {
                    showModal('Error', `CSV file exceeds maximum of ${CONFIG.MAX_CSV_ROWS} rows`, true);
                    resolve(null);
                    return;
                }
                
                // Process each line
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i].trim();
                    if (!line) continue; // Skip empty lines
                    
                    const columns = line.split(',');
                    
                    // Validate format
                    if (columns.length !== 3) {
                        hasErrors = true;
                        errorMessage = `Invalid format at line ${i + 1}. Expected: address,chain_id,amount`;
                        break;
                    }
                    
                    const [address, chainId, amount] = columns;
                    
                    // Validate address
                    if (!address.match(/^0x[a-fA-F0-9]{40}$/)) {
                        hasErrors = true;
                        errorMessage = `Invalid Ethereum address at line ${i + 1}: ${address}`;
                        break;
                    }
                    
                    // Validate chain ID
                    if (!CONFIG.SUPPORTED_CHAINS.some(chain => chain.id === chainId)) {
                        hasErrors = true;
                        errorMessage = `Invalid chain ID at line ${i + 1}: ${chainId}`;
                        break;
                    }
                    
                    // Validate amount
                    if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
                        hasErrors = true;
                        errorMessage = `Invalid amount at line ${i + 1}: ${amount}`;
                        break;
                    }
                    
                    // Add to distributions
                    distributions.push({
                        recipient_address: address,
                        chain_id: chainId,
                        token_amount: amount
                    });
                }
                
                if (hasErrors) {
                    showModal('CSV Error', errorMessage, true);
                    resolve(null);
                } else {
                    resolve(distributions);
                }
            };
            
            reader.onerror = (error) => {
                showModal('Error', 'Failed to read CSV file', true);
                resolve(null);
            };
            
            reader.readAsText(file);
        });
    },
    
    // Validate token form
    _validateTokenForm() {
        const tokenName = document.getElementById('token-name').value;
        if (!tokenName) {
            showModal('Error', 'Token name is required', true);
            return false;
        }
        
        const tokenSymbol = document.getElementById('token-symbol').value;
        if (!tokenSymbol) {
            showModal('Error', 'Token symbol is required', true);
            return false;
        }
        
        if (tokenSymbol.length > 8) {
            showModal('Error', 'Token symbol must be 8 characters or less', true);
            return false;
        }
        
        const decimals = parseInt(document.getElementById('token-decimals').value);
        if (isNaN(decimals) || decimals < 0 || decimals > 18) {
            showModal('Error', 'Decimals must be a number between 0 and 18', true);
            return false;
        }
        
        const totalSupply = document.getElementById('token-supply').value;
        if (!totalSupply || isNaN(parseFloat(totalSupply)) || parseFloat(totalSupply) <= 0) {
            showModal('Error', 'Total supply must be a positive number', true);
            return false;
        }
        
        return true;
    },
    
    // Set up event listeners
    _setupEventListeners() {
        const tokenForm = document.getElementById('token-form');
        if (tokenForm) {
            tokenForm.addEventListener('submit', this.createToken.bind(this));
        }
        
        const payFeeButton = document.getElementById('pay-fee');
        if (payFeeButton) {
            payFeeButton.addEventListener('click', this.payFeeAndDeploy.bind(this));
        }
        
        const viewTransfersButton = document.getElementById('view-transfers');
        if (viewTransfersButton) {
            viewTransfersButton.addEventListener('click', () => {
                // Hide deployment view, show holder view
                document.getElementById('deployment-view').classList.add('hidden');
                document.getElementById('holder-view').classList.remove('hidden');
                
                // Load transfers if needed
                TransferService.loadTransferForm(this.currentToken.id);
            });
        }
    },
    
    // Set up CSV file handling
    _setupCSVHandling() {
        const csvInput = document.getElementById('token-distributions');
        if (csvInput) {
            csvInput.addEventListener('change', (event) => {
                const file = event.target.files[0];
                if (file) {
                    // Show file name
                    const fileName = document.createElement('div');
                    fileName.textContent = `Selected file: ${file.name}`;
                    fileName.style.marginTop = '4px';
                    fileName.style.fontSize = '14px';
                    
                    const existingFileName = csvInput.parentNode.querySelector('div');
                    if (existingFileName) {
                        existingFileName.remove();
                    }
                    
                    csvInput.parentNode.appendChild(fileName);
                }
            });
        }
    },
    
    // Helper to get status class
    _getStatusClass(status) {
        switch (status) {
            case 'completed':
            case 'success':
                return 'status-success';
            case 'failed':
            case 'error':
                return 'status-error';
            default:
                return 'status-pending';
        }
    },
    
    // Helper to get status icon
    _getStatusIcon(status) {
        switch (status) {
            case 'completed':
            case 'success':
                return '✓';
            case 'failed':
            case 'error':
                return '✗';
            default:
                return '⌛';
        }
    }
}; 