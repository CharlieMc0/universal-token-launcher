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
1. **Initialize FastAPI Project**
   - Create project structure
   - Configure dependencies in requirements.txt

2. **Database Setup**
   - Configure PostgreSQL connection
   - Set up SQLAlchemy models and migrations

3. **API Route Configuration**
   - **IMPORTANT**: Configure routers with consistent prefix strategy
   ```python
   # In router definition file
   router = APIRouter(prefix="/api/tokens", tags=["tokens"])
   
   # In main.py - DO NOT add prefix again
   app.include_router(tokens.router, tags=["tokens"])
   # Not: app.include_router(tokens.router, prefix="/api", tags=["tokens"])
   ```

4. **CORS Configuration**
   - Set up CORS middleware with proper origin handling
   ```python
   app.add_middleware(
       CORSMiddleware,
       allow_origins=settings.CORS_ORIGINS if not settings.DEBUG else ["*"],
       allow_credentials=True,
       allow_methods=["*"],
       allow_headers=["*"],
   )
   ```

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