# Universal Token Launcher Product Requirements Document

## 1. Overview

The Universal Token Launcher is a web application that allows non-developer users (familiar with Web3 wallets) to deploy a Universal Token across multiple EVM chains with a simple, single-signed transaction. Leveraging ZetaChain's interoperability via Standard Contracts, the app minimizes the token creator's manual steps while automating cross-chain contract deployments and token distributions. Unlike traditional bridging, Universal Tokens are designed for transferring tokens between chains as needed.

## 2. Objectives

- **Simplify Token Deployment:** Enable token creators to configure key token parameters and deploy contracts with minimal friction.
- **Cross-Chain Compatibility:** Automatically deploy Universal Token contracts on all selected EVM chains.
- **Fee Management:** Ensure the token creator pays a hardcoded ZETA fee (verified before deployment) to the Universal Token Service wallet.
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
  - Display a hardcoded ZETA fee.
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

- **Technologies:** HTML, CSS (with a modern, sleek design), and vanilla JavaScript.
- **Wallet Integration:** Use Web3 libraries (ethers.js or web3.js) for connecting to wallets (e.g., MetaMask).
- **Technologies:** React.js with Create React App, along with styled-components for component-scoped styling.
- **Wallet Integration:** Utilize wagmi (v2.x) in conjunction with ethers.js (v6.x) and @rainbow-me/rainbowkit for efficient wallet connections.
- **UI/UX:** Simple, intuitive, and responsive design for desktop (with potential mobile support in future iterations).

### 6.2 Backend

- **Language:** Preferably Python (or NodeJS if necessary).
- **Functionality:**
  - **Deployer Service:** Monitors for fee payment, verifies the token creator's wallet, and initiates deployment on selected chains.
  - **Contract Deployment:** Automatically deploys Universal Token contracts across chosen EVM chains using ZetaChain Standard Contracts.
  - **Token Distribution:** Processes the CSV input and triggers minting/distribution transactions.
- **Transfer Processing:** Handles token transfers (burn on source, mint on destination) securely via cross-chain messaging.

### 6.3 Integration with ZetaChain

- **Smart Contracts:** Utilize existing Universal Token contracts from the [ZetaChain Standard Contracts](https://github.com/zeta-chain/standard-contracts/) repository.
- **Fee Handling:** The ZETA fee is fixed; no dynamic gas price adjustments required for the MVP.
- **Transfer Mechanism:** Replace traditional bridging terminology with "transfers" that reflect burning and minting operations.

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
- **Backend Deployer Service:** Automates contract deployment, token distribution, and cross-chain transfer messaging.
- **Blockchain Interaction:** Leverages Web3 libraries to interact with ZetaChain and connected chains.

## 8. UI/UX Requirements

- **Style:** Modern, futuristic, yet clean and minimal.
- **Design:** Clear forms and buttons, with an emphasis on intuitive navigation.
- **Feedback:** Real-time validations, notifications for fee status, deployment progress, and transfer confirmations.
- **Terminology:** All references to "bridging" have been updated to "transfers" for clarity.

## 9. Security & Validation

- **CSV Validation:** Ensure uploaded CSV entries are formatted correctly (valid wallet addresses and chain IDs).
- **Smart Contract Security:** Use battle-tested contract examples from ZetaChain's Standard Contracts.
- **Fee Verification:** Backend deployer must verify the token creator's ZETA balance before initiating deployment.
- **Transfer Integrity:** Cross-chain transfers should include measures to ensure that tokens are securely burned on the source chain and minted correctly on the destination chain.

## 10. Success Criteria

- **For Token Creators:**
  - Ability to configure and launch a Universal Token in under 5 minutes using a single fee payment.
  - Automated deployment on all selected chains with accurate token distribution.
- **For Token Holders:**
  - Seamless token transfer experience across chains with clear status updates.
  - Reliable burning and minting mechanisms that ensure token integrity.
- **Overall System:**
  - Backend reliability and robust cross-chain messaging.
  - Effective demonstration of ZetaChain's cross-chain interoperability for token transfers.

## 11. Future Enhancements

- **Extended Chain Support:** Expand full support to non-EVM chains (e.g., Solana, TON, SUI) beyond "Coming Soon" placeholders.
- **On-Chain Deployment:** Explore fully on-chain deployment mechanisms if feasible.
- **Advanced Validations:** Implement dynamic fee calculations and enhanced CSV validations.
- **Enhanced UI/UX:** Integrate designer mockups and possibly mobile responsiveness for a more polished look.
- **Analytics & Monitoring:** Add dashboards for monitoring cross-chain transactions and transfer statuses.

## 12. References

- [ZetaChain Standard Contracts](https://github.com/zeta-chain/standard-contracts/)
- Latest ZetaChain documentation and contract deployment guides.
