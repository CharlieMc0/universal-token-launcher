/**
 * Script to match tokens from BlockScout API with our database
 * Run with: node scripts/match-tokens.js
 */

// Import database models
const { DeploymentLog, TokenConfiguration } = require('../src/models');
const { Op } = require('sequelize');

// Set the ZetaChain Testnet ID
const ZETACHAIN_TESTNET_ID = 7001;

// Define the wallet address to check
const WALLET_ADDRESS = '0x04dA1034E7d84c004092671bBcEb6B1c8DCda7AE';

async function matchTokens() {
  try {
    console.log(`Matching tokens for wallet: ${WALLET_ADDRESS}`);
    
    // 1. Fetch tokens from BlockScout API
    console.log('\n===== BLOCKSCOUT TOKENS =====');
    const { default: fetch } = await import('node-fetch');
    const baseUrl = 'https://zetachain-testnet.blockscout.com';
    const apiUrl = `${baseUrl}/api/v2/addresses/${WALLET_ADDRESS}/tokens?type=ERC-20%2CERC-721%2CERC-1155`;
    
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`BlockScout API error: ${response.status}`);
    }
    
    const data = await response.json();
    const userTokens = data.items || [];
    
    console.log(`Found ${userTokens.length} tokens in BlockScout`);
    
    // Print token addresses
    if (userTokens.length > 0) {
      console.log('\nBlockScout token addresses:');
      userTokens.forEach((token, index) => {
        console.log(`${index + 1}. ${token.token.address} - ${token.token.name} (${token.token.symbol})`);
      });
    }
    
    // 2. Get all contract deployments from our database
    console.log('\n===== DATABASE DEPLOYMENTS =====');
    const deployments = await DeploymentLog.findAll({
      where: {
        chainId: String(ZETACHAIN_TESTNET_ID),
        status: 'success',
        contractAddress: { [Op.ne]: null }
      },
      include: [{
        model: TokenConfiguration,
        attributes: ['id', 'tokenName', 'tokenSymbol']
      }],
      attributes: ['id', 'tokenConfigId', 'contractAddress']
    });
    
    console.log(`Found ${deployments.length} deployments in database`);
    
    // Print deployment addresses
    if (deployments.length > 0) {
      console.log('\nDatabase contract addresses:');
      deployments.forEach((deployment, index) => {
        console.log(`${index + 1}. ${deployment.contractAddress} - ${deployment.TokenConfiguration?.tokenName} (${deployment.TokenConfiguration?.tokenSymbol})`);
      });
    }
    
    // 3. Match tokens with our deployments
    console.log('\n===== MATCHING TOKENS =====');
    const matchingTokens = [];
    
    userTokens.forEach(userToken => {
      const tokenAddress = userToken.token.address.toLowerCase();
      
      const matchingDeployment = deployments.find(
        deployment => deployment.contractAddress.toLowerCase() === tokenAddress
      );
      
      if (matchingDeployment) {
        matchingTokens.push({
          blockscoutToken: userToken,
          databaseDeployment: matchingDeployment
        });
      }
    });
    
    console.log(`Found ${matchingTokens.length} matching tokens`);
    
    if (matchingTokens.length > 0) {
      console.log('\nMatched tokens:');
      matchingTokens.forEach((match, index) => {
        console.log(`\n${index + 1}. Match found:`);
        console.log(`   BlockScout: ${match.blockscoutToken.token.address} - ${match.blockscoutToken.token.name} (${match.blockscoutToken.token.symbol})`);
        console.log(`   Database: ${match.databaseDeployment.contractAddress} - ${match.databaseDeployment.TokenConfiguration?.tokenName} (${match.databaseDeployment.TokenConfiguration?.tokenSymbol})`);
        console.log(`   Token Config ID: ${match.databaseDeployment.tokenConfigId}`);
      });
    } else {
      console.log('\nNo matches found between BlockScout tokens and database deployments.');
      
      // 4. Try case-insensitive matching
      console.log('\n===== ATTEMPTING CASE-INSENSITIVE MATCHING =====');
      const caseInsensitiveMatches = [];
      
      userTokens.forEach(userToken => {
        const tokenAddress = userToken.token.address.toLowerCase();
        
        deployments.forEach(deployment => {
          const deploymentAddress = deployment.contractAddress.toLowerCase();
          if (tokenAddress === deploymentAddress) {
            caseInsensitiveMatches.push({
              blockscoutToken: userToken,
              databaseDeployment: deployment
            });
          }
        });
      });
      
      console.log(`Found ${caseInsensitiveMatches.length} case-insensitive matches`);
      
      if (caseInsensitiveMatches.length > 0) {
        console.log('\nCase-insensitive matched tokens:');
        caseInsensitiveMatches.forEach((match, index) => {
          console.log(`\n${index + 1}. Match found:`);
          console.log(`   BlockScout: ${match.blockscoutToken.token.address} - ${match.blockscoutToken.token.name} (${match.blockscoutToken.token.symbol})`);
          console.log(`   Database: ${match.databaseDeployment.contractAddress} - ${match.databaseDeployment.TokenConfiguration?.tokenName} (${match.databaseDeployment.TokenConfiguration?.tokenSymbol})`);
          console.log(`   Token Config ID: ${match.databaseDeployment.tokenConfigId}`);
        });
      }
    }
    
    console.log('\n===== KNOWN ADDRESSES FROM DOCUMENTATION =====');
    console.log('Checking for documentation contract addresses...');
    
    // Known addresses from documentation
    const knownAddresses = [
      '0x51d5D00dfB9e1f4D60BBD6eda288F44Fb3158E16',
      '0x0b3D12246660b41f982f07CdCd27536a79a16296'
    ];
    
    // Check if any BlockScout tokens match the known addresses
    let foundKnownAddresses = false;
    userTokens.forEach(userToken => {
      if (knownAddresses.includes(userToken.token.address)) {
        console.log(`Found known address: ${userToken.token.address} - ${userToken.token.name} (${userToken.token.symbol})`);
        foundKnownAddresses = true;
      }
    });
    
    if (!foundKnownAddresses) {
      console.log('No known addresses from documentation found in user tokens.');
    }
    
  } catch (error) {
    console.error('Error matching tokens:', error);
  }
}

// Run the match
matchTokens(); 