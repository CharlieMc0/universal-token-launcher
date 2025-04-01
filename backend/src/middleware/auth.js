// For the MVP, we'll use a simple middleware that gets or sets the wallet address from the request
// In a production environment, this should be replaced with proper JWT-based authentication

const getCurrentWallet = (req, res, next) => {
  // Check if request includes a wallet address in headers or query params
  const wallet = req.headers['x-wallet-address'] || req.query.wallet;
  
  // Check for debug mode via environment variable or debug header
  const isDebugMode = process.env.DEBUG === 'true' || req.headers['x-debug-mode'] === 'true';
  
  if (!wallet && !isDebugMode) {
    return res.status(401).json({ message: 'No wallet address provided' });
  }
  
  // For development/testing, allow setting a test wallet
  if (isDebugMode && !wallet) {
    req.wallet = process.env.TEST_WALLET_ADDRESS; // Using correct env var for test wallet
    console.log(`[DEBUG] Using test wallet: ${req.wallet}`);
    return next();
  }
  
  // Set the wallet address in the request object
  req.wallet = wallet;
  next();
};

module.exports = {
  getCurrentWallet
}; 