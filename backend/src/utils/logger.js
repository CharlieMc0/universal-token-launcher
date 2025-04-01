const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

const { combine, timestamp, printf, colorize, json } = winston.format;

// Custom log format for console
const consoleFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let metaStr = '';
  if (Object.keys(metadata).length > 0) {
    metaStr = JSON.stringify(metadata, null, 2);
  }
  return `${timestamp} [${level}]: ${message} ${metaStr}`;
});

// Create a Winston logger
const logger = winston.createLogger({
  level: process.env.DEBUG === 'true' ? 'debug' : 'info',
  format: combine(
    timestamp(),
    json()
  ),
  defaultMeta: { service: 'universal-token-launcher' },
  transports: [
    // Write logs to console
    new winston.transports.Console({
      format: combine(
        colorize(),
        timestamp(),
        consoleFormat
      )
    }),
    // Write all logs to application-combined.log
    new winston.transports.File({ 
      filename: path.join(logsDir, 'application-combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Write all error logs to error.log
    new winston.transports.File({ 
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Write deployment-specific logs to deployment.log
    new winston.transports.File({ 
      filename: path.join(logsDir, 'deployment.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  ],
});

// Create a deployment-specific logger
const deploymentLogger = winston.createLogger({
  level: 'info',
  format: combine(
    timestamp(),
    json()
  ),
  defaultMeta: { service: 'deployment-service' },
  transports: [
    // Write to deployment.log
    new winston.transports.File({ 
      filename: path.join(logsDir, 'deployment.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Also write to console when not in production
    new winston.transports.Console({
      format: combine(
        colorize(),
        timestamp(),
        consoleFormat
      )
    })
  ],
});

/**
 * Log deployment activity with structured metadata
 * @param {string} action - The action being performed (e.g., 'deploy', 'verify')
 * @param {string} tokenId - The token ID
 * @param {string} chainId - The chain ID
 * @param {string} status - The status of the operation
 * @param {object} metadata - Additional metadata
 */
const logDeployment = (action, tokenId, chainId, status, metadata = {}) => {
  const logData = {
    action,
    tokenId,
    chainId,
    status,
    timestamp: new Date().toISOString(),
    ...metadata
  };
  
  // Add attempt tracking
  if (metadata.attempt) {
    logData.attempt = metadata.attempt;
  } else if (action === 'deploy' && status === 'started') {
    logData.attempt = 1; // Initial attempt
  }
  
  // More detailed status messages
  let message = '';
  if (action === 'deploy') {
    // Deployment-specific logging
    const chainName = metadata.chainName || `chain ${chainId}`;
    const tokenName = metadata.tokenName || `token ${tokenId}`;
    
    if (status === 'started') {
      message = `Deployment attempt #${logData.attempt || 1} started for ${tokenName} on ${chainName}`;
    } else if (status === 'success') {
      message = `Successfully deployed ${tokenName} on ${chainName} at address ${metadata.contractAddress || 'unknown'}`;
    } else if (status === 'failed' || status === 'error') {
      message = `Deployment failed for ${tokenName} on ${chainName}: ${metadata.error || 'unknown error'}`;
    }
  } else if (action === 'verify') {
    // Verification-specific logging
    if (status === 'started') {
      message = `Verification started for contract on chain ${chainId}`;
    } else if (status === 'success') {
      message = `Verification successful for contract on chain ${chainId}`;
    } else if (status === 'failed' || status === 'error') {
      message = `Verification failed for contract on chain ${chainId}: ${metadata.error || 'unknown error'}`;
    }
  } else if (action === 'connect') {
    // Connection-specific logging
    if (status === 'started') {
      message = `Connecting tokens between ZetaChain and chain ${chainId}`;
    } else if (status === 'success') {
      message = `Successfully connected tokens between ZetaChain and chain ${chainId}`;
    } else if (status === 'failed' || status === 'error') {
      message = `Failed to connect tokens between ZetaChain and chain ${chainId}: ${metadata.error || 'unknown error'}`;
    }
  } else if (action === 'start') {
    message = `Beginning deployment process for token ${tokenId} across ${metadata.selectedChains ? metadata.selectedChains.length : 'multiple'} chains`;
  } else if (action === 'complete' || action === 'error') {
    message = `Deployment process ${status} for token ${tokenId}. Success: ${metadata.successCount || 0}, Failed: ${metadata.failedCount || 0}, Pending: ${metadata.pendingCount || 0}`;
  }
  
  // Structured log with message
  const structuredLog = {
    ...logData,
    message
  };
  
  if (status === 'error' || status === 'failed') {
    deploymentLogger.error(message, structuredLog);
  } else {
    deploymentLogger.info(message, structuredLog);
  }
};

/**
 * Log deployment attempt with specific tracking for retries
 * @param {string} tokenId - The token ID
 * @param {string} chainId - The chain ID
 * @param {number} attempt - The attempt number (1 for first attempt, 2+ for retries)
 * @param {string} contractType - The type of contract being deployed
 * @param {object} metadata - Additional metadata
 */
const logDeploymentAttempt = (tokenId, chainId, attempt, contractType, metadata = {}) => {
  const chainName = metadata.chainName || `chain ${chainId}`;
  const tokenName = metadata.tokenName || `token ${tokenId}`;
  
  const isRetry = attempt > 1;
  const attemptLabel = isRetry ? `retry #${attempt-1}` : 'initial attempt';
  
  const message = `Contract deployment ${attemptLabel} for ${tokenName} (${contractType}) on ${chainName}`;
  
  deploymentLogger.info(message, {
    action: 'deploy_attempt',
    tokenId,
    chainId,
    attempt,
    contractType,
    isRetry,
    timestamp: new Date().toISOString(),
    message,
    ...metadata
  });
};

// Export both loggers and helpers
module.exports = {
  logger,
  deploymentLogger,
  logDeployment,
  logDeploymentAttempt
}; 