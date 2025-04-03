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

## 6. Technical Requirements (High-Level)

- **System Components:** The solution requires a web frontend, a backend API service, integration with smart contracts, and interaction with multiple blockchain networks.
- **Frontend:** Must provide an intuitive user interface accessible via standard web browsers and integrate with common Web3 wallets.
- **Backend:** Must reliably handle deployment requests, orchestrate cross-chain contract interactions, manage status tracking, and potentially handle initial distributions.
- **Smart Contracts:** Requires Universal Token and Universal NFT smart contracts deployable on ZetaChain and compatible EVM chains, enabling cross-chain functionality.
- **Blockchain Interaction:** The system must securely and reliably interact with ZetaChain and selected EVM networks to deploy contracts, transfer assets, and verify transactions.
- **Contract Verification:** Deployed contracts should be verifiable on relevant block explorers to ensure transparency.

*(Refer to `documentation/tech-stack.md` and `documentation/backend-structure.md` for specific technology choices and architectural details.)*

## 7. Architecture & Workflow (High-Level)

### 7.1 Workflow

1.  **Configuration:** User configures token/NFT details via the frontend.
2.  **Initiation:** User initiates deployment (potentially including a fee payment transaction for tokens).
3.  **Backend Processing:** Backend service receives the request, verifies prerequisites, deploys contracts across chains, links them, distributes initial supply (if applicable), and transfers ownership.
4.  **Transfer:** Users interact with the frontend to initiate cross-chain transfers, which trigger backend/contract interactions (burn on source, message via ZetaChain, mint on destination).

### 7.2 Components (High-Level)

- **Frontend:** User interface for configuration, deployment initiation, and asset transfer.
- **Backend Services:** API Layer, Deployment Service, Database Layer, Blockchain Interaction Layer.

*(Refer to `documentation/backend-structure.md` for a detailed backend architecture overview.)*

## 8. UI/UX Requirements

- **Style:** Modern, futuristic, yet clean and minimal.
- **Design:** Clear forms and buttons, with an emphasis on intuitive navigation.
- **Navigation Structure:** Primary sections for asset creation ("Make") and asset transfer ("Move"). A section for purchasing assets ("Buy") may be included as a future enhancement.
- **Feedback:** Real-time validation, clear status notifications for deployment progress and transfers.
- **Terminology:** Use user-friendly terms like "Move" instead of potentially confusing technical terms like "Bridge".

## 9. Security & Validation

- **Input Validation:** Validate all user inputs on both frontend and backend (e.g., CSV format, addresses, amounts).
- **Smart Contract Security:** Utilize audited or well-tested standard contract implementations where possible.
- **Fee Verification:** Backend must ensure any required deployment fees are correctly paid before proceeding.
- **Transfer Integrity:** Ensure cross-chain transfer mechanism securely burns and mints assets.
- **Access Control:** Protect sensitive backend operations.

## 10. Success Criteria

- **For Creators:** Ability to configure and launch Universal assets relatively quickly via the UI.
- **For Asset Holders:** Seamless and reliable cross-chain transfer experience.
- **Overall System:** Demonstrates ZetaChain's interoperability effectively; backend is reliable and scalable.

## 11. Future Enhancements

- **Extended Chain Support:** Add support for non-EVM chains.
- **On-Chain Deployment:** Explore fully on-chain deployment mechanisms.
- **Advanced Configuration:** Dynamic fees, advanced distribution options.
- **UI/UX Polish:** Integration of professional design mockups, mobile responsiveness.
- **Analytics & Monitoring:** Dashboards for system health and usage.
- **Marketplace Features:** Token/NFT purchasing functionality.

## 12. Universal NFT Feature

*(This section outlines specific requirements for NFT functionality, following the same principles as Universal Tokens)*

### 12.1 Overview

The Universal NFT feature extends the launcher to support cross-chain NFTs.

### 12.2 Features & Functional Requirements

#### 12.2.1 NFT Collection Creation
- Configuration Panel (Name, Description, Quantity, Price, Artwork, optional free distribution list).
- Similar fee verification & payment process as tokens (if applicable, TBD based on backend implementation).

#### 12.2.2 NFT Purchase (Future Enhancement)
- Support for payment via various ZRC20 assets (including cross-chain like Bitcoin via ZetaChain).
- Allow user to select minting chain independent of payment chain.
- Clear purchase confirmation and status tracking.

#### 12.2.3 NFT Transfer
- Dashboard displaying owned NFTs and their current chain.
- Simple interface to select NFT and destination chain for transfer.
- Secure cross-chain burn/mint process with status updates.

### 12.3 User Stories & Acceptance Criteria
*(Similar structure to token user stories, adapted for NFTs)*

#### User Story 1: NFT Creator – Launch Collection
- **Story:** As a creator, I want to easily configure and launch my NFT collection across multiple chains.
- **Acceptance Criteria:** Can enter details, upload art, pay fee (if any), collection becomes available.

#### User Story 2: NFT Buyer – Purchase with Any ZRC20
- **Story:** As a buyer, I want to use my preferred crypto to buy an NFT and choose where it's minted.
- **Acceptance Criteria:** Can select payment asset, select destination chain, purchase completes, NFT appears in dashboard.

#### User Story 3: NFT Holder – Transfer NFT
- **Story:** As an NFT holder, I want to move my NFT between chains easily.
- **Acceptance Criteria:** Can view NFTs, select one, choose destination, transfer completes, NFT location updates.

### 12.4 Technical Requirements
- Utilize ZetaChain interoperability for NFT transfers.
- Ensure metadata persistence across chains.
- Integrate ZRC20 payment handling via ZetaChain.
- Robust transaction handling for cross-chain NFT operations.

## 13. References 
*(Renumbered from 14)*

- [ZetaChain Standard Contracts](https://github.com/zeta-chain/standard-contracts/)
- Latest ZetaChain documentation and contract deployment guides.
- [Ethers.js Documentation](https://docs.ethers.org/v6/)

*(End of Document: Sections 15 and 16 removed)*
