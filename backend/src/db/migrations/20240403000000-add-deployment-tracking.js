'use strict';

module.exports = {
  up: async function(queryInterface, Sequelize) {
    try {
      // Check if the columns already exist
      const tableInfo = await queryInterface.describeTable('deployment_logs');
      const columnsToAdd = [];
      
      if (!tableInfo.deploy_attempts) {
        columnsToAdd.push(['deploy_attempts', {
          type: Sequelize.INTEGER,
          defaultValue: 0
        }]);
      }
      
      if (!tableInfo.last_retry_at) {
        columnsToAdd.push(['last_retry_at', {
          type: Sequelize.DATE
        }]);
      }
      
      if (!tableInfo.last_error) {
        columnsToAdd.push(['last_error', {
          type: Sequelize.TEXT
        }]);
      }
      
      if (!tableInfo.completed_at) {
        columnsToAdd.push(['completed_at', {
          type: Sequelize.DATE
        }]);
      }
      
      // Add columns if they don't exist
      for (const [columnName, columnDefinition] of columnsToAdd) {
        await queryInterface.addColumn('deployment_logs', columnName, columnDefinition);
        console.log(`Added column ${columnName} to deployment_logs table`);
      }
      
      return true;
    } catch (error) {
      console.error('Migration failed:', error);
      return false;
    }
  },
  
  down: async function(queryInterface, Sequelize) {
    try {
      // Remove the columns
      await queryInterface.removeColumn('deployment_logs', 'deploy_attempts');
      await queryInterface.removeColumn('deployment_logs', 'last_retry_at');
      await queryInterface.removeColumn('deployment_logs', 'last_error');
      await queryInterface.removeColumn('deployment_logs', 'completed_at');
      return true;
    } catch (error) {
      console.error('Migration rollback failed:', error);
      return false;
    }
  }
}; 