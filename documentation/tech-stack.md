# Tech Stack Recommendation Document

This document outlines the recommended technologies for building the Universal Token Launcher, updated based on implementation experience.

---

## 1. Frontend Stack

- **Framework:** 
  - **React.js with Create React App**  
    *Rationale:* React provides a component-based architecture that simplifies development and maintenance. Create React App offers a pre-configured environment to start developing immediately without complex setup.

- **Wallet Integration:** 
  - **wagmi (v2.x)** + **ethers.js (v6.x)**  
    *Rationale:* wagmi is a React hooks library for Ethereum that simplifies wallet connections, reading/writing to contracts, and managing transactions. It works best alongside ethers.js for specialized Ethereum operations.
  
  - **@rainbow-me/rainbowkit**  
    *Rationale:* Provides pre-built UI components for wallet connection that integrate well with wagmi.

- **UI Libraries & Styling:** 
  - **CSS Modules** or **styled-components**  
    *Rationale:* For clean, component-scoped styling that prevents CSS conflicts.

- **API Integration:**
  - **Fetch API** (native browser API)  
    *Rationale:* Built into modern browsers, reducing dependencies while providing robust HTTP request functionality.

- **Form Handling:**
  - **Native React forms with controlled components**  
    *Rationale:* Simplifies form state management without additional dependencies.

- **Network Switching Utility:** Implements automatic switching to and addition of the ZetaChain network using a custom utility function (located in frontend/src/utils/networkSwitchingUtility.js) to streamline network configuration and improve user experience.

---

## 2. Backend Stack

- **Language & Framework:** 
  - **Node.js with Express framework**  
    *Rationale:* Express offers a lightweight and flexible framework for building web applications and APIs. Node.js enables JavaScript-based backend development with asynchronous I/O operations.

- **API Structure:**
  - **Consistent endpoint naming and prefix strategy**
  - **Use a single prefix layer in router configuration**
    *Rationale:* Prevent duplicate prefixes that cause 404 errors. Either define the prefix in router creation OR in app inclusion, but not both.

- **CORS Configuration:**
  - **Explicit whitelist of allowed origins**
  - **Development mode with wildcard origin option**
    *Rationale:* Proper CORS configuration is critical for frontend-backend communication.

- **HTTP Client:**
  - **httpx for Python API clients**
    *Rationale:* Modern, async-compatible HTTP client for Python with better timeout handling and error management. Used for external API integrations.

---

## 3. Database Layer

- **Primary Database:** 
  - **PostgreSQL**  
    *Rationale:* A reliable, ACID-compliant relational database for storing token configurations, deployment logs, and transaction data.

- **ORM:**

  - **SQLAlchemy** (Python Backend)
    *Rationale:* The industry standard ORM for Python, offering both high-level and low-level database access patterns.

- **Migration Tool:**
  - **Alembic** (Python Backend)
    *Rationale:* Tightly integrated with SQLAlchemy for robust database migrations.

- **Database Persistence Best Practices:**
  - **Immediate Commits for Critical Data:**
    *Rationale:* Contract addresses and deployment state must be saved immediately after generation to prevent data loss.
  - **Multiple Persistence Points:**
    *Rationale:* Saving state changes at multiple points during complex operations ensures partial data is preserved even if later steps fail.
  - **Fresh Record Retrieval Before Updates:**
    *Rationale:* Query the database for fresh records before updating to avoid stale data issues.
  - **Explicit Field Setting:**
    *Rationale:* Always explicitly set all fields that need updating rather than relying on object references.
  - **Detailed Operation Logging:**
    *Rationale:* Log all database operations with clear success/failure indicators for easier troubleshooting.

---

## 4. Authentication & Authorization

- **Method:** 
  - **Web3 Wallet Authentication**  
    *Rationale:* Users authenticate by connecting their Web3 wallet with signature verification.

- **Implementation:**
  - **JWT tokens for session management**
  - **Optional authentication bypass for development**
    *Rationale:* For easier testing during development, ability to bypass wallet authentication with test wallet address.

---

## 5. API Design Considerations

- **Payload Format:**
  - **FormData for file uploads**
  - **JSON for standard requests**
  - **Consistent field naming across frontend/backend**
    *Rationale:* Field names in the frontend must match exactly what the backend expects (e.g., `token_name` vs `name`).

- **Error Handling:**
  - **Detailed error responses with status codes**
  - **Frontend error handling with specific error messages**
    *Rationale:* Proper error handling helps with debugging and provides better user experience.

- **Versioning Strategy:**
  - **API versioning in the URL path** (e.g., `/api/v1/tokens`)
  - **Ensure only one prefix layer is used** (avoid duplicate prefix issue)
    *Rationale:* Versioning allows for backward compatibility, but must be implemented consistently.

- **Enhanced Response Format:**
  - **Rich contract information for each chain**
    *Rationale:* Providing detailed per-chain information in the API response simplifies frontend implementation and improves user experience.
  - **Information included:**
    - Contract addresses
    - Verification status and details
    - Explorer and Blockscout URLs
    - Deployment status per chain
    - Direct links to verified contract source
  - **Consistent schema across endpoints**
    *Rationale:* Using the same chainInfo format in all token-related endpoints ensures consistent frontend handling.

- **ChainInfo Schema Documentation:**
  - **Basic Chain Properties:**
    - `name`: Full chain name (e.g., "ZetaChain Testnet")
    - `chainId`: Chain identifier as string (e.g., "7001")
    - `rpcUrl`: JSON-RPC endpoint URL for the chain
    - `explorerUrl`: Base URL for the standard block explorer 
    - `isZetaChain`: Boolean indicating whether this is a ZetaChain network
    - `color`: Hex color code for UI display (e.g., "#00B386")
    - `shortName`: Abbreviated name for UI display (e.g., "ZetaChain")
    - `isTestnet`: Boolean indicating whether this is a testnet network
    - `isSupported`: Boolean indicating whether this chain is fully supported
    - `blockscoutUrl`: Base URL for Blockscout explorer if available
  
  - **Contract Deployment Properties:**
    - `contractAddress`: Deployed token contract address on this chain
    - `deploymentStatus`: Current deployment status
      - "pending": Initial state before deployment begins
      - "deploying": Deployment in progress
      - "success": Successfully deployed
      - "failed": Deployment failed
      - "retrying": Retry attempt in progress
    
  - **Verification Properties:**
    - `verificationStatus`: Status of contract verification
      - "pending": Not yet verified
      - "processing": Verification in progress
      - "verified": Successfully verified
      - "failed": Verification failed
    - `verificationError`: Error message if verification failed
    - `verifiedUrl`: Direct URL to verified contract source code
    
  - **Explorer URLs:**
    - `explorerUrl`: Full URL to view the contract on the standard explorer
    - `blockscoutUrl`: Full URL to view the contract on Blockscout (if applicable)
    
  *Rationale:* Comprehensive schema documentation ensures consistent handling across all parts of the application.

---

## 6. Blockchain Integration

- **Network Configuration:**
  - **Explicit chain configurations for all supported networks**
  - **Helper functions for network switching and RPC fallbacks**
    *Rationale:* Having full chain configuration details, including proper RPC endpoints, improves reliability.

- **Transaction Handling:**
  - **Use wagmi hooks for transactions** (`useSendTransaction`, `useContractWrite`)
  - **Proper error handling and confirmation tracking**
    *Rationale:* wagmi hooks manage transaction states and provide better error information.

- **Fee Payment:**
  - **Clear fee structure and verification**
  - **Explicit BigInt handling for value/fee parameters**
    *Rationale:* Smart contract interactions require proper value formatting to avoid errors.

- **Smart Contract Integration:**
  - **Bytecode and ABI Management:**
    *Rationale:* Properly structured bytecode and ABI files are critical for contract deployments.
    - Store contract bytecode and ABIs in separate JS files with proper exports
    - Use structured comments for better maintainability
    - Ensure the bytecode string is properly formatted as valid JavaScript
    - Always properly close multiline comment blocks with appropriate syntax

- **Blockchain Explorer Integration:**
  - **Blockscout API Integration:**
    *Rationale:* Retrieving on-chain data directly allows real-time token information.
    - Integration with Blockscout API for user token balances
    - Token information retrieval from ZetaChain through Blockscout
    - Cross-referencing on-chain data with application database
    - Support for token holder queries and balance lookups

---

## 7. Deployment Workflow

- **Frontend Deployment:**
  - **Vercel or Netlify for static hosting**
  - **Environment variables for API endpoints and network configuration**

- **Backend Deployment:**
  - **Docker containers for consistent environments**
  - **Environment variable management for sensitive configuration**
  - **Database migration strategy during deployment**

---

## 8. Implementation Gotchas and Solutions

- **CORS Issues:**
  - Configure CORS middleware in Express with appropriate origins
  - For development, allow wildcard (`*`) origin with explicit configuration

- **API Endpoint Conflicts:**
  - Avoid duplicating route prefixes in both router definition and router inclusion
  - Use consistent naming scheme across the codebase

- **Transaction Handling:**
  - Don't convert BigInt values to strings when using wagmi hooks
  - Handle transaction errors explicitly and display meaningful messages

- **Authentication Flow:**
  - Include development mode for bypassing wallet authentication
  - Implement proper JWT storage and header inclusion

- **File Upload Handling:**
  - Use FormData correctly without setting Content-Type header
  - Process multipart form data correctly on the backend

- **Bytecode Format Issues:**
  - Always ensure bytecode strings are valid JavaScript and properly escaped
  - Use multiline strings with proper syntax for long bytecode strings
  - Close all comment blocks properly, especially multiline comments
  - Test contract deployment with minimal tokens before scaling to complex deployments

- **Database Interactions:**
  - Use Sequelize transactions for multi-step operations
  - Properly handle BigInt values when storing/retrieving from database
  - Define proper indexes for frequently queried fields

- **Contract Deployment:**
  - Always deploy ZetaChain contracts first, then EVM chains
  - Implement proper error handling for each deployment step
  - Store deployment logs for each chain separately
  - Use a background process for long-running deployments

- **CSV Processing:**
  - Validate CSV input format before processing
  - Use proper CSV parser libraries (like csv-parser)
  - Handle large CSV files asynchronously

---

## 9. Recommended Project Structure

### Frontend Structure
```
frontend/
├── public/
│   └── assets/             # Static assets like images
├── src/
│   ├── components/         # React components
│   │   ├── components/         # React components
│   │   ├── hooks/              # Custom React hooks
│   │   ├── services/           # API services
│   │   │   └── apiService.js   # API integration
│   │   ├── styles/             # CSS/SCSS files
│   │   ├── utils/              # Utility functions
│   │   ├── App.js              # Main app component
│   │   └── index.js            # Entry point
│   └── package.json            # Dependencies
```

This updated tech stack recommendation provides guidance based on real implementation experience with the Universal Token Launcher application, including lessons learned from debugging bytecode-related issues.

---

## 10. Recent Issues & Resolutions

### Bytecode File Syntax Issues

The application experienced critical errors related to the syntax in the `bytecode.js` file:

**Issue:** The JavaScript file containing contract bytecode and ABIs had syntax errors:
- Unclosed multiline comment blocks leading to "Invalid or unexpected token" errors
- Malformed string literals in the bytecode

**Resolution:**
- Properly formatted the bytecode string as valid JavaScript
- Ensured all comment blocks were properly closed with `*/`
- Maintained consistent code structure and documentation
- Added better comments explaining the purpose of each section

**Best Practices:**
- Always validate JavaScript syntax in critical files before deployment
- Use consistent formatting for large bytecode strings
- Document the purpose and structure of contract-related constants
- Consider using external tools to generate and validate bytecode files

## Smart Contract Development

### Contract Frameworks & Libraries

1. **Hardhat**
   - **Status**: Implemented
   - **Purpose**: Smart contract development, testing, and deployment framework
   - **Details**: 
     - Project configured in the `smart-contracts/` directory
     - Custom scripts for deployment and contract connection
     - Network configurations for ZetaChain, ZetaChain Testnet, Sepolia, and others
     - Customized tasks for common operations

2. **Solidity**
   - **Version**: 0.8.7
   - **Status**: Implemented
   - **Purpose**: Smart contract programming language
   - **Details**:
     - Used for developing UniversalToken contracts
     - Compatible with ZetaChain and other EVM chains

3. **TypeScript**
   - **Status**: Implemented
   - **Purpose**: Deployment scripts and testing
   - **Details**:
     - Type-safe interaction with smart contracts
     - Detailed deployment and connection scripts
     - Network-specific configuration management

4. **Ethers.js**
   - **Version**: 6.x
   - **Status**: Implemented
   - **Purpose**: Ethereum interaction library
   - **Details**:
     - Contract deployment and interaction
     - Transaction management
     - ABI handling

### Contract Architecture

1. **Base UniversalToken**
   - **Status**: Implemented
   - **Path**: `smart-contracts/contracts/base/UniversalToken.sol`
   - **Features**:
     - ERC20 token standard implementation
     - Custom decimals handling
     - Controlled minting and burning
     - Owner-based administration

2. **ZetaChainUniversalToken**
   - **Status**: Implemented
   - **Path**: `smart-contracts/contracts/ZetaChainUniversalToken.sol` 
   - **Deployed**: ZetaChain Testnet (`0x51d5D00dfB9e1f4D60BBD6eda288F44Fb3158E16`)
   - **Features**:
     - Inherits from base UniversalToken
     - Manages connections to other chain tokens
     - Processes incoming cross-chain transfers
     - Initiates outgoing cross-chain transfers

3. **EVMUniversalToken**
   - **Status**: Implemented
   - **Path**: `smart-contracts/contracts/EVMUniversalToken.sol`
   - **Deployed**: Sepolia Testnet (`0x0b3D12246660b41f982f07CdCd27536a79a16296`)
   - **Features**:
     - Inherits from base UniversalToken
     - Connects to ZetaChain token
     - Initiates cross-chain transfers to ZetaChain
     - Burns tokens for outgoing transfers

## Blockchain Network Integration

### Primary Networks

1. **ZetaChain Testnet**
   - **Status**: Integrated
   - **Chain ID**: 7001
   - **RPC URL**: `https://zetachain-athens-evm.blockpi.network/v1/rpc/public`
   - **Token**: ZetaChainUniversalToken deployed and functional
   - **Features**:
     - Cross-chain communication hub
     - Central registry for connected chains
     - Manages token minting for incoming transfers

2. **Sepolia Testnet**
   - **Status**: Integrated
   - **Chain ID**: 11155111
   - **RPC URL**: `https://ethereum-sepolia.publicnode.com`
   - **Token**: EVMUniversalToken deployed and functional
   - **Features**:
     - Connected to ZetaChain token
     - Handles outgoing transfers to ZetaChain
     - Burns tokens for cross-chain transfers

### Planned Network Integrations

3. **ZetaChain Mainnet**
   - **Status**: Planned
   - **Chain ID**: 7000
   - **Expected Integration**: Post-testing phase
   - **Requirements**:
     - Security audit completion
     - Testnet validation
     - Gas optimization

4. **Ethereum Mainnet**
   - **Status**: Planned
   - **Chain ID**: 1
   - **Expected Integration**: Post-testing phase
   - **Requirements**:
     - Gas optimization
     - Security audit
     - ZetaChain mainnet integration

5. **Other EVM Compatible Chains**
   - **Status**: Planned
   - **Candidates**: 
     - Polygon (137)
     - BNB Chain (56)
     - Avalanche (43114)
   - **Implementation Strategy**:
     - Extend same EVMUniversalToken contract
     - Modify deployment scripts for network specifics
     - Test cross-chain functionality with each

## Development Tools

### Contract Development & Testing

1. **Hardhat Scripts**
   - **Status**: Implemented
   - **Location**: `smart-contracts/scripts/`
   - **Scripts**:
     - `deploy.ts`: Automatic network detection and contract deployment
     - `connect-tokens.ts`: Connect tokens across chains
     - `simulate-transfer.ts`: Test cross-chain transfers
   - **Configuration**: Customized in `hardhat.config.ts`

2. **NPM Scripts**
   - **Status**: Implemented
   - **Location**: `smart-contracts/package.json`
   - **Scripts**:
     - `npm run deploy-zetachain-testnet`: Deploy to ZetaChain Testnet
     - `npm run deploy-sepolia`: Deploy to Sepolia
     - `npm run connect-tokens-testnet`: Connect tokens from ZetaChain side
     - `npm run connect-tokens-sepolia`: Connect tokens from Sepolia side
     - `npm run simulate-transfer-sepolia`: Simulate transfer from Sepolia
     - `npm run simulate-transfer-testnet`: Simulate ZetaChain relay

3. **Environment Configuration**
   - **Status**: Implemented
   - **Location**: `smart-contracts/.env`
   - **Variables**:
     - `PRIVATE_KEY`: Deployer wallet private key (with 0x prefix)
     - `TESTNET_PRIVATE_KEY`: Specific key for testnet deployment
     - Various API keys for block explorers

## 15. Backend Implementation Details

### 15.1 Primary Dependencies (Node.js Version)

1. **Express.js (v4.18.x)** 
   - **Status**: Implemented
   - **Purpose**: Web server framework
   - **Details**:
     - Middleware setup for CORS, JSON parsing, etc.
     - Router-based API organization

2. **Sequelize (v6.37.x)**
   - **Status**: Implemented
   - **Purpose**: ORM for database interaction
   - **Details**:
     - Model definitions for token configuration, deployment logs, etc.
     - Migration support for database schema management

3. **ethers.js (v6.x)**
   - **Status**: Implemented
   - **Purpose**: Ethereum interaction library
   - **Details**:
     - Contract deployment and interaction
     - Transaction management
     - Provider pooling for multiple chains

4. **multer**
   - **Status**: Implemented
   - **Purpose**: File upload handling
   - **Details**:
     - Processing multipart form data
     - Storage configuration for token icons and CSVs

5. **csv-parser**
   - **Status**: Implemented
   - **Purpose**: CSV file processing
   - **Details**:
     - Parsing CSV files for token distribution data

### 15.2 API Endpoints

1. **Token Configuration**
   - **Status**: Implemented
   - **Endpoint**: `POST /api/tokens`
   - **Details**:
     - Accepts token configuration data and files
     - Creates database records for token and deployment logs
   
2. **Token Deployment**
   - **Status**: Implemented
   - **Endpoint**: `POST /api/tokens/:id/deploy`
   - **Details**:
     - Verifies fee payment transaction
     - Initiates contract deployment process
     - Updates deployment status

3. **Token Status**
   - **Status**: Implemented
   - **Endpoint**: `GET /api/tokens/:id`
   - **Details**:
     - Returns token configuration details
     - Includes deployment status
   
4. **Deployment Logs**
   - **Status**: Implemented
   - **Endpoint**: `GET /api/tokens/:id/logs`
   - **Details**:
     - Returns deployment logs for each chain
     - Includes contract addresses and transaction hashes

### 15.3 Key Components

1. **ContractService**
   - **Status**: Implemented
   - **Purpose**: Smart contract deployment and interaction
   - **Key Features**:
     - Dynamic provider pooling for multiple chains
     - Chain-specific contract deployment
     - Fee transaction verification
     - Cross-chain contract connection

2. **TokenService**
   - **Status**: Implemented
   - **Purpose**: Token configuration and deployment management
   - **Key Features**:
     - Token configuration creation and validation
     - Deployment process orchestration
     - Status tracking and reporting
     - Error handling and recovery

3. **File Upload Utilities**
   - **Status**: Implemented
   - **Purpose**: Handle file uploads (icons, CSVs)
   - **Key Features**:
     - Storage configuration
     - File type validation
     - CSV parsing functionality
     - URL generation for stored files

4. **Authentication Middleware**
   - **Status**: Basic Implementation
   - **Purpose**: Verify user identity via wallet address
   - **Key Features**:
     - Extract wallet address from request
     - Development mode for testing
     - Preparation for JWT integration

### 15.4 Database Models

1. **TokenConfiguration**
   - **Status**: Implemented
   - **Purpose**: Store token configuration details
   - **Key Fields**:
     - Token name, symbol, decimals, total supply
     - Creator wallet address
     - Selected chains for deployment
     - Deployment status

2. **DeploymentLog**
   - **Status**: Implemented
   - **Purpose**: Track deployment status per chain
   - **Key Fields**:
     - Chain name and ID
     - Contract address
     - Transaction hash
     - Status and error messages

3. **TokenDistribution**
   - **Status**: Implemented
   - **Purpose**: Track token distribution records
   - **Key Fields**:
     - Recipient address
     - Chain ID
     - Token amount
     - Status and transaction hash

These implementation details provide a clear picture of the current state of the backend system, highlighting the core components and their interactions.

## Testing Framework and Dependencies

### 1. Testing Stack

1. **Jest**
   - **Status**: Implemented
   - **Purpose**: Testing framework for unit and integration tests
   - **Details**:
     - Configuration in `jest.config.js`
     - Support for JavaScript and TypeScript testing
     - Mocking capabilities for external dependencies

2. **Supertest**
   - **Status**: Implemented
   - **Purpose**: HTTP assertion library for API testing
   - **Details**:
     - Integration with Express.js endpoints
     - Request simulation and response validation

3. **Mock Implementations**
   - **Status**: Implemented
   - **Purpose**: Isolate code units for testing
   - **Details**:
     - Module mocking via `jest.mock()`
     - Function mocking with `jest.fn()`
     - Mocked return values with `mockReturnValue` and `mockResolvedValue`

### 2. Best Practices

#### 2.1 Unit Test Structure

1. **File Organization**
   - Test files should mirror the source structure
   - Naming convention: `[filename].test.js`
   - Tests should be organized in logical `describe` and `it` blocks

2. **Test Isolation**
   - Each test should run independently
   - Use `beforeEach` and `afterEach` for setup/teardown
   - Reset mocks between tests with `jest.clearAllMocks()`

3. **Mock Placement**
   - Always define mocks BEFORE importing tested modules
   - Use factory functions for complex mock implementations
   - Ensure variables used in factory functions are in scope

#### 2.2 Mocking External Dependencies

1. **File System Operations**
   ```javascript
   // Mock fs module while preserving original functionality
   jest.mock('fs', () => ({
     ...jest.requireActual('fs'),
     existsSync: jest.fn().mockReturnValue(true),
     createReadStream: jest.fn().mockImplementation(() => {
       const { Readable } = require('stream');
       const stream = new Readable();
       stream.push('test data');
       stream.push(null);
       return stream;
     })
   }));
   ```

2. **Database Connections**
   ```javascript
   // Mock Sequelize models
   jest.mock('../../../models', () => ({
     TokenConfiguration: {
       findByPk: jest.fn().mockResolvedValue({
         id: 1,
         token_name: 'Test Token',
         // other properties
       }),
       create: jest.fn().mockResolvedValue({ id: 1 })
     },
     DeploymentLog: {
       findAll: jest.fn().mockResolvedValue([]),
       create: jest.fn().mockResolvedValue({})
     }
   }));
   ```

3. **HTTP Requests**
   ```javascript
   // Mock fetch or axios
   jest.mock('node-fetch', () => 
     jest.fn().mockResolvedValue({
       ok: true,
       json: jest.fn().mockResolvedValue({ result: 'success' })
     })
   );
   ```

#### 2.3 Mocking ethers.js v6

Ethers.js v6 requires special consideration due to significant API changes from v5:

1. **Provider Mocking**
   ```javascript
   jest.mock('ethers', () => ({
     JsonRpcProvider: jest.fn().mockImplementation(() => ({
       getNetwork: jest.fn().mockResolvedValue({ chainId: 1 }),
       getSigner: jest.fn().mockReturnValue({
         address: '0x1234567890123456789012345678901234567890',
         signMessage: jest.fn().mockResolvedValue('0xsignature'),
         connect: jest.fn().mockReturnThis()
       }),
       getTransaction: jest.fn().mockResolvedValue({
         hash: '0x123',
         to: '0x123',
         value: BigInt('1000000000000000000')
       }),
       getTransactionReceipt: jest.fn().mockResolvedValue({
         status: 1,
         hash: '0x123'
       })
     })),
     
     Wallet: jest.fn().mockImplementation(() => ({
       connect: jest.fn().mockReturnThis(),
       provider: { getNetwork: jest.fn().mockResolvedValue({ chainId: 1 }) },
       address: '0x1234567890123456789012345678901234567890',
       signMessage: jest.fn().mockResolvedValue('0xsignature')
     })),
     
     Contract: jest.fn().mockImplementation(() => ({
       // Mock contract methods
       balanceOf: jest.fn().mockResolvedValue(BigInt('1000000000000000000')),
       transfer: jest.fn().mockResolvedValue({
         hash: '0x123',
         wait: jest.fn().mockResolvedValue({})
       }),
       // For events
       filters: {
         Transfer: jest.fn().mockReturnValue({})
       },
       queryFilter: jest.fn().mockResolvedValue([])
     })),
     
     ContractFactory: jest.fn().mockImplementation(() => ({
       deploy: jest.fn().mockResolvedValue({
         target: '0x1234567890123456789012345678901234567890',
         deploymentTransaction: jest.fn().mockReturnValue({
           hash: '0x123',
           wait: jest.fn().mockResolvedValue({})
         })
       })
     })),
     
     // Important: Use BigInt rather than BN for v6
     parseUnits: jest.fn().mockImplementation((value) => BigInt(value) * BigInt(10**18)),
     
     // For address validation
     getAddress: jest.fn().mockImplementation((address) => {
       if (typeof address !== 'string' || !address.match(/^0x[0-9a-fA-F]{40}$/)) {
         throw new Error('Invalid address');
       }
       return address;
     })
   }));
   ```

2. **Testing Contract Interactions**
   ```javascript
   it('should deploy a token contract', async () => {
     // Setup contract factory mock implementation
     const deployMock = ethers.ContractFactory.mock.results[0].value.deploy;
     deployMock.mockResolvedValue({
       target: '0x1234567890123456789012345678901234567890',
       deploymentTransaction: jest.fn().mockReturnValue({
         hash: '0x123',
         wait: jest.fn().mockResolvedValue({})
       })
     });
     
     // Call the method under test
     const result = await contractService.deployToken('Test', 'TST', 18, '1000');
     
     // Verify the contract factory was created with correct params
     expect(ethers.ContractFactory).toHaveBeenCalledWith(
       expect.any(Array), // ABI
       expect.stringContaining('0x'), // Bytecode
       expect.anything() // Signer
     );
     
     // Verify deploy was called with correct args
     expect(deployMock).toHaveBeenCalledWith(
       'Test', 'TST', 18, expect.any(BigInt)
     );
     
     // Verify result
     expect(result.contractAddress).toBe('0x1234567890123456789012345678901234567890');
     expect(result.transactionHash).toBe('0x123');
   });
   ```

3. **BigInt Handling**
   - Ethers.js v6 uses native JavaScript BigInt instead of BN.js
   - Always compare BigInt values with other BigInt values
   - Convert string amounts to BigInt when needed
   ```javascript
   // Converting amounts
   const amount = BigInt('1000000000000000000'); // 1 ETH
   
   // Adding
   const newAmount = amount + BigInt(1);
   
   // Testing
   expect(someFunction).toHaveBeenCalledWith(BigInt('1000000000000000000'));
   ```

### 3. Testing Challenges

#### 3.1 Common Testing Issues

1. **Scope Issues in Jest Mocks**
   - Problem: Referencing undefined variables in mock factory functions
   - Solution: Declare variables before the mock and ensure they're in scope

2. **Asynchronous Testing**
   - Problem: Tests not properly waiting for async operations
   - Solution: Use `async/await` with every async test and proper error handling

3. **Module Import Order**
   - Problem: Tested modules being imported before mocks are defined
   - Solution: Always mock dependencies before importing modules under test

4. **Manual Mock Management**
   - Problem: Mocks not being reset between tests
   - Solution: Use `jest.clearAllMocks()` in `beforeEach`

#### 3.2 Environment-Specific Testing

1. **Testing with Environment Variables**
   ```javascript
   // In beforeAll
   const originalEnv = process.env.NODE_ENV;
   
   // Before each test
   process.env.NODE_ENV = 'test';
   
   // After all tests
   afterAll(() => {
     process.env.NODE_ENV = originalEnv;
   });
   ```

2. **Testing File Operations**
   - Create temporary directories in `beforeAll`
   - Use unique filenames based on test run
   - Clean up in `afterAll`
   ```javascript
   const testDir = path.join(__dirname, 'test-tmp');
   
   beforeAll(() => {
     if (!fs.existsSync(testDir)) {
       fs.mkdirSync(testDir, { recursive: true });
     }
   });
   
   afterAll(() => {
     if (fs.existsSync(testDir)) {
       fs.rmSync(testDir, { recursive: true, force: true });
     }
   });
   ```

### 4. Test Coverage Targets

- Unit Tests: Target 80%+ coverage of utilities and services
- Integration Tests: Cover all API endpoints and main workflows
- Special focus areas:
  - Contract deployment logic
  - Blockchain transaction handling  
  - Error recovery mechanisms
  - File processing utilities

### 5. Testing Progress

We have made significant progress in testing the backend components:

1. **Core Utilities**
   - Chain information utilities fully tested
   - File upload utilities partially tested
   - CSV processing utilities partially tested

2. **Services**
   - TokenService fully tested with mocked dependencies
   - ContractService tests in progress with challenges in mocking ethers.js v6

3. **Next Testing Priorities**
   - Complete API endpoint integration tests
   - Improve ContractService test reliability
   - Ensure cross-chain functionality is properly tested

## 16. Python Backend Implementation

### 16.1 Primary Dependencies

1. **FastAPI (v0.104.x)**
   - **Status**: Implemented
   - **Purpose**: Modern Python web framework
   - **Details**:
     - Async request handling
     - Automatic API documentation
     - Type-based request validation

2. **SQLAlchemy (v2.0.x)**
   - **Status**: Implemented
   - **Purpose**: SQL toolkit and ORM
   - **Details**:
     - Data models for token deployments
     - Database connection management
     - Query building and execution

3. **Pydantic (v2.4.x)**
   - **Status**: Implemented
   - **Purpose**: Data validation and settings
   - **Details**:
     - Request and response models
     - Configuration management
     - Type validation and conversion

4. **Web3.py (v6.11.x)**
   - **Status**: Implemented
   - **Purpose**: Ethereum interaction library
   - **Details**:
     - Contract deployment and interaction
     - Transaction management
     - Provider connections

5. **Httpx (v0.25.x)**
   - **Status**: Implemented
   - **Purpose**: Modern async HTTP client
   - **Details**:
     - Blockscout API integration
     - Token and holder data retrieval
     - Async request handling

### 16.2 API Endpoints

1. **Token Deployment**
   - **Status**: Implemented
   - **Endpoint**: `POST /api/deploy`
   - **Details**:
     - Accepts token configuration data
     - Creates database records
     - Handles deployment across chains

2. **Token Information**
   - **Status**: Implemented
   - **Endpoint**: `GET /api/token/{identifier}`
   - **Details**:
     - Retrieves token details by ID or contract address
     - Returns comprehensive deployment information
     - Includes explorer URLs and verification status

3. **Contract Verification**
   - **Status**: Implemented
   - **Endpoint**: `POST /api/verify`
   - **Details**:
     - Verifies deployed contracts on block explorers
     - Tracks verification status
     - Returns explorer URLs for verified contracts

4. **User Token Information**
   - **Status**: Implemented
   - **Endpoint**: `GET /api/users/{address}`
   - **Details**:
     - Retrieves tokens owned by a wallet address
     - Combines on-chain data with application database
     - Returns token balances across all chains
     - Indicates deployer status for each token
     - **Enhanced (May 2025)**: Now includes tokens where the user is the deployer, regardless of balance, ensuring token contracts remain visible to their owners

5. **Chain Information**
   - **Status**: Implemented
   - **Endpoint**: `GET /api/chains`
   - **Details**:
     - Lists supported blockchain networks
     - Provides RPC URLs and explorer links
     - Offers filtering by testnet/mainnet

### 16.3 Key Components

1. **BlockscoutService**
   - **Status**: Implemented
   - **Purpose**: Interact with Blockscout API
   - **Key Features**:
     - Retrieves user token balances from ZetaChain
     - Gets token information and holder data
     - Handles API response parsing and error management

2. **TokenService**
   - **Status**: Implemented
   - **Purpose**: Token management and lookup
   - **Key Features**:
     - Token lookup by ID or contract address
     - Enhanced token data with explorer URLs
     - Chain information integration

3. **DeploymentService**
   - **Status**: Implemented
   - **Purpose**: Smart contract deployment
   - **Key Features**:
     - Multi-chain contract deployment
     - Status tracking and error handling
     - Token connection across chains

4. **VerificationService**
   - **Status**: Implemented
   - **Purpose**: Contract verification
   - **Key Features**:
     - Explorer API integration
     - Verification status tracking
     - Explorer URL generation

### 16.4 Database Models

1. **TokenModel**
   - **Status**: Implemented
   - **Purpose**: Store token deployment information
   - **Key Fields**:
     - Token name, symbol, decimals, total supply
     - ZetaChain contract address
     - Deployer address
     - Connected chains (JSON)
     - Deployment status and error messages
