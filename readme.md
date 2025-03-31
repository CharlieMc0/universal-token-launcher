# Universal Token Launcher

The Universal Token Launcher is a web application that empowers non-developer users to quickly deploy Universal Tokens across multiple EVM chains. Leveraging ZetaChain’s interoperability and standard contracts, this app automates cross-chain contract deployments and token distributions with minimal interaction.

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
- **Token Bridging:** Seamlessly bridge tokens between chains (bridge in/bridge out).
- **Web3 Wallet Integration:** Authenticate users via their Web3 wallets (e.g., MetaMask).

---

## Architecture

- **Frontend:** Built using HTML, CSS (Tailwind CSS recommended), and vanilla JavaScript.
- **Backend:** Developed with Python and FastAPI, using PostgreSQL for persistent data and Redis for caching.
- **Authentication:** Web3 wallet-based with signature verification and JWT session management.
- **APIs:** RESTful endpoints for token configuration, deployment, bridging, and status updates.
- **File Storage:**  GCP Cloud Storage for secure file uploads (CSV and token icons).
