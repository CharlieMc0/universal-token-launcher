# Universal Token Launcher Frontend

This project is the frontend for the Universal Token Launcher, which allows users to deploy and move tokens and NFTs across multiple blockchains using ZetaChain's cross-chain technology.

## ✨ UI/UX Enhancement Initiative (In Progress)

We've implemented several design and UX enhancements to create a premium, intuitive experience:

### Rebranding & Navigation
- **Simplified Navigation**: Reduced to just two primary actions ("Make" and "Move") for a cleaner, more focused experience
- **Action-Oriented Language**: Changed terminology from "Create/Transfer" to "Make/Move" for more intuitive user interaction
- **Minimalist Header**: Streamlined header with just logo, navigation, and wallet connection

### Visual Refinements
- **Premium Dark Theme**: Implemented a darker color scheme (#080810) with vibrant accent colors for better visual hierarchy
- **Subtle Animations**: Added smooth transitions (250-300ms easing) for all interactive elements
- **Monospace Typography**: Using JetBrains Mono font for addresses, transaction hashes, and amounts
- **8px Grid System**: Applied a consistent 8px spacing system throughout the app
- **Gradient Accents**: Added gradient backgrounds to primary action buttons
- **Refined Separators**: Using thin dividers (1px) with low opacity for subtle visual separation

### Enhanced Component Design
- **Visual Cards**: Replaced toggle buttons with visual cards for token/NFT type selection
- **Improved Form Elements**: Better focus states, validation feedback, and interactive elements
- **Consistent Patterns**: Standardized layouts, spacing, and interactive behaviors

### Interaction Improvements
- **Reduced Friction**: Combined or eliminated unnecessary steps in main workflows
- **Better Feedback**: Enhanced loading states, success/error feedback, and transaction status visibility
- **Progressive Disclosure**: Show advanced options only when needed

## Backend Integration

The frontend integrates with a backend server running on port 8000. The integration is handled through the `apiService.js` file, which provides methods for:

- Creating and deploying tokens across multiple chains
- Retrieving token information and deployment logs
- Transferring tokens between chains
- Loading user token balances

### API Endpoints

The application uses the following API endpoints:

- `GET /api/chains` - Get supported chains information
- `POST /api/deploy` - Deploy token across multiple chains, also used for fee payment confirmation
- `GET /api/token/{identifier}` - Get token details by ID or contract address
- `GET /api/users/{address}` - Get tokens owned by user
- `POST /api/verify` - Verify deployed contracts

### API Integration Updates

The API integration has been updated to align with the backend's actual API structure:

1. **Correct Endpoint Paths**
   - Updated to use the OpenAPI-documented endpoints like `/api/token/{identifier}` instead of `/api/tokens/{id}`
   - Fixed the deployment endpoint to use `/api/deploy` for both creation and fee confirmation
   - Updated user tokens endpoint to use `/api/users/{address}`

2. **Data Format Standardization**
   - Ensured proper handling of snake_case from backend vs camelCase in frontend
   - Added field name conversion to maintain consistency
   - Improved error handling for validation errors
   - Fixed data type handling (decimals as integers, amounts as strings)

3. **Token Deployment Flow**
   - Updated to match the backend's expected workflow:
     - Create token configuration via `/api/deploy`
     - Process fee payment transaction
     - Confirm fee payment with token_id and fee_paid_tx
     - Poll token status using `/api/token/{identifier}`

4. **Chain Information Processing**
   - Enhanced extraction of connected chain data from API responses
   - Properly combines ZetaChain and other chain information
   - Handles both standalone and nested chain data formats
   - Added robust handling for missing or undefined fields with fallbacks
   - Ensures all chain info entries have valid chainId, name, and contractAddress values

5. **Error Handling and Validation**
   - Improved extraction of validation errors from API responses
   - Better formatting of error messages for users
   - Enhanced retry and polling logic for network errors
   - Added specific handling for different HTTP error codes
   - Ensured all required fields are included in each API call

### API Data Format

The API service automatically converts between frontend's camelCase and backend's snake_case:

```javascript
// Example conversion in deployUniversalToken
const apiData = {
  token_name: tokenData.token_name, 
  token_symbol: tokenData.token_symbol,
  decimals: tokenData.decimals,
  total_supply: tokenData.total_supply,
  selected_chains: tokenData.selected_chains,
  deployer_address: tokenData.deployer_address,
  allocations: tokenData.allocations
};
```

### Error Handling

The API service now includes enhanced error handling:

```javascript
// Error handler helper with validation error formatting
if (error.response?.data?.detail && Array.isArray(error.response.data.detail)) {
  // Format validation errors in a user-friendly way
  const validationErrors = error.response.data.detail.map(err => {
    const field = err.loc[err.loc.length-1];
    return `${field}: ${err.msg}`;
  }).join('; ');
  
  console.error('Validation errors:', error.response.data.detail);
  throw new Error(`Validation error: ${validationErrors}`);
}
```

### Token Response Processing

The API service processes the token response data to make it compatible with the frontend:

```javascript
// Process connected chains information - combine both sources
let chainInfo = [];

// Add ZetaChain info if present
if (data.token.zeta_chain_info) {
  chainInfo.push({
    ...data.token.zeta_chain_info,
    isZetaChain: true,
    chainId: data.token.zeta_chain_info.chainId || '7001',
    name: data.token.zeta_chain_info.name || 'ZetaChain'
  });
}

// Add connected chains if present
if (data.token.connected_chains_json && typeof data.token.connected_chains_json === 'object') {
  // Process each chain and ensure required fields exist
  const connectedChains = Object.entries(data.token.connected_chains_json).map(([chainId, chainData]) => {
    return {
      ...chainData,
      chainId: chainId || 'unknown',
      name: chainData.name || `Chain ${chainId}`,
      deploymentStatus: chainData.status || 'unknown'
    };
  });
  
  chainInfo = [...chainInfo, ...connectedChains];
}

// Ensure all chain info has required fields
chainInfo = chainInfo.map(chain => ({
  ...chain,
  chainId: chain.chainId || 'unknown',
  name: chain.name || `Chain ${chain.chainId || 'Unknown'}`,
  deploymentStatus: chain.deploymentStatus || chain.status || 'unknown',
  contractAddress: chain.contract_address || chain.contractAddress || 'Address not available'
}));

// Add the processed chainInfo to token
data.token.chainInfo = chainInfo;
```

## Transaction Handling

The application includes robust transaction handling for token deployment:

### Transaction Features

- **Progressive Status Updates:** Shows step-by-step progress during token creation, fee payment, transaction confirmation, backend deployment initiation, and status polling.
- **Transaction Retry:** Provides a retry button when fee payment transactions fail, with up to 3 retry attempts.
- **Clear Error Messages:** Displays detailed error information for transaction failures, confirmation timeouts, and backend deployment failures.
- **Immediate Token ID Display:** Shows token ID as soon as the configuration is created.
- **Wallet Connection Verification:** Ensures wallet is connected before attempting transactions.
- **Chain ID Specification:** Explicitly sets chain ID to ensure fee transactions happen on the correct network (ZetaChain).
- **Transaction Hash Display:** Shows the fee payment transaction hash with a link to ZetaChain block explorer.
- **Wallet Readiness Check:** Verifies wallet client is fully initialized before attempting transactions.
- **Resilient Transaction Confirmation:** Implements a robust retry mechanism with progressive delays to handle blockchain timing issues.
- **Advanced Receipt Polling:** Automatically retries transaction receipt retrieval with increasing timeouts to prevent `TransactionReceiptNotFoundError` issues.
- **Deployment Status Polling:** After initiating deployment with the backend, the frontend polls periodically to check the final deployment status (`completed` or `failed`).
- **Deployment Confirmation Display:** Renders a detailed confirmation view (`DeploymentConfirmation` component) upon successful completion, showing deployed contracts, chains, verification status, and explorer links.

### Transaction Confirmation

The application now features an improved transaction confirmation process:

```javascript
// Transaction confirmation function with retries
const confirmTransaction = async (txHash) => {
  let confirmed = false;
  let attempts = 0;
  const maxAttempts = 20; // Maximum number of attempts
  
  while (!confirmed && attempts < maxAttempts) {
    try {
      attempts++;
      console.log(`Attempting to get transaction receipt (Attempt ${attempts}/${maxAttempts})...`);
      
      // Update UI with progress
      setProcessingStep(`Waiting for transaction confirmation... (Attempt ${attempts}/${maxAttempts})`);
      
      // Add increasing delay between attempts
      const delayMs = Math.min(2000 + (attempts * 1000), 10000); // Start with 2s, increase by 1s each try, max 10s
      await new Promise(resolve => setTimeout(resolve, delayMs));
      
      // Try to get the transaction receipt
      let receipt = null;
      
      try {
        // Try to get the transaction receipt directly
        receipt = await publicClient.getTransactionReceipt({ hash: txHash });
        
        if (receipt && receipt.status === 'success') {
          console.log('Transaction confirmed successfully!', receipt);
          setProcessingStep('Transaction confirmed successfully!');
          return receipt; // Success!
        } else if (receipt && receipt.status === 'reverted') {
          setProcessingStep('Transaction was reverted on-chain');
          throw new Error('Transaction was reverted on-chain');
        } else if (receipt) {
          // If we get here, receipt exists but status is not success - wait and try again
          console.log(`Receipt found but status not success. Current status: ${receipt?.status || 'unknown'}`);
          setProcessingStep(`Transaction processing... Current status: ${receipt?.status || 'unknown'}`);
        }
      } catch (receiptError) {
        console.log('Error getting receipt directly:', receiptError.message);
        
        // Check if it's a "receipt not found" error, which is expected early on
        if (receiptError.name === 'TransactionReceiptNotFoundError' || receiptError.message.includes('could not be found')) {
          console.log(`Transaction receipt not found yet (attempt ${attempts}/${maxAttempts}). Waiting...`);
          setProcessingStep(`Transaction not yet mined on ZetaChain... (Attempt ${attempts}/${maxAttempts})`);
        } else {
          // For other errors, log but continue retrying
          console.error(`Error checking transaction (attempt ${attempts}/${maxAttempts}):`, receiptError.message);
          setProcessingStep(`Error checking transaction: ${receiptError.message} (Retrying...)`);
        }
        
        // Only throw on last attempt
        if (attempts >= maxAttempts) {
          setProcessingStep(`Failed to confirm transaction after ${maxAttempts} attempts`);
          throw new Error(`Failed to confirm transaction after ${maxAttempts} attempts: ${receiptError.message}`);
        }
      }
    } catch (error) {
      // Only throw on last attempt
      if (attempts >= maxAttempts) {
        setProcessingStep(`Failed to confirm transaction after ${maxAttempts} attempts`);
        throw new Error(`Failed to confirm transaction after ${maxAttempts} attempts: ${error.message}`);
      }
    }
  }
  
  // If we get here, we've run out of attempts
  setProcessingStep(`Transaction confirmation timed out after ${maxAttempts} attempts`);
  throw new Error(`Transaction confirmation timed out after ${maxAttempts} attempts`);
};
```

### Deployment UI Improvements

The DeploymentConfirmation component has been enhanced to handle edge cases:

- **Robust Key Generation:** Prevents React "duplicate key" warnings by using unique identifiers for each chain entry
- **Fallback Values:** Provides graceful handling for missing or undefined chain information
- **Error State Display:** Clearly displays error states for failed deployments
- **Explorer Links:** Shows block explorer links only when they are available
- **Status Indicators:** Uses different icons and colors for various deployment states

## Transaction Workflow

1. **Pre-Transaction Validation:**
   - Ensures wallet is properly connected.
   - Verifies user is on ZetaChain network.
   - Confirms wallet client is fully ready.
   - Validates form inputs.

2. **Token Configuration Creation:**
   - Frontend calls `POST /api/deploy` with configuration data in snake_case format.
   - Backend creates the token configuration and returns the `deployment_id`.

3. **Fee Payment Transaction:**
   - Frontend prompts user to sign the fee payment transaction (1 ZETA to service wallet).
   - Clearly communicates waiting for wallet signature.
   - Prepares transaction parameters with explicit `chainId` (ZetaChain).
   - Handles common error scenarios (user rejection, insufficient funds).

4. **On-Chain Transaction Confirmation:**
   - Displays fee transaction hash immediately after submission.
   - Shows block explorer link for transaction tracking.
   - Implements a robust retry mechanism with progressive delays.
   - Handles confirmation timeouts, transaction replacements, or reverted transactions.

5. **Backend Deployment Initiation:**
   - After fee transaction confirmation, frontend calls `POST /api/deploy` with the token_id, fee_paid_tx hash, and all required token data fields.
   - Backend starts the asynchronous contract deployment process.

6. **Deployment Status Polling:**
   - Frontend enters a polling state (`useEffect` hook).
   - Periodically calls `GET /api/token/{identifier}` to check the `deployment_status` field.
   - Updates UI with messages like "Backend is deploying contracts...".

7. **Deployment Completion/Failure:**
   - **If status becomes `completed`:**
     - Polling stops.
     - Frontend extracts chain information from the token response.
     - Frontend renders the `DeploymentConfirmation` component with the chain data.
   - **If status becomes `failed`:**
     - Polling stops.
     - Frontend extracts error details from the response.
     - Frontend displays an error message indicating deployment failure.

## Troubleshooting & Common Issues

### API Integration Issues

If you encounter API integration issues:

1. **404 Not Found Errors**
   - Check the endpoint paths: all API endpoints should start with `/api/`
   - Ensure you're using the correct format: `/api/token/{id}` not `/api/tokens/{id}`
   - Verify the backend is running on the expected port (8000 by default)

2. **422 Unprocessable Entity Errors**
   - These indicate validation errors from the backend
   - Make sure to use snake_case for all API request fields: `token_name` not `tokenName`
   - Ensure all required fields are included (`token_name`, `token_symbol`, `selected_chains`, `deployer_address`)
   - Verify types are correct: numbers as integers, large values like `total_supply` as strings
   - Check the browser console for detailed validation errors

3. **Data Format Issues**
   - Backend requires snake_case format (`token_name` not `tokenName`)
   - All chain IDs must be strings (like "7001" not 7001)
   - Token amounts must be strings for large numbers
   - ZetaChain must be included in `selected_chains`

4. **Transaction Confirmation Issues**
   - Look for `TransactionReceiptNotFoundError` errors, which indicate timing issues
   - Check that the transaction confirmation retry mechanism is working correctly
   - Verify the transaction was actually submitted to the blockchain
   - Ensure the wallet is connected to the correct network (ZetaChain Athens)

5. **Deployment UI Issues**
   - If you see "Duplicate key" React warnings, check the key generation in the DeploymentConfirmation component
   - For "undefined" chain IDs or names, verify the API response data processing in getToken
   - Make sure chainInfo has properly processed the data from connected_chains_json

6. **Debugging Tips**
   - Look at browser console logs for detailed API requests and responses
   - Check the error response details for validation errors
   - Verify that all required fields are present in API requests
   - Test API endpoints directly using tools like curl or Postman

### API Response Structure

The token API endpoint returns data structured like this:

```json
{
  "success": true,
  "token": {
    "id": 1,
    "token_name": "Test Token",
    "token_symbol": "TST",
    "decimals": 18,
    "total_supply": "1000000000000000000000000",
    "deployment_status": "completed",
    "error_message": null,
    "deployer_address": "0x4f1684A28E33F42cdf50AB96e29a709e17249E63",
    "zc_contract_address": "0x7c9037d10c4BC877268cb4fe900490Ff98b5D52b",
    "connected_chains_json": {
      "11155111": {
        "status": "completed",
        "contract_address": "0x8Da98E1ea986331D68ee5CD83b1E49665B4587fB",
        "transaction_hash": "0x...",
        "verification_status": "pending",
        "chain_id": "11155111",
        "chain_name": "Sepolia Testnet",
        "explorer_url": "https://sepolia.etherscan.io",
        "blockscout_url": null,
        "contract_url": "https://sepolia.etherscan.io/address/0x8Da98E1ea986331D68ee5CD83b1E49665B4587fB"
      }
    },
    "zeta_chain_info": {
      "chain_id": "7001",
      "contract_address": "0x7c9037d10c4BC877268cb4fe900490Ff98b5D52b",
      "status": "completed",
      "explorer_url": "https://explorer.athens.zetachain.com",
      "blockscout_url": "https://zetachain-testnet.blockscout.com/",
      "verification_status": "unknown",
      "contract_url": "https://zetachain-testnet.blockscout.com//address/0x7c9037d10c4BC877268cb4fe900490Ff98b5D52b"
    }
  }
}
```

## Cross-Chain Moves and Contract Interactions

The application includes robust cross-chain token movement functionality through direct contract interactions with Universal Tokens.

### Cross-Chain Move Features

- **Network Verification**: Ensures the user is on the correct blockchain network (ZetaChain) before initiating moves
- **Gas Estimation**: Accurate gas estimation for cross-chain transactions
- **Balance Verification**: Checks token balance before attempting moves to prevent failed transactions
- **Contract Setup Verification**: **NEW:** Before attempting a move, the app now checks if the necessary cross-chain contract addresses (`connectedContracts` on ZetaChain, `zetaChainContract` on EVM chains) are properly set up by the owner. This prevents moves from failing due to incomplete setup.
- **Fallback ABI Mechanism**: Uses fallback ABI if standard one fails, improving compatibility with different contract versions
- **Dynamic Gas Estimation**: Estimates gas directly from the contract with a 30% buffer for safety
- **Transaction Retries**: Automatically retries failed transactions with increased gas (50% more) when appropriate
- **Detailed Error Messages**: Provides user-friendly error messages for common issues like insufficient funds or balance, and **NEW:** errors related to incomplete contract setup.
- **Signer Validation**: Verifies wallet connection and signer availability at multiple checkpoints
- **Better Decimals Handling**: Properly handles token decimals for amount formatting to prevent precision errors

### Minting Functionality (NEW)

- **Conditional Minting**: The UI now displays a "Mint" tab alongside "Move" if the connected wallet:
  - Is the original deployer/owner of the selected token contract.
  - OR has a balance greater than 0 for the selected token on the chosen source chain.
- **Mint Form**: Allows the deployer/owner (or eligible user) to specify the amount to mint and an optional recipient address (defaults to their own address).
- **Mint Transaction**: Uses the `mintTokens` function with robust gas estimation, fallback logic, and error handling similar to the move function.
- **Permissions Check**: Ensures only the authorized owner can execute the mint transaction on-chain.

### Contract Interaction Improvements

- **Provider Chain Verification**: Uses `provider.getNetwork().chainId` with proper type conversion for Ethers.js v6 compatibility
- **BigInt Safety**: Uses `ethers.toBigInt()` instead of global `BigInt` for better compatibility across browsers
- **Enhanced Error Diagnostics**: Includes comprehensive error details for easier debugging of transaction failures
- **Function Availability Checks**: Verifies contract methods exist before attempting to call them
- **Wait Time Optimization**: Uses appropriate wait periods between network switching and transactions
- **Safe Contract Method Access**: Checks interface and method availability with proper null/undefined handling
- **Contract Verification**: Validates contracts by testing basic methods before attempting complex operations
- **Mint Gas Handling**: **NEW:** Implemented robust gas estimation and retry logic for the `mint` function, similar to the `crossChainMove` function, resolving previous gas-related errors.

### Error Handling and Recovery

- **Network Mismatch Handling**: Detects and resolves network mismatches between wallet and required chain
- **Revert Reason Extraction**: Attempts to extract and display meaningful error messages from transaction reverts
- **Transaction Status Checking**: Verifies transaction success and handles on-chain failed transactions
- **Modular Error Management**: Separates error handling logic for cleaner code and better user feedback
- **Wallet Connection Issues**: Checks for wallet availability and connectivity before transactions
- **Parameters Validation**: Validates and properly formats all transaction parameters before sending
- **Console Diagnostics**: Provides detailed logging for troubleshooting in the browser console
- **Incomplete Setup Errors**: **NEW:** Clearly informs the user if a move fails because the token's cross-chain setup (linking contracts) hasn't been completed by the owner.

### Common Cross-Chain Move Issues

1.  **"Token setup incomplete..." Errors**
    - **NEW:** This error indicates the contract owner hasn't finished setting up the cross-chain links (`connectedContracts` or `zetaChainContract`). The owner must call the appropriate setup function (`setConnectedContract` or `setZetaChainContract`) on the deployed contracts.
    - Check the console logs for specific details about which link is missing.
2.  **"Cannot convert undefined or null to object"**
    - Check that the contract ABI is properly defined and accessible
    - Verify the contract address is correct and accessible on the current network
    - Enable console logging to see where the null object is occurring
3.  **Transaction Revert Errors**
    - Look for specific revert messages in the error details
    - Check token balance to ensure sufficient tokens for the move
    - Verify that the recipient address is correctly formatted
    - Ensure the destination chain ID is supported by the contract
4.  **Network Switching Issues**
    - Make sure the wallet (MetaMask) has ZetaChain configured
    - Check for wallet permission issues when switching networks
    - Allow sufficient time for network switching to complete before proceeding
5.  **Gas Estimation Failures**
    - If gas estimation fails, the application will use a fallback estimate
    - Consider manually increasing gas in MetaMask if transactions consistently fail
    - Check wallet balance for sufficient ZETA to cover gas costs
6.  **Minting Errors**
    - **NEW:** "Only the token owner..." error means the connected wallet doesn't have permission to mint.
    - **NEW:** Ensure the mint amount and recipient address are valid.
    - Gas errors during minting should be less common now due to improved estimation and retries.

## Latest Enhancements

- **Enhanced Move Page**:
  - Redesigned Move page with a compact token card layout and an improved user interface.
  - New components introduced: `EnhancedTokenCard`, `TokenSectionContainer`, `TokenFilterControls`, and `EnhancedMovePanel` to streamline token moves.
  - Updated filter tabs to display "Tokens You Made" and "Tokens You Hold".
  - Automatic Source Chain Selection: When a user has tokens on only one chain with a non-zero balance, that chain is auto-selected, reducing manual input and enhancing usability.
  - Fixed bug where the Move/Mint window would disappear when switching between tabs.

- **API Update**:
  - Modified the `getUserTokens` function to include a `created_at` field, improving sorting and filtering of tokens.

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

## Environment Setup

The application uses the following environment variables:

- `REACT_APP_API_URL` - Backend API URL (defaults to http://localhost:8000/api)

You can create a `.env` file in the project root to set these variables.

```
REACT_APP_API_URL=http://localhost:8000/api
```

## Supported Chains

The application dynamically loads supported chains from the backend API:
- ZetaChain (Athens Testnet) - Always displayed prominently in the upper left and required
- Other testnet chains (e.g., Ethereum Sepolia, BSC Testnet, Base Sepolia)
- Chains with `enabled: false` in the API are shown as "Coming Soon" and displayed with reduced opacity

### Chain Display Features

- **Dynamic Loading**: Chains are loaded from `/api/chains` endpoint on application startup
- **Visual Hierarchy**: ZetaChain is visually distinguished and always positioned in the upper left
- **Enabled Status**: Chains marked as disabled in the API are shown as "Coming Soon"
- **Error Handling**: If the API is unavailable, a fallback set of chains is displayed with an error message
- **Required Chain**: ZetaChain cannot be deselected and is always included in deployments

### Chain Selection Component

The chain selection component has been enhanced with several important features:

#### Selection Behavior
- **Individual Selection**: Each chain tile can be independently selected or deselected
- **ZetaChain Requirement**: ZetaChain is required and cannot be deselected
- **Visual Indication**: Selected chains are highlighted with an accent color
- **Coming Soon Chains**: Disabled chains are shown with reduced opacity and a "Coming Soon" badge

#### API Integration
- **Dynamic Loading**: The component fetches available chains from the backend API
- **Enabled Status**: Only chains marked as `enabled: true` in the API can be selected
- **Fallback Mechanism**: If the API is unavailable, predetermined chains are shown with an error notice
- **Testnet Filtering**: Only testnet chains are displayed by default

#### User Experience
- **Sorting Logic**: Chains are logically sorted with ZetaChain first, then enabled chains, then disabled chains
- **Hover Effects**: Interactive tiles have subtle hover effects for better user feedback
- **Error Messages**: Clear error messages are displayed when chain selection requirements aren't met
- **Placeholder Handling**: Graceful handling of missing chain logos with placeholder images

# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)

## NFT Deployment Enhancements

The NFT deployment functionality has been improved with several important updates:

### Backend Integration Fixes

- **Fixed Chain Loading**: Resolved issue where "Loading supported chains..." would remain indefinitely by enhancing chain data filtering, adding proper error handling, and implementing better state management.
- **Proper API Integration**: Updated the NFT deployment flow to correctly integrate with the backend API endpoint (`/api/nft/deploy`), removing the unnecessary frontend-initiated fee payment transaction and confirmation steps.
- **Streamlined Deployment Process**: Simplified the deployment flow to:
  1. Send NFT collection data directly to the backend API in one call
  2. Poll for deployment status until completion
  3. Display deployment details upon successful completion

### User Experience Improvements

- **Image Validation**: Made image upload optional for form submission since the image isn't actually sent to the backend API.
- **Better Error Handling**: Improved validation error messages and feedback to provide clearer guidance to users.
- **Deployment Status Feedback**: Enhanced the polling mechanism to provide real-time updates on deployment progress.
- **Robust Chain Selection**: Implemented fallback chains and better filtering for testnet-only chains to ensure users can always access ZetaChain.

### Code Quality Enhancements

- **Dependency Management**: Corrected the useEffect dependency array to prevent unnecessary chain re-fetching.
- **Better Logging**: Added comprehensive logging throughout the deployment process to aid debugging.
- **Input Validation**: Improved validation for input fields including checksummed Ethereum addresses.
- **Clean State Management**: Added proper cleanup of state variables between deployment attempts.

These improvements ensure that the NFT deployment functionality works reliably with the backend API, providing users with a seamless experience for deploying NFT collections across multiple chains.
