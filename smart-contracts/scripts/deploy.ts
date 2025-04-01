import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Get the current chain ID
  const { chainId } = await ethers.provider.getNetwork();
  console.log("Current chain ID:", chainId);

  // Define common token parameters
  const tokenName = "Universal Token";
  const tokenSymbol = "UTKN";
  const tokenDecimals = 18;
  const initialSupply = ethers.parseUnits("1000000", tokenDecimals); // 1 million tokens

  // Deploy based on chain ID
  if (chainId === 7000n || chainId === 7001n) {
    // Deploy on ZetaChain (Mainnet or Testnet)
    const networkName = chainId === 7000n ? "ZetaChain Mainnet" : "ZetaChain Testnet";
    console.log(`Deploying ZetaChainUniversalToken on ${networkName}...`);
    
    const ZetaChainUniversalTokenFactory = await ethers.getContractFactory("ZetaChainUniversalToken");
    const zetaChainToken = await ZetaChainUniversalTokenFactory.deploy(
      tokenName,
      tokenSymbol,
      tokenDecimals,
      initialSupply,
      deployer.address
    );
    
    await zetaChainToken.waitForDeployment();
    console.log("ZetaChainUniversalToken deployed to:", await zetaChainToken.getAddress());

    // Print some info about the token
    console.log("Token details:");
    console.log("  Name:", await zetaChainToken.name());
    console.log("  Symbol:", await zetaChainToken.symbol());
    console.log("  Decimals:", await zetaChainToken.decimals());
    console.log("  Total Supply:", ethers.formatUnits(await zetaChainToken.totalSupply(), tokenDecimals));
    console.log("  Owner:", await zetaChainToken.owner());
  } else {
    // Deploy on EVM chain
    console.log("Deploying EVMUniversalToken...");
    
    const EVMUniversalTokenFactory = await ethers.getContractFactory("EVMUniversalToken");
    const evmToken = await EVMUniversalTokenFactory.deploy(
      tokenName,
      tokenSymbol,
      tokenDecimals,
      initialSupply,
      chainId,
      deployer.address
    );
    
    await evmToken.waitForDeployment();
    console.log("EVMUniversalToken deployed to:", await evmToken.getAddress());
    
    // Print some info about the token
    console.log("Token details:");
    console.log("  Name:", await evmToken.name());
    console.log("  Symbol:", await evmToken.symbol());
    console.log("  Decimals:", await evmToken.decimals());
    console.log("  Chain ID:", await evmToken.chainId());
    console.log("  Total Supply:", ethers.formatUnits(await evmToken.totalSupply(), tokenDecimals));
    console.log("  Owner:", await evmToken.owner());
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 