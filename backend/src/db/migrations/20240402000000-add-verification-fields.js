'use strict';

module.exports = {
  up: async function(queryInterface, Sequelize) {
    try {
      // Check if the columns already exist
      const tableInfo = await queryInterface.describeTable('deployment_logs');
      const columnsToAdd = [];
      
      if (!tableInfo.verification_status) {
        columnsToAdd.push(['verification_status', {
          type: Sequelize.STRING,
          defaultValue: 'pending'
        }]);
      }
      
      if (!tableInfo.verification_error) {
        columnsToAdd.push(['verification_error', {
          type: Sequelize.TEXT
        }]);
      }
      
      if (!tableInfo.verified_url) {
        columnsToAdd.push(['verified_url', {
          type: Sequelize.STRING
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
      await queryInterface.removeColumn('deployment_logs', 'verification_status');
      await queryInterface.removeColumn('deployment_logs', 'verification_error');
      await queryInterface.removeColumn('deployment_logs', 'verified_url');
      return true;
    } catch (error) {
      console.error('Migration rollback failed:', error);
      return false;
    }
  }
}; 