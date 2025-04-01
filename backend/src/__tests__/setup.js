// Set up environment variables for testing
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://postgres:password@localhost:5432/utl_test';
process.env.ZETA_CHAIN_RPC_URL = 'https://zetachain-athens.g.allthatnode.com/archive/evm';
process.env.UNIVERSAL_TOKEN_SERVICE_WALLET = '0x4f1684A28E33F42cdf50AB96e29a709e17249E63';
process.env.FIXED_ZETA_FEE = '1';
process.env.DEPLOYER_PRIVATE_KEY = '0x0000000000000000000000000000000000000000000000000000000000000001';
process.env.TEST_WALLET_ADDRESS = '0x4f1684A28E33F42cdf50AB96e29a709e17249E63';
process.env.DEBUG = 'true';

// Global test timeout
jest.setTimeout(30000);

// Mock console.error to avoid polluting test output
const originalConsoleError = console.error;
console.error = jest.fn();

// Cleanup after all tests
afterAll(() => {
  console.error = originalConsoleError;
});

// Add global mocks
jest.mock('sequelize', () => {
  const mSequelize = {
    authenticate: jest.fn().mockResolvedValue(),
    define: jest.fn().mockReturnValue({
      findAll: jest.fn(),
      findOne: jest.fn(),
      findByPk: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      belongsTo: jest.fn(),
      hasMany: jest.fn()
    }),
    sync: jest.fn().mockResolvedValue(),
    close: jest.fn().mockResolvedValue(),
    Transaction: {
      ISOLATION_LEVELS: {
        READ_COMMITTED: 'READ_COMMITTED'
      }
    }
  };
  
  const actualSequelize = jest.requireActual('sequelize');
  
  return {
    ...actualSequelize,
    Sequelize: jest.fn(() => mSequelize),
    DataTypes: {
      INTEGER: 'INTEGER',
      STRING: 'STRING',
      TEXT: 'TEXT',
      DECIMAL: 'DECIMAL',
      BOOLEAN: 'BOOLEAN',
      JSONB: 'JSONB',
      DATE: 'DATE'
    }
  };
});

// Mock ethers.js to avoid real blockchain interactions
jest.mock('ethers', () => {
  // Mock contract factory
  const mockContract = {
    getAddress: jest.fn().mockReturnValue('0x1234567890123456789012345678901234567890'),
    target: '0x1234567890123456789012345678901234567890',
    deploymentTransaction: jest.fn().mockReturnValue({
      wait: jest.fn().mockResolvedValue({
        hash: '0x1234567890123456789012345678901234567890123456789012345678901234'
      }),
      hash: '0x1234567890123456789012345678901234567890123456789012345678901234'
    }),
    setConnectedContract: jest.fn().mockResolvedValue({
      wait: jest.fn().mockResolvedValue({})
    }),
    setZetaChainContract: jest.fn().mockResolvedValue({
      wait: jest.fn().mockResolvedValue({})
    })
  };
  
  const mockFactory = {
    deploy: jest.fn().mockResolvedValue(mockContract)
  };
  
  return {
    JsonRpcProvider: jest.fn().mockImplementation(() => ({
      getNetwork: jest.fn().mockResolvedValue({ chainId: 7001n }),
      getTransaction: jest.fn().mockResolvedValue({
        to: '0x4f1684A28E33F42cdf50AB96e29a709e17249E63',
        value: BigInt('1000000000000000000') // 1 ETH
      }),
      getTransactionReceipt: jest.fn().mockResolvedValue({
        status: 1,
        hash: '0x1234567890123456789012345678901234567890123456789012345678901234'
      })
    })),
    Wallet: jest.fn().mockImplementation(() => ({
      provider: {},
      address: '0x4f1684A28E33F42cdf50AB96e29a709e17249E63'
    })),
    ContractFactory: jest.fn().mockReturnValue(mockFactory),
    Contract: jest.fn().mockReturnValue(mockContract),
    parseUnits: jest.fn().mockImplementation((value, decimals) => BigInt(value) * BigInt(10) ** BigInt(decimals)),
    parseEther: jest.fn().mockImplementation((value) => BigInt(value) * BigInt(10) ** BigInt(18))
  };
});

// Mock fs module to avoid file system operations
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn(),
  createReadStream: jest.fn().mockImplementation(() => {
    const { Readable } = require('stream');
    const stream = new Readable();
    stream.push('recipient_address,chain_id,token_amount\n');
    stream.push('0x4f1684A28E33F42cdf50AB96e29a709e17249E63,7001,100\n');
    stream.push(null);
    return stream;
  }),
  writeFileSync: jest.fn(),
  readFileSync: jest.fn().mockImplementation(() => JSON.stringify({
    abi: [],
    bytecode: '0x1234'
  }))
}));

// Mock multer
jest.mock('multer', () => {
  return jest.fn().mockImplementation(() => ({
    single: jest.fn().mockReturnValue((req, res, next) => {
      req.file = {
        filename: 'test.jpg',
        path: '/tmp/test.jpg'
      };
      next();
    }),
    array: jest.fn().mockReturnValue((req, res, next) => {
      req.files = [{
        filename: 'test.jpg',
        path: '/tmp/test.jpg'
      }];
      next();
    })
  }));
});

describe('Test Setup', () => {
  it('should have Jest running', () => {
    expect(true).toBe(true);
  });
}); 