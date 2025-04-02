# Universal Token Launcher

Universal Token Launcher is a web application that allows users to deploy Universal Tokens across multiple EVM chains with simple, single-signed transactions. Leveraging ZetaChain's interoperability, the app minimizes the creator's manual steps while automating cross-chain contract deployments and asset distributions.

## Features

- **Simplified Token Deployment**: Configure token parameters and deploy contracts with minimal friction
- **Cross-Chain Compatibility**: Automatically deploy Universal Token contracts on all selected EVM chains
- **Contract Verification**: Automatically verify deployed contracts on block explorers
- **Token Transfers**: Simple interface for token holders to move tokens between chains
- **ZetaChain Integration**: Leverage ZetaChain's interoperability for seamless cross-chain operations

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

### Testing API Endpoints

You can use tools like Postman or curl to test API endpoints. For endpoints that accept file uploads, ensure you're not setting the Content-Type header when sending FormData.

## Troubleshooting

### Invalid JSON Format Error

If you get an error like "SyntaxError: Unexpected token '-', \"------WebK\"... is not valid JSON", it usually means the client is sending FormData but the server is trying to parse it as JSON. Make sure you're not setting the Content-Type header when sending FormData.

### Database Connection Issues

If the backend can't connect to PostgreSQL, check:
1. Database service is running
2. Credentials in `.env` are correct
3. Database and user with proper permissions exist
