# 2. Database Setup

This section covers setting up the database models and initialization scripts for the Universal Token Launcher backend.

## PostgreSQL Setup

First, make sure PostgreSQL is installed and running on your system:

```bash
# On Mac with Homebrew
brew install postgresql
brew services start postgresql

# On Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

Create the database:

```bash
# Login to postgres
sudo -u postgres psql

# In psql, create database and user
CREATE DATABASE universal_token_launcher;
CREATE USER utl_user WITH ENCRYPTED PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE universal_token_launcher TO utl_user;
\q
```

## Database Models

Create the database models in the `src/db/models` directory:

### Token Configuration Model (`src/db/models/TokenConfiguration.ts`)

```typescript
import { Model, DataTypes, Sequelize } from 'sequelize';

export default (sequelize: Sequelize) => {
  class TokenConfiguration extends Model {
    static associate(models: any) {
      TokenConfiguration.hasMany(models.DeploymentLog, { foreignKey: 'tokenId' });
      TokenConfiguration.hasMany(models.TokenDistribution, { foreignKey: 'tokenId' });
    }
  }
  
  TokenConfiguration.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    creatorWallet: {
      type: DataTypes.STRING,
      allowNull: false
    },
    tokenName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    tokenSymbol: {
      type: DataTypes.STRING,
      allowNull: false
    },
    decimals: {
      type: DataTypes.INTEGER,
      defaultValue: 18
    },
    totalSupply: {
      type: DataTypes.STRING,
      allowNull: false
    },
    selectedChains: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: false
    },
    iconUrl: {
      type: DataTypes.STRING
    },
    deploymentStatus: {
      type: DataTypes.ENUM('pending', 'deploying', 'completed', 'failed', 'partial'),
      defaultValue: 'pending'
    },
    deploymentError: {
      type: DataTypes.TEXT
    }
  }, {
    sequelize,
    modelName: 'TokenConfiguration',
    tableName: 'token_configurations',
    timestamps: true
  });

  return TokenConfiguration;
};
```

### Deployment Log Model (`src/db/models/DeploymentLog.ts`)

```typescript
import { Model, DataTypes, Sequelize } from 'sequelize';

export default (sequelize: Sequelize) => {
  class DeploymentLog extends Model {
    static associate(models: any) {
      DeploymentLog.belongsTo(models.TokenConfiguration, { foreignKey: 'tokenId' });
    }
  }
  
  DeploymentLog.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    tokenId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    chainId: {
      type: DataTypes.STRING,
      allowNull: false
    },
    contractAddress: {
      type: DataTypes.STRING
    },
    transactionHash: {
      type: DataTypes.STRING
    },
    deploymentStatus: {
      type: DataTypes.ENUM('pending', 'deploying', 'success', 'failed', 'retrying'),
      defaultValue: 'pending'
    },
    verificationStatus: {
      type: DataTypes.ENUM('pending', 'processing', 'verified', 'failed'),
      defaultValue: 'pending'
    },
    verificationError: {
      type: DataTypes.TEXT
    },
    verifiedUrl: {
      type: DataTypes.STRING
    },
    deployAttempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    lastRetryAt: {
      type: DataTypes.DATE
    },
    lastError: {
      type: DataTypes.TEXT
    },
    completedAt: {
      type: DataTypes.DATE
    }
  }, {
    sequelize,
    modelName: 'DeploymentLog',
    tableName: 'deployment_logs',
    timestamps: true
  });

  return DeploymentLog;
};
```

### Token Distribution Model (`src/db/models/TokenDistribution.ts`)

```typescript
import { Model, DataTypes, Sequelize } from 'sequelize';

export default (sequelize: Sequelize) => {
  class TokenDistribution extends Model {
    static associate(models: any) {
      TokenDistribution.belongsTo(models.TokenConfiguration, { foreignKey: 'tokenId' });
    }
  }
  
  TokenDistribution.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    tokenId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    recipientAddress: {
      type: DataTypes.STRING,
      allowNull: false
    },
    chainId: {
      type: DataTypes.STRING,
      allowNull: false
    },
    tokenAmount: {
      type: DataTypes.STRING,
      allowNull: false
    },
    distributionStatus: {
      type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed'),
      defaultValue: 'pending'
    },
    transactionHash: {
      type: DataTypes.STRING
    }
  }, {
    sequelize,
    modelName: 'TokenDistribution',
    tableName: 'token_distributions',
    timestamps: true
  });

  return TokenDistribution;
};
```

## Database Initialization

Create the database initialization file (`src/db/index.ts`):

```typescript
import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import TokenConfigurationModel from './models/TokenConfiguration';
import DeploymentLogModel from './models/DeploymentLog';
import TokenDistributionModel from './models/TokenDistribution';
import logger from '../utils/logger';

dotenv.config();

// Database connection parameters
const dbName = process.env.DB_NAME || 'universal_token_launcher';
const dbUser = process.env.DB_USER || 'postgres';
const dbPassword = process.env.DB_PASSWORD || '';
const dbHost = process.env.DB_HOST || 'localhost';
const dbPort = parseInt(process.env.DB_PORT || '5432', 10);

// Create Sequelize instance
const sequelize = new Sequelize(dbName, dbUser, dbPassword, {
  host: dbHost,
  port: dbPort,
  dialect: 'postgres',
  logging: process.env.DEBUG === 'true' ? (msg) => logger.debug(msg) : false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

// Initialize models
const db: any = {
  sequelize,
  Sequelize,
  TokenConfiguration: TokenConfigurationModel(sequelize),
  DeploymentLog: DeploymentLogModel(sequelize),
  TokenDistribution: TokenDistributionModel(sequelize)
};

// Set up associations
Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

// Test database connection
async function testConnection() {
  try {
    await sequelize.authenticate();
    logger.info('Database connection established successfully.');
  } catch (error) {
    logger.error('Unable to connect to the database:', error);
    process.exit(1);
  }
}

testConnection();

export default db;
```

## Database Migration System

Create a database migration system for handling schema changes:

### Database Migration Script (`src/db/scripts/migrate.js`)

```javascript
const fs = require('fs');
const path = require('path');
const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');

dotenv.config();

// Database connection parameters
const dbName = process.env.DB_NAME || 'universal_token_launcher';
const dbUser = process.env.DB_USER || 'postgres';
const dbPassword = process.env.DB_PASSWORD || '';
const dbHost = process.env.DB_HOST || 'localhost';
const dbPort = parseInt(process.env.DB_PORT || '5432', 10);

// Create Sequelize instance
const sequelize = new Sequelize(dbName, dbUser, dbPassword, {
  host: dbHost,
  port: dbPort,
  dialect: 'postgres',
  logging: console.log
});

// Create migrations table if it doesn't exist
async function initMigrationsTable() {
  try {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        applied_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
  } catch (error) {
    console.error('Error initializing migrations table:', error);
    process.exit(1);
  }
}

// Run all migration files
async function runMigrations() {
  try {
    await initMigrationsTable();
    
    // Get list of applied migrations
    const [appliedMigrations] = await sequelize.query('SELECT name FROM migrations');
    const appliedMigrationNames = appliedMigrations.map(m => m.name);
    
    // Get migration files
    const migrationsDir = path.join(__dirname, '../migrations');
    if (!fs.existsSync(migrationsDir)) {
      console.log('Migrations directory not found. Creating it...');
      fs.mkdirSync(migrationsDir, { recursive: true });
    }
    
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.js'))
      .sort(); // Sort to run in order
    
    // Run migrations
    for (const file of migrationFiles) {
      if (!appliedMigrationNames.includes(file)) {
        const migration = require(path.join(migrationsDir, file));
        
        console.log(`Running migration: ${file}`);
        await migration.migrate(sequelize);
        
        // Record migration
        await sequelize.query(`
          INSERT INTO migrations (name) VALUES ('${file}');
        `);
        
        console.log(`Migration ${file} applied successfully.`);
      } else {
        console.log(`Migration ${file} already applied, skipping.`);
      }
    }
    
    console.log('All migrations completed.');
  } catch (error) {
    console.error('Error running migrations:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Run a single migration file
async function runSingleMigration(migrationPath) {
  try {
    await initMigrationsTable();
    
    const fileName = path.basename(migrationPath);
    
    // Check if migration already applied
    const [appliedMigrations] = await sequelize.query('SELECT name FROM migrations');
    const appliedMigrationNames = appliedMigrations.map(m => m.name);
    
    if (appliedMigrationNames.includes(fileName)) {
      console.log(`Migration ${fileName} already applied, skipping.`);
      return;
    }
    
    // Run migration
    const migration = require(path.resolve(migrationPath));
    
    console.log(`Running migration: ${fileName}`);
    await migration.migrate(sequelize);
    
    // Record migration
    await sequelize.query(`
      INSERT INTO migrations (name) VALUES ('${fileName}');
    `);
    
    console.log(`Migration ${fileName} applied successfully.`);
  } catch (error) {
    console.error('Error running migration:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Determine which migration function to run
if (process.argv.length > 2 && process.argv[2] === '--single') {
  if (process.argv.length > 3) {
    runSingleMigration(process.argv[3]);
  } else {
    console.error('Missing migration file path. Usage: node migrate.js --single path/to/migration.js');
    process.exit(1);
  }
} else {
  runMigrations();
}
```

### Sample Database Migration (`src/db/migrations/20230401_initial_schema.js`)

```javascript
/**
 * Initial schema migration for Universal Token Launcher
 */
module.exports = {
  async migrate(sequelize) {
    const transaction = await sequelize.transaction();
    
    try {
      // Create token_configurations table
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS token_configurations (
          id SERIAL PRIMARY KEY,
          creator_wallet VARCHAR(255) NOT NULL,
          token_name VARCHAR(255) NOT NULL,
          token_symbol VARCHAR(50) NOT NULL,
          decimals INTEGER DEFAULT 18,
          total_supply VARCHAR(255) NOT NULL,
          selected_chains VARCHAR(255)[] NOT NULL,
          icon_url VARCHAR(255),
          deployment_status VARCHAR(20) DEFAULT 'pending',
          deployment_error TEXT,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `, { transaction });
      
      // Create deployment_logs table
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS deployment_logs (
          id SERIAL PRIMARY KEY,
          token_id INTEGER NOT NULL REFERENCES token_configurations(id),
          chain_id VARCHAR(50) NOT NULL,
          contract_address VARCHAR(255),
          transaction_hash VARCHAR(255),
          deployment_status VARCHAR(20) DEFAULT 'pending',
          verification_status VARCHAR(20) DEFAULT 'pending',
          verification_error TEXT,
          verified_url VARCHAR(255),
          deploy_attempts INTEGER DEFAULT 0,
          last_retry_at TIMESTAMP,
          last_error TEXT,
          completed_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `, { transaction });
      
      // Create token_distributions table
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS token_distributions (
          id SERIAL PRIMARY KEY,
          token_id INTEGER NOT NULL REFERENCES token_configurations(id),
          recipient_address VARCHAR(255) NOT NULL,
          chain_id VARCHAR(50) NOT NULL,
          token_amount VARCHAR(255) NOT NULL,
          distribution_status VARCHAR(20) DEFAULT 'pending',
          transaction_hash VARCHAR(255),
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `, { transaction });
      
      // Create indexes
      await sequelize.query(`
        CREATE INDEX idx_token_configurations_creator_wallet ON token_configurations(creator_wallet);
        CREATE INDEX idx_deployment_logs_token_id ON deployment_logs(token_id);
        CREATE INDEX idx_deployment_logs_chain_id ON deployment_logs(chain_id);
        CREATE INDEX idx_token_distributions_token_id ON token_distributions(token_id);
      `, { transaction });
      
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};
```

### Database Initialization Script (`src/scripts/initDb.js`)

```javascript
const db = require('../db').default;
const logger = require('../utils/logger').default;

async function initDb() {
  try {
    // Sync all models with the database
    await db.sequelize.sync({ force: false, alter: true });
    
    logger.info('Database synchronized successfully.');
    process.exit(0);
  } catch (error) {
    logger.error('Error initializing database:', error);
    process.exit(1);
  }
}

initDb();
```

## Usage

### Running Database Migrations

To initialize your database schema, run:

```bash
# Run all migrations
npm run migrate

# Run a specific migration
npm run migrate -- --single src/db/migrations/20230401_initial_schema.js
```

### Initializing the Database

For initial database setup or development environment, you can run:

```bash
# Using npm script
npm run init-db

# Or directly
node src/scripts/initDb.js
```

This completes the database setup for the Universal Token Launcher backend. Next, proceed to [Utilities](3-utilities.md) to create utility functions like chain information and logging. 