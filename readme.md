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

For more details, see the design documents in the `/design-docs` directory.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
