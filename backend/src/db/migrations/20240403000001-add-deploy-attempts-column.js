'use strict';

const sequelize = require('../../db/config');

/**
 * Migration to add deployment tracking columns to the deployment_logs table
 */
async function migrate() {
  try {
    console.log('Running migration: Add deployment tracking columns to deployment_logs table');
    
    // Get QueryInterface from sequelize instance
    const queryInterface = sequelize.getQueryInterface();
    const { DataTypes } = require('sequelize');
    
    // Check if columns already exist (to make migration idempotent)
    let columnsAdded = 0;
    try {
      const tableInfo = await queryInterface.describeTable('deployment_logs');
      
      // Add deploy_attempts column if it doesn't exist
      if (!tableInfo.deploy_attempts) {
        await queryInterface.addColumn('deployment_logs', 'deploy_attempts', {
          type: DataTypes.INTEGER,
          defaultValue: 0
        });
        console.log('Added deploy_attempts column to deployment_logs table');
        columnsAdded++;
      } else {
        console.log('Column deploy_attempts already exists, skipping');
      }
      
      // Add last_retry_at column if it doesn't exist
      if (!tableInfo.last_retry_at) {
        await queryInterface.addColumn('deployment_logs', 'last_retry_at', {
          type: DataTypes.DATE
        });
        console.log('Added last_retry_at column to deployment_logs table');
        columnsAdded++;
      } else {
        console.log('Column last_retry_at already exists, skipping');
      }
      
      // Add last_error column if it doesn't exist
      if (!tableInfo.last_error) {
        await queryInterface.addColumn('deployment_logs', 'last_error', {
          type: DataTypes.TEXT
        });
        console.log('Added last_error column to deployment_logs table');
        columnsAdded++;
      } else {
        console.log('Column last_error already exists, skipping');
      }
      
      // Add completed_at column if it doesn't exist
      if (!tableInfo.completed_at) {
        await queryInterface.addColumn('deployment_logs', 'completed_at', {
          type: DataTypes.DATE
        });
        console.log('Added completed_at column to deployment_logs table');
        columnsAdded++;
      } else {
        console.log('Column completed_at already exists, skipping');
      }
      
      if (columnsAdded === 0) {
        console.log('All columns already exist, no changes needed');
      } else {
        console.log(`Added ${columnsAdded} columns to deployment_logs table`);
      }
    } catch (error) {
      // If table doesn't exist, this will throw an error
      console.error(`Error checking table columns: ${error.message}`);
      throw new Error('Could not modify deployment_logs table: ' + error.message);
    }
    
    console.log('Migration completed successfully');
  } catch (error) {
    console.error(`Migration failed: ${error.message}`);
    throw error;
  }
}

// Run the migration if this script is executed directly
if (require.main === module) {
  migrate()
    .then(() => {
      console.log('Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error(`Migration failed: ${error.message}`);
      process.exit(1);
    });
}

module.exports = { migrate }; 