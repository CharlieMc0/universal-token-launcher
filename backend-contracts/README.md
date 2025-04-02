# Universal Token Contract Deployment Service

A focused backend service for deploying and verifying Universal Token contracts across multiple EVM chains.

## Overview

This service provides specialized API endpoints to:

1. Deploy Universal Tokens across multiple blockchains, handling initial ownership and transferring it to the user post-setup.
2. Verify deployed contract source code on block explorers.
3. Retrieve supported chain information.

The service is designed to be simple, readable, and focused solely on smart contract deployment and verification.

## Features

- Deploy ZetaChain Universal Tokens on ZetaChain.
- Deploy EVM Universal Tokens on other EVM-compatible chains.
- **Deployment Strategy:** Deploys contracts with the service wallet as the initial owner, transferring ownership and minted tokens to the user only after successful cross-chain setup.
- Link contracts for cross-chain functionality.
- **Contract Verification:** Supports verification on both Blockscout (ZetaChain) and Etherscan-compatible explorers (Ethereum, Polygon, Base, etc.).
- Advanced error logging and gas estimation for contract deployment and connection steps.
- Smart retry mechanism for token connections.
- Simple, clean API interface.

## Prerequisites

- Node.js 16.x or later
- Access to RPC endpoints for target blockchains
- API keys for block explorers (Etherscan, Polygonscan, Basescan, Blockscout)
- Wallet with sufficient funds for deployment (this wallet's private key goes in `.env`)

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
4. Edit `.env` to include your configuration:
   - RPC URLs for all target chains.
   - `DEPLOYER_PRIVATE_KEY`: Private key of the wallet the service will use for deployment and initial ownership.
   - API keys for block explorers.
   - Set `LOG_LEVEL=debug` for detailed logs during development.

## Usage

### Start the Server

Development mode with auto-reload:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

### API Endpoints

#### Deploy Tokens
```
POST /api/deploy
```

**Request Body:**
```json
{
  "tokenName": "My Universal Token",
  "tokenSymbol": "MUT",
  "decimals": 18,
  "totalSupply": "1000000000000000000000",
  "selectedChains": ["7001", "11155111"],
  "deployerAddress": "0x..." // The address that will receive final ownership after deployment and connection
}
```

**Response:**
```json
{
  "success": true,
  "message": "Deployment process initiated successfully.",
  "deploymentId": 123 // The ID of the new record in 'tokendeployments' table
}
```

#### Verify Contracts
```
POST /api/verify
```

**Request Body:**
```json
{
  "contractAddress": "0x...",
  "chainId": "7001",
  "contractType": "zetachain" // or "evm"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Contract verification submitted successfully",
  "status": "pending",
  "explorerUrl": "https://zetachain-testnet.blockscout.com/address/0x..."
}
```

**Note:** Verification is supported for all chains via their respective block explorers - Blockscout for ZetaChain and Etherscan-compatible explorers for other EVM chains.

#### Get Supported Chains
```
GET /api/chains
```

**Response:**
```json
{
  "success": true,
  "chains": [
    {
      "name": "ZetaChain Testnet",
      "chainId": "7001",
      "rpcUrl": "https://zetachain-athens-evm.blockpi.network/v1/rpc/public",
      "explorerUrl": "https://athens.explorer.zetachain.com",
      "blockscoutUrl": "https://zetachain-testnet.blockscout.com",
      "isZetaChain": true,
      "color": "#00B386",
      "shortName": "ZetaChain",
      "isTestnet": true,
      "isSupported": true,
      "verifier": "blockscout"
    },
    // More chains...
  ]
}
```

## Architecture

The service follows a simple modular design:

- **Config**: Chain configurations and environment settings
- **Services**: Core functionality for deployment, connection, verification, and ownership transfer
- **Routes**: API endpoints and request handling
- **Utils**: Utilities for contracts, logging, etc.

## Debugging

Logs are generated in the `logs` directory, with different levels based on the environment:
- `all.log`: All logs
- `error.log`: Error logs only

Set `LOG_LEVEL=debug` in the `.env` file for more detailed logs, which now include:
- Detailed transaction receipts for deployment, connection, and ownership transfers
- Gas estimation parameters
- Contract connection errors with full context
- API responses from verification services 

## Database Integration

This service now uses a PostgreSQL database to track deployment status and store contract information.

### Database Setup

1.  **Install PostgreSQL:** Ensure you have PostgreSQL installed and running.
2.  **Create Database:** Create a database for the service:
    ```sql
    CREATE DATABASE universal_token_registry;
    ```
3.  **Configure Environment:** Update the `.env` file with your database connection details:
    ```dotenv
    DB_DATABASE=universal_token_registry
    DB_USERNAME=your_db_username
    DB_PASSWORD=your_db_password
    DB_HOST=localhost
    DB_PORT=5432
    ```
4.  **Run Migrations:** Execute the database migrations to create the necessary tables:
    ```bash
    npx sequelize-cli db:migrate
    ```

### Database Schema

The primary table used is `tokendeployments` (note the lowercase naming convention):

| Column                | Type              | Description                                                                 |
| --------------------- | ----------------- | --------------------------------------------------------------------------- |
| `id`                  | INTEGER           | Auto-incrementing primary key, representing the deployment ID.              |
| `token_name`          | STRING            | The name of the token being deployed.                                       |
| `token_symbol`        | STRING            | The symbol of the token.                                                    |
| `decimals`            | INTEGER           | The number of decimals for the token.                                       |
| `total_supply`        | STRING            | The total supply of the token (stored as a string to handle large numbers). |
| `zc_contract_address` | STRING            | The address of the deployed contract on ZetaChain.                          |
| `deployer_address`    | STRING            | The wallet address that will receive final ownership of the contracts.      |
| `connected_chains_json`| JSONB             | JSON object storing details for each deployed chain (see format below).    |
| `deployment_status`   | STRING            | Current status of the overall deployment process (see states below).        |
| `error_message`       | TEXT              | Stores any error messages encountered during the deployment.                |
| `created_at`          | TIMESTAMP WITH TZ | Timestamp of record creation.                                               |
| `updated_at`          | TIMESTAMP WITH TZ | Timestamp of last record update.                                            |

**`connected_chains_json` Format:**

This JSONB column stores an object where keys are chain IDs (as strings). Each chain ID maps to an object with the following structure:

```json
{
  "7001": { // Example: ZetaChain Testnet
    "contractAddress": "0x...",
    "deploymentStatus": "success", // "pending", "deploying", "success", "failed"
    "verificationStatus": "verified", // "pending", "in_progress", "verified", "failed"
    "verificationError": null, // Error message if verification failed
    "verifiedUrl": "https://blockscout...", // Link to verified source code
    "explorerUrl": "https://athens.explorer...",
    "blockscoutUrl": "https://zetachain-testnet.blockscout..."
  },
  "11155111": { // Example: Sepolia Testnet
    "contractAddress": "0x...",
    "deploymentStatus": "success",
    "verificationStatus": "pending",
    "verificationError": null,
    "verifiedUrl": null,
    "explorerUrl": "https://sepolia.etherscan.io...",
    "blockscoutUrl": null
  }
  // ... other selected chains
}
```

**Deployment Status States (`deployment_status` column):**

- `starting`: Initial state when the request is received.
- `deploying_zeta`: Deploying the contract on ZetaChain.
- `deploying_evm_<chainId>`: Deploying contract on a specific EVM chain (e.g., `deploying_evm_11155111`).
- `connecting`: Attempting to connect contracts across chains (placeholder/future implementation).
- `verifying`: Initiating contract verification process on explorers.
- `verification_issues`: Verification process completed, but one or more contracts failed verification.
- `transferring_ownership`: Transferring contract ownership and initial tokens to the `deployerAddress`.
- `completed`: All steps finished successfully.
- `failed`: A critical error occurred during deployment, connection, or ownership transfer.

### Naming Conventions

This service follows these naming conventions for database objects:

- **Table Names:** Lowercase with plural form (e.g., `tokendeployments`)
- **Column Names:** Lowercase with underscores (snake_case) (e.g., `token_name`, `deployer_address`)
- **Timestamp Columns:** `created_at` and `updated_at` (not camelCase)

### Troubleshooting Database Issues

If you encounter database connection or model loading issues:

1. **Check Environment Variables:** Ensure your `.env` file has the correct database credentials.
2. **Verify Database Exists:** Confirm that the database specified in `DB_DATABASE` exists in PostgreSQL.
3. **Run Migrations:** Make sure migrations are up-to-date with `npx sequelize-cli db:migrate`.
4. **Check Logs:** The service logs detailed information about model loading at startup:
   - `Available database models: ...` - Shows all loaded models
   - `tokendeployment model found with table: ...` - Confirms model loading
   - If you see `CRITICAL ERROR: tokendeployment model not available`, check your model definitions and naming.
5. **Model Case Sensitivity:** The service will try to find the model using multiple case variations (camelCase, PascalCase, lowercase) for compatibility.

**Response (Error Example):**
```json
{
  "success": false,
  "message": "Deployment failed. Please check logs for details. Record ID: 123",
  "deploymentId": 123
}
``` 