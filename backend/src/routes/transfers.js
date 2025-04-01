const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const transferService = require('../services/transferService');

/**
 * Initiate a cross-chain token transfer
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      tokenId,
      sourceChainId,
      destinationChainId,
      recipientAddress,
      amount
    } = req.body;

    // Validate required fields
    if (!tokenId || !sourceChainId || !destinationChainId || !recipientAddress || !amount) {
      return res.status(400).json({
        error: 'Missing required fields: tokenId, sourceChainId, destinationChainId, recipientAddress, amount'
      });
    }

    const transferResult = await transferService.initiateTransfer({
      tokenId,
      sourceChainId,
      destinationChainId,
      senderAddress: req.wallet,
      recipientAddress,
      amount
    });

    res.status(201).json(transferResult);
  } catch (error) {
    console.error('Error initiating transfer:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get transfer history for a token
 */
router.get('/:tokenId/history', authenticateToken, async (req, res) => {
  try {
    const transferHistory = await transferService.getTransferHistory(req.params.tokenId);
    res.json(transferHistory);
  } catch (error) {
    console.error('Error getting transfer history:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 