# Universal Token Contract Deployment Service (Python)

This is a Python implementation of the Universal Token Contract Deployment Service, which allows users to deploy token contracts across multiple blockchains, including ZetaChain.

## Technology Stack

- **Core:** Python 3.11 (Required), FastAPI, SQLAlchemy, Alembic, Web3.py (v6+), Pydantic
- **Database:** PostgreSQL
- **Server:** Uvicorn
- **Containerization:** Docker
- *(Refer to `documentation/tech-stack.md` for full details)*

## Docker Setup

The application can be deployed using Docker for consistent environments across development, testing, and production.

### Docker Files

- **Dockerfile**: Contains the configuration to build the backend API container
- **.dockerignore**: Excludes unnecessary files from the Docker build context
- **docker-build.sh**: Helper script for building and pushing Docker images to Google Container Registry (GCR)

### Building the Docker Image

```bash
# Building locally
docker build -t utl-backend .

# Building and pushing to GCR using the helper script
./docker-build.sh YOUR_GCP_PROJECT_ID [OPTIONAL_TAG]
```

### Running the Docker Container

```bash
# Run locally with environment variables
docker run -d -p 8000:8000 --env-file .env --name utl-backend-container utl-backend

# Test the API endpoints
curl http://localhost:8000/health  # Should return {"status":"healthy"}
curl http://localhost:8000/        # Should return service info
```

### Docker Container Features

- **Health Checks**: The container includes a health check that pings the `/health` endpoint
- **Security**: Runs as a non-root user for better security
- **Environment Variables**: Properly configured to use environment variables for configuration
- **Optimized Image**: Uses multi-stage build and minimal dependencies to keep the image size small
- **Port Configuration**: Exposes port 8000 by default, configurable through environment variables

*(Remember to configure the necessary environment variables in the Cloud Run service or GKE deployment.)*

## Features

- Deploy token contracts on ZetaChain and other EVM-compatible chains
- Deploy NFT collections with cross-chain capabilities
- Automatically connect deployed contracts across chains (ZetaChain <-> EVM)
- Automatically transfer ownership to the initiating user
- Distribute initial token supply based on user input
- Track deployment status and contract addresses
- Verify contracts on blockchain explorers (Blockscout, Etherscan-compatible)
- View supported chains and their configurations
- Retrieve comprehensive user token and NFT balances across all chains

## Project Structure

The project follows a simplified, Pythonic structure:

```
backend/
├── app/                    # Main application package
│   ├── __init__.py         # Package initialization
│   ├── app.py              # FastAPI application and main entry point
│   ├── config.py           # Configuration settings
│   ├── db.py               # Database connection and utilities
│   ├── rpc_config.json     # Chain configuration data
│   ├── models/             # Data models and schemas (DB models + API schemas combined)
│   ├── routes/             # API routes (deployment, users, NFTs)
│   ├── services/           # Business logic (deployment, verification, explorer)
│   └── utils/              # Utility functions (chain config, logger, web3 helper)
├── artifacts/              # Contract artifacts for deployment
├── migrations/             # Alembic migrations
├── tests/                  # Test files - all tests should be placed here
├── Dockerfile              # Docker configuration file
├── .dockerignore           # Docker ignore file listing files to exclude
├── docker-build.sh         # Script for building and pushing Docker images
├── alembic.ini             # Alembic configuration
├── requirements.txt        # Project dependencies
├── run_app.py              # Simple script to run the application
├── start_api.py            # Enhanced script to start the API with validation
└── .env                    # Environment variables
```

## Key Concepts & Implementation Notes

1.  **Deployment Orchestration:** The `/api/deploy` (for tokens) and `/api/nft/deploy` endpoints handle the entire process: deployment, cross-chain connection, initial allocations (tokens only), and ownership transfer.
2.  **Service Account:** All blockchain transactions are performed by the account associated with the `DEPLOYER_PRIVATE_KEY` environment variable. This account requires funding on all target chains.
3.  **Smart Contract Artifacts:** Uses ABIs and bytecode from the `artifacts/` directory. Assumes specific constructor patterns and function names (see "For Future Developers").
4.  **Configuration:** Relies heavily on `.env` for sensitive keys and `app/rpc_config.json` for chain details (RPC URLs, explorer info, `gateway_address`, `zrc20_gas_token_address`).
5.  **Database:** PostgreSQL stores deployment configuration, status, contract addresses, and verification details. Migrations managed by Alembic.
6.  **Verification:** Supports Blockscout (for ZetaChain) and Etherscan-compatible explorers. Verification is attempted automatically post-deployment.
7.  **Multi-Chain Balance Retrieval:** The `/api/users/{address}` endpoint combines token balance data from all supported chains via explorer APIs, providing a comprehensive view of a user's Universal Token holdings.
8.  **Error Handling:** Includes specific handling for common issues like binary data in transaction receipts during NFT deployments.
9.  **Implementation Addresses:** The database stores both proxy and implementation addresses for deployed contracts, providing full transparency for verification and troubleshooting.
10. **Recent Fixes:** Added proper implementation of `Config.get_chain_config()` class method and fixed missing `owner_address` parameter in `encode_initialize_data()` calls to resolve circular import and initialization errors.

## For Future Developers

If you're working on this codebase, please note these important points:

1.  **Strict Python Version Requirement**: This project **only** works with **Python 3.11**. It is *not* compatible with 3.13 or other versions. Always use the correct virtual environment (`source venv_311/bin/activate`).

2.  **Service Deployer Account (`DEPLOYER_PRIVATE_KEY`)**:
    *   This account (specified in `.env`) executes *all* on-chain actions (deploy, connect, transfer allocations, transfer ownership).
    *   It **must** be funded with native gas tokens (ZETA on ZetaChain Testnet, Sepolia ETH, etc.) on ZetaChain *and* all target EVM chains *before* attempting deployment.

3.  **EVM Contract Constructor Pattern**:
    *   The current EVM deployment (`app/services/deployment.py`) uses the 6-argument constructor found in the `artifacts/EVMUniversalToken.json` ABI (name, symbol, decimals, initialSupply, currentChainId, initialOwner).
    *   If contracts are updated to use a standard UUPS initializer, the deployment logic *must* be refactored to deploy with no arguments and call `initialize` separately.

4.  **Contract Connection Function Names**:
    *   The connection logic (`app/services/deployment.py`) relies on specific function names:
        *   `setConnected(zrc20, contractAddress)` on the ZetaChain contract.
        *   `setUniversal(universalAddress)` on the EVM contract.
    *   If these names change in future contract versions, update the `method_name` arguments in the `call_contract_method` calls.

5.  **Chain Configuration (`app/rpc_config.json`)**:
    *   Must contain accurate RPC URLs and chain IDs.
    *   Crucially, for *all target EVM chains*, the `gateway_address` field **MUST** be populated with the correct ZetaChain Gateway contract address for that specific EVM network. Deployments will fail for chains missing this.
    *   The `zrc20_gas_token_address` field should contain the address of the ZRC-20 token that represents the gas token of each EVM chain on ZetaChain. This is used by the `/api/chains` endpoint.
    *   Explorer URLs (`explorer_url` and `blockscout_url`) are used for token balance queries and should be correctly configured for all chains.

6.  **Explorer Service**:
    *   The `explorer_service` (`app/services/explorer.py`) queries token balances from multiple block explorers.
    *   It supports both Blockscout API (ZetaChain) and Etherscan-compatible APIs (most EVM chains).
    *   If explorer APIs change their format or endpoints, update the corresponding methods in this service.

7.  **ZRC-20 Address Lookup (`app/utils/web3_helper.py`)**:
    *   The `get_zrc20_address` function now pulls ZRC-20 gas token addresses from the `zrc20_gas_token_address` field in `app/rpc_config.json` for each chain.
    *   This provides a single source of truth for ZRC-20 addresses and eliminates hardcoded values.
    *   New chains should have their ZRC-20 gas token addresses added to `rpc_config.json` to ensure proper functionality.

8.  **Model Export Pattern**: When adding new SQLAlchemy/Pydantic model classes, ensure they are exported in `app/models/__init__.py`.

9.  **Configuration Access**: Use the centralized `Config` class in `app/config.py` to access configuration settings. Avoid direct `os.getenv` calls elsewhere.

10. **Testing Changes**: After making modifications, run the test suite using pytest to ensure core functionality remains intact:
    ```bash
    source venv_311/bin/activate
    pytest tests/
    ```
    The tests in the `tests/` directory validate core functionality like deployment, verification, and API endpoints.

## Testing

### Testing Guidelines

When working with the test suite for this project, follow these best practices:

1. **Test Location**: All tests should be placed in the `backend/tests/` directory, not in the root directory.

2. **Using pytest**: All tests should use the pytest framework. Run tests with:
   ```bash
   source venv_311/bin/activate
   pytest tests/
   ```

3. **Fixtures**: Use pytest fixtures for test parameters rather than hardcoded values or command line arguments:
   ```python
   import pytest
   
   @pytest.fixture
   def contract_address():
       """Fixture providing a test contract address."""
       return "0x9A8f92a830A5cB89a3816e3D267CB7791c16b04D"
   
   def test_verification(contract_address):
       # Test using the fixture value
       assert contract_address.startswith("0x")
   ```

4. **Async Tests**: For asynchronous test functions, always add the `pytest.mark.asyncio` decorator:
   ```python
   import pytest
   
   @pytest.mark.asyncio
   async def test_api_call():
       # Async test code
       result = await some_async_function()
       assert result is not None
   ```

5. **Use Assertions**: Use pytest assertions within tests rather than returning boolean values:
   ```python
   # Good: Using assertions
   def test_function():
       result = calculate_value()
       assert result == expected_value
       
   # Avoid: Using return values
   def test_function():
       result = calculate_value()
       return result == expected_value  # Don't do this
   ```

6. **Proper Teardown**: Clean up resources in tests, especially database connections:
   ```python
   def test_database_operation():
       db = next(get_db())
       try:
           # Test using database
           result = db.query(Model).first()
           assert result is not None
       finally:
           db.close()  # Always close the database connection
   ```

Following these practices ensures consistent test behavior and makes the test suite easier to maintain and extend.

## Getting Started

### Prerequisites

- **Python 3.11 (REQUIRED)**
- PostgreSQL
- Git

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/yourusername/universal-token-launcher.git
    cd universal-token-launcher/backend
    ```

2.  Create and activate the **Python 3.11** virtual environment:
    ```bash
    # Ensure you are using python3.11 executable
    python3.11 -m venv venv_311
    source venv_311/bin/activate  # On Windows: venv_311\Scripts\activate
    # Your prompt should now show (venv_311)
    ```

3.  Install dependencies:
    ```bash
    pip install --upgrade pip
    pip install -r requirements.txt
    ```

4.  Create the environment file:
    ```bash
    cp .env.example .env
    ```

5.  **Edit `.env`**: Fill in your configuration, especially:
    *   Database connection details (`DATABASE_URL`)
    *   `DEPLOYER_PRIVATE_KEY` (must start with `0x` and be funded)
    *   Explorer API keys (`ETHERSCAN_API_KEY`, etc.)
    *   Optionally override RPC URLs if needed (e.g., `SEPOLIA_RPC_URL=...`)

### Database Setup

1.  Ensure PostgreSQL server is running.
2.  Create the database (if it doesn't exist):
    ```bash
    createdb universal_token_registry
    # Adjust user/permissions if necessary
    ```

3.  Apply database migrations:
    ```bash
    # Make sure venv_311 is active
    alembic upgrade head
    ```

4.  If you encounter migration errors related to missing columns or tables:
    ```bash
    # Modify the migration files to check for column/table existence before attempting changes
    # The migration files in migrations/versions/ have been updated to handle common issues
    # You might need to edit specific migration files if errors persist
    ```

### Running the Application

> **Reminder**: Requires **Python 3.11**.

1.  **Activate the virtual environment** (if not already active):
    ```bash
    cd backend
    source venv_311/bin/activate
    ```

2.  **Start the API server** (using the enhanced start script is recommended):
    ```bash
    python start_api.py
    ```
    The server will be available at `http://localhost:8000` (or the port configured in `.env`).

3.  **Access API Documentation**: Open `http://localhost:8000/docs` in your browser for the interactive Swagger UI.

4.  **Testing API Connectivity**:
    ```bash
    curl http://localhost:8000/health
    curl http://localhost:8000/api/chains
    ```

5.  **Stopping the server**: Press `Ctrl+C` in the terminal.

### API Endpoints Overview

The API provides endpoints for managing token and NFT deployments, verification, and information retrieval.

-   **Core Actions:** Deploying assets (`/api/deploy`, `/api/nft/deploy`), verifying contracts (`/api/verify`, `/api/nft/verify`).
-   **Information:** Getting chain info (`/api/chains`), retrieving deployment details (`/api/token/{id}`, `/api/nft/collection/{id}`).
    - The `/api/chains` endpoint now includes the `zrc20_gas_token_address` field for each chain, enabling frontend integration with ZRC-20 tokens.
-   **User Data:** Getting user-associated assets and balances across all chains (`/api/users/{address}`).

**Refer to the live interactive documentation at `/docs` on the running server for detailed endpoint specifications, request/response schemas, and testing.**

### Development

#### Creating Migrations

When you change database models (`app/models/*.py`):
```bash
# Ensure venv_311 is active
alembic revision --autogenerate -m "Description of changes"
```
Review the generated migration script in `migrations/versions/` carefully, then apply it:
```bash
alembic upgrade head
```