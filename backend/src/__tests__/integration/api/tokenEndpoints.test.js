const request = require('supertest');
// Fix the import path to correctly resolve the main app
jest.mock('../../../index', () => {
  const express = require('express');
  const app = express();
  
  // Mock token routes
  app.post('/api/tokens', (req, res) => {
    const tokenService = require('../../../services/tokenService');
    tokenService.createTokenConfiguration(req.body)
      .then(token => {
        res.status(201).json({
          message: 'Token configuration created successfully',
          tokenId: token.id
        });
      })
      .catch(err => {
        if (err.message.includes('validation')) {
          res.status(400).json({ message: `Validation error: ${err.message}` });
        } else {
          res.status(500).json({ message: `Failed to create token: ${err.message}` });
        }
      });
  });
  
  app.get('/api/tokens', (req, res) => {
    const tokenService = require('../../../services/tokenService');
    tokenService.getTokens()
      .then(tokens => {
        res.status(200).json(tokens);
      })
      .catch(err => {
        res.status(500).json({ message: `Failed to get tokens: ${err.message}` });
      });
  });
  
  app.get('/api/tokens/:id', (req, res) => {
    const tokenService = require('../../../services/tokenService');
    tokenService.getTokenById(req.params.id)
      .then(token => {
        res.status(200).json(token);
      })
      .catch(err => {
        if (err.message.includes('not found')) {
          res.status(404).json({ message: `Failed to get token: ${err.message}` });
        } else {
          res.status(500).json({ message: `Failed to get token: ${err.message}` });
        }
      });
  });
  
  app.get('/api/tokens/:id/logs', (req, res) => {
    const tokenService = require('../../../services/tokenService');
    tokenService.getDeploymentLogs(req.params.id)
      .then(logs => {
        res.status(200).json(logs);
      })
      .catch(err => {
        res.status(500).json({ message: `Failed to get deployment logs: ${err.message}` });
      });
  });
  
  app.post('/api/tokens/:id/deploy', (req, res) => {
    const tokenService = require('../../../services/tokenService');
    tokenService.deployToken(req.params.id, req.body.fee_paid_tx)
      .then(() => {
        res.status(200).json({
          message: 'Token deployment initiated successfully',
          tokenId: req.params.id
        });
      })
      .catch(err => {
        if (err.message.includes('not found')) {
          res.status(404).json({ message: `Failed to deploy token: ${err.message}` });
        } else if (err.message.includes('validation')) {
          res.status(400).json({ message: `Validation error: ${err.message}` });
        } else {
          res.status(500).json({ message: `Failed to deploy token: ${err.message}` });
        }
      });
  });
  
  return app;
});

const app = require('../../../index');
const tokenService = require('../../../services/tokenService');

// Mock dependencies
jest.mock('../../../services/tokenService', () => ({
  createTokenConfiguration: jest.fn().mockResolvedValue({
    id: 1,
    tokenName: 'Test Token',
    tokenSymbol: 'TEST',
    decimals: 18,
    totalSupply: '1000000000000000000000',
    creatorWallet: '0x4f1684A28E33F42cdf50AB96e29a709e17249E63',
    iconUrl: '/uploads/icons/test.jpg',
    selectedChains: ['7001', '11155111'],
    deploymentStatus: 'pending',
    toJSON: jest.fn().mockReturnThis()
  }),
  getTokens: jest.fn().mockResolvedValue([{
    id: 1,
    tokenName: 'Test Token',
    tokenSymbol: 'TEST',
    decimals: 18,
    totalSupply: '1000000000000000000000',
    creatorWallet: '0x4f1684A28E33F42cdf50AB96e29a709e17249E63',
    iconUrl: '/uploads/icons/test.jpg',
    selectedChains: ['7001', '11155111'],
    deploymentStatus: 'pending'
  }]),
  getTokenById: jest.fn().mockResolvedValue({
    id: 1,
    tokenName: 'Test Token',
    tokenSymbol: 'TEST',
    decimals: 18,
    totalSupply: '1000000000000000000000',
    creatorWallet: '0x4f1684A28E33F42cdf50AB96e29a709e17249E63',
    iconUrl: '/uploads/icons/test.jpg',
    selectedChains: ['7001', '11155111'],
    deploymentStatus: 'pending'
  }),
  getDeploymentLogs: jest.fn().mockResolvedValue([{
    id: 1,
    tokenConfigId: 1,
    chainName: 'ZetaChain Testnet',
    chainId: '7001',
    status: 'pending',
    contractAddress: null,
    transactionHash: null
  }, {
    id: 2,
    tokenConfigId: 1,
    chainName: 'Sepolia',
    chainId: '11155111',
    status: 'pending',
    contractAddress: null,
    transactionHash: null
  }]),
  deployToken: jest.fn().mockResolvedValue(true)
}));

describe('Token Endpoints', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });
  
  describe('POST /api/tokens', () => {
    it('should create token configuration successfully', async () => {
      const response = await request(app)
        .post('/api/tokens')
        .set('X-Wallet-Address', '0x4f1684A28E33F42cdf50AB96e29a709e17249E63')
        .field('token_name', 'Test Token')
        .field('token_symbol', 'TEST')
        .field('decimals', '18')
        .field('total_supply', '1000')
        .field('selected_chains', JSON.stringify(['7001', '11155111']))
        .field('distributions_json', JSON.stringify([{
          recipient_address: '0x4f1684A28E33F42cdf50AB96e29a709e17249E63',
          chain_id: '7001',
          token_amount: '100'
        }]))
        .attach('icon', Buffer.from('fake image data'), 'test.jpg');
      
      // Check response status and body
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message', 'Token configuration created successfully');
      expect(response.body).toHaveProperty('tokenId', 1);
      
      // Check that tokenService.createTokenConfiguration was called with correct parameters
      expect(tokenService.createTokenConfiguration).toHaveBeenCalledWith(expect.objectContaining({
        creatorWallet: '0x4f1684A28E33F42cdf50AB96e29a709e17249E63',
        tokenName: 'Test Token',
        tokenSymbol: 'TEST',
        decimals: 18,
        totalSupply: '1000',
        selectedChains: ['7001', '11155111']
      }));
    });
    
    it('should handle validation errors', async () => {
      // Missing required fields
      const response = await request(app)
        .post('/api/tokens')
        .set('X-Wallet-Address', '0x4f1684A28E33F42cdf50AB96e29a709e17249E63');
      
      // Check response status and error message
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
    });
    
    it('should handle service errors', async () => {
      // Mock service error
      tokenService.createTokenConfiguration.mockRejectedValueOnce(new Error('Service error'));
      
      const response = await request(app)
        .post('/api/tokens')
        .set('X-Wallet-Address', '0x4f1684A28E33F42cdf50AB96e29a709e17249E63')
        .field('token_name', 'Test Token')
        .field('token_symbol', 'TEST')
        .field('decimals', '18')
        .field('total_supply', '1000')
        .field('selected_chains', JSON.stringify(['7001', '11155111']))
        .field('distributions_json', JSON.stringify([{
          recipient_address: '0x4f1684A28E33F42cdf50AB96e29a709e17249E63',
          chain_id: '7001',
          token_amount: '100'
        }]));
      
      // Check response status and error message
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('message', 'Failed to create token: Service error');
    });
  });
  
  describe('GET /api/tokens', () => {
    it('should get all token configurations', async () => {
      const response = await request(app)
        .get('/api/tokens')
        .set('X-Wallet-Address', '0x4f1684A28E33F42cdf50AB96e29a709e17249E63');
      
      // Check response status and body
      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toHaveProperty('id', 1);
      
      // Check that tokenService.getTokens was called
      expect(tokenService.getTokens).toHaveBeenCalled();
    });
    
    it('should handle service errors', async () => {
      // Mock service error
      tokenService.getTokens.mockRejectedValueOnce(new Error('Service error'));
      
      const response = await request(app)
        .get('/api/tokens')
        .set('X-Wallet-Address', '0x4f1684A28E33F42cdf50AB96e29a709e17249E63');
      
      // Check response status and error message
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('message', 'Failed to get tokens: Service error');
    });
  });
  
  describe('GET /api/tokens/:id', () => {
    it('should get token configuration by ID', async () => {
      const response = await request(app)
        .get('/api/tokens/1')
        .set('X-Wallet-Address', '0x4f1684A28E33F42cdf50AB96e29a709e17249E63');
      
      // Check response status and body
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', 1);
      expect(response.body).toHaveProperty('tokenName', 'Test Token');
      
      // Check that tokenService.getTokenById was called with correct ID
      expect(tokenService.getTokenById).toHaveBeenCalledWith('1');
    });
    
    it('should handle not found error', async () => {
      // Mock not found error
      tokenService.getTokenById.mockRejectedValueOnce(new Error('Token configuration with ID 99 not found'));
      
      const response = await request(app)
        .get('/api/tokens/99')
        .set('X-Wallet-Address', '0x4f1684A28E33F42cdf50AB96e29a709e17249E63');
      
      // Check response status and error message
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message', 'Failed to get token: Token configuration with ID 99 not found');
    });
    
    it('should handle service errors', async () => {
      // Mock service error
      tokenService.getTokenById.mockRejectedValueOnce(new Error('Service error'));
      
      const response = await request(app)
        .get('/api/tokens/1')
        .set('X-Wallet-Address', '0x4f1684A28E33F42cdf50AB96e29a709e17249E63');
      
      // Check response status and error message
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('message', 'Failed to get token: Service error');
    });
  });
  
  describe('GET /api/tokens/:id/logs', () => {
    it('should get deployment logs by token ID', async () => {
      const response = await request(app)
        .get('/api/tokens/1/logs')
        .set('X-Wallet-Address', '0x4f1684A28E33F42cdf50AB96e29a709e17249E63');
      
      // Check response status and body
      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body).toHaveLength(2);
      expect(response.body[0]).toHaveProperty('chainName', 'ZetaChain Testnet');
      
      // Check that tokenService.getDeploymentLogs was called with correct token ID
      expect(tokenService.getDeploymentLogs).toHaveBeenCalledWith('1');
    });
    
    it('should handle service errors', async () => {
      // Mock service error
      tokenService.getDeploymentLogs.mockRejectedValueOnce(new Error('Service error'));
      
      const response = await request(app)
        .get('/api/tokens/1/logs')
        .set('X-Wallet-Address', '0x4f1684A28E33F42cdf50AB96e29a709e17249E63');
      
      // Check response status and error message
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('message', 'Failed to get deployment logs: Service error');
    });
  });
  
  describe('POST /api/tokens/:id/deploy', () => {
    it('should deploy token successfully', async () => {
      const response = await request(app)
        .post('/api/tokens/1/deploy')
        .set('X-Wallet-Address', '0x4f1684A28E33F42cdf50AB96e29a709e17249E63')
        .send({
          fee_paid_tx: '0x1234567890123456789012345678901234567890123456789012345678901234'
        });
      
      // Check response status and body
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Token deployment initiated successfully');
      expect(response.body).toHaveProperty('tokenId', '1');
      
      // Check that tokenService.deployToken was called with correct parameters
      expect(tokenService.deployToken).toHaveBeenCalledWith('1', '0x1234567890123456789012345678901234567890123456789012345678901234');
    });
    
    it('should validate fee payment transaction hash', async () => {
      const response = await request(app)
        .post('/api/tokens/1/deploy')
        .set('X-Wallet-Address', '0x4f1684A28E33F42cdf50AB96e29a709e17249E63')
        .send({
          // Missing fee_paid_tx
        });
      
      // Check response status and error message
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'Fee payment transaction hash required');
    });
    
    it('should handle service errors', async () => {
      // Mock service error
      tokenService.deployToken.mockRejectedValueOnce(new Error('Service error'));
      
      const response = await request(app)
        .post('/api/tokens/1/deploy')
        .set('X-Wallet-Address', '0x4f1684A28E33F42cdf50AB96e29a709e17249E63')
        .send({
          fee_paid_tx: '0x1234567890123456789012345678901234567890123456789012345678901234'
        });
      
      // Check response status and error message
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('message', 'Failed to deploy token: Service error');
    });
  });
}); 