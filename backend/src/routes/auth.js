const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { ethers } = require('ethers');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config/constants');

/**
 * Authenticate wallet and generate JWT token
 */
router.post('/authenticate', async (req, res) => {
  try {
    const { wallet, signature, message } = req.body;

    if (!wallet || !signature || !message) {
      return res.status(400).json({
        error: 'Missing required fields: wallet, signature, message'
      });
    }

    // Verify wallet signature
    const recoveredAddress = ethers.verifyMessage(message, signature);
    if (recoveredAddress.toLowerCase() !== wallet.toLowerCase()) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { wallet },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN * 60 } // Convert minutes to seconds
    );

    res.json({
      token,
      expiresIn: JWT_EXPIRES_IN * 60,
      wallet
    });
  } catch (error) {
    console.error('Error authenticating wallet:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Verify JWT token
 */
router.get('/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({
      valid: true,
      wallet: decoded.wallet
    });
  } catch (error) {
    console.error('Error verifying token:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router; 