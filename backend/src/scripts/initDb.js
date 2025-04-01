const fs = require('fs');
const path = require('path');
const sequelize = require('../db/config');
const { TokenConfiguration, DeploymentLog, TokenDistribution } = require('../models');

async function initDatabase() {
  try {
    console.log('Initializing database...');
    
    // Ensure migrations directory exists
    const migrationsDir = path.join(__dirname, '../db/migrations');
    if (!fs.existsSync(migrationsDir)) {
      console.log('Creating migrations directory...');
      fs.mkdirSync(migrationsDir, { recursive: true });
    }
    
    // Force sync all models (this will drop tables if they exist)
    // In production, you'd use migrations instead
    await sequelize.sync({ force: true });
    
    console.log('Database synced successfully!');
    
    // Create a test token if in development mode
    if (process.env.DEBUG === 'true') {
      console.log('Creating test token configuration...');
      
      const testToken = await TokenConfiguration.create({
        creatorWallet: process.env.TEST_WALLET_ADDRESS || '0x4f1684A28E33F42cdf50AB96e29a709e17249E63',
        tokenName: 'Test Token',
        tokenSymbol: 'TEST',
        decimals: 18,
        totalSupply: '1000000000000000000000', // 1000 with 18 decimals
        iconUrl: null,
        selectedChains: ['7001', '11155111'], // ZetaChain Testnet and Sepolia
        deploymentStatus: 'pending'
      });
      
      console.log(`Created test token with ID: ${testToken.id}`);
      
      // Create deployment logs for each chain
      const zetaChainLog = await DeploymentLog.create({
        tokenConfigId: testToken.id,
        chainName: 'ZetaChain Testnet',
        chainId: '7001',
        status: 'pending'
      });
      
      const sepoliaLog = await DeploymentLog.create({
        tokenConfigId: testToken.id,
        chainName: 'Sepolia',
        chainId: '11155111',
        status: 'pending'
      });
      
      console.log('Created deployment logs for test token');
      
      // Create token distribution
      const distribution = await TokenDistribution.create({
        tokenConfigId: testToken.id,
        recipientAddress: process.env.TEST_WALLET_ADDRESS || '0x4f1684A28E33F42cdf50AB96e29a709e17249E63',
        chainId: '7001',
        tokenAmount: '100000000000000000000', // 100 with 18 decimals
        status: 'pending'
      });
      
      console.log('Created token distribution for test token');
    }
    
    console.log('Database initialization completed successfully!');
  } catch (error) {
    console.error(`Database initialization failed: ${error.message}`);
    console.error(error.stack);
    throw error;
  } finally {
    // Close database connection
    await sequelize.close();
  }
}

// Run initialization if this script is executed directly
if (require.main === module) {
  initDatabase()
    .then(() => {
      console.log('Database initialized successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error(`Database initialization failed: ${error.message}`);
      process.exit(1);
    });
}

module.exports = { initDatabase }; 