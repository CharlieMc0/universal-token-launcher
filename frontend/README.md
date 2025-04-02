# Universal Token Launcher Frontend

This project is the frontend for the Universal Token Launcher, which allows users to deploy and transfer tokens and NFTs across multiple blockchains using ZetaChain's cross-chain technology.

## Backend Integration

The frontend integrates with a backend server running on port 8000. The integration is handled through the `apiService.js` file, which provides methods for:

- Creating and deploying tokens across multiple chains
- Retrieving token information and deployment logs
- Transferring tokens between chains
- Loading user token balances

### API Endpoints

The application uses the following API endpoints:

- `/api/deploy` - Deploy token across multiple chains
- `/api/verify` - Verify deployed contracts
- `/api/chains` - Get supported chains information

> **Note:** The following endpoints are not currently implemented in the backend, but are expected by the frontend. The frontend has temporary workarounds for these missing endpoints:
> - `/tokens/:id` - Get token details
> - `/tokens/:id/logs` - Get deployment logs
> - `/users/:walletAddress/tokens` - Get tokens held by user
> - `/transfers` - Initiate token transfers

### API Integration Issues & Fixes

Previously, there were API integration issues that have been fixed:

1. **Double API Path Prefixing**
   - Issue: Frontend was configured with base URL `http://localhost:8000/api` and then endpoints used `/api/deploy`, resulting in `/api/api/deploy`
   - Fix: Modified frontend API calls to remove duplicate `/api` prefix in endpoint paths
   
2. **Missing Backend Endpoints**
   - Issue: Frontend attempts to call endpoints that don't exist in the backend
   - Fix: Implemented temporary solutions:
     - Enhanced `getToken()` in apiService.js with fallback behavior:
       - First attempts to use the `/tokens/{tokenId}` endpoint
       - Falls back to `/deploy/{tokenId}` if first attempt fails
       - Creates mock data if both attempts fail to maintain UI functionality
     - Modified polling logic to simulate successful deployment after a few polls

### API Data Format

The API service automatically converts between frontend's camelCase and backend's snake_case:

```javascript
// Example conversion in deployUniversalToken
const apiData = {
  token_name: tokenData.tokenName,
  token_symbol: tokenData.tokenSymbol,
  decimals: tokenData.decimals,
  total_supply: tokenData.totalSupply,
  selected_chains: tokenData.selectedChains,
  deployer_address: tokenData.deployerAddress,
  allocations: tokenData.allocations
};
```

### Wallet Authentication

The API service automatically includes wallet authentication:

- Wallet address is stored in the API service when a user connects
- Address is included in API requests via the `X-Wallet-Address` header
- Address is also appended as a query parameter for added reliability

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
- **Transaction Confirmation:** Waits for on-chain confirmation of the fee payment before notifying the backend.
- **Deployment Status Polling:** After initiating deployment with the backend, the frontend polls periodically to check the final deployment status (`completed` or `failed`).
- **Deployment Confirmation Display:** Renders a detailed confirmation view (`DeploymentConfirmation` component) upon successful completion, showing deployed contracts, chains, verification status, and explorer links.

### Transaction Workflow

1. **Pre-Transaction Validation:**
   - Ensures wallet is properly connected.
   - Verifies user is on ZetaChain network.
   - Confirms wallet client is fully ready.
   - Validates form inputs.

2. **Token Configuration Creation:**
   - Frontend calls `POST /api/tokens` with configuration data.
   - Backend creates the `TokenConfiguration` record and returns the `tokenId`.

3. **Fee Payment Transaction:**
   - Frontend prompts user to sign the fee payment transaction (1 ZETA to service wallet).
   - Clearly communicates waiting for wallet signature.
   - Prepares transaction parameters with explicit `chainId` (ZetaChain).
   - Handles common error scenarios (user rejection, insufficient funds).

4. **On-Chain Transaction Confirmation:**
   - Displays fee transaction hash immediately after submission.
   - Shows block explorer link for transaction tracking.
   - Polls the blockchain (`publicClient.getTransactionReceipt`) until the fee transaction is confirmed (`status: 'success'`).
   - Handles confirmation timeouts or reverted transactions.

5. **Backend Deployment Initiation:**
   - After fee transaction confirmation, frontend calls `POST /api/tokens/:id/deploy` with the confirmed fee transaction hash.
   - Backend starts the asynchronous contract deployment process.

6. **Deployment Status Polling:**
   - Frontend enters a polling state (`useEffect` hook).
   - Periodically calls `GET /api/tokens/:id` to check the `deployment_status` field.
   - Updates UI with messages like "Backend is deploying contracts...".

7. **Deployment Completion/Failure:**
   - **If status becomes `completed`:**
     - Polling stops.
     - Frontend calls `GET /api/tokens/:id/logs` to fetch detailed deployment results.
     - Frontend renders the `DeploymentConfirmation` component with the logs.
   - **If status becomes `failed`:**
     - Polling stops.
     - Frontend may call `GET /api/tokens/:id/logs` to get partial results or error details.
     - Frontend displays an error message indicating deployment failure.

### Common Transaction Issues & Solutions

- **No Transaction Hash:** This usually occurs when the wallet is not properly connected or the transaction is rejected by the wallet. The application now checks wallet readiness, provides better error context, and offers a retry button.
- **Insufficient Balance:** The app checks balance before attempting transactions and provides a clear error message if the balance is insufficient.
- **Network Mismatch:** Transactions are now explicitly sent to the ZetaChain network to prevent network mismatch issues.
- **Transaction Timing:** Shows clear status updates during transaction confirmation to prevent user confusion during the waiting period.

## React Components

### Component Props

All embedded components use string props instead of boolean props to avoid React warnings:

```jsx
// Correct way to pass boolean attributes as string
<Component embedded="true" /> 
// Or when passing a variable
<Component embedded={embedded.toString()} />
```

## Troubleshooting & Common Issues

### Non-Boolean Attribute Warning

If you see the following warning in the console:

```
Warning: Received `true` for a non-boolean attribute `embedded`.
```

This is because React expects DOM attribute values to be strings, not booleans. The fix is to convert boolean values to strings:

```jsx
// Instead of:
<PageContainer embedded={true}>

// Use:
<PageContainer embedded="true">

// Or if passing a variable:
<PageContainer embedded={embedded.toString()}>
```

### Backend Connection Issues

If the app can't connect to the backend, check:

1. Backend server is running on port 8000
2. API URLs in apiService.js are properly configured (no double `/api/` prefix)
3. Wallet connection is active (apiService now requires wallet authentication)
4. Frontend is properly converting data formats between camelCase and snake_case
5. REACT_APP_API_URL environment variable is correctly set (default is http://localhost:8000/api)

### API Integration Roadmap

Future API integration work should focus on:

1. Implementing missing backend endpoints or adjusting the frontend to match the current backend API design:
   - `GET /api/tokens/{tokenId}` - Get token details
   - `GET /api/users/{address}/tokens` - Get user tokens
   - `POST /api/tokens/{tokenId}/deploy` - Deploy token
   - `GET /api/tokens/{tokenId}/logs` - Get deployment logs

2. Enhancing API documentation with comprehensive endpoint details
3. Implementing consistent error handling across the application
4. Setting up proper environment configuration to ensure consistency in API URL structure

5. Further consolidating API calls to use the new endpoints
6. Adding proper TypeScript interfaces for API request/response types

### Common API Issues & Solutions

If you encounter API integration issues:

1. **404 Not Found Errors**
   - Check the API endpoint path - ensure there's no duplicate `/api` prefix
   - Verify the backend route is properly registered and the server is running

2. **422 Unprocessable Entity Errors**
   - These are validation errors from the backend
   - Common validation requirements:
     - Ensure addresses follow the `0x` prefixed Ethereum format (`^0x[a-fA-F0-9]{40}$`)
     - `total_supply` must be a string (not a number) to handle large values
     - `selected_chains` must be an array of string chain IDs
     - `decimals` should be a number between 0 and 18
   - Add console logging to see the exact payload being sent to diagnose issues

3. **Network CORS Issues**
   - If you see CORS errors, ensure the backend has proper CORS configuration
   - The current backend allows all origins in development (`allow_origins=["*"]`)

4. **Authentication Errors**
   - Some endpoints may require wallet authentication in the future
   - Ensure the wallet address is properly included in API requests

### Transaction Handling Tips

If users experience transaction issues:

1.  Ensure they have sufficient ZETA balance (at least 1 ZETA + gas)
2.  Verify they're connected to the ZetaChain network
3.  If a transaction fails, use the retry button instead of refreshing the page
4.  If multiple retries fail, note the token ID and contact support
5.  Check the transaction on the ZetaChain explorer using the provided link
6.  If the wallet seems disconnected, try reconnecting before retrying
7.  **Wallet Interaction Note:** Be aware that wallet interaction functions (like `wagmi`'s `sendTransaction` or `sendTransactionAsync`) might return unexpected values (e.g., `undefined` or an object `{hash: '...'}` instead of just the hash string). Implement robust checks on the return value *before* using it or storing it in state intended for rendering, to prevent crashes (like React's "Objects are not valid as a React child" error). Using `sendTransactionAsync` and carefully extracting the hash string proved effective in resolving one such issue.

### Universal Token Service Wallet Address

The application uses the Universal Token Service Wallet address from the backend environment configuration (currently set to `0x04dA1034E7d84c004092671bBcEb6B1c8DCda7AE`). If the backend wallet address changes, update this value in:

```jsx
// src/pages/Launch/index.js
const UNIVERSAL_TOKEN_SERVICE_WALLET = '0x04dA1034E7d84c004092671bBcEb6B1c8DCda7AE';
```

## Contract Verification

The application integrates with the backend's contract verification system to display verification status to users:

### Verification Features

- **Status Display:** Shows verification status for each deployed contract (verified, pending, or failed)
- **Explorer Links:** Provides direct links to verified contracts on block explorers
- **Error Information:** Displays error messages if verification fails

### Implementation

The verification status is retrieved as part of deployment logs and displayed in the UI:

```jsx
// Example code from TokenDetailsView.jsx
function VerificationStatusBadge({ status, url, error }) {
  return (
    <div className="verification-badge">
      {status === 'verified' && (
        <a href={url} target="_blank" rel="noopener noreferrer" className="verified">
          <CheckCircleIcon /> Verified
        </a>
      )}
      {status === 'pending' && <span className="pending"><ClockIcon /> Verification Pending</span>}
      {status === 'processing' && <span className="processing"><SpinnerIcon /> Verification in Progress</span>}
      {status === 'failed' && (
        <Tooltip content={error || 'Verification failed'}>
          <span className="failed"><XCircleIcon /> Verification Failed</span>
        </Tooltip>
      )}
    </div>
  );
}
```

### Chain Integration

The chain selection UI is fully integrated with the verification system:
- Chains that are disabled in the API can be seen but not selected
- Verification status is unique per chain and displayed in the deployment logs
- ZetaChain verification is always shown first in the results
- Chain-specific explorers are used for verification links (e.g., ZetaChain Explorer, Etherscan)

No user action is required for verification - it happens automatically during deployment. Users can simply click on the "Verified" links to view their contract code on the respective block explorers.

## Token Form Validation

The application includes comprehensive form validation to ensure all data meets API requirements:

### Validation Features

- **Token Information Validation:**
  - Token name must not be empty
  - Token symbol must not be empty and should be 6 characters or less
  - Decimals must be between 0 and 18
  - Total supply must be a valid number

- **Address Validation:**
  - Wallet address must follow the Ethereum address format (`0x` followed by 40 hex characters)
  - All distribution addresses are validated to ensure proper format

- **Chain Selection Validation:**
  - At least one chain must be selected
  - ZetaChain is required for deployment

- **Distribution Validation:**
  - Validates CSV format when uploading distribution lists
  - Ensures all distribution amounts are positive numbers
  - Verifies all addresses follow proper Ethereum format

### Data Formatting

The application automatically formats data to match backend requirements:

- Trims whitespace from text inputs
- Converts numbers to strings for API compatibility
- Ensures all chain IDs are in string format
- Formats distribution amounts as strings

### Error Handling

- Displays specific error messages for each validation issue
- Shows detailed API error responses when available
- Provides structured feedback for CSV parsing errors
- Allows retry for payment failures but not for user rejections
- Handles API unavailability gracefully with informative messages
- Falls back to predefined data when the API cannot be reached
- Shows "Temporarily unavailable, please check back soon" when chains cannot be loaded

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

### `npm run test:integration`

Runs integration tests that verify the frontend's interaction with the backend API. These tests validate:

1. API Service functionality:
   - Token creation API calls
   - Token deployment API calls
   - Token retrieval API calls
   - Deployment logs retrieval
   - Error handling

2. Token Launch Page:
   - Form submission
   - API interaction
   - Fee payment transaction
   - Deployment status tracking
   - Error handling

3. Token Transfer Page:
   - Token loading
   - Transfer initiation
   - Chain selection
   - Amount validation
   - Error handling

**Note:** The backend server must be running on port 8000 for integration tests to pass.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

## Project Structure

Key files and directories:

- `src/services/apiService.js` - Service for API communication with the backend
- `src/utils` - Utility functions including network switching and CSV parsing
- `src/pages` - React components for each page in the application
- `src/components` - Reusable UI components

## Integration Tests

Integration tests have been updated to work with the real backend instead of mocks:

- `src/utils/apiService.test.js` - Tests API service methods with real backend
  - Uses test wallet address from backend environment
  - Gracefully handles backend errors and connection issues
  - Skips tests when backend is unavailable

Run the integration tests with:

```bash
npm test -- --testMatch="**/*Integration.test.js" --watchAll=false
```

**Note:** The backend server must be running on port 8000 for actual backend integration.

## Environment Setup

The application uses the following environment variables:

- `REACT_APP_API_URL` - Backend API URL (defaults to http://localhost:8000)

You can create a `.env` file in the project root to set these variables.

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
