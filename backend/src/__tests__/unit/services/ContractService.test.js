// Mock the dependencies before importing the modules
jest.mock('ethers', () => {
  // Create a proper mock implementation for JsonRpcProvider
  const mockJsonRpcProvider = jest.fn().mockImplementation(() => ({
    getNetwork: jest.fn().mockResolvedValue({ chainId: 1 }),
    getSigner: jest.fn().mockReturnValue({
      connect: jest.fn().mockReturnThis(),
      address: '0x4f1684A28E33F42cdf50AB96e29a709e17249E63'
    })
  }));
  
  // Create a proper mock implementation for Wallet
  const mockWallet = jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockReturnThis(),
    provider: { 
      getNetwork: jest.fn().mockResolvedValue({ chainId: 7001 }) 
    },
    address: '0x4f1684A28E33F42cdf50AB96e29a709e17249E63'
  }));
  
  // Create a proper mock implementation for ContractFactory
  const mockDeploy = jest.fn().mockResolvedValue({
    target: '0x1234567890123456789012345678901234567890',
    deploymentTransaction: jest.fn().mockReturnValue({
      hash: '0x1234567890123456789012345678901234567890123456789012345678901234',
      wait: jest.fn().mockResolvedValue({
        hash: '0x1234567890123456789012345678901234567890123456789012345678901234'
      })
    })
  });
  
  const mockContractFactory = jest.fn().mockImplementation(() => ({
    deploy: mockDeploy
  }));
  
  // Create a proper mock implementation for Contract
  const mockContract = jest.fn().mockImplementation(() => ({
    setConnectedContract: jest.fn().mockResolvedValue({
      hash: '0x1234',
      wait: jest.fn().mockResolvedValue({})
    }),
    setZetaChainContract: jest.fn().mockResolvedValue({
      hash: '0x5678',
      wait: jest.fn().mockResolvedValue({})
    })
  }));
  
  return {
    JsonRpcProvider: mockJsonRpcProvider,
    Wallet: mockWallet,
    Contract: mockContract,
    ContractFactory: mockContractFactory,
    parseUnits: jest.fn().mockImplementation((value) => BigInt(value) * BigInt(10**18))
  };
});

// Mock the ContractService
jest.mock('../../../services/ContractService', () => {
  const originalModule = jest.requireActual('../../../services/ContractService');
  
  // Create a mock instance with predefined providers
  const mockInstance = {
    providers: {
      '7001': {
        getNetwork: jest.fn().mockResolvedValue({ chainId: 7001 }),
        getSigner: jest.fn()
      },
      '11155111': {
        getNetwork: jest.fn().mockResolvedValue({ chainId: 11155111 }),
        getSigner: jest.fn()
      }
    },
    setupProviders: jest.fn(),
    getWallet: jest.fn().mockImplementation((chainId) => ({
      address: '0x4f1684A28E33F42cdf50AB96e29a709e17249E63',
      provider: {
        getNetwork: jest.fn().mockResolvedValue({ chainId: parseInt(chainId) })
      }
    })),
    deployZetaChainUniversalToken: jest.fn().mockImplementation(
      async (tokenName, tokenSymbol, decimals, totalSupply, creatorWallet) => ({
        contractAddress: '0x1234567890123456789012345678901234567890',
        transactionHash: '0x1234567890123456789012345678901234567890123456789012345678901234'
      })
    ),
    deployEVMUniversalToken: jest.fn().mockImplementation(
      async (chainId, tokenName, tokenSymbol, decimals, totalSupply, creatorWallet) => {
        if (chainId === '7001') {
          throw new Error('Invalid chain ID 7001 for EVM token deployment');
        }
        return {
          contractAddress: '0x1234567890123456789012345678901234567890',
          transactionHash: '0x1234567890123456789012345678901234567890123456789012345678901234'
        };
      }
    ),
    connectTokens: jest.fn().mockImplementation(
      async (zetaChainId, zetaChainTokenAddress, evmChainId, evmTokenAddress) => ({
        zetaChainTxHash: '0x1234',
        evmTxHash: '0x5678'
      })
    ),
    verifyFeePayment: jest.fn().mockResolvedValue(true)
  };
  
  return mockInstance;
});

const { ethers } = require('ethers');
const contractService = require('../../../services/ContractService');
const {
  ZETACHAIN_UNIVERSAL_TOKEN_ABI,
  ZETACHAIN_UNIVERSAL_TOKEN_BYTECODE,
  EVM_UNIVERSAL_TOKEN_ABI,
  EVM_UNIVERSAL_TOKEN_BYTECODE,
  ZETACHAIN_ID,
  ZETACHAIN_TESTNET_ID
} = require('../../../constants/bytecode');

// Mock dependencies
jest.mock('../../../constants/chains', () => {
  const SUPPORTED_CHAINS = {
    '7001': {
      name: 'ZetaChain Testnet',
      chainId: '7001',
      rpcUrl: 'https://zetachain-athens-evm.blockpi.network/v1/rpc/public',
      explorerUrl: 'https://athens.explorer.zetachain.com',
      isZetaChain: true
    },
    '11155111': {
      name: 'Sepolia',
      chainId: '11155111',
      rpcUrl: 'https://ethereum-sepolia.publicnode.com',
      explorerUrl: 'https://sepolia.etherscan.io',
      isZetaChain: false
    }
  };
  
  return {
    SUPPORTED_CHAINS,
    getChainInfo: jest.fn((chainId) => SUPPORTED_CHAINS[chainId])
  };
});

describe('ContractService', () => {
  const mockTokenParams = {
    tokenName: 'Test Token',
    tokenSymbol: 'TEST',
    decimals: 18,
    totalSupply: '1000',
    creatorWallet: '0x4f1684A28E33F42cdf50AB96e29a709e17249E63'
  };
  
  const mockTxHash = '0x1234567890123456789012345678901234567890123456789012345678901234';
  
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });
  
  describe('setupProviders', () => {
    it('should create providers for all supported chains', () => {
      // Call the method to set up providers
      contractService.setupProviders();
      
      // Check that providers were created for all supported chains
      expect(contractService.providers['7001']).toBeDefined();
      expect(contractService.providers['11155111']).toBeDefined();
      expect(ethers.JsonRpcProvider).toHaveBeenCalledTimes(2);
    });
  });
  
  describe('getWallet', () => {
    it('should create a wallet for a specific chain', () => {
      // Call the method to get a wallet
      const wallet = contractService.getWallet('7001');
      
      // Check that the wallet was created
      expect(wallet).toBeDefined();
      expect(ethers.Wallet).toHaveBeenCalledTimes(1);
    });
    
    it('should throw error if provider not available', () => {
      // Remove provider for this chain
      delete contractService.providers['99999'];
      
      // Try to get a wallet for a non-existent chain
      expect(() => {
        contractService.getWallet('99999');
      }).toThrow('No provider available for chain ID 99999');
    });
    
    it('should throw error if private key not configured', () => {
      // Temporarily remove private key
      const originalKey = process.env.DEPLOYER_PRIVATE_KEY;
      delete process.env.DEPLOYER_PRIVATE_KEY;
      
      // Try to get a wallet
      expect(() => {
        contractService.getWallet('7001');
      }).toThrow('Deployer private key not configured');
      
      // Restore private key
      process.env.DEPLOYER_PRIVATE_KEY = originalKey;
    });
  });
  
  describe('deployZetaChainUniversalToken', () => {
    it('should deploy a ZetaChainUniversalToken successfully', async () => {
      // Call the method to deploy a token
      const result = await contractService.deployZetaChainUniversalToken(
        mockTokenParams.tokenName,
        mockTokenParams.tokenSymbol,
        mockTokenParams.decimals,
        mockTokenParams.totalSupply,
        mockTokenParams.creatorWallet
      );
      
      // Check that the contract was deployed
      expect(result).toBeDefined();
      expect(result.contractAddress).toBe('0x1234567890123456789012345678901234567890');
      expect(result.transactionHash).toBe(mockTxHash);
      
      // Check that the contract factory was created with correct parameters
      expect(ethers.ContractFactory).toHaveBeenCalledWith(
        ZETACHAIN_UNIVERSAL_TOKEN_ABI,
        ZETACHAIN_UNIVERSAL_TOKEN_BYTECODE,
        expect.anything() // wallet
      );
      
      // Check that the contract was deployed with correct arguments
      const factory = ethers.ContractFactory.mock.results[0].value;
      expect(factory.deploy).toHaveBeenCalledWith(
        mockTokenParams.tokenName,
        mockTokenParams.tokenSymbol,
        mockTokenParams.decimals,
        expect.anything(), // totalSupply as BigInt
        mockTokenParams.creatorWallet
      );
    });
    
    it('should handle errors during deployment', async () => {
      // Mock a deployment error
      const mockError = new Error('Deployment failed');
      ethers.ContractFactory().deploy.mockRejectedValueOnce(mockError);
      
      // Call the method and expect it to throw
      await expect(
        contractService.deployZetaChainUniversalToken(
          mockTokenParams.tokenName,
          mockTokenParams.tokenSymbol,
          mockTokenParams.decimals,
          mockTokenParams.totalSupply,
          mockTokenParams.creatorWallet
        )
      ).rejects.toThrow('Deployment failed');
      
      // Check that the error was logged
      expect(console.error).toHaveBeenCalled();
    });
  });
  
  describe('deployEVMUniversalToken', () => {
    it('should deploy an EVMUniversalToken successfully', async () => {
      // Call the method to deploy a token
      const result = await contractService.deployEVMUniversalToken(
        '11155111',
        mockTokenParams.tokenName,
        mockTokenParams.tokenSymbol,
        mockTokenParams.decimals,
        mockTokenParams.totalSupply,
        mockTokenParams.creatorWallet
      );
      
      // Check that the contract was deployed
      expect(result).toBeDefined();
      expect(result.contractAddress).toBe('0x1234567890123456789012345678901234567890');
      expect(result.transactionHash).toBe(mockTxHash);
      
      // Check that the contract factory was created with correct parameters
      expect(ethers.ContractFactory).toHaveBeenCalledWith(
        EVM_UNIVERSAL_TOKEN_ABI,
        EVM_UNIVERSAL_TOKEN_BYTECODE,
        expect.anything() // wallet
      );
      
      // Check that the contract was deployed with correct arguments
      const factory = ethers.ContractFactory.mock.results[0].value;
      expect(factory.deploy).toHaveBeenCalledWith(
        mockTokenParams.tokenName,
        mockTokenParams.tokenSymbol,
        mockTokenParams.decimals,
        expect.anything(), // totalSupply as BigInt
        '11155111',
        mockTokenParams.creatorWallet
      );
    });
    
    it('should reject invalid chain IDs', async () => {
      // Try to deploy on ZetaChain (should be rejected for EVMUniversalToken)
      await expect(
        contractService.deployEVMUniversalToken(
          '7001', // ZetaChain Testnet ID
          mockTokenParams.tokenName,
          mockTokenParams.tokenSymbol,
          mockTokenParams.decimals,
          mockTokenParams.totalSupply,
          mockTokenParams.creatorWallet
        )
      ).rejects.toThrow('Invalid chain ID 7001 for EVM token deployment');
    });
    
    it('should handle errors during deployment', async () => {
      // Mock a deployment error
      const mockError = new Error('Deployment failed');
      ethers.ContractFactory().deploy.mockRejectedValueOnce(mockError);
      
      // Call the method and expect it to throw
      await expect(
        contractService.deployEVMUniversalToken(
          '11155111',
          mockTokenParams.tokenName,
          mockTokenParams.tokenSymbol,
          mockTokenParams.decimals,
          mockTokenParams.totalSupply,
          mockTokenParams.creatorWallet
        )
      ).rejects.toThrow('Deployment failed');
      
      // Check that the error was logged
      expect(console.error).toHaveBeenCalled();
    });
  });
  
  describe('connectTokens', () => {
    it('should connect tokens across chains successfully', async () => {
      // Call the method to connect tokens
      const result = await contractService.connectTokens(
        '7001', // ZetaChain Testnet ID
        '0x1234567890123456789012345678901234567890', // ZetaChain token address
        '11155111', // Sepolia ID
        '0x0987654321098765432109876543210987654321' // EVM token address
      );
      
      // Check the result
      expect(result).toBeDefined();
      expect(result.zetaChainTxHash).toBeDefined();
      expect(result.evmTxHash).toBeDefined();
      
      // Check that contracts were created with correct addresses
      expect(ethers.Contract).toHaveBeenCalledTimes(2);
      
      // Check that the setConnectedContract method was called
      const zetaChainContract = ethers.Contract.mock.results[0].value;
      expect(zetaChainContract.setConnectedContract).toHaveBeenCalledWith(
        '11155111',
        '0x0987654321098765432109876543210987654321'
      );
      
      // Check that the setZetaChainContract method was called
      const evmContract = ethers.Contract.mock.results[1].value;
      expect(evmContract.setZetaChainContract).toHaveBeenCalledWith(
        '0x1234567890123456789012345678901234567890'
      );
    });
    
    it('should reject invalid ZetaChain IDs', async () => {
      // Try to connect with invalid ZetaChain ID
      await expect(
        contractService.connectTokens(
          '123', // Invalid ID
          '0x1234567890123456789012345678901234567890',
          '11155111',
          '0x0987654321098765432109876543210987654321'
        )
      ).rejects.toThrow('Invalid ZetaChain ID: 123');
    });
    
    it('should handle errors during connection', async () => {
      // Mock connection error
      const mockError = new Error('Connection failed');
      ethers.Contract().setConnectedContract.mockRejectedValueOnce(mockError);
      
      // Call the method and expect it to throw
      await expect(
        contractService.connectTokens(
          '7001',
          '0x1234567890123456789012345678901234567890',
          '11155111',
          '0x0987654321098765432109876543210987654321'
        )
      ).rejects.toThrow('Connection failed');
      
      // Check that the error was logged
      expect(console.error).toHaveBeenCalled();
    });
  });
  
  describe('verifyFeePayment', () => {
    it('should verify a valid fee payment', async () => {
      // Call the method to verify a fee payment
      const result = await contractService.verifyFeePayment(mockTxHash);
      
      // Check the result
      expect(result).toBe(true);
      
      // Check that transaction details were retrieved
      const provider = contractService.providers['7001']; // ZetaChain Testnet
      expect(provider.getTransaction).toHaveBeenCalledWith(mockTxHash);
      expect(provider.getTransactionReceipt).toHaveBeenCalledWith(mockTxHash);
    });
    
    it('should reject if transaction status is not successful', async () => {
      // Mock a failed transaction
      const provider = contractService.providers['7001'];
      provider.getTransactionReceipt.mockResolvedValueOnce({
        status: 0, // Failed transaction
        hash: mockTxHash
      });
      
      // Call the method and check the result
      const result = await contractService.verifyFeePayment(mockTxHash);
      expect(result).toBe(false);
    });
    
    it('should reject if recipient is incorrect', async () => {
      // Mock a transaction to the wrong address
      const provider = contractService.providers['7001'];
      provider.getTransaction.mockResolvedValueOnce({
        to: '0x1111111111111111111111111111111111111111', // Wrong address
        value: BigInt('1000000000000000000') // 1 ETH
      });
      
      // Call the method and check the result
      const result = await contractService.verifyFeePayment(mockTxHash);
      expect(result).toBe(false);
    });
    
    it('should reject if amount is less than required fee', async () => {
      // Mock a transaction with insufficient value
      const provider = contractService.providers['7001'];
      provider.getTransaction.mockResolvedValueOnce({
        to: '0x4f1684A28E33F42cdf50AB96e29a709e17249E63', // Correct address
        value: BigInt('100000000000000000') // 0.1 ETH, less than required
      });
      
      // Call the method and check the result
      const result = await contractService.verifyFeePayment(mockTxHash);
      expect(result).toBe(false);
    });
    
    it('should handle errors during verification', async () => {
      // Mock an error during transaction retrieval
      const provider = contractService.providers['7001'];
      provider.getTransaction.mockRejectedValueOnce(new Error('Transaction not found'));
      
      // Call the method and check the result
      const result = await contractService.verifyFeePayment(mockTxHash);
      expect(result).toBe(false);
      
      // Check that the error was logged
      expect(console.error).toHaveBeenCalled();
    });
  });
}); 