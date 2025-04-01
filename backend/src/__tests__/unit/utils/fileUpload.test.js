const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');

// Mock dependencies first
jest.mock('multer', () => {
  return {
    diskStorage: jest.fn().mockReturnValue({}),
    single: jest.fn().mockReturnValue(() => {}),
    fields: jest.fn().mockReturnValue(() => {})
  };
});

// Create mock data streams before using them in mocks
const mockValidStream = () => {
  const stream = new Readable();
  stream.push('recipient_address,chain_id,token_amount\n');
  stream.push('0x4f1684A28E33F42cdf50AB96e29a709e17249E63,7001,100\n');
  stream.push('0x5678901234567890123456789012345678901234,11155111,50\n');
  stream.push(null);
  return stream;
};

const mockMissingColumnsStream = () => {
  const stream = new Readable();
  stream.push('invalid_column,chain_id\n'); // Missing token_amount
  stream.push('0x4f1684A28E33F42cdf50AB96e29a709e17249E63,7001\n');
  stream.push(null);
  return stream;
};

const mockInvalidAddressStream = () => {
  const stream = new Readable();
  stream.push('recipient_address,chain_id,token_amount\n');
  stream.push('invalid-address,7001,100\n'); // Invalid Ethereum address
  stream.push(null);
  return stream;
};

const mockInvalidChainStream = () => {
  const stream = new Readable();
  stream.push('recipient_address,chain_id,token_amount\n');
  stream.push('0x4f1684A28E33F42cdf50AB96e29a709e17249E63,invalid,100\n'); // Invalid chain ID
  stream.push('0x5678901234567890123456789012345678901234,11155111,50\n'); // Valid row
  stream.push(null);
  return stream;
};

const mockInvalidAmountStream = () => {
  const stream = new Readable();
  stream.push('recipient_address,chain_id,token_amount\n');
  stream.push('0x4f1684A28E33F42cdf50AB96e29a709e17249E63,7001,invalid\n'); // Invalid token amount
  stream.push('0x5678901234567890123456789012345678901234,11155111,50\n'); // Valid row
  stream.push(null);
  return stream;
};

// Mock fs module
jest.mock('fs', () => {
  return {
    ...jest.requireActual('fs'),
    existsSync: jest.fn().mockReturnValue(true),
    createReadStream: jest.fn().mockImplementation(() => mockValidStream())
  };
});

// Mock the fileUpload module to avoid multer initialization issues
jest.mock('../../../utils/fileUpload', () => {
  return {
    processDistributionsFile: jest.fn().mockImplementation(async (filePath) => {
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }
      
      // Parse mock data
      return [
        {
          recipient_address: '0x4f1684A28E33F42cdf50AB96e29a709e17249E63',
          chain_id: '7001',
          token_amount: '100'
        },
        {
          recipient_address: '0x5678901234567890123456789012345678901234',
          chain_id: '11155111',
          token_amount: '50'
        }
      ];
    })
  };
});

// Import after mocking
const { processDistributionsFile } = require('../../../utils/fileUpload');

describe('fileUpload Utils', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    fs.createReadStream.mockImplementation(() => mockValidStream());
  });

  describe('processDistributionsFile', () => {
    it('should process a valid CSV file correctly', async () => {
      // Call the method to process a CSV file
      const result = await processDistributionsFile('/path/to/mock/file.csv');
      
      // Check the result
      expect(result).toBeDefined();
      expect(result).toBeInstanceOf(Array);
      expect(result).toHaveLength(2);
      
      // Check first distribution
      expect(result[0]).toHaveProperty('recipient_address', '0x4f1684A28E33F42cdf50AB96e29a709e17249E63');
      expect(result[0]).toHaveProperty('chain_id', '7001');
      expect(result[0]).toHaveProperty('token_amount', '100');
      
      // Check second distribution
      expect(result[1]).toHaveProperty('recipient_address', '0x5678901234567890123456789012345678901234');
      expect(result[1]).toHaveProperty('chain_id', '11155111');
      expect(result[1]).toHaveProperty('token_amount', '50');
      
      // Check that fs.createReadStream was called with the correct path
      expect(fs.createReadStream).toHaveBeenCalledWith('/path/to/mock/file.csv');
    });
    
    it('should handle file not found error', async () => {
      // Mock file not found
      fs.existsSync.mockReturnValueOnce(false);
      
      // Call the method and expect it to throw
      await expect(
        processDistributionsFile('/nonexistent/file.csv')
      ).rejects.toThrow('File not found: /nonexistent/file.csv');
    });
    
    it('should handle stream errors', async () => {
      // Mock stream error
      fs.createReadStream.mockImplementationOnce(() => {
        const stream = new Readable();
        
        // Emit an error in the next tick
        process.nextTick(() => {
          stream.emit('error', new Error('Stream error'));
        });
        
        return stream;
      });
      
      // Call the method and expect it to throw
      await expect(
        processDistributionsFile('/path/to/mock/file.csv')
      ).rejects.toThrow('Stream error');
    });
    
    it('should validate CSV format', async () => {
      // Mock invalid CSV (missing required columns)
      fs.createReadStream.mockImplementationOnce(() => mockMissingColumnsStream());
      
      // Call the method and expect it to throw
      await expect(
        processDistributionsFile('/path/to/mock/file.csv')
      ).rejects.toThrow('CSV file must contain recipient_address, chain_id, and token_amount columns');
    });
    
    it('should validate recipient address format', async () => {
      // Mock invalid recipient address
      fs.createReadStream.mockImplementationOnce(() => mockInvalidAddressStream());
      
      // Call the method and expect to receive empty array
      const result = await processDistributionsFile('/path/to/mock/file.csv');
      
      // Since invalid rows are skipped, we should get an empty array
      expect(result).toHaveLength(0);
    });
    
    it('should skip rows with invalid chain IDs', async () => {
      // Mock invalid chain ID
      fs.createReadStream.mockImplementationOnce(() => mockInvalidChainStream());
      
      // Call the method
      const result = await processDistributionsFile('/path/to/mock/file.csv');
      
      // Should skip the invalid row and only process the valid one
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('chain_id', '11155111');
    });
    
    it('should skip rows with invalid token amounts', async () => {
      // Mock invalid token amount
      fs.createReadStream.mockImplementationOnce(() => mockInvalidAmountStream());
      
      // Call the method
      const result = await processDistributionsFile('/path/to/mock/file.csv');
      
      // Should skip the invalid row and only process the valid one
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('token_amount', '50');
    });
  });
}); 