'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('token_deployments', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      zc_contract_address: {
        type: Sequelize.STRING
      },
      deployer_address: {
        type: Sequelize.STRING
      },
      token_name: {
        type: Sequelize.STRING
      },
      token_symbol: {
        type: Sequelize.STRING
      },
      decimals: {
        type: Sequelize.INTEGER
      },
      total_supply: {
        type: Sequelize.STRING
      },
      connected_chains_json: {
        type: Sequelize.JSONB
      },
      deployment_status: {
        type: Sequelize.STRING
      },
      error_message: {
        type: Sequelize.TEXT
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('token_deployments');
  }
};