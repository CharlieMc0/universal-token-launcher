# 3. Utilities

This section covers the utility functions needed for the Universal Token Launcher backend, including chain information helpers, logging system, file uploads, and CSV processing.

## Chain Information Utility

Create a utility for handling chain information (`src/utils/chainInfo.ts`):

```typescript
interface ChainInfo {
  name: string;
  chainId: string;
  rpcUrl: string;
  explorerUrl: string;
  isZetaChain: boolean;
  color: string;
  shortName: string;
  isTestnet: boolean;
  isSupported: boolean;
  blockscoutUrl?: string;
}

// Map of chain IDs to chain information
const chainInfoMap: Record<string, ChainInfo> = {
  // ZetaChain Testnet (Athens)
  '7001': {
    name: 'ZetaChain Testnet',
    chainId: '7001',
    rpcUrl: 'https://zetachain-athens-evm.blockpi.network/v1/rpc/public',
    explorerUrl: 'https://athens.explorer.zetachain.com',
    isZetaChain: true,
    color: '#00B386',
    shortName: 'ZetaChain',
    isTestnet: true,
    isSupported: true,
    blockscoutUrl: 'https://zetachain-testnet.blockscout.com'
  },
  // Sepolia Testnet
  '11155111': {
    name: 'Sepolia',
    chainId: '11155111',
    rpcUrl: 'https://ethereum-sepolia.publicnode.com',
    explorerUrl: 'https://sepolia.etherscan.io',
    isZetaChain: false,
    color: '#627EEA',
    shortName: 'Sepolia',
    isTestnet: true,
    isSupported: true
  },
  // ZetaChain Mainnet 
  '7000': {
    name: 'ZetaChain',
    chainId: '7000',
    rpcUrl: 'https://zetachain-evm.blockpi.network/v1/rpc/public',
    explorerUrl: 'https://explorer.zetachain.com',
    isZetaChain: true,
    color: '#00B386',
    shortName: 'ZetaChain',
    isTestnet: false,
    isSupported: false, // Not yet supported
    blockscoutUrl: 'https://zetachain.blockscout.com'
  }
  // Add more chains as needed
};

/**
 * Get chain information by chain ID
 */
export function getChainInfo(chainId: string): ChainInfo | undefined {
  return chainInfoMap[chainId];
}

/**
 * Check if a chain is ZetaChain
 */
export function isZetaChain(chainId: string): boolean {
  const chain = getChainInfo(chainId);
  return chain ? chain.isZetaChain : false;
}

/**
 * Get all supported chains
 */
export function getSupportedChains(): ChainInfo[] {
  return Object.values(chainInfoMap).filter(chain => chain.isSupported);
}

/**
 * Get explorer transaction URL
 */
export function getExplorerTxUrl(chainId: string, txHash: string): string {
  const chain = getChainInfo(chainId);
  if (!chain) return '';
  return `${chain.explorerUrl}/tx/${txHash}`;
}

/**
 * Get explorer address URL
 */
export function getExplorerAddressUrl(chainId: string, address: string): string {
  const chain = getChainInfo(chainId);
  if (!chain) return '';
  return `${chain.explorerUrl}/address/${address}`;
}

/**
 * Get Blockscout API URL for a chain
 */
export function getBlockscoutApiUrl(chainId: string): string | null {
  const chain = getChainInfo(chainId);
  if (!chain || !chain.blockscoutUrl) return null;
  
  // Convert explorer URL to API URL
  // Example: https://zetachain-testnet.blockscout.com -> https://zetachain-testnet.blockscout.com/api/v2
  return `${chain.blockscoutUrl}/api/v2`;
}

/**
 * Get formatted chain info with contract details
 */
export function getFormattedChainInfo(chainId: string, contractInfo: any = {}): any {
  const baseInfo = getChainInfo(chainId);
  if (!baseInfo) return null;
  
  return {
    ...baseInfo,
    ...contractInfo
  };
}

export default {
  getChainInfo,
  isZetaChain,
  getSupportedChains,
  getExplorerTxUrl,
  getExplorerAddressUrl,
  getBlockscoutApiUrl,
  getFormattedChainInfo
};
```

## Logging System

Create a comprehensive logging system (`src/utils/logger.ts`):

```typescript
import winston from 'winston';
import 'winston-daily-rotate-file';
import path from 'path';
import fs from 'fs';
import { nanoid } from 'nanoid';

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Define log formats
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ level, message, timestamp, ...rest }) => {
    let logMessage = `${timestamp} ${level}: ${message}`;
    if (Object.keys(rest).length > 0) {
      const context = Object.entries(rest)
        .filter(([key]) => key !== 'service')
        .map(([key, value]) => `${key}=${typeof value === 'object' ? JSON.stringify(value) : value}`)
        .join(' ');
      
      if (context) {
        logMessage += ` [${context}]`;
      }
    }
    return logMessage;
  })
);

// Define transport for all logs
const combinedFileTransport = new winston.transports.DailyRotateFile({
  filename: path.join(logsDir, 'application-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '5m',
  maxFiles: 5,
  format: fileFormat
});

// Define transport for error logs
const errorFileTransport = new winston.transports.DailyRotateFile({
  filename: path.join(logsDir, 'error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '5m',
  maxFiles: 5,
  level: 'error',
  format: fileFormat
});

// Define transport for deployment logs
const deploymentFileTransport = new winston.transports.DailyRotateFile({
  filename: path.join(logsDir, 'deployment-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '5m',
  maxFiles: 5,
  format: fileFormat
});

// Create the main logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'universal-token-launcher' },
  transports: [
    new winston.transports.Console({
      format: consoleFormat
    }),
    combinedFileTransport,
    errorFileTransport
  ]
});

// Create deployment logger (subset of main logger)
const deploymentLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'universal-token-launcher' },
  transports: [
    new winston.transports.Console({
      format: consoleFormat
    }),
    deploymentFileTransport,
    combinedFileTransport,
    errorFileTransport
  ]
});

/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
  return nanoid(10);
}

/**
 * Log deployment events
 */
export function logDeployment(
  action: string,
  tokenId: number,
  chainId: string,
  status: string,
  details: any = {}
): void {
  deploymentLogger.info({
    action,
    tokenId,
    chainId,
    status,
    timestamp: new Date().toISOString(),
    ...details
  });
}

export default logger;
```

## Express Request ID Middleware

Create a middleware to assign request IDs to all API requests (`src/middleware/requestId.ts`):

```typescript
import { Request, Response, NextFunction } from 'express';
import { generateRequestId } from '../utils/logger';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}

/**
 * Middleware to add a unique request ID to each request
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  // Generate unique ID for this request
  const requestId = generateRequestId();
  
  // Attach to request object
  req.requestId = requestId;
  
  // Add as response header
  res.setHeader('X-Request-ID', requestId);
  
  next();
}
```

## Logging Middleware

Create a middleware for logging all API requests and responses (`src/middleware/logging.ts`):

```typescript
import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

/**
 * Middleware to log API requests and responses
 */
export function loggingMiddleware(req: Request, res: Response, next: NextFunction) {
  // Get current timestamp
  const startTime = Date.now();
  
  // Log request
  logger.info('API Request', {
    requestId: req.requestId,
    method: req.method,
    url: req.originalUrl,
    walletAddress: req.headers['x-wallet-address'] || 'unknown'
  });
  
  // Capture response
  const originalSend = res.send;
  res.send = function(body) {
    const responseTime = Date.now() - startTime;
    
    // Log response
    logger.info('API Response', {
      requestId: req.requestId,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`
    });
    
    // If error response, log with error level
    if (res.statusCode >= 400) {
      logger.error('API Error Response', {
        requestId: req.requestId,
        statusCode: res.statusCode,
        responseTime: `${responseTime}ms`,
        error: typeof body === 'string' ? body : JSON.stringify(body)
      });
    }
    
    return originalSend.call(this, body);
  };
  
  next();
}
```

## File Upload Utility

Create a utility for handling file uploads (`src/utils/fileUpload.ts`):

```typescript
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import logger from './logger';

// Ensure upload directories exist
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

const iconDir = path.join(uploadsDir, 'icons');
if (!fs.existsSync(iconDir)) {
  fs.mkdirSync(iconDir);
}

const csvDir = path.join(uploadsDir, 'csv');
if (!fs.existsSync(csvDir)) {
  fs.mkdirSync(csvDir);
}

// Configure storage for token icons
const iconStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, iconDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `icon-${Date.now()}-${Math.floor(Math.random() * 1000000000)}${ext}`;
    cb(null, filename);
  }
});

// Configure storage for CSV files
const csvStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, csvDir);
  },
  filename: (req, file, cb) => {
    const filename = `${file.fieldname}-${Date.now()}-${uuidv4()}.csv`;
    cb(null, filename);
  }
});

// File filter to allow only image files for icons
const iconFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (!file.originalname.match(/\.(jpg|jpeg|png|gif|svg)$/)) {
    return cb(new Error('Only image files are allowed!'));
  }
  cb(null, true);
};

// File filter to allow only CSV files
const csvFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (!file.originalname.match(/\.csv$/)) {
    return cb(new Error('Only CSV files are allowed!'));
  }
  cb(null, true);
};

// Create multer instances
export const iconUpload = multer({
  storage: iconStorage,
  fileFilter: iconFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB max
});

export const csvUpload = multer({
  storage: csvStorage,
  fileFilter: csvFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB max
});

/**
 * Delete a file from the uploads directory
 */
export function deleteFile(filePath: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (!filePath) {
      return resolve(false);
    }
    
    const fullPath = path.join(process.cwd(), filePath);
    
    fs.unlink(fullPath, (err) => {
      if (err) {
        logger.error(`Error deleting file ${filePath}:`, err);
        return resolve(false);
      }
      
      logger.info(`File deleted successfully: ${filePath}`);
      return resolve(true);
    });
  });
}

/**
 * Get URL path for a file
 */
export function getFilePath(file: Express.Multer.File): string {
  return `/uploads/${file.path.split(path.sep).slice(-2).join('/')}`;
}

export default {
  iconUpload,
  csvUpload,
  deleteFile,
  getFilePath
};
```

## CSV Processing Utility

Create a utility for processing CSV files (`src/utils/csvProcessing.ts`):

```typescript
import fs from 'fs';
import { createReadStream } from 'fs';
import { parse } from 'csv-parse';
import { ethers } from 'ethers';
import path from 'path';
import logger from './logger';
import chainInfo from './chainInfo';

interface TokenDistribution {
  recipient_address: string;
  chain_id: string;
  token_amount: string;
}

interface ValidationError {
  row: number;
  field: string;
  message: string;
  value?: string;
}

/**
 * Validate an Ethereum address
 */
function isValidAddress(address: string): boolean {
  try {
    // Try to format the address
    const formattedAddress = ethers.getAddress(address);
    return formattedAddress.length === 42;
  } catch (error) {
    return false;
  }
}

/**
 * Validate a chain ID
 */
function isValidChainId(id: string): boolean {
  const chain = chainInfo.getChainInfo(id);
  return !!chain && chain.isSupported;
}

/**
 * Validate a token amount
 */
function isValidTokenAmount(amount: string): boolean {
  try {
    // Check if it's a valid positive number
    const value = ethers.parseUnits(amount, 0);
    return value > ethers.parseUnits('0', 0);
  } catch (error) {
    return false;
  }
}

/**
 * Process a token distribution CSV file
 */
export async function processDistributionCsv(
  filePath: string,
  maxRows: number = 100
): Promise<{
  distributions: TokenDistribution[];
  errors: ValidationError[];
  totalRows: number;
  validRows: number;
}> {
  return new Promise((resolve, reject) => {
    const distributions: TokenDistribution[] = [];
    const errors: ValidationError[] = [];
    let rowCount = 0;
    
    // Create read stream and parser
    const parser = parse({
      columns: true,
      skip_empty_lines: true,
      trim: true
    });
    
    // Handle parsed data
    parser.on('readable', () => {
      let record;
      while ((record = parser.read())) {
        rowCount++;
        
        // Limit maximum number of rows
        if (rowCount > maxRows) {
          errors.push({
            row: rowCount,
            field: 'general',
            message: `Maximum number of rows (${maxRows}) exceeded`
          });
          break;
        }
        
        // Validate required fields
        const { recipient_address, chain_id, token_amount } = record;
        
        // Check recipient address
        if (!recipient_address) {
          errors.push({
            row: rowCount,
            field: 'recipient_address',
            message: 'Recipient address is required'
          });
        } else if (!isValidAddress(recipient_address)) {
          errors.push({
            row: rowCount,
            field: 'recipient_address',
            message: 'Invalid Ethereum address',
            value: recipient_address
          });
        }
        
        // Check chain ID
        if (!chain_id) {
          errors.push({
            row: rowCount,
            field: 'chain_id',
            message: 'Chain ID is required'
          });
        } else if (!isValidChainId(chain_id)) {
          errors.push({
            row: rowCount,
            field: 'chain_id',
            message: 'Unsupported or invalid chain ID',
            value: chain_id
          });
        }
        
        // Check token amount
        if (!token_amount) {
          errors.push({
            row: rowCount,
            field: 'token_amount',
            message: 'Token amount is required'
          });
        } else if (!isValidTokenAmount(token_amount)) {
          errors.push({
            row: rowCount,
            field: 'token_amount',
            message: 'Invalid token amount',
            value: token_amount
          });
        }
        
        // If all validations pass, add to distributions
        if (
          recipient_address &&
          isValidAddress(recipient_address) &&
          chain_id &&
          isValidChainId(chain_id) &&
          token_amount &&
          isValidTokenAmount(token_amount)
        ) {
          distributions.push({
            recipient_address: ethers.getAddress(recipient_address), // Format to checksum address
            chain_id,
            token_amount
          });
        }
      }
    });
    
    // Handle parsing completion
    parser.on('end', () => {
      resolve({
        distributions,
        errors,
        totalRows: rowCount,
        validRows: distributions.length
      });
    });
    
    // Handle errors
    parser.on('error', (err) => {
      logger.error('Error parsing CSV:', err);
      reject(new Error('Error parsing CSV file'));
    });
    
    // Start the stream
    try {
      const fullPath = path.resolve(filePath);
      if (!fs.existsSync(fullPath)) {
        return reject(new Error(`File not found: ${filePath}`));
      }
      
      createReadStream(fullPath).pipe(parser);
    } catch (error) {
      reject(error);
    }
  });
}

export default {
  processDistributionCsv
};
```

## Known Tokens Utility (for Development)

Create a utility to provide hardcoded tokens for development (`src/utils/getKnownTokens.ts`):

```typescript
import chainInfo from './chainInfo';

/**
 * Get predefined tokens for a wallet address (for development/testing)
 */
export function getKnownTokens(walletAddress: string) {
  // Normalize the wallet address
  const normalizedAddress = walletAddress.toLowerCase();
  
  // Map of wallet addresses to their known tokens
  const knownTokens: Record<string, any[]> = {
    // Documentation wallet
    '0x04da1034e7d84c004092671bbceb6b1c8dcda7ae': [
      {
        id: 1,
        creatorWallet: '0x04da1034e7d84c004092671bbceb6b1c8dcda7ae',
        tokenName: 'Documentation Token',
        tokenSymbol: 'DOC',
        iconUrl: '/uploads/icons/icon-1743539938071-325605596.png',
        decimals: 18,
        totalSupply: '1000000000000000000000',
        deploymentStatus: 'completed',
        selectedChains: ['7001', '11155111']
      }
    ],
    
    // Frontend testing wallet
    '0x4f1684a28e33f42cdf50ab96e29a709e17249e63': [
      {
        id: 2,
        creatorWallet: '0x4f1684a28e33f42cdf50ab96e29a709e17249e63',
        tokenName: 'Test Universal Token',
        tokenSymbol: 'TUT',
        iconUrl: '/uploads/icons/icon-1743539938071-325605596.png',
        decimals: 18,
        totalSupply: '1000000000000000000000',
        deploymentStatus: 'completed',
        selectedChains: ['7001', '11155111']
      }
    ]
  };
  
  // Return tokens for the specified wallet address
  const tokens = knownTokens[normalizedAddress] || [];
  
  // Format tokens with chain info
  return tokens.map(token => {
    const formattedToken = { ...token };
    
    // Add chainInfo array with deployment details
    formattedToken.chainInfo = token.selectedChains.map((chainId: string) => {
      // Get base chain info
      const baseChainInfo = chainInfo.getChainInfo(chainId);
      
      // Add mock deployment details
      const isZetaChain = chainInfo.isZetaChain(chainId);
      const contractAddress = isZetaChain 
        ? '0x51d5D00dfB9e1f4D60BBD6eda288F44Fb3158E16'
        : '0x0b3D12246660b41f982f07CdCd27536a79a16296';
      
      return {
        ...baseChainInfo,
        contractAddress,
        deploymentStatus: 'success',
        verificationStatus: 'verified',
        verificationError: null,
        verifiedUrl: isZetaChain 
          ? `${baseChainInfo.blockscoutUrl}/address/${contractAddress}/contracts#address-tabs`
          : `${baseChainInfo.explorerUrl}/address/${contractAddress}#code`,
        explorerUrl: `${baseChainInfo.explorerUrl}/address/${contractAddress}`
      };
    });
    
    return formattedToken;
  });
}

export default getKnownTokens;
```

## Error Handling Utility

Create a utility for standardized error handling (`src/utils/errorHandler.ts`):

```typescript
import { Response } from 'express';
import logger from './logger';

/**
 * API error response structure
 */
interface ApiErrorResponse {
  error: boolean;
  message: string;
  details?: any;
  statusCode?: number;
}

/**
 * Send a standardized error response
 */
export function sendErrorResponse(
  res: Response,
  message: string,
  details?: any,
  statusCode: number = 400
): Response {
  const errorResponse: ApiErrorResponse = {
    error: true,
    message,
    details: process.env.DEBUG === 'true' ? details : undefined,
    statusCode
  };
  
  return res.status(statusCode).json(errorResponse);
}

/**
 * Handle API errors with logging
 */
export function handleApiError(
  res: Response,
  error: any,
  message: string = 'An error occurred',
  statusCode: number = 500
): Response {
  // Log the error
  logger.error(message, {
    error: error.message,
    stack: error.stack
  });
  
  // Send error response
  return sendErrorResponse(res, message, error.message, statusCode);
}

export default {
  sendErrorResponse,
  handleApiError
};
```

These utilities provide essential functionality for the Universal Token Launcher backend, including chain information management, logging, file handling, and CSV processing. Next, proceed to [Services](4-services.md) to implement the core business logic. 