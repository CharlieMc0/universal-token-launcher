# Backend Structure Document

This document outlines the foundational backend system for the Universal Token Launcher. It details the database architecture, authentication and authorization, file storage, API design, data security, and strategies for scalability and modularity.

---

## 1. Database Architecture

We will use **PostgreSQL** as our primary relational database. Data is normalized to avoid redundancy, with separate tables for token configurations and deployment logs. Key tables include:

### 1.1. Users (Optional)
*Purpose:* Store minimal user metadata if needed (wallet addresses).
- **Fields:**
  - `wallet_address` (TEXT, PRIMARY KEY, UNIQUE) – The user's wallet address.
  - `created_at` (TIMESTAMP WITH TIME ZONE, default NOW())
  - `updated_at` (TIMESTAMP WITH TIME ZONE)
- **Notes:** 
  - This table is optional since authentication is via wallet connection.
  - Use this table to store user preferences or history if required later.

### 1.2. TokenConfigurations
*Purpose:* Record each token deployment configuration initiated by a token creator.
- **Fields:**
  - `id` (SERIAL, PRIMARY KEY)
  - `creator_wallet` (TEXT, NOT NULL) – The wallet address of the token creator.
  - `token_name` (VARCHAR, NOT NULL)
  - `token_symbol` (VARCHAR, NOT NULL)
  - `icon_url` (TEXT) – URL or file path for the token's icon.
  - `decimals` (INTEGER, NOT NULL, default 18)
  - `total_supply` (NUMERIC, NOT NULL)
  - `selected_chains` (JSONB) – Array of selected chain IDs for deployment.
  - `fee_paid_tx` (VARCHAR) – Transaction hash of the fee payment.
  - `deployment_status` (VARCHAR) – e.g., 'pending', 'completed', 'failed'.
  - `created_at` (TIMESTAMP WITH TIME ZONE, default NOW())
  - `updated_at` (TIMESTAMP WITH TIME ZONE)
- **Indexes & Constraints:**
  - Index on `creator_wallet` for quick lookup.
  - Constraint on `deployment_status` values (if using ENUM type, or check constraint).

### 1.3. DeploymentLogs
*Purpose:* Log the status of contract deployments on each selected chain.
- **Fields:**
  - `id` (SERIAL, PRIMARY KEY)
  - `token_config_id` (INTEGER, NOT NULL) – Foreign key referencing `TokenConfigurations(id)`.
  - `chain_name` (VARCHAR, NOT NULL) – E.g., 'Ethereum', 'Polygon'.
  - `chain_id` (VARCHAR, NOT NULL) – Chain identifier (e.g., '1' for Ethereum).
  - `contract_address` (TEXT) – Deployed contract address.
  - `status` (VARCHAR) – e.g., 'pending', 'success', 'failure'.
  - `transaction_hash` (VARCHAR) – Blockchain transaction hash for deployment.
  - `error_message` (TEXT) – Detailed error if deployment fails.
  - `verification_status` (VARCHAR) – e.g., 'pending', 'processing', 'verified', 'failed'.
  - `verification_error` (TEXT) – Detailed error if verification fails.
  - `verified_url` (TEXT) – URL to the verified contract on the explorer.
  - `created_at` (TIMESTAMP WITH TIME ZONE, default NOW())
  - `updated_at` (TIMESTAMP WITH TIME ZONE)
- **Indexes & Constraints:**
  - Foreign key on `token_config_id`.
  - Index on `chain_name` for filtering by network.

---

## 2. Authentication & Authorization

### 2.1. Web3 Wallet Authentication
- **Method:**  
  - Use Web3 wallet connection (e.g., MetaMask) via ethers.js.
  - Rely on signature-based verification. When a user connects, prompt them to sign a nonce message.
- **Session Management:**  
  - Generate a JSON Web Token (JWT) upon successful wallet signature verification.
  - **JWT Payload:** Include `wallet_address` and an expiration timestamp.
  - **Storage:** JWTs are stored in secure HTTP-only cookies or in-memory on the client.
- **Roles & Permissions:**
  - No explicit role table is necessary.
  - **Token Creator:** Anyone who initiates a token deployment becomes a creator.
  - Endpoints that modify deployment data require a valid JWT containing the correct wallet address.

---

## 3. Storage Buckets / File Handling

### 3.1. File Types
- **Images:** Token icons uploaded by token creators.

### 3.2. Storage Provider
- **Recommendation:** AWS S3 (or an alternative like Supabase Storage)
  - **Rationale:** S3 is reliable, scalable, and widely supported.
  
### 3.3. Folder Structure & Access Control
- **Folders:**
  - `/uploads/icons/` – For token icon images (public read access, private write access).
- **Access Rules:**
  - Use S3 bucket policies to ensure that:
    - Only authenticated requests (with proper credentials) can upload files.
    - Files in the icons folder are publicly readable (for display).
  - Consider using signed URLs for temporary access to files.

---

## 4. API Design Layer

### 4.1. Protocol
- **REST API** built with Express.js.

### 4.2. Main Endpoints

#### 4.2.1. Token Configuration & Deployment
- **POST /api/deploy**
  - **Description:** Deploy token contracts across multiple chains.
  - **Request Body:** JSON payload containing:
    - `token_name` (string, required)
    - `token_symbol` (string, required)
    - `decimals` (integer, default 18)
    - `total_supply` (string, required) - Total supply in wei
    - `selected_chains` (array of strings, required) - Chain IDs
    - `deployer_address` (string, required) - Address to receive ownership
    - `allocations` (array, optional) - Initial token distributions
  - **Response:** Token deployment ID and initial status.
  
- **GET /api/token/{identifier}**
  - **Description:** Retrieve detailed token information by ID or contract address.
  - **Path Parameters:**
    - `identifier` - Either a numeric ID or an Ethereum contract address
  - **Response:** Comprehensive token details including:
    - Basic token information (name, symbol, decimals, total supply)
    - ZetaChain contract information with explorer URLs
    - Connected chains with contract addresses, deployment status, and explorer links
    - Verification status for each deployed contract
    - Links to block explorers for each contract

- **POST /api/verify**
  - **Description:** Verify a deployed contract on a block explorer.
  - **Request Body:** JSON payload with:
    - `contract_address` (string, required) - Address of the deployed contract
    - `chain_id` (string, required) - Chain ID where contract is deployed
    - `contract_type` (string, required) - Type of contract ('zetachain' or 'evm')
  - **Response:** Verification status and details.

- **GET /api/users/{address}**
  - **Description:** Retrieve tokens owned by a specific wallet address.
  - **Path Parameters:**
    - `address` - Wallet address to query
  - **Response:** List of tokens owned by the user with:
    - Token details (name, symbol, decimals)
    - Deployer status (whether the user is the token deployer)
    - Balance information for each chain where the token is deployed
    - Explorer URLs for each token contract

#### 4.2.2. Chain Information
- **GET /api/chains**
  - **Description:** Get a list of supported blockchain networks.
  - **Query Parameters:** 
    - `testnet_only` (boolean, optional) - Filter for testnet chains only
    - `mainnet_only` (boolean, optional) - Filter for mainnet chains only
  - **Response:** Array of chain information with IDs, names, and availability status.

### 4.3. Error & Validation Handling
- **Standardized Error Format:**  
  - Return HTTP status codes with JSON payloads containing an error code and message.
- **Validation:**  
  - Use Pydantic models for input validation.
  - Return 400 Bad Request for invalid inputs, 404 Not Found for missing resources, and 500 for unexpected errors.

### 4.4. Enhanced Response Format for Tokens

The token API endpoints return enhanced information for each supported chain:

```json
{
  "success": true,
  "token": {
    "id": 1,
    "token_name": "My Token",
    "token_symbol": "MTK",
    "decimals": 18,
    "total_supply": "1000000000000000000000000",
    "zc_contract_address": "0x1234...",
    "deployer_address": "0x4f1684...",
    "deployment_status": "completed",
    "error_message": null,
    "connected_chains_json": {
      "11155111": {
        "status": "completed",
        "contract_address": "0x5678...",
        "transaction_hash": "0xabcd...",
        "verification_status": "verified",
        "chain_id": "11155111",
        "chain_name": "Sepolia Testnet",
        "explorer_url": "https://sepolia.etherscan.io",
        "blockscout_url": null,
        "contract_url": "https://sepolia.etherscan.io/address/0x5678..."
      }
    },
    "zeta_chain_info": {
      "chain_id": "7001",
      "contract_address": "0x1234...",
      "status": "completed",
      "explorer_url": "https://explorer.athens.zetachain.com",
      "blockscout_url": "https://zetachain-testnet.blockscout.com/",
      "verification_status": "verified",
      "contract_url": "https://zetachain-testnet.blockscout.com/address/0x1234..."
    }
  }
}
```

This enhanced format enables the frontend to display rich information about the deployment status and contract verification for each chain, improving the user experience by providing direct links to block explorers and clear status indicators.

---

## 5. Data Security

### 5.1. Encryption & Secure Storage
- **In Transit:**  
  - Enforce HTTPS for all API endpoints.
- **At Rest:**  
  - Use PostgreSQL's built-in encryption and secure configurations.
  - Sensitive configuration data (e.g., API keys) should be stored in environment variables or a secrets manager.
  
### 5.2. Sensitive Data Handling
- **Public vs. Private Data:**  
  - Public Data: Token details (name, icon URL), deployment status.
  - Private Data: Wallet addresses, deployment logs should be secured.
- **Access Controls:**  
  - Validate JWTs on protected endpoints.
  - Use role-based checks where necessary (e.g., only the token creator can view or modify their deployment data).

---

## 6. Scalability & Modularity

### 6.1. Modular Architecture
- **Service Layer:**  
  - Separate core functionalities into distinct modules or services:
    - **TokenService:** Handles token configuration, fee verification, and deployment coordination.
    - **ContractService:** Manages smart contract deployment and verification.
    - **UserService:** Manages wallet authentication and JWT session management.
- **Asynchronous Processing:**  
  - Use background job processing (e.g., Bull/Redis) for long-running operations:
    - Contract deployment tasks per chain
    - Status polling and updates
  
### 6.2. Microservices Consideration
- **Future-proofing:**  
  - Design the backend in a modular way that allows splitting services into microservices:
    - Token Configuration Service
    - Deployment Orchestrator Service
    - Chain-specific Deployment Services
    - Verification Service
  - Use API versioning (v1) and clear service boundaries to decouple features.
  
### 6.3. Maintenance & Scalability Best Practices
- **Logging & Monitoring:**  
  - Integrate centralized logging (e.g., Winston logger) and monitoring (Prometheus/Grafana).
- **Database Scalability:**  
  - Plan for read replicas and regular backups.
- **Code Organization:**  
  - Follow clean architecture principles with separation of concerns (e.g., controllers, services, data access layers).

---

## 7. Smart Contract Integration

### 7.1. Contract Bytecode and ABI Storage
- **File Structure:**
  - Store contract bytecode and ABIs in dedicated JavaScript modules.
  - Example location: `src/constants/bytecode.js`

### 7.2. Testing Framework
- **Contract Deployment Tests:**
  - Located in `src/tests/contract.test.js`
  - Functions to test ZetaChain and EVM chain deployments
  - Graceful fallback to mock data when real deployment isn't possible
  - Clear display of contract addresses and transaction hashes
  - Explorer URLs for easy contract verification

- **Token Service Tests:**
  - Located in `src/tests/token.test.js`
  - Functions to test token configuration creation and retrieval
  - Tests for deployment logs and token deployment initiation
  - Structured output of deployment information

- **Demo Scripts:**
  - **Full Demo:** `scripts/runDemo.js` - Shows the entire token flow from creation to deployment
  - **Summary Output:** Comprehensive list of all deployed contracts with explorer URLs

- **Test NPM Scripts:**
  - `npm run test-zeta-deploy` - Test ZetaChain token deployment
  - `npm run test-evm-deploy` - Test EVM token deployment
  - `npm run test-token-create` - Test token configuration creation
  - `npm run test-deployment` - Run all token tests
  - `npm run run-demo` - Run the complete demo

### 7.3. Testing Framework Output

The enhanced testing framework provides comprehensive output with critical contract deployment information:

- **Contract Addresses:** Clearly displayed for all deployed contracts
- **Transaction Hashes:** Shown for all deployment transactions
- **Explorer URLs:** Direct links to view contracts and transactions on blockchain explorers
- **Error Handling:** Graceful handling of deployment failures with fallback to mock data
- **Summary Display:** Consolidated list of all deployed contracts at the end of tests

Example output from the demo script:

```
=============== DEPLOYMENT SUCCESSFUL ===============
CONTRACT ADDRESS: 0xcCB30B5b65c1ebDA767C7cdDbCDc01cA7c37B86F
TRANSACTION HASH: 0x5adedc18a543fc5886b5290c947b56df11570f303e970a497a667af4c44c2b08
EXPLORER URL: https://athens.explorer.zetachain.com/tx/0x5adedc18a543fc5886b5290c947b56df11570f303e970a497a667af4c44c2b08
========================================================

SUMMARY OF DEPLOYED CONTRACTS
------------------------------------------------------
Chain: ZetaChain Testnet (7001)
Contract Address: 0xcCB30B5b65c1ebDA767C7cdDbCDc01cA7c37B86F
Explorer URL: https://athens.explorer.zetachain.com/address/0xcCB30B5b65c1ebDA767C7cdDbCDc01cA7c37B86F
------------------------------------------------------
Chain: Sepolia (11155111)
Contract Address: 0xc5575b84A7980a7305Bca23e07631234e5331d89
Explorer URL: https://sepolia.etherscan.io/address/0xc5575b84A7980a7305Bca23e07631234e5331d89
------------------------------------------------------
```

### 7.4. Contract Deployment Workflow

1. **Fee Verification:**
   - Verify that the token creator has paid the required ZETA fee.
   - Confirm transaction success and correct amount.

2. **Chain-Specific Deployments:**
   - For each selected chain, deploy the appropriate Universal Token contract.
   - Track deployment status and contract addresses.

3. **Status Updates:**
   - Continuously update deployment logs with current status.
   - Provide detailed error information if deployments fail.

### 7.5. Error Handling & Validation

- **Bytecode Validation:**
  - Validate bytecode format before attempting deployment.
  - Check for required exports and proper JavaScript syntax.

- **Transaction Error Handling:**
  - Handle common blockchain errors (gas price, nonce issues, network congestion).
  - Implement retry mechanisms with exponential backoff.

- **Detailed Logging:**
  - Log all contract interactions with detailed information.
  - Capture transaction hashes, gas costs, and error messages.

---

## 8. Recent Updates & Changes

### 8.1. Bytecode.js Structure Improvements

We've recently addressed critical issues with the bytecode.js file:

1. **Fixed Syntax Errors:**
   - Properly closed multiline comment blocks with `*/`
   - Ensured proper string formatting for bytecode
   - Fixed export syntax

2. **Enhanced Documentation:**
   - Added clear documentation about file purpose
   - Included instructions for obtaining real contract artifacts
   - Documented the placeholder nature of current bytecode

3. **Validation Improvements:**
   - Added utility functions to validate bytecode format
   - Implemented testing for bytecode file integrity
   - Added error catching in the contract service

### 8.2. ContractService Enhancements

1. **Error Handling:**
   - Improved error logging with detailed context
   - Added specific error types for different deployment failures
   - Enhanced status reporting

2. **Deployment Process:**
   - Added transaction receipt validation
   - Improved gas estimation for deployment transactions
   - Added constructor argument validation

3. **Testing Support:**
   - Added support for minimal test deployments
   - Implemented deployment verification utilities

### 8.3. Implementation Progress

We have successfully implemented the core components of the backend service:

1. **Database Models:**
   - `TokenConfiguration` model for storing token details
   - `DeploymentLog` model for tracking deployment status per chain
   - Proper relationships and migrations set up

2. **Service Layer:**
   - `ContractService` for smart contract deployment and interaction
   - `TokenService` for token configuration, deployment, and status management
   - File upload handling for token icons
   - Transaction validation for fee payment

3. **API Controllers:**
   - `TokenController` with endpoints for token creation, deployment, and retrieval
   - Authentication middleware for wallet-based authorization
   - Proper error handling and validation

4. **Testing Utilities:**
   - Manual test scripts for contract deployment
   - Test utilities for token configuration and deployment
   - Database initialization scripts for development

5. **Deployment Flow:**
   - Clean sequential deployment starting from ZetaChain
   - Status tracking and error handling
   - Support for partial deployments

This implementation closely follows the architecture outlined in the previous sections, with some practical adjustments based on development experience. The current implementation focuses on the contract deployment functionality.

---

## 9. Contract Verification Implementation

### 9.1 Verification Service Overview

We have implemented a comprehensive contract verification service that allows deployed contracts to be automatically verified on block explorers:

1. **Multi-Explorer Support:**
   - **Blockscout API** for ZetaChain verification
   - **Etherscan API** and compatible explorers for other EVM chains (Sepolia, Base, etc.)
   - Automatic explorer type detection based on chain ID

2. **Verification Methods:**
   - Standard JSON input format for all explorers
   - Support for compiler version, optimization settings, and runs
   - Automatic source code dependency resolution (handles imports)

3. **Status Tracking:**
   - Polls Etherscan verification status for completion
   - Stores verification status in the DeploymentLog model
   - Provides explorer URLs for verified contracts

### 9.2 Database Schema Updates

New fields have been added to the DeploymentLog model to track verification:

```javascript
// New fields in DeploymentLog model
verificationStatus: {
  type: DataTypes.STRING,
  field: 'verification_status',
  defaultValue: 'pending'  // Values: pending, processing, verified, failed, skipped
},
verificationError: {
  type: DataTypes.TEXT,
  field: 'verification_error'
},
verifiedUrl: {
  type: DataTypes.STRING,
  field: 'verified_url'
}
```

A migration script has been created to add these fields to the existing database:
- Located at `src/db/migrations/20240402000000-add-verification-fields.js`
- Adds verification_status, verification_error, and verified_url columns
- Handles existing tables gracefully

### 9.3 Integration with Deployment Process

The verification process is now integrated with the token deployment workflow:

1. **Automatic Verification:**
   - Verification is attempted automatically after successful deployment
   - 15-second delay ensures contracts are properly indexed before verification
   - Non-blocking design allows deployment to continue even if verification fails

2. **Configuration via Environment Variables:**
   - API keys for different explorers configured in .env file
   - Example in .env.example:
     ```
     ETHERSCAN_API_KEY=your_etherscan_api_key
     POLYGONSCAN_API_KEY=your_polygonscan_api_key
     BASESCAN_API_KEY=your_basescan_api_key
     ```

3. **Implementation in ContractService and TokenService:**
   - Verification attempts included in both direct contract deployment methods
   - Token service updates deployment logs with verification status
   - Explorer URLs stored for frontend display

### 9.4 Verification Testing

A dedicated test script has been created to test verification:

- Located at `src/tests/verify-contract.test.js`
- Tests both Blockscout and Etherscan verification
- Configurable via command-line arguments
- Added to package.json scripts as `verify-test`

Example usage:
```bash
# Test all verification methods
npm run verify-test

# Test only Blockscout verification
npm run verify-test blockscout

# Test only Etherscan verification 
npm run verify-test etherscan
```

### 9.5 Technical Implementation

The verification service implements several key technical features:

1. **Standard JSON Input Generation:**
   - Creates properly formatted JSON input with sources, settings, and optimizer configuration
   - Recursively resolves and includes imported contracts
   - Handles both local and node_modules imports

2. **Explorer-Specific API Handling:**
   - Formats requests differently based on explorer type
   - Handles different response formats and success criteria
   - Provides consistent result format regardless of explorer

3. **Status Polling:**
   - For Etherscan, implements polling to check verification status
   - Configurable max attempts and delay between polls
   - Handles queue waiting and error conditions

This verification implementation greatly improves the user experience by automatically providing verified contracts that can be inspected and trusted by users.

---

## Summary

- **Database:** PostgreSQL with tables for users, token configurations, and deployment logs. Data is normalized with appropriate indexes, constraints, and foreign keys.
- **Authentication:** Web3 wallet-based, with signature verification and JWT for session management.
- **File Storage:** AWS S3 (or equivalent) for token icons, with secure access controls.
- **APIs:** RESTful endpoints built with Express.js, using JSON payloads, with robust validation and error handling.
- **Data Security:** HTTPS, encryption at rest, role-based access control, and secure storage practices.
- **Smart Contracts:** Properly structured bytecode and ABI storage in dedicated JavaScript modules.
- **Contract Verification:** Comprehensive verification service supporting both Blockscout and Etherscan-compatible explorers.
- **Scalability:** Modular service design, asynchronous task queues for long-running tasks, and a clear separation of concerns for easy maintenance and future scaling.

This document provides a detailed, actionable blueprint for the backend implementation of the Universal Token Launcher, focused on contract deployment and verification capabilities.
