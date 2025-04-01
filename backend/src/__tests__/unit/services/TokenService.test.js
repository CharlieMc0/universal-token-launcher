const { TokenConfiguration, DeploymentLog, TokenDistribution } = require('../../../models');
const tokenService = require('../../../services/tokenService');
const contractService = require('../../../services/ContractService');

// Mock dependencies
jest.mock('../../../models', () => {
  const mockTokenConfig = {
    id: 1,
    tokenName: 'Test Token',
    tokenSymbol: 'TEST',
    decimals: 18,
    totalSupply: '1000000000000000000000',
    creatorWallet: '0x4f1684A28E33F42cdf50AB96e29a709e17249E63',
    iconUrl: '/uploads/icons/test.jpg',
    selectedChains: ['7001', '11155111'],
    deploymentStatus: 'pending',
    update: jest.fn().mockResolvedValue({ id: 1 }),
    toJSON: jest.fn().mockReturnValue({
      id: 1,
      tokenName: 'Test Token',
      tokenSymbol: 'TEST',
      decimals: 18,
      totalSupply: '1000000000000000000000',
      creatorWallet: '0x4f1684A28E33F42cdf50AB96e29a709e17249E63',
      iconUrl: '/uploads/icons/test.jpg',
      selectedChains: ['7001', '11155111'],
      deploymentStatus: 'pending'
    })
  };
  
  const mockDeploymentLog = {
    id: 1,
    tokenConfigId: 1,
    chainName: 'ZetaChain Testnet',
    chainId: '7001',
    status: 'pending',
    update: jest.fn().mockResolvedValue({ id: 1 })
  };
  
  return {
    TokenConfiguration: {
      create: jest.fn().mockResolvedValue(mockTokenConfig),
      findByPk: jest.fn().mockResolvedValue(mockTokenConfig),
      findAll: jest.fn().mockResolvedValue([mockTokenConfig]),
      findOne: jest.fn().mockResolvedValue(mockTokenConfig)
    },
    DeploymentLog: {
      create: jest.fn().mockResolvedValue(mockDeploymentLog),
      findAll: jest.fn().mockResolvedValue([mockDeploymentLog]),
      findOne: jest.fn().mockResolvedValue(mockDeploymentLog)
    },
    TokenDistribution: {
      create: jest.fn().mockResolvedValue({
        id: 1,
        tokenConfigId: 1,
        recipientAddress: '0x4f1684A28E33F42cdf50AB96e29a709e17249E63',
        chainId: '7001',
        tokenAmount: '100000000000000000000',
        status: 'pending'
      }),
      findAll: jest.fn().mockResolvedValue([])
    }
  };
});

jest.mock('../../../services/ContractService', () => ({
  deployZetaChainUniversalToken: jest.fn().mockResolvedValue({
    contractAddress: '0x1234567890123456789012345678901234567890',
    transactionHash: '0x1234567890123456789012345678901234567890123456789012345678901234'
  }),
  deployEVMUniversalToken: jest.fn().mockResolvedValue({
    contractAddress: '0x0987654321098765432109876543210987654321',
    transactionHash: '0x0987654321098765432109876543210987654321098765432109876543210987'
  }),
  connectTokens: jest.fn().mockResolvedValue({
    zetaChainTxHash: '0x1234',
    evmTxHash: '0x5678'
  }),
  verifyFeePayment: jest.fn().mockResolvedValue(true)
}));

describe('TokenService', () => {
  const mockTokenData = {
    creatorWallet: '0x4f1684A28E33F42cdf50AB96e29a709e17249E63',
    tokenName: 'Test Token',
    tokenSymbol: 'TEST',
    decimals: 18,
    totalSupply: '1000',
    iconUrl: '/uploads/icons/test.jpg',
    selectedChains: ['7001', '11155111'],
    distributionsJson: [
      {
        recipient_address: '0x4f1684A28E33F42cdf50AB96e29a709e17249E63',
        chain_id: '7001',
        token_amount: '100'
      }
    ]
  };
  
  const mockTxHash = '0x1234567890123456789012345678901234567890123456789012345678901234';
  
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });
  
  describe('createTokenConfiguration', () => {
    it('should create token configuration successfully', async () => {
      // Call the method to create a token configuration
      const result = await tokenService.createTokenConfiguration(mockTokenData);
      
      // Check the result
      expect(result).toBeDefined();
      expect(result.id).toBe(1);
      
      // Check that TokenConfiguration.create was called with correct parameters
      expect(TokenConfiguration.create).toHaveBeenCalledWith(expect.objectContaining({
        creatorWallet: mockTokenData.creatorWallet,
        tokenName: mockTokenData.tokenName,
        tokenSymbol: mockTokenData.tokenSymbol,
        decimals: mockTokenData.decimals,
        totalSupply: mockTokenData.totalSupply,
        iconUrl: mockTokenData.iconUrl,
        selectedChains: mockTokenData.selectedChains,
        deploymentStatus: 'pending'
      }));
      
      // Check that DeploymentLog.create was called for each chain
      expect(DeploymentLog.create).toHaveBeenCalledTimes(2);
      
      // Check that TokenDistribution.create was called for each distribution
      expect(TokenDistribution.create).toHaveBeenCalledTimes(1);
    });
    
    it('should validate required fields', async () => {
      // Call the method with missing fields
      await expect(
        tokenService.createTokenConfiguration({
          // Missing required fields
          creatorWallet: '0x4f1684A28E33F42cdf50AB96e29a709e17249E63'
        })
      ).rejects.toThrow('Missing required token configuration fields');
    });
    
    it('should handle errors during creation', async () => {
      // Mock database error
      TokenConfiguration.create.mockRejectedValueOnce(new Error('Database error'));
      
      // Call the method and expect it to throw
      await expect(
        tokenService.createTokenConfiguration(mockTokenData)
      ).rejects.toThrow('Database error');
      
      // Check that the error was logged
      expect(console.error).toHaveBeenCalled();
    });
  });
  
  describe('deployToken', () => {
    it('should initiate token deployment successfully', async () => {
      // Call the method to deploy a token
      const result = await tokenService.deployToken(1, mockTxHash);
      
      // Check the result
      expect(result).toBe(true);
      
      // Check that TokenConfiguration.findByPk was called
      expect(TokenConfiguration.findByPk).toHaveBeenCalledWith(1);
      
      // Check that contractService.verifyFeePayment was called
      expect(contractService.verifyFeePayment).toHaveBeenCalledWith(mockTxHash);
      
      // Check that tokenConfig.update was called to set deploymentStatus and feePaidTx
      const tokenConfig = await TokenConfiguration.findByPk(1);
      expect(tokenConfig.update).toHaveBeenCalledWith(expect.objectContaining({
        feePaidTx: mockTxHash,
        deploymentStatus: 'deploying'
      }));
    });
    
    it('should throw error if token configuration not found', async () => {
      // Mock token configuration not found
      TokenConfiguration.findByPk.mockResolvedValueOnce(null);
      
      // Call the method and expect it to throw
      await expect(
        tokenService.deployToken(99, mockTxHash)
      ).rejects.toThrow('Token configuration with ID 99 not found');
    });
    
    it('should throw error if fee payment is invalid', async () => {
      // Mock invalid fee payment
      contractService.verifyFeePayment.mockResolvedValueOnce(false);
      
      // Call the method and expect it to throw
      await expect(
        tokenService.deployToken(1, mockTxHash)
      ).rejects.toThrow('Invalid fee payment transaction');
    });
    
    it('should handle errors during deployment', async () => {
      // Mock database error
      TokenConfiguration.findByPk.mockRejectedValueOnce(new Error('Database error'));
      
      // Call the method and expect it to throw
      await expect(
        tokenService.deployToken(1, mockTxHash)
      ).rejects.toThrow('Database error');
      
      // Check that the error was logged
      expect(console.error).toHaveBeenCalled();
    });
  });
  
  describe('processDeployment', () => {
    // This method is called internally by deployToken, but we'll test it directly
    it('should process deployment successfully', async () => {
      // Mock the DeploymentLog.findAll to return deployment logs for success status check
      DeploymentLog.findAll.mockResolvedValueOnce([
        { status: 'success' },
        { status: 'success' }
      ]);
      
      // Get a token configuration
      const tokenConfig = await TokenConfiguration.findByPk(1);
      
      // Call the method to process deployment
      await tokenService.processDeployment(tokenConfig);
      
      // Check that DeploymentLog.findOne was called for ZetaChain
      expect(DeploymentLog.findOne).toHaveBeenCalledWith(expect.objectContaining({
        where: {
          tokenConfigId: 1,
          chainId: expect.stringMatching(/7001|7000/)
        }
      }));
      
      // Check that contractService.deployZetaChainUniversalToken was called
      expect(contractService.deployZetaChainUniversalToken).toHaveBeenCalled();
      
      // Check that contractService.deployEVMUniversalToken was called
      expect(contractService.deployEVMUniversalToken).toHaveBeenCalled();
      
      // Check that contractService.connectTokens was called
      expect(contractService.connectTokens).toHaveBeenCalled();
      
      // Check that tokenConfig.update was called to set deploymentStatus
      expect(tokenConfig.update).toHaveBeenCalledWith(expect.objectContaining({
        deploymentStatus: 'completed'
      }));
    });
    
    it('should update status to partial if some deployments fail', async () => {
      // Mock contractService.deployEVMUniversalToken to fail
      contractService.deployEVMUniversalToken.mockRejectedValueOnce(new Error('Deployment failed'));
      
      // Mock the DeploymentLog.findAll to return mixed success/failed status
      DeploymentLog.findAll.mockResolvedValueOnce([
        { status: 'success' },
        { status: 'failed' }
      ]);
      
      // Get a token configuration
      const tokenConfig = await TokenConfiguration.findByPk(1);
      
      // Call the method to process deployment
      await tokenService.processDeployment(tokenConfig);
      
      // Check that tokenConfig.update was called to set deploymentStatus to partial
      expect(tokenConfig.update).toHaveBeenCalledWith(expect.objectContaining({
        deploymentStatus: 'partial'
      }));
    });
    
    it('should update status to failed if ZetaChain deployment fails', async () => {
      // Mock contractService.deployZetaChainUniversalToken to fail
      contractService.deployZetaChainUniversalToken.mockRejectedValueOnce(new Error('Deployment failed'));
      
      // Get a token configuration
      const tokenConfig = await TokenConfiguration.findByPk(1);
      
      // Call the method to process deployment
      await tokenService.processDeployment(tokenConfig);
      
      // Check that tokenConfig.update was called to set deploymentStatus to failed
      expect(tokenConfig.update).toHaveBeenCalledWith(expect.objectContaining({
        deploymentStatus: 'failed'
      }));
    });
    
    it('should handle invalid token configuration', async () => {
      // Call the method with invalid token config
      await tokenService.processDeployment(null);
      
      // Check that no deployments were attempted
      expect(contractService.deployZetaChainUniversalToken).not.toHaveBeenCalled();
      expect(contractService.deployEVMUniversalToken).not.toHaveBeenCalled();
      
      // Check that the error was logged
      expect(console.error).toHaveBeenCalled();
    });
  });
  
  describe('getTokenById', () => {
    it('should retrieve token by ID successfully', async () => {
      // Call the method to get a token
      const result = await tokenService.getTokenById(1);
      
      // Check the result
      expect(result).toBeDefined();
      expect(result.id).toBe(1);
      
      // Check that TokenConfiguration.findByPk was called
      expect(TokenConfiguration.findByPk).toHaveBeenCalledWith(1);
    });
    
    it('should throw error if token not found', async () => {
      // Mock token not found
      TokenConfiguration.findByPk.mockResolvedValueOnce(null);
      
      // Call the method and expect it to throw
      await expect(
        tokenService.getTokenById(99)
      ).rejects.toThrow('Token configuration with ID 99 not found');
    });
    
    it('should handle errors during retrieval', async () => {
      // Mock database error
      TokenConfiguration.findByPk.mockRejectedValueOnce(new Error('Database error'));
      
      // Call the method and expect it to throw
      await expect(
        tokenService.getTokenById(1)
      ).rejects.toThrow('Database error');
      
      // Check that the error was logged
      expect(console.error).toHaveBeenCalled();
    });
  });
  
  describe('getTokens', () => {
    it('should retrieve all tokens', async () => {
      // Call the method to get all tokens
      const result = await tokenService.getTokens();
      
      // Check the result
      expect(result).toBeDefined();
      expect(result.length).toBe(1);
      
      // Check that TokenConfiguration.findAll was called
      expect(TokenConfiguration.findAll).toHaveBeenCalled();
    });
    
    it('should filter by creator wallet if provided', async () => {
      // Call the method with a creator wallet
      const result = await tokenService.getTokens('0x4f1684A28E33F42cdf50AB96e29a709e17249E63');
      
      // Check the result
      expect(result).toBeDefined();
      expect(result.length).toBe(1);
      
      // Check that TokenConfiguration.findAll was called with correct filter
      expect(TokenConfiguration.findAll).toHaveBeenCalledWith(expect.objectContaining({
        where: { creatorWallet: '0x4f1684A28E33F42cdf50AB96e29a709e17249E63' }
      }));
    });
    
    it('should handle errors during retrieval', async () => {
      // Mock database error
      TokenConfiguration.findAll.mockRejectedValueOnce(new Error('Database error'));
      
      // Call the method and expect it to throw
      await expect(
        tokenService.getTokens()
      ).rejects.toThrow('Database error');
      
      // Check that the error was logged
      expect(console.error).toHaveBeenCalled();
    });
  });
  
  describe('getDeploymentLogs', () => {
    it('should retrieve deployment logs by token ID', async () => {
      // Call the method to get deployment logs
      const result = await tokenService.getDeploymentLogs(1);
      
      // Check the result
      expect(result).toBeDefined();
      expect(result.length).toBe(1);
      
      // Check that DeploymentLog.findAll was called with correct filter
      expect(DeploymentLog.findAll).toHaveBeenCalledWith(expect.objectContaining({
        where: { tokenConfigId: 1 }
      }));
    });
    
    it('should handle errors during retrieval', async () => {
      // Mock database error
      DeploymentLog.findAll.mockRejectedValueOnce(new Error('Database error'));
      
      // Call the method and expect it to throw
      await expect(
        tokenService.getDeploymentLogs(1)
      ).rejects.toThrow('Database error');
      
      // Check that the error was logged
      expect(console.error).toHaveBeenCalled();
    });
  });
}); 