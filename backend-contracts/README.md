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
  "message": "Deployment successful, ownership transferred",
  "deployment": {
    "zetaChain": {
      "contractAddress": "0x...",
      "transactionHash": "0x...",
      "blockNumber": 123456
    },
    "evmChains": {
      "11155111": {
        "contractAddress": "0x...",
        "transactionHash": "0x...",
        "blockNumber": 789012
      }
    }
  },
  "verificationStatus": "pending"
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