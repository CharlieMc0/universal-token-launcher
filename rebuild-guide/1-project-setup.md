# 1. Project Setup

This section covers the initial setup of the Universal Token Launcher backend project.

## Create Project Directory Structure

Start by creating the main project directory and initial folder structure:

```bash
# Create project directory
mkdir universal-token-launcher
cd universal-token-launcher
mkdir backend
cd backend

# Create essential subdirectories
mkdir -p src/{config,controllers,db,middleware,routes,services,utils,tests}
mkdir -p logs uploads
```

## Initialize Node.js Project

Initialize a new Node.js project:

```bash
# Initialize package.json
npm init -y
```

## Install Dependencies

Install the required dependencies:

```bash
# Core dependencies
npm install express sequelize pg pg-hstore ethers@6.x dotenv cors multer winston winston-daily-rotate-file helmet morgan jsonwebtoken

# Development dependencies
npm install --save-dev nodemon jest supertest @babel/preset-env babel-jest typescript ts-node @types/node @types/express
```

## TypeScript Configuration

Create a TypeScript configuration file (`tsconfig.json`):

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "**/*.test.ts"]
}
```

## Jest Configuration

Create a Jest configuration file (`jest.config.js`):

```javascript
module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
    '^.+\\.(js|jsx)$': 'babel-jest'
  },
  testMatch: [
    '**/tests/**/*.test.(ts|js)',
    '**/__tests__/**/*.(ts|js)'
  ],
  moduleFileExtensions: [
    'ts',
    'js',
    'json'
  ],
  coverageDirectory: './coverage',
  collectCoverageFrom: [
    'src/**/*.{js,ts}',
    '!src/index.ts',
    '!**/node_modules/**',
    '!**/dist/**'
  ],
  coverageReporters: [
    'json',
    'lcov',
    'text',
    'clover'
  ]
};
```

## Babel Configuration

Create a Babel configuration file (`babel.config.js`):

```javascript
module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }]
  ]
};
```

## Environment Configuration

Create an environment variables file (`.env.example`):

```
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=universal_token_launcher

# Blockchain Configuration
ZETACHAIN_RPC_URL=https://zetachain-athens-evm.blockpi.network/v1/rpc/public
SEPOLIA_RPC_URL=https://sepolia.drpc.org

# Wallet Configuration (for testing only)
TEST_WALLET_PRIVATE_KEY=your_private_key_with_0x_prefix

# Server Configuration
PORT=3001
JWT_SECRET=your_jwt_secret
DEBUG=true

# Contract Verification APIs
ETHERSCAN_API_KEY=your_etherscan_api_key
POLYGONSCAN_API_KEY=your_polygonscan_api_key
BASESCAN_API_KEY=your_basescan_api_key
```

Create your actual `.env` file:

```bash
cp .env.example .env
```

Then edit the `.env` file to include your actual configuration values.

## Git Configuration

Create a `.gitignore` file:

```
# Node.js
node_modules/
npm-debug.log
yarn-error.log
.yarn/*
package-lock.json

# Environment
.env

# Build
/dist
/build

# Logs
logs/
*.log

# Uploads
uploads/

# Testing
coverage/

# IDE
.idea/
.vscode/
*.sublime-*

# OS
.DS_Store
Thumbs.db
```

## Entry Point

Create the main entry point file (`src/index.ts`):

```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import dotenv from 'dotenv';
import db from './db';
import logger from './utils/logger';

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined'));

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.get('/', (req, res) => {
  res.send('Universal Token Launcher API');
});

// Import route handlers
// app.use('/api/tokens', require('./routes/tokenRoutes'));
// app.use('/api/users', require('./routes/userRoutes'));

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    error: true,
    message: 'Internal server error',
    details: process.env.DEBUG === 'true' ? err.message : undefined
  });
});

// Start server
app.listen(port, () => {
  logger.info(`Server running on port ${port}`);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled promise rejection:', reason);
});

export default app;
```

## Update package.json Scripts

Update your `package.json` to include useful scripts:

```json
{
  "scripts": {
    "start": "node dist/index.js",
    "dev": "nodemon --exec ts-node src/index.ts",
    "build": "tsc",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "eslint . --ext .ts",
    "migrate": "node src/db/scripts/migrate.js",
    "logs": "node src/scripts/viewLogs.js",
    "logs:deployment": "node src/scripts/viewLogs.js --file=deployment.log",
    "logs:error": "node src/scripts/viewLogs.js --file=error.log"
  }
}
```

With this initial setup, you'll have a solid foundation for building the Universal Token Launcher backend. Next, proceed to [Database Setup](2-database-setup.md) to create the database models and initialization scripts. 