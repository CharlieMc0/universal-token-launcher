/**
 * Test script to verify BlockScout API connectivity
 * Run with: node scripts/test-blockscout.js
 */

// Use dynamic import for node-fetch
async function testBlockscoutApi() {
  try {
    // Import node-fetch
    const { default: fetch } = await import('node-fetch');
    
    // Configuration
    const walletAddress = '0x04dA1034E7d84c004092671bBcEb6B1c8DCda7AE';
    const baseUrl = 'https://zetachain-testnet.blockscout.com';
    const apiUrl = `${baseUrl}/api/v2/addresses/${walletAddress}/tokens?type=ERC-20%2CERC-721%2CERC-1155`;
    
    console.log('Making request to:', apiUrl);
    
    // Make the API request
    const response = await fetch(apiUrl);
    console.log('Response status:', response.status);
    
    // Check if request was successful
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API error (${response.status}):`, errorText);
      return;
    }
    
    // Parse the JSON response
    const data = await response.json();
    
    // Log the structure of the response
    console.log('Response structure:', Object.keys(data));
    console.log('Number of tokens:', data.items ? data.items.length : 0);
    
    // Log details of the first few tokens
    if (data.items && data.items.length > 0) {
      console.log('\nFirst 3 tokens:');
      data.items.slice(0, 3).forEach((tokenData, index) => {
        console.log(`\nToken ${index + 1}:`);
        console.log(`- Address: ${tokenData.token.address}`);
        console.log(`- Name: ${tokenData.token.name}`);
        console.log(`- Symbol: ${tokenData.token.symbol}`);
        console.log(`- Value: ${tokenData.value}`);
      });
    } else {
      console.log('No tokens found for this address');
    }
  } catch (error) {
    console.error('Error testing BlockScout API:', error);
  }
}

// Run the test
testBlockscoutApi(); 