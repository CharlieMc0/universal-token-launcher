# 5. API Implementation

This section covers the implementation of API controllers, routes, and middleware for the Universal Token Launcher backend.

## Authentication Middleware

Create the authentication middleware (`src/middleware/auth.ts`):

```typescript
import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import { sendErrorResponse } from '../utils/errorHandler';

// Extend Express Request type to include wallet property
declare global {
  namespace Express {
    interface Request {
      walletAddress?: string;
    }
  }
}

/**
 * Middleware to authenticate requests using wallet address
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    // Get wallet address from header
    const walletAddress = req.headers['x-wallet-address'] as string;
    
    // Check if wallet address is provided
    if (!walletAddress) {
      // If in debug mode, allow bypass
      if (process.env.DEBUG === 'true' && process.env.AUTH_BYPASS_ENABLED === 'true') {
        logger.warn('Auth bypass enabled, proceeding without wallet address');
        req.walletAddress = '0x0000000000000000000000000000000000000000';
        return next();
      }
      
      return sendErrorResponse(res, 'Wallet address is required', null, 401);
    }
    
    // Validate wallet address format
    if (!walletAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      return sendErrorResponse(res, 'Invalid wallet address format', null, 401);
    }
    
    // Attach to request
    req.walletAddress = walletAddress;
    
    next();
  } catch (error) {
    logger.error('Auth middleware error:', error);
    return sendErrorResponse(res, 'Authentication error', error.message, 500);
  }
}
```

## Token Controller

Create the token controller (`src/controllers/TokenController.ts`):

```typescript
import { Request, Response } from 'express';
import tokenService from '../services/TokenService';
import logger from '../utils/logger';
import { handleApiError, sendErrorResponse } from '../utils/errorHandler';
import { getFilePath } from '../utils/fileUpload';

class TokenController {
  /**
   * Create a new token configuration
   */
  async createToken(req: Request, res: Response) {
    try {
      const { walletAddress } = req;
      
      // Validate required fields
      const { token_name, token_symbol, total_supply, selected_chains } = req.body;
      
      if (!token_name || !token_symbol || !total_supply || !selected_chains) {
        return sendErrorResponse(res, 'Missing required fields', {
          required: ['token_name', 'token_symbol', 'total_supply', 'selected_chains']
        });
      }
      
      // Parse selected chains
      let selectedChains;
      try {
        selectedChains = JSON.parse(selected_chains);
        if (!Array.isArray(selectedChains) || selectedChains.length === 0) {
          return sendErrorResponse(res, 'Invalid selected_chains format, must be a non-empty array');
        }
      } catch (error) {
        return sendErrorResponse(res, 'Invalid selected_chains JSON');
      }
      
      // Prepare token data
      const tokenData = {
        creatorWallet: walletAddress,
        token_name,
        token_symbol,
        decimals: req.body.decimals || 18,
        total_supply,
        selected_chains,
        distributions_json: req.body.distributions_json
      };
      
      // Add icon URL if provided
      if (req.file) {
        tokenData.iconUrl = getFilePath(req.file);
      }
      
      // Create token configuration
      const token = await tokenService.createTokenConfiguration(tokenData);
      
      res.status(201).json(token);
    } catch (error) {
      return handleApiError(res, error, 'Error creating token configuration');
    }
  }

  /**
   * Get token by ID
   */
  async getToken(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { walletAddress } = req;
      
      const token = await tokenService.getTokenById(parseInt(id));
      
      if (!token) {
        return sendErrorResponse(res, `Token with ID ${id} not found`, null, 404);
      }
      
      // Check if user is the creator
      if (token.creatorWallet !== walletAddress && process.env.DEBUG !== 'true') {
        return sendErrorResponse(res, 'Not authorized to access this token', null, 403);
      }
      
      res.json(token);
    } catch (error) {
      return handleApiError(res, error, 'Error retrieving token');
    }
  }

  /**
   * Get all tokens
   */
  async getAllTokens(req: Request, res: Response) {
    try {
      const { walletAddress } = req;
      const { creator } = req.query;
      
      // If creator param is provided, validate user has access
      if (creator && creator !== walletAddress && process.env.DEBUG !== 'true') {
        return sendErrorResponse(res, 'Not authorized to access tokens for this creator', null, 403);
      }
      
      // Get tokens for the creator or authenticated user
      const targetWallet = (creator as string) || walletAddress;
      const tokens = await tokenService.findUserUniversalTokens(targetWallet);
      
      res.json({ tokens });
    } catch (error) {
      return handleApiError(res, error, 'Error retrieving tokens');
    }
  }

  /**
   * Get user tokens
   */
  async getUserTokens(req: Request, res: Response) {
    try {
      const { walletAddress } = req.params;
      const { requestWallet } = req;
      
      // Check if user is authorized to get tokens for the requested wallet
      if (walletAddress !== requestWallet && process.env.DEBUG !== 'true') {
        return sendErrorResponse(res, 'Not authorized to access tokens for this wallet', null, 403);
      }
      
      const tokens = await tokenService.findUserUniversalTokens(walletAddress);
      
      res.json({ tokens });
    } catch (error) {
      return handleApiError(res, error, 'Error retrieving user tokens');
    }
  }

  /**
   * Deploy token
   */
  async deployToken(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { walletAddress } = req;
      const { fee_paid_tx } = req.body;
      
      if (!fee_paid_tx) {
        return sendErrorResponse(res, 'Missing fee_paid_tx in request body');
      }
      
      // Get token
      const token = await tokenService.getTokenById(parseInt(id));
      
      if (!token) {
        return sendErrorResponse(res, `Token with ID ${id} not found`, null, 404);
      }
      
      // Check if user is the creator
      if (token.creatorWallet !== walletAddress && process.env.DEBUG !== 'true') {
        return sendErrorResponse(res, 'Not authorized to deploy this token', null, 403);
      }
      
      // Check token deployment status
      if (token.deploymentStatus !== 'pending') {
        return sendErrorResponse(res, `Token is already in ${token.deploymentStatus} state`);
      }
      
      // Verify fee payment (simplified)
      // In a real implementation, you would verify the transaction details
      
      // Deploy token
      const deploymentResult = await tokenService.deployToken(parseInt(id), fee_paid_tx);
      
      res.json({
        success: true,
        message: 'Token deployment initiated',
        status: 'deploying',
        details: deploymentResult
      });
    } catch (error) {
      return handleApiError(res, error, 'Error deploying token');
    }
  }

  /**
   * Get deployment logs
   */
  async getDeploymentLogs(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { walletAddress } = req;
      
      // Get token
      const token = await tokenService.getTokenById(parseInt(id));
      
      if (!token) {
        return sendErrorResponse(res, `Token with ID ${id} not found`, null, 404);
      }
      
      // Check if user is the creator
      if (token.creatorWallet !== walletAddress && process.env.DEBUG !== 'true') {
        return sendErrorResponse(res, 'Not authorized to access logs for this token', null, 403);
      }
      
      // Get deployment logs
      const logs = await tokenService.getDeploymentLogs(parseInt(id));
      
      res.json({ logs });
    } catch (error) {
      return handleApiError(res, error, 'Error retrieving deployment logs');
    }
  }
}

export default new TokenController();
```

## Token Routes

Create the token routes (`src/routes/tokenRoutes.ts`):

```typescript
import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { requestIdMiddleware } from '../middleware/requestId';
import { loggingMiddleware } from '../middleware/logging';
import TokenController from '../controllers/TokenController';
import { iconUpload } from '../utils/fileUpload';

const router = express.Router();

// Apply middleware
router.use(requestIdMiddleware);
router.use(loggingMiddleware);
router.use(authMiddleware);

// Token routes
router.post('/', iconUpload.single('icon'), TokenController.createToken);
router.get('/', TokenController.getAllTokens);
router.get('/:id', TokenController.getToken);
router.post('/:id/deploy', TokenController.deployToken);
router.get('/:id/logs', TokenController.getDeploymentLogs);

export default router;
```

## User Routes

Create the user routes (`src/routes/userRoutes.ts`):

```typescript
import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { requestIdMiddleware } from '../middleware/requestId';
import { loggingMiddleware } from '../middleware/logging';
import TokenController from '../controllers/TokenController';

const router = express.Router();

// Apply middleware
router.use(requestIdMiddleware);
router.use(loggingMiddleware);
router.use(authMiddleware);

// User routes
router.get('/:walletAddress/tokens', TokenController.getUserTokens);

export default router;
```

## Update Main Application

Update the main application file (`src/index.ts`) to include the routes:

```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import dotenv from 'dotenv';
import db from './db';
import logger from './utils/logger';
import tokenRoutes from './routes/tokenRoutes';
import userRoutes from './routes/userRoutes';

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined'));

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.get('/', (req, res) => {
  res.send('Universal Token Launcher API');
});

// API routes
app.use('/api/tokens', tokenRoutes);
app.use('/api/users', userRoutes);

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    error: true,
    message: 'Internal server error',
    details: process.env.DEBUG === 'true' ? err.message : undefined
  });
});

// Start server
app.listen(port, () => {
  logger.info(`Server running on port ${port}`);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled promise rejection:', reason);
});

export default app;
```

## API Documentation

Create a simple API documentation page (`src/routes/docsRoutes.ts`):

```typescript
import express from 'express';
import path from 'path';

const router = express.Router();

router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/docs.html'));
});

export default router;
```

Update the main application file to include the documentation routes:

```typescript
import docsRoutes from './routes/docsRoutes';

// Inside the routes section
app.use('/docs', docsRoutes);
```

Create a basic documentation HTML file (`public/docs.html`):

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Universal Token Launcher API Documentation</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 20px;
      line-height: 1.6;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
    }
    h1 {
      color: #333;
    }
    h2 {
      color: #0066cc;
      margin-top: 30px;
    }
    code {
      background-color: #f5f5f5;
      padding: 2px 5px;
      border-radius: 3px;
    }
    pre {
      background-color: #f5f5f5;
      padding: 15px;
      border-radius: 5px;
      overflow-x: auto;
    }
    .endpoint {
      margin-bottom: 30px;
    }
    .method {
      font-weight: bold;
      margin-right: 10px;
      color: #0066cc;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 8px;
      text-align: left;
    }
    th {
      background-color: #f5f5f5;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Universal Token Launcher API Documentation</h1>
    <p>This document provides information about the Universal Token Launcher API endpoints.</p>
    
    <h2>Authentication</h2>
    <p>All requests require a wallet address to be provided in the <code>X-Wallet-Address</code> header.</p>
    <pre>X-Wallet-Address: 0x1234...5678</pre>
    
    <h2>Endpoints</h2>
    
    <div class="endpoint">
      <h3><span class="method">POST</span> /api/tokens</h3>
      <p>Creates a new token configuration.</p>
      <h4>Request Parameters (multipart/form-data):</h4>
      <table>
        <tr>
          <th>Parameter</th>
          <th>Type</th>
          <th>Required</th>
          <th>Description</th>
        </tr>
        <tr>
          <td>token_name</td>
          <td>string</td>
          <td>Yes</td>
          <td>Name of the token</td>
        </tr>
        <tr>
          <td>token_symbol</td>
          <td>string</td>
          <td>Yes</td>
          <td>Symbol of the token</td>
        </tr>
        <tr>
          <td>decimals</td>
          <td>integer</td>
          <td>No</td>
          <td>Number of decimals (default: 18)</td>
        </tr>
        <tr>
          <td>total_supply</td>
          <td>string</td>
          <td>Yes</td>
          <td>Total supply of the token</td>
        </tr>
        <tr>
          <td>selected_chains</td>
          <td>JSON string</td>
          <td>Yes</td>
          <td>Array of chain IDs for deployment</td>
        </tr>
        <tr>
          <td>icon</td>
          <td>file</td>
          <td>No</td>
          <td>Token icon image file</td>
        </tr>
      </table>
    </div>
    
    <div class="endpoint">
      <h3><span class="method">GET</span> /api/tokens/:id</h3>
      <p>Retrieves a token configuration by ID.</p>
      <h4>Path Parameters:</h4>
      <table>
        <tr>
          <th>Parameter</th>
          <th>Type</th>
          <th>Description</th>
        </tr>
        <tr>
          <td>id</td>
          <td>integer</td>
          <td>Token configuration ID</td>
        </tr>
      </table>
    </div>
    
    <div class="endpoint">
      <h3><span class="method">POST</span> /api/tokens/:id/deploy</h3>
      <p>Deploys a token configuration to the selected chains.</p>
      <h4>Path Parameters:</h4>
      <table>
        <tr>
          <th>Parameter</th>
          <th>Type</th>
          <th>Description</th>
        </tr>
        <tr>
          <td>id</td>
          <td>integer</td>
          <td>Token configuration ID</td>
        </tr>
      </table>
      <h4>Request Body (JSON):</h4>
      <pre>{
  "fee_paid_tx": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
}</pre>
    </div>
    
    <div class="endpoint">
      <h3><span class="method">GET</span> /api/tokens</h3>
      <p>Retrieves all tokens created by a wallet address.</p>
      <h4>Query Parameters:</h4>
      <table>
        <tr>
          <th>Parameter</th>
          <th>Type</th>
          <th>Required</th>
          <th>Description</th>
        </tr>
        <tr>
          <td>creator</td>
          <td>string</td>
          <td>No</td>
          <td>Filter by creator wallet address</td>
        </tr>
      </table>
    </div>
    
    <div class="endpoint">
      <h3><span class="method">GET</span> /api/users/:walletAddress/tokens</h3>
      <p>Retrieves all tokens owned by a specific wallet address.</p>
      <h4>Path Parameters:</h4>
      <table>
        <tr>
          <th>Parameter</th>
          <th>Type</th>
          <th>Description</th>
        </tr>
        <tr>
          <td>walletAddress</td>
          <td>string</td>
          <td>Wallet address</td>
        </tr>
      </table>
    </div>
  </div>
</body>
</html>
```

With these files in place, you have a complete API implementation for the Universal Token Launcher backend. The API provides endpoints for creating token configurations, deploying tokens to multiple chains, and retrieving token information.

Next, proceed to [Testing](6-testing.md) to implement tests for the backend services and API endpoints. 