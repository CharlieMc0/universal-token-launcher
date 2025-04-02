const express = require('express');
const { deployAndConnectTokens } = require('../services/deployService');
const logger = require('../utils/logger');

const router = express.Router();

router.post('/deploy', async (req, res) => {
  const {
    tokenName,
    tokenSymbol,
    decimals,
    totalSupply,
    selectedChains, // Array of chain IDs as strings
    deployerAddress // The final owner address
  } = req.body;

  // Basic validation
  if (!tokenName || !tokenSymbol || decimals === undefined || !totalSupply || !selectedChains || !Array.isArray(selectedChains) || selectedChains.length === 0 || !deployerAddress) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields: tokenName, tokenSymbol, decimals, totalSupply, selectedChains (array), deployerAddress'
    });
  }

  if (typeof decimals !== 'number' || !Number.isInteger(decimals) || decimals < 0 || decimals > 18) {
      return res.status(400).json({ success: false, message: 'Decimals must be an integer between 0 and 18.' });
  }

  // Basic address validation (simple check)
  if (!/^0x[a-fA-F0-9]{40}$/.test(deployerAddress)) {
      return res.status(400).json({ success: false, message: 'Invalid deployerAddress format.' });
  }

  // TODO: Add more robust validation (e.g., check chain IDs are supported)

  try {
    logger.info(`Received deployment request for token: ${tokenName} (${tokenSymbol}) for owner ${deployerAddress}`);
    const result = await deployAndConnectTokens(
      tokenName,
      tokenSymbol,
      decimals,
      totalSupply,
      selectedChains,
      deployerAddress
    );

    logger.info(`Deployment request successful. Deployment ID: ${result.deploymentId}`);
    res.status(200).json({
      success: true,
      message: 'Deployment process initiated successfully.',
      // Return the full results or just the ID? Returning ID for now.
      deploymentId: result.deploymentId,
      // Optionally return full details:
      // deploymentDetails: result
    });
  } catch (error) {
    logger.error(`Deployment request failed: ${error.message}`, { error: error });
    res.status(500).json({
      success: false,
      message: error.message || 'Deployment failed due to an internal error.',
      deploymentId: error.deploymentId || null // Include ID if available even on error
    });
  }
});

module.exports = router; 