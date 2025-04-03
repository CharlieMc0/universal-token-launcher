# Universal Token Launcher API Reference

This document provides a comprehensive reference for the Universal Token Launcher API endpoints.

## Base URL

The base URL for all API endpoints is:

```
http://localhost:8000/api
```

## Authentication

All requests require a wallet address to be provided in the `X-Wallet-Address` header.

```
X-Wallet-Address: 0x1234...5678
```

For development purposes, authentication can be bypassed by setting `DEBUG=true` and `AUTH_BYPASS_ENABLED=true` in the backend `.env` file.

## Token Endpoints

### Create Token Configuration

Creates a new token configuration.

**Endpoint:** `POST /api/tokens`

**Content-Type:** `multipart/form-data`

**Request Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `token_name` | string | yes | Name of the token |
| `token_symbol` | string | yes | Symbol of the token |
| `decimals` | integer | no | Number of decimals (default: 18) |
| `total_supply` | string | yes | Total supply of the token |
| `selected_chains` | JSON string | yes | Array of chain IDs for deployment |
| `icon` | file | no | Token icon image file |

**Example Request:**

```bash
curl -X POST http://localhost:8000/api/tokens \
  -H "Content-Type: multipart/form-data" \
  -H "X-Wallet-Address: 0x4f1684A28E33F42cdf50AB96e29a709e17249E63" \
  -F "token_name=My Token" \
  -F "token_symbol=MTK" \
  -F "decimals=18" \
  -F "total_supply=1000000000000000000000" \
  -F "selected_chains=[\"7001\",\"11155111\"]" \
  -F "icon=@path/to/icon.png"
```

**Response:**

```json
{
  "id": 1,
  "creatorWallet": "0x4f1684A28E33F42cdf50AB96e29a709e17249E63",
  "tokenName": "My Token",
  "tokenSymbol": "MTK",
  "iconUrl": "/uploads/icons/icon-1743539938071-325605596.png",
  "decimals": 18,
  "totalSupply": "1000000000000000000000",
  "deploymentStatus": "pending",
  "chainInfo": [
    {
      "name": "ZetaChain Testnet",
      "chainId": "7001",
      "rpcUrl": "https://zetachain-athens-evm.blockpi.network/v1/rpc/public",
      "explorerUrl": "https://athens.explorer.zetachain.com",
      "isZetaChain": true,
      "color": "#00B386",
      "shortName": "ZetaChain",
      "isTestnet": true,
      "isSupported": true,
      "blockscoutUrl": "https://athens.explorer.zetachain.com",
      "deploymentStatus": "pending",
      "verificationStatus": "pending"
    },
    {
      "name": "Sepolia",
      "chainId": "11155111",
      "rpcUrl": "https://ethereum-sepolia.publicnode.com",
      "explorerUrl": "https://sepolia.etherscan.io",
      "isZetaChain": false,
      "color": "#627EEA",
      "shortName": "Sepolia",
      "isTestnet": true,
      "isSupported": true,
      "deploymentStatus": "pending",
      "verificationStatus": "pending"
    }
  ]
}
```

### Get Token by ID

Retrieves a token configuration by ID.

**Endpoint:** `GET /api/tokens/:id`

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | integer | Token configuration ID |

**Example Request:**

```bash
curl -X GET http://localhost:8000/api/tokens/1 \
  -H "X-Wallet-Address: 0x4f1684A28E33F42cdf50AB96e29a709e17249E63"
```

**Response:**

Same format as the response from the create endpoint, with updated deployment and verification status.

### Deploy Token

Triggers the deployment process for a token configuration.

**Endpoint:** `POST /api/tokens/:id/deploy`

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | integer | Token configuration ID |

**Request Body:**

```json
{
  "fee_paid_tx": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
}
```

**Example Request:**

```bash
curl -X POST http://localhost:8000/api/tokens/1/deploy \
  -H "Content-Type: application/json" \
  -H "X-Wallet-Address: 0x4f1684A28E33F42cdf50AB96e29a709e17249E63" \
  -d '{"fee_paid_tx": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"}'
```

**Response:**

```json
{
  "success": true,
  "message": "Token deployment initiated",
  "status": "deploying"
}
```

### Get All Tokens

Retrieves all tokens created by a wallet address.

**Endpoint:** `GET /api/tokens`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `creator` | string | no | Filter by creator wallet address |

**Example Request:**

```bash
curl -X GET http://localhost:8000/api/tokens?creator=0x4f1684a28e33f42cdf50ab96e29a709e17249e63 \
  -H "X-Wallet-Address: 0x4f1684A28E33F42cdf50AB96e29a709e17249E63"
```

**Response:**

```json
{
  "tokens": [
    {
      "id": 1,
      "creatorWallet": "0x4f1684A28E33F42cdf50AB96e29a709e17249E63",
      "tokenName": "My Token",
      "tokenSymbol": "MTK",
      "iconUrl": "/uploads/icons/icon-1743539938071-325605596.png",
      "decimals": 18,
      "totalSupply": "1000000000000000000000",
      "deploymentStatus": "completed",
      "chainInfo": [
        // Chain info objects similar to other endpoints
      ]
    }
  ]
}
```

## Database Persistence & Reliability

The backend system ensures reliable storage of token deployment information with the following features:

1. **Immediate Database Commits**:
   - Critical data like ZetaChain contract addresses are committed to the database immediately after generation
   - EVM contract addresses are saved as soon as they are deployed
   - Database transactions are properly managed to prevent data loss

2. **Multi-stage Persistence**:
   - Initial creation stores basic token configuration
   - Deployment updates store contract addresses as they are generated
   - Connection status updates track cross-chain linking
   - Final state updates ensure complete deployment information

3. **Reliability Features**:
   - Explicit database state validation before proceeding to next deployment steps
   - Multiple commit points throughout the deployment process
   - Detailed logging of database operations
   - Error recovery mechanisms with partial success tracking

4. **Database Schema**:
   - The `token_deployments` table includes key fields:
     - `zc_contract_address` for the primary ZetaChain contract
     - `connected_chains_json` for deployment data across all chains
     - `deployment_status` tracking overall process state
     - `error_message` for detailed error tracking

## Error Responses

All API endpoints return standardized error responses:

```json
{
  "error": true,
  "message": "Error message describing the issue",
  "details": {
    // Additional error details if available
  }
}
```

Common HTTP status codes:

| Status Code | Description |
|-------------|-------------|
| 400 | Bad Request - Invalid input parameters |
| 401 | Unauthorized - Missing or invalid wallet address |
| 404 | Not Found - Resource not found |
| 500 | Internal Server Error - Unexpected server error |

## ChainInfo Object Reference

The `chainInfo` array in token responses contains detailed information about each chain:

| Property | Type | Description |
|----------|------|-------------|
| `name` | string | Full chain name (e.g., "ZetaChain Testnet") |
| `chainId` | string | Chain identifier (e.g., "7001") |
| `rpcUrl` | string | JSON-RPC endpoint URL |
| `explorerUrl` | string | Base URL for block explorer |
| `isZetaChain` | boolean | Whether this is a ZetaChain network |
| `color` | string | Hex color code for UI display |
| `shortName` | string | Abbreviated name for UI display |
| `isTestnet` | boolean | Whether this is a testnet network |
| `isSupported` | boolean | Whether the chain is fully supported |
| `blockscoutUrl` | string | Blockscout explorer URL (if applicable) |
| `contractAddress` | string | Deployed token contract address |
| `deploymentStatus` | string | Deployment status (pending, deploying, success, failed) |
| `verificationStatus` | string | Verification status (pending, processing, verified, failed) |
| `verificationError` | string | Error message if verification failed |
| `verifiedUrl` | string | Direct URL to verified contract source code |