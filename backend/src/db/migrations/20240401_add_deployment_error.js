const { Sequelize } = require('sequelize');
const sequelize = require('../config');

/**
 * Migration to add the deployment_error column to the token_configurations table
 */
async function migrate() {
  try {
    console.log('Running migration: Add deployment_error column to token_configurations table');
    
    // Create transaction to ensure consistency
    await sequelize.transaction(async (transaction) => {
      // Check if column already exists (to make migration idempotent)
      const [results] = await sequelize.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'token_configurations' 
        AND column_name = 'deployment_error'
      `, { transaction });
      
      if (results.length === 0) {
        // Add deployment_error column to token_configurations table
        await sequelize.query(`
          ALTER TABLE token_configurations
          ADD COLUMN deployment_error TEXT;
        `, { transaction });
        
        console.log('Successfully added deployment_error column to token_configurations table');
      } else {
        console.log('Column deployment_error already exists, skipping migration');
      }
    });
    
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