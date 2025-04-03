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

## Compiler & EVM Version

The Universal Token contracts are compiled with the following configurations:

- **Solidity Version**: `0.8.26`
- **EVM Version**: `paris`
- **Optimizer Enabled**: Yes, with 200 runs
- **License**: MIT

These configurations can be found in the `hardhat.config.ts` file.

## Manual Contract Verification

You can manually verify the deployed contracts on block explorers to allow users to view and interact with the contract source code directly.

### Verification on Etherscan (for Ethereum, BSC, or Base)

1. Gather the necessary information:
   - Contract address
   - Solidity compiler version (0.8.26)
   - EVM version (paris)
   - Constructor arguments (if any)
   - Optimization settings (enabled, 200 runs)
   - The flattened contract source code

2. Flatten your contract source code:
   ```
   npx hardhat flatten contracts/EVMUniversalToken.sol > EVMUniversalTokenFlat.sol
   ```

3. Remove duplicate license identifiers from the flattened file. Keep only the first `// SPDX-License-Identifier: MIT` line.

4. Go to the block explorer (e.g., Etherscan, BscScan, BaseScan) and search for your contract address.

5. Click on the "Contract" tab, then "Verify and Publish".

6. Select "Solidity (Single file)" as the compiler type.

7. Fill in the form:
   - Compiler Version: 0.8.26
   - Open Source License Type: MIT
   - Optimization: Yes, with 200 runs
   - EVM Version: paris
   - Enter the flattened source code

8. If your contract has constructor arguments, enter them in ABI-encoded format. You can generate this with:
   ```
   npx hardhat verify-args --constructor-args YOUR_ARGS_HERE
   ```

9. Click "Verify and Publish"

### Verification on Blockscout (for ZetaChain)

1. Flatten your contract source code:
   ```
   npx hardhat flatten contracts/ZetaChainUniversalToken.sol > ZetaChainUniversalTokenFlat.sol
   ```
   
   Alternatively, you can use the already flattened files in the project:
   ```
   # For ZetaChain token
   cat flat
   ```

2. Remove duplicate license identifiers from the flattened file.

3. Go to ZetaChain's Blockscout explorer and search for your contract.

4. Click on the "Code" tab, then "Verify & Publish".

5. Fill in the form:
   - Contract Name: ZetaChainUniversalToken
   - Compiler: v0.8.26
   - EVM Version: paris
   - Optimization: Yes, with 200 runs
   - Enter the flattened source code
   - Provide constructor arguments if needed

6. Click "Verify & Publish"

### Verification using Hardhat (Automated)

You can also verify contracts automatically using Hardhat's verify plugin:

```
npx hardhat verify --network zetachain CONTRACT_ADDRESS CONSTRUCTOR_ARG1 CONSTRUCTOR_ARG2
```

This works on networks like Ethereum, BSC, and others that have Etherscan-compatible APIs. For ZetaChain's Blockscout, manual verification may be required.

### Using Prepared Files for Verification

For manual verification, you can use the following prepared files from this project:

- **ABI**: `ZetaChainUniversalToken_abi.json`
- **Flattened Source Code**: `flat` or `code-flatten` 

### Verification Troubleshooting

If you encounter issues during verification:

1. **Bytecode mismatch**: Ensure you're using exactly the same compiler version (0.8.26) and settings
2. **Contract not found**: Double-check the contract address
3. **Constructor arguments**: Make sure constructor arguments are correctly ABI-encoded
4. **Imports not resolving**: Use the flattened source code
5. **Library dependencies**: If your contract uses libraries, make sure they're already verified
6. **Compiler version**: If 0.8.26 fails, try 0.8.19 as a fallback since some verification services might not yet support 0.8.26

For more assistance, consult the documentation for each block explorer:
- [Etherscan Verification Guide](https://etherscan.io/verifyContract)
- [Blockscout Verification Guide](https://docs.blockscout.com/for-users/smart-contract-interaction/verifying-a-smart-contract)
