const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');

// Reusable transform implementation
class CSVTransformer {
  constructor() {
    const { Transform } = require('stream');
    const transformer = new Transform({
      objectMode: true,
      transform(chunk, encoding, callback) {
        // Simple CSV parsing for test purposes
        const lines = chunk.toString().split('\n');
        if (lines.length > 0) {
          const headers = lines[0].trim().split(',');
          
          for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim()) {
              const values = lines[i].trim().split(',');
              const row = {};
              
              // Map values to header names
              headers.forEach((header, index) => {
                row[header] = values[index];
              });
              
              this.push(row);
            }
          }
        }
        callback();
      }
    });
    return transformer;
  }
}

// Mock ethers before importing any modules
jest.mock('ethers', () => ({
  isAddress: jest.fn().mockImplementation((address) => {
    // Simple validation for test purposes
    return address && address.startsWith('0x') && address.length === 42;
  }),
  getAddress: jest.fn().mockImplementation((address) => {
    // Mock checksum address formatting
    if (!address || !address.startsWith('0x') || address.length !== 42) {
      throw new Error('Invalid address');
    }
    // Return a simple checksum formatted version
    return address.toLowerCase();
  })
}));

jest.mock('multer', () => ({
  diskStorage: jest.fn(),
  single: jest.fn(),
  fields: jest.fn()
}));

// Mock csv-parser - use a factory function that doesn't access external variables
jest.mock('csv-parser', () => {
  return jest.fn().mockImplementation(() => {
    // Use require inside the factory to avoid scope issues
    const { Transform } = require('stream');
    
    return new Transform({
      objectMode: true,
      transform(chunk, encoding, callback) {
        // Mock CSV parsing
        const content = chunk.toString();
        const lines = content.split('\n');
        
        if (lines.length > 0) {
          const headers = lines[0].trim().split(',');
          
          // Generate mocked records
          if (content.includes('recipient_address,chain_id,token_amount')) {
            // Valid CSV format for valid.csv
            callback(null, {
              recipient_address: '0x4f1684a28e33f42cdf50ab96e29a709e17249e63',
              chain_id: '7001',
              token_amount: '100'
            });
            
            // Add another record to simulate multiple rows
            this.push({
              recipient_address: '0x3a4cc340a87c38d36e469cb8f8eb37fba0e3daf3',
              chain_id: '11155111',
              token_amount: '50'
            });
          } else if (content.includes('invalid-address')) {
            // Invalid address CSV for invalid.csv
            callback(null, {
              recipient_address: 'invalid-address',
              chain_id: '7001',
              token_amount: '100'
            });
          } else if (content.includes('address,chain,amount')) {
            // Missing columns CSV for missing_columns.csv
            callback(null, {
              address: '0x4f1684a28e33f42cdf50ab96e29a709e17249e63',
              chain: '7001',
              amount: '100'
            });
          } else {
            // Empty or unrecognized content
            callback(null, null);
          }
        } else {
          // Empty file
          callback(null, null);
        }
      }
    });
  });
});

// Create test stream factory functions
function createValidStream() {
  const stream = new Readable({
    read() {} // Required implementation
  });
  stream.push('recipient_address,chain_id,token_amount\n');
  stream.push('0x4f1684a28e33f42cdf50ab96e29a709e17249e63,7001,100\n');
  stream.push('0x3a4cc340a87c38d36e469cb8f8eb37fba0e3daf3,11155111,50\n');
  stream.push(null); // End the stream
  return stream;
}

function createInvalidAddressStream() {
  const stream = new Readable({
    read() {} // Required implementation
  });
  stream.push('recipient_address,chain_id,token_amount\n');
  stream.push('invalid-address,7001,100\n');
  stream.push(null);
  return stream;
}

function createMissingColumnsStream() {
  const stream = new Readable({
    read() {} // Required implementation
  });
  stream.push('address,chain,amount\n');
  stream.push('0x4f1684a28e33f42cdf50ab96e29a709e17249e63,7001,100\n');
  stream.push(null);
  return stream;
}

function createEmptyStream() {
  const stream = new Readable({
    read() {} // Required implementation
  });
  stream.push(null);
  return stream;
}

// Now import the file under test
const fileUploadUtils = require('../../../utils/fileUpload');

// Export the transformer class to be used in mocks
module.exports.CSVTransformer = CSVTransformer;

// Mock file system operations
jest.spyOn(fs, 'existsSync').mockImplementation((filePath) => {
  return filePath.includes('valid.csv') || 
         filePath.includes('invalid.csv') || 
         filePath.includes('empty.csv') || 
         filePath.includes('missing_columns.csv');
});

jest.spyOn(fs, 'createReadStream').mockImplementation((filePath) => {
  if (filePath.includes('valid.csv')) {
    return createValidStream();
  } else if (filePath.includes('invalid.csv')) {
    return createInvalidAddressStream();
  } else if (filePath.includes('missing_columns.csv')) {
    return createMissingColumnsStream();
  } else if (filePath.includes('empty.csv')) {
    return createEmptyStream();
  }
  return createValidStream(); // Default
});

// Mock other file system operations we don't need to really perform
jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
jest.spyOn(fs, 'unlinkSync').mockImplementation(() => {});
jest.spyOn(fs, 'mkdirSync').mockImplementation(() => {});
jest.spyOn(fs, 'rmdirSync').mockImplementation(() => {});

// After mocking all dependencies, we can now test our functions
describe('CSV Processing Utilities', () => {
  // Setup test paths
  const testDir = path.join(__dirname, '..', '..', 'temp');
  const validCsvPath = path.join(testDir, 'valid.csv');
  const invalidCsvPath = path.join(testDir, 'invalid.csv');
  const emptyCsvPath = path.join(testDir, 'empty.csv');
  const missingColumnsCsvPath = path.join(testDir, 'missing_columns.csv');
  
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
  });
  
  describe('validateCSV', () => {
    const { validateCSV } = fileUploadUtils;
    
    it('should validate correctly formatted CSV records', () => {
      const records = [
        {
          recipient_address: '0x4f1684A28E33F42cdf50AB96e29a709e17249E63',
          chain_id: '7001',
          token_amount: '100'
        }
      ];
      
      const result = validateCSV(records);
      expect(result.isValid).toBe(true);
    });
    
    it('should reject empty records', () => {
      const result = validateCSV([]);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('empty');
    });
    
    it('should reject records missing required columns', () => {
      const records = [
        {
          recipient: '0x4f1684A28E33F42cdf50AB96e29a709e17249E63', // Wrong field name
          chain: '7001', // Wrong field name
          amount: '100' // Wrong field name
        }
      ];
      
      const result = validateCSV(records);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('missing required columns');
    });
  });
  
  describe('validateDistributionEntry', () => {
    const { validateDistributionEntry } = fileUploadUtils;
    
    it('should validate entry with lowercase address', () => {
      const entry = {
        recipient_address: '0x4f1684a28e33f42cdf50ab96e29a709e17249e63',
        chain_id: '7001',
        token_amount: '100'
      };
      
      const result = validateDistributionEntry(entry);
      expect(result.isValid).toBe(true);
    });
    
    it('should validate entry with chain ID as a string', () => {
      const entry = {
        recipient_address: '0x4f1684a28e33f42cdf50ab96e29a709e17249e63',
        chain_id: '7001',  // String representation is valid
        token_amount: '100'
      };
      
      const result = validateDistributionEntry(entry);
      expect(result.isValid).toBe(true);
    });
    
    it('should validate entry with token amount as a string', () => {
      const entry = {
        recipient_address: '0x4f1684a28e33f42cdf50ab96e29a709e17249e63',
        chain_id: '7001',
        token_amount: '100.5'  // Decimal string is valid
      };
      
      const result = validateDistributionEntry(entry);
      expect(result.isValid).toBe(true);
    });
    
    it('should reject missing recipient address', () => {
      const entry = {
        recipient_address: '',
        chain_id: '7001',
        token_amount: '100'
      };
      
      const result = validateDistributionEntry(entry);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Missing recipient address');
    });
    
    it('should reject invalid recipient address format', () => {
      const entry = {
        recipient_address: 'not-an-ethereum-address',
        chain_id: '7001',
        token_amount: '100'
      };
      
      const result = validateDistributionEntry(entry);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid recipient address');
    });
    
    it('should reject invalid chain ID', () => {
      const entry = {
        recipient_address: '0x4f1684a28e33f42cdf50ab96e29a709e17249e63',
        chain_id: 'not-a-number',
        token_amount: '100'
      };
      
      const result = validateDistributionEntry(entry);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid chain ID');
    });
    
    it('should reject invalid token amount', () => {
      const entry = {
        recipient_address: '0x4f1684a28e33f42cdf50ab96e29a709e17249e63',
        chain_id: '7001',
        token_amount: 'not-a-number'
      };
      
      const result = validateDistributionEntry(entry);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid token amount');
    });
    
    it('should reject negative token amount', () => {
      const entry = {
        recipient_address: '0x4f1684a28e33f42cdf50ab96e29a709e17249e63',
        chain_id: '7001',
        token_amount: '-100'
      };
      
      const result = validateDistributionEntry(entry);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid token amount');
    });
    
    it('should reject zero token amount', () => {
      const entry = {
        recipient_address: '0x4f1684a28e33f42cdf50ab96e29a709e17249e63',
        chain_id: '7001',
        token_amount: '0'
      };
      
      const result = validateDistributionEntry(entry);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid token amount');
    });
  });
  
  describe('processDistributionsFile', () => {
    it('should process a valid CSV file correctly', async () => {
      const result = await fileUploadUtils.processDistributionsFile(validCsvPath);
      
      expect(result).toBeDefined();
      expect(result.distributions).toBeInstanceOf(Array);
      expect(result.distributions.length).toBeGreaterThan(0);
      
      expect(fs.createReadStream).toHaveBeenCalledWith(validCsvPath);
    });
    
    it('should handle file not found errors', async () => {
      fs.existsSync.mockReturnValueOnce(false);
      
      await expect(fileUploadUtils.processDistributionsFile('/nonexistent/file.csv'))
        .rejects.toThrow('File not found');
    });
    
    it('should validate CSV format and throw on missing columns', async () => {
      // This will use the missing_columns.csv mock
      await expect(fileUploadUtils.processDistributionsFile(missingColumnsCsvPath))
        .rejects.toThrow('missing required columns');
    });
    
    it('should filter out invalid entries but continue processing', async () => {
      // Mock our implementation for invalid addresses
      fs.createReadStream.mockImplementationOnce(() => {
        const stream = new Readable({
          read() {}
        });
        stream.push('recipient_address,chain_id,token_amount\n');
        stream.push('invalid-address,7001,100\n');
        stream.push('0x4f1684a28e33f42cdf50ab96e29a709e17249e63,7001,200\n');
        stream.push(null);
        return stream;
      });
      
      const result = await fileUploadUtils.processDistributionsFile(invalidCsvPath);
      
      // Should contain only the valid entries
      expect(result).toBeDefined();
      expect(result.distributions).toBeInstanceOf(Array);
      expect(result.validRows).toBe(1);
      expect(result.errors.length).toBe(1);
      
      expect(fs.createReadStream).toHaveBeenCalledWith(invalidCsvPath);
    });
    
    it('should handle empty CSV files appropriately', async () => {
      await expect(fileUploadUtils.processDistributionsFile(emptyCsvPath))
        .rejects.toThrow('empty');
    });
  });
}); 