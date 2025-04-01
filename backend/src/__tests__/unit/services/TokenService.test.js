const { TokenConfiguration, DeploymentLog, TokenDistribution } = require('../../../models');
const tokenService = require('../../../services/tokenService');
const contractService = require('../../../services/ContractService');
const VerificationService = require('../../../services/VerificationService');

// Mock dependencies
jest.mock('../../../models', () => ({
  TokenConfiguration: {
    findByPk: jest.fn().mockResolvedValue({
      id: 1,
      tokenName: 'Test Token',
      tokenSymbol: 'TEST',
      decimals: 18,
      totalSupply: '1000000000000000000000',
      creatorWallet: '0x4f1684A28E33F42cdf50AB96e29a709e17249E63',
      selectedChains: ['7001', '11155111'],
      deploymentStatus: 'pending',
      update: jest.fn().mockResolvedValue(true),
      save: jest.fn().mockResolvedValue(true)
    }),
    create: jest.fn().mockResolvedValue({
      id: 1,
      tokenName: 'Test Token',
      tokenSymbol: 'TEST',
      decimals: 18,
      totalSupply: '1000000000000000000000',
      creatorWallet: '0x4f1684A28E33F42cdf50AB96e29a709e17249E63',
      selectedChains: ['7001', '11155111'],
      deploymentStatus: 'pending',
      update: jest.fn().mockResolvedValue(true),
      save: jest.fn().mockResolvedValue(true)
    }),
    update: jest.fn().mockResolvedValue([1]), // Rows affected
    findAll: jest.fn().mockResolvedValue([
      {
        id: 1,
        tokenName: 'Test Token',
        tokenSymbol: 'TEST',
        creatorWallet: '0x4f1684A28E33F42cdf50AB96e29a709e17249E63'
      }
    ])
  },
  DeploymentLog: {
    findAll: jest.fn().mockResolvedValue([
      {
        id: 1,
        tokenConfigId: 1,
        chainId: '7001',
        chainName: 'ZetaChain Testnet',
        status: 'pending',
        update: jest.fn().mockResolvedValue(true),
        save: jest.fn().mockResolvedValue(true)
      }
    ]),
    findOne: jest.fn().mockResolvedValue({
      id: 1,
      tokenConfigId: 1,
      chainId: '7001',
      chainName: 'ZetaChain Testnet',
      status: 'pending',
      update: jest.fn().mockResolvedValue(true),
      save: jest.fn().mockResolvedValue(true)
    }),
    create: jest.fn().mockResolvedValue({
      id: 1,
      tokenConfigId: 1,
      chainId: '7001',
      status: 'pending',
      update: jest.fn().mockResolvedValue(true),
      save: jest.fn().mockResolvedValue(true)
    }),
    update: jest.fn().mockResolvedValue([1]) // Rows affected
  },
  TokenDistribution: {
    create: jest.fn().mockResolvedValue({
      id: 1,
      tokenConfigId: 1,
      recipientAddress: '0x4f1684A28E33F42cdf50AB96e29a709e17249E63',
      chainId: '7001',
      tokenAmount: '100'
    }),
    findAll: jest.fn().mockResolvedValue([])
  }
}));

// Mock the ContractService
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

// Mock the VerificationService
jest.mock('../../../services/VerificationService', () => ({
  verifyContract: jest.fn().mockResolvedValue({
    success: true,
    status: 'verified',
    explorerUrl: 'https://explorer.example.com/address/0x1234567890123456789012345678901234567890'
  })
}));

// Import chainInfo module for getExplorerTxUrl usage
jest.mock('../../../utils/chainInfo', () => ({
  getChainInfo: jest.fn().mockReturnValue({
    name: 'ZetaChain Testnet',
    chainId: '7001',
    explorerUrl: 'https://athens.explorer.zetachain.com'
  }),
  isZetaChain: jest.fn().mockReturnValue(true),
  findZetaChainId: jest.fn().mockReturnValue('7001'),
  getPrimaryZetaChainId: jest.fn().mockReturnValue('7001'),
  getExplorerTxUrl: jest.fn().mockImplementation((chainId, txHash) => {
    if (chainId === '7001') {
      return `https://athens.explorer.zetachain.com/tx/${txHash}`;
    } else if (chainId === '11155111') {
      return `https://sepolia.etherscan.io/tx/${txHash}`;
    }
    return null;
  }),
  getExplorerAddressUrl: jest.fn().mockImplementation((chainId, address) => {
    if (chainId === '7001') {
      return `https://athens.explorer.zetachain.com/address/${address}`;
    } else if (chainId === '11155111') {
      return `https://sepolia.etherscan.io/address/${address}`;
    }
    return null;
  }),
  SUPPORTED_CHAINS: {
    '7001': {
      name: 'ZetaChain Testnet',
      chainId: '7001',
      explorerUrl: 'https://athens.explorer.zetachain.com'
    },
    '11155111': {
      name: 'Sepolia',
      chainId: '11155111',
      explorerUrl: 'https://sepolia.etherscan.io'
    }
  }
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
    // Reset all mocks before each test
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
      
      // For token lookup
      TokenConfiguration.findByPk.mockResolvedValueOnce({
        id: 1,
        tokenName: 'Test Token',
        tokenSymbol: 'TEST',
        decimals: 18,
        totalSupply: '1000000000000000000000',
        selectedChains: ['7001', '11155111'],
        deploymentStatus: 'pending'
      });
      
      // Mock the deployment logs lookup
      DeploymentLog.findAll.mockResolvedValueOnce([
        {
          id: 1,
          tokenConfigId: 1,
          chainId: '7001',
          chainName: 'ZetaChain Testnet',
          status: 'pending',
          update: jest.fn().mockResolvedValueOnce({ status: 'success' }),
          save: jest.fn().mockResolvedValueOnce({ status: 'success' }),
          toJSON: jest.fn().mockReturnThis()
        },
        {
          id: 2,
          tokenConfigId: 1,
          chainId: '11155111',
          chainName: 'Sepolia',
          status: 'pending',
          update: jest.fn().mockResolvedValueOnce({ status: 'success' }),
          save: jest.fn().mockResolvedValueOnce({ status: 'success' }),
          toJSON: jest.fn().mockReturnThis()
        }
      ]);
      
      // Mock the contract deployments
      contractService.deployZetaChainUniversalToken.mockResolvedValueOnce({
        contractAddress: '0x1234567890123456789012345678901234567890',
        transactionHash: '0x1234567890123456789012345678901234567890123456789012345678901234'
      });
      
      contractService.deployEVMUniversalToken.mockResolvedValueOnce({
        contractAddress: '0x0987654321098765432109876543210987654321',
        transactionHash: '0x9876543210987654321098765432109876543210987654321098765432109876'
      });
      
      // Mock contract verification
      VerificationService.verifyContract.mockResolvedValue({
        status: 'verified',
        explorerUrl: 'https://explorer.example.com/address/0x1234567890123456789012345678901234567890'
      });
      
      // Mock token connection
      contractService.connectTokens.mockResolvedValueOnce({
        zetaChainTxHash: '0x1234',
        evmTxHash: '0x5678'
      });
      
      // Call the method - making sure we don't let it run too long
      const deploymentPromise = tokenService.processDeployment(1);
      
      // Use Jest fake timers to avoid timeout
      jest.useFakeTimers();

      // Resolve all the promises
      setTimeout(() => {
        jest.runAllTimers();
      }, 1000);

      await deploymentPromise;
      
      // Reset timers
      jest.useRealTimers();
      
      // Verify the method called all required dependencies
      expect(contractService.deployZetaChainUniversalToken).toHaveBeenCalled();
      expect(contractService.deployEVMUniversalToken).toHaveBeenCalled();
      expect(contractService.connectTokens).toHaveBeenCalled();
      
      // Verify token status was updated
      expect(TokenConfiguration.update).toHaveBeenCalledWith(
        expect.objectContaining({ deploymentStatus: 'completed' }),
        expect.any(Object)
      );
    }, 60000); // Increase the timeout to 60 seconds

    it('should update status to partial if some deployments fail', async () => {
      // For token lookup
      TokenConfiguration.findByPk.mockResolvedValueOnce({
        id: 1,
        tokenName: 'Test Token',
        tokenSymbol: 'TEST',
        decimals: 18,
        totalSupply: '1000000000000000000000',
        selectedChains: ['7001', '11155111'],
        deploymentStatus: 'pending'
      });
      
      // Mock the deployment logs lookup
      DeploymentLog.findAll.mockResolvedValueOnce([
        {
          id: 1,
          tokenConfigId: 1,
          chainId: '7001',
          chainName: 'ZetaChain Testnet',
          status: 'pending',
          update: jest.fn().mockResolvedValueOnce({ status: 'success' }),
          save: jest.fn().mockResolvedValueOnce({ status: 'success' }),
          toJSON: jest.fn().mockReturnThis()
        },
        {
          id: 2,
          tokenConfigId: 1,
          chainId: '11155111',
          chainName: 'Sepolia',
          status: 'pending',
          update: jest.fn().mockResolvedValueOnce({ status: 'failure' }),
          save: jest.fn().mockResolvedValueOnce({ status: 'failure' }),
          toJSON: jest.fn().mockReturnThis()
        }
      ]);
      
      // Mock contract deployments - ZetaChain succeeds, EVM fails
      contractService.deployZetaChainUniversalToken.mockResolvedValueOnce({
        contractAddress: '0x1234567890123456789012345678901234567890',
        transactionHash: '0x1234567890123456789012345678901234567890123456789012345678901234'
      });
      
      contractService.deployEVMUniversalToken.mockRejectedValueOnce(
        new Error('Failed to deploy on EVM chain')
      );
      
      // Mock contract verification
      VerificationService.verifyContract.mockResolvedValue({
        status: 'verified',
        explorerUrl: 'https://explorer.example.com/address/0x1234567890123456789012345678901234567890'
      });
      
      // For checking final deployment status
      DeploymentLog.findAll.mockResolvedValueOnce([
        { status: 'success' },
        { status: 'failure' }
      ]);
      
      // Call the method
      await tokenService.processDeployment(1);
      
      // Verify token status was updated to partial
      expect(TokenConfiguration.update).toHaveBeenCalledWith(
        expect.objectContaining({ deploymentStatus: 'partial' }),
        expect.any(Object)
      );
    }, 60000); // Increase timeout

    it('should update status to failed if ZetaChain deployment fails', async () => {
      // Ensure TokenConfiguration.findByPk returns a proper object
      TokenConfiguration.findByPk.mockResolvedValueOnce({
        id: 1,
        tokenName: 'Test Token',
        tokenSymbol: 'TEST',
        decimals: 18,
        totalSupply: '1000000000000000000000',
        selectedChains: ['7001', '11155111'],
        deploymentStatus: 'pending',
        update: jest.fn().mockResolvedValue(true)
      });
      
      // Mock deployment logs in a way that ZetaChain is failed
      DeploymentLog.findAll.mockResolvedValueOnce([
        {
          id: 1,
          chainId: '7001',
          chainName: 'ZetaChain Testnet',
          status: 'pending',
          update: jest.fn().mockResolvedValue({ status: 'failed' }),
          save: jest.fn().mockResolvedValue({ status: 'failed' })
        }
      ]);
      
      // Mock ZetaChain deployment to fail
      contractService.deployZetaChainUniversalToken.mockRejectedValueOnce(
        new Error('Deployment failed')
      );
      
      // For checking final status
      DeploymentLog.findAll.mockResolvedValueOnce([
        { status: 'failed' }
      ]);
      
      // Call the method
      await tokenService.processDeployment(1);
      
      // Verify token was updated with failed status
      expect(TokenConfiguration.update).toHaveBeenCalledWith(
        expect.objectContaining({ deploymentStatus: 'failed' }),
        expect.objectContaining({ where: { id: 1 } })
      );
    }, 60000); // Extend timeout
    
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
      // Mock TokenConfiguration.findByPk to return null for this test only
      const originalFindByPk = TokenConfiguration.findByPk;
      TokenConfiguration.findByPk = jest.fn().mockResolvedValueOnce(null);
      
      // Call the method and expect it to throw
      await expect(
        tokenService.getTokenById(99)
      ).rejects.toThrow('Token configuration with ID 99 not found');
      
      // Restore original mock
      TokenConfiguration.findByPk = originalFindByPk;
    });
    
    it('should handle errors during retrieval', async () => {
      // Mock database error for this test only
      const originalFindByPk = TokenConfiguration.findByPk;
      TokenConfiguration.findByPk = jest.fn().mockRejectedValueOnce(new Error('Database error'));
      
      // Call the method and expect it to throw
      await expect(
        tokenService.getTokenById(1)
      ).rejects.toThrow('Database error');
      
      // Restore original mock
      TokenConfiguration.findByPk = originalFindByPk;
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
      // Mock specific response for this test only
      const originalFindAll = DeploymentLog.findAll;
      DeploymentLog.findAll = jest.fn().mockResolvedValueOnce([
        {
          id: 1,
          tokenConfigId: 1,
          chainId: '7001',
          chainName: 'ZetaChain Testnet',
          status: 'pending'
        }
      ]);
      
      // Call the method
      const result = await tokenService.getDeploymentLogs(1);
      
      // Check the result
      expect(result).toBeDefined();
      expect(result.length).toBe(1);
      
      // Restore original mock
      DeploymentLog.findAll = originalFindAll;
    });
    
    it('should handle errors during retrieval', async () => {
      // Mock database error for this test only
      const originalFindAll = DeploymentLog.findAll;
      DeploymentLog.findAll = jest.fn().mockRejectedValueOnce(new Error('Database error'));
      
      // Call the method and expect it to throw
      await expect(
        tokenService.getDeploymentLogs(1)
      ).rejects.toThrow('Database error');
      
      // Restore original mock
      DeploymentLog.findAll = originalFindAll;
    });
  });
}); 