const express = require('express');
const deploymentService = require('../services/deployment/deploymentService');
const verificationService = require('../services/verification/verificationService');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * @route POST /api/deploy
 * @desc Deploy Universal Token contracts on multiple chains
 * @access Public
 */
router.post('/deploy', async (req, res) => {
  try {
    const { 
      tokenName, 
      tokenSymbol, 
      decimals, 
      totalSupply, 
      selectedChains, 
      deployerAddress,
      allocations
    } = req.body;
    
    // Validate required inputs
    if (!tokenName || !tokenSymbol || !selectedChains || !deployerAddress) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        details: 'tokenName, tokenSymbol, selectedChains, and deployerAddress are required'
      });
    }
    
    // Parse totalSupply and decimals
    const parsedTotalSupply = totalSupply || '1000000000000000000000'; // Default 1000 tokens
    const parsedDecimals = parseInt(decimals || '18', 10);
    
    // Validate selectedChains is an array
    if (!Array.isArray(selectedChains)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid selectedChains',
        details: 'selectedChains must be an array of chain IDs'
      });
    }
    
    // Validate allocations if provided
    let parsedAllocations = [];
    if (allocations) {
      if (!Array.isArray(allocations)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid allocations',
          details: 'allocations must be an array of { address, amount } objects'
        });
      }
      
      // Validate each allocation
      for (const allocation of allocations) {
        if (!allocation.address || !allocation.amount) {
          return res.status(400).json({
            success: false,
            message: 'Invalid allocation format',
            details: 'Each allocation must have an address and amount'
          });
        }
        
        // Check if address is valid
        if (!allocation.address.match(/^0x[a-fA-F0-9]{40}$/)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid allocation address',
            details: `Address ${allocation.address} is not a valid Ethereum address`
          });
        }
        
        // Check if amount is valid
        try {
          const amount = BigInt(allocation.amount);
          if (amount <= 0n) throw new Error('Amount must be positive');
          
          parsedAllocations.push({
            address: allocation.address,
            amount: allocation.amount
          });
        } catch (error) {
          return res.status(400).json({
            success: false,
            message: 'Invalid allocation amount',
            details: `Amount for address ${allocation.address} is not a valid number: ${error.message}`
          });
        }
      }
    }
    
    // Start deployment
    logger.info(`Starting deployment of token ${tokenName} (${tokenSymbol}) on chains: ${selectedChains.join(', ')}`);
    
    const tokenConfig = {
      tokenName,
      tokenSymbol,
      decimals: parsedDecimals,
      totalSupply: parsedTotalSupply,
      allocations: parsedAllocations
    };
    
    // Deploy tokens
    const deploymentResult = await deploymentService.deployUniversalToken(
      tokenConfig,
      selectedChains,
      deployerAddress
    );
    
    // Check for deployment errors
    let hasErrors = false;
    let errorDetails = [];
    
    // Check for ZetaChain errors
    if (deploymentResult.zetaChain && deploymentResult.zetaChain.error) {
      hasErrors = true;
      errorDetails.push(`ZetaChain: ${deploymentResult.zetaChain.message}`);
    }
    
    // Check for EVM chain errors
    for (const chainId in deploymentResult.evmChains) {
      if (deploymentResult.evmChains[chainId].error) {
        hasErrors = true;
        errorDetails.push(`Chain ${chainId}: ${deploymentResult.evmChains[chainId].message}`);
      }
    }
    
    // Start verification for each successfully deployed contract
    const verificationPromises = [];
    
    // Verify ZetaChain contract if deployed without errors
    if (deploymentResult.zetaChain && !deploymentResult.zetaChain.error) {
      verificationPromises.push(
        verificationService.verifyContract(
          deploymentResult.zetaChain.contractAddress,
          '7001', // ZetaChain testnet
          'ZetaChainUniversalToken'
        ).catch(err => {
          logger.error(`Failed to verify ZetaChain contract: ${err.message}`);
          return { success: false, message: err.message };
        })
      );
    }
    
    // Verify EVM contracts that were deployed without errors
    for (const chainId in deploymentResult.evmChains) {
      if (deploymentResult.evmChains.hasOwnProperty(chainId) && 
          !deploymentResult.evmChains[chainId].error) {
        const evmDeployment = deploymentResult.evmChains[chainId];
        verificationPromises.push(
          verificationService.verifyContract(
            evmDeployment.contractAddress,
            chainId,
            'EVMUniversalToken'
          ).catch(err => {
            logger.error(`Failed to verify contract on chain ${chainId}: ${err.message}`);
            return { success: false, message: err.message };
          })
        );
      }
    }
    
    // Wait for all verifications (but don't block response)
    Promise.all(verificationPromises)
      .then(() => {
        logger.info('All contract verifications completed');
      })
      .catch(error => {
        logger.error(`Some contract verifications failed: ${error.message}`);
      });
    
    // Return deployment result to client
    if (hasErrors) {
      // Partial success - some deployments succeeded but others failed
      res.status(207).json({
        success: true,
        message: 'Deployment partially successful',
        details: 'Some chains were deployed successfully, but others encountered errors',
        errors: errorDetails,
        deployment: deploymentResult,
        verificationStatus: 'pending'
      });
    } else {
      // Complete success
      res.status(200).json({
        success: true,
        message: 'Deployment successful',
        deployment: deploymentResult,
        verificationStatus: 'pending'
      });
    }
  } catch (error) {
    logger.error(`Deployment failed: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Deployment failed',
      details: error.message
    });
  }
});

/**
 * @route POST /api/verify
 * @desc Verify a deployed contract
 * @access Public
 */
router.post('/verify', async (req, res) => {
  try {
    const { contractAddress, chainId, contractType } = req.body;
    
    // Validate required inputs
    if (!contractAddress || !chainId || !contractType) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        details: 'contractAddress, chainId, and contractType are required'
      });
    }
    
    // Determine contract name based on type
    let contractName;
    if (contractType === 'zetachain') {
      contractName = 'ZetaChainUniversalToken';
    } else if (contractType === 'evm') {
      contractName = 'EVMUniversalToken';
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid contractType',
        details: 'contractType must be either "zetachain" or "evm"'
      });
    }
    
    // Start verification
    logger.info(`Starting verification of ${contractName} at ${contractAddress} on chain ${chainId}`);
    
    const verificationResult = await verificationService.verifyContract(
      contractAddress,
      chainId,
      contractName
    );
    
    res.status(200).json({
      success: verificationResult.success,
      message: verificationResult.message,
      status: verificationResult.status,
      explorerUrl: verificationResult.explorerUrl
    });
  } catch (error) {
    logger.error(`Verification failed: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Verification failed',
      details: error.message
    });
  }
});

/**
 * @route GET /api/chains
 * @desc Get all supported chains
 * @access Public
 */
router.get('/chains', (req, res) => {
  try {
    const chains = Object.entries(require('../config').chains).map(([id, chain]) => ({
      id,
      name: chain.name,
      isTestnet: chain.isTestnet,
      isZetaChain: chain.isZetaChain
    }));
    
    res.status(200).json({
      success: true,
      chains
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get chains',
      details: error.message
    });
  }
});

module.exports = router; 