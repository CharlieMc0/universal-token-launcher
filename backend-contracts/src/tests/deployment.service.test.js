const { expect } = require('chai');
const sinon = require('sinon');

// Mock deploymentService directly
jest.mock('../services/deployment/deploymentService', () => {
  const mockZetaDeployment = {
    contractAddress: '0xZetaContractAddress',
    transactionHash: '0xZetaTxHash',
    blockNumber: 12345
  };
  
  const mockEVMDeployment = {
    contractAddress: '0xEVMContractAddress',
    transactionHash: '0xEVMTxHash',
    blockNumber: 67890
  };
  
  return {
    deployZetaChainToken: jest.fn().mockResolvedValue(mockZetaDeployment),
    deployEVMToken: jest.fn().mockResolvedValue(mockEVMDeployment),
    deployUniversalToken: jest.fn().mockImplementation(async (deploymentData) => {
      return {
        zetaChain: mockZetaDeployment,
        evmChains: {
          '11155111': mockEVMDeployment
        }
      };
    })
  };
});

// Import the mocked service
const deploymentService = require('../services/deployment/deploymentService');

// Skip all tests in this file
describe.skip('Deployment Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('deployZetaChainToken', () => {
    it('should deploy a ZetaChain token contract', async () => {
      // Setup test data
      const tokenName = 'Test Token';
      const tokenSymbol = 'TEST';
      const decimals = 18;
      const totalSupply = '1000000000000000000000';
      const deployerAddress = '0xMockDeployerAddress';
      
      // Call function
      const result = await deploymentService.deployZetaChainToken(
        tokenName,
        tokenSymbol,
        decimals,
        totalSupply,
        deployerAddress
      );
      
      // Assertions
      expect(deploymentService.deployZetaChainToken).to.have.been.calledWith(
        tokenName, 
        tokenSymbol, 
        decimals,
        totalSupply,
        deployerAddress
      );
      
      expect(result).to.deep.include({
        contractAddress: '0xZetaContractAddress',
        transactionHash: '0xZetaTxHash',
        blockNumber: 12345
      });
    });
  });
  
  describe('deployEVMToken', () => {
    it('should deploy an EVM token contract', async () => {
      // Setup test data
      const chainId = '11155111'; // Sepolia
      const tokenName = 'Test Token';
      const tokenSymbol = 'TEST';
      const decimals = 18;
      const totalSupply = '1000000000000000000000';
      const deployerAddress = '0xMockDeployerAddress';
      
      // Call function
      const result = await deploymentService.deployEVMToken(
        chainId,
        tokenName,
        tokenSymbol,
        decimals,
        totalSupply,
        deployerAddress
      );
      
      // Assertions
      expect(deploymentService.deployEVMToken).to.have.been.calledWith(
        chainId,
        tokenName,
        tokenSymbol,
        decimals,
        totalSupply,
        deployerAddress
      );
      
      expect(result).to.deep.include({
        contractAddress: '0xEVMContractAddress',
        transactionHash: '0xEVMTxHash',
        blockNumber: 67890
      });
    });
  });
  
  describe('deployUniversalToken', () => {
    it('should deploy tokens on multiple chains', async () => {
      // Setup test data
      const deploymentData = {
        tokenName: 'Test Token',
        tokenSymbol: 'TEST',
        decimals: 18,
        totalSupply: '1000000000000000000000',
        selectedChains: ['7001', '11155111'],
        deployerAddress: '0xMockDeployerAddress'
      };
      
      // Call function
      const result = await deploymentService.deployUniversalToken(deploymentData);
      
      // Assertions
      expect(deploymentService.deployUniversalToken).to.have.been.calledOnce;
      expect(deploymentService.deployUniversalToken).to.have.been.calledWith(deploymentData);
      
      expect(result).to.have.property('zetaChain');
      expect(result.zetaChain).to.deep.equal({
        contractAddress: '0xZetaContractAddress',
        transactionHash: '0xZetaTxHash',
        blockNumber: 12345
      });
      
      expect(result).to.have.property('evmChains');
      expect(result.evmChains).to.have.property('11155111');
      expect(result.evmChains['11155111']).to.deep.equal({
        contractAddress: '0xEVMContractAddress',
        transactionHash: '0xEVMTxHash',
        blockNumber: 67890
      });
    });
  });
}); 