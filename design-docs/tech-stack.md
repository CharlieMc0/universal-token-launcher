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

---

## 3. Database Layer

- **Primary Database:** 
  - **PostgreSQL**  
    *Rationale:* A reliable, ACID-compliant relational database for storing token configurations, deployment logs, and transaction data.

- **ORM:**
  - **Sequelize**
    *Rationale:* Provides a Node.js interface for database operations with support for PostgreSQL.

- **Migration Tool:**
  - **Sequelize CLI**
    *Rationale:* Manages database schema changes and version control alongside Sequelize.

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

### Backend Structure
```
backend/
├── src/
│   ├── constants/           # Constants including bytecode and ABIs
│   │   ├── bytecode.js      # Contract bytecode and ABIs
│   ├── api/                 # API routes
│   │   ├── authRoutes.js
│   │   ├── tokenRoutes.js
│   │   └── ...
│   ├── config/              # Configuration
│   │   ├── constants.js     # Global constants
│   │   └── ...
│   ├── controllers/         # Request handlers
│   │   ├── tokenController.js
│   │   └── ...
│   ├── models/              # Database models (Sequelize)
│   │   ├── Token.js
│   │   └── ...
│   ├── services/            # Business logic
│   │   ├── contractService.js
│   │   └── ...
│   ├── server.js            # Entry point
│   └── tests/               # Test files
├── .env                     # Environment variables
└── package.json             # Dependencies
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
