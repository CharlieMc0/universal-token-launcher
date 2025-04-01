# Universal Token Launcher

The Universal Token Launcher is a web application that empowers non-developer users to quickly deploy Universal Tokens across multiple EVM chains. Leveraging ZetaChain's interoperability and standard contracts, this app automates cross-chain contract deployments and token distributions with minimal interaction.

---

## Table of Contents

- [Universal Token Launcher](#universal-token-launcher)
  - [Table of Contents](#table-of-contents)
  - [Overview](#overview)
  - [Features](#features)
  - [Architecture](#architecture)

---

## Overview

The Universal Token Launcher simplifies token deployment by allowing token creators to:
- Configure token details (name, icon, decimals, total supply)
- Upload a CSV file for initial token distributions (address, chain ID, token amount)
- Pay a fixed ZETA fee with a single signed transaction

Token holders can view their balances and bridge tokens between chains with a one-click interface.

---

## Features

- **Token Configuration:** Define token parameters and distribution via CSV.
- **Cross-Chain Deployment:** Automatically deploy token contracts on selected EVM chains.
- **Fee Management:** Collect a fixed ZETA fee through a single transaction.
- **Token Transfers:** Seamlessly transfer tokens between chains (burn on source, mint on destination).
- **Web3 Wallet Integration:** Authenticate users via their Web3 wallets (e.g., MetaMask).

---

## Architecture

- **Frontend:** Built using HTML, CSS, and vanilla JavaScript.
- **Backend:** Developed with Python and FastAPI, using PostgreSQL for persistent data.
- **Authentication:** Web3 wallet-based with signature verification and JWT session management.
- **APIs:** RESTful endpoints for token configuration, deployment, and transfer processing.
- **File Storage:** GCP Cloud Storage for secure file uploads (CSV and token icons).

## Setup Requirements

- **Python 3.8+**
- **PostgreSQL**
- **Web3 wallet** (e.g., MetaMask)
- **Node.js and npm** (for optional frontend tools)

## Getting Started

### 1. Clone the Repository

```bash 
git clone https://github.com/your-username/universal-token-launcher.git
cd universal-token-launcher
```

### 2. Set Up the Backend

```bash
# Create a virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
cd backend
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env with your database and other settings
```

### 3. Set Up the Database

```bash
# Create a PostgreSQL database
# Update DATABASE_URL in your .env file
# Run the backend to create the tables
python run.py
```

### 4. Start the Application

Use the provided start script to run both frontend and backend:

```bash
# From the project root
./start.sh
```

Or start them separately:

**Backend:**
```bash
cd backend
python run.py
```

**Frontend:**
```bash
cd frontend
# Using Python's built-in HTTP server
python -m http.server 5500
```

### 5. Access the Application

- Frontend: http://localhost:5500
- Backend API: http://localhost:8000

## Usage

1. **Connect Wallet:** Click "Connect Wallet" to authenticate with your Web3 wallet.
2. **Create Token:** Fill out the token configuration form, select target chains, and submit.
3. **Pay Fee:** Pay the required ZETA fee to trigger deployment.
4. **Transfer Tokens:** Once deployed, use the transfer interface to move tokens between chains.

## Documentation

For more details, see the design documents in the `/documentation` directory.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

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
