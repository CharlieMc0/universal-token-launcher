const sequelize = require('./src/db/config');
const TokenConfiguration = require('./src/models/TokenConfiguration');
const DeploymentLog = require('./src/models/DeploymentLog');
const { Op } = require('sequelize');

async function checkDatabase() {
  try {
    // 1. List all tokens in the database
    const tokens = await TokenConfiguration.findAll({
      order: [['created_at', 'DESC']]
    });

    console.log(`\n=== Total Tokens: ${tokens.length} ===\n`);
    
    for (const token of tokens) {
      console.log(`ID: ${token.id}`);
      console.log(`Name: ${token.tokenName} (${token.tokenSymbol})`);
      console.log(`Creator: ${token.creatorWallet}`);
      console.log(`Status: ${token.deploymentStatus}`);
      console.log(`Created: ${token.created_at}`);
      console.log('-'.repeat(50));
    }

    // 2. List tokens for specific wallet
    const walletAddress = '0x4f1684A28E33F42cdf50AB96e29a709e17249E63';
    const userTokens = await TokenConfiguration.findAll({
      where: {
        creatorWallet: walletAddress
      },
      order: [['created_at', 'DESC']]
    });

    console.log(`\n=== Tokens created by ${walletAddress}: ${userTokens.length} ===\n`);
    
    for (const token of userTokens) {
      console.log(`ID: ${token.id}`);
      console.log(`Name: ${token.tokenName} (${token.tokenSymbol})`);
      console.log(`Status: ${token.deploymentStatus}`);
      console.log('-'.repeat(50));
    }

    // 3. Check deployment logs for ZetaChain
    const zetaChainId = '7001';
    const deploymentLogs = await DeploymentLog.findAll({
      where: {
        chainId: zetaChainId,
        status: 'success',
        contractAddress: { [Op.ne]: null }
      },
      include: [{
        model: TokenConfiguration,
        attributes: ['tokenName', 'tokenSymbol', 'creatorWallet']
      }]
    });

    console.log(`\n=== Successful ZetaChain Deployments: ${deploymentLogs.length} ===\n`);
    
    for (const log of deploymentLogs) {
      console.log(`Token ID: ${log.tokenConfigId}`);
      console.log(`Token: ${log.TokenConfiguration?.tokenName || 'Unknown'} (${log.TokenConfiguration?.tokenSymbol || 'Unknown'})`);
      console.log(`Creator: ${log.TokenConfiguration?.creatorWallet || 'Unknown'}`);
      console.log(`Contract: ${log.contractAddress}`);
      console.log(`TX Hash: ${log.transactionHash}`);
      console.log(`Status: ${log.status}`);
      console.log(`Verification: ${log.verificationStatus}`);
      console.log('-'.repeat(50));
    }
  } catch (error) {
    console.error('Error checking database:', error);
  } finally {
    await sequelize.close();
  }
}

// Run the check
checkDatabase().catch(console.error); 