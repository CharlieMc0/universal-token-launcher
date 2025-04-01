const { ethers } = require('ethers');

// Test addresses
const addresses = [
  '0x4f1684A28E33F42cdf50AB96e29a709e17249E63',
  '0x3a4Cc340A87C38d36e469CB8f8EB37Fba0e3daF3',
  '0xC065A224B93B35c675ddB1B57d7B551A78d9Af21',
  '0x781E82D5D49042bbE91D885fb92F1b89De4f3D24',
  // Invalid addresses for comparison
  '0x3a4Cc340A87C38d36e469CB8', // too short
  'invalid-address', // not hex
  '0x3A4cc340a87c38D36E469cb8F8eb37fBA0e3Daf3' // likely incorrect checksum
];

function testAddressValidation() {
  console.log('Testing Ethereum address validation with ethers v6\n');
  
  console.log(`ethers version: ${ethers.version}`);
  
  console.log('\nValidation results:');
  console.log('-------------------');
  
  addresses.forEach(address => {
    try {
      const formatted = ethers.getAddress(address);
      console.log(`✅ VALID: ${address} => ${formatted}`);
      
      // Check if checksummed version matches the original
      if (formatted !== address) {
        console.log(`   Note: Formatted address differs from original`);
      }
    } catch (error) {
      console.log(`❌ INVALID: ${address}`);
      console.log(`   Error: ${error.message}`);
    }
  });
}

testAddressValidation(); 