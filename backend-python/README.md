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
   - Deployer private key (used for contract deployment - make sure it has 0x prefix)
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

1. Using the Python module directly:
```bash
python -m app.app
```

2. Using the run_app.py script:
```bash
python run_app.py
```

3. Using uvicorn directly:
```bash
uvicorn app.app:app --host 0.0.0.0 --port 8000
```

The API will be available at http://localhost:8000

For development with auto-reload:
```bash
uvicorn app.app:app --reload --host 0.0.0.0 --port 8000
```

## API Endpoints

- `GET /` - Check if the service is running
- `GET /api/chains` - Get a list of supported chains (with optional filtering for testnet/mainnet)
- `POST /api/deploy` - Deploy a token on multiple chains
- `POST /api/verify` - Verify a contract on a blockchain explorer
- `GET /api/token/{identifier}` - Get detailed token information by ID or contract address
- `GET /api/users/{address}` - Get tokens owned by a specific wallet address

### Token Deployment

The token deployment endpoint (`POST /api/deploy`) requires a specific JSON payload with the following structure:

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
    "enabled": true
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

   Edit the `app/rpc_config.json` file to add the new chain. Use the chain ID as the key and provide the required configuration information:

   ```json
   {
     "123456": {
       "name": "New Chain Name",
       "rpc_url": "https://rpc.example.com",
       "explorer_url": "https://explorer.example.com",
       "blockscout_url": null,
       "currency_symbol": "TOKEN",
       "testnet": false
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

### Testing

Test direct token deployment:
```bash
python test_deployment.py
```

Test the API with a mock request:
```bash
python test_api.py
```

Run automated tests using pytest:
```bash
pytest
```

## Testing

### Testing RPC Configuration

Before attempting to deploy tokens, you can verify that your RPC configuration is properly loaded and that all enabled chains have valid RPC URLs:

```bash
# Activate the virtual environment
source venv_311/bin/activate

# Verify RPC configuration
python test_rpc_config.py
```

This will display:
- A summary of all configured chains
- Lists of enabled mainnet and testnet chains
- Validation of RPC URLs for all enabled chains

This helps quickly identify any configuration issues before attempting deployments.

### Testing Deployment

The `test_deployment.py` script is designed to test token deployment across all enabled chains in the system. You can use it to verify that your configuration is working correctly before exposing it to users.

```bash
# Activate the virtual environment
source venv_311/bin/activate

# Test all enabled chains
python test_deployment.py

# Test only testnets (recommended for development)
python test_deployment.py --testnet-only

# Limit the number of chains to test (useful for quick tests)
python test_deployment.py --testnet-only --max-chains 2
```

The script will:
1. Read all enabled chains from your `app/rpc_config.json` file
2. Filter for testnet chains if the `--testnet-only` flag is used
3. Limit to a specified number of chains if the `--max-chains` argument is provided
4. Deploy a test token to each chain
5. Report on the success or failure of each deployment with a summary

This provides a quick way to verify your deployment configuration before going to production.

### Testing the API

Test the API with a mock request:
```bash
python test_api.py
```

## Troubleshooting

### Python Version Issues

This project requires Python 3.11 specifically:

1. Make sure you're using Python 3.11:
```bash
python --version  # Should report 3.11.x
```

2. If using the wrong Python version, create a new virtual environment with 3.11:
```bash
python3.11 -m venv venv_311
source venv_311/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

### Database Column Naming Issues

If you encounter errors related to column names (like `createdAt` vs `created_at`), this is likely due to a mismatch between your database schema and the SQLAlchemy models:

1. Reset the migration history and recreate the tables:
```bash
alembic revision --autogenerate -m "recreate_tables"
alembic upgrade head
```

2. If you need to drop and recreate the entire database:
```bash
dropdb universal_token_registry
createdb universal_token_registry
alembic upgrade head
```

### Token Deployment Issues

If you encounter issues with token deployment:

1. **Web3.py Transaction Signing Issues**:
   - Error: `'SignedTransaction' object has no attribute 'rawTransaction'`
   - Solution: The code has been updated to handle both `rawTransaction` (older versions) and `raw_transaction` (Web3.py v6)
   - Implementation:
     ```python
     # Web3.py v6 uses .raw_transaction instead of .rawTransaction
     if hasattr(signed_txn, 'raw_transaction'):
         tx_hash = web3.eth.send_raw_transaction(signed_txn.raw_transaction)
     else:
         # Fallback for older versions
         tx_hash = web3.eth.send_raw_transaction(signed_txn.rawTransaction)
     ```

2. **Contract ABI or Bytecode Issues**:
   - Ensure the smart contract artifacts are correctly built and placed in the `smart-contracts/artifacts` directory
   - Check that the contract constructor arguments match those expected in the deployment service

3. **Transaction Signing Issues**:
   - Verify that the `.env` file has a valid private key with the `0x` prefix
   - Ensure the account has sufficient funds on the target chain
   - Check Web3.py version compatibility with the specific blockchain RPC
   - The system automatically adds the `0x` prefix if missing:
     ```python
     # Ensure private key has 0x prefix
     if not private_key.startswith("0x"):
         private_key = "0x" + private_key
     ```

4. **Chain Connection Issues**:
   - For testnet chains like Sepolia, public RPC URLs may be unreliable
   - Consider adding custom RPC URLs in your `.env` file:
     ```
     SEPOLIA_RPC_URL=https://ethereum-sepolia.publicnode.com
     # Or use a provider with an API key for better reliability:
     # SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR-API-KEY
     ```
   - The system will automatically use your custom RPC URLs if defined in the environment
   - Run `test_rpc_config.py` to verify which chains have valid RPC URLs
   - If testing all enabled chains fails, try limiting to just 1-2 chains with `--max-chains` to identify problematic ones
   - Public RPC endpoints often have rate limits or connectivity issues; consider using dedicated providers for production environments

5. **Numeric Value Errors**:
   - Ensure all numeric values in the API request are passed correctly
   - Large values like `total_supply` should be passed as strings
   - Values like `decimals` can be passed as integers

6. **Database Schema Mismatch**:
   - If you encounter errors like `column token_deployments.created_at does not exist`
   - The error might suggest: `Perhaps you meant to reference the column "token_deployments.createdAt"`
   - This indicates a mismatch between SQLAlchemy models (using snake_case) and database schema (using camelCase)
   - Solution: Follow the Database Column Naming Issues section below to reset your database schema

### Port Already in Use

If you see "address already in use" errors when starting the server:

1. Find and stop the process using the port:
```bash
lsof -i :8000  # Find process ID
kill <PID>     # Replace <PID> with the process ID
```

2. Or use a different port:
```bash
uvicorn app.app:app --host 0.0.0.0 --port 8001
```

### Package Installation Issues

If you encounter issues with packages like `psycopg2-binary`:

1. Make sure you're using Python 3.11 specifically
2. Install required system dependencies for PostgreSQL
3. Try installing the package separately:
```bash
pip install psycopg2-binary==2.9.9
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Example Contract Deployments

Here are some example contract addresses from successful test deployments:

1. ZetaChain Testnet (7001):
   - `0xad428219f49c423f0c7565aeaD59F5084c78A32A`
   - `0x28A76DF9944cBf3ff1E73b8c339Fa31BF3fb354c`
   - `0x66aa78987ab5AF0d3C21D9D3b5AdA054Eb4C689D`

You can verify these contracts on the ZetaChain explorer:
- https://explorer.zetachain.com/address/{contract_address} 