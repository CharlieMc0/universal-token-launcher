// Wallet Integration Service

const WalletService = {
    // State variables
    isConnected: false,
    walletAddress: null,
    provider: null,
    signer: null,
    authToken: null,
    
    // Initialize wallet service
    async init() {
        // Check for existing connection/token
        this.authToken = localStorage.getItem('auth_token');
        
        // Attempt to connect if we detect provider
        if (window.ethereum) {
            this.provider = new ethers.providers.Web3Provider(window.ethereum);
            
            // Check if previously connected
            try {
                const accounts = await this.provider.listAccounts();
                if (accounts.length > 0) {
                    await this.connectWallet(false); // Silent connection
                }
            } catch (error) {
                console.error('Error checking wallet status:', error);
            }
        }
        
        // Setup event listeners
        this._setupEventListeners();
    },
    
    // Connect to wallet
    async connectWallet(showPrompt = true) {
        if (!window.ethereum) {
            showModal('Error', 'No Ethereum wallet detected. Please install MetaMask or another compatible wallet.', true);
            return false;
        }
        
        try {
            let accounts;
            if (showPrompt) {
                // Request account access if needed
                accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            } else {
                accounts = await this.provider.listAccounts();
            }
            
            if (accounts.length === 0) {
                return false; // No accounts - user rejected or not connected
            }
            
            // Set up provider and signer
            this.provider = new ethers.providers.Web3Provider(window.ethereum);
            this.signer = this.provider.getSigner();
            this.walletAddress = accounts[0].toLowerCase();
            this.isConnected = true;
            
            // Show wallet address in UI
            this._updateWalletUI();
            
            // If we don't have an auth token, authenticate
            if (!this.authToken) {
                await this.authenticate();
            }
            
            // Check ZETA balance if connected
            if (this.isConnected) {
                await this.checkZetaBalance();
            }
            
            return true;
        } catch (error) {
            console.error('Error connecting to wallet:', error);
            if (showPrompt) {
                showModal('Connection Error', 'Failed to connect to wallet: ' + error.message, true);
            }
            return false;
        }
    },
    
    // Authenticate with backend
    async authenticate() {
        try {
            // Get nonce from server
            const response = await fetch(`${CONFIG.API_URL}/auth/nonce/${this.walletAddress}`);
            const data = await response.json();
            
            // Sign message with wallet
            const signature = await this.signer.signMessage(data.message);
            
            // Verify signature with backend
            const authResponse = await fetch(`${CONFIG.API_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    wallet_address: this.walletAddress,
                    signature: signature,
                    nonce: data.nonce
                })
            });
            
            if (!authResponse.ok) {
                throw new Error('Authentication failed');
            }
            
            const authData = await authResponse.json();
            this.authToken = authData.access_token;
            
            // Store in local storage
            localStorage.setItem('auth_token', this.authToken);
            
            return true;
        } catch (error) {
            console.error('Authentication error:', error);
            this.authToken = null;
            localStorage.removeItem('auth_token');
            return false;
        }
    },
    
    // Disconnect wallet
    disconnect() {
        this.isConnected = false;
        this.walletAddress = null;
        this.authToken = null;
        localStorage.removeItem('auth_token');
        this._updateWalletUI();
        
        // Redirect to landing page
        document.querySelectorAll('.app-view').forEach(view => {
            view.classList.add('hidden');
        });
        document.getElementById('landing-view').classList.remove('hidden');
    },
    
    // Check ZETA balance
    async checkZetaBalance() {
        if (!this.isConnected) return 0;
        
        try {
            // In a real implementation, we'd check the actual ZETA balance
            // on the ZetaChain network by calling the ZETA token contract
            
            // For the demo, just return a random balance
            const balance = Math.random() * 10;
            document.getElementById('zeta-balance').textContent = balance.toFixed(2);
            
            return balance;
        } catch (error) {
            console.error('Error checking ZETA balance:', error);
            return 0;
        }
    },
    
    // Send transaction
    async sendTransaction(to, value, data = '') {
        if (!this.isConnected) {
            throw new Error('Wallet not connected');
        }
        
        try {
            const tx = {
                to: to,
                value: ethers.utils.parseEther(value.toString())
            };
            
            if (data) {
                tx.data = data;
            }
            
            const transaction = await this.signer.sendTransaction(tx);
            
            return {
                hash: transaction.hash,
                wait: async () => await transaction.wait()
            };
        } catch (error) {
            console.error('Transaction error:', error);
            throw error;
        }
    },
    
    // Get current chain ID
    async getChainId() {
        if (!this.provider) return null;
        try {
            const network = await this.provider.getNetwork();
            return network.chainId.toString();
        } catch (error) {
            console.error('Error getting chain ID:', error);
            return null;
        }
    },
    
    // Request chain switch
    async switchChain(chainId) {
        if (!this.provider) return false;
        
        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: `0x${parseInt(chainId).toString(16)}` }],
            });
            return true;
        } catch (error) {
            console.error('Error switching chain:', error);
            return false;
        }
    },
    
    // Get authentication headers
    getAuthHeaders() {
        if (!this.authToken) return {};
        return {
            'Authorization': `Bearer ${this.authToken}`
        };
    },
    
    // Private method for event listeners
    _setupEventListeners() {
        // Listen for account changes
        if (window.ethereum) {
            window.ethereum.on('accountsChanged', async (accounts) => {
                if (accounts.length === 0) {
                    // User disconnected wallet
                    this.disconnect();
                } else {
                    // User switched account - reconnect
                    this.walletAddress = null;
                    this.authToken = null;
                    localStorage.removeItem('auth_token');
                    await this.connectWallet(false);
                }
            });
            
            // Listen for chain changes
            window.ethereum.on('chainChanged', () => {
                // Refresh the page on chain change
                window.location.reload();
            });
        }
        
        // Connect wallet button
        const connectButton = document.getElementById('connect-wallet');
        if (connectButton) {
            connectButton.addEventListener('click', async () => {
                await this.connectWallet();
            });
        }
    },
    
    // Private method to update UI
    _updateWalletUI() {
        const connectButton = document.getElementById('connect-wallet');
        const walletAddressElement = document.getElementById('wallet-address');
        
        if (this.isConnected && this.walletAddress) {
            // Update wallet display
            const shortAddress = this.walletAddress.slice(0, 6) + '...' + this.walletAddress.slice(-4);
            walletAddressElement.textContent = shortAddress;
            
            // Show address, hide connect button
            connectButton.classList.add('hidden');
            walletAddressElement.classList.remove('hidden');
        } else {
            // Hide address, show connect button
            connectButton.classList.remove('hidden');
            walletAddressElement.classList.add('hidden');
        }
    }
};

// Helper function for showing modals
function showModal(title, message, isError = false) {
    const modal = document.getElementById('status-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalMessage = document.getElementById('modal-message');
    
    modalTitle.textContent = title;
    modalMessage.textContent = message;
    
    if (isError) {
        modalTitle.style.color = 'var(--error)';
    } else {
        modalTitle.style.color = 'var(--text-primary)';
    }
    
    modal.classList.remove('hidden');
    
    // Add event listeners
    const closeButton = document.querySelector('.close-modal');
    const confirmButton = document.getElementById('modal-confirm');
    
    const closeModal = () => {
        modal.classList.add('hidden');
        closeButton.removeEventListener('click', closeModal);
        confirmButton.removeEventListener('click', closeModal);
    };
    
    closeButton.addEventListener('click', closeModal);
    confirmButton.addEventListener('click', closeModal);
} 