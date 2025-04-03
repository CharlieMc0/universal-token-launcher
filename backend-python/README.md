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
- Track deployment status and contract addresses
- Verify contracts on blockchain explorers
- View supported chains and their configurations
- Connect tokens across multiple chains

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
│   │   └── token.py        # Combined DB models and API schemas
│   ├── routes/             # API routes
│   │   ├── __init__.py
│   │   └── deployment.py   # Token deployment endpoints
│   ├── services/           # Business logic
│   │   ├── __init__.py
│   │   ├── deployment.py   # Token deployment service
│   │   └── verification.py # Contract verification service
│   └── utils/              # Utility functions
│       ├── __init__.py
│       ├── chain_config.py # Chain configuration utilities
│       ├── logger.py       # Logging utilities
│       └── web3_helper.py  # Web3 interaction utilities
├── artifacts/              # Contract artifacts for deployment
├── migrations/             # Alembic migrations
├── tests/                  # Test files
│   ├── test_deployment.py  # Test script for token deployment
│   └── test_api.py         # Test script for API endpoints
├── alembic.ini             # Alembic configuration
├── requirements.txt        # Project dependencies
├── run_app.py              # Simple script to run the application
├── start_api.py            # Enhanced script to start the API with validation
├── test_deployment.py      # Script to test token deployment across chains
├── test_rpc_config.py      # Script to verify RPC configuration
├── test_linter.py          # Script to verify code style
├── deployment_fixes.md     # Documentation of deployment fixes and troubleshooting
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

1. **Model Import Fixes**: Updated `app/models/__init__.py` to properly export all model classes:
   - Added missing exports for `TokenSchema`, `TokenVerifySchema`, and `TokenResponse`
   - Added missing exports for `UserTokenResponse`, `UserTokenInfo`, and `TokenBalanceInfo`
   - Fixed import formatting to comply with PEP8 line length requirements

2. **Configuration Name Fix**: Fixed incorrect attribute name reference in `start_api.py`:
   - Changed reference from non-existent `Config.ENV` to `Config.ENVIRONMENT` 
   - This resolves the error: `type object 'Config' has no attribute 'ENV'`

3. **Python Version Enforcement**: Strengthened checks for Python 3.11:
   - Added more visible warnings about Python 3.11 requirement throughout the code
   - Enhanced virtual environment activation instructions in documentation

4. **BlockScout Verification Enhancement**: Improved contract verification for ZetaChain:
   - Implemented direct contract verification using BlockScout's API endpoints
   - Added automatic compiler version detection from contract source code
   - Created fallback mechanisms to handle different BlockScout API versions and endpoints
   - Added detailed logging and diagnostic capabilities via `test_blockscout_api_verification.py`
   - Fixed verification payload formatting for BlockScout's specific requirements

5. **BlockScout API Verification Fixes (April 2025)**:
   - Removed dependency on Forge/Foundry for contract verification
   - Implemented direct API calls to BlockScout's verification endpoints
   - Added support for both legacy and newer BlockScout API versions
   - Enhanced error handling and logging for verification requests
   - Created diagnostic utility `test_blockscout_api_verification.py` for troubleshooting verification issues

6. **Token Deployment Workflow Enhancements (April 2025)**:
   - The `/api/deploy` endpoint now orchestrates the full Universal Token setup process.
   - **Service Account:** Uses the `DEPLOYER_PRIVATE_KEY` from the `.env` file to perform all deployment and setup transactions.
   - **Deployment:** Deploys `ZetaChainUniversalToken` to ZetaChain and `EVMUniversalToken` to selected EVM chains using the constructors defined in their respective ABIs (`smart-contracts/artifacts`).
     - *Note:* The current `EVMUniversalToken.json` artifact uses a 6-argument constructor, not the standard UUPS initializer pattern.
   - **Connection:** Calls `setConnectedContract` on the ZetaChain contract and `setZetaChainContract` on each deployed EVM contract to link them.
     - *Note:* This relies on these specific function names existing in the ABIs.
   - **Allocations:** Distributes the initial supply by calling `transfer` on the ZetaChain contract *from* the service account *to* the addresses specified in the API request's `allocations` field.
   - **Ownership Transfer:** Transfers ownership of both the ZetaChain contract and all successfully deployed/connected EVM contracts from the service account to the `deployer_address` specified in the API request.
   - **Status Tracking:** Updated database models and API responses to track the status of connection and setup steps.

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
    python test_rpc_config.py
    python test_deployment.py --testnet-only --max-chains 1 
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

#### NFT-related Endpoints (New)
- `POST /api/nft/deploy` - Deploy an NFT collection on multiple chains
- `GET /api/nft/collection/{identifier}` - Get NFT collection information by ID or contract address

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
- **Response**: Includes tokens deployed through this application that the user holds
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