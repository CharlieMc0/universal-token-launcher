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
| `distributions_json` | JSON string | no | Array of distribution objects |
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
  -F "distributions_json=[{\"recipient_address\":\"0x4f1684A28E33F42cdf50AB96e29a709e17249E63\",\"chain_id\":\"7001\",\"token_amount\":\"100000000000000000000\"}]" \
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
curl -X GET http://localhost:8000/api/tokens?creator=0x4f1684A28E33F42cdf50AB96e29a709e17249E63 \
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

### Get User Tokens

Retrieves all tokens associated with a wallet address, including both created tokens and tokens visible on block explorers.

**Endpoint:** `GET /api/users/:walletAddress/tokens`

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `walletAddress` | string | Wallet address |

**Example Request:**

```bash
curl -X GET http://localhost:8000/api/users/0x4f1684A28E33F42cdf50AB96e29a709e17249E63/tokens \
  -H "X-Wallet-Address: 0x4f1684A28E33F42cdf50AB96e29a709e17249E63"
```

**Response:**

```json
{
  "tokens": [
    {
      "address": "0x1234567890abcdef1234567890abcdef12345678",
      "name": "My Token",
      "symbol": "MTK",
      "decimals": 18,
      "type": "ERC-20",
      "balance": "100000000000000000000",
      "iconUrl": "/uploads/icons/icon-1743539938071-325605596.png",
      "chainId": "7001",
      "isUniversalToken": true
    }
  ]
}
```

## Distribution Endpoints

### Process CSV File

Processes a CSV file with token distribution data.

**Endpoint:** `POST /api/distributions/csv`

**Content-Type:** `multipart/form-data`

**Request Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `distributions_csv` | file | yes | CSV file with distribution data |

**Example Request:**

```bash
curl -X POST http://localhost:8000/api/distributions/csv \
  -H "Content-Type: multipart/form-data" \
  -H "X-Wallet-Address: 0x4f1684A28E33F42cdf50AB96e29a709e17249E63" \
  -F "distributions_csv=@path/to/distributions.csv"
```

**Response:**

```json
{
  "message": "CSV file processed successfully",
  "filename": "distributions_csv-1234567890.csv",
  "totalRows": 3,
  "validRows": 2,
  "distributions": [
    {
      "recipient_address": "0x4f1684A28E33F42cdf50AB96e29a709e17249E63",
      "chain_id": "7001",
      "token_amount": "100"
    },
    {
      "recipient_address": "0x3a4Cc340A87C38d36e469CB8f8EB37Fba0e3daF3",
      "chain_id": "11155111",
      "token_amount": "50"
    }
  ]
}
```

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
``` 