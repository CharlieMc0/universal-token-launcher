const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function debugBlockscoutAPI() {
  try {
    const walletAddress = '0x4f1684A28E33F42cdf50AB96e29a709e17249E63';
    console.log(`Testing Blockscout API for wallet: ${walletAddress}\n`);
    
    // Test different versions of the URL
    const urlVersions = [
      'https://zetachain-testnet.blockscout.com/v2/addresses/${walletAddress}/tokens',
      'https://zetachain-testnet.blockscout.com/api/v2/addresses/${walletAddress}/tokens',
      'https://zetachain-testnet.blockscout.com/api/addresses/${walletAddress}/tokens',
    ];
    
    for (const urlTemplate of urlVersions) {
      const apiUrl = urlTemplate.replace('${walletAddress}', walletAddress) + '?type=ERC-20%2CERC-721%2CERC-1155';
      
      console.log(`\n--- Testing URL: ${apiUrl} ---`);
      try {
        const response = await fetch(apiUrl);
        console.log(`Response status: ${response.status}`);
        
        if (response.status === 200) {
          const data = await response.json();
          if (data.items && Array.isArray(data.items)) {
            console.log(`✅ SUCCESS: Found ${data.items.length} tokens`);
            
            // Print first token for verification
            if (data.items.length > 0) {
              const firstToken = data.items[0];
              console.log(`Sample token: ${firstToken.token?.name || 'N/A'} (${firstToken.token?.symbol || 'N/A'})`);
              console.log(`Address: ${firstToken.token?.address || 'N/A'}`);
            }
          } else {
            console.log(`❌ ERROR: Response is 200 but no items found in response`);
            console.log('Response structure:', Object.keys(data));
          }
        } else {
          const text = await response.text();
          console.log(`❌ ERROR: Response is not 200 OK. Response text (truncated):`);
          console.log(text.substring(0, 200) + '...');
        }
      } catch (error) {
        console.log(`❌ ERROR: ${error.message}`);
      }
    }
    
    // Test our backend API
    console.log(`\n\n--- Testing our backend API ---`);
    const ourApiUrl = `http://localhost:8000/api/users/${walletAddress}/tokens`;
    console.log(`Making API request to: ${ourApiUrl}`);
    
    try {
      const ourResponse = await fetch(ourApiUrl);
      console.log(`Response status: ${ourResponse.status}`);
      
      if (ourResponse.status === 200) {
        const data = await ourResponse.json();
        console.log(`Our API returned ${data.length} tokens`);
        
        // Print the response
        console.log(JSON.stringify(data, null, 2));
      } else {
        const text = await ourResponse.text();
        console.log(`Error response from our API: ${text}`);
      }
    } catch (error) {
      console.log(`Error testing our API: ${error.message}`);
    }
  } catch (error) {
    console.error('Error in debug script:', error);
  }
}

// Run the test
debugBlockscoutAPI().catch(console.error); 