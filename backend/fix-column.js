const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');

dotenv.config();

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: console.log,
  dialectOptions: process.env.NODE_ENV === 'production' ? {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  } : {},
});

async function fixDeploymentLogsTable() {
  try {
    // Connect to database
    await sequelize.authenticate();
    console.log('Connection to database has been established successfully.');

    // Check if deployment_logs table exists
    try {
      await sequelize.query('SELECT 1 FROM deployment_logs LIMIT 1');
    } catch (error) {
      console.error('deployment_logs table does not exist:', error);
      return;
    }

    // Check if updated_at column exists
    try {
      await sequelize.query('SELECT updated_at FROM deployment_logs LIMIT 1');
      console.log('updated_at column already exists, no action needed');
      return;
    } catch (error) {
      console.log('updated_at column does not exist, will be created');
    }

    // Add updated_at column
    await sequelize.query(`
      ALTER TABLE deployment_logs 
      ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    `);
    console.log('Successfully added updated_at column to deployment_logs table');

    // Update records to set updated_at equal to created_at if it exists
    try {
      await sequelize.query(`
        UPDATE deployment_logs 
        SET updated_at = created_at 
        WHERE created_at IS NOT NULL
      `);
      console.log('Updated existing records with created_at values');
    } catch (error) {
      console.error('Error updating records:', error);
    }
  } catch (error) {
    console.error('Error fixing deployment_logs table:', error);
  } finally {
    await sequelize.close();
    console.log('Database connection closed');
  }
}

// Run the fix
fixDeploymentLogsTable(); 