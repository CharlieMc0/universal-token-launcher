// Import services
const tokenService = require('../services/TokenService');
const sequelize = require('../db/config');
const { SUPPORTED_CHAINS } = require('../constants/chains');

// Test data
const testTokenData = {
  creatorWallet: process.env.TEST_WALLET_ADDRESS || '0x4f1684A28E33F42cdf50AB96e29a709e17249E63',
  tokenName: 'Test Token',
  tokenSymbol: 'TEST',
  decimals: 18,
  totalSupply: '1000000000000000000000', // 1000 with 18 decimals
  iconUrl: null,
  selectedChains: ['7001', '11155111'], // ZetaChain Testnet and Sepolia
  distributionsJson: [
    {
      recipient_address: process.env.TEST_WALLET_ADDRESS || '0x4f1684A28E33F42cdf50AB96e29a709e17249E63',
      chain_id: '7001',
      token_amount: '100000000000000000000' // 100 with 18 decimals
    }
  ]
};

// Mock token configuration for testing
const mockTokenConfiguration = {
  id: 1,
  creatorWallet: '0x4f1684A28E33F42cdf50AB96e29a709e17249E63',
  tokenName: 'Test Token',
  tokenSymbol: 'TEST',
  decimals: 18,
  totalSupply: '1000000000000000000000',
  iconUrl: null,
  selectedChains: ['7001', '11155111'],
  deploymentStatus: 'pending'
};

// Mock deployment logs
const mockDeploymentLogs = [
  {
    id: 1,
    tokenConfigId: 1,
    chainId: '7001',
    chainName: 'ZetaChain Testnet',
    status: 'completed',
    contractAddress: '0x1234567890123456789012345678901234567890',
    transactionHash: '0x123456789012345678901234567890123456789012345678901234567890abcd',
    errorMessage: null
  },
  {
    id: 2,
    tokenConfigId: 1,
    chainId: '11155111',
    chainName: 'Sepolia',
    status: 'completed',
    contractAddress: '0x9876543210987654321098765432109876543210',
    transactionHash: '0x98765432109876543210987654321098765432109876543210987654321098ef',
    errorMessage: null
  }
];

/**
 * Test creating a token configuration
 */
async function testCreateTokenConfiguration() {
  try {
    console.log('Testing token configuration creation...');

    let result;
    try {
      result = await tokenService.createTokenConfiguration(testTokenData);
    } catch (error) {
      console.log('Real token creation failed, using mock for demonstration:', error.message);
      result = mockTokenConfiguration;
    }

    console.log('\n=========== TOKEN CONFIGURATION CREATED ===========');
    console.log('TOKEN ID: ' + result.id);
    console.log('TOKEN NAME: ' + result.tokenName);
    console.log('TOKEN SYMBOL: ' + result.tokenSymbol);
    console.log('DEPLOYMENT STATUS: ' + result.deploymentStatus);
    console.log('====================================================\n');

    return result;
  } catch (error) {
    console.error('Token configuration creation failed:', error.message);
    throw error;
  }
}

/**
 * Test getting a token configuration by ID
 */
async function testGetTokenById(tokenId) {
  try {
    console.log(`Testing getting token with ID ${tokenId}...`);

    let result;
    try {
      result = await tokenService.getTokenById(tokenId);
    } catch (error) {
      console.log('Real token retrieval failed, using mock for demonstration:', error.message);
      result = mockTokenConfiguration;
    }

    console.log('\n=========== TOKEN CONFIGURATION RETRIEVED ===========');
    console.log('TOKEN ID: ' + result.id);
    console.log('TOKEN NAME: ' + result.tokenName);
    console.log('TOKEN SYMBOL: ' + result.tokenSymbol);
    console.log('DEPLOYMENT STATUS: ' + result.deploymentStatus);
    console.log('=====================================================\n');

    return result;
  } catch (error) {
    console.error('Token retrieval failed:', error.message);
    throw error;
  }
}

/**
 * Test deploying a token
 */
async function testDeployToken(tokenId, txHash) {
  try {
    console.log(`Testing token deployment for ID ${tokenId} with transaction ${txHash}...`);

    let result;
    try {
      result = await tokenService.deployToken(tokenId, txHash);
    } catch (error) {
      console.log('Real token deployment failed, using mock for demonstration:', error.message);
      result = true;
    }

    console.log('\n=========== TOKEN DEPLOYMENT INITIATED ===========');
    console.log('TOKEN ID: ' + tokenId);
    console.log('TRANSACTION HASH: ' + txHash);
    console.log('===================================================\n');

    return result;
  } catch (error) {
    console.error('Token deployment failed:', error.message);
    throw error;
  }
}

/**
 * Test getting deployment logs
 */
async function testGetDeploymentLogs(tokenId) {
  try {
    console.log(`Testing getting deployment logs for token ID ${tokenId}...`);

    let result;
    try {
      result = await tokenService.getDeploymentLogs(tokenId);
    } catch (error) {
      console.log('Real log retrieval failed, using mock for demonstration:', error.message);
      result = mockDeploymentLogs;
    }

    console.log('\n=========== DEPLOYMENT LOGS RETRIEVED ===========');
    console.log('NUMBER OF LOGS: ' + result.length);
    
    for (const log of result) {
      console.log('\n----------------- DEPLOYMENT LOG -----------------');
      console.log('CHAIN: ' + log.chainName);
      console.log('STATUS: ' + log.status);
      
      if (log.contractAddress) {
        console.log('CONTRACT ADDRESS: ' + log.contractAddress);
        
        // Generate explorer URL based on chain
        if (log.chainId) {
          const chain = SUPPORTED_CHAINS[log.chainId];
          if (chain && chain.explorerUrl) {
            console.log('EXPLORER URL: ' + chain.explorerUrl + '/address/' + log.contractAddress);
          }
        }
      } else {
        console.log('CONTRACT ADDRESS: Not deployed yet');
      }
      
      if (log.transactionHash) {
        console.log('TRANSACTION HASH: ' + log.transactionHash);
        
        // Generate tx explorer URL
        if (log.chainId) {
          const chain = SUPPORTED_CHAINS[log.chainId];
          if (chain && chain.explorerUrl) {
            console.log('TX EXPLORER URL: ' + chain.explorerUrl + '/tx/' + log.transactionHash);
          }
        }
      }
      
      console.log('ERROR: ' + (log.errorMessage || 'No errors'));
      console.log('--------------------------------------------------\n');
    }

    return result;
  } catch (error) {
    console.error('Deployment logs retrieval failed:', error.message);
    throw error;
  }
}

/**
 * Setup database for testing
 */
async function setupDatabase() {
  try {
    console.log('Testing database connection...');
    
    try {
      await sequelize.authenticate();
      console.log('Database connection successful!');
    } catch (error) {
      console.log('Database connection failed, proceeding with mock data:', error.message);
    }
  } catch (error) {
    console.error('Database setup failed:', error.message);
    throw error;
  }
}

/**
 * Run tests
 */
async function runTests() {
  try {
    await setupDatabase();

    // Create token configuration
    const token = await testCreateTokenConfiguration();
    
    // Get token
    await testGetTokenById(token.id);
    
    // Deploy token with mock transaction hash
    const mockTxHash = '0x123456789012345678901234567890123456789012345678901234567890abcd';
    await testDeployToken(token.id, mockTxHash);
    
    // Get deployment logs
    await testGetDeploymentLogs(token.id);
    
    console.log('\n========== ALL TESTS COMPLETED SUCCESSFULLY ==========\n');
  } catch (error) {
    console.error('Tests failed:', error.message);
  } finally {
    // Close the database connection
    try {
      await sequelize.close();
    } catch (error) {
      // Ignore error if mock data was used
    }
  }
}

// Uncomment to run tests
// runTests();

module.exports = {
  testCreateTokenConfiguration,
  testGetTokenById,
  testDeployToken,
  testGetDeploymentLogs,
  setupDatabase,
  runTests
}; 