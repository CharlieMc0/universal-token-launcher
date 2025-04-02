const TokenService = require('../services/tokenService');
const { upload, parseCSV, processDistributionsFile, getIconUrl, getCsvPath } = require('../utils/fileUpload');
const chainInfo = require('../utils/chainInfo');
const logger = require('../utils/logger');
const getKnownTokens = require('../utils/getKnownTokens');

/**
 * Token controller for handling API requests
 */
class TokenController {
  /**
   * Create a new token configuration
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async createToken(req, res) {
    try {
      // Process form data from request body
      const {
        token_name,
        token_symbol,
        decimals,
        total_supply,
        selected_chains,
        distributions_json
      } = req.body;

      // Get wallet from auth middleware
      const creatorWallet = req.wallet;

      // Parse selected chains (comes as JSON string)
      let selectedChains;
      try {
        selectedChains = typeof selected_chains === 'string' ? 
          JSON.parse(selected_chains) : 
          selected_chains;
          
        if (!Array.isArray(selectedChains)) {
          return res.status(400).json({ message: 'Selected chains must be an array' });
        }
        
        // Validate chains to ensure they're supported
        const invalidChains = selectedChains.filter(chainId => !chainInfo.getChainInfo(chainId));
        if (invalidChains.length > 0) {
          return res.status(400).json({ 
            message: `Unsupported chain IDs: ${invalidChains.join(', ')}` 
          });
        }
        
        // Ensure ZetaChain is included
        const hasZetaChain = selectedChains.some(chainId => chainInfo.isZetaChain(chainId));
        if (!hasZetaChain) {
          return res.status(400).json({ 
            message: 'ZetaChain must be included in the selected chains' 
          });
        }
      } catch (error) {
        return res.status(400).json({ message: 'Invalid selected chains format' });
      }

      // Process distributions - either from JSON or CSV file
      let distributionsJson;
      
      // Check if a CSV file was uploaded
      if (req.files && req.files.distributions_csv) {
        try {
          const csvFile = req.files.distributions_csv[0];
          const csvPath = getCsvPath(csvFile.filename);
          
          // Process the CSV file
          const result = await processDistributionsFile(csvPath);
          
          if (result.validRows === 0) {
            return res.status(400).json({ 
              message: 'No valid distribution entries found in CSV file',
              errors: result.errors
            });
          }
          
          // Use the validated distributions
          distributionsJson = result.distributions;
          
          // If there were errors but also valid rows, include them in the response
          if (result.errors.length > 0) {
            console.warn(`Using ${result.validRows} valid distributions, ignoring ${result.errors.length} invalid entries`);
          }
        } catch (error) {
          return res.status(400).json({ 
            message: `Error processing CSV file: ${error.message}` 
          });
        }
      } else if (distributions_json) {
        // Parse distributions JSON (comes as JSON string)
        try {
          distributionsJson = typeof distributions_json === 'string' ? 
            JSON.parse(distributions_json) : 
            distributions_json;
            
          if (distributionsJson && !Array.isArray(distributionsJson)) {
            return res.status(400).json({ message: 'Distributions must be an array' });
          }
        } catch (error) {
          return res.status(400).json({ message: 'Invalid distributions format' });
        }
      }

      // Get icon URL if file was uploaded
      const iconUrl = req.files && req.files.icon ? getIconUrl(req.files.icon[0].filename) : null;

      // Create token configuration
      const tokenConfig = await TokenService.createTokenConfiguration({
        creatorWallet,
        tokenName: token_name,
        tokenSymbol: token_symbol,
        decimals: parseInt(decimals || 18),
        totalSupply: total_supply,
        iconUrl,
        selectedChains,
        distributionsJson
      });

      // Enhance response with formatted chain information
      const formattedChains = chainInfo.getFormattedChainInfoList(selectedChains);
      
      // Add deployment status as 'pending' for all chains at creation time
      const enhancedChainInfo = formattedChains.map(chain => ({
        ...chain,
        deploymentStatus: 'pending'
      }));

      // Return token configuration with ID
      res.status(201).json({
        message: 'Token configuration created successfully',
        tokenId: tokenConfig.id,
        ...tokenConfig.toJSON(),
        chainInfo: enhancedChainInfo, // Add formatted chain info with deployment status
        distributions: {
          count: distributionsJson ? distributionsJson.length : 0,
          source: req.files && req.files.distributions_csv ? 'csv' : 'json'
        }
      });
    } catch (error) {
      console.error(`Error creating token: ${error.message}`);
      res.status(500).json({
        message: `Failed to create token: ${error.message}`
      });
    }
  }

  /**
   * Upload and process a distributions CSV file
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async uploadDistributionsCSV(req, res) {
    try {
      // Check if file was uploaded
      if (!req.file) {
        return res.status(400).json({ message: 'No CSV file uploaded' });
      }
      
      const csvPath = getCsvPath(req.file.filename);
      
      // Process the CSV file
      const result = await processDistributionsFile(csvPath);
      
      // Return results
      res.status(200).json({
        message: 'CSV file processed successfully',
        filename: req.file.filename,
        totalRows: result.totalRows,
        validRows: result.validRows,
        distributions: result.distributions,
        errors: result.errors
      });
    } catch (error) {
      console.error(`Error processing distributions CSV: ${error.message}`);
      res.status(500).json({
        message: `Failed to process CSV file: ${error.message}`
      });
    }
  }

  /**
   * Get all token configurations
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async getTokens(req, res) {
    try {
      // Get wallet from auth middleware (if available)
      const creatorWallet = req.wallet;

      // Get tokens (filtered by creator wallet if in production/auth mode)
      const tokens = await TokenService.getTokens(
        process.env.DEBUG !== 'true' ? creatorWallet : null
      );

      // Enhance tokens with formatted chain info and contract addresses
      const enhancedTokens = await Promise.all(tokens.map(async token => {
        // Get deployment logs for this token to enhance chain info
        const deploymentLogs = await TokenService.getDeploymentLogs(token.id);
        
        // Create a map of chainId -> deployment log for easier lookup
        const deploymentLogsByChain = deploymentLogs.reduce((acc, log) => {
          acc[log.chainId] = log;
          return acc;
        }, {});

        // Get basic formatted chain info
        const formattedChains = chainInfo.getFormattedChainInfoList(token.selectedChains);
        
        // Enhance chain info with contract addresses and verification status
        const enhancedChainInfo = formattedChains.map(chain => {
          const deployLog = deploymentLogsByChain[chain.chainId];
          
          // If we have deployment info for this chain, add it to the chain info
          if (deployLog) {
            return {
              ...chain,
              contractAddress: deployLog.contractAddress || null,
              verificationStatus: deployLog.verificationStatus || 'pending',
              verificationError: deployLog.verificationError || null,
              verifiedUrl: deployLog.verifiedUrl || null,
              deploymentStatus: deployLog.status || 'pending',
              explorerUrl: deployLog.contractAddress ? 
                chainInfo.getExplorerAddressUrl(chain.chainId, deployLog.contractAddress) : null,
              // Prefer blockscout explorer if available
              blockscoutUrl: chain.blockscoutUrl ? 
                `${chain.blockscoutUrl}/address/${deployLog.contractAddress}` : null
            };
          }
          
          // If no deployment log, default status is 'pending'
          return {
            ...chain,
            deploymentStatus: 'pending'
          };
        });

        return {
          ...token.toJSON(),
          chainInfo: enhancedChainInfo
        };
      }));

      res.status(200).json(enhancedTokens);
    } catch (error) {
      console.error(`Error getting tokens: ${error.message}`);
      res.status(500).json({
        message: `Failed to get tokens: ${error.message}`
      });
    }
  }

  /**
   * Get a specific token configuration by ID
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async getTokenById(req, res) {
    try {
      const { id } = req.params;
      const creatorWallet = req.wallet;
      const isDebugMode = process.env.DEBUG === 'true' || req.headers['x-debug-mode'] === 'true';

      const token = await TokenService.getTokenById(id);

      // Check ownership in production/auth mode
      if (!isDebugMode && token.creatorWallet !== creatorWallet) {
        return res.status(403).json({ message: 'Unauthorized access to token configuration' });
      }

      // Get deployment logs to enhance chain info with contract addresses and verification status
      const deploymentLogs = await TokenService.getDeploymentLogs(id);
      
      // Create a map of chainId -> deployment log for easier lookup
      const deploymentLogsByChain = deploymentLogs.reduce((acc, log) => {
        acc[log.chainId] = log;
        return acc;
      }, {});

      // Get basic formatted chain info
      const formattedChains = chainInfo.getFormattedChainInfoList(token.selectedChains);
      
      // Enhance chain info with contract addresses and verification status
      const enhancedChainInfo = formattedChains.map(chain => {
        const deployLog = deploymentLogsByChain[chain.chainId];
        
        // If we have deployment info for this chain, add it to the chain info
        if (deployLog) {
          return {
            ...chain,
            contractAddress: deployLog.contractAddress || null,
            verificationStatus: deployLog.verificationStatus || 'pending',
            verificationError: deployLog.verificationError || null,
            verifiedUrl: deployLog.verifiedUrl || null,
            deploymentStatus: deployLog.status || 'pending',
            explorerUrl: deployLog.contractAddress ? 
              chainInfo.getExplorerAddressUrl(chain.chainId, deployLog.contractAddress) : null,
            // Prefer blockscout explorer if available
            blockscoutUrl: chain.blockscoutUrl ? 
              `${chain.blockscoutUrl}/address/${deployLog.contractAddress}` : null
          };
        }
        
        // If no deployment log, default status is 'pending'
        return {
          ...chain,
          deploymentStatus: 'pending'
        };
      });

      const enhancedToken = {
        ...token.toJSON(),
        chainInfo: enhancedChainInfo
      };

      res.status(200).json(enhancedToken);
    } catch (error) {
      console.error(`Error getting token: ${error.message}`);
      res.status(error.message.includes('not found') ? 404 : 500).json({
        message: `Failed to get token: ${error.message}`
      });
    }
  }

  /**
   * Get deployment logs for a token
   * NOTE: This function is no longer exposed via API. Frontend now uses the chainInfo from getTokenById.
   * Kept for internal use by other controller methods.
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async getDeploymentLogs(req, res) {
    try {
      const { id } = req.params;
      const creatorWallet = req.wallet;
      const isDebugMode = process.env.DEBUG === 'true' || req.headers['x-debug-mode'] === 'true';

      // Check ownership in production/auth mode
      if (!isDebugMode) {
        const token = await TokenService.getTokenById(id);
        if (token.creatorWallet !== creatorWallet) {
          return res.status(403).json({ message: 'Unauthorized access to deployment logs' });
        }
      }

      logger.info(`[Controller] Fetching deployment logs for tokenId: ${id}`);
      const logs = await TokenService.getDeploymentLogs(id);
      logger.info(`[Controller] Received ${logs ? logs.length : 0} logs from TokenService for tokenId: ${id}`);
      
      // Enhance logs with explorer URLs if transaction hash exists
      const enhancedLogs = logs.map(log => {
        const enhancedLog = log.toJSON();
        
        // Add explorer URLs if transaction hash exists
        if (log.transactionHash) {
          enhancedLog.explorerUrl = chainInfo.getExplorerTxUrl(log.chainId, log.transactionHash);
        }
        
        // Add contract explorer URL if contract address exists
        if (log.contractAddress) {
          enhancedLog.contractExplorerUrl = chainInfo.getExplorerAddressUrl(log.chainId, log.contractAddress);
        }
        
        // Add formatted chain info
        enhancedLog.chainInfo = chainInfo.getFormattedChainInfo(log.chainId);
        
        // Ensure deploymentStatus is included explicitly for consistency
        enhancedLog.deploymentStatus = log.status || 'pending';
        
        return enhancedLog;
      });
      
      logger.info(`[Controller] Sending ${enhancedLogs.length} enhanced logs for tokenId: ${id}`);
      res.status(200).json(enhancedLogs);
    } catch (error) {
      console.error(`Error getting deployment logs: ${error.message}`);
      res.status(error.message.includes('not found') ? 404 : 500).json({
        message: `Failed to get deployment logs: ${error.message}`
      });
    }
  }

  /**
   * Deploy a token based on configuration
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async deployToken(req, res) {
    try {
      const { id } = req.params;
      const { fee_paid_tx } = req.body;
      const creatorWallet = req.wallet;

      // Validate required parameters
      if (!fee_paid_tx) {
        return res.status(400).json({ message: 'Fee payment transaction hash required' });
      }

      // Check ownership in production/auth mode
      if (process.env.DEBUG !== 'true') {
        const token = await TokenService.getTokenById(id);
        if (token.creatorWallet !== creatorWallet) {
          return res.status(403).json({ message: 'Unauthorized access to deploy token' });
        }
      }

      // Deploy token - DO NOT AWAIT HERE, let it run in background
      TokenService.deployToken(id, fee_paid_tx);

      // Get ZetaChain explorer URL for the fee transaction
      const zetaChainId = chainInfo.getPrimaryZetaChainId();
      const explorerUrl = chainInfo.getExplorerTxUrl(zetaChainId, fee_paid_tx);

      res.status(200).json({
        message: 'Token deployment initiated successfully',
        tokenId: id,
        feeTxHash: fee_paid_tx,
        feeTxExplorerUrl: explorerUrl
      });
    } catch (error) {
      console.error(`Error deploying token: ${error.message}`);
      res.status(500).json({
        message: `Failed to deploy token: ${error.message}`
      });
    }
  }

  /**
   * Add distributions to an existing token from a CSV file
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async addTokenDistributions(req, res) {
    try {
      const { id } = req.params;
      const creatorWallet = req.wallet;

      // Check if token exists
      const token = await TokenService.getTokenById(id);
      
      // Check ownership in production/auth mode
      if (process.env.DEBUG !== 'true' && token.creatorWallet !== creatorWallet) {
        return res.status(403).json({ message: 'Unauthorized access to add distributions' });
      }

      // Check if file was uploaded
      if (!req.file) {
        return res.status(400).json({ message: 'No CSV file uploaded' });
      }
      
      const csvPath = getCsvPath(req.file.filename);
      
      // Process the CSV file
      const result = await processDistributionsFile(csvPath);
      
      if (result.validRows === 0) {
        return res.status(400).json({ 
          message: 'No valid distribution entries found in CSV file',
          errors: result.errors
        });
      }
      
      // Add distributions to the token
      const addedDistributions = await TokenService.addTokenDistributions(id, result.distributions);
      
      // Return success response
      res.status(200).json({
        message: `Successfully added ${addedDistributions.length} distributions to token`,
        tokenId: id,
        totalRows: result.totalRows,
        validRows: result.validRows,
        addedRows: addedDistributions.length,
        errors: result.errors
      });
    } catch (error) {
      console.error(`Error adding token distributions: ${error.message}`);
      res.status(error.message.includes('not found') ? 404 : 500).json({
        message: `Failed to add distributions: ${error.message}`
      });
    }
  }

  /**
   * Get universal tokens held by a specific user wallet address.
   * This involves querying a block explorer for tokens held on ZetaChain
   * and matching them against tokens deployed by this application.
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async getUserTokens(req, res) {
    try {
      const { walletAddress } = req.params;
      
      // Validate wallet address format (basic check)
      if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
        return res.status(400).json({ message: 'Invalid wallet address format' });
      }

      console.log(`[DEBUG-CONTROLLER] Finding tokens for wallet: ${walletAddress}`);

      // Call the service function to find universal tokens held by the user
      const tokensFromService = await TokenService.findUserUniversalTokens(walletAddress);
      
      console.log(`[DEBUG-CONTROLLER] Service returned ${tokensFromService?.length || 0} tokens`);
      console.log(`[DEBUG-CONTROLLER] Token sources:`, tokensFromService?.map(t => ({ name: t.tokenName, source: t.source, address: Object.values(t.deployedContracts)[0] })));
      
      // If no tokens found from service, check for known tokens
      if (!tokensFromService || tokensFromService.length === 0) {
        console.log(`[DEBUG-CONTROLLER] No tokens found from service, checking known tokens`);
        const knownTokens = getKnownTokens(walletAddress);
        
        if (knownTokens && knownTokens.length > 0) {
          console.log(`[DEBUG-CONTROLLER] Found ${knownTokens.length} known tokens for ${walletAddress}`);
          return res.status(200).json(knownTokens);
        }
      } else {
        console.log(`[DEBUG-CONTROLLER] Using ${tokensFromService.length} tokens from service`);
      }
      
      // Enhance tokens with detailed chain info (this will be skipped if nothing found)
      const enhancedTokens = await Promise.all((tokensFromService || []).map(async token => {
        // Add deployedChains array for frontend convenience
        const deployedChains = Object.keys(token.deployedContracts || {});
        
        // Get formatted chain info for all chains this token is deployed on
        const formattedChains = chainInfo.getFormattedChainInfoList(deployedChains);
        
        // Enhance chain info with contract addresses and balances
        const enhancedChainInfo = formattedChains.map(chain => {
          const contractAddress = token.deployedContracts ? token.deployedContracts[chain.chainId] : null;
          const balance = token.balances ? token.balances[chain.chainId] : '0';
          
          return {
            ...chain,
            contractAddress: contractAddress,
            balance: balance,
            deploymentStatus: contractAddress ? 'success' : 'pending', // If we have a contract address, it was successfully deployed
            explorerUrl: contractAddress ? 
              chainInfo.getExplorerAddressUrl(chain.chainId, contractAddress) : null,
            blockscoutUrl: chain.blockscoutUrl && contractAddress ? 
              `${chain.blockscoutUrl}/address/${contractAddress}` : null
          };
        });
        
        // Return enhanced token with chain info
        return {
          id: token.id,
          name: token.tokenName,
          symbol: token.tokenSymbol,
          iconUrl: token.iconUrl,
          deployedContracts: token.deployedContracts, // Map of chainId -> contractAddress
          deployedChains: deployedChains, // Array of chain IDs for convenience
          chainInfo: enhancedChainInfo, // Enhanced info with contract addresses, explorer URLs, and balances
          balances: token.balances || {} // Raw balance information
        };
      }));
      
      res.status(200).json(enhancedTokens);
    } catch (error) {
      console.error(`Error getting user tokens for ${req.params.walletAddress}: ${error.message}`);
      // Consider more specific error handling (e.g., for Blockscout API errors)
      res.status(500).json({
        message: `Failed to get user tokens: ${error.message}`
      });
    }
  }
}

module.exports = new TokenController(); 