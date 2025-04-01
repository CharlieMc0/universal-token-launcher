const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const { TokenDistribution, TokenConfiguration } = require('../models');
const { getNetworkByChainId } = require('../config/networks');
const { DISTRIBUTION_STATUS } = require('../config/constants');

/**
 * Get all distribution records for a token
 */
router.get('/token/:tokenId', authenticateToken, async (req, res) => {
  try {
    const distributions = await TokenDistribution.findAll({
      where: { tokenConfigId: req.params.tokenId },
      order: [['createdAt', 'DESC']]
    });

    // Enrich distribution records with network information
    const enrichedDistributions = distributions.map(distribution => {
      const network = getNetworkByChainId(distribution.chainId);
      return {
        ...distribution.toJSON(),
        network: network ? {
          name: network.name,
          chainId: network.chainId,
          explorerUrl: network.explorerUrl
        } : null
      };
    });

    res.json(enrichedDistributions);
  } catch (error) {
    console.error('Error getting distributions:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get distribution record by ID
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const distribution = await TokenDistribution.findByPk(req.params.id);
    if (!distribution) {
      return res.status(404).json({ error: 'Distribution record not found' });
    }

    // Enrich distribution record with network information
    const network = getNetworkByChainId(distribution.chainId);
    const enrichedDistribution = {
      ...distribution.toJSON(),
      network: network ? {
        name: network.name,
        chainId: network.chainId,
        explorerUrl: network.explorerUrl
      } : null
    };

    res.json(enrichedDistribution);
  } catch (error) {
    console.error('Error getting distribution:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get distribution status summary
 */
router.get('/token/:tokenId/summary', authenticateToken, async (req, res) => {
  try {
    const distributions = await TokenDistribution.findAll({
      where: { tokenConfigId: req.params.tokenId }
    });

    // Calculate status summary
    const summary = distributions.reduce((acc, distribution) => {
      acc[distribution.status] = (acc[distribution.status] || 0) + 1;
      return acc;
    }, {});

    // Get network information for each distribution
    const networkInfo = distributions.map(distribution => {
      const network = getNetworkByChainId(distribution.chainId);
      return {
        chainId: distribution.chainId,
        chainName: network ? network.name : 'Unknown Network',
        status: distribution.status,
        recipientAddress: distribution.recipientAddress,
        tokenAmount: distribution.tokenAmount,
        transactionHash: distribution.transactionHash,
        errorMessage: distribution.errorMessage
      };
    });

    res.json({
      summary,
      distributions: networkInfo
    });
  } catch (error) {
    console.error('Error getting distribution summary:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Retry failed distribution
 */
router.post('/:id/retry', authenticateToken, async (req, res) => {
  try {
    const distribution = await TokenDistribution.findByPk(req.params.id);
    if (!distribution) {
      return res.status(404).json({ error: 'Distribution record not found' });
    }

    // Verify token ownership
    const tokenConfig = await TokenConfiguration.findByPk(distribution.tokenConfigId);
    if (!tokenConfig || tokenConfig.creatorWallet !== req.wallet) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Reset status to pending
    distribution.status = DISTRIBUTION_STATUS.PENDING;
    distribution.errorMessage = null;
    await distribution.save();

    res.json(distribution);
  } catch (error) {
    console.error('Error retrying distribution:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 