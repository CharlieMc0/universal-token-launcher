// For the MVP, we'll use a simple middleware that gets or sets the wallet address from the request
// In a production environment, this should be replaced with proper JWT-based authentication

const getCurrentWallet = (req, res, next) => {
  console.log(`[DEBUG AUTH] Request path: ${req.path}`);
  
  // DEVELOPMENT MODE - BYPASS AUTHENTICATION
  // ALWAYS extract wallet from URL params if available
  if (req.params && req.params.walletAddress) {
    console.log(`[DEBUG AUTH] Using wallet from URL params: ${req.params.walletAddress}`);
    req.wallet = req.params.walletAddress;
    return next();
  }
  
  // Check if request includes a wallet address in headers or query params
  const wallet = req.headers['x-wallet-address'] || req.query.wallet;
  
  // FOR DEVELOPMENT: Always enable debug mode
  const isDebugMode = true; // Override to always be true for development
  
  if (!wallet && !isDebugMode) {
    return res.status(401).json({ message: 'No wallet address provided' });
  }
  
  // For development/testing, always use test wallet if no wallet provided
  if (!wallet) {
    const testWallet = process.env.TEST_WALLET_ADDRESS || '0x04dA1034E7d84c004092671bBcEb6B1c8DCda7AE';
    console.log(`[DEBUG AUTH] Using test wallet: ${testWallet}`);
    req.wallet = testWallet;
    return next();
  }
  
  // Set the wallet address in the request object
  req.wallet = wallet;
  next();
};

module.exports = {
  getCurrentWallet
}; 