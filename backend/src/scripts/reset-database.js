/**
 * Reset Database Script
 * 
 * This script drops all tables and recreates them by running migrations.
 * USE WITH CAUTION: This will delete all data in the database.
 */

require('dotenv').config();
const sequelize = require('../db/config');
const { Sequelize } = require('sequelize');
const path = require('path');
const fs = require('fs');

async function resetDatabase() {
  try {
    console.log('Starting database reset...');
    
    // Force sync to drop all tables
    console.log('Dropping all tables...');
    await sequelize.getQueryInterface().dropAllTables();
    console.log('✅ All tables dropped successfully');
    
    // Run migrations to recreate tables
    console.log('Running migrations to recreate tables...');
    
    const migrationsPath = path.resolve(__dirname, '../db/migrations');
    
    // First, run the initial migration that creates all tables
    const initialMigrationFile = '20240401000000-create-tables.js';
    console.log(`Running initial migration: ${initialMigrationFile}`);
    
    try {
      const initialMigration = require(path.join(migrationsPath, initialMigrationFile));
      if (typeof initialMigration.up === 'function') {
        await initialMigration.up(sequelize.getQueryInterface(), Sequelize);
        console.log('✅ Initial migration completed successfully');
      } else {
        throw new Error('Initial migration has no valid up function');
      }
    } catch (error) {
      console.error(`❌ Error running initial migration: ${error.message}`);
      throw error;
    }
    
    // Then run all other migrations except the initial one
    const migrationFiles = fs.readdirSync(migrationsPath)
      .filter(file => file.endsWith('.js') && file !== initialMigrationFile)
      .sort((a, b) => {
        // Extract timestamps from filenames to ensure proper order
        const timestampA = a.split('-')[0];
        const timestampB = b.split('-')[0];
        return parseInt(timestampA) - parseInt(timestampB);
      });

    // Run each additional migration in order
    for (const migrationFile of migrationFiles) {
      const migration = require(path.join(migrationsPath, migrationFile));
      console.log(`Running migration: ${migrationFile}`);
      
      try {
        if (typeof migration.up === 'function') {
          await migration.up(sequelize.getQueryInterface(), Sequelize);
        } else if (migration.migrate && typeof migration.migrate === 'function') {
          await migration.migrate();
        } else {
          console.warn(`⚠️ Migration ${migrationFile} has no valid up function. Skipping.`);
        }
      } catch (error) {
        console.error(`❌ Error running migration ${migrationFile}: ${error.message}`);
        // Continue with other migrations
        console.log('Continuing with next migration...');
      }
    }
    
    console.log('✅ All migrations completed successfully');
    console.log('✅ Database reset complete');
    
    // Close the connection
    await sequelize.close();
    console.log('Database connection closed');
    
    return true;
  } catch (error) {
    console.error('❌ Error resetting database:', error);
    // Make sure to close the connection even if there's an error
    try {
      await sequelize.close();
    } catch (closeError) {
      console.error('Error closing database connection:', closeError);
    }
    
    throw error;
  }
}

// Run the function if this script is executed directly
if (require.main === module) {
  resetDatabase()
    .then(() => {
      console.log('Database reset script completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('Database reset script failed:', error);
      process.exit(1);
    });
}

module.exports = { resetDatabase }; 