# Universal Token Launcher Application Flow

This document provides a comprehensive walkthrough of the user journey through the Universal Token Launcher application, with special attention to potential pain points and best practices based on our implementation experience.

---

## 1. User Entry & Wallet Connection

### Flow Stages
1. **Initial Landing**
   - User arrives at the application landing page
   - System presents welcome message and "Connect Wallet" button

2. **Wallet Connection**
   - User clicks "Connect Wallet" button
   - System displays wallet selection modal (using RainbowKit)
   - User selects their wallet provider (MetaMask, Coinbase Wallet, etc.)
   - System prompts wallet connection
   - User confirms connection in their wallet

3. **Network Validation**
   - System checks if user is connected to ZetaChain network
   - If not on ZetaChain, system displays network switching prompt
   - User clicks "Switch to ZetaChain" button
   - System sends network switch request to wallet
   - If ZetaChain not yet added to wallet, system sends request to add network

### Key Technical Considerations
- **Network Detection & Switching**
  ```javascript
  // Check current network
  const isZetaChainNetwork = chainId === ZETACHAIN_ID;

  // Switching implementation with fallback to add network
  const handleSwitchToZetaChain = async () => {
    try {
      await switchChain({ chainId: ZETACHAIN_ID });
    } catch (switchError) {
      // Fallback: try to add the network
      if (window.ethereum) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: `0x${ZETACHAIN_ID.toString(16)}`,
              chainName: 'ZetaChain',
              nativeCurrency: {
                decimals: 18,
                name: 'ZETA',
                symbol: 'ZETA',
              },
              rpcUrls: ['https://zetachain-evm.blockpi.network/v1/rpc/public'],
              blockExplorerUrls: ['https://explorer.zetachain.com']
            }]
          });
        } catch (error) {
          console.error('Error adding ZetaChain:', error);
        }
      }
    }
  };
  ```

  // Note: For a cleaner implementation, you can replace the above inline network switching logic
  // with the custom network switching utility function 'switchToZetaChain' located in
  // 'frontend/src/utils/networkSwitchingUtility.js'. This utility encapsulates the logic for both
  // switching to ZetaChain and adding it if not already present.

- **Balance Check**
  - Ensure proper ZETA balance check using wagmi's useBalance hook
  ```javascript
  // Native token balance check - no token address needed for native token
  const { data: balanceData } = useBalance({
    address,
    chainId: ZETACHAIN_ID
  });
  ```

- **Conditional Rendering**
  - Only render main app components when wallet is connected and on the correct network
  - Provide clear guidance on network switching with helpful links

---

## 2. Token Creation Interface

### Flow Stages
1. **Form Input**
   - User enters token details (name, symbol, total supply, decimals)
   - User uploads token icon
   - System displays icon preview
   - User selects target chains for deployment

2. **Distribution Configuration**
   - User adds recipient addresses and amounts manually or via CSV upload
   - System validates addresses and CSV format
   - System displays distribution preview

3. **Fee Information**
   - System displays required deployment fee (1 ZETA)
   - System shows user's current ZETA balance
   - System validates sufficient balance for deployment

### Key Technical Considerations
- **Form Data Preparation**
  ```javascript
  // Correctly prepare form data with exact field names
  const formDataToSend = new FormData();
  formDataToSend.append('token_name', formData.name);
  formDataToSend.append('token_symbol', formData.symbol);
  formDataToSend.append('decimals', formData.decimals);
  formDataToSend.append('total_supply', formData.totalSupply);
  
  // Format distribution data according to backend expectations
  const distributionsForBackend = allDistributions.map(dist => ({
    recipient_address: dist.address,  // Must match backend field name
    chain_id: chainId.toString(),     // Convert to string
    token_amount: dist.amount
  }));
  
  formDataToSend.append('selected_chains', JSON.stringify([chainId.toString()]));
  formDataToSend.append('distributions_json', JSON.stringify(distributionsForBackend));
  if (tokenIcon) {
    formDataToSend.append('icon', tokenIcon);
  }
  ```

- **CSV Parsing**
  - Implement robust CSV validation
  - Check for required columns (address, amount)
  - Validate address format
  - Handle whitespace and empty lines properly

- **Validation Logic**
  ```javascript
  const validateForm = () => {
    const newErrors = {};
    
    // Network validation
    if (!isZetaChainNetwork) {
      newErrors.network = 'Please switch to ZetaChain network';
      return false;
    }

    // Balance validation - properly format amounts
    if (balanceData && parseFloat(balanceData.formatted) < ZETA_FEE) {
      newErrors.balance = `Insufficient ZETA balance. You need at least ${ZETA_FEE} ZETA. Current balance: ${parseFloat(balanceData.formatted).toFixed(2)} ZETA`;
      return false;
    }
    
    // Other validations...
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  ```

---

## 3. Token Deployment Process

### Flow Stages
1. **Fee Payment**
   - User clicks "Deploy Token" button
   - System validates form inputs
   - System sends token creation request to backend
   - System requests fee payment transaction
   - User approves transaction in wallet
   - System waits for transaction confirmation

2. **Deployment Status Tracking**
   - System displays deployment pending state
   - System polls for deployment status updates
   - System updates UI based on deployment progress

3. **Deployment Completion**
   - System displays success message when deployment completes
   - System shows deployed contract addresses on each chain
   - User can view details or return to dashboard

### Key Technical Considerations
- **Transaction Handling**
  ```javascript
  // Fee payment with proper error handling
  try {
    // Create token configuration first
    const response = await apiService.createToken(formDataToSend);
    setDeploymentDetails(response);

    // Handle fee payment
    const feeInWei = ethers.parseEther(ZETA_FEE.toString());
    
    // IMPORTANT: Don't convert BigInt to string
    const txResult = await sendTransaction({
      to: UNIVERSAL_TOKEN_SERVICE_WALLET,
      value: feeInWei
    });
    
    if (!txResult || !txResult.hash) {
      throw new Error('Transaction failed: No transaction hash returned');
    }
    
    // Start deployment with fee payment transaction
    await apiService.deployToken(response.id, {
      fee_paid_tx: txResult.hash
    });
    
    setDeploymentStatus('pending');
  } catch (error) {
    console.error('Error:', error);
    setDeploymentStatus('error');
    setErrors({...errors, submission: error.message});
  }
  ```

- **Status Polling**
  ```javascript
  // Poll for deployment status updates
  useEffect(() => {
    let intervalId;

    if (deploymentStatus === 'pending' && deploymentDetails?.id) {
      intervalId = setInterval(async () => {
        try {
          const logs = await apiService.getDeploymentLogs(deploymentDetails.id);
          const updatedDetails = await apiService.getToken(deploymentDetails.id);
          
          setDeploymentDetails({
            ...updatedDetails,
            deployments: logs
          });

          // Check deployment status
          if (updatedDetails.deployment_status === 'completed') {
            setDeploymentStatus('success');
            clearInterval(intervalId);
          } else if (updatedDetails.deployment_status === 'failed') {
            setDeploymentStatus('error');
            clearInterval(intervalId);
          }
        } catch (error) {
          console.error('Error polling deployment status:', error);
        }
      }, 5000); // Poll every 5 seconds
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [deploymentStatus, deploymentDetails?.id]);
  ```

- **User Experience During Deployment**
  - Show clear loading indicators
  - Provide meaningful status messages
  - Display contract addresses as they become available
  - Handle errors gracefully with retry options

---

## 4. Token Transfer Flow

### Flow Stages
1. **Token Selection**
   - User views all their tokens grouped by name
   - Each token shows balances across different chains
   - User clicks on a token+chain combination to select as source
   - Selected token+chain is highlighted

2. **Destination Selection**
   - Selected token card appears below
   - Shows source chain and current balance
   - Displays all available destination chains as tiles
   - User can select multiple destination chains
   - "Coming Soon" chains are disabled

3. **Transfer Details**
   - User enters transfer amount
   - Optional recipient address (defaults to user's address)
   - Shows available balance for reference
   - Submit button enabled when all required fields are filled

4. **Transfer Processing**
   - User clicks "Transfer Tokens"
   - System initiates cross-chain transfer
   - Shows transaction hash with link to explorer
   - Displays success message with transfer details

### Key Technical Considerations
- **Token Data Structure**
  ```javascript
  const token = {
    id: string,
    name: string,
    symbol: string,
    iconUrl: string,
    deployedChains: string[],
    balances: {
      [chainId: string]: number
    }
  };
  ```

- **Chain Selection Logic**
  ```javascript
  // Get available destination chains
  const getAvailableDestinationChains = () => {
    if (!selectedToken) return [];
    
    // Return all supported chains except the source chain
    return supportedChains.filter(chain => 
      chain.id !== formData.sourceChain
    );
  };
  ```

- **Transfer Processing**
  ```javascript
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setTransferring(true);
      setTransferResult(null);
      
      const result = await apiService.transferTokens({
        tokenId: formData.tokenId,
        sourceChain: formData.sourceChain,
        destinationChain: formData.destinationChain,
        transferAmount: formData.transferAmount,
        recipientAddress: formData.recipientAddress || address
      });
      
      setTransferResult(result);
    } catch (error) {
      console.error('Transfer failed:', error);
      alert(`Transfer failed: ${error.message}`);
    } finally {
      setTransferring(false);
    }
  };
  ```

### User Experience Considerations
1. **Visual Feedback**
   - Clear indication of selected token and chain
   - Disabled state for unavailable chains
   - Loading states during transfer
   - Success/error messages with transaction details

2. **Error Handling**
   - Validate transfer amount against available balance
   - Check for valid recipient address format
   - Handle network errors gracefully
   - Provide clear error messages

3. **Accessibility**
   - Keyboard navigation for chain selection
   - Clear focus states
   - Descriptive labels and helper text
   - High contrast for important information

---

## 5. Additional Workflows

### Token Management & Transfer
1. **Dashboard View**
   - Show all created tokens with summary information
   - Display token balances across chains
   - Provide options to view details or transfer tokens

2. **Token Transfer**
   - Allow selection of source and destination chains
   - Show estimated fees and transaction times
   - Process and track cross-chain transfers

### Technical Considerations
- **Native Balance Checking**
  - Use chain-specific RPC endpoints for reliable balance checks
  - Handle different token standards and decimals correctly

- **Transaction Tracking**
  - Implement webhook or polling for cross-chain transaction status
  - Show clear transaction steps in the UI

---

## 6. Error Handling & Recovery

### Common Error Scenarios
1. **Wallet Connection Errors**
   - Wallet not installed
   - User rejects connection
   - Network switching fails

2. **Transaction Errors**
   - User rejects transaction
   - Insufficient balance
   - Network congestion / failed transaction

3. **API Errors**
   - Backend unavailable
   - Request validation errors
   - CORS issues

### Technical Implementation
- **Frontend Error Boundaries**
  - Implement React error boundaries for component-level errors
  - Provide meaningful error messages with recovery options

- **Transaction Recovery**
  ```javascript
  try {
    // Transaction logic
  } catch (error) {
    // Error classification and handling
    if (error.code === 4001) {
      // User rejected transaction
      setErrors({...errors, submission: 'Transaction was rejected. Please try again.'});
    } else if (error.message.includes('insufficient funds')) {
      // Insufficient balance
      setErrors({...errors, submission: `Insufficient ZETA balance. Please add more ZETA to your wallet.`});
    } else {
      // Other errors
      setErrors({...errors, submission: `Transaction failed: ${error.message}`});
    }
  }
  ```

- **API Error Handling**
  ```javascript
  // In API service
  if (!response.ok) {
    const errorText = await response.text();
    console.error('API Error:', response.status, errorText);
    throw new Error(`API Error (${response.status}): ${errorText || 'Unknown error'}`);
  }
  ```

---

## 7. Best Practices & Lessons Learned

### Frontend Best Practices
1. **Wallet Integration**
   - Use established libraries (wagmi, ethers) for reliable wallet connections
   - Handle network switching with fallbacks for adding networks
   - Validate network and balance before operations

2. **Form Handling**
   - Match field names exactly with backend expectations
   - Validate addresses and amounts client-side
   - Convert data types appropriately (strings for BigInts, JSON strings for arrays)

3. **Transaction Processing**
   - Don't convert BigInt values to strings when using wagmi hooks
   - Handle transaction confirmation and errors explicitly
   - Update UI based on transaction stages

### Backend Best Practices
1. **API Route Configuration**
   - Use consistent prefix strategy (either in router or in app.include_router, not both)
   - Document endpoints clearly with expected parameters

2. **CORS Handling**
   - Configure CORS middleware with appropriate origins
   - Include development mode with wildcard origins

3. **Authentication**
   - Implement development bypass for testing
   - Use clear error messages for authentication failures

---

## 8. Flow Diagrams

### Main User Flow
```
Landing Page → Connect Wallet → Switch to ZetaChain →
Token Creation Form → Enter Details → Upload Icon →
Add Distributions → Validate & Deploy → Pay Fee →
Monitor Deployment → View Success
```

### Error Recovery Flows
```
Wallet Connection Error → Retry or Install Wallet Instructions
Network Switch Error → Manual Network Addition Instructions
Deployment Error → View Details → Retry Deployment
```

---

This application flow document provides a comprehensive guide to implementing the Universal Token Launcher, with particular attention to avoiding common pitfalls and ensuring a smooth user experience.
```