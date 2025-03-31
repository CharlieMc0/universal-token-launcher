# Implementation Plan: Universal Token Launcher

This implementation plan outlines the step-by-step development approach for the Universal Token Launcher, incorporating our experience and best practices to avoid common pitfalls.

---

## Phase 1: Project Setup & Environment Configuration (Weeks 1-2)

### Setup Frontend
1. **Create React Application**
   - Initialize with `create-react-app`
   - Configure ESLint and Prettier

2. **Install Key Dependencies**
   - `wagmi@^2.14.0` - React hooks for Ethereum
   - `ethers@^6.11.1` - Ethereum library
   - `@rainbow-me/rainbowkit@^2.0.0` - Wallet connection UI
   - Note: Ensure version compatibility between wagmi and ethers

3. **Configure Network Settings**
   - Create a dedicated configuration file for supported networks
   ```javascript
   // Example chain configuration
   const ZETACHAIN_CONFIG = {
     id: 7000,
     name: 'ZetaChain',
     network: 'zetachain',
     nativeCurrency: {
       decimals: 18,
       name: 'ZETA',
       symbol: 'ZETA',
     },
     rpcUrls: {
       public: { http: ['https://zetachain-evm.blockpi.network/v1/rpc/public'] },
       default: { http: ['https://zetachain-evm.blockpi.network/v1/rpc/public'] },
     },
     blockExplorers: {
       default: { name: 'ZetaScan', url: 'https://explorer.zetachain.com' },
     }
   };
   ```

4. **Setup API Service Layer**
   - Create `apiService.js` with consistent error handling
   - Use fetch API with proper CORS configuration
   ```javascript
   // API service example
   async createToken(tokenData) {
     try {
       const response = await fetch(`${this.baseUrl}/api/tokens`, {
         method: 'POST',
         headers: { ...this._getAuthHeader() },
         body: tokenData,
         mode: 'cors',
       });
       
       if (!response.ok) {
         const errorText = await response.text();
         console.error('API Error:', response.status, errorText);
         throw new Error(`API Error (${response.status}): ${errorText}`);
       }
       
       return await response.json();
     } catch (error) {
       console.error('Error creating token:', error);
       throw error;
     }
   }
   ```

### Setup Backend
1. **Initialize NodeJS/Express Project**
   - Create project structure with Express framework
   - Configure dependencies in package.json
   ```javascript
   // Example package.json dependencies
   "dependencies": {
     "express": "^4.18.2",
     "cors": "^2.8.5",
     "dotenv": "^16.3.1",
     "ethers": "^6.11.1",
     "sequelize": "^6.37.1",
     "pg": "^8.11.3",
     "jsonwebtoken": "^9.0.2",
     "multer": "^1.4.5-lts.1",
     "csv-parser": "^3.0.0"
   }
   ```

2. **Database Setup**
   - Configure PostgreSQL connection with Sequelize
   - Set up Sequelize models and migrations
   ```javascript
   // Example Sequelize model
   const TokenConfiguration = sequelize.define('TokenConfiguration', {
     id: {
       type: DataTypes.INTEGER,
       primaryKey: true,
       autoIncrement: true
     },
     tokenName: DataTypes.STRING,
     tokenSymbol: DataTypes.STRING,
     decimals: DataTypes.INTEGER,
     totalSupply: DataTypes.DECIMAL,
     creatorWallet: DataTypes.STRING,
     iconUrl: DataTypes.STRING,
     deploymentStatus: DataTypes.STRING,
     feeTransactionHash: DataTypes.STRING
   });
   ```

3. **API Route Configuration**
   - **IMPORTANT**: Configure routers with consistent prefix strategy
   ```javascript
   // In router definition file
   const router = express.Router();
   
   // In app.js - Define route with prefix
   app.use('/api/tokens', tokensRouter);
   ```

4. **CORS Configuration**
   - Set up CORS middleware with proper origin handling
   ```javascript
   app.use(cors({
     origin: process.env.DEBUG === 'true' ? '*' : process.env.CORS_ORIGINS.split(','),
     credentials: true
   }));
   ```

### 6.2 Backend

- **Language:** NodeJS with Express framework for API development
- **Functionality:**
  - **Deployer Service:** Monitors for fee payment, verifies the token creator's wallet, and initiates deployment on selected chains.
  - **Contract Deployment:** Automatically deploys Universal Token contracts across chosen EVM chains using ZetaChain Standard Contracts.
  - **Token Distribution:** Processes the CSV input and triggers minting/distribution transactions.
- **Transfer Processing:** Handles token transfers (burn on source, mint on destination) securely via cross-chain messaging.

---

## Phase 2: Authentication & Wallet Integration (Weeks 3-4)

### Frontend Wallet Integration
1. **Setup Wagmi Client**
   ```javascript
   // Wallet configuration
   const config = createConfig({
     chains: [zetachain, ...otherChains],
     transports: {
       [zetachain.id]: http(zetachain.rpcUrls.default.http[0]),
       // Add other chains as needed
     }
   });
   ```

2. **Implement Wallet Connection UI**
   - Use RainbowKit components for connection flow
   - Add network switching capabilities

3. **Network Switching Utility**
   ```javascript
   // Network switching function
   const handleSwitchToZetaChain = async () => {
     try {
       await switchChain({ chainId: ZETACHAIN_ID });
     } catch (switchError) {
       // If network isn't added yet, try adding it
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
           console.error('Error adding network:', error);
         }
       }
     }
   };
   ```

### Backend Authentication
1. **JWT Token Implementation**
   - Set up JWT token generation and validation
   - Create nonce generation for wallet signatures

2. **Development Mode**
   - Add development bypass option
   ```python
   # In auth middleware
   async def get_current_wallet(credentials: HTTPAuthorizationCredentials = Depends(security)):
       if settings.DEBUG and settings.AUTH_BYPASS_ENABLED:
           return settings.TEST_WALLET_ADDRESS
       
       # Normal auth flow for production
       try:
           token = credentials.credentials
           payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
           wallet_address: str = payload.get("sub")
           # ...rest of auth logic
   ```

---

## Phase 3: Token Creation Interface (Weeks 5-7)

### Frontend Token Creation Form
1. **Form Structure and Validation**
   - Create controlled components for form fields
   - Implement client-side validation

2. **File Uploads**
   - Implement icon uploading with preview
   - Implement CSV distribution list uploading with validation

3. **FormData Handling**
   - **CRITICAL**: Match field names exactly with backend expectations
   ```javascript
   // FormData preparation
   const formDataToSend = new FormData();
   formDataToSend.append('token_name', formData.name);         // Backend expects 'token_name'
   formDataToSend.append('token_symbol', formData.symbol);     // Backend expects 'token_symbol'
   formDataToSend.append('decimals', formData.decimals);
   formDataToSend.append('total_supply', formData.totalSupply);
   
   // Convert array data to JSON strings
   formDataToSend.append('selected_chains', JSON.stringify([chainId.toString()]));
   
   // Convert distributions to backend-expected format
   const distributionsForBackend = distributions.map(dist => ({
     recipient_address: dist.address,     // Backend expects 'recipient_address'
     chain_id: chainId.toString(),        // Backend expects 'chain_id'
     token_amount: dist.amount            // Backend expects 'token_amount'
   }));
   formDataToSend.append('distributions_json', JSON.stringify(distributionsForBackend));
   ```

### Backend Token Creation Endpoint
1. **Multipart Form Handling**
   ```python
   @router.post("/", response_model=TokenConfigurationResponse)
   async def create_token(
       token_name: str = Form(...),
       token_symbol: str = Form(...),
       decimals: int = Form(...),
       total_supply: str = Form(...),
       selected_chains: str = Form(...),  # JSON array of chain IDs
       distributions_json: str = Form(None),  # Optional JSON array of distributions
       icon: UploadFile = File(None),  # Optional token icon
       wallet: str = Depends(get_current_wallet),
       db: Session = Depends(get_db)
   ):
   ```

2. **Data Parsing and Validation**
   - Parse JSON strings from form data carefully
   ```python
   # Parse selected chains
   try:
       selected_chains_list = json.loads(selected_chains)
       if not isinstance(selected_chains_list, list):
           raise ValueError("Selected chains must be a list")
   except json.JSONDecodeError:
       raise HTTPException(
           status_code=status.HTTP_400_BAD_REQUEST,
           detail="Invalid selected chains format"
       )
   ```

3. **Token Service Integration**
   - Create token configuration records with proper error handling
   ```python
   # Error handling in service method
   try:
       # Create token configuration
       token_config = TokenConfiguration(...)
       db.add(token_config)
       db.commit()
       # ...
   except Exception as e:
       db.rollback()
       print(f"Error creating token configuration: {str(e)}")
       raise HTTPException(status_code=500, detail=f"Failed to create token: {str(e)}")
   ```

In the updated implementation, the endpoint still parses JSON strings from form data and attempts to construct a TokenCreationRequest object. However, this instantiation is now wrapped in a try/except block that catches Pydantic's ValidationError. When a validation error is caught, the endpoint iterates over the errors to build a list of JSON-serializable error details (including fields such as loc, msg, type, and, where applicable, input), and returns these details with an HTTP 422 Unprocessable Entity response. This approach ensures that clients receive consistent and parseable error messages.

Additionally, the TokenConfigurationResponse model has been updated not only to convert a Decimal total_supply to a string via a validator, but also to include a new field, fee_paid_tx, which records fee payment transaction details relevant to token deployment status.

---

## Phase 4: Transaction Processing (Weeks 8-10)

### Frontend Transaction Handling
1. **Fee Payment Implementation**
   - Use wagmi's sendTransaction hook
   - **CRITICAL**: Handle BigInt values correctly
   ```javascript
   // Fee payment transaction
   const feeInWei = ethers.parseEther(ZETA_FEE.toString());
   
   // CORRECT: Keep the BigInt value
   const txResult = await sendTransaction({
     to: UNIVERSAL_TOKEN_SERVICE_WALLET,
     value: feeInWei  // Don't convert to string
   });
   
   // Wait for hash before proceeding
   if (!txResult || !txResult.hash) {
     throw new Error('Transaction failed: No transaction hash returned');
   }
   ```

2. **Transaction Confirmation Flow**
   - Update UI based on transaction states
   - Handle transaction rejections gracefully

### Backend Transaction Verification
1. **Fee Payment Verification**
   - Implement robust verification logic
   ```python
   def verify_fee_payment(self, tx_hash: str) -> bool:
       try:
           # Get transaction details
           tx = self.web3.eth.get_transaction(tx_hash)
           tx_receipt = self.web3.eth.get_transaction_receipt(tx_hash)
           
           # Check transaction status
           if tx_receipt.status != 1:
               return False
               
           # Check recipient
           if tx.to.lower() != settings.UNIVERSAL_TOKEN_SERVICE_WALLET.lower():
               return False
               
           # Check amount
           value_in_zeta = Decimal(self.web3.from_wei(tx.value, 'ether'))
           if value_in_zeta < Decimal(settings.FIXED_ZETA_FEE):
               return False
               
           return True
       except Exception as e:
           print(f"Error verifying fee payment: {str(e)}")
           return False
   ```

2. **Deployment Task Handling**
   - Set up asynchronous task execution
   - Implement status tracking for deployed contracts

---

## Phase 5: Deployment Status Tracking (Weeks 11-12)

### Frontend Status Updates
1. **Polling Mechanism**
   - Implement interval-based polling for deployment status
   ```javascript
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

2. **Status Display UI**
   - Create visual indicators for deployment stages
   - Show contract addresses with links to explorers

### Backend Status Endpoints
1. **Deployment Logs API**
   - Create endpoints to retrieve deployment status
   ```python
   @router.get("/{token_id}/deployments", response_model=List[DeploymentLogResponse])
   async def get_token_deployments(
       token_id: int,
       wallet: str = Depends(get_current_wallet),
       db: Session = Depends(get_db)
   ):
       # Verify token belongs to the wallet
       token_config = token_service.get_token_configuration(db, token_id, wallet)
       
       # Get deployment logs
       return token_service.get_token_deployments(db, token_id)
   ```

2. **Status Update Logic**
   - Implement background task for deployment processing
   - Update deployment logs with contract addresses and status

---

## Phase 2: Token Transfer Interface (Completed)

### Components Implemented
1. **TokenTile Component**
   - Visual representation of token+chain combination
   - Shows token icon, name, chain logo, and balance
   - Handles selection and disabled states
   - Responsive design with hover effects

2. **Token Section Components**
   - TokenSection for grouping tokens by name
   - SelectedTokenSection for transfer details
   - Consistent styling and spacing
   - Clear visual hierarchy

3. **Transfer Form**
   - Two-step transfer process
   - Source chain selection
   - Multiple destination chain selection
   - Amount and recipient input
   - Transaction status display

### Technical Implementation
1. **State Management**
   ```javascript
   // Token and chain selection
   const [selectedToken, setSelectedToken] = useState(null);
   const [formData, setFormData] = useState({
     tokenId: '',
     sourceChain: '',
     destinationChain: '',
     transferAmount: '',
     recipientAddress: ''
   });
   ```

2. **Chain Mapping**
   ```javascript
   // Centralized chain information
   export const chainLogos = {
     '7001': '/chain-logos/zetachain.svg',
     '1': '/chain-logos/ethereum.svg',
     // ... other chains
   };
   
   export const chainNames = {
     '7001': 'ZetaChain',
     '1': 'Ethereum',
     // ... other chains
   };
   ```

3. **API Integration**
   ```javascript
   // Mock API service for development
   const getUserTokens = async (walletAddress) => {
     // Simulated API delay
     await new Promise(resolve => setTimeout(resolve, 1000));
     return mockUserTokens;
   };
   
   const transferTokens = async (transferData) => {
     // Simulated API delay
     await new Promise(resolve => setTimeout(resolve, 2000));
     return {
       success: true,
       transactionHash: `0x${Math.random().toString(16).substr(2, 64)}`
     };
   };
   ```

### Testing & Validation
1. **Component Testing**
   - TokenTile selection states
   - Chain selection logic
   - Form validation
   - Error handling

2. **Integration Testing**
   - API service integration
   - Wallet connection
   - Transaction processing
   - Error scenarios

3. **User Testing**
   - Token selection flow
   - Chain selection process
   - Transfer form usability
   - Error message clarity

### Next Steps
1. **Backend Integration**
   - Implement real API endpoints
   - Add transaction monitoring
   - Implement error handling
   - Add rate limiting

2. **UI Enhancements**
   - Add loading animations
   - Improve error states
   - Add transaction history
   - Implement token search

3. **Performance Optimization**
   - Implement caching
   - Add pagination for large token lists
   - Optimize re-renders
   - Add performance monitoring

---

## Risk Mitigation & Testing Plan

### Known Risks and Mitigation
1. **API Route Configuration Issues**
   - Risk: 404 errors due to duplicate prefixes
   - Mitigation: Code review to ensure router prefixes are consistent

2. **CORS Configuration Problems**
   - Risk: Frontend unable to connect to backend
   - Mitigation: Configurable CORS settings with development mode support

3. **Transaction Handling Errors**
   - Risk: Transactions failing silently
   - Mitigation: Comprehensive error handling and user feedback

4. **Form Data Format Mismatches**
   - Risk: Backend unable to process frontend data
   - Mitigation: Clear documentation of expected formats and field names

### Testing Strategy
1. **Unit Testing**
   - Test all API endpoints with various inputs
   - Test form validation logic

2. **Integration Testing**
   - Test wallet connection and transaction flow
   - Test token deployment end-to-end

3. **End-to-End Testing**
   - Full user journey from wallet connection to token deployment
   - Edge cases with various network conditions

---

This implementation plan provides a detailed roadmap for developing the Universal Token Launcher, with specific guidance on avoiding common pitfalls based on our implementation experience.

// ---- Updated Front End Implementation Status ----

# Front End Implementation Status Update (as of now)

This section provides a status update on the front end tasks for the Universal Token Launcher project.

## Phase 1: Project Setup & Environment Configuration
- **Create React Application and Directory Structure:** COMPLETED
- **Key Dependencies (wagmi, ethers, @rainbow-me/rainbowkit):** COMPLETED (adjusted versions and removed WalletConnect integration)
- **Network Settings Configuration (ZetaChain Athens Testnet):** COMPLETED
- **ESLint/Prettier Configuration:** VERIFY/ADJUST if needed
- **API Service Layer Setup:** NOT IMPLEMENTED

## Phase 2: Authentication & Wallet Integration
- **Wagmi Client & RainbowKit Integration:** COMPLETED
- **Wallet Connection UI (ConnectButton in Header):** COMPLETED
- **Network Switching Utility:** COMPLETED

## Phase 3: Token Creation Interface
- **Launch Token Page (Basic Stub):** PARTIALLY COMPLETED
- **Token Creation Form Structure and Validation:** NOT IMPLEMENTED
- **File Uploads (Icon, CSV Distribution List):** NOT IMPLEMENTED
- **FormData Handling to Match Backend Expectations:** NOT IMPLEMENTED

## Phase 4: Transaction Processing
- **Fee Payment Transaction Handling (using wagmi):** NOT IMPLEMENTED
- **UI Feedback for Transaction Progress and Errors:** NOT IMPLEMENTED

## Phase 5: Deployment Status Tracking
- **Polling Mechanism and Real-Time Updates (Deployment Logs, Contract Addresses):** NOT IMPLEMENTED

## Routing & Layout
- **Routing for Home, Launch, and Transfer Pages:** COMPLETED
- **Layout Components (Header & Footer):** COMPLETED

## Overall Summary
- The core application structure is established with basic wallet integration and navigation across primary pages.
- Major functionalities such as advanced token creation, transaction handling, and deployment status tracking remain to be developed.

This updated status guide should serve as a roadmap for the new developer to continue building out the front end in alignment with the original implementation plan.