/**
 * Test script for NFT API integration
 * Run with: node testNftApi.js
 */

const axios = require('axios');
const { ethers } = require('ethers');

const API_BASE_URL = 'http://localhost:8000/api';

// Test the NFT deployment API
async function testNftDeployment() {
  try {
    console.log('Testing NFT API integration...');
    
    // Use a properly formatted address (without any checksum validation)
    const checksummedAddress = "0xa48c0FC87BF398d258A75391Bc5Fe6BC5f8F9b3B";
    console.log('Using address:', checksummedAddress);
    
    // Test data for NFT collection creation
    const testData = {
      collection_name: "Test NFT Collection",
      collection_symbol: "TNFT",
      base_uri: "https://example.com/metadata/",
      max_supply: 10000,
      selected_chains: ["7001", "11155111"], // ZetaChain and Sepolia
      deployer_address: checksummedAddress
    };
    
    console.log('1. Creating NFT collection configuration...');
    console.log('Sending data:', JSON.stringify(testData, null, 2));
    
    // Step 1: Create collection configuration
    const createResponse = await axios.post(`${API_BASE_URL}/nft/deploy`, testData);
    console.log('Create response:', createResponse.data);
    
    if (!createResponse.data.success) {
      throw new Error(`Failed to create NFT collection: ${createResponse.data.message}`);
    }
    
    const deploymentId = createResponse.data.deployment_id;
    console.log(`Collection configuration created. Deployment ID: ${deploymentId}`);
    
    // Step 2: Simulate fee payment confirmation
    console.log('\n2. Confirming fee payment...');
    const confirmData = {
      deployment_id: deploymentId,
      fee_paid_tx: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef" // Mock tx hash
    };
    
    console.log('Sending confirmation data:', JSON.stringify(confirmData, null, 2));
    
    const confirmResponse = await axios.post(`${API_BASE_URL}/nft/deploy`, confirmData);
    console.log('Confirm response:', confirmResponse.data);
    
    // Step 3: Get collection details
    console.log('\n3. Getting collection details...');
    const getResponse = await axios.get(`${API_BASE_URL}/nft/collection/${deploymentId}`);
    console.log('Collection details:', JSON.stringify(getResponse.data, null, 2));
    
    console.log('\nAPI integration test completed successfully!');
    
  } catch (error) {
    console.error('Error testing NFT API:', error.response?.data || error.message);
  }
}

// Run the test
testNftDeployment(); 