# Cross-Chain Transfer Fix

## Problem Identified

The cross-chain transfers between ZetaChain and other EVM chains were failing because of a mismatch in the ZetaChain ID:

1. The smart contracts (both `EVMUniversalToken.sol` and `ZetaChainUniversalToken.sol`) were using a hardcoded chain ID of `7000` for ZetaChain.
2. The backend configuration (`Config.ZETA_CHAIN_ID`) was correctly set to `7001` for ZetaChain testnet.
3. This mismatch prevented tokens from being properly transferred across chains.

## Solution Implemented

1. Updated the `ZETACHAIN_ID` constant in `EVMUniversalToken.sol` from `7000` to `7001`:
   ```solidity
   // ZetaChain-specific identifiers
   uint256 public constant ZETACHAIN_ID = 7001; // Updated from 7000
   ```

2. Updated the `ZETACHAIN_ID` constant in `ZetaChainUniversalToken.sol` from `7000` to `7001`:
   ```solidity
   // ZetaChain-specific identifiers
   uint256 public constant ZETACHAIN_ID = 7001; // Updated from 7000
   ```

3. Recompiled the smart contracts to generate the updated artifacts.

4. Created a test script (`tests/test_chain_id.py`) to verify that both contracts are using the correct ZetaChain ID.

## Verification

The test script verifies that:
- The source code in both contracts has the correct ZETACHAIN_ID value (7001).
- The contracts' ABIs expose the ZETACHAIN_ID as a function.

## Impact

This fix ensures that:
1. Cross-chain transfers will now work correctly between ZetaChain and other EVM chains.
2. The smart contract's constant matches the actual ZetaChain testnet ID.
3. The backend configuration and smart contracts are aligned, preventing inconsistent behavior.

## Redeployment Required

**Important**: For this fix to take effect, the contracts need to be redeployed. Existing deployed contracts with the old ZetaChain ID (7000) will still have issues with cross-chain transfers.

## Testing Instructions

1. Deploy new instances of the token contracts using the updated artifacts.
2. Verify that cross-chain transfers work correctly by:
   - Minting tokens on ZetaChain
   - Transferring tokens from ZetaChain to an EVM chain
   - Transferring tokens from an EVM chain to ZetaChain
   - Transferring tokens between different EVM chains via ZetaChain

## Additional Notes

- ZetaChain Testnet ID: `7001` (verified correct)
- Previous incorrect ID: `7000`
- Backend configuration in `Config.ZETA_CHAIN_ID` was already correct 