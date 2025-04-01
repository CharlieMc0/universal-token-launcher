'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async function(queryInterface, Sequelize) {
    try {
      // Check if deployment_logs table exists
      try {
        // This will throw an error if the table doesn't exist
        await queryInterface.describeTable('deployment_logs');
      } catch (error) {
        console.log('deployment_logs table does not exist, skipping migration');
        return true;
      }

      // Check if updated_at column exists
      const tableInfo = await queryInterface.describeTable('deployment_logs');
      
      // If the updated_at column doesn't exist, add it
      if (!tableInfo.updated_at) {
        await queryInterface.addColumn('deployment_logs', 'updated_at', {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW')
        });
        console.log('Added updated_at column to deployment_logs table');
      } else {
        console.log('updated_at column already exists, skipping');
      }
      
      return true;
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  },
  
  down: async function(queryInterface, Sequelize) {
    try {
      // This is a fix migration, so down migration is less important
      // Only attempt to remove the column if it was added by this migration
      // In practice, we probably wouldn't want to remove this column
      console.log('Skipping down migration - not removing updated_at column');
      return true;
    } catch (error) {
      console.error('Migration rollback failed:', error);
      throw error;
    }
  }
}; 