const path = require('path');
const fs = require('fs');
const sequelize = require('../db/config');
const Sequelize = require('sequelize');

/**
 * Run all database migrations
 */
async function runMigrations() {
  try {
    console.log('Starting database migrations...');
    
    // Test database connection
    await sequelize.authenticate();
    console.log('Database connection established successfully');
    
    // Get migration files
    const migrationsPath = path.join(__dirname, '../db/migrations');
    const migrationFiles = fs.readdirSync(migrationsPath)
      .filter(file => file.endsWith('.js'))
      .sort(); // Sort to ensure migrations run in order
    
    if (migrationFiles.length === 0) {
      console.log('No migration files found');
      return;
    }
    
    console.log(`Found ${migrationFiles.length} migration files`);
    
    // Run migrations in order
    for (const file of migrationFiles) {
      console.log(`Running migration: ${file}`);
      const migration = require(path.join(migrationsPath, file));
      
      if (typeof migration.migrate === 'function') {
        // Custom migrate function
        await migration.migrate();
        console.log(`Migration ${file} completed`);
      } else if (typeof migration.up === 'function') {
        // Standard Sequelize migration with up/down functions
        const queryInterface = sequelize.getQueryInterface();
        await migration.up(queryInterface, Sequelize);
        console.log(`Migration ${file} completed`);
      } else {
        console.warn(`Migration ${file} does not export a migrate or up function, skipping`);
      }
    }
    
    console.log('All migrations completed successfully');
  } catch (error) {
    console.error(`Migration process failed: ${error.message}`);
    console.error(error.stack);
    throw error;
  } finally {
    // Close database connection
    await sequelize.close();
  }
}

// Run migrations if this script is executed directly
if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log('Migration process completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error(`Migration process failed: ${error.message}`);
      process.exit(1);
    });
}

module.exports = { runMigrations }; 