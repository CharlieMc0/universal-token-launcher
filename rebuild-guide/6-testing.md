# 6. Testing

This section covers implementing tests for the Universal Token Launcher backend, including unit tests, integration tests, and utility scripts for testing blockchain interactions.

## Unit Tests

### Chain Information Utility Tests

Create a test file for the chain information utility (`src/tests/unit/utils/chainInfo.test.ts`):

```typescript
import chainInfo from '../../../utils/chainInfo';

describe('Chain Info Utility', () => {
  describe('getChainInfo', () => {
    it('should return information for valid chain ID', () => {
      const chain = chainInfo.getChainInfo('7001');
      expect(chain).toBeDefined();
      expect(chain?.name).toBe('ZetaChain Testnet');
      expect(chain?.isZetaChain).toBe(true);
    });

    it('should return undefined for invalid chain ID', () => {
      const chain = chainInfo.getChainInfo('999999');
      expect(chain).toBeUndefined();
    });
  });

  describe('isZetaChain', () => {
    it('should return true for ZetaChain IDs', () => {
      expect(chainInfo.isZetaChain('7001')).toBe(true);
      expect(chainInfo.isZetaChain('7000')).toBe(true);
    });

    it('should return false for non-ZetaChain IDs', () => {
      expect(chainInfo.isZetaChain('11155111')).toBe(false);
      expect(chainInfo.isZetaChain('999999')).toBe(false);
    });
  });

  describe('getSupportedChains', () => {
    it('should return only supported chains', () => {
      const chains = chainInfo.getSupportedChains();
      expect(chains).toBeInstanceOf(Array);
      expect(chains.length).toBeGreaterThan(0);
      
      // All returned chains should have isSupported === true
      chains.forEach(chain => {
        expect(chain.isSupported).toBe(true);
      });
    });
  });

  describe('getExplorerTxUrl', () => {
    it('should return valid transaction URL', () => {
      const txHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      const url = chainInfo.getExplorerTxUrl('7001', txHash);
      expect(url).toBe(`https://athens.explorer.zetachain.com/tx/${txHash}`);
    });

    it('should return empty string for invalid chain ID', () => {
      const url = chainInfo.getExplorerTxUrl('999999', '0x1234');
      expect(url).toBe('');
    });
  });

  describe('getExplorerAddressUrl', () => {
    it('should return valid address URL', () => {
      const address = '0x1234567890abcdef1234567890abcdef12345678';
      const url = chainInfo.getExplorerAddressUrl('7001', address);
      expect(url).toBe(`https://athens.explorer.zetachain.com/address/${address}`);
    });

    it('should return empty string for invalid chain ID', () => {
      const url = chainInfo.getExplorerAddressUrl('999999', '0x1234');
      expect(url).toBe('');
    });
  });

  describe('getBlockscoutApiUrl', () => {
    it('should return API URL for chains with Blockscout', () => {
      const apiUrl = chainInfo.getBlockscoutApiUrl('7001');
      expect(apiUrl).toBe('https://zetachain-testnet.blockscout.com/api/v2');
    });

    it('should return null for chains without Blockscout', () => {
      const apiUrl = chainInfo.getBlockscoutApiUrl('11155111');
      expect(apiUrl).toBeNull();
    });

    it('should return null for invalid chain ID', () => {
      const apiUrl = chainInfo.getBlockscoutApiUrl('999999');
      expect(apiUrl).toBeNull();
    });
  });

  describe('getFormattedChainInfo', () => {
    it('should merge base chain info with contract details', () => {
      const contractInfo = {
        contractAddress: '0x1234567890abcdef1234567890abcdef12345678',
        deploymentStatus: 'success'
      };
      
      const result = chainInfo.getFormattedChainInfo('7001', contractInfo);
      
      expect(result).toHaveProperty('name', 'ZetaChain Testnet');
      expect(result).toHaveProperty('contractAddress', '0x1234567890abcdef1234567890abcdef12345678');
      expect(result).toHaveProperty('deploymentStatus', 'success');
    });

    it('should return null for invalid chain ID', () => {
      const result = chainInfo.getFormattedChainInfo('999999');
      expect(result).toBeNull();
    });
  });
});
```

### File Upload Utility Tests

Create a test file for the file upload utility (`src/tests/unit/utils/fileUpload.test.ts`):

```typescript
import mockFs from 'mock-fs';
import fs from 'fs';
import path from 'path';
import { deleteFile, getFilePath } from '../../../utils/fileUpload';

// Mock the logger to avoid console output during tests
jest.mock('../../../utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

describe('File Upload Utility', () => {
  beforeEach(() => {
    // Setup mock file system
    mockFs({
      'uploads': {
        'icons': {
          'test-icon.png': Buffer.from('fake image content')
        },
        'csv': {
          'test-csv.csv': 'recipient_address,chain_id,token_amount\n0x123,7001,100'
        }
      }
    });
  });

  afterEach(() => {
    // Restore real file system
    mockFs.restore();
    jest.clearAllMocks();
  });

  describe('deleteFile', () => {
    it('should delete a file if it exists', async () => {
      const filePath = '/uploads/icons/test-icon.png';
      const fullPath = path.join(process.cwd(), filePath);
      
      // Verify file exists before deletion
      expect(fs.existsSync(fullPath)).toBe(true);
      
      const result = await deleteFile(filePath);
      
      // Verify deletion success
      expect(result).toBe(true);
      expect(fs.existsSync(fullPath)).toBe(false);
    });

    it('should return false if file does not exist', async () => {
      const filePath = '/uploads/icons/nonexistent.png';
      const result = await deleteFile(filePath);
      
      expect(result).toBe(false);
    });

    it('should return false if path is empty', async () => {
      const result = await deleteFile('');
      expect(result).toBe(false);
    });
  });

  describe('getFilePath', () => {
    it('should return correct URL path for a file', () => {
      const mockFile = {
        path: path.join(process.cwd(), 'uploads', 'icons', 'test-icon.png'),
        filename: 'test-icon.png',
        originalname: 'original.png',
        encoding: '7bit',
        mimetype: 'image/png',
        destination: path.join(process.cwd(), 'uploads', 'icons'),
        fieldname: 'icon',
        size: 1000
      };
      
      const result = getFilePath(mockFile);
      expect(result).toBe('/uploads/icons/test-icon.png');
    });
  });
});
```

### Error Handler Tests

Create a test file for the error handler utility (`src/tests/unit/utils/errorHandler.test.ts`):

```typescript
import { sendErrorResponse, handleApiError } from '../../../utils/errorHandler';

// Mock Response object
const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

// Mock logger
jest.mock('../../../utils/logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

describe('Error Handler Utility', () => {
  let res;
  
  // Store original env and reset after tests
  const originalEnv = process.env;
  
  beforeEach(() => {
    res = mockResponse();
    process.env = { ...originalEnv };
  });
  
  afterEach(() => {
    jest.clearAllMocks();
    process.env = originalEnv;
  });
  
  describe('sendErrorResponse', () => {
    it('should send error response with default status code', () => {
      sendErrorResponse(res, 'Test error message');
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: true,
        message: 'Test error message',
        statusCode: 400
      });
    });
    
    it('should send error response with custom status code', () => {
      sendErrorResponse(res, 'Not found', null, 404);
      
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: true,
        message: 'Not found',
        statusCode: 404
      });
    });
    
    it('should include details in debug mode', () => {
      process.env.DEBUG = 'true';
      
      sendErrorResponse(res, 'Error with details', 'Detailed error info');
      
      expect(res.json).toHaveBeenCalledWith({
        error: true,
        message: 'Error with details',
        details: 'Detailed error info',
        statusCode: 400
      });
    });
    
    it('should not include details when not in debug mode', () => {
      process.env.DEBUG = 'false';
      
      sendErrorResponse(res, 'Error without details', 'Should not be included');
      
      expect(res.json).toHaveBeenCalledWith({
        error: true,
        message: 'Error without details',
        statusCode: 400
      });
    });
  });
  
  describe('handleApiError', () => {
    it('should log error and send response with default message and status code', () => {
      const error = new Error('Test error');
      
      handleApiError(res, error);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: true,
        message: 'An error occurred',
        statusCode: 500
      });
    });
    
    it('should use custom message and status code', () => {
      const error = new Error('Database error');
      
      handleApiError(res, error, 'Error accessing database', 503);
      
      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith({
        error: true,
        message: 'Error accessing database',
        statusCode: 503
      });
    });
  });
});
```

## Integration Tests

### Token Service Tests

Create an integration test for the Token Service (`src/tests/integration/services/TokenService.test.ts`):

```typescript
import db from '../../../db';
import tokenService from '../../../services/TokenService';

// Mock contract service
jest.mock('../../../services/ContractService', () => ({
  __esModule: true,
  default: {
    deployContract: jest.fn().mockImplementation((tokenId, tokenConfig, chainId) => {
      return Promise.resolve({
        success: true,
        contractAddress: '0x' + '1'.repeat(40),
        transactionHash: '0x' + '2'.repeat(64)
      });
    }),
    connectTokens: jest.fn().mockResolvedValue({ success: true }),
    verifyContract: jest.fn().mockResolvedValue({ success: true, verifiedUrl: 'https://explorer.example.com' })
  }
}));

describe('Token Service Integration', () => {
  beforeAll(async () => {
    // Connect to test database and sync models
    await db.sequelize.sync({ force: true });
  });
  
  afterAll(async () => {
    // Close database connection
    await db.sequelize.close();
  });
  
  beforeEach(async () => {
    // Clear data before each test
    await db.TokenConfiguration.destroy({ where: {}, force: true });
    await db.DeploymentLog.destroy({ where: {}, force: true });
    await db.TokenDistribution.destroy({ where: {}, force: true });
  });
  
  describe('createTokenConfiguration', () => {
    it('should create a token configuration with deployment logs', async () => {
      const tokenData = {
        creatorWallet: '0x' + '3'.repeat(40),
        token_name: 'Test Token',
        token_symbol: 'TST',
        decimals: 18,
        total_supply: '1000000000000000000000',
        selected_chains: JSON.stringify(['7001', '11155111']),
        iconUrl: '/uploads/icons/test-icon.png'
      };
      
      const result = await tokenService.createTokenConfiguration(tokenData);
      
      // Check token configuration
      expect(result).toBeDefined();
      expect(result.tokenName).toBe('Test Token');
      expect(result.tokenSymbol).toBe('TST');
      expect(result.creatorWallet).toBe(tokenData.creatorWallet);
      expect(result.deploymentStatus).toBe('pending');
      
      // Check chain info
      expect(result.chainInfo).toHaveLength(2);
      expect(result.chainInfo[0].deploymentStatus).toBe('pending');
      expect(result.chainInfo[1].deploymentStatus).toBe('pending');
      
      // Verify deployment logs were created
      const deploymentLogs = await db.DeploymentLog.findAll({
        where: { tokenId: result.id }
      });
      
      expect(deploymentLogs).toHaveLength(2);
    });
    
    it('should create token distributions if provided', async () => {
      const tokenData = {
        creatorWallet: '0x' + '3'.repeat(40),
        token_name: 'Distribution Test',
        token_symbol: 'DIST',
        decimals: 18,
        total_supply: '1000000000000000000000',
        selected_chains: JSON.stringify(['7001']),
        distributions_json: JSON.stringify([
          {
            recipient_address: '0x' + '4'.repeat(40),
            chain_id: '7001',
            token_amount: '100000000000000000000'
          }
        ])
      };
      
      const result = await tokenService.createTokenConfiguration(tokenData);
      
      // Verify distributions were created
      const distributions = await db.TokenDistribution.findAll({
        where: { tokenId: result.id }
      });
      
      expect(distributions).toHaveLength(1);
      expect(distributions[0].recipientAddress).toBe('0x' + '4'.repeat(40));
      expect(distributions[0].tokenAmount).toBe('100000000000000000000');
    });
  });
  
  describe('deployToken', () => {
    it('should deploy token to selected chains', async () => {
      // Create test token
      const tokenData = {
        creatorWallet: '0x' + '3'.repeat(40),
        token_name: 'Deploy Test',
        token_symbol: 'DPLY',
        decimals: 18,
        total_supply: '1000000000000000000000',
        selected_chains: JSON.stringify(['7001', '11155111']),
      };
      
      const token = await tokenService.createTokenConfiguration(tokenData);
      
      // Deploy token
      const deployResult = await tokenService.deployToken(token.id, '0x' + '5'.repeat(64));
      
      // Check deployment result
      expect(deployResult.success).toBe(true);
      expect(deployResult.status).toBe('completed');
      
      // Verify token status was updated
      const updatedToken = await tokenService.getTokenById(token.id);
      expect(updatedToken.deploymentStatus).toBe('completed');
      
      // Verify deployment logs were updated
      const deploymentLogs = await db.DeploymentLog.findAll({
        where: { tokenId: token.id }
      });
      
      expect(deploymentLogs).toHaveLength(2);
      expect(deploymentLogs[0].deploymentStatus).toBe('success');
      expect(deploymentLogs[1].deploymentStatus).toBe('success');
    });
  });
  
  describe('findUserUniversalTokens', () => {
    it('should return tokens created by a wallet address', async () => {
      const walletAddress = '0x' + '6'.repeat(40);
      
      // Create test tokens
      const tokenData1 = {
        creatorWallet: walletAddress,
        token_name: 'User Token 1',
        token_symbol: 'UT1',
        decimals: 18,
        total_supply: '1000000000000000000000',
        selected_chains: JSON.stringify(['7001']),
      };
      
      const tokenData2 = {
        creatorWallet: walletAddress,
        token_name: 'User Token 2',
        token_symbol: 'UT2',
        decimals: 18,
        total_supply: '2000000000000000000000',
        selected_chains: JSON.stringify(['11155111']),
      };
      
      await tokenService.createTokenConfiguration(tokenData1);
      await tokenService.createTokenConfiguration(tokenData2);
      
      // Find user tokens
      const tokens = await tokenService.findUserUniversalTokens(walletAddress);
      
      // Verify tokens were found
      expect(tokens).toHaveLength(2);
      expect(tokens[0].tokenSymbol).toBe('UT1');
      expect(tokens[1].tokenSymbol).toBe('UT2');
    });
  });
});
```

### API Endpoint Tests

Create integration tests for the API endpoints (`src/tests/integration/api/tokenEndpoints.test.ts`):

```typescript
import request from 'supertest';
import app from '../../../index';
import db from '../../../db';

describe('Token API Endpoints', () => {
  const testWalletAddress = '0x' + '7'.repeat(40);
  
  beforeAll(async () => {
    // Connect to test database and sync models
    await db.sequelize.sync({ force: true });
  });
  
  afterAll(async () => {
    // Close database connection
    await db.sequelize.close();
  });
  
  beforeEach(async () => {
    // Clear data before each test
    await db.TokenConfiguration.destroy({ where: {}, force: true });
    await db.DeploymentLog.destroy({ where: {}, force: true });
    await db.TokenDistribution.destroy({ where: {}, force: true });
  });
  
  describe('POST /api/tokens', () => {
    it('should create a new token configuration', async () => {
      const response = await request(app)
        .post('/api/tokens')
        .set('X-Wallet-Address', testWalletAddress)
        .send({
          token_name: 'API Test Token',
          token_symbol: 'API',
          decimals: 18,
          total_supply: '1000000000000000000000',
          selected_chains: JSON.stringify(['7001'])
        });
      
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.tokenName).toBe('API Test Token');
      expect(response.body.tokenSymbol).toBe('API');
      expect(response.body.creatorWallet).toBe(testWalletAddress);
    });
    
    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/tokens')
        .set('X-Wallet-Address', testWalletAddress)
        .send({
          token_symbol: 'API',
          decimals: 18
          // Missing token_name, total_supply, selected_chains
        });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBe(true);
    });
  });
  
  describe('GET /api/tokens/:id', () => {
    it('should return a token by ID', async () => {
      // Create a token first
      const createResponse = await request(app)
        .post('/api/tokens')
        .set('X-Wallet-Address', testWalletAddress)
        .send({
          token_name: 'Get Token Test',
          token_symbol: 'GET',
          decimals: 18,
          total_supply: '1000000000000000000000',
          selected_chains: JSON.stringify(['7001'])
        });
      
      const tokenId = createResponse.body.id;
      
      // Get the token
      const getResponse = await request(app)
        .get(`/api/tokens/${tokenId}`)
        .set('X-Wallet-Address', testWalletAddress);
      
      expect(getResponse.status).toBe(200);
      expect(getResponse.body.id).toBe(tokenId);
      expect(getResponse.body.tokenName).toBe('Get Token Test');
    });
    
    it('should return 404 for non-existent token', async () => {
      const response = await request(app)
        .get('/api/tokens/9999')
        .set('X-Wallet-Address', testWalletAddress);
      
      expect(response.status).toBe(404);
    });
  });
  
  describe('GET /api/tokens', () => {
    it('should return all tokens for a wallet', async () => {
      // Create multiple tokens
      await request(app)
        .post('/api/tokens')
        .set('X-Wallet-Address', testWalletAddress)
        .send({
          token_name: 'List Token 1',
          token_symbol: 'LST1',
          decimals: 18,
          total_supply: '1000000000000000000000',
          selected_chains: JSON.stringify(['7001'])
        });
      
      await request(app)
        .post('/api/tokens')
        .set('X-Wallet-Address', testWalletAddress)
        .send({
          token_name: 'List Token 2',
          token_symbol: 'LST2',
          decimals: 18,
          total_supply: '1000000000000000000000',
          selected_chains: JSON.stringify(['11155111'])
        });
      
      // Get all tokens
      const response = await request(app)
        .get('/api/tokens')
        .set('X-Wallet-Address', testWalletAddress);
      
      expect(response.status).toBe(200);
      expect(response.body.tokens).toHaveLength(2);
    });
  });
});
```

## Blockchain Testing Scripts

Create a script for testing contract deployment (`src/scripts/test-deployment.js`):

```javascript
const { ethers } = require('ethers');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config();

// Read contract artifacts
function getContractDetails(contractType) {
  try {
    const searchPaths = [
      path.resolve(process.cwd(), `standard-contracts/artifacts/${contractType}.json`),
      path.resolve(process.cwd(), `smart-contracts/artifacts/contracts/${contractType}.sol/${contractType}.json`),
      path.resolve(process.cwd(), `artifacts/contracts/${contractType}.sol/${contractType}.json`)
    ];
    
    // Find the first existing artifact path
    let artifactPath;
    for (const searchPath of searchPaths) {
      if (fs.existsSync(searchPath)) {
        artifactPath = searchPath;
        break;
      }
    }
    
    if (artifactPath) {
      const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
      return {
        bytecode: artifact.bytecode,
        abi: artifact.abi
      };
    } else {
      console.error(`Contract artifacts not found for ${contractType}`);
      process.exit(1);
    }
  } catch (error) {
    console.error('Error loading contract details:', error);
    process.exit(1);
  }
}

// Deploy contract
async function deployContract(chainId, contractType, tokenName, tokenSymbol, decimals, totalSupply) {
  // Get chain RPC URL
  const rpcUrl = getRpcUrl(chainId);
  if (!rpcUrl) {
    console.error(`RPC URL not found for chain ${chainId}`);
    process.exit(1);
  }
  
  console.log(`Deploying ${contractType} to chain ${chainId}...`);
  
  try {
    // Get contract details
    const { bytecode, abi } = getContractDetails(contractType);
    
    // Create provider and signer
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    
    // Get private key from env
    const privateKey = process.env.TEST_WALLET_PRIVATE_KEY;
    if (!privateKey) {
      console.error('TEST_WALLET_PRIVATE_KEY not found in .env');
      process.exit(1);
    }
    
    const wallet = new ethers.Wallet(privateKey, provider);
    
    // Create contract factory
    const factory = new ethers.ContractFactory(abi, bytecode, wallet);
    
    // Deploy contract
    const contract = await factory.deploy(
      tokenName,
      tokenSymbol,
      decimals,
      totalSupply
    );
    
    console.log(`Transaction hash: ${contract.deploymentTransaction().hash}`);
    
    // Wait for deployment to complete
    const receipt = await contract.deploymentTransaction().wait();
    
    console.log(`Contract deployed to: ${await contract.getAddress()}`);
    console.log(`Gas used: ${receipt.gasUsed.toString()}`);
    
    return {
      contractAddress: await contract.getAddress(),
      transactionHash: receipt.hash
    };
  } catch (error) {
    console.error(`Deployment error:`, error);
    process.exit(1);
  }
}

// Get RPC URL for a chain
function getRpcUrl(chainId) {
  const chainUrls = {
    '7001': process.env.ZETACHAIN_RPC_URL,
    '11155111': process.env.SEPOLIA_RPC_URL
  };
  
  return chainUrls[chainId];
}

// Main function
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.log('Usage: node test-deployment.js [chainId]');
    console.log('Available chains: 7001 (ZetaChain Testnet), 11155111 (Sepolia)');
    process.exit(1);
  }
  
  const chainId = args[0];
  
  // Token details
  const tokenName = 'Test Token';
  const tokenSymbol = 'TST';
  const decimals = 18;
  const totalSupply = ethers.parseUnits('1000000', 18);
  
  // Determine contract type based on chain
  const contractType = chainId === '7001' ? 'ZetaChainUniversalToken' : 'EVMUniversalToken';
  
  // Deploy contract
  await deployContract(chainId, contractType, tokenName, tokenSymbol, decimals, totalSupply.toString());
}

// Run the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

Create a script for testing token transfer (`src/scripts/test-transfer.js`):

```javascript
const { ethers } = require('ethers');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config();

// Read contract ABI
function getContractAbi(contractType) {
  try {
    const searchPaths = [
      path.resolve(process.cwd(), `standard-contracts/artifacts/${contractType}.json`),
      path.resolve(process.cwd(), `smart-contracts/artifacts/contracts/${contractType}.sol/${contractType}.json`),
      path.resolve(process.cwd(), `artifacts/contracts/${contractType}.sol/${contractType}.json`)
    ];
    
    // Find the first existing artifact path
    let artifactPath;
    for (const searchPath of searchPaths) {
      if (fs.existsSync(searchPath)) {
        artifactPath = searchPath;
        break;
      }
    }
    
    if (artifactPath) {
      const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
      return artifact.abi;
    } else {
      console.error(`Contract artifacts not found for ${contractType}`);
      process.exit(1);
    }
  } catch (error) {
    console.error('Error loading contract details:', error);
    process.exit(1);
  }
}

// Get RPC URL for a chain
function getRpcUrl(chainId) {
  const chainUrls = {
    '7001': process.env.ZETACHAIN_RPC_URL,
    '11155111': process.env.SEPOLIA_RPC_URL
  };
  
  return chainUrls[chainId];
}

// Get chain name
function getChainName(chainId) {
  const chainNames = {
    '7001': 'ZetaChain Testnet',
    '11155111': 'Sepolia'
  };
  
  return chainNames[chainId] || `Chain ${chainId}`;
}

// Transfer tokens
async function transferTokens(sourceChainId, sourceContractAddress, destChainId, amount) {
  // Get source chain RPC URL
  const sourceRpcUrl = getRpcUrl(sourceChainId);
  if (!sourceRpcUrl) {
    console.error(`RPC URL not found for source chain ${sourceChainId}`);
    process.exit(1);
  }
  
  console.log(`Transferring ${ethers.formatEther(amount)} tokens from ${getChainName(sourceChainId)} to ${getChainName(destChainId)}...`);
  
  try {
    // Determine contract type based on source chain
    const contractType = sourceChainId === '7001' ? 'ZetaChainUniversalToken' : 'EVMUniversalToken';
    
    // Get contract ABI
    const abi = getContractAbi(contractType);
    
    // Create provider and signer
    const provider = new ethers.JsonRpcProvider(sourceRpcUrl);
    
    // Get private key from env
    const privateKey = process.env.TEST_WALLET_PRIVATE_KEY;
    if (!privateKey) {
      console.error('TEST_WALLET_PRIVATE_KEY not found in .env');
      process.exit(1);
    }
    
    const wallet = new ethers.Wallet(privateKey, provider);
    
    // Create contract instance
    const contract = new ethers.Contract(sourceContractAddress, abi, wallet);
    
    // Check token balance before transfer
    const walletAddress = wallet.address;
    const balanceBefore = await contract.balanceOf(walletAddress);
    console.log(`Balance before transfer: ${ethers.formatEther(balanceBefore)} tokens`);
    
    if (balanceBefore < amount) {
      console.error(`Insufficient balance for transfer. Required: ${ethers.formatEther(amount)}, Available: ${ethers.formatEther(balanceBefore)}`);
      process.exit(1);
    }
    
    // Transfer tokens
    // Note: This is a simplified example. In a real implementation,
    // you would call a cross-chain transfer method specific to the token contract
    console.log(`Calling transfer method...`);
    
    // For this example, we'll simulate by transferring to the same address (burn & mint would happen under the hood)
    const tx = await contract.transfer(walletAddress, amount);
    console.log(`Transaction hash: ${tx.hash}`);
    
    // Wait for transaction to complete
    const receipt = await tx.wait();
    console.log(`Transaction confirmed in block ${receipt.blockNumber}`);
    
    // Check token balance after transfer
    const balanceAfter = await contract.balanceOf(walletAddress);
    console.log(`Balance after transfer: ${ethers.formatEther(balanceAfter)} tokens`);
    
    return {
      transactionHash: receipt.hash,
      successful: true
    };
  } catch (error) {
    console.error(`Transfer error:`, error);
    process.exit(1);
  }
}

// Main function
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 4) {
    console.log('Usage: node test-transfer.js [sourceChainId] [sourceContractAddress] [destChainId] [amount]');
    console.log('Example: node test-transfer.js 7001 0x1234... 11155111 10');
    process.exit(1);
  }
  
  const sourceChainId = args[0];
  const sourceContractAddress = args[1];
  const destChainId = args[2];
  const amount = ethers.parseEther(args[3]);
  
  // Transfer tokens
  await transferTokens(sourceChainId, sourceContractAddress, destChainId, amount);
}

// Run the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

## Running Tests

Update your `package.json` scripts to include the test commands:

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:deployment": "node src/scripts/test-deployment.js",
    "test:transfer": "node src/scripts/test-transfer.js"
  }
}
```

These tests provide a solid foundation for ensuring the reliability and functionality of the Universal Token Launcher backend. Unit tests verify the correctness of individual utilities and functions, while integration tests ensure that services and API endpoints work together as expected.

The blockchain testing scripts allow manual testing of contract deployment and token transfers, which is valuable for verifying real-world interactions with the blockchain.

This completes the implementation of the Universal Token Launcher backend. You now have a fully-functional backend system that allows users to create, deploy, and manage universal tokens across multiple blockchains. 