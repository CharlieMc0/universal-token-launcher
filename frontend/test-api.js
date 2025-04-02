const axios = require('axios');

// Base URL
const API_BASE_URL = 'http://localhost:8000/api';

// Sample token data
const sampleData = {
  token_name: "Test Token",
  token_symbol: "TTK",
  decimals: 18,
  total_supply: "1000000000000000000000000",
  selected_chains: ["7001"],
  deployer_address: "0x4f1684A28E33F42cdf50AB96e29a709e17249E63",
  allocations: [
    {
      address: "0x4f1684A28E33F42cdf50AB96e29a709e17249E63",
      amount: "1000000000000000000000000"
    }
  ]
};

// Function to test the API
async function testAPI() {
  try {
    console.log('Testing API with sample data:');
    console.log(JSON.stringify(sampleData, null, 2));
    
    const response = await axios.post(`${API_BASE_URL}/deploy`, sampleData);
    console.log('API Response:', response.data);
  } catch (error) {
    console.error('API Error:');
    
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Response data:', error.response.data);
      
      // Check for validation errors
      if (error.response.status === 422 && error.response.data.detail) {
        console.error('\nValidation errors:');
        const details = error.response.data.detail;
        
        if (Array.isArray(details)) {
          details.forEach(detail => {
            console.error(`- ${detail.loc.join('.')}: ${detail.msg}`);
          });
        } else {
          console.error(`- ${details}`);
        }
      }
    } else {
      console.error(`Error: ${error.message}`);
    }
  }
}

// Run the test
testAPI(); 