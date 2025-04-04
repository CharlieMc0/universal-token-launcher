# Contract Verification Fixes for Sepolia and Other EVM Networks

## Overview

This document outlines the changes made to fix contract verification issues on Sepolia and other non-ZetaChain networks.

### Problem Identified:

The contract verification was failing on Sepolia and other non-ZetaChain networks because:

1. API keys were not being properly retrieved from environment variables
2. Constructor arguments were not being encoded and included in verification requests
3. The compiler version handling needed updates for Solidity 0.8.26

### Changes Made:

1. **Chain Configuration API Key Handling:**
   - Updated `get_chain_config()` in `app/utils/chain_config.py` to check multiple environment variable formats for API keys
   - Added logic to prioritize chain-specific API keys (e.g., `SEPOLIA_API_KEY`) but fall back to generic keys (e.g., `ETHERSCAN_API_KEY`)
   - Added automatic API URL inference from explorer URLs for Etherscan-like services

2. **Constructor Argument Support:**
   - Added constructor arguments parameter to `verify_contract_submission()` in `app/utils/web3_helper.py`
   - Added code to encode constructor arguments properly for EVM contracts
   - Updated the `TokenVerifySchema` in `app/models/token.py` to include an optional `contract_args` field

3. **Compiler Version Handling Improvements:**
   - Updated `extract_compiler_version()` in `app/utils/web3_helper.py` to better handle newer Solidity versions like 0.8.26
   - Added proper commit hash mapping for version 0.8.26: `v0.8.26+commit.8a97fa7a`

4. **Verification Service Updates:**
   - Updated the `verify_contract()` method in `app/services/verification.py` to handle constructor arguments
   - Added special handling for EVM-specific constructor arguments

5. **API Route Enhancement:**
   - Updated the `/verify` endpoint in `app/routes/deployment.py` to extract token details from the database if needed for constructor arguments
   - Added auto-detection of constructor arguments for verification requests
   - **NEW**: Added automatic verification trigger in the deployment process for all successfully deployed contracts

### Testing Utilities Added:

1. **Sepolia Verification Test Script:**
   - Created `tests/test_sepolia_verification.py` to test verification on Sepolia directly
   - Added CLI arguments to specify contract address and owner address

2. **Verification Shell Script:**
   - Added `verify_sepolia.sh` for easy verification testing with proper environment setup
   - Usage: `./verify_sepolia.sh <contract_address> [owner_address]`

## How to Verify Contracts

### Automatic Verification (Default)

Contracts are now automatically verified during the deployment process. No additional steps are required.

### Manual Verification (If Needed)

If automatic verification fails or for contracts that were deployed before this update, you can trigger verification manually:

#### Method 1: Using the API Endpoint

```bash
curl -X POST http://localhost:8000/api/verify \
  -H "Content-Type: application/json" \
  -d '{
    "contract_address": "0x123...contract_address",
    "chain_id": "11155111",
    "contract_type": "evm",
    "contract_args": {
      "name": "Universal Token",
      "symbol": "UTVT",
      "decimals": 18,
      "supply": 0,
      "owner": "0x456...owner_address"
    }
  }'
```

#### Method 2: Using the Test Script

```bash
# Make sure API keys are set in .env
./verify_sepolia.sh 0x123...contract_address 0x456...owner_address
```

## Environment Variables

Ensure the following environment variables are set in your `.env` file:

```
# Required for verification
ETHERSCAN_API_KEY=your_api_key_here

# Optional chain-specific keys (will override the generic key for specific chains)
SEPOLIA_API_KEY=your_sepolia_specific_key
```

## Troubleshooting

If verification still fails:

1. Check the logs for specific error messages
2. Verify that your API keys are valid and have not exceeded rate limits
3. Confirm the contract was deployed with the expected constructor arguments
4. Look for verification JSON files that are created during the process for more details

## Next Steps

1. Monitor verification success rates on non-ZetaChain networks
2. Consider implementing a verification queue and retry mechanism for failed verifications
3. Add support for more complex constructor argument types 