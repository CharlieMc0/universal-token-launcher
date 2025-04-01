# Universal Launcher Product Requirements Document

## 1. Overview

The Universal Launcher is a web application that allows non-developer users (familiar with Web3 wallets) to deploy Universal Tokens and NFTs across multiple EVM chains with simple, single-signed transactions. Leveraging ZetaChain's interoperability via Standard Contracts, the app minimizes the creator's manual steps while automating cross-chain contract deployments and asset distributions. Unlike traditional bridging, Universal assets are designed for transferring between chains as needed.

## 2. Objectives

- **Simplify Token Deployment:** Enable token creators to configure key token parameters and deploy contracts with minimal friction.
- **Cross-Chain Compatibility:** Automatically deploy Universal Token contracts on all selected EVM chains.
- **Fee Management:** Ensure the token creator pays a fixed ZETA fee of 1 ZETA (for testing) to the Universal Token Service wallet.
- **Token Transfers:** Provide a simple, one-click transfer interface for token holders to move tokens between chains (which involves burning on the source chain and minting on the destination chain).
- **Showcase ZetaChain:** Demonstrate ZetaChain's universal connectivity and cross-chain interoperability for token transfers.

## 3. User Personas

### 3.1 Token Creator

- **Role:** Initiates token creation and deployment.
- **Capabilities:**
  - Configure token details (name, icon, decimals, total supply).
  - Upload a CSV file (up to 100 entries) with initial token distributions (address, chain ID, token amount).
  - Pay a fixed ZETA fee via a single transaction.
- **Technical Level:** Familiar with Web3 wallets and signing transactions but not a developer.

### 3.2 Token Holder

- **Role:** Receives, manages, and transfers tokens.
- **Capabilities:**
  - View token balances across chains.
  - Transfer tokens between chains using a simple "transfer" interface.
- **Technical Level:** Basic Web3 user comfortable with wallet interactions.

## 4. Features & Functional Requirements

### 4.1 For Token Creators

- **Token Configuration Panel:**
  - **Input Fields:** Token Name, Icon (image upload), Decimals, Total Supply.
  - **CSV Upload:** Accept CSV (max 100 entries) with wallet address, chain ID, and token amount. Frontend validation ensures address format is correct.
- **Chain Selection:**
  - Dropdown listing supported EVM chains (configurable by the creator).
  - Additional chains (Solana, TON, SUI) shown as "Coming Soon."
- **Fee Verification & Payment:**
  - Display the fixed ZETA fee (1 ZETA for testing).
  - Check that the connected wallet has sufficient ZETA balance.
  - Prompt the token creator for a single transaction to pay the fee to the Universal Token Service wallet.
  - **Payment must be made in ZETA on the ZetaChain network.**
- **Deployment Trigger:**
  - After fee payment confirmation, the backend deployer service automatically:
    - Deploys Universal Token contracts on all selected chains.
    - Distributes tokens according to the CSV input.

### 4.2 For Token Holders

- **Dashboard:**
  - Display token balances across ZetaChain and connected chains.
  - Provide a clear interface labeled "Transfer" (instead of "Bridge").
- **Transfer Interface:**
  - Enable one-click or guided transfer flows that initiate the token transfer process (burning on the source chain and minting on the destination chain).
  - Show real-time status notifications and confirmations for each transfer.

## 5. User Stories & Acceptance Criteria

### User Story 1: Token Creator – Deploy a Universal Token

- **Story:** As a token creator, I want to configure my token details and deploy it on multiple chains with one fee payment, so that I can launch my token quickly.
- **Acceptance Criteria:**
  - I can enter token details and upload a CSV with initial distribution.
  - The system verifies my wallet balance against the hardcoded ZETA fee.
  - Upon fee payment, contracts are deployed on the selected chains and tokens are distributed as specified.
  - Deployment completes in under 5 minutes.

### User Story 2: Token Holder – Transfer Tokens Between Chains

- **Story:** As a token holder, I want to transfer my tokens from one chain to another with a simple interface, so that I can use them on the chain of my choice.
- **Acceptance Criteria:**
  - I can view my token balance for each chain on the dashboard.
  - I can initiate a transfer with a one-click or guided process.
  - The transfer process burns my tokens on the source chain and mints them on the destination chain.
  - I receive clear status notifications throughout the process.

## 6. Technical Requirements

### 6.1 Frontend

- **Technologies:** React.js with Create React App, along with styled-components for component-scoped styling.
- **Wallet Integration:** Utilize wagmi (v2.x) in conjunction with ethers.js (v6.x) and @rainbow-me/rainbowkit for efficient wallet connections.
- **UI/UX:** Simple, intuitive, and responsive design for desktop (with potential mobile support in future iterations).

### 6.2 Backend

- **Language:** Node.js with Express framework for API development
- **Functionality:**
  - **Deployer Service:** Monitors for fee payment, verifies the token creator's wallet, and initiates deployment on selected chains.
  - **Contract Deployment:** Automatically deploys Universal Token contracts across chosen EVM chains using ZetaChain Standard Contracts.
  - **Token Distribution:** Processes the CSV input and triggers minting/distribution transactions.
- **Transfer Processing:** Handles token transfers (burn on source, mint on destination) securely via cross-chain messaging.

### 6.3 Smart Contract Integration

- **Bytecode Management:** Store contract bytecode and ABIs in properly structured JavaScript modules.
- **Contract Factory:** Use ethers.js to create contract factories for deployment.
- **Transaction Handling:** Implement robust transaction monitoring and receipt validation.
- **Error Recovery:** Include mechanisms to handle common blockchain transaction issues.
- **Contract Verification:** Automatically verify deployed contracts on block explorers:
  - Blockscout for ZetaChain contracts
  - Etherscan and compatible explorers for other EVM chains
  - Store verification status and explorer URLs for frontend display
  - Provide proper error handling for failed verifications
- **Enhanced API Responses:** Include detailed contract and deployment information in token responses:
  - Contract addresses for each deployed chain
  - Verification status (verified, pending, failed) for each contract
  - Explorer URLs for easy contract viewing
  - Blockscout URLs for networks using Blockscout explorers
  - Deployment status (pending, deploying, success, failed) for each chain
  - Links to verified contract source code

## 7. Architecture & Workflow

### 7.1 Workflow

1. **Token Configuration:** The token creator enters token details and uploads the CSV file.
2. **Fee Payment:** The creator pays the fixed ZETA fee via a single signed transaction.
3. **Backend Processing:**
   - The deployer service confirms fee payment.
   - Contracts are deployed automatically on all selected chains.
   - Tokens are distributed based on CSV inputs.
4. **Token Transfer:** Token holders use the dashboard's "Transfer" interface to move tokens between chains. This process involves burning tokens on the source chain and minting them on the destination chain.

### 7.2 Components

- **Frontend:** Provides interfaces for token configuration, fee payment, and token transfers.
- **Backend Services:**
  - **API Layer:** Express.js RESTful endpoints for token configuration and deployment management.
  - **Contract Service:** Manages bytecode loading, contract deployment, and transaction monitoring.
  - **Database Layer:** PostgreSQL with Sequelize ORM for storing token configurations, deployment logs, and transfer records.
- **Blockchain Interaction:** Leverages ethers.js to interact with ZetaChain and connected chains.

## 8. UI/UX Requirements

- **Style:** Modern, futuristic, yet clean and minimal.
- **Design:** Clear forms and buttons, with an emphasis on intuitive navigation.
- **Navigation Structure:** Three main tabs:
  - **Create:** Toggle between token creation and NFT collection creation
  - **Transfer:** Toggle between token transfers and NFT transfers
  - **Buy:** Toggle between buying tokens (coming soon) and buying NFTs
- **Feedback:** Real-time validations, notifications for fee status, deployment progress, and transfer confirmations.
- **Terminology:** All references to "bridging" have been updated to "transfers" for clarity.

## 9. Security & Validation

- **CSV Validation:** Ensure uploaded CSV entries are formatted correctly (valid wallet addresses and chain IDs).
- **Smart Contract Security:** Use battle-tested contract examples from ZetaChain's Standard Contracts.
- **Fee Verification:** Backend deployer must verify the token creator's ZETA balance before initiating deployment.
- **Transfer Integrity:** Cross-chain transfers should include measures to ensure that tokens are securely burned on the source chain and minted correctly on the destination chain.
- **Bytecode Validation:** Implement checks to ensure contract bytecode is valid and properly formatted.

## 10. Success Criteria

- **For Creators:**
  - Ability to configure and launch Universal assets in under 5 minutes using a single fee payment.
  - Automated deployment on all selected chains with accurate distribution.
- **For Asset Holders:**
  - Seamless transfer experience across chains with clear status updates.
  - Reliable burning and minting mechanisms that ensure asset integrity.
- **Overall System:**
  - Backend reliability and robust cross-chain messaging.
  - Effective demonstration of ZetaChain's cross-chain interoperability for transfers.
  - Unified user interface that clearly separates asset types while maintaining a consistent experience.

## 11. Future Enhancements

- **Extended Chain Support:** Expand full support to non-EVM chains (e.g., Solana, TON, SUI) beyond "Coming Soon" placeholders.
- **On-Chain Deployment:** Explore fully on-chain deployment mechanisms if feasible.
- **Advanced Validations:** Implement dynamic fee calculations and enhanced CSV validations.
- **Enhanced UI/UX:** Integrate designer mockups and possibly mobile responsiveness for a more polished look.
- **Analytics & Monitoring:** Add dashboards for monitoring cross-chain transactions and transfer statuses.
- **Token Marketplace:** Complete the token purchasing functionality to complement the NFT marketplace.
- **Smart Contract Upgrades:** Replace minimal ERC20 implementations with actual Universal Token contracts from standard-contracts repository.

## 12. Universal NFT Feature

### 12.1 Overview

The Universal NFT feature extends the Universal Token Launcher to support the creation, purchase, and transfer of NFTs across multiple blockchains. Unlike traditional NFTs, Universal NFTs can be minted on any supported chain and transferred seamlessly between chains using ZetaChain's interoperability.

### 12.2 Features & Functional Requirements

#### 12.2.1 NFT Collection Creation

- **Collection Configuration Panel:**
  - **Input Fields:** Collection Name, Description, Quantity, Price
  - **Image Upload:** Allow creators to upload collection artwork/images
  - **Free Distribution:** Option to distribute free NFTs to a list of addresses (reusing existing token distribution functionality)
  
- **Fee Verification & Payment:**
  - Similar to token creation, display a hardcoded ZETA fee
  - Verify wallet has sufficient ZETA balance
  - Process single transaction payment to Universal Token Service wallet

#### 12.2.2 NFT Purchase

- **ZRC20 Payment Support:**
  - Allow users to purchase NFTs using any ZRC20 asset, including Bitcoin
  - Display supported payment options with current balance
  
- **Cross-Chain Minting:**
  - Allow users to select any chain for NFT minting, independent of the payment chain
  - Example: Pay with BTC (on Bitcoin chain) and mint on BASE or ZetaChain
  - Display clear option selection for both payment asset and destination chain

- **Purchase Confirmation:**
  - Show transaction preview with fees and estimated completion time
  - Process payment and track minting status with clear notifications

#### 12.2.3 NFT Transfer

- **NFT Dashboard:**
  - Display all owned Universal NFTs grouped by collection
  - Show which chain each NFT currently exists on
  
- **Transfer Interface:**
  - Allow selection of source NFT and destination chain
  - Process cross-chain transfer (burning and minting) with status updates
  - Maintain NFT metadata and properties across chains

### 12.3 User Stories & Acceptance Criteria

#### User Story 1: NFT Creator – Launch a Universal NFT Collection

- **Story:** As a creator, I want to configure and launch my NFT collection across multiple chains with minimal technical complexity.
- **Acceptance Criteria:**
  - I can enter collection details (name, description, quantity, price)
  - I can upload artwork for my NFT collection
  - I can optionally specify addresses for free distribution
  - Upon fee payment, the collection is deployed and available for purchase

#### User Story 2: NFT Buyer – Purchase with Any ZRC20 Asset

- **Story:** As a buyer, I want to purchase an NFT using my preferred cryptocurrency and receive it on my preferred chain.
- **Acceptance Criteria:**
  - I can select any ZRC20 asset, including Bitcoin, for payment
  - I can choose any supported chain to receive my NFT
  - The purchase process completes with clear status updates
  - I can view my newly purchased NFT in my dashboard

#### User Story 3: NFT Holder – Transfer NFT Between Chains

- **Story:** As an NFT holder, I want to move my NFT from one chain to another easily.
- **Acceptance Criteria:**
  - I can view all my NFTs across different chains
  - I can select an NFT and initiate a transfer to another chain
  - The transfer process burns the NFT on the source chain and mints it on the destination chain
  - I receive clear status notifications throughout the process

### 12.4 Technical Requirements

- **Smart Contracts:** Utilize ZetaChain's interoperability for cross-chain NFT management
- **Metadata Storage:** Ensure NFT metadata is preserved during cross-chain transfers
- **ZRC20 Integration:** Support payment with any ZRC20 asset through ZetaChain
- **Transaction Handling:** Process complex cross-chain operations with proper error handling and status tracking

## 13. Current Implementation Status & Known Issues

### 13.1 Implementation Status

- **Smart Contracts:**
  - ✅ Successfully created Hardhat project for contract development
  - ✅ Implemented base UniversalToken contract with core ERC20 functionality
  - ✅ Implemented ZetaChainUniversalToken for cross-chain transfers from ZetaChain
  - ✅ Implemented EVMUniversalToken for cross-chain transfers from other EVM chains
  - ✅ Deployed contracts to ZetaChain Testnet (address: 0x51d5D00dfB9e1f4D60BBD6eda288F44Fb3158E16)
  - ✅ Deployed contracts to Sepolia Testnet (address: 0x0b3D12246660b41f982f07CdCd27536a79a16296)
  - ✅ Implemented and tested cross-chain connectivity
  - ✅ Successfully simulated cross-chain transfers
  
- **Backend:**
  - ✅ Express.js server setup with proper middleware
  - ✅ Database models implemented (TokenConfiguration, DeploymentLog, TokenDistribution)
  - ✅ ContractService for smart contract deployment across chains
  - ✅ TokenService for token configuration and deployment management
  - ✅ Basic wallet-based authentication middleware
  - ✅ File upload handling for token icons and CSV files
  - ✅ Token creation and deployment endpoints
  - ✅ Fee verification for token deployment
  - ✅ Deployment status tracking and error handling
  - ✅ Testing utilities for contract deployment and token services

- **Frontend:**
  - React application with wagmi integration
  - Wallet connection functionality
  - Basic navigation and layout components

### 13.2 Fixed Issues

- **Bytecode.js Syntax Errors:**
  - ✅ Fixed issue with unclosed comment blocks
  - ✅ Properly formatted bytecode string literals
  - ✅ Added proper documentation
  - ✅ Implemented dynamic artifact loading from smart contracts directory

- **API Error Handling:**
  - ✅ Implemented standardized error responses
  - ✅ Added detailed logging for deployment issues
  - ✅ Added chain-specific error tracking
  
- **Contract Deployment Issues:**
  - ✅ Addressed private key formatting issues
  - ✅ Implemented proper RPC URL configuration
  - ✅ Added support for ZetaChain Testnet
  - ✅ Configured sequential deployment flow
  - ✅ Implemented chain connection after deployment

- **Database Integration:**
  - ✅ Implemented proper database models and relationships
  - ✅ Created database initialization scripts
  - ✅ Added migration support

### 13.3 Known Limitations

- **Contract Implementation:**
  - Current implementation simulates cross-chain messaging but doesn't use actual ZetaChain connectors
  - Need to integrate with official ZetaChain gateway and omnichain contracts
  - Real implementation will require integration with ZetaChain's cross-chain messaging protocol

- **Error Recovery:**
  - Limited retry mechanisms for failed deployments
  - Insufficient error details for complex deployment failures

- **Testing Coverage:**
  - Limited testing of contract deployment on multiple chains
  - Need comprehensive integration tests

- **Backend Security:**
  - Basic authentication mechanism needs improvement for production
  - Need to implement JWT-based authentication with wallet signatures
  - Should implement rate limiting for API endpoints

- **Token Distribution:**
  - Initial token distribution functionality is implemented but not fully tested
  - Need to add functionality to distribute tokens after deployment

## 15. Smart Contract Architecture

### 15.1 Contract Structure

The Universal Token Launcher uses a hierarchical contract structure:

1. **Base UniversalToken Contract:**
   - Extends OpenZeppelin's ERC20 and Ownable
   - Provides basic token functionality (mint, burn, transfer)
   - Customizable decimals

2. **ZetaChainUniversalToken:**
   - Deployed on ZetaChain
   - Tracks connected contracts on other chains
   - Handles cross-chain messaging and token transfers
   - Manages token minting and burning for cross-chain operations

3. **EVMUniversalToken:**
   - Deployed on EVM chains (Ethereum, Polygon, Base, etc.)
   - Connects to the ZetaChain contract
   - Handles cross-chain transfers to/from ZetaChain
   - Manages token burning and minting for cross-chain operations

### 15.2 Cross-Chain Mechanism

The cross-chain token transfer mechanism works as follows:
1. User initiates a transfer from chain A to chain B
2. Tokens are burned on chain A
3. A cross-chain message is sent to the ZetaChain contract
4. ZetaChain relays the message to chain B
5. Tokens are minted on chain B

### 15.3 Deployed Contracts

The contracts have been successfully deployed to the following networks:

- **ZetaChain Testnet:**
  - ZetaChainUniversalToken: `0x51d5D00dfB9e1f4D60BBD6eda288F44Fb3158E16`

- **Sepolia Testnet:**
  - EVMUniversalToken: `0x0b3D12246660b41f982f07CdCd27536a79a16296`

## 14. References

- [ZetaChain Standard Contracts](https://github.com/zeta-chain/standard-contracts/)
- Latest ZetaChain documentation and contract deployment guides.
- [Ethers.js Documentation](https://docs.ethers.org/v6/) for contract deployment reference.

## 16. Testing Strategy

### 16.1 Integration Testing Approach

The Universal Token Launcher implements a comprehensive testing strategy focusing on integration tests to ensure that:

1. **Frontend and Backend Integration:**
   - Form submissions correctly format and transmit data to the backend
   - API responses are properly handled and displayed in the UI
   - Loading states are correctly managed
   - Error handling works as expected

2. **User Flow Validation:**
   - Complete token creation workflow functions correctly
   - Token transfer process works end-to-end
   - All user-facing features function as specified in the requirements

### 16.2 Key Test Files

1. **Frontend Integration Tests:**
   - `frontend/src/pages/Launch/LaunchIntegration.test.js` - Tests the token creation and deployment flow
   - `frontend/src/pages/Transfer/TransferIntegration.test.js` - Tests the token transfer flow
   - `frontend/src/utils/apiService.test.js` - Tests API service methods

2. **Backend Tests:**
   - `backend/src/tests/token.test.js` - Tests token configuration and deployment
   - `backend/src/tests/contract.test.js` - Tests smart contract deployment
   - `backend/src/tests/verify-contract.test.js` - Tests contract verification

### 16.3 Test Implementation Details

1. **Mock-Based Testing:**
   - APIs are mocked to simulate various response scenarios
   - Blockchain interactions are mocked to test transactions
   - Loading states are tested with controlled timing

2. **Element Selection Strategy:**
   - DOM elements are selected using role-based queries for reliability
   - Form elements are accessed via label text
   - Buttons are accessed by role and name
   - Example: `screen.getByRole('button', { name: 'Launch Token' })`

3. **Asynchronous Testing:**
   - Loading states are verified before and after data loading
   - `waitFor()` is used with appropriate timeouts
   - API calls are verified to have been made with correct parameters

### 16.4 Running Tests

Tests can be run using the following commands:

```bash
# Frontend tests
npm test                                             # Run all tests in watch mode
npm test -- --testMatch="**/*Integration.test.js"    # Run all integration tests
npm test -- --watchAll=false                         # Run all tests once

# Backend tests
cd backend
npm run test-token-create                            # Test token creation
npm run test-zeta-deploy                             # Test ZetaChain deployment
npm run test-evm-deploy                              # Test EVM chain deployment
```

### 16.5 Continuous Integration

All tests are configured to run in CI/CD pipelines to ensure code quality:

1. **GitHub Actions:**
   - Tests run on every pull request
   - Both frontend and backend tests are executed
   - Test coverage reports are generated

2. **Environment Configuration:**
   - Tests use environment-specific configurations
   - API endpoints are mocked for CI environment
   - Blockchain interactions are simulated

This testing strategy ensures that the Universal Token Launcher maintains high quality and reliability as new features are added and existing code is modified.
