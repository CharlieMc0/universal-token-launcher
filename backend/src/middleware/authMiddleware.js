const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/constants');

/**
 * Authentication middleware to verify JWT tokens
 */
const authenticateToken = (req, res, next) => {
  // For development bypass
  if (process.env.DEBUG === 'true' && process.env.AUTH_BYPASS_ENABLED === 'true') {
    req.wallet = process.env.TEST_WALLET_ADDRESS || '0x1234567890abcdef1234567890abcdef12345678';
    return next();
  }

  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN format
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication token is required' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.wallet = decoded.wallet;
    next();
  } catch (error) {
    console.error('JWT Verification Error:', error);
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

module.exports = {
  authenticateToken
}; 