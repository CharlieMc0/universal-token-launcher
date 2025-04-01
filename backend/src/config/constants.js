require('dotenv').config();

module.exports = {
  // App settings
  APP_NAME: 'Universal Token Launcher',
  VERSION: '1.0.0',
  PORT: process.env.PORT || 8000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  DEBUG: process.env.DEBUG === 'true',
  
  // Auth settings
  JWT_SECRET: process.env.JWT_SECRET_KEY || 'your_jwt_secret_key',
  JWT_EXPIRES_IN: process.env.JWT_ACCESS_TOKEN_EXPIRE_MINUTES || 60, // minutes
  JWT_ALGORITHM: process.env.JWT_ALGORITHM || 'HS256',
  
  // Storage settings
  UPLOADS_DIR: 'uploads',
  ICON_DIR: 'uploads/icons',
  CSV_DIR: 'uploads/distributions',
  
  // Token Deployment settings
  UNIVERSAL_TOKEN_SERVICE_WALLET: process.env.UNIVERSAL_TOKEN_SERVICE_WALLET || '0x04dA1034E7d84c004092671bBcEb6B1c8DCda7AE',
  FIXED_ZETA_FEE: process.env.FIXED_ZETA_FEE || '1000000000000000000', // Default to 1 ZETA in Wei
  
  // Blockchain settings
  DEPLOYER_WALLET: process.env.DEPLOYER_WALLET || '0x4f1684A28E33F42cdf50AB96e29a709e17249E63',
  DEPLOYER_PRIVATE_KEY: process.env.DEPLOYER_PRIVATE_KEY,
  
  // Deployment status options
  DEPLOYMENT_STATUS: {
    PENDING: 'pending',
    PROCESSING: 'processing',
    COMPLETED: 'completed',
    FAILED: 'failed'
  },
  
  // Distribution status options
  DISTRIBUTION_STATUS: {
    PENDING: 'pending',
    PROCESSING: 'processing',
    COMPLETED: 'completed',
    FAILED: 'failed'
  }
}; 