# Universal Token Launcher

Universal Token Launcher is a web application that allows users to deploy Universal Tokens across multiple EVM chains with simple, single-signed transactions. Leveraging ZetaChain's interoperability, the app minimizes the creator's manual steps while automating cross-chain contract deployments and asset distributions.

## Features

- **Simplified Token Deployment**: Configure token parameters and deploy contracts with minimal friction
- **Cross-Chain Compatibility**: Automatically deploy Universal Token contracts on all selected EVM chains
- **Contract Verification**: Automatically verify deployed contracts on block explorers
- **Token Transfers**: Simple interface for token holders to move tokens between chains
- **ZetaChain Integration**: Leverage ZetaChain's interoperability for seamless cross-chain operations
- **Pagination and Sorting**: Browse through tokens with pagination and multiple sorting options
- **Detailed Token Information**: View token balances across different chains with proper formatting

## Documentation

For detailed documentation, please refer to:

- [Quick Start Guide](./documentation/quickstart/quick-start-guide.md): Get up and running quickly
- [API Reference](./documentation/api-reference.md): Comprehensive API documentation
- [Contribution Guide](./documentation/contribution-guide.md): How to contribute to the project
- [Tech Stack Details](./documentation/tech-stack.md): Information about the technologies used
- [Application Flow](./documentation/app-flow.md): Step-by-step walkthrough of user journeys
- [Backend README](./backend/README.md): Backend-specific documentation and setup instructions

## Repository Structure

```
utl/
├── documentation/     # Project documentation
│   └── quickstart/    # Quickstart guides
├── frontend/          # React frontend application
├── backend/           # Node.js & Express backend API
├── smart-contracts/   # Smart contracts & deployment scripts
└── standard-contracts/ # Read-only reference code for contracts (do not modify)
```

## Quick Start

### Backend Setup

```bash
# Navigate to backend directory
cd backend

# Copy environment file and configure
cp .env.example .env

# Install dependencies
npm install

# Initialize database
npm run migrate

# Start development server
npm run dev
```

### Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Copy environment file and configure
cp .env.example .env

# Install dependencies
npm install

# Start development server
npm start
```

## Testing

### Backend Tests

```bash
cd backend
npm test
```

### Contract Deployment Tests

```bash
cd backend
npm run run-demo
```

## Frontend Features

### Token Transfer Page

The Token Transfer page allows users to easily transfer their tokens between different chains:

- **Paged Token Display**: View up to 10 tokens per page with simple navigation controls
- **Token Count**: Clearly see the total number of tokens you own
- **Sorting Options**: Sort tokens by balance (high/low), name (A-Z/Z-A), or symbol (A-Z/Z-A)
- **Detailed Chain Information**: View token balances across different chains with proper formatting
- **Interactive Transfer Interface**: Select source chain, destination chain, and amount to transfer
- **API Integration**: Proper integration with the `/api/users/{address}` endpoint for fetching user tokens

### API Integration

The frontend integrates with the backend API to:
- Fetch token information from `/api/users/{address}`
- Display token balances and chain information
- Prepare and submit cross-chain transfers

## License

[MIT](LICENSE)

# Universal Token Launcher Backend

This is the backend service for the Universal Token Launcher application on ZetaChain. It provides APIs for creating, managing, and deploying universal tokens.

## Prerequisites

- Node.js 18+
- PostgreSQL database
- ZetaChain and EVM-compatible wallet with funds

## Setup

1. Clone the repository and install dependencies:

```bash
git clone <repository-url>
cd utl/backend
npm install
```

2. Set up your environment variables by copying the example file:

```bash
cp .env.example .env
```

3. Update the `.env` file with your database credentials, RPC URLs, and private key:

```
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=universal_token_launcher

# Chain Configuration
ZETACHAIN_RPC_URL=https://zetachain-athens-evm.blockpi.network/v1/rpc/public
SEPOLIA_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
BASE_GOERLI_RPC_URL=https://base-goerli.blockpi.network/v1/rpc/public

# Wallet Configuration
TEST_WALLET_PRIVATE_KEY=your_private_key

# Server Configuration
PORT=3000
JWT_SECRET=your_jwt_secret
```

4. Create the database:

```bash
createdb universal_token_launcher
```

5. Run database migrations:

```bash
npm run migrate
```

## Running the Server

Start the development server:

```bash
npm run dev
```

For production:

```bash
npm run build
npm start
```

The server will be available at http://localhost:3000 (or the port specified in your `.env` file).

## API Endpoints

### Token Configuration

- `POST /api/tokens` - Create a new token configuration
- `GET /api/tokens` - Get all token configurations
- `GET /api/tokens/:id` - Get token configuration by ID
- `GET /api/tokens/:id/logs` - Get deployment logs for a token
- `POST /api/tokens/:id/deploy` - Deploy a token
- `GET /api/users/:address` - Get tokens owned by a specific address

## Direct Contract Deployment

You can also use the CLI scripts to deploy and connect tokens directly:

### Deploy a token

```bash
npm run deploy-token -- --name "My Token" --symbol MYT --supply 1000000 7001
```

### Connect tokens across chains

```bash
npm run connect-tokens -- --zeta-address 0x1234... --add-chain 11155111:0xabcd...
```

## Project Structure

- `src/` - Source code
  - `config/` - Configuration files
  - `controllers/` - API controllers
  - `db/` - Database migrations and seeders
  - `models/` - Sequelize models
  - `routes/` - API routes
  - `services/` - Business logic
  - `utils/` - Utility functions
- `scripts/` - CLI scripts for direct interactions
- `uploads/` - Uploaded files (token icons)

## Development

This project uses TypeScript, Sequelize, and Express. Ensure all new code follows the existing patterns and includes proper error handling.

## Project Structure

- `frontend/` - React frontend application
- `backend/` - Node.js/Express backend server
- `documentation/` - Project design docs and specifications
- `smart-contracts/` - Smart contract code for token deployment

## Setup Instructions

### Environment Configuration

1. Copy `.env.example` to `.env` and update the values:
```bash
cp .env.example .env
```

2. Configure the database settings and RPC URLs in the `.env` file

### Backend Setup

```bash
cd backend
npm install
npm run dev
```

### Frontend Setup

```bash
cd frontend
npm install
npm start
```

## Development Notes

### API Service FormData Handling

When uploading files with FormData (like token icons), do not manually set the Content-Type header. Let the browser set it automatically with the correct boundary value:

```javascript
// Correct way to send FormData:
fetch('/api/upload', {
  method: 'POST',
  body: formData,
  // Do NOT set Content-Type header for FormData
})
```

### User Token API Response

The `/api/users/{address}` endpoint returns token information in this format:

```json
{
  "success": true,
  "message": "User tokens retrieved successfully",
  "wallet_address": "0x4f1684A28E33F42cdf50AB96e29a709e17249E63",
  "tokens": [
    {
      "token_name": "Test Token",
      "token_symbol": "TST",
      "decimals": 18,
      "is_deployer": true,
      "zc_contract_address": "0x7d2A9fe6eC18d5Ae31138F829AD854C39f30Bc6D",
      "balances": [
        {
          "chain_id": "7001",
          "chain_name": "ZetaChain Testnet",
          "balance": "1000000000000000000000000",
          "contract_address": "0x7d2a9fe6ec18d5ae31138f829ad854c39f30bc6d",
          "explorer_url": "https://explorer.athens.zetachain.com",
          "blockscout_url": "https://zetachain-testnet.blockscout.com/"
        },
        {
          "chain_id": "11155111",
          "chain_name": "Sepolia Testnet",
          "balance": "0",
          "contract_address": "0xDe5EDbA4ea8a08D46753a6a45db770564d92E3F0",
          "explorer_url": "https://sepolia.etherscan.io",
          "blockscout_url": null
        }
      ]
    }
  ]
}
```

## Troubleshooting

### Invalid JSON Format Error

If you get an error like "SyntaxError: Unexpected token '-', \"------WebK\"... is not valid JSON", it usually means the client is sending FormData but the server is trying to parse it as JSON. Make sure you're not setting the Content-Type header when sending FormData.

### Database Connection Issues

If the backend can't connect to PostgreSQL, check:
1. Database service is running
2. Credentials in `.env` are correct
3. Database and user with proper permissions exist
