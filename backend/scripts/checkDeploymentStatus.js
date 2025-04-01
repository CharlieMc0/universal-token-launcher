/**
 * Deployment Status Check Utility
 * 
 * This script helps diagnose deployment issues by checking:
 * 1. Token configuration status
 * 2. Deployment logs for each chain
 * 3. Deployment attempts and errors
 */

require('dotenv').config();
const { TokenConfiguration, DeploymentLog } = require('../src/models');
const { logger } = require('../src/utils/logger');
const fs = require('fs');
const path = require('path');

async function checkDeploymentStatus(tokenId) {
  try {
    // Find the token configuration
    const tokenConfig = await TokenConfiguration.findByPk(tokenId);
    if (!tokenConfig) {
      console.error(`Token configuration with ID ${tokenId} not found`);
      return;
    }
    
    console.log('\n=== TOKEN CONFIGURATION ===');
    console.log(`ID: ${tokenConfig.id}`);
    console.log(`Name: ${tokenConfig.tokenName} (${tokenConfig.tokenSymbol})`);
    console.log(`Creator: ${tokenConfig.creatorWallet}`);
    console.log(`Selected Chains: ${JSON.stringify(tokenConfig.selectedChains)}`);
    console.log(`Deployment Status: ${tokenConfig.deploymentStatus}`);
    console.log(`Fee Paid TX: ${tokenConfig.feePaidTx || 'None'}`);
    
    if (tokenConfig.deploymentError) {
      console.log(`Deployment Error: ${tokenConfig.deploymentError}`);
    }
    
    // Find all deployment logs for this token
    const deploymentLogs = await DeploymentLog.findAll({
      where: { tokenConfigId: tokenId },
      order: [['created_at', 'DESC']]
    });
    
    console.log('\n=== DEPLOYMENT LOGS ===');
    
    if (deploymentLogs.length === 0) {
      console.log('No deployment logs found');
      return;
    }
    
    deploymentLogs.forEach(log => {
      console.log(`\n--- ${log.chainName} (${log.chainId}) ---`);
      console.log(`Status: ${log.status}`);
      console.log(`Contract Address: ${log.contractAddress || 'Not deployed'}`);
      console.log(`Transaction Hash: ${log.transactionHash || 'None'}`);
      console.log(`Verification Status: ${log.verificationStatus || 'Not attempted'}`);
      
      if (log.verifiedUrl) {
        console.log(`Verified URL: ${log.verifiedUrl}`);
      }
      
      console.log(`Deployment Attempts: ${log.deployAttempts || 0}`);
      
      if (log.lastRetryAt) {
        console.log(`Last Retry: ${log.lastRetryAt}`);
      }
      
      if (log.lastError) {
        console.log(`Last Error: ${log.lastError}`);
      }
      
      if (log.errorMessage) {
        console.log(`Error Message: ${log.errorMessage}`);
      }
      
      if (log.completedAt) {
        console.log(`Completed At: ${log.completedAt}`);
      }
    });
    
    // Check deployment logs
    console.log('\n=== DEPLOYMENT LOG FILE ===');
    const deploymentLogPath = path.join(process.cwd(), 'logs', 'deployment.log');
    
    if (fs.existsSync(deploymentLogPath)) {
      // Read the last 100 lines of the deployment log file
      const logContent = fs.readFileSync(deploymentLogPath, 'utf8');
      const logLines = logContent.split('\n').filter(Boolean); // Split by newline and remove empty lines
      
      // Filter log lines for the specific token ID
      const tokenLogs = logLines
        .filter(line => {
          try {
            const logData = JSON.parse(line);
            return logData.tokenId == tokenId; // Use == for type coercion
          } catch (e) {
            return false;
          }
        })
        .map(line => JSON.parse(line));
      
      if (tokenLogs.length === 0) {
        console.log(`No deployment log entries found for token ID ${tokenId}`);
      } else {
        console.log(`Found ${tokenLogs.length} deployment log entries`);
        
        // Group logs by action
        const logsByAction = {};
        tokenLogs.forEach(log => {
          const action = log.action || 'unknown';
          if (!logsByAction[action]) {
            logsByAction[action] = [];
          }
          logsByAction[action].push(log);
        });
        
        // Print logs by action
        Object.keys(logsByAction).forEach(action => {
          console.log(`\n--- ${action.toUpperCase()} LOGS ---`);
          logsByAction[action].forEach(log => {
            const timestamp = log.timestamp || new Date(log.time).toISOString();
            console.log(`[${timestamp}] ${log.message || log.msg || JSON.stringify(log)}`);
          });
        });
      }
    } else {
      console.log('Deployment log file not found');
    }
    
  } catch (error) {
    console.error('Error checking deployment status:', error);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Please provide a token ID to check');
  console.log('Usage: node checkDeploymentStatus.js <tokenId>');
  process.exit(1);
}

const tokenId = args[0];
checkDeploymentStatus(tokenId)
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  }); 