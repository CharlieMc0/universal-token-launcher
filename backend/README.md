# Universal Token Launcher Backend

This backend service provides APIs for creating, managing, and deploying universal tokens on ZetaChain and EVM-compatible chains.

## Recent Changes

- Initialized TypeScript configuration with ES2020 target
- Set up project structure with proper directory organization
- Created initial Express server setup in `src/index.ts`
- Added token routes for API endpoints
- Set up environment variable configuration
- Configured basic error handling and middleware
- Implemented contract verification service for multiple block explorers:
  - Support for Blockscout API (ZetaChain) and Etherscan API (EVM chains)
  - Automatic source code dependency resolution for verification
  - Status tracking and polling for verification completion
  - Explorer URLs for verified contracts
- Enhanced API responses for tokens:
  - Added detailed contract information for each chain in chainInfo array
  - Included contract addresses and deployment status for each chain
  - Added verification status (verified, pending, failed) for deployed contracts
  - Included explorer URLs and Blockscout URLs for easy contract viewing
  - Provided links to verified contract source code
  - Consistently formatted chainInfo across all token-related endpoints
- Enhanced testing framework for contract deployment and token management:
  - Improved output display of contract addresses and transaction hashes in tests
  - Created comprehensive demo script for full token flow demonstration
  - Added a connect-tokens script to help connect tokens across chains
  - Enhanced error handling to gracefully fall back to mock data
  - Added summary output of all deployed contracts at the end of tests
  - Fixed various bugs in the test code to make it more robust
  - Added explorer URLs to make it easy to verify contracts on the blockchain
- Added comprehensive logging system:
  - Structured JSON logs for better filtering and analysis
  - Separate log files for general application logs, errors, and deployments
  - Request/response logging with performance metrics
  - Detailed deployment tracking across all chains
  - Log viewer utility for searching and analyzing logs
  - Unique request IDs for tracing request lifecycle
  - Automatic log rotation and size management
  - Global error handling for uncaught exceptions

## Recent Bug Fixes

### ZetaChain Deployment Issue

We fixed an issue where token deployments could fail with the error `Deployment log not found for ZetaChain (ID: ${zetaChainId})`. The improvements include:

1. **Flexible ZetaChain ID Detection**: The system now checks multiple possible ZetaChain IDs (production and testnet) to find the correct deployment log.

2. **Auto-creation of Missing Logs**: If a deployment log isn't found for ZetaChain, the system will now create one automatically rather than failing.

3. **Better Error Tracking**: We added a `deploymentError` field to the `TokenConfiguration` model to store detailed error information.

4. **Chain Connection Improvements**: When connecting tokens across chains, we now use the detected ZetaChain ID to ensure connections work correctly.

5. **Improved Status Tracking**: The system now better tracks deployment status, including 'partial' deployments where some chains succeed and others fail.

To apply these fixes to an existing database, run:

```bash
npm run migrate
```

## Prerequisites

- Node.js v16+
- PostgreSQL database
- ZetaChain and EVM-compatible wallet with funds for deployments

## Environment Setup

Copy the example environment file and update with your values:

```bash
cp .env.example .env
```

Required environment variables:

```
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=universal_token_launcher

# Blockchain Configuration
ZETACHAIN_RPC_URL=https://zetachain-athens-evm.blockpi.network/v1/rpc/public
SEPOLIA_RPC_URL=https://sepolia.drpc.org

# Wallet Configuration (for testing only)
TEST_WALLET_PRIVATE_KEY=your_private_key_with_0x_prefix

# Server Configuration
PORT=3001
JWT_SECRET=your_jwt_secret
DEBUG=true  # Set to true for more verbose logging

# Contract Verification APIs
ETHERSCAN_API_KEY=your_etherscan_api_key
POLYGONSCAN_API_KEY=your_polygonscan_api_key
BASESCAN_API_KEY=your_basescan_api_key
```

## Running the Server

Install dependencies:

```bash
npm install
```

Initialize the database:

```bash
# Make sure Postgres is running and .env is configured
node src/scripts/initDb.js
```

Development mode:

```bash
npm run dev
```

Production build:

```bash
npm run build
npm start
```

## Testing the Contract Deployment

To test the contract deployment functionality, follow these steps:

1. Compile the smart contracts:

```bash
# From the smart-contracts directory
npm install
npx hardhat compile
```

2. Configure environment variables in the `.env` file:

```
# Required for deployment
DEPLOYER_PRIVATE_KEY=your_private_key_with_0x_prefix
TEST_WALLET_ADDRESS=your_wallet_address
```

3. Run the contract tests:

```bash
# Test ZetaChain token deployment
node -e "require('./src/tests/contract.test').testZetaChainDeployment()"

# Test EVM token deployment
node -e "require('./src/tests/contract.test').testEVMDeployment()"
```

4. Run the token service tests:

```bash
# Test token configuration creation
node -e "require('./src/tests/token.test').testCreateTokenConfiguration()"
```

5. Run the complete demo showing the entire token flow

```bash
npm run run-demo
```

6. Test contract verification:

```bash
# Test both Blockscout and Etherscan verification methods
npm run verify-test

# Test only Blockscout (ZetaChain) verification
npm run verify-test blockscout

# Test only Etherscan verification (for EVM chains like Sepolia)
npm run verify-test etherscan
```

The verification test will:
- Attempt to verify a contract on the specified explorer
- Display verification API requests and responses
- Show verification status (success, pending, or error)
- Output explorer URLs for verified contracts

7. Connect tokens across chains:

```bash
# Connect tokens between ZetaChain and an EVM chain
npm run connect-tokens-testnet <zetaChainTokenAddress> <evmChainId> <evmTokenAddress>

# Example:
npm run connect-tokens-testnet 0x1234567890123456789012345678901234567890 11155111 0x9876543210987654321098765432109876543210
```

## Logging System

The application uses a structured logging system based on Winston to track all operations, with a focus on deployment activities.

### Log Files

Logs are stored in the `logs` directory:

- `application-combined.log` - All logs from the application
- `error.log` - Error logs only (for quick troubleshooting)
- `deployment.log` - Deployment-specific logs (token deployment activities)

Each log file automatically rotates when it reaches 5MB, keeping up to 5 historical files for each log type.

### Log Format

Logs are stored in JSON format with the following standard fields:

```json
{
  "level": "info",
  "message": "The log message",
  "timestamp": "2023-04-01T12:34:56.789Z",
  "service": "universal-token-launcher",
  "additionalData": "..."
}
```

Deployment logs include additional structured fields for easy filtering:

```json
{
  "action": "deploy",
  "tokenId": 123,
  "chainId": "7001",
  "status": "success",
  "contractAddress": "0x...",
  "transactionHash": "0x..."
}
```

### Viewing Logs

A log viewer utility is included to help search and analyze logs:

```bash
# View all deployment logs (default)
npm run logs

# View deployment logs specifically
npm run logs:deployment

# View error logs specifically
npm run logs:error

# Advanced usage with custom parameters
node scripts/viewLogs.js --file=error.log

# Search for logs related to a specific token
node scripts/viewLogs.js --search=tokenId:123

# Search for logs by API request ID
node scripts/viewLogs.js --search=requestId:abc123

# Search for logs in a date range
node scripts/viewLogs.js --from=2023-04-01 --to=2023-04-30

# Combine search criteria
node scripts/viewLogs.js --file=deployment.log --search=status:failed
```

### API Request Tracking

All API requests are assigned a unique ID that is maintained throughout the request lifecycle. This allows for easy correlation between request and response logs, even in high-traffic environments.

```json
// Request log example
{
  "level": "info",
  "message": "API Request",
  "requestId": "i3o60cw7a7",
  "method": "GET",
  "url": "/api/tokens/123",
  "walletAddress": "0x4f1684A28E33F42cdf50AB96e29a709e17249E63"
}

// Response log example
{
  "level": "info",
  "message": "API Response",
  "requestId": "i3o60cw7a7",
  "statusCode": 200,
  "responseTime": "45ms"
}
```

### Deployment Status Tracking

The logging system captures detailed information about each step of the deployment process:

1. **Initialization**: Records when a deployment begins
   ```json
   {"action":"start","tokenId":123,"chainId":"all","status":"started"}
   ```

2. **Chain Deployment**: Logs the status of each chain deployment
   ```json
   {"action":"deploy","tokenId":123,"chainId":"7001","status":"started"}
   {"action":"deploy","tokenId":123,"chainId":"7001","status":"success","contractAddress":"0x...","transactionHash":"0x..."}
   ```

3. **Contract Verification**: Tracks verification status on block explorers
   ```json
   {"action":"verify","tokenId":123,"chainId":"7001","status":"started"}
   {"action":"verify","tokenId":123,"chainId":"7001","status":"success","explorerUrl":"https://..."}
   ```

4. **Chain Connection**: Records cross-chain connection attempts
   ```json
   {"action":"connect","tokenId":123,"chainId":"11155111","status":"started","zetaChainAddress":"0x...","evmAddress":"0x..."}
   {"action":"connect","tokenId":123,"chainId":"11155111","status":"success","zetaChainTxHash":"0x...","evmTxHash":"0x..."}
   ```

5. **Completion**: Summarizes the final deployment status
   ```json
   {"action":"complete","tokenId":123,"chainId":"all","status":"completed","successCount":2,"failedCount":0}
   ```

Each log entry includes the relevant token ID, chain ID, and transaction hashes, making it easy to track the complete lifecycle of a token deployment and quickly identify any issues that occur during the process.

### Error Handling

The logging system captures both handled and unhandled errors:

1. **Handled errors**: Detailed logs with context about where the error occurred
   ```json
   {"level":"error","message":"Error deploying on chain 11155111","tokenId":123,"chainId":"11155111","error":"Provider connection failed"}
   ```

2. **Unhandled exceptions**: Global error handlers capture otherwise uncaught errors
   ```json
   {"level":"error","message":"Uncaught exception","error":"Cannot read property of undefined","stack":"..."}
   ```

3. **Unhandled promise rejections**: Captures any promise rejections that aren't properly handled
   ```json
   {"level":"error","message":"Unhandled promise rejection","reason":"Network error","promise":"..."}
   ```

### Integration with Deployment Services

The logging system is tightly integrated with the token deployment process:

```javascript
// Example of how token deployment is logged
logDeployment('deploy', tokenId, chainId, 'started', {
  chainName: 'ZetaChain',
  tokenName: 'My Universal Token'
});

// Later after successful deployment
logDeployment('deploy', tokenId, chainId, 'success', {
  contractAddress: '0x1234...',
  transactionHash: '0xabcd...'
});
```

This structured approach ensures all deployment activities are properly tracked and can be easily searched and analyzed.

## API Usage Examples

### Create a Token Configuration

```bash
curl -X POST http://localhost:3001/api/tokens \
  -H "Content-Type: multipart/form-data" \
  -H "X-Wallet-Address: YOUR_WALLET_ADDRESS" \
  -F "token_name=My Token" \
  -F "token_symbol=MTK" \
  -F "decimals=18" \
  -F "total_supply=1000000000000000000000" \
  -F "selected_chains=[\"7001\",\"11155111\"]" \
  -F "distributions_json=[{\"recipient_address\":\"YOUR_WALLET_ADDRESS\",\"chain_id\":\"7001\",\"token_amount\":\"100000000000000000000\"}]" \
  -F "icon=@path/to/icon.png"
```

### Deploy a Token

```bash
curl -X POST http://localhost:3001/api/tokens/1/deploy \
  -H "Content-Type: application/json" \
  -H "X-Wallet-Address: YOUR_WALLET_ADDRESS" \
  -d '{"fee_paid_tx": "0x123abc..."}'
```

### Get Deployment Status

```bash
curl -X GET http://localhost:3001/api/tokens/1/logs \
  -H "X-Wallet-Address: YOUR_WALLET_ADDRESS"
```

### Get Contract Verification Status

```bash
curl -X GET http://localhost:3001/api/tokens/1/verification \
  -H "X-Wallet-Address: YOUR_WALLET_ADDRESS"
```

## API Endpoints

The following endpoints are planned:

- `POST /api/tokens` - Create a new token configuration
- `GET /api/tokens` - Get all token configurations
- `GET /api/tokens/:id` - Get token by ID
- `GET /api/tokens/:id/logs` - Get deployment logs
- `POST /api/tokens/:id/deploy` - Deploy a token
- `GET /api/tokens/:id/verification` - Get verification status for deployed contracts

All token-related endpoints now return enhanced responses that include detailed information for each chain in the `chainInfo` array:

```json
{
  "id": 32,
  "creatorWallet": "0x4f1684A28E33F42cdf50AB96e29a709e17249E63",
  "tokenName": "My Universal Token",
  "tokenSymbol": "MUT",
  "iconUrl": "/uploads/icons/icon-1743539938071-325605596.png",
  "decimals": 18,
  "totalSupply": "1000000000000000000000",
  "deploymentStatus": "completed",
  "chainInfo": [
    {
      "name": "ZetaChain Testnet",
      "chainId": "7001",
      "rpcUrl": "https://zetachain-athens-evm.blockpi.network/v1/rpc/public",
      "explorerUrl": "https://athens.explorer.zetachain.com",
      "isZetaChain": true,
      "color": "#00B386",
      "shortName": "ZetaChain",
      "isTestnet": true,
      "isSupported": true,
      "blockscoutUrl": "https://athens.explorer.zetachain.com",
      "contractAddress": "0x1234567890abcdef1234567890abcdef12345678",
      "verificationStatus": "verified",
      "verificationError": null,
      "verifiedUrl": "https://athens.explorer.zetachain.com/address/0x1234567890abcdef1234567890abcdef12345678/contracts#address-tabs",
      "deploymentStatus": "success",
      "explorerUrl": "https://athens.explorer.zetachain.com/address/0x1234567890abcdef1234567890abcdef12345678"
    },
    {
      "name": "Sepolia",
      "chainId": "11155111",
      "rpcUrl": "https://ethereum-sepolia.publicnode.com",
      "explorerUrl": "https://sepolia.etherscan.io",
      "isZetaChain": false,
      "color": "#627EEA",
      "shortName": "Sepolia",
      "isTestnet": true,
      "isSupported": true,
      "contractAddress": "0x9876543210fedcba9876543210fedcba98765432",
      "verificationStatus": "verified",
      "verificationError": null,
      "verifiedUrl": "https://sepolia.etherscan.io/address/0x9876543210fedcba9876543210fedcba98765432#code",
      "deploymentStatus": "success",
      "explorerUrl": "https://sepolia.etherscan.io/address/0x9876543210fedcba9876543210fedcba98765432"
    }
  ]
}
```

This enhanced structure makes it easy for the frontend to display rich information about the deployment status and contract verification for each chain.

## Recommended Next Steps

1. **Implement User Authentication**
   - Add JWT-based authentication with wallet signatures
   - Create proper auth middleware for production use

2. **Enhance Error Handling**
   - Add more detailed error messages
   - Implement retry mechanisms for failed deployments

3. **Add Unit Tests**
   - Create automated tests for controllers and services
   - Add integration tests for the API

4. **Improve Contract Services**
   - Add support for more EVM-compatible chains
   - Implement token distribution functionality

5. **Add Monitoring**
   - Add logging for production monitoring
   - Implement alerts for failed deployments

6. **Security and Authorization**
   - Implement JWT-based authentication
   - Add permission checks for protected endpoints
   - Secure environment variables and sensitive data

7. **Documentation**
   - Complete API documentation
   - Add swagger/OpenAPI specifications
   - Document deployment and operation procedures

## Testing

Install test dependencies:

```bash
npm install --save-dev jest supertest @babel/preset-env babel-jest
```

Run tests:

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run tests with coverage report
npm run test:coverage
```

The test suite includes:

- **Unit tests** for services, models, and utilities
- **Integration tests** for API endpoints
- **Mocked dependencies** to avoid network calls during testing

## Test Status

### Current Test Status

- **Passing Tests:**
  - `chainInfo.test.js`: All 15 tests passing - confirming chain information utilities
  - `TokenService.test.js`: All 19 tests passing - verifying token deployment processes

- **Failing Tests:**
  - `ContractService.test.js`: Failing due to improper mocking of `ethers.JsonRpcProvider`
  - `fileUpload.test.js`: Failing due to `jest.mock` referencing out-of-scope variables
  - `csvProcessing.test.js`: Failing due to validation and processing issues
  - `tokenEndpoints.test.js`: Integration test failing due to path resolution with `index.ts`

### Fixing Common Test Issues

1. **Mocking External Dependencies:**
   ```javascript
   // Always mock external modules BEFORE importing the modules under test
   jest.mock('ethers', () => ({
     JsonRpcProvider: jest.fn().mockImplementation(() => ({
       getNetwork: jest.fn().mockResolvedValue({ chainId: 1 }),
       getSigner: jest.fn()
     })),
     // Other mocked components...
   }));
   
   // Then import your module
   const moduleUnderTest = require('../path/to/module');
   ```

2. **File System Operations:**
   - Create temporary directories and files in `beforeAll()`
   - Clean up in `afterAll()`
   - Mock `fs` functions to avoid actual file operations:
   ```javascript
   jest.mock('fs', () => ({
     ...jest.requireActual('fs'),
     existsSync: jest.fn().mockReturnValue(true),
     createReadStream: jest.fn()
   }));
   ```

3. **Jest Module Factory Pattern:**
   - When using `jest.mock()` with a factory function, ensure variables referenced inside the factory are in scope:
   ```javascript
   const fs = require('fs');
   
   // This is correct:
   jest.mock('module-name', () => {
     return {
       someFunction: jest.fn().mockImplementation(() => {
         // fs is available here because it was defined outside
         return fs.existsSync() ? 'found' : 'not found';
       })
     };
   });
   
   // This would fail:
   jest.mock('module-name', () => {
     // Cannot use undeclared variable 'undefinedVar'
     return { someFunction: () => undefinedVar };
   });
   ```

4. **Ethers.js v6 Compatibility:**
   - Ethers.js v6 requires different mocking strategies compared to v5
   - For proper provider mocking, include both `getNetwork` and `getSigner` methods
   - When mocking contract functions, remember they return objects with various properties
   - Use `mockResolvedValue` for promises and `mockReturnValue` for synchronous functions

### Special Test Files

Some test files require special handling:

- `contract.test.js` and `token.test.js`: These are more like example tests that require real blockchain connections. They're meant to be run manually with proper environment variables.

### Running Specific Tests

To run a specific test file:

```bash
npm test -- backend/src/__tests__/unit/utils/chainInfo.test.js
```

To run tests with a specific name pattern:

```bash
npm test -- -t "should return chain information"
```

To exclude certain tests:

```bash
npm test -- --testPathIgnorePatterns=contract.test.js
```

## Database Migrations

The application uses database migrations to handle schema changes. Migrations are stored in the `src/db/migrations` directory.

To run all migrations:

```bash
npm run migrate
```

To run a specific migration file:

```bash
npm run migrate:single src/db/migrations/MIGRATION_FILE.js
```

When making changes to the database schema:

1. Create a new migration file in the `src/db/migrations` directory (follow the naming convention: `YYYYMMDD_migration_name.js`).
2. Implement the migration with a `migrate()` function that handles both applying the change and checking if it's already been applied.
3. Run the migration using the commands above.

## Chain Information Utilities

The application uses the `chainInfo` utility for consistent chain information and enhanced blockchain interaction. This utility provides:

- **Cross-Chain Compatibility**: Standardized chain detection and validation across the application
- **Enhanced Display Information**: Adds useful display properties like chain colors and shortened names
- **Explorer URLs**: Generates blockchain explorer URLs for transactions and addresses
- **Proper ZetaChain Detection**: Intelligent handling of ZetaChain IDs in both testnet and mainnet environments

To use in your code:

```javascript
const chainInfo = require('./utils/chainInfo');

// Get information about a chain
const chain = chainInfo.getChainInfo('7001');

// Check if a chain is ZetaChain
const isZeta = chainInfo.isZetaChain('7001'); // true

// Get formatted chain information with display properties
const formattedChain = chainInfo.getFormattedChainInfo('7001');

// Generate an explorer URL for a transaction
const explorerUrl = chainInfo.getExplorerTxUrl('7001', '0x123...');
```

## ChainInfo Schema

The chainInfo schema has been enhanced to include detailed information about contract deployment and verification status. This schema is consistently used across all token-related API endpoints.

### Basic Chain Properties

- `name`: Full chain name (e.g., "ZetaChain Testnet")
- `chainId`: Chain identifier as string (e.g., "7001")
- `rpcUrl`: JSON-RPC endpoint URL for the chain
- `explorerUrl`: Base URL for the standard block explorer 
- `isZetaChain`: Boolean indicating whether this is a ZetaChain network
- `color`: Hex color code for UI display (e.g., "#00B386")
- `shortName`: Abbreviated name for UI display (e.g., "ZetaChain")
- `isTestnet`: Boolean indicating whether this is a testnet network
- `isSupported`: Boolean indicating whether this chain is fully supported
- `blockscoutUrl`: Base URL for Blockscout explorer if available (specific to ZetaChain and Base networks)

### Contract Deployment Properties

- `contractAddress`: Deployed token contract address on this chain
- `deploymentStatus`: Current deployment status
  - "pending": Initial state before deployment begins
  - "deploying": Deployment in progress
  - "success": Successfully deployed
  - "failed": Deployment failed
  - "retrying": Retry attempt in progress

### Verification Properties

- `verificationStatus`: Status of contract verification
  - "pending": Not yet verified
  - "processing": Verification in progress
  - "verified": Successfully verified
  - "failed": Verification failed
- `verificationError`: Error message if verification failed
- `verifiedUrl`: Direct URL to verified contract source code

### Explorer URLs

- `explorerUrl`: Full URL to view the contract on the standard explorer
- `blockscoutUrl`: Full URL to view the contract on Blockscout (if applicable)

### Example Usage in Frontend

```javascript
// Display contract addresses and status
function renderContractInfo(chainInfo) {
  return chainInfo.map(chain => (
    <div key={chain.chainId} className="chain-card" style={{ borderColor: chain.color }}>
      <h3>{chain.name}</h3>
      <div className="contract-address">
        {chain.contractAddress ? (
          <a href={chain.explorerUrl} target="_blank" rel="noopener noreferrer">
            {chain.contractAddress.slice(0, 6) + '...' + chain.contractAddress.slice(-4)}
          </a>
        ) : (
          <span>Not deployed yet</span>
        )}
      </div>
      <div className="status-badge">
        {chain.deploymentStatus === 'success' ? (
          <span className="success">Deployed</span>
        ) : (
          <span className={chain.deploymentStatus}>{chain.deploymentStatus}</span>
        )}
      </div>
      {chain.verificationStatus === 'verified' && (
        <a href={chain.verifiedUrl} className="verified-badge" target="_blank" rel="noopener noreferrer">
          Verified Source
        </a>
      )}
    </div>
  ));
}
```

This enhanced schema provides a consistent interface for frontend developers to display rich information about token deployment across multiple chains.

## Token Distribution CSV Format

Token distributions can be uploaded via CSV file. The file should have the following format:

```csv
recipient_address,chain_id,token_amount
0x4f1684A28E33F42cdf50AB96e29a709e17249E63,7001,100
0x3a4Cc340A87C38d36e469CB8f8EB37Fba0e3daF3,11155111,50
```

### Required Columns

- **recipient_address**: A valid Ethereum address (0x prefixed)
- **chain_id**: Chain ID where tokens will be distributed (e.g., 7001 for ZetaChain Testnet)
- **token_amount**: Amount of tokens to distribute (positive number)

### Validation Rules

- Recipient addresses must be valid Ethereum addresses
  - Addresses should use lowercase format to avoid checksum validation issues
  - If using mixed-case addresses, they must follow the EIP-55 checksum standard
- Chain IDs must be numeric and in the list of supported chains
- Token amounts must be positive numbers

### Ethereum Address Format Note

Due to the strict EIP-55 checksum validation in ethers v6, it's recommended to use lowercase Ethereum addresses in CSV files. Mixed-case addresses must have a valid checksum or they will be rejected during validation.

Example of valid formats:
```
# Lowercase (recommended)
0x4f1684a28e33f42cdf50ab96e29a709e17249e63

# Valid EIP-55 checksum 
0x4f1684A28E33F42cdf50AB96e29a709e17249E63
```

### API Endpoints

#### Upload and Process CSV

```
POST /api/distributions/csv
```

Upload a CSV file for validation and processing. This endpoint is useful for validating the CSV before creating a token.

**Request:**
- `distributions_csv`: CSV file (multipart/form-data)

**Response:**
```json
{
  "message": "CSV file processed successfully",
  "filename": "distributions_csv-1234567890.csv",
  "totalRows": 3,
  "validRows": 2,
  "distributions": [...]
}
```

#### Create Token with CSV

```
POST /api/tokens
```

Create a token configuration with distributions from a CSV file.

**Request:**
- `token_name`: Token name
- `token_symbol`: Token symbol
- `decimals`: Token decimals
- `total_supply`: Token total supply
- `selected_chains`: JSON array of chain IDs
- `icon`: Token icon (optional)
- `distributions_csv`: CSV file with token distribution data 

## Latest Updates

### Test Suite Improvements

We have made significant improvements to the test suite stability and reliability:

1. **Fixed Unit Tests:**
   - **chainInfo.test.js**: Updated expectations to properly check for `undefined` rather than `null` values in certain scenarios
   - **fileUpload.test.js**: Fixed scope issues in `jest.mock()` implementations and properly mocked the `multer` and `fs` modules
   - **csvProcessing.test.js**: Removed duplicate function definitions and properly structured the mock implementations
   - **ContractService.test.js**: Improved mocking of `ethers.js` v6 components with proper provider, wallet, and contract factory implementations

2. **Test Framework Enhancements:**
   - Added comprehensive documentation on testing best practices
   - Implemented proper test isolation with `beforeEach` and `afterAll` hooks
   - Improved mock implementations for external dependencies
   - Added patterns for testing file operations without actual file system access

3. **Documentation Updates:**
   - Added detailed test status reporting
   - Documented common test issues and their solutions
   - Updated tech stack documentation with testing framework details
   - Added instructions for running specific tests

### API Improvements

1. **Error Handling:**
   - Enhanced error responses with more detailed information
   - Implemented proper status codes for different error conditions
   - Added validation for request parameters

2. **Deployment Process:**
   - Improved stability of contract deployment across chains
   - Enhanced logging of deployment status and errors
   - Fixed issues with ZetaChain ID detection

## Next Steps for Development

For the next developer taking over this project, here are the recommended next steps:

1. **Test Completion:**
   - Fix remaining issues in `ContractService.test.js` by properly mocking the `ethers.JsonRpcProvider`
   - Complete the implementation of `csvProcessing.test.js` with proper validation tests
   - Fix integration tests by resolving path issues with TypeScript imports

2. **TypeScript Migration:**
   - Continue the migration from JavaScript to TypeScript
   - Add proper type definitions for all functions and parameters
   - Update Jest configuration to handle TypeScript files properly

3. **API Enhancements:**
   - Implement additional endpoints for token metadata
   - Add pagination for token listing endpoints
   - Implement proper filtering and sorting for token lists

4. **Deployment Process:**
   - Add support for additional EVM chains
   - Implement token tracking across chains
   - Add monitoring for cross-chain transfers

5. **Documentation:**
   - Complete API documentation with OpenAPI/Swagger
   - Add sequence diagrams for key processes
   - Create developer onboarding documentation

6. **Security Enhancements:**
   - Implement proper JWT-based authentication
   - Add rate limiting for API endpoints
   - Improve input validation and sanitization

7. **Performance Optimization:**
   - Implement caching for blockchain data
   - Optimize database queries
   - Add background processing for long-running tasks

By addressing these areas, the next developer will continue to improve the stability, functionality, and maintainability of the Universal Token Launcher backend.

## Deployment Logging

This application includes robust deployment logging to track all aspects of token deployment and verification. These logs help troubleshoot issues and provide transparency about deployment operations.

### Deployment Log Structure

Deployment logs are stored in both:
1. The database (`deployment_logs` table)
2. Log files (`logs/deployment.log`)

### Types of Logged Events

- **deploy_attempt**: Tracks each attempt to deploy a contract
- **deploy**: Records the process of deploying contracts
- **verify**: Tracks contract verification attempts
- **connect**: Logs connection operations between tokens across chains
- **start**: Records the beginning of a deployment process
- **complete**: Marks the completion of a deployment process

### Deployment Attempt Tracking

The system now tracks:
- Number of deployment attempts
- Timestamps for each attempt
- Detailed error information
- Gas usage and transaction details

### Checking Deployment Status

To check the status of a deployment:

```bash
npm run check-deployment <tokenId>
```

This will display:
- Token configuration details
- Deployment status for each chain
- Number of attempts
- Error messages (if any)
- Transaction hashes and contract addresses
- Verification status

### Deployment Log Fields

Database fields for tracking deployments:
- `deployAttempts`: Number of deployment attempts
- `lastRetryAt`: Timestamp of the last retry attempt
- `lastError`: Details of the last error encountered
- `completedAt`: Timestamp when deployment completed

### Examples

Successful deployment log:
```
{
  "action": "deploy",
  "tokenId": "123",
  "chainId": "7001",
  "status": "success",
  "timestamp": "2023-04-01T12:34:56.789Z",
  "contractAddress": "0x1234...",
  "transactionHash": "0xabcd...",
  "attempts": 1,
  "message": "Successfully deployed TestToken on ZetaChain at address 0x1234..."
}
```

Failed deployment with retry:
```
{
  "action": "deploy_attempt",
  "tokenId": "123",
  "chainId": "7001",
  "attempt": 2,
  "isRetry": true,
  "contractType": "ZetaChainUniversalToken",
  "timestamp": "2023-04-01T12:35:56.789Z",
  "message": "Contract deployment retry #1 for TestToken (ZetaChainUniversalToken) on ZetaChain"
}
``` 