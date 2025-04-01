/**
 * Test script for contract verification
 * 
 * This script tests the contract verification service by verifying
 * an already deployed contract on a supported network.
 */

const verificationService = require('../services/VerificationService');
require('dotenv').config();

/**
 * Test verifying a contract on Blockscout (ZetaChain)
 */
async function testBlockscoutVerification() {
  try {
    // Replace with a valid ZetaChain contract address to test
    const chainId = '7001'; // ZetaChain Testnet
    const contractAddress = '0x0000000000000000000000000000000000000000'; // Replace with actual address
    
    console.log('Testing contract verification on ZetaChain (Blockscout)...');
    
    const result = await verificationService.verifyContract(
      chainId,
      contractAddress,
      'ZetaChainUniversalToken',
      {
        compilerVersion: '0.8.26',
        optimization: true,
        runs: 200
      }
    );
    
    console.log('Verification result:', result);
    return result;
  } catch (error) {
    console.error('Blockscout verification test failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Test verifying a contract on Etherscan (e.g., Sepolia)
 */
async function testEtherscanVerification() {
  try {
    // Replace with a valid Sepolia contract address to test
    const chainId = '11155111'; // Sepolia
    const contractAddress = '0x0000000000000000000000000000000000000000'; // Replace with actual address
    
    console.log('Testing contract verification on Sepolia (Etherscan)...');
    
    const result = await verificationService.verifyContract(
      chainId,
      contractAddress,
      'EVMUniversalToken',
      {
        compilerVersion: '0.8.26',
        optimization: true,
        runs: 200
      }
    );
    
    console.log('Verification result:', result);
    return result;
  } catch (error) {
    console.error('Etherscan verification test failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Run verification tests
 */
async function runTests() {
  try {
    // Run individual tests based on command-line arguments
    const args = process.argv.slice(2);
    
    if (args.includes('blockscout')) {
      await testBlockscoutVerification();
    } else if (args.includes('etherscan')) {
      await testEtherscanVerification();
    } else {
      // Run all tests by default
      console.log('Running all verification tests...');
      await testBlockscoutVerification();
      await testEtherscanVerification();
    }
  } catch (error) {
    console.error('Verification tests failed:', error.message);
  }
}

// Run the tests when this script is executed directly
if (require.main === module) {
  runTests();
}

module.exports = {
  testBlockscoutVerification,
  testEtherscanVerification,
  runTests
};

describe('Verification Service Tests', () => {
  it('should exist as a module', () => {
    expect(verificationService).toBeDefined();
  });
}); 