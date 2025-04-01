/**
 * Test script to verify database connectivity and query deployment logs
 * Run with: node scripts/test-database.js
 */

// Import database models
const { DeploymentLog, TokenConfiguration } = require('../src/models');
const { Op } = require('sequelize');

// Set the ZetaChain Testnet ID
const ZETACHAIN_TESTNET_ID = 7001;

async function testDatabaseQueries() {
  try {
    console.log('Testing database connectivity...');
    
    // 1. Query all successful deployments on ZetaChain Testnet
    const deployments = await DeploymentLog.findAll({
      where: {
        chainId: String(ZETACHAIN_TESTNET_ID),
        status: 'success',
        contractAddress: { [Op.ne]: null }
      },
      attributes: ['id', 'tokenConfigId', 'contractAddress', 'chainId', 'status'],
      raw: true
    });
    
    console.log(`Found ${deployments.length} ZetaChain deployments:`);
    console.log(JSON.stringify(deployments, null, 2));
    
    if (deployments.length === 0) {
      console.log('No successful deployments found in the database.');
      console.log('Checking for any deployments regardless of status:');
      
      const allDeployments = await DeploymentLog.findAll({
        where: {
          chainId: String(ZETACHAIN_TESTNET_ID)
        },
        attributes: ['id', 'tokenConfigId', 'contractAddress', 'chainId', 'status'],
        raw: true
      });
      
      console.log(`Found ${allDeployments.length} ZetaChain deployments (any status):`);
      console.log(JSON.stringify(allDeployments, null, 2));
    }
    
    // 2. Check token configurations
    const tokenConfigs = await TokenConfiguration.findAll({
      attributes: ['id', 'tokenName', 'tokenSymbol', 'selectedChains'],
      raw: true,
      limit: 5
    });
    
    console.log(`\nFound ${tokenConfigs.length} token configurations:`);
    console.log(JSON.stringify(tokenConfigs, null, 2));
    
    // 3. Test the association
    if (deployments.length > 0) {
      // Get the first deployment's tokenConfigId
      const firstDeployment = deployments[0];
      
      console.log(`\nTesting association for token config ID: ${firstDeployment.tokenConfigId}`);
      
      const tokenWithDeployments = await TokenConfiguration.findByPk(firstDeployment.tokenConfigId, {
        include: [{
          model: DeploymentLog,
          as: 'deployments',
          attributes: ['chainId', 'contractAddress', 'status']
        }]
      });
      
      if (tokenWithDeployments) {
        console.log('Token configuration found with deployments:');
        console.log(`Name: ${tokenWithDeployments.tokenName}`);
        console.log(`Symbol: ${tokenWithDeployments.tokenSymbol}`);
        console.log(`Deployments: ${tokenWithDeployments.deployments.length}`);
        console.log(JSON.stringify(tokenWithDeployments.deployments.map(d => d.toJSON()), null, 2));
      } else {
        console.log(`No token configuration found with ID: ${firstDeployment.tokenConfigId}`);
      }
    }
    
  } catch (error) {
    console.error('Error testing database:', error);
  }
}

// Run the test
testDatabaseQueries(); 