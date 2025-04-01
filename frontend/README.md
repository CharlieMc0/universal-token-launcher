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

- `/api/tokens` - Create and retrieve tokens
- `/api/tokens/:id` - Get token details
- `/api/tokens/:id/deploy` - Initiate token deployment
- `/api/tokens/:id/logs` - Get deployment logs
- `/api/users/:walletAddress/tokens` - Get tokens held by user
- `/api/transfers` - Initiate token transfers

### Wallet Authentication

The API service automatically includes wallet authentication:

- Wallet address is stored in the API service when a user connects
- Address is included in API requests via the `X-Wallet-Address` header
- Address is also appended as a query parameter for added reliability

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
2. API URLs in apiService.js match the backend routes (they should use `/api/` not `/api/v1/`)
3. Wallet connection is active (apiService now requires wallet authentication)

### Universal Token Service Wallet Address

The application uses the Universal Token Service Wallet address from the backend environment configuration (currently set to `0x4f1684A28E33F42cdf50AB96e29a709e17249E63`). If the backend wallet address changes, update this value in:

```jsx
// src/pages/Launch/index.js
const UNIVERSAL_TOKEN_SERVICE_WALLET = '0x4f1684A28E33F42cdf50AB96e29a709e17249E63';
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

No user action is required for verification - it happens automatically during deployment. Users can simply click on the "Verified" links to view their contract code on the respective block explorers.

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

The application supports the following chains:
- ZetaChain (Athens Testnet)
- Ethereum (Sepolia Testnet)
- BSC Testnet
- Base Sepolia

Additional chains (Solana, TON, SUI) are shown as "Coming Soon" in the UI.

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
