# Universal Launcher Application Flow

This document provides a comprehensive walkthrough of the user journey through the Universal Launcher application, with special attention to potential pain points and best practices based on our implementation experience.

---

## 1. User Entry & Wallet Connection

### Flow Stages
1.  **Initial Landing**
    *   User arrives at the application landing page.
    *   System presents a welcome message and a prominent "Connect Wallet" button.

2.  **Wallet Connection**
    *   User clicks "Connect Wallet".
    *   System displays a wallet selection modal (e.g., using RainbowKit).
    *   User selects their preferred wallet provider (MetaMask, Coinbase Wallet, etc.).
    *   System initiates the connection request to the selected wallet.
    *   User confirms the connection request within their wallet application.

3.  **Network Validation & Setup (Crucial Step)**
    *   Upon successful connection, the system checks the user's current network.
    *   **If the user is not on the required ZetaChain network:**
        *   System displays a clear message prompting the user to switch to ZetaChain.
        *   A "Switch to ZetaChain" button is presented.
    *   **User clicks "Switch to ZetaChain":**
        *   System sends a network switch request (`wallet_switchEthereumChain`) to the user's wallet for the ZetaChain network ID.
        *   **If ZetaChain is not configured in the user's wallet:** The switch request might fail. The system should anticipate this and follow up with a request to *add* the ZetaChain network (`wallet_addEthereumChain`) providing the necessary chain details (Chain ID, Name, RPC URL, Symbol, Explorer URL).
    *   User approves the network switch and/or addition in their wallet.
    *   System confirms the user is now connected to the correct ZetaChain network.

### Key Technical Considerations (Without Code)

*   **Network Detection & Switching Logic:** The frontend must reliably detect the connected chain ID. The switching logic should handle both `wallet_switchEthereumChain` and the fallback `wallet_addEthereumChain` requests seamlessly to ensure users can easily get onto the correct network.
*   **Balance Check:** Once connected to ZetaChain, the system should fetch and display the user's native ZETA balance using appropriate hooks (e.g., `useBalance` from wagmi).
*   **Conditional Rendering:** The main application interface (Make/Move sections) should only be fully accessible *after* the wallet is connected *and* validated to be on the ZetaChain network. Until then, clear guidance or prompts for connection/switching should be displayed.

---

## 2. Make Flow (Create Assets)

### Flow Stages
1.  **Asset Type Selection**
    *   User navigates to the "Make" section.
    *   System presents clear options (e.g., using distinct visual cards) to select between creating a "Token" or an "NFT Collection".
    *   User selects their desired asset type.
    *   System dynamically displays the appropriate creation form.

2.  **Token Creation Form** (if "Token" selected)
    *   User fills in required token details: Name, Symbol, Total Supply (as a string for large numbers), Decimals (defaulting to 18).
    *   User optionally uploads a token icon image.
    *   User selects the target EVM chains for deployment (ZetaChain is implicitly included).
    *   User optionally provides initial token distribution details, often via a CSV upload (address, amount per address, max ~100 entries).

3.  **NFT Collection Creation Form** (if "NFT Collection" selected)
    *   User fills in collection details: Name, Symbol, Base URI (for metadata), Max Supply.
    *   User uploads collection artwork/image.
    *   User selects target EVM chains for deployment.
    *   User optionally configures a free NFT distribution list.

4.  **Fee Information & Validation**
    *   System clearly displays the required fixed deployment fee (e.g., 1 ZETA).
    *   System shows the user's current ZETA balance (fetched earlier).
    *   System validates that the user has sufficient ZETA balance to cover the fee *before* enabling the deployment/payment button.
    *   System validates all form inputs (required fields, formats, supply vs. distribution amounts if applicable).

### Key Technical Considerations (Without Code)

*   **Dynamic Form Rendering:** Use conditional rendering based on the selected asset type (Token/NFT) to show the correct form fields.
*   **Visual Selection:** Implement the Token/NFT selection using clear, interactive UI elements like cards.
*   **Form Data Preparation:** Ensure data submitted to the backend API matches the expected format (field names like `token_name`, data types like strings for large numbers, JSON strings for arrays/objects).
*   **CSV Parsing & Validation:** If CSV upload is used for distribution, implement robust client-side parsing and validation (checking for required columns, correct address formats, valid amounts, total distribution vs. total supply).
*   **Input Validation:** Perform thorough client-side validation of all form fields to provide immediate feedback and prevent invalid API requests.
*   **Fee & Balance Check:** Reliably compare the required fee (as a BigInt or formatted number) with the user's fetched ZETA balance.

---

## 3. Asset Deployment Process

### Flow Stages
1.  **Initiation & Fee Payment (Tokens Only)**
    *   User clicks the "Deploy" button after filling the form.
    *   System performs final client-side validation.
    *   **(Tokens):** System sends the initial token configuration to the backend (`POST /api/deploy`) to get a `deployment_id`.
    *   **(Tokens):** System prompts the user to pay the fixed ZETA fee via a wallet transaction (`sendTransactionAsync`). The transaction must be explicitly sent on the ZetaChain network.
    *   User approves the fee transaction in their wallet.
    *   System displays the fee transaction hash immediately with an explorer link.
    *   System waits for on-chain confirmation of the fee transaction (using `waitForTransactionReceipt` with polling/retries).
    *   **(Tokens):** Upon confirmation, system sends the `deployment_id` and the `fee_paid_tx` hash back to the backend (`POST /api/deploy` again) to trigger the actual deployment process.
    *   **(NFTs):** System sends the complete NFT configuration directly to the backend (`POST /api/nft/deploy`), which handles the entire deployment without a separate frontend fee payment step.

2.  **Deployment Status Tracking & Polling (Frontend)**
    *   Backend initiates the asynchronous deployment process across selected chains.
    *   Frontend enters a polling state, displaying clear status messages (e.g., "Deployment initiated", "Deploying contracts on ZetaChain...", "Connecting contracts...").
    *   Frontend periodically calls the backend status endpoint (`GET /api/token/{id}` or `GET /api/nft/collection/{id}`) to check the overall `deployment_status` field.
    *   Polling continues at intervals (e.g., every 5-10 seconds) as long as the status is pending/processing.

3.  **Deployment Completion / Confirmation**
    *   **If backend status becomes `completed`:**
        *   Polling stops.
        *   Frontend fetches the final detailed deployment information from the backend status endpoint.
        *   Frontend updates the UI to display a clear success confirmation.
        *   Confirmation includes: Token/NFT name, links to view the primary ZetaChain contract and contracts on each selected EVM chain on their respective explorers, and verification status badges.
        *   Option to start a new deployment is presented.
    *   **If backend status becomes `failed`:**
        *   Polling stops.
        *   Frontend fetches the final status, including any error messages from the backend.
        *   Frontend displays a clear error message explaining that the deployment failed, potentially showing specific error details if available.
        *   Option to retry (if applicable) or start a new deployment is presented.

### Key Technical Considerations (Without Code)

*   **Transaction Handling (Fee Payment):** Implement robust handling for the fee payment transaction, including gas estimation, user rejection, network errors, and confirmation polling with timeouts and retries. Display the hash immediately.
*   **API Interaction Workflow:** Strictly follow the backend's expected API call sequence (e.g., the two-step process for tokens vs. one step for NFTs).
*   **Asynchronous Polling:** Use `useEffect` hooks with proper dependency management and cleanup (clearing intervals) for polling the backend deployment status.
*   **State Management:** Maintain clear frontend state variables to track the deployment progress (e.g., `IDLE`, `CREATING_CONFIG`, `AWAITING_FEE_PAYMENT`, `CONFIRMING_FEE`, `AWAITING_BACKEND_DEPLOYMENT`, `POLLING_STATUS`, `COMPLETED`, `FAILED`).
*   **User Feedback:** Provide continuous and informative feedback throughout the potentially multi-minute deployment process. Use loading spinners, status messages, and progress indicators.
*   **Confirmation Display:** Render a dedicated, clear confirmation component upon success, showing all relevant contract addresses and explorer links derived from the final backend API response.

---

## 4. Move Flow (Transfer Assets)

### Flow Stages
1.  **Asset & Type Selection**
    *   User navigates to the "Move" section.
    *   System presents options (e.g., visual cards) to select between moving "Tokens" or "NFTs".
    *   System fetches and displays the user's owned assets of the selected type (potentially calling `/api/users/{address}` and supplementing with direct contract reads for real-time balances).

2.  **Token Move Interface** (if "Tokens" selected)
    *   User views their tokens, possibly grouped (e.g., "Tokens You Made", "Tokens You Hold") or sorted.
    *   Each token card displays the name, symbol, and balances across different chains.
    *   User selects a specific token to move.
    *   System displays a dedicated "Move Panel" or section for the selected token.
    *   User selects the *source chain* from which to move the tokens (must have a balance > 0). This might be auto-selected if the user only holds the token on one chain.
    *   User selects the *destination chain* from the list of other supported, connected chains for that token.
    *   User enters the *amount* to move (validation against source chain balance occurs).
    *   User optionally enters a recipient address (defaults to their own address if left blank).
    *   User clicks "Initiate Move".

3.  **NFT Move Interface** (if "NFTs" selected)
    *   User views their owned NFTs, likely grouped by collection.
    *   User selects a specific NFT to move (showing its current chain location).
    *   System displays a "Move Panel".
    *   User selects the *destination chain*.
    *   User optionally enters a recipient address.
    *   User clicks "Initiate Move".

4.  **Move Execution & Tracking**
    *   System performs client-side validation (amount, addresses).
    *   System ensures the user is connected to the selected *source chain* network (prompting a switch if necessary).
    *   **(Crucial Check):** System may perform a read-only call to the source contract to verify cross-chain setup is complete (e.g., `connectedContracts` or `zetaChainContract` is set) before proceeding.
    *   System prepares and prompts the user to sign the cross-chain move transaction via their wallet (interacting directly with the `crossChainMove` function or similar on the source chain contract).
    *   User approves the transaction.
    *   System displays the source chain transaction hash and confirmation status.
    *   System provides feedback indicating the cross-chain message is being processed (this may take several minutes depending on ZetaChain processing).
    *   (Optional/Advanced): System might monitor ZetaChain or the destination chain for the corresponding mint event to confirm completion, or rely on the user checking their balance later.

### Key Technical Considerations (Without Code)

*   **Asset Display:** Fetch and display user assets, potentially combining backend data (`/api/users/{address}`) with real-time on-chain balance checks (`balanceOf` calls) for accuracy.
*   **Chain Selection Logic:** Dynamically populate source and destination chain selectors based on where the selected asset exists and is connected.
*   **Direct Contract Interaction:** Use `ethers.js` / `wagmi` (`useContractWrite`) to interact directly with the deployed Universal Token/NFT contract's `crossChainMove` (or similar) function on the selected source chain.
*   **Network Management:** Ensure the user's wallet is connected to the correct *source chain* before initiating the move transaction.
*   **Pre-Move Checks:** Implement read-only contract calls to verify necessary cross-chain setup/links are configured on the contracts to prevent transactions that are guaranteed to fail on-chain.
*   **Amount Formatting:** Use `ethers.parseUnits` with the correct token decimals when preparing the transaction amount.
*   **Status Feedback:** Provide clear feedback during the transaction signing, confirmation on the source chain, and the subsequent cross-chain processing period. Acknowledge that the cross-chain part takes time.

---

## 5. Error Handling & Recovery

### Common Error Scenarios
1.  **Wallet Errors:** Connection failures, user rejections, network switching problems.
2.  **Transaction Errors:** Insufficient funds (gas or tokens), user rejection, on-chain reverts (e.g., invalid parameters, contract state issues like incomplete setup), timeouts.
3.  **API Errors:** Backend service unavailable, invalid requests, server errors.
4.  **Cross-Chain Delays:** Moves not completing instantly due to the nature of cross-chain messaging.

### Technical Implementation (Conceptual)

*   **Frontend Error Boundaries:** Use React error boundaries to catch rendering errors in specific UI sections.
*   **Specific Error Messages:** Catch errors from wallet interactions, API calls, and contract calls. Provide user-friendly messages based on error codes or content (e.g., distinguish user rejection `4001` from insufficient funds).
*   **Transaction State Handling:** Track transaction states (signing, submitted, confirming, confirmed, failed) and update the UI accordingly.
*   **Retry Mechanisms:** Offer retries for certain failures, like fee payment transaction submission (but not necessarily for on-chain reverts).
*   **Clear Feedback for Delays:** For cross-chain moves, manage user expectations by explaining that the process takes time after the initial source chain transaction is confirmed.
*   **Logging:** Implement client-side logging to capture errors and context for easier debugging.

---

## 6. Best Practices & Lessons Learned

### Frontend Best Practices
1.  **Wallet Interaction:** Use robust libraries (`wagmi`, `ethers`). Handle network switching/adding gracefully. Validate connection and network *before* initiating actions.
2.  **Form Handling:** Match backend field names precisely. Validate inputs client-side. Handle large numbers and data types correctly.
3.  **Transaction Lifecycle:** Manage the full lifecycle: prepare -> estimate gas -> sign -> submit -> display hash -> confirm -> handle result. Provide clear UI feedback at each stage.
4.  **Asynchronous Operations:** Handle promises and async operations correctly, especially for polling and transaction confirmation.
5.  **State Management:** Keep UI state consistent with blockchain and backend state.

### Backend Best Practices (Summary)
1.  **API Design:** Use FastAPI for performance and auto-docs. Maintain consistent naming (snake_case). Configure CORS properly.
2.  **Database:** Use SQLAlchemy/Alembic. Commit critical data immediately. Handle migrations carefully.
3.  **Blockchain Interaction:** Use `web3.py`. Manage the service deployer key securely. Ensure `rpc_config.json` is accurate, especially `gateway_address`.
4.  **Error Handling:** Implement robust error handling and logging.