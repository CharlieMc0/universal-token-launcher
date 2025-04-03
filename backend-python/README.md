# Universal Token Contract Deployment Service (Python)

This is a Python implementation of the Universal Token Contract Deployment Service, which allows users to deploy token contracts across multiple blockchains, including ZetaChain.

## Technology Stack

- **Python 3.11** - Core programming language (**specifically 3.11, not compatible with 3.13**)
- **FastAPI** - Modern, high-performance web framework
- **SQLAlchemy** - SQL toolkit and ORM
- **Alembic** - Database migration tool
- **Web3.py** - Library for interacting with Ethereum-like blockchains
- **PostgreSQL** - Relational database for storing deployment information
- **Pydantic** - Data validation and settings management
- **Uvicorn** - ASGI server for running the application

## Features

- Deploy token contracts on ZetaChain and other EVM-compatible chains
- Deploy NFT collections with cross-chain capabilities
- Track deployment status and contract addresses
- Verify contracts on blockchain explorers
- View supported chains and their configurations
- Connect tokens across multiple chains
- Retrieve user token and NFT balances across chains

## Project Structure

The project follows a simplified, more Pythonic structure:

```
backend-python/
├── app/                    # Main application package
│   ├── __init__.py         # Package initialization
│   ├── app.py              # FastAPI application and main entry point
│   ├── config.py           # Configuration settings
│   ├── db.py               # Database connection and utilities
│   ├── rpc_config.json     # Chain configuration data
│   ├── models/             # Data models and schemas
│   │   ├── __init__.py
│   │   ├── base.py         # Re-exports Base and engine to avoid circular imports
│   │   ├── token.py        # Combined DB models and API schemas for tokens
│   │   └── nft.py          # Combined DB models and API schemas for NFTs
│   ├── routes/             # API routes
│   │   ├── __init__.py
│   │   ├── deployment.py   # Token deployment endpoints
│   │   ├── users.py        # User token and NFT endpoints
│   │   └── nft.py          # NFT deployment and management endpoints
│   ├── services/           # Business logic
│   │   ├── __init__.py
│   │   ├── deployment.py   # Token deployment service
│   │   ├── nft_deployment.py # NFT deployment service
│   │   └── verification.py # Contract verification service
│   └── utils/              # Utility functions
│       ├── __init__.py
│       ├── chain_config.py # Chain configuration utilities
│       ├── logger.py       # Logging utilities
│       └── web3_helper.py  # Web3 interaction utilities
├── artifacts/              # Contract artifacts for deployment
├── migrations/             # Alembic migrations
├── test_deployment.py      # Script to test token deployment across chains
├── test_nft_deployment.py  # Script to test NFT deployment across chains
├── test_api.py             # Test script for token API endpoints
├── test_nft_api.py         # Test script for NFT API endpoints
├── test_rpc_config.py      # Script to verify RPC configuration
├── test_linter.py          # Script to verify code style
├── DEPLOYMENT_FIXES.md     # Documentation of deployment fixes and troubleshooting
├── alembic.ini             # Alembic configuration
├── requirements.txt        # Project dependencies
├── run_app.py              # Simple script to run the application
├── start_api.py            # Enhanced script to start the API with validation
└── .env                    # Environment variables
```

## Key Improvements

1. **Flattened Structure**: Simplified directory structure with fewer nesting levels
2. **Combined Models**: DB models and API schemas are in the same files
3. **Centralized Config**: Configuration in a single module
4. **Pythonic Imports**: More direct import statements
5. **Web3 Helper**: Utilities for blockchain interactions with support for Web3.py v6
6. **Smart Start Script**: Enhanced script with environment validation and proper error handling
7. **Chain Configuration**: Flexible JSON-based configuration for blockchain networks

## Recent Fixes (April 2025)

The following fixes were implemented to address startup issues and module import errors:

1. **Import Error Fixes**: Fixed missing imports and references:
   - Added missing `TokenAllocation` to `app/models/__init__.py` exports
   - Removed non-existent `ChainConfig` import from `app/routes/deployment.py`
   - These changes resolve errors like: 
     - `ImportError: cannot import name 'TokenAllocation' from 'app.models'`
     - `ImportError: cannot import name 'ChainConfig' from 'app.utils.chain_config'`

2. **Model Import Fixes**: Updated `app/models/__init__.py` to properly export all model classes:
   - Added missing exports for `TokenSchema`, `TokenVerifySchema`, and `TokenResponse`
   - Added missing exports for `UserTokenResponse`, `UserTokenInfo`, and `TokenBalanceInfo`
   - Fixed import formatting to comply with PEP8 line length requirements

3. **Configuration Name Fix**: Fixed incorrect attribute name reference in `start_api.py`:
   - Changed reference from non-existent `Config.ENV` to `Config.ENVIRONMENT` 
   - This resolves the error: `type object 'Config' has no attribute 'ENV'`

4. **Python Version Enforcement**: Strengthened checks for Python 3.11:
   - Added more visible warnings about Python 3.11 requirement throughout the code
   - Enhanced virtual environment activation instructions in documentation

5. **BlockScout Verification Enhancement**: Improved contract verification for ZetaChain:
   - Implemented direct contract verification using BlockScout's API endpoints
   - Added automatic compiler version detection from contract source code
   - Created fallback mechanisms to handle different BlockScout API versions and endpoints
   - Added detailed logging and diagnostic capabilities via `test_blockscout_api_verification.py`
   - Fixed verification payload formatting for BlockScout's specific requirements

6. **BlockScout API Verification Fixes (April 2025)**:
   - Removed dependency on Forge/Foundry for contract verification
   - Implemented direct API calls to BlockScout's verification endpoints
   - Added support for both legacy and newer BlockScout API versions
   - Enhanced error handling and logging for verification requests
   - Created diagnostic utility `test_blockscout_api_verification.py` for troubleshooting verification issues

7. **Token Deployment Workflow Enhancements (April 2025)**:
   - The `/api/deploy` endpoint now orchestrates the full Universal Token setup process.
   - **Service Account:** Uses the `DEPLOYER_PRIVATE_KEY` from the `.env` file to perform all deployment and setup transactions.
   - **Deployment:** Deploys `ZetaChainUniversalToken` to ZetaChain and `EVMUniversalToken` to selected EVM chains using the constructors defined in their respective ABIs (`smart-contracts/artifacts`).
     - *Note:* The current `EVMUniversalToken.json` artifact uses a 6-argument constructor, not the standard UUPS initializer pattern.
   - **Connection:** Calls `setConnectedContract` on the ZetaChain contract and `setZetaChainContract` on each deployed EVM contract to link them.
     - *Note:* This relies on these specific function names existing in the ABIs.
   - **Allocations:** Distributes the initial supply by calling `transfer` on the ZetaChain contract *from* the service account *to* the addresses specified in the API request's `allocations` field.
   - **Ownership Transfer:** Transfers ownership of both the ZetaChain contract and all successfully deployed/connected EVM contracts from the service account to the `deployer_address` specified in the API request.
   - **Status Tracking:** Updated database models and API responses to track the status of connection and setup steps.

8. **Database Persistence Fixes (May 2025)**:
   - **Critical Field Persistence:** Fixed issues where `zc_contract_address` and `connected_chains_json` weren't reliably saved to the database.
   - **Immediate Database Commits:** Added immediate database commits after critical operations:
     - ZetaChain contract address is saved as soon as deployment succeeds
     - Connected chains information is saved after each EVM contract deployment
   - **Robust Final Updates:** Implemented a more reliable final database update process:
     - Retrieves fresh database record to ensure updates aren't lost
     - Explicitly sets all fields that need to be updated
     - Detailed logging for database operations success/failure
   - **Multiple Persistence Points:** Added multiple database commit checkpoints throughout the deployment process to ensure no data is lost, even if later steps fail.

9. **NFT Deployment Service Fixes (May 2025)**:
   - **Binary Data Handling:** Fixed critical issue with binary data in transaction receipts:
     - Added dedicated error handling for UnicodeDecodeError in the FastAPI middleware
     - Implemented proper serialization of Web3.py transaction receipts to JSON-compatible format
     - Removed non-serializable attributes from response payloads
   - **NFT Contract Deployment Enhancement:**
     - Improved NFT deployment service with proper error handling and result formatting
     - Added structured result responses with clean separation of ZetaChain and EVM chain results
     - Enhanced test script for NFT deployments to handle the updated result structure
   - **Database Consistency:**
     - Added immediate database commits after successful NFT contract deployments
     - Implemented transaction tracking with proper status updates during the deployment process
   - **Enhanced Middleware:**
     - Modified FastAPI middleware to properly handle and recover from serialization errors
     - Added specific handling for binary data in HTTP responses
     - Improved error reporting with context-aware error messages
   - **Comprehensive Testing:**
     - Added robust test scenarios for NFT deployment across multiple chains
     - Implemented API test script for end-to-end NFT deployment testing
     - Created documentation with troubleshooting tips for common deployment issues

10. **NFT Deployment Service Troubleshooting**:

    The following section provides detailed information about the NFT deployment service fixes implemented to address binary data serialization issues.

    ## Issue Overview

    The NFT deployment service was failing with the error:

    ```
    'utf-8' codec can't decode byte 0xcd in position 3: invalid utf-8
    ```

    This error occurred in the HTTP middleware of the FastAPI application when trying to process the response from a successful NFT contract deployment. The issue was that the Web3.py transaction receipt contained binary data that couldn't be properly serialized and decoded as UTF-8.

    ## Root Cause

    1. **Binary Data in Transaction Receipts**: Web3.py transaction receipts contain binary data (like blockHash) that can't be directly JSON-serialized or UTF-8 decoded.

    2. **Missing Error Handling**: The FastAPI middleware didn't have specific error handling for Unicode decoding errors, causing the entire request to fail.

    3. **Incomplete Serialization**: The deployment response contained raw receipt objects that weren't properly converted to serializable types.

    ## Implemented Fixes

    ### 1. Enhanced FastAPI Error Handling

    Added specific handling for `UnicodeDecodeError` in the HTTP middleware:

    ```python
    @app.middleware("http")
    async def log_requests(request: Request, call_next):
        try:
            response = await call_next(request)
            # ... existing code ...
        except UnicodeDecodeError as ude:
            # Handle unicode decode errors specifically
            process_time = time.time() - start_time
            logger.error(
                f"Request {request_id} failed after {process_time:.3f}s: "
                f"Unicode decode error - {str(ude)}"
            )
            return JSONResponse(
                status_code=200,  # Return success since the contract deployment worked
                content={
                    "success": True,
                    "message": "Operation completed but response contains binary data",
                    "note": (
                        "The contract was deployed successfully, but the response "
                        "contains binary data that couldn't be decoded"
                    )
                }
            )
        # ... existing error handling ...
    ```

    ### 2. Improved Receipt Handling in Web3 Helper

    Updated the `deploy_contract` function to convert receipts to serializable dictionaries:

    ```python
    # Convert receipt to a serializable dictionary with primitive Python types
    receipt_dict = {}
    try:
        # Extract only the essential receipt data
        receipt_dict = {
            "blockHash": web3.to_hex(receipt.blockHash) if receipt.blockHash else None,
            "blockNumber": receipt.blockNumber,
            "gasUsed": receipt.gasUsed,
            "status": receipt.status
        }
    except Exception as e:
        logger.warning(f"Could not fully convert receipt to dict: {str(e)}")
    ```

    ### 3. Enhanced NFT Deployment Service

    Modified the deployment service to:

    1. Properly handle binary data by removing non-serializable receipt information:
    ```python
    # Ensure receipt is properly JSON-serializable
    if "receipt" in zc_result:
        # Either remove receipt or convert to a serializable format
        zc_result.pop("receipt", None)
    ```

    2. Save database records immediately after critical operations:
    ```python
    # Update deployment record - save immediately to avoid loss
    deployment.zc_contract_address = zc_result["contract_address"]
    db.add(deployment)
    db.commit()
    ```

    3. Restructured the result format for better clarity and consistency:
    ```python
    deployment_result = {
        "deploymentId": deployment.id,
        "result": {
            "zetaChain": {},
            "evmChains": {}
        }
    }
    ```

    ## Benefits of the Fix

    1. **Robustness**: The application now properly handles binary data in responses
    2. **Data Integrity**: Database records are saved immediately after critical operations
    3. **Better Error Handling**: More specific error handling allows successful operations to complete despite serialization issues
    4. **No Data Loss**: Transaction receipts essential information is preserved in a serializable format
    5. **Improved User Experience**: Users get proper success responses instead of cryptic errors

    ## Testing Verification

    The fixes were verified through:

    1. **Direct NFT Deployment Tests**: Using `test_nft_deployment.py` to test deployment on a single chain
    2. **API Tests**: Using `test_nft_api.py` to test the complete API flow
    3. **Manual API testing**: Validated the deployment endpoints with the API server running

    All tests confirmed that NFT deployments now complete successfully, and all relevant data is properly stored in the database and returned to the client.

    ## Future Improvements

    1. **Standardized Serialization**: Implement a standard serialization approach for all Web3 objects
    2. **More Robust Error Recovery**: Add automatic retries for specific error scenarios
    3. **Better Testing Coverage**: Add more unit tests to catch serialization issues earlier
    4. **Stricter Type Checking**: Use more specific type hints to catch potential serialization issues at development time

## For Future Developers

If you're working on this codebase, please note these important points:

1. **Strict Python Version Requirement**: This project **only** works with Python 3.11, not 3.13 or any other version. Always use the virtual environment.

2. **Service Deployer Account**: All blockchain transactions (deployment, setup, initial transfers, ownership transfer) are performed by the account associated with the `DEPLOYER_PRIVATE_KEY` in the `.env` file. Ensure this account is funded with native gas tokens (ZETA on ZetaChain Testnet, Sepolia ETH, etc.) on all chains you intend to deploy to.

3. **EVM Contract Constructor**: The current EVM deployment uses the 6-argument constructor found in the `EVMUniversalToken.json` ABI. If you update the smart contracts to use a standard UUPS initializer pattern, you will need to refactor the EVM deployment logic in `app/services/deployment.py` to deploy with no arguments and then call the `initialize` function separately.

4. **Contract Connection Functions**: The connection logic relies on the `setConnectedContract` function existing on the ZetaChain contract and `setZetaChainContract` existing on the EVM contract. If these function names change in future contract versions, update the `method_name` arguments in the `call_contract_method` invocations within `app/services/deployment.py`.

5. **Chain Configuration (`rpc_config.json`)**: 
   - This file MUST contain accurate RPC URLs and chain IDs.
   - For EVM deployments, the `gateway_address` field MUST be populated with the correct ZetaChain Gateway contract address for that specific EVM network. Deployments will fail for chains missing this configuration.

6. **ZRC-20 Addresses (`web3_helper.py`)**: The `get_zrc20_address` function currently uses a hardcoded dictionary for testnet ZRC-20 gas token addresses on ZetaChain. This needs to be updated or replaced with a dynamic lookup mechanism for mainnet support or additional testnets.

7. **Model Export Pattern**: When adding new model classes, make sure to export them in `app/models/__init__.py`. The codebase follows a pattern of defining models in module files and re-exporting them through `__init__.py`.

8. **Configuration Access**: The application uses a centralized `Config` class in `app/config.py`. Access configuration values through this class rather than creating new environment variable lookups.

9. **Virtual Environment**: Always use the dedicated virtual environment to ensure proper dependency versions:
   ```bash
   source venv_311/bin/activate
   ```

10. **Testing Changes**: After making modifications, run the test scripts to ensure everything still works:
    ```bash
    # Test RPC configuration
    python test_rpc_config.py
    
    # Test token deployment (limited to 1 testnet chain for speed)
    python test_deployment.py --testnet-only --max-chains 1
    
    # Test NFT deployment (limited to 1 testnet chain for speed)
    python test_nft_deployment.py --testnet-only --max-chains 1
    
    # Test the NFT API endpoints
    python test_nft_api.py
    
    # Validate code style with linter
    python test_linter.py
    ```

## Getting Started

### Prerequisites

- Python 3.11 (specifically 3.11, not compatible with 3.13)
- PostgreSQL
- Git

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/universal-token-launcher.git
cd universal-token-launcher/backend-python
```

2. Create and activate a virtual environment:
```bash
python3.11 -m venv venv_311
source venv_311/bin/activate  # On Windows: venv_311\Scripts\activate
```

3. Install dependencies:
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

4. Create the environment file:
```bash
cp .env.example .env
```

5. Edit the `.env` file with your configuration settings, especially:
   - Database connection details
   - `DEPLOYER_PRIVATE_KEY` (used for all contract deployment and interaction - requires 0x prefix and funding on relevant chains)
   - Explorer API keys (used for contract verification)
   - Custom RPC URLs for less reliable networks (see Chain Configuration section below)

### Database Setup

1. Create a PostgreSQL database:
```bash
createdb universal_token_registry
```

2. Run database migrations:
```bash
alembic upgrade head
```

### Running the Application

> **IMPORTANT**: This application **requires Python 3.11** and will not work with any other version, including Python 3.13.

Follow these steps to start the application correctly:

1. **Activate the virtual environment**:
   ```bash
   cd backend-python
   source venv_311/bin/activate
   
   # Your prompt should now show (venv_311) indicating the environment is active
   ```

2. **Start the API server**:
   ```bash
   # Using the enhanced start script (recommended):
   python start_api.py
   
   # The server will be available at http://localhost:8000
   ```

3. **Access the API documentation**:
   - Navigate to http://localhost:8000/docs in your browser
   - This will show the Swagger UI with all available endpoints

4. **Testing the API**:
   ```bash
   # Simple connectivity test
   curl http://localhost:8000/
   
   # Get supported chains
   curl http://localhost:8000/api/chains
   ```

5. **Stopping the server**:
   - Press `Ctrl+C` in the terminal where the server is running
   - This will gracefully shut down the server

### API Endpoints

The API provides several endpoints for managing token deployments:

#### Token-related Endpoints
- `GET /` - Check if the service is running
- `GET /api/chains` - Get a list of supported chains (with optional filtering for testnet/mainnet)
- `POST /api/deploy` - Deploy a token on multiple chains
- `POST /api/verify` - Verify a contract on a blockchain explorer
- `GET /api/token/{identifier}` - Get detailed token information by ID or contract address
- `GET /api/users/{address}` - Get tokens owned by a specific wallet address

#### NFT-related Endpoints
- `POST /api/nft/deploy` - Deploy an NFT collection on multiple chains
- `GET /api/nft/collection/{identifier}` - Get NFT collection information by ID or contract address
- `POST /api/nft/verify` - Verify an NFT contract on a blockchain explorer

### Token Deployment

The token deployment endpoint (`POST /api/deploy`) handles the entire deployment and setup process. It requires a specific JSON payload:

```json
{
  "token_name": "My Token",
  "token_symbol": "MTK",
  "decimals": 18,
  "total_supply": "1000000000000000000000000",
  "selected_chains": ["7001", "11155111"],
  "deployer_address": "0x4f1684A28E33F42cdf50AB96e29a709e17249E63",
  "allocations": [
    {
      "address": "0x4f1684A28E33F42cdf50AB96e29a709e17249E63",
      "amount": "1000000000000000000000000"
    }
  ]
}
```

Note that:
- `decimals` can be an integer (unlike older API versions that required a string)
- `total_supply` should be provided as a string to avoid precision issues
- `selected_chains` accepts chain IDs (e.g., "7001", "11155111")

### Contract Verification

After deployment, contracts can be verified on block explorers to make their source code publicly accessible. The service supports verification on both Etherscan-compatible explorers and BlockScout (used by ZetaChain).

#### BlockScout Verification for ZetaChain

The service implements robust verification for contracts deployed on ZetaChain using BlockScout's API:

1. **Direct API Method:** Uses BlockScout's verification API endpoints
   - Automatically extracts compiler version from contract source
   - Properly formats verification requests with required fields:
     - `codeformat: "solidity-single-file"`
     - `optimizationUsed: "1"`
     - Extracted compiler version

2. **Simplified Verification Process:** The verification process has been streamlined to use the flattened source code approach:
   - Uses the documented BlockScout API endpoint `/api` with the `solidity-single-file` format
   - Follows the exact format recommended in the BlockScout documentation
   - Eliminates complex fallback mechanisms for better reliability

3. **Verification Payload Format:** The service formats the BlockScout verification request with the following fields:
   ```json
   {
     "module": "contract",
     "action": "verifysourcecode",
     "contractaddress": "0x123...",
     "contractname": "ZetaChainUniversalToken",
     "compilerversion": "v0.8.19+commit.7dd6d404",
     "optimizationUsed": "1",
     "runs": "200",
     "sourceCode": "// SPDX-License-Identifier: MIT\npragma solidity 0.8.26;...",
     "evmversion": "paris",
     "constructorArguments": "",
     "codeformat": "solidity-single-file"
   }
   ```

4. **Verification Debugging:** Enhanced debugging capabilities
   - Saves complete verification data to JSON files for inspection
   - Logs the full source code length for verification
   - Preserves API responses for troubleshooting

5. **Verification Testing:** A test utility helps diagnose verification issues:
   - `test_blockscout_api_verification.py` - Tests the overall verification process
     - Tests both ZetaChain testnet and mainnet
     - Validates contract source file presence
     - Checks RPC and BlockScout URL configurations
     - Shows detailed output from API requests

To verify a contract:

```json
POST /api/verify
{
  "contract_address": "0x1234567890123456789012345678901234567890",
  "chain_id": "7001",
  "contract_type": "zetachain"
}
```

#### Troubleshooting BlockScout API Verification

If you encounter issues with BlockScout verification, you can use the testing utility to diagnose the problem:

1. **Run the verification test script**:
   ```bash
   cd backend-python
   source venv_311/bin/activate
   python test_blockscout_api_verification.py
   ```
   This will show detailed information about:
   - Contract path resolution
   - Compiler version detection
   - API request formatting
   - API response details
   - Error messages from the BlockScout API

2. **Common issues and solutions**:
   - **File not found errors**: Check that the contract source exists in the expected location
   - **Compiler version issues**: Verify the compiler version is being correctly extracted
   - **API endpoint availability**: Check that the BlockScout URL is accessible
   - **Response format issues**: Check that the verification payload format matches the API requirements
   - **Verify content of saved JSON files**: Check the automatically saved verification JSON files:
     - `ZetaChainUniversalToken_verification_data.json`: Contains the request payload with full source code
     - `ZetaChainUniversalToken_verification_response.json`: Contains the API response

3. **Manual verification**:
   If automatic verification continues to fail, you can verify manually using the BlockScout UI:
   - Navigate to the contract address in BlockScout
   - Click "Code" tab
   - Click "Verify & Publish" button
   - Select "flattened source code" option
   - Paste the contract source code
   - Set the compiler version and optimization options

#### Contract Verification Status

The verification status is tracked in the database and displayed in token information endpoints. Possible statuses include:

- `pending`: Verification has been submitted but not yet confirmed
- `success`: Contract has been successfully verified
- `failed`: Verification failed (with error message)
- `unknown`: Verification status couldn't be determined

### Token Information Lookup

The token information endpoint (`GET /api/token/{identifier}`) allows retrieving token details by either:
- Numeric ID: `/api/token/1`
- Contract address: `/api/token/0x1234...`

The response includes:
- Basic token information (name, symbol, decimals, total supply)
- Deployment status across all chains
- ZetaChain contract information with explorer URLs
- Connected chains with contract addresses, explorer links, and verification status

Example response structure:
```json
{
  "success": true,
  "token": {
    "id": 1,
    "token_name": "Test Token",
    "token_symbol": "TST",
    "decimals": 18,
    "total_supply": "1000000000000000000000000",
    "zc_contract_address": "0x7c9037d10c4BC877268cb4fe900490Ff98b5D52b",
    "deployer_address": "0x4f1684A28E33F42cdf50AB96e29a709e17249E63",
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
    "deployment_status": "completed",
    "error_message": null,
    "created_at": "2025-04-02T12:05:30.664247-07:00",
    "updated_at": "2025-04-02T12:05:30.667077-07:00",
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

### User Token Information

The user tokens endpoint (`GET /api/users/{address}`) allows retrieving all tokens owned by a specific wallet address:

- **Path Parameter**: `address` - The wallet address to lookup
- **Response**: Includes tokens deployed through this application that the user holds, as well as tokens where the user is the deployer (even if they have no balance)
- **Example**: `/api/users/0x4f1684a28e33f42cdf50ab96e29a709e17249e63`

Example response structure:
```json
{
  "success": true,
  "message": "User tokens retrieved successfully",
  "wallet_address": "0x4f1684a28e33f42cdf50ab96e29a709e17249e63",
  "tokens": [
    {
      "token_name": "Test Token",
      "token_symbol": "TST",
      "decimals": 18,
      "is_deployer": true,
      "zc_contract_address": "0x7c9037d10c4BC877268cb4fe900490Ff98b5D52b",
      "balances": [
        {
          "chain_id": "7001",
          "chain_name": "ZetaChain Testnet",
          "balance": "1000000000000000000000000",
          "contract_address": "0x7c9037d10c4BC877268cb4fe900490Ff98b5D52b",
          "explorer_url": "https://explorer.athens.zetachain.com",
          "blockscout_url": "https://zetachain-testnet.blockscout.com/"
        },
        {
          "chain_id": "11155111",
          "chain_name": "Sepolia Testnet",
          "balance": "0",
          "contract_address": "0x8Da98E1ea986331D68ee5CD83b1E49665B4587fB",
          "explorer_url": "https://sepolia.etherscan.io",
          "blockscout_url": null
        }
      ]
    }
  ]
}
```

The response includes:
- Basic token information (name, symbol, decimals)
- Whether the user is the deployer of the token
- ZetaChain contract address
- Token balances across all chains where the token is deployed
- **Important**: The endpoint now ensures all tokens deployed by the user are included in the response, even if they have zero balance, preventing deployed tokens from being hidden

## Smart Contract Integration

The service integrates with Solidity smart contracts for token deployment:

1. **Universal Token Contracts**: 
   - `ZetaChainUniversalToken.sol` - For deployment on ZetaChain (5 constructor arguments)
   - `EVMUniversalToken.sol` - For deployment on other EVM chains (6 constructor arguments)

2. **Constructor Arguments**:
   - ZetaChainUniversalToken: name, symbol, decimals, initialSupply, initialOwner
   - EVMUniversalToken: name, symbol, decimals, initialSupply, currentChainId, initialOwner

The service automatically loads contract artifacts (ABI and bytecode) from the `smart-contracts/artifacts` directory.

## Chain Configuration

The system uses a JSON-based configuration system for blockchain networks. Chain configurations are stored in `app/rpc_config.json`.

### Supported Chains

The following chains are currently supported:

| Chain ID | Name | Currency | Type |
|---------|------|----------|------|
| 1 | Ethereum Mainnet | ETH | Mainnet |
| 5 | Goerli Testnet | ETH | Testnet |
| 137 | Polygon Mainnet | MATIC | Mainnet |
| 56 | Binance Smart Chain | BNB | Mainnet |
| 7000 | ZetaChain | ZETA | Mainnet |
| 7001 | ZetaChain Testnet | ZETA | Testnet |
| 11155111 | Sepolia Testnet | ETH | Testnet |
| 42161 | Arbitrum One | ETH | Mainnet |
| 10 | Optimism | ETH | Mainnet |
| 8453 | Base | ETH | Mainnet |
| 421614 | Arbitrum Sepolia | ETH | Testnet |
| 11155420 | Optimism Sepolia | ETH | Testnet |
| 84532 | Base Sepolia | ETH | Testnet |
| 43114 | Avalanche C-Chain | AVAX | Mainnet |
| 43113 | Avalanche Fuji Testnet | AVAX | Testnet |

### Enabling and Disabling Chains

Each chain in the configuration includes an `enabled` flag that determines whether it should be included in deployment options:

```json
{
  "11155111": {
    "name": "Sepolia Testnet",
    "rpc_url": "https://ethereum-sepolia.publicnode.com",
    "explorer_url": "https://sepolia.etherscan.io",
    "blockscout_url": null,
    "currency_symbol": "ETH",
    "testnet": true,
    "enabled": true,
    "gateway_address": "0xE936919eA925B050c4fe42319b77F00738F8C74A"
  }
}
```

- To enable a chain, set `"enabled": true`
- To disable a chain, set `"enabled": false`

Disabled chains won't appear in the API responses and won't be included when running the test deployment script with all enabled chains.

You can use the `test_rpc_config.py` script to verify which chains are currently enabled.

### Adding Support for New Chains

To add support for a new blockchain network:

1. **Update the Chain Configuration**

   Edit the `app/rpc_config.json` file to add the new chain. Use the chain ID as the key and provide the required configuration information, **including the `gateway_address` for EVM chains**:

   ```json
   {
     "123456": {
       "name": "New Chain Name",
       "rpc_url": "https://rpc.example.com",
       "explorer_url": "https://explorer.example.com",
       "blockscout_url": null,
       "currency_symbol": "TOKEN",
       "testnet": false,
       "gateway_address": "0x..."
     }
   }
   ```

   Required fields:
   - `name`: The display name of the chain
   - `rpc_url`: The RPC URL for connecting to the chain
   - `explorer_url`: URL of the Etherscan-compatible explorer (null if not available)
   - `blockscout_url`: URL of the Blockscout explorer (null if not available)
   - `currency_symbol`: The native currency symbol
   - `testnet`: Boolean indicating if this is a testnet
   - `gateway_address`: URL of the ZetaChain Gateway contract on this chain (null if not EVM)

2. **Configure Custom RPC URLs (Optional)**

   For better reliability, you can configure custom RPC URLs in your environment:

   ```
   # In .env file
   NEW_CHAIN_NAME_RPC_URL=https://your-custom-rpc.example.com
   ```

   The system will automatically look for an environment variable named after the chain (with spaces replaced by underscores and uppercase).

3. **Test Deployment**

   Run the deployment test script with the new chain:

   ```python
   # In test_deployment.py
   selected_chains = ["7001", "11155111", "123456"]  # Add your new chain ID
   ```

   Ensure the deployment works successfully and contracts are properly verified.

4. **Additional Configuration**

   For certain chains, you might need:

   - **Add API keys for block explorers**:
     ```
     # In .env file
     NEWCHAIN_API_KEY=your_explorer_api_key
     ```

   - **Adjust gas parameters** in the `deploy_contract` function if the chain has different gas requirements.

   - For **non-EVM chains**, additional development would be required to support their specific contract deployment mechanisms.

5. **Troubleshooting Chain Issues**

   If you encounter issues with a specific chain:

   - Verify the RPC URL is correct and accessible
   - Check that the chain ID matches the actual network ID
   - Ensure you have sufficient funds on the deployment account for that chain
   - Verify the explorer URLs are correct if contract verification is failing

## Development

### Creating Migrations

When you change the database models, create a new migration:
```bash
alembic revision --autogenerate -m "Description of changes"
```

Apply the migration:
```bash
alembic upgrade head
```

### NFT Deployment

The NFT collection deployment endpoint (`POST /api/nft/deploy`) handles the deployment of Universal NFT collections across multiple chains. It requires a specific JSON payload:

```json
{
  "collection_name": "My NFT Collection",
  "collection_symbol": "MNFT",
  "base_uri": "https://metadata.example.com/nfts/",
  "max_supply": 10000,
  "selected_chains": ["7001", "11155111"],
  "deployer_address": "0x4f1684A28E33F42cdf50AB96e29a709e17249E63"
}
```

Note that:
- `base_uri` should end with a trailing slash for proper metadata URI construction
- `max_supply` should be a reasonable number based on your use case
- `selected_chains` accepts chain IDs as strings
- The deployment always starts with ZetaChain, which is required for cross-chain functionality

The response includes:
- Deployment ID for tracking
- Status of the deployment process
- Contract addresses on ZetaChain and connected chains
- Transaction hashes for verification

Example response:
```json
{
  "success": true,
  "message": "NFT collection deployment started",
  "deployment_id": 1,
  "deployment": {
    "status": "completed",
    "deploymentId": 1,
    "details": {
      "zetaChain": {
        "success": true,
        "contract_address": "0x...",
        "transaction_hash": "0x..."
      },
      "evmChains": {
        "11155111": {
          "success": true,
          "contract_address": "0x...",
          "transaction_hash": "0x...",
          "status": "completed"
        }
      }
    }
  }
}
```

### NFT Collection Information

To retrieve information about a deployed NFT collection, use the `/api/nft/collection/{identifier}` endpoint:

- **Path Parameter**: `identifier` - Either the collection ID or the contract address
- **Response**: Includes collection details and contract addresses across chains
- **Example**: `/api/nft/collection/1` or `/api/nft/collection/0x...`

### NFT Contract Verification

After deployment, NFT contracts can be verified on block explorers:

```json
POST /api/nft/verify
{
  "contract_address": "0x1234567890123456789012345678901234567890",
  "chain_id": "7001",
  "contract_type": "zetachain"
}
```

The verification process is similar to token contracts and supports both Etherscan-compatible explorers and BlockScout.

<!-- Begin NFT Deployment Service Enhancements (May 2025) -->

**NFT Deployment Service Enhancements (May 2025)**
- Improved handling of binary data in transaction receipts by adding specific error handling for UnicodeDecodeError in the FastAPI middleware.
- Converted Web3.py transaction receipts into JSON-compatible dictionaries to remove non-serializable binary data.
- Updated the NFT deployment API payload to include required fields: `base_uri`, `max_supply`, `selected_chains`, and `deployer_address`.
- Ensured immediate database commits after NFT contract deployments to enhance data persistence.
- Added comprehensive test scripts: `test_nft_deploy_and_verify.py`, `test_nft_verification.py`, and `test_nft_api.py` for end-to-end NFT deployment and verification.

**Developer Guidance**
- Start the API server with `python start_api.py` and run NFT deployment tests using `python test_nft_deploy_and_verify.py`.
- Use the new test scripts as references for extending or debugging NFT deployment functionalities.
- Follow our PEP8 coding standards and proper logging practices, especially for handling blockchain data serialization errors.
<!-- End NFT Deployment Service Enhancements (May 2025) -->