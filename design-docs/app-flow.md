```markdown
# Universal Token Launcher – Application Flow Document

This document provides a detailed blueprint for developers to build the frontend and backend of the Universal Token Launcher. It outlines the user journey, screens, decision points, API interactions, data flow, error handling, and roles/permissions.

> **Note:** All references to “bridging” have been updated to “transfers” to reflect that Universal Tokens are now designed to transfer tokens between chains via a burn (source) and mint (destination) mechanism.

---

## 1. User Journey Flow

### 1.1. Onboarding / Initial Access
- **User Connects Wallet:** 
  - User lands on the landing page.
  - A “Connect Wallet” button prompts the user to connect their Web3 wallet (e.g., MetaMask).
  - Upon successful connection, the app detects the wallet address and available ZETA balance.
  
### 1.2. Token Creator Flow
1. **Dashboard Access:**
   - After wallet connection, the token creator is presented with a dashboard.
2. **Token Configuration:**
   - **Input Token Details:** Token Name, Image/Icon upload, Decimals, Total Supply.
   - **CSV Upload:** Option to upload a CSV file (max 100 entries) with columns: wallet address, chain ID, and token amount.
3. **Chain Selection:**
   - A dropdown allows selection of available EVM chains.
   - Additional chains (Solana, TON, SUI) are visible as “Coming Soon” (disabled).
4. **Fee Verification & Payment:**
   - Display the hardcoded ZETA fee.
   - The app verifies the connected wallet’s ZETA balance.
   - User clicks “Deploy Token” which triggers the fee payment process (single transaction signing).
5. **Deployment Processing:**
   - On fee confirmation, the backend deployer service is triggered.
   - Status updates are displayed (e.g., “Fee Received,” “Deploying on Chain X,” “Token Distribution Complete”).
6. **Confirmation:**
   - Once deployment and token distribution complete, a success screen is shown with summary details (deployed contract addresses, token distribution summary).

### 1.3. Token Holder Flow
1. **Dashboard Access:**
   - Token holders see a dashboard with their token balances across chains.
2. **Token Transfer:**
   - A “Transfer Tokens” section provides a one-click or guided interface.
   - User selects the desired transfer action (from one chain to another).
   - The process triggers a burn on the source chain and a mint on the destination chain.
3. **Status & Notifications:**
   - Real-time notifications are provided during transfers.
   - Confirmation of success or error messages if a transfer fails.

### 1.4. Settings / Additional Actions
- **User Settings:** (if applicable in future iterations)
  - Wallet details, transaction history, and network preferences.
- **Help & Support:** Access to documentation and error troubleshooting guides.

---

## 2. Screens & States

### 2.1. Landing / Onboarding Screen
- **State:** Not connected
- **Elements:** "Connect Wallet" button, brief app description.
- **Action:** Initiate wallet connection.

### 2.2. Dashboard – Token Creator
- **State:** Connected wallet with creator role (implicitly identified by action context).
- **Elements:**
  - Token configuration form (name, icon, decimals, total supply).
  - CSV file upload control.
  - Chain selection dropdown.
  - Fee display and “Deploy Token” button.
- **States:**
  - **Form Validation Errors:** Highlight invalid fields (e.g., CSV format issues).
  - **Deployment In-Progress:** Loading spinner/status messages.
  - **Success Confirmation:** Summary of deployment (contract addresses, CSV distribution summary).

### 2.3. Dashboard – Token Holder
- **State:** Connected wallet (non-creator role).
- **Elements:**
  - Overview of token balances across chains.
  - “Transfer Tokens” button (or dual options if implementing separate “Transfer In” and “Transfer Out” flows).
- **States:**
  - **Transfer Action Confirmation:** Prompt for confirmation before initiating a transfer.
  - **Transfer Processing:** Status update with progress bar.
  - **Transfer Success/Error:** Success message or error notification.

### 2.4. Transaction & Error States
- **State:** API error or blockchain transaction failure.
- **Elements:** Error messages, retry options.
- **Actions:** Allow user to retry fee payment, re-upload CSV, or reinitiate a transfer action.

---

## 3. Decision Points

### 3.1. Fee Verification
- **Logic:** Check if the connected wallet has sufficient ZETA.
- **Impact:** If insufficient, display error and disable “Deploy Token” button.

### 3.2. CSV File Validation
- **Logic:** Validate CSV structure (max 100 rows, correct columns, valid address formats).
- **Impact:** If invalid, show error state prompting user to correct the CSV.

### 3.3. Chain Selection
- **Logic:** Based on the chain selected, enable/disable options.
- **Impact:** Selecting a disabled chain (e.g., Solana) prevents further action with a “Coming Soon” tooltip.

### 3.4. Deployment Process
- **Logic:** After fee transaction confirmation, trigger backend service.
- **Impact:** If backend fails to deploy on a chain, display a detailed error message and allow retry for that specific chain.

### 3.5. Transfer Decision (Token Holder)
- **Logic:** User selects the transfer action.
- **Impact:** Determines the burning of tokens on the source chain and minting on the destination chain.
- **Additional Check:** Validate token balance availability before proceeding.

---

## 4. API Interaction Points

### 4.1. Wallet Connection
- **Internal API:** Web3 provider integration (e.g., MetaMask via ethers.js).
- **Data Returned:** Wallet address, ZETA balance.

### 4.2. Fee Verification
- **Internal API:** Call to ZetaChain API to check token balance.
- **Data Returned:** Confirmation of sufficient ZETA tokens.

### 4.3. CSV Upload & Validation
- **Frontend API:** Client-side CSV parser and validation library.
- **Data Flow:** Parsed CSV data sent to backend for further processing if needed.

### 4.4. Deployment Trigger
- **Internal API:** Backend deployer service endpoint.
- **Data Sent:** Token configuration details, CSV distribution data, selected chains, fee transaction details.
- **Data Returned:** Deployment status updates, deployed contract addresses.

### 4.5. Transfer Operations
- **Internal API:** Backend endpoint for initiating token transfers (burn on source, mint on destination).
- **Data Sent:** Transfer action details (source chain, destination chain, amount, user address).
- **Data Returned:** Transfer status, transaction hash, success or failure notifications.

### 4.6. Status Updates & Notifications
- **Internal API:** Polling endpoints or WebSocket connections for real-time transaction status.
- **Data Returned:** Deployment progress, transfer transaction status, error codes.

---

## 5. Data Flow

1. **User Input:**
   - Token details and CSV file are entered/uploaded on the frontend.
   - Wallet connection provides user address and ZETA balance.
2. **Frontend Processing:**
   - Validate CSV file and token input data.
   - Display fee and chain selection options.
3. **Fee Payment:**
   - User signs a transaction to pay the fixed ZETA fee.
   - Wallet transaction is confirmed; frontend updates status.
4. **Backend Interaction:**
   - On fee confirmation, frontend sends token configuration and CSV data to the backend deployer service.
   - Backend validates fee payment, deploys contracts, and distributes tokens.
5. **Response Handling:**
   - Backend returns deployment status updates and contract addresses.
   - Frontend displays success/error states accordingly.
6. **Transfer Process:**
   - Token holder initiates a transfer action.
   - Frontend sends transfer request to backend.
   - Backend processes the burn (source chain) and mint (destination chain) actions and returns real-time status updates.

---

## 6. Edge Cases / Error States

### 6.1. Insufficient Fee Balance
- **Detection:** Wallet API returns a ZETA balance below the fixed fee.
- **Handling:** Disable “Deploy Token” button; show error message prompting user to top up.

### 6.2. CSV Validation Failure
- **Detection:** CSV parser finds missing columns, invalid addresses, or exceeds 100 entries.
- **Handling:** Display an error modal with guidance on proper CSV format; prevent proceeding until corrected.

### 6.3. Backend Deployment Failure
- **Detection:** API response indicates deployment error (e.g., smart contract error, network issue).
- **Handling:** Display detailed error message; allow user to retry the failed deployment for specific chain(s).

### 6.4. Transfer Transaction Failure
- **Detection:** Backend or blockchain API returns an error during the transfer process.
- **Handling:** Show error notification with a “Retry” option; log transaction details for debugging.

### 6.5. Network/API Timeouts
- **Detection:** API calls to blockchain or backend service time out.
- **Handling:** Display timeout error; provide a “Retry” button and advise user to check network connectivity.

---

## 7. Roles and Permissions

### 7.1. Token Creator
- **Implicit Role:** Determined by usage context (i.e., entering token configuration).
- **Permissions:**
  - Access token configuration form.
  - Initiate fee payment and deployment.
  - View deployment status and results.
- **Note:** There is no explicit role authentication beyond wallet connection; the flow is determined by the actions the user takes.

### 7.2. Token Holder
- **Implicit Role:** Any user who holds the token.
- **Permissions:**
  - View token balances.
  - Initiate token transfers.
  - Access transaction history.
- **Note:** Similar to the creator, the role is determined by the context and available actions based on wallet connection.

---

## 8. Summary

- **User Journey:** Wallet connection → Token configuration (for creators) or Dashboard view (for holders) → Fee payment & contract deployment or token transfer.
- **Screens & States:** Landing, Creator Dashboard, Holder Dashboard, Transaction Status, Error Modals.
- **Decision Points:** Sufficient fee balance, valid CSV input, chain selection, transfer action confirmation.
- **API Interactions:** Wallet connection, fee balance check, backend deployer service, transfer endpoint, and status polling.
- **Data Flow:** User inputs flow to frontend validation, then to backend processing, with real-time status updates returned to the UI.
- **Edge Cases:** Insufficient funds, CSV errors, backend failures, and network timeouts are gracefully handled with clear user prompts.
- **Roles:** Token creator vs. token holder are determined by the actions they perform post-wallet connection.

This updated blueprint serves as a guide for both frontend and backend development to ensure a cohesive, user-friendly, and robust Universal Token Launcher that focuses on cross-chain token transfers.
```