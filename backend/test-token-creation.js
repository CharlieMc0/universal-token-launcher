// Using fetch from node 18+ native fetch API
const { default: fetch } = require('node-fetch');

async function testTokenCreation() {
  try {
    console.log('Testing token creation API...');
    const response = await fetch('http://localhost:8000/api/tokens', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Wallet-Address': '0x04dA1034E7d84c004092671bBcEb6B1c8DCda7AE'  // Use the test wallet address from .env
      },
      body: JSON.stringify({
        tokenName: 'Test Token',
        tokenSymbol: 'TEST',
        decimals: 18,
        totalSupply: '1000000',
        selectedChains: ['1', '137'],  // Ethereum and Polygon
        distributions: [
          {
            recipientAddress: '0x04dA1034E7d84c004092671bBcEb6B1c8DCda7AE',
            chainId: '1',
            tokenAmount: '500000'
          }
        ]
      })
    });
    
    const data = await response.json();
    console.log('Response status:', response.status);
    console.log('Response data:', data);
    
    if (response.status === 201) {
      console.log('✅ Token creation successful!');
    } else {
      console.log('❌ Token creation failed.');
    }
  } catch (error) {
    console.error('Error testing token creation:', error);
  }
}

testTokenCreation(); 