# Universal Token Smart Contracts

This directory contains the Hardhat project for Universal Token smart contracts. These contracts allow for cross-chain transfers of tokens between ZetaChain and other EVM chains.

## Project Structure

- `contracts/`: Contains the smart contract source code
  - `base/UniversalToken.sol`: Base contract with common ERC20 functionality
  - `ZetaChainUniversalToken.sol`: ZetaChain implementation of Universal Token
  - `EVMUniversalToken.sol`: EVM chain implementation of Universal Token
- `scripts/`: Contains deployment and interaction scripts
  - `deploy.ts`: Script to deploy the token contracts
  - `connect-tokens.ts`: Script to connect tokens across chains
  - `simulate-transfer.ts`: Script to simulate cross-chain transfers

## Setup

1. Install dependencies:
```
npm install
```

2. Create a `.env` file based on `.env.example` with your configuration:
```
cp .env.example .env
```

3. Edit the `.env` file with your private key and API keys.

## Compilation

Compile the smart contracts:

```
npm run compile
```

## Deployment

Deploy the token contracts to different networks:

```
# Local development
npm run deploy-local

# ZetaChain
npm run deploy-zetachain

# Sepolia testnet
npm run deploy-sepolia

# Mumbai testnet
npm run deploy-mumbai
```

## Connecting Tokens

After deploying tokens on multiple chains, update the configuration in `scripts/connect-tokens.ts` with your token addresses, then run:

```
# Connect on ZetaChain
npm run connect-tokens -- --network zetachain

# Connect on Sepolia
npm run connect-tokens -- --network sepolia

# Connect on Mumbai
npm run connect-tokens -- --network mumbai
```

## Simulating Cross-Chain Transfers

To simulate cross-chain transfers, update the configuration in `scripts/simulate-transfer.ts` with your token addresses and accounts, then run:

```
# Simulate source chain operation
npm run simulate-transfer -- --network sepolia

# Simulate ZetaChain relay
npm run simulate-transfer -- --network zetachain

# Simulate destination chain operation
npm run simulate-transfer -- --network mumbai
```

## Notes on Actual Implementation

In a production environment, cross-chain transfers would require integration with the actual ZetaChain connector contracts rather than using the simplified simulation approach in this project. The contracts would need to be updated to interact with ZetaChain's cross-chain messaging system.
