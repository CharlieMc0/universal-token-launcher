const TokenService = require('../services/tokenService');
const { upload, parseCSV, processDistributionsFile, getIconUrl, getCsvPath } = require('../utils/fileUpload');
const chainInfo = require('../utils/chainInfo');

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

      // Return token configuration with ID
      res.status(201).json({
        message: 'Token configuration created successfully',
        tokenId: tokenConfig.id,
        ...tokenConfig.toJSON(),
        chainInfo: formattedChains, // Add formatted chain info
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

      // Enhance tokens with formatted chain info
      const enhancedTokens = tokens.map(token => {
        const formattedChains = chainInfo.getFormattedChainInfoList(token.selectedChains);
        return {
          ...token.toJSON(),
          chainInfo: formattedChains
        };
      });

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

      const token = await TokenService.getTokenById(id);

      // Check ownership in production/auth mode
      if (process.env.DEBUG !== 'true' && token.creatorWallet !== creatorWallet) {
        return res.status(403).json({ message: 'Unauthorized access to token configuration' });
      }

      // Enhance token with formatted chain info
      const formattedChains = chainInfo.getFormattedChainInfoList(token.selectedChains);
      const enhancedToken = {
        ...token.toJSON(),
        chainInfo: formattedChains
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
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async getDeploymentLogs(req, res) {
    try {
      const { id } = req.params;
      const creatorWallet = req.wallet;

      // Check ownership in production/auth mode
      if (process.env.DEBUG !== 'true') {
        const token = await TokenService.getTokenById(id);
        if (token.creatorWallet !== creatorWallet) {
          return res.status(403).json({ message: 'Unauthorized access to deployment logs' });
        }
      }

      const logs = await TokenService.getDeploymentLogs(id);
      
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
        
        return enhancedLog;
      });
      
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

      // Deploy token
      await TokenService.deployToken(id, fee_paid_tx);

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
}

module.exports = new TokenController(); 