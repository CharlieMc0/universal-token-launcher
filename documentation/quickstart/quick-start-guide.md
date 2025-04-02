# Universal Token Launcher: Quick Start Guide

This guide provides a quick overview of the Universal Token Launcher project and instructions for getting started with development.

## Project Overview

The Universal Token Launcher is a web application that allows users to deploy Universal Tokens across multiple EVM chains with simple, single-signed transactions. Using ZetaChain's interoperability, it automates cross-chain contract deployments.

## Repository Structure

```
utl/
├── documentation/     # Project documentation
├── frontend/          # React frontend application
├── backend/           # Node.js & Express backend API
├── smart-contracts/   # Smart contracts & deployment scripts
└── standard-contracts/ # Read-only reference code for contracts
```

## Quick Start: Backend

1. **Clone the repository**

```bash
git clone [repository-url]
cd utl
```

2. **Set up the environment**

```bash
cd backend
cp .env.example .env
# Edit .env with your database credentials and blockchain RPC URLs
```

3. **Install dependencies**

```bash
npm install
```

4. **Initialize the database**

```bash
# Make sure PostgreSQL is running
npm run migrate
```

5. **Start the development server**

```bash
npm run dev
```

## Quick Start: Frontend

1. **Set up the environment**

```bash
cd frontend
cp .env.example .env
# Edit .env with your API URL and chain configurations
```

2. **Install dependencies**

```bash
npm install
```

3. **Start the development server**

```bash
npm start
```

## Key Concepts

### Token Deployment Flow

1. User configures token details (name, symbol, supply, etc.)
2. User pays a deployment fee in ZETA on ZetaChain
3. Backend deploys contracts on all selected chains
4. Contracts are verified on block explorers

### Backend Architecture

- **Express API**: RESTful endpoints for token configuration and management
- **PostgreSQL Database**: Stores token configurations, deployment logs
- **Contract Service**: Manages blockchain interactions and contract deployments
- **Verification Service**: Handles contract verification on block explorers

### Frontend Architecture

- **React with Hooks**: Component-based UI
- **wagmi & ethers.js**: For blockchain interactions
- **RainbowKit**: Wallet connection UI

## Common Development Tasks

### Adding a New Chain

1. Update `backend/src/constants/chains.js` with the new chain details
2. Update `frontend/src/config/chains.js` with matching configuration
3. Test deployment functionality on the new chain

### Testing Contract Deployment

```bash
# From backend directory
npm run run-demo
```

### Verifying Contracts

```bash
# From backend directory
npm run verify-test
```

## Troubleshooting

### CORS Issues

If you encounter CORS errors between frontend and backend:

1. Check that your backend `.env` has proper CORS configuration:
   ```
   CORS_ORIGINS=http://localhost:3000
   ```

2. Set `DEBUG=true` in backend for development to allow all origins

### Database Connection Issues

If you have problems connecting to the database:

1. Verify PostgreSQL is running
2. Check credentials in `.env` file
3. Ensure database exists: `createdb universal_token_launcher`

## Additional Resources

- [Full Documentation](./documentation)
- [Backend API Endpoints](./backend/README.md)
- [Tech Stack Details](./documentation/tech-stack.md)
- [Application Flow](./documentation/app-flow.md)

## Contribution Guidelines

1. Create feature branches from `main`
2. Follow existing code style and patterns
3. Write tests for new functionality
4. Update documentation for significant changes
5. Submit pull requests with detailed descriptions 