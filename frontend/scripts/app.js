// Main Application Script

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize services
    await WalletService.init();
    TokenService.init();
    TransferService.init();
    
    // Show appropriate view based on wallet connection
    if (WalletService.isConnected) {
        document.getElementById('landing-view').classList.add('hidden');
        document.getElementById('creator-view').classList.remove('hidden');
    }
    
    // Set up navigation
    setupNavigation();
    
    // Set up modal functionality
    setupModal();
    
    // Update fee display
    document.getElementById('zeta-fee').textContent = CONFIG.FIXED_ZETA_FEE;
});

// Set up navigation between views
function setupNavigation() {
    // Add event to close modal when clicking outside content
    document.getElementById('status-modal').addEventListener('click', (event) => {
        if (event.target.id === 'status-modal') {
            document.getElementById('status-modal').classList.add('hidden');
        }
    });
}

// Set up modal functionality
function setupModal() {
    // Close modal when clicking X
    document.querySelector('.close-modal').addEventListener('click', () => {
        document.getElementById('status-modal').classList.add('hidden');
    });
    
    // Close modal when clicking OK button
    document.getElementById('modal-confirm').addEventListener('click', () => {
        document.getElementById('status-modal').classList.add('hidden');
    });
}

// Function to switch views
function switchView(viewId) {
    // Hide all views
    document.querySelectorAll('.app-view').forEach(view => {
        view.classList.add('hidden');
    });
    
    // Show requested view
    document.getElementById(viewId).classList.remove('hidden');
} 