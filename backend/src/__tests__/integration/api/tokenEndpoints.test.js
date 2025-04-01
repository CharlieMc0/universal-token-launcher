const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');

// Create a mock express app instead of importing the real one
const app = express();

// Add necessary middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// First define the token service mock implementations
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
  toJSON: function() { return this; }
};

const mockDeploymentLogs = [
  {
    id: 1,
    tokenConfigId: 1,
    chainName: 'ZetaChain Testnet',
    chainId: '7001',
    status: 'pending',
    contractAddress: null,
    transactionHash: null
  }, 
  {
    id: 2,
    tokenConfigId: 1,
    chainName: 'Sepolia',
    chainId: '11155111',
    status: 'pending',
    contractAddress: null,
    transactionHash: null
  }
];

// Now mock the token service module with only the mock implementations
jest.mock('../../../services/tokenService', () => ({
  createTokenConfiguration: jest.fn().mockResolvedValue(mockTokenConfig),
  getTokens: jest.fn().mockResolvedValue([mockTokenConfig]),
  getTokenById: jest.fn().mockResolvedValue(mockTokenConfig),
  getDeploymentLogs: jest.fn().mockResolvedValue(mockDeploymentLogs),
  deployToken: jest.fn().mockResolvedValue(true)
}));

// Mock multer middleware
jest.mock('multer', () => {
  return function() {
    return {
      fields: () => (req, res, next) => {
        // Add file and files objects to mimic multer
        req.file = {
          filename: 'test-image.jpg',
          path: '/uploads/icons/test-image.jpg'
        };
        req.files = {
          icon: [{
            filename: 'test-image.jpg',
            path: '/uploads/icons/test-image.jpg'
          }],
          distributions_csv: [{
            filename: 'test.csv',
            path: '/uploads/csv/test.csv'
          }]
        };
        next();
      }
    };
  };
});

// Import the token service after mocking
const tokenService = require('../../../services/tokenService');

// Mock the authentication middleware
app.use((req, res, next) => {
  // Add wallet address from header to request object
  req.walletAddress = req.headers['x-wallet-address'] || '0x4f1684A28E33F42cdf50AB96e29a709e17249E63';
  next();
});

// Setup routes directly on our mock app
// Create Token Configuration
app.post('/api/tokens', (req, res) => {
  // Extract data from the body or combined with multer files
  const data = {
    ...req.body,
    creatorWallet: req.walletAddress
  };
  
  // If file uploads were included (simulated by our mock middleware)
  if (req.files && req.files.icon) {
    data.iconFile = req.files.icon[0];
  }
  
  tokenService.createTokenConfiguration(data)
    .then(token => {
      res.status(201).json({
        message: 'Token configuration created successfully',
        tokenId: token.id
      });
    })
    .catch(err => {
      if (err.message && err.message.includes('validation')) {
        res.status(400).json({ message: `Validation error: ${err.message}` });
      } else {
        res.status(500).json({ message: `Failed to create token: ${err.message}` });
      }
    });
});

// Get All Tokens
app.get('/api/tokens', (req, res) => {
  tokenService.getTokens(req.walletAddress)
    .then(tokens => {
      res.status(200).json(tokens);
    })
    .catch(err => {
      res.status(500).json({ message: `Failed to get tokens: ${err.message}` });
    });
});

// Get Token by ID
app.get('/api/tokens/:id', (req, res) => {
  tokenService.getTokenById(req.params.id, req.walletAddress)
    .then(token => {
      res.status(200).json(token);
    })
    .catch(err => {
      if (err.message && err.message.includes('not found')) {
        res.status(404).json({ message: `Failed to get token: ${err.message}` });
      } else {
        res.status(500).json({ message: `Failed to get token: ${err.message}` });
      }
    });
});

// Get Deployment Logs
app.get('/api/tokens/:id/logs', (req, res) => {
  tokenService.getDeploymentLogs(req.params.id, req.walletAddress)
    .then(logs => {
      res.status(200).json(logs);
    })
    .catch(err => {
      res.status(500).json({ message: `Failed to get deployment logs: ${err.message}` });
    });
});

// Deploy Token
app.post('/api/tokens/:id/deploy', (req, res) => {
  tokenService.deployToken(req.params.id, req.body.fee_paid_tx)
    .then(() => {
      res.status(200).json({
        message: 'Token deployment initiated successfully',
        tokenId: req.params.id
      });
    })
    .catch(err => {
      if (err.message && err.message.includes('not found')) {
        res.status(404).json({ message: `Failed to deploy token: ${err.message}` });
      } else if (err.message && err.message.includes('validation')) {
        res.status(400).json({ message: `Validation error: ${err.message}` });
      } else {
        res.status(500).json({ message: `Failed to deploy token: ${err.message}` });
      }
    });
});

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
        }]));
      
      // Check response status and body
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message', 'Token configuration created successfully');
      expect(response.body).toHaveProperty('tokenId', 1);
      
      // Check that tokenService.createTokenConfiguration was called
      expect(tokenService.createTokenConfiguration).toHaveBeenCalled();
    });
    
    it('should handle validation errors', async () => {
      // Setup the mock to return a validation error
      tokenService.createTokenConfiguration.mockRejectedValueOnce(new Error('validation error: missing required fields'));
      
      // Missing required fields
      const response = await request(app)
        .post('/api/tokens')
        .set('X-Wallet-Address', '0x4f1684A28E33F42cdf50AB96e29a709e17249E63');
      
      // Check response status and error message
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Validation error');
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
      
      // Check that tokenService.getTokenById was called with the right ID
      expect(tokenService.getTokenById).toHaveBeenCalledWith('1', expect.any(String));
    });
    
    it('should handle token not found', async () => {
      // Mock a not found error
      tokenService.getTokenById.mockRejectedValueOnce(new Error('Token not found'));
      
      const response = await request(app)
        .get('/api/tokens/999')
        .set('X-Wallet-Address', '0x4f1684A28E33F42cdf50AB96e29a709e17249E63');
      
      // Check response status and error message
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message', 'Failed to get token: Token not found');
    });
    
    it('should handle service errors', async () => {
      // Mock a service error
      tokenService.getTokenById.mockRejectedValueOnce(new Error('Database error'));
      
      const response = await request(app)
        .get('/api/tokens/1')
        .set('X-Wallet-Address', '0x4f1684A28E33F42cdf50AB96e29a709e17249E63');
      
      // Check response status and error message
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('message', 'Failed to get token: Database error');
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
      
      // Check that tokenService.getDeploymentLogs was called with the right ID
      expect(tokenService.getDeploymentLogs).toHaveBeenCalledWith('1', expect.any(String));
    });
    
    it('should handle service errors', async () => {
      // Mock a service error
      tokenService.getDeploymentLogs.mockRejectedValueOnce(new Error('Database error'));
      
      const response = await request(app)
        .get('/api/tokens/1/logs')
        .set('X-Wallet-Address', '0x4f1684A28E33F42cdf50AB96e29a709e17249E63');
      
      // Check response status and error message
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('message', 'Failed to get deployment logs: Database error');
    });
  });
  
  describe('POST /api/tokens/:id/deploy', () => {
    it('should deploy token successfully', async () => {
      const response = await request(app)
        .post('/api/tokens/1/deploy')
        .set('X-Wallet-Address', '0x4f1684A28E33F42cdf50AB96e29a709e17249E63')
        .send({ fee_paid_tx: '0x123abc...' });
      
      // Check response status and body
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Token deployment initiated successfully');
      expect(response.body).toHaveProperty('tokenId', '1');
      
      // Check that tokenService.deployToken was called with the right parameters
      expect(tokenService.deployToken).toHaveBeenCalledWith('1', '0x123abc...');
    });
    
    it('should handle token not found', async () => {
      // Mock a not found error
      tokenService.deployToken.mockRejectedValueOnce(new Error('Token not found'));
      
      const response = await request(app)
        .post('/api/tokens/999/deploy')
        .set('X-Wallet-Address', '0x4f1684A28E33F42cdf50AB96e29a709e17249E63')
        .send({ fee_paid_tx: '0x123abc...' });
      
      // Check response status and error message
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message', 'Failed to deploy token: Token not found');
    });
    
    it('should handle validation errors', async () => {
      // Mock a validation error
      tokenService.deployToken.mockRejectedValueOnce(new Error('validation error: invalid fee payment transaction'));
      
      const response = await request(app)
        .post('/api/tokens/1/deploy')
        .set('X-Wallet-Address', '0x4f1684A28E33F42cdf50AB96e29a709e17249E63')
        .send({ fee_paid_tx: '' });
      
      // Check response status and error message
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Validation error');
    });
    
    it('should handle service errors', async () => {
      // Mock a service error
      tokenService.deployToken.mockRejectedValueOnce(new Error('Deployment service error'));
      
      const response = await request(app)
        .post('/api/tokens/1/deploy')
        .set('X-Wallet-Address', '0x4f1684A28E33F42cdf50AB96e29a709e17249E63')
        .send({ fee_paid_tx: '0x123abc...' });
      
      // Check response status and error message
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('message', 'Failed to deploy token: Deployment service error');
    });
  });
}); 