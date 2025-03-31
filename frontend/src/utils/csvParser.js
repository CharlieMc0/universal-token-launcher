/**
 * CSV Parser for token distribution lists
 * Handles parsing and validation of uploaded CSV files
 */

/**
 * Checks if the provided address is a valid Ethereum address
 * @param {string} address - The address to validate
 * @returns {boolean} Whether the address is valid
 */
export const isValidAddress = (address) => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

/**
 * Parses a CSV file for token distribution
 * @param {File} file - CSV file to parse
 * @returns {Promise<{ data: Array, errors: Array, isValid: boolean }>} Parsed data and validation results
 */
export const parseDistributionCSV = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const csvContent = event.target.result;
        const lines = csvContent.split('\n');
        const results = {
          data: [],
          errors: [],
          isValid: true,
          totalEntries: 0,
          validEntries: 0
        };
        
        // Check max entries
        const MAX_ENTRIES = 100;
        if (lines.length > MAX_ENTRIES) {
          results.errors.push(`CSV contains more than ${MAX_ENTRIES} entries. Please limit to ${MAX_ENTRIES} entries.`);
          results.isValid = false;
        }
        
        // Process each line
        lines.forEach((line, lineIndex) => {
          const trimmedLine = line.trim();
          
          // Skip empty lines
          if (!trimmedLine) return;
          
          results.totalEntries++;
          
          // Split by common delimiters (comma or semicolon)
          const parts = trimmedLine.split(/[,;]+/);
          
          // We expect at least address and amount
          if (parts.length < 2) {
            results.errors.push(`Line ${lineIndex + 1}: Invalid format. Expected "address,amount" or "address,chainId,amount"`);
            return;
          }
          
          // Extract and validate data
          const address = parts[0].trim();
          
          // For the initial version, we'll assume everything goes to ZetaChain Athens
          // Later this can be extended to support multiple chains
          let chainId = '7001'; // Default to ZetaChain Athens Testnet
          let amount;
          
          if (parts.length >= 3) {
            // format: address,chainId,amount
            chainId = parts[1].trim() || chainId;
            amount = parts[2].trim();
          } else {
            // format: address,amount
            amount = parts[1].trim();
          }
          
          // Validate address
          if (!isValidAddress(address)) {
            results.errors.push(`Line ${lineIndex + 1}: Invalid address "${address}"`);
            return;
          }
          
          // Validate amount
          const parsedAmount = parseFloat(amount);
          if (isNaN(parsedAmount) || parsedAmount <= 0) {
            results.errors.push(`Line ${lineIndex + 1}: Invalid amount "${amount}"`);
            return;
          }
          
          // Add valid entry
          results.data.push({
            recipient_address: address,
            chain_id: chainId,
            token_amount: amount
          });
          
          results.validEntries++;
        });
        
        // Final validation
        results.isValid = results.errors.length === 0 && results.validEntries > 0;
        
        resolve(results);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = (error) => {
      reject(error);
    };
    
    reader.readAsText(file);
  });
}; 