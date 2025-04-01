const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const tokenService = require('../services/tokenService');

/**
 * Create a new token configuration
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      tokenName,
      tokenSymbol,
      decimals,
      totalSupply,
      iconUrl,
      selectedChains,
      csvDataRaw
    } = req.body;

    const tokenConfig = await tokenService.createTokenConfiguration({
      tokenName,
      tokenSymbol,
      decimals,
      totalSupply,
      creatorWallet: req.wallet,
      iconUrl,
      selectedChains,
      csvDataRaw
    });

    res.status(201).json(tokenConfig);
  } catch (error) {
    console.error('Error creating token:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get token configuration by ID
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const tokenConfig = await tokenService.getTokenConfiguration(
      req.params.id,
      req.wallet
    );
    res.json(tokenConfig);
  } catch (error) {
    console.error('Error getting token:', error);
    res.status(404).json({ error: error.message });
  }
});

/**
 * Update deployment status with fee payment
 */
router.post('/:id/deploy', authenticateToken, async (req, res) => {
  try {
    const { feeTxHash } = req.body;
    if (!feeTxHash) {
      return res.status(400).json({ error: 'Fee transaction hash is required' });
    }

    const tokenConfig = await tokenService.updateDeploymentStatus(
      req.params.id,
      feeTxHash
    );
    res.json(tokenConfig);
  } catch (error) {
    console.error('Error updating deployment status:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get deployment logs for a token
 */
router.get('/:id/deployments', authenticateToken, async (req, res) => {
  try {
    const deployments = await tokenService.getTokenDeployments(req.params.id);
    res.json(deployments);
  } catch (error) {
    console.error('Error getting deployments:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get distribution records for a token
 */
router.get('/:id/distributions', authenticateToken, async (req, res) => {
  try {
    const distributions = await tokenService.getTokenDistributions(req.params.id);
    res.json(distributions);
  } catch (error) {
    console.error('Error getting distributions:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 