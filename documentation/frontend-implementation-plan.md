# Universal Token Launcher - Frontend Implementation Plan

## 1. Overview & Vision

**Project:** Rebuild the frontend for the Universal Token Launcher application.
**Goal:** Create a top-tier, intuitive, and highly polished Web3 application that simplifies the creation, management, and cross-chain movement of Universal Tokens and NFTs using ZetaChain's interoperability.
**Vision:** This application will set a standard for usability and design in the cross-chain asset space. It should feel modern, fast, reliable, and trustworthy. The user experience must be paramount, abstracting away blockchain complexities wherever possible while providing clarity and control.

## 2. Design Philosophy & Principles

*   **User-Centric:** Design for the target personas (creators and holders), prioritizing ease of use and minimizing friction.
*   **Clarity & Simplicity:** Use clear language ("Move" instead of "Bridge"), intuitive layouts, and focused workflows. The core actions are "Make" (Create) and "Move" (Transfer).
*   **Minimalism:** Adopt a clean, modern aesthetic (refer to existing `frontend/README.md` for initial branding direction: dark theme, premium feel, gradient accents, consistent spacing).
*   **Responsiveness:** Ensure a seamless experience across desktop browsers. Mobile responsiveness is a secondary goal but should be considered.
*   **Feedback & Transparency:** Provide clear, real-time feedback for all actions, especially transactions (status updates, confirmations, errors).
*   **Performance:** Optimize for fast load times and smooth interactions.
*   **Security:** Build with security best practices in mind, especially regarding wallet interactions and data handling.

## 3. Target Audience

*   **Token/NFT Creators:** Users familiar with Web3 wallets but likely not developers. They need a simple interface to configure and deploy assets across multiple chains with a single fee payment.
*   **Token/NFT Holders:** Basic Web3 users who need to view their assets across chains and move them easily between supported networks.
*   **NFT Buyers:** Users who want to purchase NFTs using various ZRC20 assets (including Bitcoin) and mint them on their preferred chain.

## 4. Core Features (Based on PRD & Existing Frontend)

1.  **Make (Create):**
    *   Toggle between creating Universal Tokens or Universal NFT Collections.
    *   **Tokens:** Configure Name, Symbol, Decimals, Total Supply, select target EVM chains, optionally upload icon, optionally provide initial distribution CSV (up to 100 entries).
    *   **NFTs:** Configure Collection Name, Description, Quantity, Price, upload collection artwork, optionally provide free distribution list.
    *   Display fixed ZETA fee (currently 1 ZETA for testing).
    *   Initiate deployment via backend API (single call for NFTs, two calls for Tokens: configure -> pay fee -> confirm fee).
    *   Track deployment progress via backend polling.
    *   Display deployment confirmation with contract addresses and explorer links.
2.  **Move (Transfer):**
    *   Toggle between moving Tokens or NFTs.
    *   Display user's owned assets (Tokens/NFTs) grouped by type/collection.
    *   Show asset balance/location across different chains.
    *   Filter/Sort assets (e.g., "Tokens You Made" vs. "Tokens You Hold").
    *   Select asset, source chain, and destination chain.
    *   Initiate cross-chain move transaction directly via smart contract interaction (burn on source -> message -> mint on destination).
    *   Provide real-time status updates for the move process.
    *   **NEW:** Minting Functionality (within the Move tab/context for a selected Token):
        *   Allow the *owner/deployer* of a token contract (or potentially holders with balance > 0, TBD based on contract permissions) to mint new tokens.
        *   Provide fields for amount and optional recipient address.
        *   Initiate mint transaction directly via smart contract interaction.
3.  **Buy (Future):**
    *   Placeholder section, initially potentially hidden or marked "Coming Soon".
    *   Will eventually allow purchasing listed NFTs using various ZRC20 assets (cross-chain).
4.  **Wallet Integration:**
    *   Connect/disconnect various Web3 wallets.
    *   Display connected wallet address and balance (Native coin, ZETA).
    *   Handle network switching requests.
5.  **Network Mode:**
    *   Switch between Testnet and Mainnet modes.
    *   Filter displayed chains and wallet network configurations accordingly.
    *   Persist user preference (localStorage).

## 5. Recommended Technical Stack

*   **Framework:** React (v18+) or Next.js (v14+) (Next.js preferred for potential future SSR/SSG needs and routing simplicity).
*   **Language:** TypeScript (Strict mode enabled).
*   **Styling:** Tailwind CSS or Styled Components (evaluate based on team preference and desire for utility-first vs. component-scoped styles). Maintain consistency with the 8px grid system and design tokens.
*   **Web3 Interaction:**
    *   `ethers.js` (v6.x) - Core library for blockchain interaction.
    *   `wagmi` (v2.x) - React Hooks for Ethereum interaction, wallet management.
    *   Wallet Connector UI: `@rainbow-me/rainbowkit`, `web3modal`, or `connectkit` (Evaluate based on customizability and UX).
*   **State Management:** React Context API for simple global state (e.g., Network Mode, Wallet Connection). Consider Zustand or Redux Toolkit for more complex client-side state if needed.
*   **Forms:** React Hook Form or Formik for form handling and validation.
*   **Data Fetching:** SWR or React Query for fetching data from the backend API and managing cache/revalidation.
*   **Linting/Formatting:** ESLint, Prettier (configured consistently).
*   **Testing:** Jest, React Testing Library, Viest (for wagmi/Web3 hooks). Consider Playwright or Cypress for E2E testing.

## 6. Architecture

*   **Component-Based:** Structure the application into reusable, well-defined components.
*   **Modular:** Organize code by feature (e.g., `make`, `move`, `wallet`, `shared`) or by type (e.g., `components`, `hooks`, `pages`, `utils`, `contexts`).
*   **Routing:** Implement clear routing for main sections (Make, Move, potentially specific asset views).
*   **Contexts:** Use React Context for global state like wallet connection status, network mode, and potentially user balances if fetched globally.
*   **Hooks:** Create custom hooks for reusable logic, especially for blockchain interactions (`useUniversalTokenContract`, `useCrossChainMove`, `useBackendApi`).
*   **Services/Utils:** Abstract backend API calls (`apiService.ts`) and blockchain utility functions (`blockchainUtils.ts`).

## 7. Interaction Patterns: Backend API vs. Smart Contracts

**Crucially, the frontend interacts with BOTH the backend API AND directly with smart contracts via the user's wallet.**

### 7.1 Backend API Interactions (via `apiService.ts`)

*   **Purpose:** Offload complex/sensitive operations, manage deployment orchestration, store metadata, provide historical data.
*   **Authentication:** The backend might implement wallet-based authentication (e.g., sign-in with Ethereum). If so, the frontend needs to handle the signing flow. (Refer to backend docs).
*   **Data Format:** Backend API uses **snake_case**. Frontend should use **camelCase**. The `apiService` layer MUST handle this conversion reliably for both requests and responses.
*   **Key Calls:**
    *   `GET /api/chains?networkMode={testnet|mainnet}`: Fetch list of supported chains, their details (ID, name, explorer URL), and enabled status based on the selected network mode.
    *   `POST /api/deploy` (For Tokens - Step 1: Configuration): Send token configuration data (name, symbol, decimals, supply, selected chains, allocations CSV data, deployer address). Backend returns a `deployment_id` or similar identifier.
    *   `POST /api/deploy` (For Tokens - Step 2: Fee Confirmation): After the user pays the ZETA fee *on-chain*, send the `deployment_id`, the fee payment transaction hash (`fee_paid_tx`), and potentially the full token config again (TBC based on backend implementation) to the backend to trigger the actual cross-chain deployment process.
    *   `POST /api/nft/deploy`: Send NFT collection configuration data (name, description, quantity, price, distribution list, deployer address, selected chains). Backend handles the entire deployment process.
    *   `GET /api/token/{identifier}?networkMode={testnet|mainnet}`: Fetch details of a specific deployed token/NFT collection (using `deployment_id` or potentially a contract address). Used for polling deployment status (`deployment_status`: pending, deploying, completed, failed) and retrieving final contract addresses, verification status, explorer links, etc.
    *   `GET /api/users/{address}?networkMode={testnet|mainnet}`: Fetch list of tokens/NFTs associated with a user address (likely based on deployments initiated by them and potentially distributions received, TBC based on backend implementation). Returns metadata useful for the "Move" page filters. *Note: This provides historical/backend-tracked data, NOT necessarily real-time on-chain balances.*
    *   `POST /api/verify` (If needed): Potentially an endpoint to trigger contract verification if not fully automated by the backend deployment process. (Refer to backend docs).
    *   You can always get the latest API structure from the /docs endpoint of the backend API. 

### 7.2 Direct Smart Contract Interactions (via `ethers.js`/`wagmi`)

*   **Purpose:** Execute on-chain actions requiring the user's signature, read real-time blockchain state.
*   **Requires:** User's connected wallet (`Signer` object from wagmi/ethers).
*   **Key Calls (using Contract instances):**
    *   **Fee Payment (Token Creation):**
        *   Use `signer.sendTransaction({...})` to send the fixed ZETA fee (e.g., 1 ZETA) to the designated Universal Token Service wallet address **on the ZetaChain network**. The frontend constructs and sends this transaction.
    *   **Cross-Chain Move (Tokens/NFTs):**
        *   Instantiate the `UniversalToken` / `UniversalNFT` contract on the *source* chain using its address (obtained from backend or user input) and ABI.
        *   Call the `crossChainMove(destinationChainId, recipientAddress, amountOrTokenId)` function (or similar based on actual contract ABI) on the source chain contract instance. This requires the user's signature.
        *   The frontend needs to handle amount formatting (using `ethers.parseUnits` with correct decimals) and address validation.
    *   **Minting (Tokens/NFTs - Owner/Deployer Action):**
        *   Instantiate the contract on the relevant chain.
        *   Call the `mint(recipientAddress, amount)` or `mintTokens(...)` function (or similar). Requires owner signature.
    *   **Reading Real-time Balances:**
        *   Instantiate the contract on a specific chain.
        *   Call the `balanceOf(address)` view function. This does *not* require a transaction/signature. Use `ethers.formatUnits` to display correctly.
    *   **Reading Contract State (e.g., checking setup):**
        *   Instantiate the contract.
        *   Call view functions like `connectedContracts(chainId)` (on ZetaChain contract) or `zetaChainContract()` (on EVM contract) to check if cross-chain links are set up *before* attempting a move. This helps provide informative error messages.
    *   **Reading Decimals/Symbol/Name (Optional):**
        *   Call view functions like `decimals()`, `symbol()`, `name()` if this data isn't reliably available from the backend API.

### 7.3 Transaction Handling Flow (Frontend Responsibility)

1.  **Initiation:** User clicks "Pay Fee", "Move", "Mint".
2.  **Validation:** Perform necessary checks (form inputs, wallet connected, correct network, sufficient balance for *gas*). **NEW:** For moves, check if contract cross-chain setup is complete using direct contract reads.
3.  **Preparation:** Construct transaction parameters (target address, value, data encoded using ABI).
4.  **Gas Estimation:** Estimate gas using `contract.METHOD.estimateGas(...)` or `signer.estimateGas(...)`. Apply a buffer (e.g., 20-50%). Handle estimation failures gracefully (use fallback or prompt user).
5.  **Signing:** Request signature from user's wallet via `signer.sendTransaction(...)` or `contract.METHOD(...)`.
6.  **Submission:** Wallet submits the transaction. Frontend receives the transaction hash (`tx.hash`).
7.  **Feedback (Pending):** Display immediate feedback (e.g., "Transaction submitted", show hash with explorer link).
8.  **Confirmation Polling:** Use `tx.wait()` or `publicClient.waitForTransactionReceipt(...)` (from wagmi/viem) with appropriate timeouts and retries to wait for on-chain confirmation.
9.  **Feedback (Confirmed/Failed):** Update UI based on receipt status ('success' or 'reverted'). Display clear success or error messages. Extract revert reasons if possible.
10. **Post-Transaction Steps:** If the transaction was a prerequisite (like fee payment), trigger the next step (e.g., call backend confirmation endpoint).

## 8. Key UI Components & Views

*   **Layout:** Main App Shell (Header, Navigation, Content Area, Footer?).
*   **Header:** Logo, Main Navigation ("Make", "Move", "Buy"), Network Mode Toggle, Wallet Connector Button/Display.
*   **Make View:**
    *   Token/NFT Type Selector (Visual Cards?).
    *   Configuration Form (Inputs: text, number, file upload, CSV upload).
    *   Chain Selector Component (Grid of chain logos, highlight selected, show "Coming Soon").
    *   Fee Display & Payment Button.
    *   Deployment Status Tracker/Modal.
    *   Deployment Confirmation Display.
*   **Move View:**
    *   Token/NFT Type Selector.
    *   Asset Filter/Sort Controls ("Tokens You Made" / "Tokens You Hold").
    *   List/Grid of `TokenCard` / `NFTCard` components displaying asset info and balances per chain.
    *   Move Panel/Modal: Source Chain Selector, Destination Chain Selector, Amount/Token ID Input, Recipient Address Input (optional for NFTs).
    *   Move Status Tracker/Modal.
    *   **NEW:** Mint Panel/Modal (conditional display): Amount Input, Recipient Address Input.
*   **Shared Components:** Buttons, Modals, Spinners/Loaders, Input Fields, Tooltips, Error Message Displays, Transaction Progress Indicators.

## 9. Wallet Integration Details

*   Use `wagmi` hooks (`useAccount`, `useConnect`, `useDisconnect`, `useSigner`, `usePublicClient`, `useSwitchNetwork`, `useSendTransaction`, `useWaitForTransactionReceipt`).
*   Configure `wagmi` with desired chains (dynamically based on Network Mode).
*   Use chosen Wallet Connector UI library for the connection modal.
*   Handle connection states, errors, and network mismatches gracefully.
*   Ensure wallet readiness checks before attempting transactions.

## 10. State Management

*   **Global:**
    *   Wallet Connection State (isConnected, address, chainId).
    *   Network Mode (testnet/mainnet).
    *   Supported Chains Data (fetched from API).
*   **Local/Feature-Specific:**
    *   Form state (Make view).
    *   Selected asset/chains (Move view).
    *   Ongoing transaction states (hash, status, error).
    *   Deployment polling state.
    *   User's token/NFT list (potentially cached using SWR/React Query).
    *   User's real-time balances (fetched on demand or periodically).

## 11. Testing Strategy

*   **Unit Tests:** Test individual components, hooks, and utility functions in isolation (Jest/Vitest + RTL). Mock dependencies (API calls, wagmi hooks).
*   **Integration Tests:** Test the interaction between components, context, and hooks within specific features (e.g., completing the Make form, initiating a Move).
*   **E2E Tests (Recommended):** Use Playwright or Cypress to simulate full user flows, including wallet connection and transaction signing (requires more setup, potentially using test wallets/forked networks).
*   **Coverage:** Aim for high test coverage. Tests should run in CI pipeline.

## 12. Accessibility (A11y)

*   Adhere to WCAG 2.1 AA standards.
*   Use semantic HTML.
*   Ensure keyboard navigability.
*   Provide sufficient color contrast.
*   Use ARIA attributes where necessary.
*   Test with screen readers.

## 13. Performance

*   Optimize bundle size (code splitting, tree shaking).
*   Minimize re-renders (use `React.memo`, `useCallback`, `useMemo` appropriately).
*   Optimize images.
*   Lazy load components/routes where applicable.
*   Efficient data fetching and caching.

## 14. Security Considerations

*   Validate all user inputs on the frontend (in addition to backend validation).
*   Never expose private keys, API keys, or sensitive data.
*   Sanitize any data displayed from external sources (e.g., token names/symbols from contracts).
*   Be mindful of phishing risks; clearly identify the application domain.
*   Use robust libraries for wallet interaction (`ethers`, `wagmi`).
*   Handle errors securely, avoiding leaking sensitive information.

## 15. Deliverables

*   Fully functional frontend application codebase hosted in a Git repository.
*   Comprehensive unit and integration tests.
*   README file with setup instructions, build/run commands, and architecture overview.
*   Component documentation (Storybook recommended).
*   (Optional but Recommended) E2E test suite.

## 16. References

*   **Product Requirements:** `documentation/prd.md`
*   **Existing Frontend Concepts:** `frontend/README.md` (for UI/UX direction)
*   **Backend API Documentation:** (Link to OpenAPI spec or documentation if available - **REQUIRED**)
*   **Smart Contract ABIs:** (Provide paths or access to the latest ABIs for UniversalToken and UniversalNFT)
*   **Ethers.js:** [https://docs.ethers.org/v6/](https://docs.ethers.org/v6/)
*   **Wagmi:** [https://wagmi.sh/](https://wagmi.sh/)
*   **ZetaChain Documentation:** [https://www.zetachain.com/docs/](https://www.zetachain.com/docs/)
*   **Design Mockups/System:** (Link to Figma files or design system if available)

This plan provides a comprehensive starting point. The development team should ask clarifying questions and collaborate closely throughout the implementation process. Regular reviews and feedback cycles will be essential to ensure the final product meets the high standards set for this project. 