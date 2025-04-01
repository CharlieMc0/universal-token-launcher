# Universal Token Launcher Backend

This backend service supports the Universal Token Launcher, which deploys Universal Token contracts on ZetaChain and other EVM chains.

## Important Implementation Details

### Universal Token Deployment

The contract deployment service has been updated to properly support ZetaChain's Universal Token standard. The main improvements include:

1. Different deployment logic for ZetaChain vs other EVM chains
2. Proper initialization of contracts with gateway addresses
3. Support for connection between contracts after deployment

### Critical Next Steps

Before this implementation can be used in production, the following steps must be completed:

1. **Compile and obtain the correct ABIs and bytecode**:
   ```bash
   git clone https://github.com/zeta-chain/standard-contracts.git
   cd standard-contracts
   yarn install
   npx hardhat compile
   ```

2. **Update the bytecode constants**:
   - Extract the ZetaChain Universal Token bytecode and ABI:
     - Bytecode: `artifacts/contracts/token/contracts/example/ZetaChainUniversalToken.sol/ZetaChainUniversalToken.json`
     - ABI: `artifacts/contracts/token/contracts/example/ZetaChainUniversalToken.sol/ZetaChainUniversalToken.json`
   
   - Extract the EVM Universal Token bytecode and ABI:
     - Bytecode: `artifacts/contracts/token/contracts/example/EVMUniversalToken.sol/EVMUniversalToken.json`
     - ABI: `artifacts/contracts/token/contracts/example/EVMUniversalToken.sol/EVMUniversalToken.json`

3. **Update the gateway addresses and other configuration**:
   - Update the gateway addresses in `contractService.js` for all supported chains
   - Update the Uniswap Router address for ZetaChain
   - Configure the gas limits for cross-chain transfers

4. **Implement proper UUPS proxy deployment**:
   - The current implementation simulates the deployment but should use a proper UUPS proxy pattern
   - Consider using OpenZeppelin's ERC1967Proxy for actual deployment

## Testing Deployments

After completing the implementation, you can test using:

```bash
node src/tests/deployToken.js
```

## Understanding Universal Tokens

Universal Tokens require:
1. A hub contract on ZetaChain
2. Connected contracts on other EVM chains
3. Proper configuration of gateways for cross-chain messaging
4. Connection between contracts via `setConnectedContract` and `setUniversalToken` calls

For complete documentation on Universal Tokens, see:
- [ZetaChain Universal Token Documentation](https://www.zetachain.com/docs/developers/standards/token/)
- [Universal NFT Deployment Reference](https://www.zetachain.com/docs/developers/standards/nft/#deployment) 