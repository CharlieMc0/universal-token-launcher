# Universal Launcher Application Flow

This document provides a comprehensive walkthrough of the user journey through the Universal Launcher application, with special attention to potential pain points and best practices based on our implementation experience.

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

## 2. Create Flow

### Flow Stages
1. **Asset Type Selection**
   - User arrives at the Create page
   - User selects between "Create Token" or "Create NFT Collection" using toggle buttons
   - System shows the appropriate creation form based on selection

2. **Token Creation Form** (when "Create Token" is selected)
   - User enters token details (name, symbol, total supply, decimals)
   - User uploads token icon
   - User selects target chains for deployment
   - User configures token distribution

3. **NFT Collection Creation Form** (when "Create NFT Collection" is selected)
   - User enters collection details (name, description, quantity, price)
   - User uploads collection artwork
   - User selects target chains for deployment
   - User optionally configures free NFT distribution

4. **Fee Information**
   - System displays required deployment fee (1 ZETA)
   - System shows user's current ZETA balance
   - System validates sufficient balance for deployment

### Key Technical Considerations
- **Toggle Implementation**
  ```javascript
  const [activeTab, setActiveTab] = useState('token'); // 'token' or 'nft'
  
  return (
    <PageContainer>
      <PageTitle>Create Digital Assets</PageTitle>
      <PageDescription>
        Launch tokens or NFT collections that work seamlessly across multiple blockchains with ZetaChain technology.
      </PageDescription>
      
      <ToggleContainer>
        <ToggleButton 
          active={activeTab === 'token'} 
          position="left"
          onClick={() => setActiveTab('token')}
        >
          Create Token
        </ToggleButton>
        <ToggleButton 
          active={activeTab === 'nft'} 
          position="right"
          onClick={() => setActiveTab('nft')}
        >
          Create NFT Collection
        </ToggleButton>
      </ToggleContainer>
      
      {activeTab === 'token' ? <LaunchPage embedded={true} /> : <LaunchNFTPage embedded={true} />}
    </PageContainer>
  );
  ```

- **Embedded Page Design**
  - Original pages are reused with an `embedded` prop
  - When embedded, page titles and padding are adjusted
  ```javascript
  const PageContainer = styled.div`
    max-width: ${props => props.embedded ? '100%' : '800px'};
    margin: 0 auto;
    padding: ${props => props.embedded ? '0' : '40px 20px'};
  `;

  const PageTitle = styled.h1`
    margin-bottom: 32px;
    text-align: center;
    display: ${props => props.embedded ? 'none' : 'block'};
  `;
  ```

- **Form Data Preparation**
  ```javascript
  // Correctly prepare form data with exact field names
  const formDataToSend = new FormData();
  formDataToSend.append('tokenName', formData.name);
  formDataToSend.append('tokenSymbol', formData.symbol);
  formDataToSend.append('decimals', formData.decimals);
  formDataToSend.append('totalSupply', formData.totalSupply);
  
  // Format distribution data according to backend expectations
  const distributionsForBackend = allDistributions.map(dist => ({
    recipientAddress: dist.address,
    chainId: chainId.toString(),
    tokenAmount: dist.amount
  }));
  
  formDataToSend.append('selectedChains', JSON.stringify([chainId.toString()]));
  formDataToSend.append('distributionsJson', JSON.stringify(distributionsForBackend));
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

## 3. Asset Deployment Process

### Flow Stages
1. **Fee Payment**
   - User clicks "Deploy Token" button
   - System validates form inputs
   - System sends token creation request to backend (`POST /api/tokens`)
   - System requests fee payment transaction (using `wagmi` `sendTransactionAsync`)
   - User approves transaction in wallet
   - System waits for transaction confirmation on-chain (using `publicClient.getTransactionReceipt`)
   - System notifies backend about fee payment (`POST /api/tokens/:id/deploy`)

2. **Deployment Status Tracking & Polling**
   - System displays deployment pending state (`deploymentStatus` = `INITIATED` or `POLLING`)
   - **Frontend polls backend periodically (`useEffect` hook):**
     - Calls `apiService.getToken(tokenId)` to check overall `deployment_status`.
     - If status is `completed` or `failed`, polling stops.
     - If still `pending` or similar, polling continues.
   - System updates UI with meaningful status messages (e.g., "Backend is deploying contracts...").

3. **Deployment Completion / Confirmation**
   - **If backend status is `completed`:**
     - System fetches detailed deployment logs (`apiService.getDeploymentLogs(tokenId)`).
     - System updates state (`deploymentStatus` = `COMPLETED`).
     - **System renders the `DeploymentConfirmation` component:**
       - Displays a success message.
       - Shows the `tokenId`.
       - Lists each successfully deployed contract (`chain_name`, `contract_address`).
       - Shows contract verification status (`verificationStatus`) using badges.
       - Provides links to view contracts on block explorers (`verifiedUrl` or fallback).
       - Offers a button to start a new deployment (resets the form).
   - **If backend status is `failed`:**
     - System fetches deployment logs (if available).
     - System updates state (`deploymentStatus` = `FAILED_DEPLOYMENT`).
     - System displays an error message, potentially including details from the logs.
     - Offers a button to start over.

### Key Technical Considerations
- **Transaction Handling**
  ```javascript
  // Fee payment and deploy API call (simplified)
  try {
    // ... (Create Token Config) ...
    setCreatedTokenId(response.tokenId);
    setDeploymentStatus(DEPLOYMENT_STATUS.PAYING);

    // ... (Process Fee Payment Transaction with Confirmation) ...
    const feeTxHash = txHashString; // Assume hash is retrieved

    // ... (Wait for Transaction Confirmation) ...
    if (!confirmed) {
      throw new Error('Transaction confirmation timed out...');
    }

    // Notify backend to start deployment
    await apiService.deployToken(tokenId, { fee_paid_tx: feeTxHash });
    setDeploymentStatus(DEPLOYMENT_STATUS.INITIATED); // <<<< START POLLING HERE
    setProcessingStep('Deployment initiated with backend! Polling for status...');

  } catch (error) {
    console.error('Error during creation/payment/deploy call:', error);
    setErrors({ ...errors, submission: error.message });
    // Set appropriate failure status (e.g., FAILED_PAYMENT or FAILED_DEPLOYMENT)
    setDeploymentStatus(DEPLOYMENT_STATUS.FAILED_PAYMENT);
  }
  ```

- **Status Polling**
  ```javascript
  // Poll for deployment status updates using useEffect
  useEffect(() => {
    let intervalId;

    const pollStatus = async () => {
      if (!createdTokenId) return;
      console.log(`Polling status for Token ID: ${createdTokenId}`);
      setProcessingStep('Checking deployment status...');

      try {
        const tokenData = await apiService.getToken(createdTokenId);

        if (tokenData.deployment_status === 'completed') {
          const logs = await apiService.getDeploymentLogs(createdTokenId);
          setDeploymentLogs(logs);
          setDeploymentStatus(DEPLOYMENT_STATUS.COMPLETED);
          clearInterval(intervalId);
        } else if (tokenData.deployment_status === 'failed') {
          const logs = await apiService.getDeploymentLogs(createdTokenId);
          setDeploymentLogs(logs);
          setErrors({ ...errors, submission: `Deployment failed: ${tokenData.error_message || 'Unknown reason'}` });
          setDeploymentStatus(DEPLOYMENT_STATUS.FAILED_DEPLOYMENT);
          clearInterval(intervalId);
        } else {
          setDeploymentStatus(DEPLOYMENT_STATUS.POLLING);
          setProcessingStep('Backend is deploying contracts...');
        }
      } catch (error) {
        console.error('Polling error:', error);
        // Handle polling errors, maybe stop after too many failures
      }
    };

    if (deploymentStatus === DEPLOYMENT_STATUS.INITIATED || deploymentStatus === DEPLOYMENT_STATUS.POLLING) {
      pollStatus(); // Initial check
      intervalId = setInterval(pollStatus, 5000); // Poll every 5 seconds
    }

    return () => { // Cleanup interval
      if (intervalId) clearInterval(intervalId);
    };
  }, [deploymentStatus, createdTokenId, errors]); // Dependencies
  ```

- **User Experience During Deployment**
  - Show clear loading indicators and status messages during payment, confirmation, and polling.
  - Display the fee transaction hash with an explorer link immediately.
  - Provide meaningful status messages reflecting the current stage (paying fee, confirming tx, initiating deployment, polling status, deploying contracts).
  - On completion, clearly display the `DeploymentConfirmation` component with all details.
  - Handle errors gracefully, distinguishing between payment failures (with retry option) and deployment failures (with start over option).

---

## 4. Transfer Flow

### Flow Stages
1. **Asset Type Selection**
   - User arrives at the Transfer page
   - User selects between "Transfer Tokens" or "Transfer NFTs" using toggle buttons
   - System shows the appropriate transfer interface based on selection

2. **Token Transfer Interface** (when "Transfer Tokens" is selected)
   - User views all their tokens grouped by name
   - Each token shows balances across different chains
   - User clicks on a token+chain combination to select as source
   - User selects destination chains
   - User enters transfer amount and recipient address (optional)

3. **NFT Transfer Interface** (when "Transfer NFTs" is selected)
   - User views all their NFT collections
   - User selects an NFT to transfer
   - User selects a destination chain
   - User enters recipient address
   - System processes the NFT transfer

### Key Technical Considerations
- **Toggle Implementation**
  ```javascript
  const [activeTab, setActiveTab] = useState('token'); // 'token' or 'nft'
  
  return (
    <PageContainer>
      <PageTitle>Transfer Digital Assets</PageTitle>
      <PageDescription>
        Move your tokens or NFTs between chains effortlessly with ZetaChain's cross-chain technology.
      </PageDescription>
      
      <ToggleContainer>
        <ToggleButton 
          active={activeTab === 'token'} 
          position="left"
          onClick={() => setActiveTab('token')}
        >
          Transfer Tokens
        </ToggleButton>
        <ToggleButton 
          active={activeTab === 'nft'} 
          position="right"
          onClick={() => setActiveTab('nft')}
        >
          Transfer NFTs
        </ToggleButton>
      </ToggleContainer>
      
      {activeTab === 'token' ? <TransferTokens embedded={true} /> : <TransferNFTPage embedded={true} />}
    </PageContainer>
  );
  ```

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

## 5. Buy Flow

### Flow Stages
1. **Asset Type Selection**
   - User arrives at the Buy page
   - User selects between "Buy Tokens" or "Buy NFTs" using toggle buttons
   - System shows the appropriate purchasing interface based on selection

2. **NFT Purchase Interface** (when "Buy NFTs" is selected)
   - User views available NFT collections
   - User selects a collection to purchase from
   - User selects ZRC20 payment asset (including Bitcoin)
   - User selects destination chain for minting
   - User selects quantity and completes purchase

3. **Token Purchase Interface** (when "Buy Tokens" is selected)
   - System displays "Coming Soon" message
   - Future implementation will allow purchasing tokens with ZRC20 assets

### Key Technical Considerations
- **Toggle Implementation**
  ```javascript
  const [activeTab, setActiveTab] = useState('nft'); // 'token' or 'nft'
  
  return (
    <PageContainer>
      <PageTitle>Buy Digital Assets</PageTitle>
      <PageDescription>
        Purchase tokens or NFTs using any ZRC20 asset, including Bitcoin, and receive them on your preferred chain.
      </PageDescription>
      
      <ToggleContainer>
        <ToggleButton 
          active={activeTab === 'token'} 
          position="left"
          onClick={() => setActiveTab('token')}
        >
          Buy Tokens
        </ToggleButton>
        <ToggleButton 
          active={activeTab === 'nft'} 
          position="right"
          onClick={() => setActiveTab('nft')}
        >
          Buy NFTs
        </ToggleButton>
      </ToggleContainer>
      
      {activeTab === 'nft' ? (
        <BuyNFTPage embedded={true} />
      ) : (
        <ComingSoon>
          <ComingSoonTitle>Token Marketplace Coming Soon</ComingSoonTitle>
          <ComingSoonText>
            Our token marketplace is currently under development. Soon you'll be able to purchase tokens using any ZRC20 asset!
          </ComingSoonText>
        </ComingSoon>
      )}
    </PageContainer>
  );
  ```

- **Payment Options Implementation**
  ```javascript
  // Handle payment asset selection
  const handlePaymentAssetSelect = (asset) => {
    setSelectedPaymentAsset(asset);
  };
  
  // Handle mint chain selection
  const handleMintChainSelect = (chain) => {
    setSelectedMintChain(chain);
  };
  ```

---

## 6. Additional Workflows

### Asset Management Dashboard
1. **Dashboard View**
   - Show all created assets with summary information
   - Display token balances and NFT holdings across chains
   - Provide options to view details or perform actions

### Technical Considerations
- **Native Balance Checking**
  - Use chain-specific RPC endpoints for reliable balance checks
  - Handle different token standards and decimals correctly

- **Transaction Tracking**
  - Implement webhook or polling for cross-chain transaction status
  - Show clear transaction steps in the UI

---

## 7. Error Handling & Recovery

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

- **Wallet Readiness Verification**
  ```javascript
  // Add a state to track wallet readiness
  const [walletReady, setWalletReady] = useState(false);
  
  // Use walletClient hook from wagmi
  const { data: walletClient } = useWalletClient({ chainId: ZETACHAIN_ID });
  
  // Check wallet readiness when dependencies change
  useEffect(() => {
    if (isConnected && isZetaChainNetwork && walletClient) {
      setWalletReady(true);
    } else {
      setWalletReady(false);
    }
  }, [isConnected, isZetaChainNetwork, walletClient]);
  
  // Verify readiness before transaction
  if (!walletReady) {
    // Wait briefly for wallet to be ready
    setProcessingStep('Preparing wallet...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (!walletClient) {
      throw new Error('Wallet client not available. Please ensure your wallet is properly connected.');
    }
  }
  ```

- **Transaction Preparation and Submission**
  ```javascript
  // Prepare transaction parameters
  const txParams = {
    to: UNIVERSAL_TOKEN_SERVICE_WALLET,
    value: feeInWei,
    chainId: ZETACHAIN_ID // Ensure transaction is sent on the correct chain
  };
  
  setProcessingStep('Waiting for wallet signature...');
  
  let txResult;
  try {
    // Try to send the transaction with a separate try/catch
    txResult = await sendTransaction(txParams);
    console.log('Transaction request sent, waiting for user to sign:', txResult);
  } catch (sendError) {
    // Specific error handling for sendTransaction failures
    console.error('Failed to send transaction:', sendError);
    
    // More descriptive error message for different error cases
    if (sendError.message.includes('user rejected')) {
      throw new Error('Transaction was rejected by the user. Please try again.');
    } else if (sendError.message.includes('network') || sendError.message.includes('chain')) {
      throw new Error('Network error: Please ensure you are connected to ZetaChain and try again.');
    } else {
      throw new Error(`Failed to send transaction: ${sendError.message}`);
    }
  }
  ```

- **Transaction Hash Display and Tracking**
  ```javascript
  // Save and display transaction hash
  setTransactionHash(txResult.hash);
  
  // Render transaction hash with explorer link
  {transactionHash && (
    <div style={{ margin: '15px 0', padding: '10px', backgroundColor: 'rgba(60, 157, 242, 0.1)', borderRadius: '8px' }}>
      <p style={{ marginBottom: '5px', fontWeight: 'bold' }}>Transaction Hash:</p>
      <p style={{ wordBreak: 'break-all', fontSize: '14px' }}>{transactionHash}</p>
      <p style={{ marginTop: '10px' }}>
        <a 
          href={`https://explorer.zetachain.com/tx/${transactionHash}`} 
          target="_blank" 
          rel="noopener noreferrer"
          style={{ 
            color: 'var(--accent-primary)', 
            textDecoration: 'none',
            padding: '5px 10px',
            border: '1px solid var(--accent-primary)',
            borderRadius: '5px',
            fontSize: '14px',
            display: 'inline-block',
            marginTop: '5px'
          }}
        >
          View on Explorer
        </a>
      </p>
    </div>
  )}
  ```

- **Transaction Confirmation Handling**
  ```javascript
  // Wait for transaction confirmation before continuing
  setProcessingStep('Waiting for transaction confirmation (this may take 10-15 seconds)...');
  
  let confirmed = false;
  let attempts = 0;
  const maxAttempts = 20; // 20 attempts * 1.5 seconds = 30 seconds max wait time
  
  while (!confirmed && attempts < maxAttempts) {
    try {
      attempts++;
      
      // Try to get transaction receipt to check if confirmed
      const txReceipt = await publicClient.getTransactionReceipt({ 
        hash: txResult.hash 
      });
      
      if (txReceipt && txReceipt.status === 'success') {
        confirmed = true;
        console.log('Transaction confirmed:', txReceipt);
      } else {
        // Wait before trying again
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    } catch (error) {
      console.log(`Waiting for confirmation (attempt ${attempts}/${maxAttempts})...`);
      // Wait before trying again
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }
  
  if (!confirmed) {
    throw new Error('Transaction confirmation timed out. The transaction may still complete - please check your wallet and retry later if needed.');
  }
  
  // Only now proceed with the API call
  await apiService.deployToken(tokenId, {
    fee_paid_tx: txResult.hash
  });
  ```

- **Retry Mechanism**
  ```javascript
  // Show retry button for failed transactions
  {showRetryButton && (
    <div style={{ marginTop: '20px' }}>
      <p>Transaction failed. Would you like to try again?</p>
      <ButtonContainer>
        <SubmitButton onClick={handleRetryTransaction}>
          Retry Transaction
        </SubmitButton>
      </ButtonContainer>
    </div>
  )}
  
  // Retry logic with attempt tracking
  const handleRetryTransaction = async () => {
    if (createdTokenId) {
      setTransactionRetries(prev => prev + 1);
      setShowRetryButton(false);
      setErrors({});
      setTransactionHash(null);
      const success = await processFeePayment(createdTokenId);
      if (!success && transactionRetries >= 2) {
        // After 3 attempts, suggest manual deployment
        setErrors({
          ...errors,
          submission: `Multiple transaction attempts failed. Please try again later or contact support with your Token ID: ${createdTokenId}.`
        });
      }
    }
  };
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

## 8. Best Practices & Lessons Learned

### Frontend Best Practices
1. **Wallet Integration**
   - Use established libraries (wagmi, ethers) for reliable wallet connections
   - Handle network switching with fallbacks for adding networks
   - Validate network and balance before operations
   - Check wallet readiness before attempting transactions
   - Use the walletClient hook to ensure proper wallet initialization

2. **Form Handling**
   - Match field names exactly with backend expectations
   - Validate addresses and amounts client-side
   - Convert data types appropriately (strings for BigInts, JSON strings for arrays)

3. **Transaction Processing**
   - Don't convert BigInt values to strings when using wagmi hooks
   - Handle transaction confirmation and errors explicitly
   - Wait for blockchain confirmation before notifying backend APIs
   - Update UI based on transaction stages with clear status messages
   - Implement retry mechanisms for failed transactions
   - Show transaction hash with explorer link for transparency
   - Use separate try/catch blocks for transaction preparation and confirmation
   - Provide clear and specific error messages for different failure scenarios

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

## 9. Contract Verification

The Universal Token Launcher now provides automatic contract verification for deployed tokens, enhancing transparency and trust for users.

### 9.1 Verification Process Overview

1. **Automatic Verification:**
   - Contracts are automatically verified after deployment
   - No user intervention required
   - Process runs in background during token deployment

2. **Verification Status:**
   - Verification status is stored directly in the token's `connected_chains_json` attribute
   - Each chain entry contains its own `verification_status` field
   - Possible statuses: pending, processing, verified, failed, skipped
   - Error messages stored alongside status if verification fails

3. **Explorer Integration:**
   - Direct links to verified contracts on block explorers
   - Explorer URLs stored in `explorer_url` and `blockscout_url` fields
   - Formatted `contract_url` provides ready-to-use links for frontend
   - Different explorer support based on chain:
     - Blockscout for ZetaChain (Athens)
     - Etherscan for Ethereum networks (Sepolia)
     - Basescan for Base (Base Sepolia)
     - Other Etherscan-compatible explorers for additional chains

### 9.2 User Benefits

1. **Enhanced Transparency:**
   - Users can inspect the source code on block explorers
   - Builds trust by allowing code verification
   - Confirms contract behavior matches expected functionality

2. **Better Debugging:**
   - Makes troubleshooting easier if issues arise
   - Allows developers to understand token behavior
   - Provides insight into contract interactions

3. **Social Proof:**
   - Shows verification checkmark on explorers
   - Increases credibility for tokens
   - Standard practice for legitimate projects

### 9.3 Implementation Details

1. **User Experience:**
   - Seamlessly integrated into deployment flow
   - Progress indicators during verification
   - Success or failure notification

2. **Verification Status Storage:**
   - Status integrated directly into the token database model
   - Stored in `connected_chains_json` for each deployed chain
   - ZetaChain-specific verification information in `zeta_chain_info`
   - Example JSON structure:
     ```json
     {
       "11155111": {
         "status": "completed",
         "contract_address": "0x5678...",
         "transaction_hash": "0xabcd...",
         "verification_status": "verified",
         "explorer_url": "https://sepolia.etherscan.io",
         "contract_url": "https://sepolia.etherscan.io/address/0x5678..."
       }
     }
     ```

3. **UI Elements:**
   ```jsx
   // Example verification status display in token details
   <VerificationStatus status={chain.verification_status}>
     {chain.verification_status === 'verified' ? (
       <VerificationLink 
         href={chain.contract_url} 
         target="_blank" 
         rel="noopener noreferrer"
       >
         ✓ Verified - View on Explorer
       </VerificationLink>
     ) : chain.verification_status === 'failed' ? (
       <VerificationError>
         ✗ Verification Failed: {chain.verification_message || 'Unknown error'}
       </VerificationError>
     ) : (
       <span>{capitalizeFirstLetter(chain.verification_status)}...</span>
     )}
   </VerificationStatus>
   ```

4. **Technical Implementation:**
   - Verification service updates database directly after verification attempts
   - Takes database session as parameter for database operations
   - Status updates happen in real-time during verification process
   - Explorer API keys configured on backend
   - Proper compiler settings
   - Accurate source code management

This enhanced verification feature significantly improves the user experience by providing verified, transparent contracts without requiring any additional steps from users, while maintaining a comprehensive record of verification statuses for each deployed contract.

---

## 10. Testing Strategies

### Integration Testing Approach

1. **Component Isolation**
   - Test components in isolation by mocking all external dependencies
   - Mock API service calls to simulate various response scenarios
   - Mock wallet connections and blockchain interactions
   - Focus on testing component behavior, not implementation details

2. **Form Submission Testing**
   - Test complete form submission flows from input to API call
   - Verify that form data is correctly formatted and sent to the API
   - Test validation rules and error handling
   - Use `screen.getByRole` with name options for more reliable button selection:
     ```javascript
     // More reliable than generic queries
     const submitButton = screen.getByRole('button', { name: 'Launch Token' });
     fireEvent.click(submitButton);
     ```

3. **Asynchronous State Management**
   - Test loading states properly with waitFor and async assertions
   - Verify that loading indicators appear and disappear appropriately
   - Test both the loading and loaded states:
     ```javascript
     // Check loading state first
     expect(screen.getByText(/loading your tokens/i)).toBeInTheDocument();
     
     // Then wait for loading to resolve
     await waitFor(() => {
       expect(screen.queryByText(/loading your tokens/i)).not.toBeInTheDocument();
     });
     
     // Finally check that content appears
     expect(screen.getByText(/My Universal Token/i)).toBeInTheDocument();
     ```

4. **API Mock Implementation**
   - Implement realistic API mocks with delays to simulate network requests
   - Test both success and error scenarios for each API call
   - Simulate timeouts and network errors
   - Example implementation:
     ```javascript
     apiService.getUserTokens.mockImplementation(() => {
       return new Promise((resolve) => {
         // Add delay to simulate network request
         setTimeout(() => {
           resolve([
             { id: 'token1', name: 'My Universal Token', /* other props */ },
             { id: 'token2', name: 'Another Token', /* other props */ }
           ]);
         }, 100);
       });
     });
     ```

5. **Transaction Testing**
   - Mock blockchain transactions to test transaction flow
   - Test error scenarios like user rejection and failed transactions
   - Simulate transaction waiting and confirmation
   - Check that UI updates correctly during transaction stages

### Testing Gotchas and Solutions

1. **Element Selection Challenges**
   - **Problem**: Elements may be nested in styled-components making selection difficult
   - **Solution**: Use more specific queries with text content or roles, and possibly add test IDs

2. **Asynchronous Testing Issues**
   - **Problem**: Tests may fail due to timing issues with state updates
   - **Solution**: Use `waitFor` with appropriate timeouts and check both appearance and disappearance of elements

3. **Mock Implementation Depth**
   - **Problem**: Complex components may require deep mocking of multiple dependencies
   - **Solution**: Create a dedicated test setup file with comprehensive mock implementations

4. **Alert Testing**
   - **Problem**: Browser alerts are not implemented in JSDOM
   - **Solution**: Mock `window.alert` or refactor code to use custom alert components that can be tested

### Continuous Integration Testing

1. **Test Command**
   - Use `npm test -- --testMatch="**/*Integration.test.js" --watchAll=false` to run all integration tests
   - Include specific test files by pattern for more targeted testing

2. **Mocking Strategy**
   - Ensure all external dependencies are properly mocked in CI environment
   - Use consistent mock implementations across tests
   - Consider using MSW (Mock Service Worker) for API mocking in more complex scenarios

---

## 11. Flow Diagrams

### Main User Flows
```
Landing Page → Connect Wallet → Switch to ZetaChain

CREATE FLOW:
Create Page → Toggle Asset Type → Enter Details → 
Add Distributions → Validate & Deploy → Pay Fee →
Monitor Deployment → View Success

TRANSFER FLOW:
Transfer Page → Toggle Asset Type → Select Asset →
Select Destination → Enter Amount/Recipient → Submit →
View Transaction Status

BUY FLOW:
Buy Page → Toggle Asset Type → Select Collection →
Select Payment Asset → Select Destination Chain →
Enter Quantity → Complete Purchase
```

### Error Recovery Flows
```
Wallet Connection Error → Retry or Install Wallet Instructions
Network Switch Error → Manual Network Addition Instructions
Deployment Error → View Details → Retry Deployment
```

### Integration Test Flows
```
LAUNCH INTEGRATION TEST:
Mock API and Wagmi Hooks → Render LaunchPage →
Fill Form Fields → Click Submit Button →
Verify API Calls → Check Deployment Status →
Verify Success/Error States

TRANSFER INTEGRATION TEST:
Mock API and Wagmi Hooks → Render TransferPage →
Verify Loading State → Wait for Token Data →
Verify Tokens Displayed → Select Source and Destination →
Enter Amount → Submit Transfer →
Verify API Calls → Check Transfer Status
```

---

## BlockScout API Integration for Token Transfer Page

### Overview

The Universal Token Launcher's Transfer page uses the BlockScout API to identify tokens owned by users and display them for cross-chain transfers. This integration connects our database records with on-chain token information.

### Implementation Details

1. **Environment Configuration**:
   - The BlockScout API URL is configured in the backend `.env` file:
     ```
     ZETACHAIN_TESTNET_BLOCKSCOUT_API=https://zetachain-testnet.blockscout.com/
     ```

2. **API Integration Flow**:
   - Backend queries the database for deployed Universal Tokens
   - Makes API request to BlockScout: `${process.env.ZETACHAIN_TESTNET_BLOCKSCOUT_API}?module=account&action=tokenlist&address=${walletAddress}`
   - Matches BlockScout token data with our deployed contracts
   - Returns combined data to frontend including token balances

3. **Error Handling**:
   - Improved error handling prevents API issues from breaking the UI
   - Detailed logging helps debug BlockScout API responses
   - Frontend includes fallbacks for missing or incomplete data

4. **Type Consistency**:
   - Database `chainId` is stored as STRING type
   - API queries explicitly convert chainId to string: `String(ZETACHAIN_TESTNET_ID)`
   - This prevents type mismatch errors in database queries

### API Response Structure

The BlockScout API returns token data in this format:
```json
{
  "status": "1",
  "message": "OK",
  "result": [
    {
      "balance": "1000000000000000000",
      "contractAddress": "0x123...",
      "decimals": "18",
      "name": "Example Token",
      "symbol": "EXMP",
      "type": "ERC-20"
    }
  ]
}
```

### Maintenance Considerations

When working with the BlockScout API:
1. Monitor for API changes or rate limits
2. Consider implementing caching to reduce API load
3. Validate response data before processing
4. Add appropriate timeout handling for API requests
5. Handle network interruptions gracefully

---

This application flow document provides a comprehensive guide to implementing the Universal Launcher, with particular attention to avoiding common pitfalls and ensuring a smooth user experience.