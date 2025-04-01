const { processDistributionsFile } = require('../src/utils/fileUpload');
const path = require('path');

/**
 * Process a CSV file from the command line
 */
async function processCsvFile() {
  try {
    // Get the CSV file path from command line arguments
    const args = process.argv.slice(2);
    if (args.length === 0) {
      console.error('Please provide a CSV file path');
      console.error('Usage: node processCsv.js <path/to/csv>');
      process.exit(1);
    }
    
    // Process the file
    const filePath = path.resolve(args[0]);
    console.log(`Processing CSV file: ${filePath}`);
    
    const result = await processDistributionsFile(filePath);
    
    // Format output for display
    console.log('\n=== Processing Results ===');
    console.log(`Total Rows: ${result.totalRows}`);
    console.log(`Valid Entries: ${result.validRows}`);
    console.log(`Invalid Entries: ${result.errors.length}`);
    
    if (result.distributions.length > 0) {
      console.log('\n=== Valid Distributions ===');
      result.distributions.forEach((dist, index) => {
        console.log(`\n[${index + 1}]`);
        console.log(`  Recipient: ${dist.recipient_address}`);
        console.log(`  Chain ID: ${dist.chain_id}`);
        console.log(`  Amount: ${dist.token_amount}`);
      });
    }
    
    if (result.errors.length > 0) {
      console.log('\n=== Invalid Entries ===');
      result.errors.forEach((error, index) => {
        console.log(`\n[${index + 1}]`);
        console.log(`  Row ${error.row}: ${error.error}`);
      });
    }
    
    console.log('\nProcessing completed successfully.');
  } catch (error) {
    console.error(`\nError processing CSV file: ${error.message}`);
    process.exit(1);
  }
}

// Run the function
processCsvFile(); 