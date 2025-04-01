const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const { DeploymentLog } = require('../models');
const { getNetworkByChainId } = require('../config/networks');

/**
 * Get all deployment logs for a token
 */
router.get('/token/:tokenId', authenticateToken, async (req, res) => {
  try {
    const deployments = await DeploymentLog.findAll({
      where: { tokenConfigId: req.params.tokenId },
      order: [['createdAt', 'DESC']]
    });

    // Enrich deployment logs with network information
    const enrichedDeployments = deployments.map(deployment => {
      const network = getNetworkByChainId(deployment.chainId);
      return {
        ...deployment.toJSON(),
        network: network ? {
          name: network.name,
          chainId: network.chainId,
          explorerUrl: network.explorerUrl
        } : null
      };
    });

    res.json(enrichedDeployments);
  } catch (error) {
    console.error('Error getting deployments:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get deployment log by ID
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const deployment = await DeploymentLog.findByPk(req.params.id);
    if (!deployment) {
      return res.status(404).json({ error: 'Deployment log not found' });
    }

    // Enrich deployment log with network information
    const network = getNetworkByChainId(deployment.chainId);
    const enrichedDeployment = {
      ...deployment.toJSON(),
      network: network ? {
        name: network.name,
        chainId: network.chainId,
        explorerUrl: network.explorerUrl
      } : null
    };

    res.json(enrichedDeployment);
  } catch (error) {
    console.error('Error getting deployment:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get deployment status summary
 */
router.get('/token/:tokenId/summary', authenticateToken, async (req, res) => {
  try {
    const deployments = await DeploymentLog.findAll({
      where: { tokenConfigId: req.params.tokenId }
    });

    // Calculate status summary
    const summary = deployments.reduce((acc, deployment) => {
      acc[deployment.status] = (acc[deployment.status] || 0) + 1;
      return acc;
    }, {});

    // Get network information for each deployment
    const networkInfo = deployments.map(deployment => {
      const network = getNetworkByChainId(deployment.chainId);
      return {
        chainId: deployment.chainId,
        chainName: network ? network.name : 'Unknown Network',
        status: deployment.status,
        contractAddress: deployment.contractAddress,
        transactionHash: deployment.transactionHash,
        errorMessage: deployment.errorMessage
      };
    });

    res.json({
      summary,
      deployments: networkInfo
    });
  } catch (error) {
    console.error('Error getting deployment summary:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 