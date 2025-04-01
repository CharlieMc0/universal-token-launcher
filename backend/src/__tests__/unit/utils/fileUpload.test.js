const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');

// Define stream creation functions
function createValidStream() {
  const stream = new Readable({
    read() {} // Implement read method to avoid warning
  });
  stream.push('recipient_address,chain_id,token_amount\n');
  stream.push('0x4f1684A28E33F42cdf50AB96e29a709e17249E63,7001,100\n');
  stream.push('0x5678901234567890123456789012345678901234,11155111,50\n');
  stream.push(null);
  return stream;
}

function createMissingColumnsStream() {
  const stream = new Readable({
    read() {} // Implement read method to avoid warning
  });
  stream.push('invalid_column,chain_id\n'); // Missing token_amount
  stream.push('0x4f1684A28E33F42cdf50AB96e29a709e17249E63,7001\n');
  stream.push(null);
  return stream;
}

function createInvalidAddressStream() {
  const stream = new Readable({
    read() {} // Implement read method to avoid warning
  });
  stream.push('recipient_address,chain_id,token_amount\n');
  stream.push('invalid-address,7001,100\n'); // Invalid Ethereum address
  stream.push(null);
  return stream;
}

function createInvalidChainStream() {
  const stream = new Readable({
    read() {} // Implement read method to avoid warning
  });
  stream.push('recipient_address,chain_id,token_amount\n');
  stream.push('0x4f1684A28E33F42cdf50AB96e29a709e17249E63,invalid,100\n'); // Invalid chain ID
  stream.push('0x5678901234567890123456789012345678901234,11155111,50\n'); // Valid row
  stream.push(null);
  return stream;
}

function createInvalidAmountStream() {
  const stream = new Readable({
    read() {} // Implement read method to avoid warning
  });
  stream.push('recipient_address,chain_id,token_amount\n');
  stream.push('0x4f1684A28E33F42cdf50AB96e29a709e17249E63,7001,invalid\n'); // Invalid token amount
  stream.push('0x5678901234567890123456789012345678901234,11155111,50\n'); // Valid row
  stream.push(null);
  return stream;
}

// Export the Mock CSV Parser functionality for other tests to use
class MockCSVParser {
  constructor() {
    // Return a factory function
    return function(source) {
      // Import Transform so it's in scope
      const { Transform } = require('stream');
      
      // Return a pass-through that transforms the CSV into JSON
      const transformer = new Transform({
        objectMode: true,
        transform(chunk, encoding, callback) {
          const lines = chunk.toString().split('\n');
          if (lines.length > 1) {
            const headers = lines[0].split(',');
            
            for (let i = 1; i < lines.length; i++) {
              if (lines[i].trim()) {
                const values = lines[i].split(',');
                const obj = {};
                headers.forEach((header, j) => {
                  obj[header] = values[j];
                });
                this.push(obj);
              }
            }
          }
          callback();
        }
      });
      
      source.pipe(transformer);
      return transformer;
    };
  }
}

// Export for reuse in other tests
module.exports.MockCSVParser = MockCSVParser;

// Mock dependencies before importing the actual module
// Mock multer
jest.mock('multer', () => ({
  diskStorage: jest.fn().mockReturnValue({}),
  single: jest.fn().mockReturnValue(() => {}),
  fields: jest.fn().mockReturnValue(() => {})
}));

// Mock ethers
jest.mock('ethers', () => ({
  isAddress: jest.fn().mockImplementation((address) => {
    return address && address.startsWith('0x') && address.length === 42;
  }),
  getAddress: jest.fn().mockImplementation((address) => {
    if (!address || !address.startsWith('0x') || address.length !== 42) {
      throw new Error('Invalid address');
    }
    return address;
  })
}));

// Mock csv-parser to avoid scope issues
jest.mock('csv-parser', () => {
  return jest.fn().mockImplementation(() => {
    // Use require within the factory to avoid scope issues
    const { Transform } = require('stream');
    
    // Create a transform stream that outputs parsed records
    return new Transform({
      objectMode: true,
      transform(chunk, encoding, callback) {
        const data = chunk.toString();
        
        // Basic CSV parsing
        if (data.includes('recipient_address,chain_id,token_amount')) {
          this.push({
            recipient_address: '0x4f1684A28E33F42cdf50AB96e29a709e17249E63',
            chain_id: '7001',
            token_amount: '100'
          });
          
          // Add another row for multi-row tests
          if (data.includes('11155111')) {
            this.push({
              recipient_address: '0x5678901234567890123456789012345678901234',
              chain_id: '11155111',
              token_amount: '50'
            });
          }
        } else if (data.includes('invalid-address')) {
          this.push({
            recipient_address: 'invalid-address',
            chain_id: '7001',
            token_amount: '100'
          });
        } else if (data.includes('invalid,')) {
          this.push({
            invalid_column: 'value',
            chain_id: '7001'
          });
        }
        
        callback();
      }
    });
  });
});

// Mock fs module
jest.mock('fs', () => {
  const originalModule = jest.requireActual('fs');
  
  return {
    ...originalModule,
    existsSync: jest.fn().mockReturnValue(true),
    createReadStream: jest.fn().mockImplementation((path) => {
      // Create a stream source that can be piped through our CSV parser
      const { Readable } = require('stream');
      const stream = new Readable();
      
      // Override _read method (needed for Readable)
      stream._read = () => {};
      
      // Simulate different content based on path
      if (path.includes('missing')) {
        stream.push('invalid_column,chain_id\n');
        stream.push('0x4f1684A28E33F42cdf50AB96e29a709e17249E63,7001\n');
      } else if (path.includes('invalid')) {
        stream.push('recipient_address,chain_id,token_amount\n');
        stream.push('invalid-address,7001,100\n');
      } else if (path.includes('empty')) {
        // Empty file
      } else {
        // Default valid CSV
        stream.push('recipient_address,chain_id,token_amount\n');
        stream.push('0x4f1684A28E33F42cdf50AB96e29a709e17249E63,7001,100\n');
        stream.push('0x5678901234567890123456789012345678901234,11155111,50\n');
      }
      
      // End the stream
      stream.push(null);
      
      return stream;
    })
  };
});

// Import the module to be tested after all mocks are setup
const fileUploadModule = require('../../../utils/fileUpload');

describe('fileUpload Utils', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    
    // Default to a successful file existence check
    fs.existsSync.mockReturnValue(true);
  });

  describe('processDistributionsFile', () => {
    it('should process a valid CSV file correctly', async () => {
      // Set up mock for valid stream
      fs.createReadStream.mockReturnValueOnce(createValidStream());
      
      // Call the function
      const result = await fileUploadModule.processDistributionsFile('/path/to/mock/file.csv');
      
      // Check the result structure to match the actual implementation
      expect(result).toBeDefined();
      expect(result).toHaveProperty('distributions');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('totalRows');
      expect(result).toHaveProperty('validRows');
      
      // Check distributions
      expect(result.distributions).toBeInstanceOf(Array);
      expect(result.validRows).toBeGreaterThan(0);
      
      // Check that fs.createReadStream was called with the correct path
      expect(fs.createReadStream).toHaveBeenCalledWith('/path/to/mock/file.csv');
    });
    
    it('should handle file not found error', async () => {
      // Mock file not found
      fs.existsSync.mockReturnValueOnce(false);
      
      // Call the method and expect it to throw
      await expect(
        fileUploadModule.processDistributionsFile('/nonexistent/file.csv')
      ).rejects.toThrow('File not found: /nonexistent/file.csv');
    });
    
    it('should handle stream errors', async () => {
      // Create a stream that will emit an error
      const errorStream = new Readable({
        read() {} // Implement read method to avoid warning
      });
      
      // Mock createReadStream to return our error stream
      fs.createReadStream.mockReturnValueOnce(errorStream);
      
      // Setup the promise but don't await it yet
      const processPromise = fileUploadModule.processDistributionsFile('/path/to/mock/file.csv');
      
      // Emit the error in the next tick
      process.nextTick(() => {
        errorStream.emit('error', new Error('Error parsing CSV'));
      });
      
      // Now await the promise and expect it to reject
      await expect(processPromise).rejects.toThrow(/Error parsing CSV/);
    });
    
    it('should validate CSV format', async () => {
      // Mock invalid CSV (missing required columns)
      fs.createReadStream.mockReturnValueOnce(createMissingColumnsStream());
      
      // Call the method and expect it to throw for missing columns
      await expect(
        fileUploadModule.processDistributionsFile('/path/to/mock/file.csv')
      ).rejects.toThrow(/missing required columns/);
    });
    
    it('should validate recipient address format', async () => {
      // Mock invalid recipient address
      fs.createReadStream.mockReturnValueOnce(createInvalidAddressStream());
      
      // Call the method
      const result = await fileUploadModule.processDistributionsFile('/path/to/mock/file.csv');
      
      // Since this row should be invalid, check that it's not in the distributions
      expect(result.distributions.length).toBe(0);
      expect(result.errors.length).toBeGreaterThan(0);
    });
    
    it('should skip rows with invalid chain IDs', async () => {
      // Mock invalid chain ID
      fs.createReadStream.mockReturnValueOnce(createInvalidChainStream());
      
      // Call the method
      const result = await fileUploadModule.processDistributionsFile('/path/to/mock/file.csv');
      
      // Should include the valid row and skip the invalid one
      expect(result.distributions.length).toBe(1);
      expect(result.distributions[0].chain_id).toBe('11155111');
      expect(result.errors.length).toBe(1);
    });
    
    it('should skip rows with invalid token amounts', async () => {
      // Mock invalid token amount
      fs.createReadStream.mockReturnValueOnce(createInvalidAmountStream());
      
      // Call the method
      const result = await fileUploadModule.processDistributionsFile('/path/to/mock/file.csv');
      
      // Should include the valid row and skip the invalid one
      expect(result.distributions.length).toBe(1);
      expect(result.distributions[0].token_amount).toBe('50');
      expect(result.errors.length).toBe(1);
    });
  });
}); 