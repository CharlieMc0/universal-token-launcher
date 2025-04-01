# Backend Structure Document

This document outlines the foundational backend system for the Universal Token Launcher. It details the database architecture, authentication and authorization, file storage, API design, data security, and strategies for scalability and modularity.

---

## 1. Database Architecture

We will use **PostgreSQL** as our primary relational database. Data is normalized to avoid redundancy, with separate tables for token configurations, distribution records, deployment logs, and transfer transactions. Key tables include:

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
  - `distributions_json` (JSONB) – Parsed distribution data with addresses and amounts.
  - `selected_chains` (JSONB) – Array of selected chain IDs for deployment.
  - `fee_paid_tx` (VARCHAR) – Transaction hash of the fee payment.
  - `deployment_status` (VARCHAR) – e.g., 'pending', 'completed', 'failed'.
  - `created_at` (TIMESTAMP WITH TIME ZONE, default NOW())
  - `updated_at` (TIMESTAMP WITH TIME ZONE)
- **Indexes & Constraints:**
  - Index on `creator_wallet` for quick lookup.
  - Constraint on `deployment_status` values (if using ENUM type, or check constraint).

### 1.3. TokenDistributions
*Purpose:* Store individual CSV entries for token distributions.
- **Fields:**
  - `id` (SERIAL, PRIMARY KEY)
  - `token_config_id` (INTEGER, NOT NULL) – Foreign key referencing `TokenConfigurations(id)`.
  - `recipient_address` (TEXT, NOT NULL)
  - `chain_id` (VARCHAR, NOT NULL) – Identifier of the target chain.
  - `token_amount` (NUMERIC, NOT NULL)
  - `status` (VARCHAR) – e.g., 'pending', 'distributed', 'failed'.
  - `transaction_hash` (VARCHAR) – Blockchain transaction hash (if available).
  - `created_at` (TIMESTAMP WITH TIME ZONE, default NOW())
  - `updated_at` (TIMESTAMP WITH TIME ZONE)
- **Indexes & Constraints:**
  - Foreign key on `token_config_id` (with ON DELETE CASCADE).
  - Unique composite index on (`token_config_id`, `recipient_address`, `chain_id`) to avoid duplicate entries.

### 1.4. DeploymentLogs
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
  - `created_at` (TIMESTAMP WITH TIME ZONE, default NOW())
  - `updated_at` (TIMESTAMP WITH TIME ZONE)
- **Indexes & Constraints:**
  - Foreign key on `token_config_id`.
  - Index on `chain_name` for filtering by network.

### 1.5. TransferTransactions
*Purpose:* Record all transfer actions initiated by token holders.
- **Fields:**
  - `id` (SERIAL, PRIMARY KEY)
  - `user_wallet` (TEXT, NOT NULL) – The wallet initiating the transfer.
  - `action_type` (VARCHAR, NOT NULL) – 'transfer_in' or 'transfer_out'.
  - `source_chain` (VARCHAR, NOT NULL)
  - `destination_chain` (VARCHAR, NOT NULL)
  - `token_amount` (NUMERIC, NOT NULL)
  - `transaction_hash` (VARCHAR) – Hash from the transfer blockchain.
  - `status` (VARCHAR) – e.g., 'pending', 'success', 'failed'.
  - `created_at` (TIMESTAMP WITH TIME ZONE, default NOW())
  - `updated_at` (TIMESTAMP WITH TIME ZONE)
- **Indexes & Constraints:**
  - Index on `user_wallet` and `status` for reporting and lookups.

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
  - **Token Creator vs. Token Holder:**  
    - Role is inferred by the actions performed. For instance, initiating a token deployment (configuration + CSV upload) designates a creator; all other users function as token holders.
  - Endpoints that modify deployment data require a valid JWT containing the correct wallet address.

---

## 3. Storage Buckets / File Handling

### 3.1. File Types
- **Images:** Token icons uploaded by token creators.
- **Documents:** CSV files for token distributions.

### 3.2. Storage Provider
- **Recommendation:** AWS S3 (or an alternative like Supabase Storage)
  - **Rationale:** S3 is reliable, scalable, and widely supported.
  
### 3.3. Folder Structure & Access Control
- **Folders:**
  - `/uploads/csv/` – For CSV files (private access; only the creator can read/modify).
  - `/uploads/icons/` – For token icon images (public read access, private write access).
- **Access Rules:**
  - Use S3 bucket policies to ensure that:
    - Only authenticated requests (with proper credentials) can upload files.
    - Files in the icons folder are publicly readable (for display) while CSV files remain private.
  - Consider using signed URLs for temporary access to CSV files.

---

## 4. API Design Layer

### 4.1. Protocol
- **REST API** built with Express.js.

### 4.2. Main Endpoints

#### 4.2.1. Token Configuration & Deployment
- **POST /api/tokens**
  - **Description:** Create a new token configuration.
  - **Request Body:** Multipart form data containing:
    - `token_name` (string, required)
    - `token_symbol` (string, required)
    - `decimals` (integer, default 18)
    - `total_supply` (numeric, required)
    - `icon` (file, required) - Token icon image
    - `selected_chains` (JSON string, required) - Array of chain IDs
    - `distributions_json` (JSON string, required) - Array of {address, amount} objects
  - **Response:** Token configuration ID and initial status.
  
- **GET /api/tokens/{id}**
  - **Description:** Retrieve status and details for a token configuration.
  - **Response:** Token details including name, symbol, supply, deployment status, and contract addresses.

- **POST /api/tokens/{id}/deploy**
  - **Description:** Trigger the deployment process after fee payment.
  - **Request Body:** JSON payload with:
    - `fee_paid_tx` (string, required) - Transaction hash of the ZETA fee payment
  - **Response:** Initial deployment status and details.

- **GET /api/tokens/{id}/deployments**
  - **Description:** Get deployment logs for a specific token.
  - **Response:** Array of deployment logs with chain-specific status and contract addresses.

#### 4.2.2. Transfer Transactions
- **POST /api/transfers**
  - **Description:** Initiate a transfer operation (transfer in/out).
  - **Request Body:** JSON payload with action type, source chain, destination chain, token amount, and user wallet.
  - **Response:** Transfer transaction ID and initial status.
  
- **GET /api/transfers/{id}**
  - **Description:** Retrieve the status of a specific transfer transaction.
  - **Response:** Transfer details including transaction hash and status.

#### 4.2.3. Status & Notifications
- **GET /api/status**
  - **Description:** Poll or subscribe for real-time status updates (deployment progress, transfer transaction updates).
  - **Response:** JSON with current statuses (may integrate WebSocket endpoints for real-time updates).

### 4.3. Error & Validation Handling
- **Standardized Error Format:**  
  - Return HTTP status codes with JSON payloads containing an error code and message.
- **Validation:**  
  - Use Express validator or similar middleware for input validation.
  - Return 400 Bad Request for invalid inputs, 401 Unauthorized for missing/invalid JWTs, and 500 for unexpected errors.

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
  - Private Data: CSV file contents, wallet addresses, deployment logs, and transfer transaction details should be secured.
- **Access Controls:**  
  - Validate JWTs on protected endpoints.
  - Use role-based checks where necessary (e.g., only the token creator can view or modify their deployment data).

---

## 6. Scalability & Modularity

### 6.1. Modular Architecture
- **Service Layer:**  
  - Separate core functionalities into distinct modules or services:
    - **TokenService:** Handles token configuration, fee verification, and deployment coordination.
    - **DeploymentService:** Manages contract deployment and status tracking per chain.
    - **DistributionService:** Handles initial token distribution validation and execution.
    - **TransferService:** Manages transfer transactions (burn/mint operations).
    - **UserService:** Manages wallet authentication and JWT session management.
- **Asynchronous Processing:**  
  - Use background job processing (e.g., Bull/Redis) for long-running operations:
    - Contract deployment tasks per chain
    - Initial token distribution tasks
    - Status polling and updates
  
### 6.2. Microservices Consideration
- **Future-proofing:**  
  - Design the backend in a modular way that allows splitting services into microservices:
    - Token Configuration Service
    - Deployment Orchestrator Service
    - Chain-specific Deployment Services
    - Distribution Service
    - Transfer Service
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
  - **Full Demo:** `scripts/runDemo.js` - Shows the entire token flow from creation to connection
  - **Connect Tokens:** `scripts/connectTokens.js` - Script for connecting tokens across chains
  - **Summary Output:** Comprehensive list of all deployed contracts with explorer URLs

- **Test NPM Scripts:**
  - `npm run test-zeta-deploy` - Test ZetaChain token deployment
  - `npm run test-evm-deploy` - Test EVM token deployment
  - `npm run test-token-create` - Test token configuration creation
  - `npm run test-deployment` - Run all token tests
  - `npm run run-demo` - Run the complete demo
  - `npm run connect-tokens-testnet` - Connect tokens across chains

### 7.3. Testing Framework Output

The enhanced testing framework provides comprehensive output with critical contract deployment information:

- **Contract Addresses:** Clearly displayed for all deployed contracts
- **Transaction Hashes:** Shown for all deployment transactions
- **Explorer URLs:** Direct links to view contracts and transactions on blockchain explorers
- **Error Handling:** Graceful handling of deployment failures with fallback to mock data
- **Connection Status:** Detailed information about cross-chain token connections
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

3. **Initial Token Distribution:**
   - Based on CSV data, distribute tokens to specified addresses.
   - Update distribution status in the database.

4. **Status Updates:**
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
   - `TokenDistribution` model for tracking token distribution records
   - Proper relationships and migrations set up

2. **Service Layer:**
   - `ContractService` for smart contract deployment and interaction
   - `TokenService` for token configuration, deployment, and status management
   - File upload handling for token icons and CSV distribution lists
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
   - Connection of tokens across chains
   - Status tracking and error handling
   - Support for partial deployments

This implementation closely follows the architecture outlined in the previous sections, with some practical adjustments based on development experience. The current implementation focuses on the contract deployment functionality, leaving token transfers to be handled by the frontend directly.

---

## 9. Smart Contract Implementation Update

### 9.1 Successfully Implemented Contracts

We have successfully implemented and deployed the following smart contracts:

1. **Base UniversalToken Contract:**
   - Located in `smart-contracts/contracts/base/UniversalToken.sol`
   - Implements core ERC20 functionality with additional features for cross-chain compatibility
   - Inherits from OpenZeppelin's ERC20 and Ownable contracts
   - Provides customizable decimal support and controlled minting/burning

2. **ZetaChainUniversalToken:**
   - Located in `smart-contracts/contracts/ZetaChainUniversalToken.sol`
   - Deployed on ZetaChain (Testnet at `0x51d5D00dfB9e1f4D60BBD6eda288F44Fb3158E16`)
   - Manages connections to tokens on other chains
   - Handles cross-chain transfers via the ZetaChain protocol

3. **EVMUniversalToken:**
   - Located in `smart-contracts/contracts/EVMUniversalToken.sol`
   - Deployed on Sepolia Testnet at `0x0b3D12246660b41f982f07CdCd27536a79a16296`
   - Connects to the corresponding ZetaChain token
   - Handles cross-chain transfers to/from ZetaChain

### 9.2 Deployment Scripts

Several scripts have been created to manage deployment and token connections:

1. **deploy.ts:**
   - Handles deployment of contracts to various networks
   - Automatically detects network type (ZetaChain or other EVM)
   - Deploys the appropriate contract type

2. **connect-tokens.ts:**
   - Connects token contracts across chains
   - Sets up ZetaChain token's awareness of EVM chain tokens
   - Sets up EVM token's awareness of the ZetaChain token

3. **simulate-transfer.ts:**
   - Simulates cross-chain transfers for testing
   - Can perform source chain operations (burn)
   - Can perform destination chain operations (mint)
   - Useful for testing the cross-chain workflow

### 9.3 Integration with Backend Service

To integrate these contracts with the backend service, follow these steps:

1. **Extract Contract ABIs:**
   - Run `npx hardhat compile` in the `smart-contracts` directory
   - Locate the compiled artifacts in `smart-contracts/artifacts/contracts/`
   - Extract the ABIs from the JSON files and save them to `backend/src/constants/`

2. **Update Contract Service:**
   - Modify the ContractService to use the new ABI and bytecode
   - Update deployment logic to use the correct constructor parameters
   - Example:
   ```javascript
   // For ZetaChain deployment
   async deployZetaChainUniversalToken(tokenName, tokenSymbol, decimals, totalSupply, creatorWallet) {
     try {
       // Load bytecode and ABI
       const bytecode = ZETACHAIN_UNIVERSAL_TOKEN_BYTECODE;
       const abi = ZETACHAIN_UNIVERSAL_TOKEN_ABI;
       
       // Create wallet with private key
       const wallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, this.providers[7001]);
       
       // Create contract factory
       const factory = new ethers.ContractFactory(abi, bytecode, wallet);
       
       // Prepare constructor arguments
       const args = [tokenName, tokenSymbol, decimals, totalSupply, creatorWallet];
       
       // Deploy contract
       const contract = await factory.deploy(...args);
       await contract.deploymentTransaction().wait();
       
       return {
         contractAddress: contract.address,
         transactionHash: contract.deploymentTransaction().hash
       };
     } catch (error) {
       console.error(`Error deploying token on ZetaChain: ${error.message}`);
       throw error;
     }
   }
   
   // For EVM chain deployment
   async deployEVMUniversalToken(chainId, tokenName, tokenSymbol, decimals, totalSupply, creatorWallet) {
     try {
       // Similar to above but with additional chainId parameter
       // ...
       const args = [tokenName, tokenSymbol, decimals, totalSupply, chainId, creatorWallet];
       // ...
     } catch (error) {
       // ...
     }
   }
   ```

3. **Implement Cross-Chain Transfer Logic:**
   - Add new endpoints for cross-chain transfers
   - Example endpoint: `POST /api/transfers`
   - Required parameters:
     - `source_chain_id`: The source chain ID
     - `destination_chain_id`: The destination chain ID
     - `recipient_address`: The recipient's address on the destination chain
     - `amount`: The amount of tokens to transfer

4. **Add Deployed Contract Management:**
   - Update the database schema to track deployed contracts per chain
   - Store contract addresses, chain IDs, and deployment transaction hashes
   - Add API endpoints to retrieve token status across chains

5. **Implement Event Listeners:**
   - Set up event listeners for cross-chain transfer events
   - Track pending and completed transfers
   - Update the database with transfer statuses
   - Example code:
   ```javascript
   const provider = new ethers.JsonRpcProvider(RPC_URL);
   const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
   
   contract.on("CrossChainTransferInitiated", (sender, destChainId, recipient, amount, event) => {
     console.log(`Transfer initiated from ${sender} to ${recipient} on chain ${destChainId}`);
     // Update database with pending transfer
   });
   
   contract.on("CrossChainTransferReceived", (sourceChainId, sender, recipient, amount, event) => {
     console.log(`Transfer received from chain ${sourceChainId}, sender ${sender} to ${recipient}`);
     // Update database with completed transfer
   });
   ```

### 9.4 Next Steps

1. **Integrate with Actual ZetaChain Protocol:**
   - Research and implement integration with ZetaChain's cross-chain messaging system
   - Replace simulation code with actual ZetaChain gateway interactions
   - Example resources:
     - ZetaChain documentation: https://www.zetachain.com/docs/
     - Standard contracts repository: https://github.com/zeta-chain/standard-contracts/

2. **Enhance Error Handling:**
   - Implement retry mechanisms for failed deployments
   - Add detailed error tracking and reporting
   - Monitor blockchain events for transaction status

3. **Add Comprehensive Testing:**
   - Write unit tests for contract interactions
   - Set up integration tests for cross-chain operations
   - Test on multiple testnets before mainnet deployment

4. **Security Audit:**
   - Review contract code for security vulnerabilities
   - Ensure proper access control in cross-chain operations
   - Validate input parameters and guard against overflow/underflow

5. **User Interface Integration:**
   - Update the frontend to display token balances across chains
   - Implement a user-friendly cross-chain transfer interface
   - Add real-time status tracking for cross-chain transfers

By following these integration steps and next steps, the backend service can be properly connected to the smart contracts we've developed and deployed.

---

## 10. Recent Implementation Details

### 10.1 Contract Integration

The backend now successfully integrates with smart contracts by:

1. **Dynamic Artifact Loading:**
   - Automatically loads contract artifacts from the smart-contracts directory
   - Falls back to placeholder ABIs if compiled artifacts aren't available
   - Provides helpful error messages when artifacts can't be loaded

2. **Chain-Specific Deployment:**
   - Automatically detects ZetaChain vs. EVM environments
   - Uses appropriate contract constructor parameters per chain type
   - Manages token connections between chains after deployment

3. **Provider Management:**
   - Maintains connection pools for multiple networks
   - Handles RPC connection errors gracefully
   - Formats private keys correctly regardless of input format

### 10.2 Deployment Process Improvements

The deployment flow has been refined to improve reliability:

1. **Sequential Deployment:**
   - Always deploys ZetaChain contract first
   - Deploys EVM contracts after ZetaChain contract is confirmed
   - Connects contracts after all deployments are complete

2. **Robust Error Handling:**
   - Tracks deployment status per chain
   - Continues with other chains if one deployment fails
   - Updates overall status as "partial" if some chains succeed

3. **Fee Verification:**
   - Verifies fee payment transaction receipt
   - Validates payment amount and recipient
   - Requires successful transaction confirmation

### 10.3 Testing Tools

New testing utilities have been added:

1. **Contract Testing:**
   - Test scripts for ZetaChain deployment
   - Test scripts for EVM deployment
   - Test scripts for cross-chain connection

2. **Token Service Testing:**
   - Test utilities for token configuration creation
   - Test utilities for deployment initiation
   - Test utilities for deployment log checking

3. **Database Initialization:**
   - Script for initializing database schemas
   - Option for creating test data in development mode
   - Clear documentation on usage

These implementations provide a solid foundation for the Universal Token Launcher backend, focusing on reliable contract deployment across multiple chains.

---

## 11. Contract Verification Implementation

### 11.1 Verification Service Overview

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

### 11.2 Database Schema Updates

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

### 11.3 Integration with Deployment Process

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

### 11.4 Verification Testing

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

### 11.5 Technical Implementation

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

## 12. API Integration Testing

### 12.1 Frontend-Backend Integration Testing Strategy

The frontend and backend integration has been significantly improved with a robust testing strategy:

1. **Mock-Based Testing:**
   - Frontend tests mock the backend API responses
   - Realistic mock implementations simulate network delays
   - Error scenarios are explicitly tested
   - API service functions are consistently mocked across test files

2. **Integration Test Structure:**
   - **LaunchIntegration.test.js:**
     - Tests token creation form submission
     - Tests fee payment transaction processing
     - Tests deployment status tracking
     - Handles error cases (API errors, transaction rejections)
   
   - **TransferIntegration.test.js:**
     - Tests loading state for user tokens
     - Tests token selection and display
     - Tests transfer form validation
     - Tests transfer processing and status updates

3. **API Response Format Consistency:**
   - All mock responses follow the exact format returned by the backend
   - Field names match backend responses (e.g., `token_name` instead of `tokenName`)
   - Data types are correctly handled (strings for BigInts, JSON strings for arrays)

### 12.2 Testing API Service Functions

The API service functions are tested with consistent mock implementations:

```javascript
// Mock implementation for token creation and deployment
apiService.createToken.mockResolvedValue({
  id: 1,
  token_name: 'Test Token',
  deployment_status: 'pending'
});

apiService.deployToken.mockResolvedValue({
  id: 1,
  deployment_status: 'pending'
});

// Mock implementation with delay for getUserTokens
apiService.getUserTokens.mockImplementation(() => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        {
          id: 'token1',
          name: 'My Universal Token',
          symbol: 'MUT',
          iconUrl: 'https://example.com/icon.png',
          deployedChains: ['7001', '11155111', '97'],
          balances: {
            '7001': '1000',
            '11155111': '500',
            '97': '750'
          }
        },
        // ... more tokens
      ]);
    }, 100); // Small delay to simulate network request
  });
});
```

### 12.3 Testing Form Submission and API Interactions

Form submission is tested with detailed verification of the data sent to the API:

```javascript
// Submit the form and verify API call
const submitButton = screen.getByRole('button', { name: 'Launch Token' });
fireEvent.click(submitButton);

// Wait for API calls and verify form data
await waitFor(() => {
  expect(apiService.createToken).toHaveBeenCalled();
});

const formData = apiService.createToken.mock.calls[0][0];

// Verify FormData contains correct values
expect(formData.get('token_name')).toBe('Test Token');
expect(formData.get('token_symbol')).toBe('TEST');
expect(formData.get('decimals')).toBe('18');
expect(formData.get('total_supply')).toBe('1000000');
expect(formData.get('selected_chains')).toBe(JSON.stringify(['7001']));
```

### 12.4 Testing Loading States and Asynchronous Operations

Loading states are properly tested with waitFor to handle asynchronous operations:

```javascript
// Render component
render(<TransferPage />);

// Check loading state
expect(screen.getByText(/loading your tokens/i)).toBeInTheDocument();

// Wait for loading to finish
await waitFor(() => {
  expect(apiService.getUserTokens).toHaveBeenCalled();
}, { timeout: 1000 });

// Wait for loading message to disappear
await waitFor(() => {
  expect(screen.queryByText(/loading your tokens/i)).not.toBeInTheDocument();
}, { timeout: 1000 });

// Verify tokens are displayed
expect(screen.getByText(/My Universal Token/i)).toBeInTheDocument();
```

### 12.5 Key Testing Lessons Learned

1. **Field Name Consistency:**
   - Ensure frontend field names match API expectations exactly
   - Backend uses snake_case while frontend may use camelCase

2. **DOM Selection Strategies:**
   - Use role-based selection for more reliable tests
   - Match button text exactly with case sensitivity
   - Use regular expressions for flexible text matching

3. **Asynchronous Testing:**
   - Always check loading states
   - Use appropriate timeouts for waitFor calls
   - Test both the appearance and disappearance of elements

4. **API Mock Implementation:**
   - Use consistent mock implementations across test files
   - Add delays to mocks to simulate realistic API behavior
   - Test both success and error scenarios

These integration testing strategies ensure that the frontend and backend work together seamlessly, and that any API changes are caught early in the development process.

---

## Summary

- **Database:** PostgreSQL with tables for users, token configurations, token distributions, deployment logs, and transfer transactions. Data is normalized with appropriate indexes, constraints, and foreign keys.
- **Authentication:** Web3 wallet-based, with signature verification and JWT for session management.
- **File Storage:** AWS S3 (or equivalent) for CSV files and token icons, with secure access controls.
- **APIs:** RESTful endpoints built with Express.js, using JSON payloads, with robust validation and error handling.
- **Data Security:** HTTPS, encryption at rest, role-based access control, and secure storage practices.
- **Smart Contracts:** Properly structured bytecode and ABI storage in dedicated JavaScript modules.
- **Scalability:** Modular service design, asynchronous task queues for long-running tasks, and a clear separation of concerns for easy maintenance and future scaling.

This document provides a detailed, actionable blueprint for the backend implementation of the Universal Token Launcher, incorporating lessons learned and recent improvements to the system.
