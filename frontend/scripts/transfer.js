// Transfer Service for handling token transfers between chains

const TransferService = {
    // Current token and transfers
    activeTokenId: null,
    userTokens: [],
    userTransfers: [],
    
    // Initialize transfer functionality
    init() {
        this._setupEventListeners();
    },
    
    // Load transfer form with token data
    async loadTransferForm(tokenId) {
        this.activeTokenId = tokenId;
        
        try {
            // Fetch token data if not already loaded
            if (!this.userTokens.length) {
                await this.loadUserTokens();
            }
            
            // Fetch transfers
            await this.loadUserTransfers(tokenId);
            
            // Show transfer form
            document.getElementById('transfer-form').classList.remove('hidden');
            
            // Populate token dropdown
            this._populateTokenDropdown();
            
            // If tokenId is specified, select it
            if (tokenId) {
                const tokenSelect = document.getElementById('transfer-token');
                if (tokenSelect) {
                    tokenSelect.value = tokenId;
                    this._handleTokenChange({ target: tokenSelect });
                }
            }
        } catch (error) {
            console.error('Error loading transfer form:', error);
            showModal('Error', error.message || 'Failed to load transfer form', true);
        }
    },
    
    // Load user tokens
    async loadUserTokens() {
        try {
            // In a real implementation, this would fetch all tokens owned by the user
            // For simplicity, if we have an activeTokenId, just fetch that one
            if (this.activeTokenId) {
                const token = await ApiService.getToken(this.activeTokenId);
                this.userTokens = [token];
            } else {
                // Mock data for demo
                this.userTokens = [];
            }
            
            // Populate token list
            this._updateTokenList();
            
            return this.userTokens;
        } catch (error) {
            console.error('Error loading user tokens:', error);
            showModal('Error', 'Failed to load your tokens', true);
            return [];
        }
    },
    
    // Load user transfers
    async loadUserTransfers(tokenId = null) {
        try {
            const transfers = await ApiService.getUserTransfers(tokenId);
            this.userTransfers = transfers;
            return transfers;
        } catch (error) {
            console.error('Error loading transfers:', error);
            showModal('Error', 'Failed to load your transfer history', true);
            return [];
        }
    },
    
    // Create a new transfer
    async createTransfer(event) {
        event.preventDefault();
        
        // Validate form
        const tokenId = document.getElementById('transfer-token').value;
        const sourceChain = document.getElementById('source-chain').value;
        const destinationChain = document.getElementById('destination-chain').value;
        const amount = document.getElementById('transfer-amount').value;
        
        if (!tokenId || !sourceChain || !destinationChain || !amount) {
            showModal('Error', 'All fields are required', true);
            return;
        }
        
        if (sourceChain === destinationChain) {
            showModal('Error', 'Source and destination chains must be different', true);
            return;
        }
        
        if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
            showModal('Error', 'Amount must be a positive number', true);
            return;
        }
        
        try {
            // Show loading state
            showModal('Processing', 'Creating transfer transaction...');
            
            // Create transfer request
            const transferData = {
                token_config_id: parseInt(tokenId),
                source_chain: sourceChain,
                destination_chain: destinationChain,
                token_amount: amount
            };
            
            // Call API to create transfer
            const transfer = await ApiService.createTransfer(transferData);
            
            // In a real implementation, this would trigger the actual token transfer
            // For this demo, we'll just show success and reset form
            
            showModal('Success', 'Transfer initiated successfully. Token transfer is being processed.');
            
            // Reset form
            document.getElementById('transfer-token-form').reset();
            
            // Reload transfers
            await this.loadUserTransfers(tokenId);
            
        } catch (error) {
            console.error('Error creating transfer:', error);
            showModal('Error', error.message || 'Failed to create transfer', true);
        }
    },
    
    // Update token list UI
    _updateTokenList() {
        const tokenListElement = document.getElementById('token-list');
        
        if (!tokenListElement) return;
        
        if (!this.userTokens.length) {
            tokenListElement.innerHTML = '<p>No tokens found. Create a token first.</p>';
            return;
        }
        
        let html = '';
        
        this.userTokens.forEach(token => {
            html += `
                <div class="card token-card" data-token-id="${token.id}">
                    <h3>${token.token_name} (${token.token_symbol})</h3>
                    <p>Status: ${token.deployment_status}</p>
                    <div class="token-balance">
                        <span>Total Supply: ${token.total_supply}</span>
                        <button class="btn-primary token-transfer-btn" data-token-id="${token.id}">Transfer</button>
                    </div>
                </div>
            `;
        });
        
        tokenListElement.innerHTML = html;
        
        // Add event listeners to transfer buttons
        document.querySelectorAll('.token-transfer-btn').forEach(button => {
            button.addEventListener('click', () => {
                const tokenId = button.getAttribute('data-token-id');
                this.loadTransferForm(tokenId);
            });
        });
    },
    
    // Populate token dropdown
    _populateTokenDropdown() {
        const tokenSelect = document.getElementById('transfer-token');
        
        if (!tokenSelect) return;
        
        // Clear existing options
        tokenSelect.innerHTML = '';
        
        // Add tokens
        this.userTokens.forEach(token => {
            const option = document.createElement('option');
            option.value = token.id;
            option.textContent = `${token.token_name} (${token.token_symbol})`;
            tokenSelect.appendChild(option);
        });
        
        // Add change event listener
        tokenSelect.addEventListener('change', this._handleTokenChange.bind(this));
    },
    
    // Handle token selection change
    _handleTokenChange(event) {
        const tokenId = event.target.value;
        const token = this.userTokens.find(t => t.id.toString() === tokenId);
        
        if (!token) return;
        
        // Populate chain dropdowns
        this._populateChainDropdowns(token);
    },
    
    // Populate chain dropdowns
    _populateChainDropdowns(token) {
        const sourceChainSelect = document.getElementById('source-chain');
        const destChainSelect = document.getElementById('destination-chain');
        
        if (!sourceChainSelect || !destChainSelect) return;
        
        // Clear existing options
        sourceChainSelect.innerHTML = '';
        destChainSelect.innerHTML = '';
        
        // Get deployments to determine which chains have the token
        // In a real implementation, we would fetch this data from the API
        // For now, use all supported chains
        
        CONFIG.SUPPORTED_CHAINS.forEach(chain => {
            // Add to source chain
            const sourceOption = document.createElement('option');
            sourceOption.value = chain.id;
            sourceOption.textContent = chain.name;
            sourceChainSelect.appendChild(sourceOption);
            
            // Add to destination chain
            const destOption = document.createElement('option');
            destOption.value = chain.id;
            destOption.textContent = chain.name;
            destChainSelect.appendChild(destOption);
        });
        
        // Set default values
        if (sourceChainSelect.options.length > 0) {
            sourceChainSelect.selectedIndex = 0;
        }
        
        if (destChainSelect.options.length > 1) {
            destChainSelect.selectedIndex = 1;
        }
    },
    
    // Set up event listeners
    _setupEventListeners() {
        // Transfer form submission
        const transferForm = document.getElementById('transfer-token-form');
        if (transferForm) {
            transferForm.addEventListener('submit', this.createTransfer.bind(this));
        }
    }
}; 