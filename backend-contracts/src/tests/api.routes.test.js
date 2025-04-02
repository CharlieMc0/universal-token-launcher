const request = require('supertest');
const { expect } = require('chai');
const sinon = require('sinon');
const express = require('express');

// Create mock for server
const mockExpress = express();
mockExpress.use(express.json());

// Mock the deploymentRoutes
const deploymentService = require('../services/deployment/deploymentService');
const verificationService = require('../services/verification/verificationService');
const deploymentRoutes = require('../routes/deploymentRoutes');

// Mock the listen method to avoid port conflicts
const mockListen = jest.fn();
mockExpress.listen = mockListen;

// Add routes to mock app
mockExpress.use('/api', deploymentRoutes);
mockExpress.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

describe('API Routes', () => {
  let deployStub, verifyStub;
  
  beforeEach(() => {
    // Stub deployment and verification services
    deployStub = sinon.stub(deploymentService, 'deployUniversalToken');
    verifyStub = sinon.stub(verificationService, 'verifyContract');
  });
  
  afterEach(() => {
    sinon.restore();
    jest.clearAllMocks();
  });
  
  describe('POST /api/deploy', () => {
    it('should successfully deploy tokens', async () => {
      // Setup
      const tokenData = {
        tokenName: 'Test Token',
        tokenSymbol: 'TEST',
        decimals: 18,
        totalSupply: '1000000000000000000000',
        selectedChains: ['7001', '11155111'],
        deployerAddress: '0xDeployerAddress'
      };
      
      const mockDeploymentResult = {
        zetaChain: {
          contractAddress: '0xZetaChainAddress',
          transactionHash: '0xZetaTxHash',
          blockNumber: 12345
        },
        evmChains: {
          '11155111': {
            contractAddress: '0xEVMAddress',
            transactionHash: '0xEVMTxHash',
            blockNumber: 67890
          }
        }
      };
      
      deployStub.resolves(mockDeploymentResult);
      verifyStub.resolves({ success: true });
      
      // Test
      const response = await request(mockExpress)
        .post('/api/deploy')
        .send(tokenData)
        .expect(200);
      
      // Assert
      expect(response.body).to.deep.include({
        success: true,
        message: 'Deployment successful',
        verificationStatus: 'pending'
      });
      expect(response.body.deployment).to.deep.equal(mockDeploymentResult);
      expect(deployStub.calledOnce).to.be.true;
    });
    
    it('should deploy tokens with allocations', async () => {
      // Setup
      const tokenData = {
        tokenName: 'Test Token',
        tokenSymbol: 'TEST',
        decimals: 18,
        totalSupply: '1000000000000000000000',
        selectedChains: ['7001', '11155111'],
        deployerAddress: '0xDeployerAddress',
        allocations: [
          { address: '0x1111111111111111111111111111111111111111', amount: '100000000000000000000' },
          { address: '0x2222222222222222222222222222222222222222', amount: '200000000000000000000' }
        ]
      };
      
      const mockDeploymentResult = {
        zetaChain: {
          contractAddress: '0xZetaChainAddress',
          transactionHash: '0xZetaTxHash',
          blockNumber: 12345
        },
        evmChains: {
          '11155111': {
            contractAddress: '0xEVMAddress',
            transactionHash: '0xEVMTxHash',
            blockNumber: 67890
          }
        }
      };
      
      deployStub.resolves(mockDeploymentResult);
      verifyStub.resolves({ success: true });
      
      // Test
      const response = await request(mockExpress)
        .post('/api/deploy')
        .send(tokenData)
        .expect(200);
      
      // Assert
      expect(response.body).to.deep.include({
        success: true,
        message: 'Deployment successful',
        verificationStatus: 'pending'
      });
      expect(response.body.deployment).to.deep.equal(mockDeploymentResult);
      expect(deployStub.calledOnce).to.be.true;
      
      // Verify deployStub was called with the correct allocations
      const deployArgs = deployStub.firstCall.args;
      expect(deployArgs[0]).to.have.property('allocations');
      expect(deployArgs[0].allocations).to.have.lengthOf(2);
      expect(deployArgs[0].allocations[0].address).to.equal('0x1111111111111111111111111111111111111111');
      expect(deployArgs[0].allocations[0].amount).to.equal('100000000000000000000');
    });
    
    it('should reject invalid allocations', async () => {
      // Setup with invalid allocations (missing address)
      const invalidData = {
        tokenName: 'Test Token',
        tokenSymbol: 'TEST',
        decimals: 18,
        selectedChains: ['7001'],
        deployerAddress: '0xDeployerAddress',
        allocations: [
          { amount: '100000000000000000000' } // Missing address
        ]
      };
      
      // Test
      const response = await request(mockExpress)
        .post('/api/deploy')
        .send(invalidData)
        .expect(400);
      
      // Assert
      expect(response.body).to.deep.include({
        success: false,
        message: 'Invalid allocation format'
      });
      expect(deployStub.called).to.be.false;
    });
    
    it('should reject invalid allocation addresses', async () => {
      // Setup with invalid address format
      const invalidData = {
        tokenName: 'Test Token',
        tokenSymbol: 'TEST',
        decimals: 18,
        selectedChains: ['7001'],
        deployerAddress: '0xDeployerAddress',
        allocations: [
          { address: 'not-an-ethereum-address', amount: '100000000000000000000' }
        ]
      };
      
      // Test
      const response = await request(mockExpress)
        .post('/api/deploy')
        .send(invalidData)
        .expect(400);
      
      // Assert
      expect(response.body).to.deep.include({
        success: false,
        message: 'Invalid allocation address'
      });
      expect(deployStub.called).to.be.false;
    });
    
    it('should validate required fields', async () => {
      // Setup - missing required fields
      const incompleteData = {
        tokenSymbol: 'TEST',
        decimals: 18
      };
      
      // Test
      const response = await request(mockExpress)
        .post('/api/deploy')
        .send(incompleteData)
        .expect(400);
      
      // Assert
      expect(response.body).to.deep.include({
        success: false,
        message: 'Missing required fields'
      });
      expect(deployStub.called).to.be.false;
    });
    
    it('should handle deployment errors', async () => {
      // Setup
      const tokenData = {
        tokenName: 'Test Token',
        tokenSymbol: 'TEST',
        decimals: 18,
        totalSupply: '1000000000000000000000',
        selectedChains: ['7001', '11155111'],
        deployerAddress: '0xDeployerAddress'
      };
      
      const error = new Error('Deployment failed');
      deployStub.rejects(error);
      
      // Test
      const response = await request(mockExpress)
        .post('/api/deploy')
        .send(tokenData)
        .expect(500);
      
      // Assert
      expect(response.body).to.deep.include({
        success: false,
        message: 'Deployment failed',
        details: 'Deployment failed'
      });
    });
  });
  
  describe('POST /api/verify', () => {
    it('should successfully verify a contract', async () => {
      // Setup
      const verifyData = {
        contractAddress: '0xContractAddress',
        chainId: '7001',
        contractType: 'zetachain'
      };
      
      const mockVerificationResult = {
        success: true,
        message: 'Contract verified successfully',
        status: 'verified',
        explorerUrl: 'https://explorer.example.com/address/0xContractAddress'
      };
      
      verifyStub.resolves(mockVerificationResult);
      
      // Test
      const response = await request(mockExpress)
        .post('/api/verify')
        .send(verifyData)
        .expect(200);
      
      // Assert
      expect(response.body).to.deep.equal(mockVerificationResult);
      expect(verifyStub.calledOnce).to.be.true;
      expect(verifyStub.firstCall.args[0]).to.equal(verifyData.contractAddress);
      expect(verifyStub.firstCall.args[1]).to.equal(verifyData.chainId);
      expect(verifyStub.firstCall.args[2]).to.equal('ZetaChainUniversalToken');
    });
    
    it('should validate required fields', async () => {
      // Setup - missing required fields
      const incompleteData = {
        chainId: '7001'
      };
      
      // Test
      const response = await request(mockExpress)
        .post('/api/verify')
        .send(incompleteData)
        .expect(400);
      
      // Assert
      expect(response.body).to.deep.include({
        success: false,
        message: 'Missing required fields'
      });
      expect(verifyStub.called).to.be.false;
    });
    
    it('should validate contract type', async () => {
      // Setup - invalid contract type
      const invalidData = {
        contractAddress: '0xContractAddress',
        chainId: '7001',
        contractType: 'invalid'
      };
      
      // Test
      const response = await request(mockExpress)
        .post('/api/verify')
        .send(invalidData)
        .expect(400);
      
      // Assert
      expect(response.body).to.deep.include({
        success: false,
        message: 'Invalid contractType'
      });
      expect(verifyStub.called).to.be.false;
    });
  });
  
  describe('GET /api/chains', () => {
    it('should return all supported chains', async () => {
      // Test
      const response = await request(mockExpress)
        .get('/api/chains')
        .expect(200);
      
      // Assert
      expect(response.body).to.have.property('success', true);
      expect(response.body).to.have.property('chains');
      expect(response.body.chains).to.be.an('array');
      expect(response.body.chains.length).to.be.greaterThan(0);
    });
  });
  
  describe('GET /health', () => {
    it('should return health status', async () => {
      // Test
      const response = await request(mockExpress)
        .get('/health')
        .expect(200);
      
      // Assert
      expect(response.body).to.have.property('status', 'ok');
      expect(response.body).to.have.property('timestamp');
    });
  });
}); 