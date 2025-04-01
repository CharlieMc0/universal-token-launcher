'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create token_configurations table
    await queryInterface.createTable('token_configurations', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      creator_wallet: {
        type: Sequelize.STRING,
        allowNull: false
      },
      token_name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      token_symbol: {
        type: Sequelize.STRING,
        allowNull: false
      },
      icon_url: {
        type: Sequelize.STRING
      },
      decimals: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 18
      },
      total_supply: {
        type: Sequelize.DECIMAL,
        allowNull: false
      },
      distributions_json: {
        type: Sequelize.JSONB
      },
      selected_chains: {
        type: Sequelize.JSONB
      },
      fee_paid_tx: {
        type: Sequelize.STRING
      },
      deployment_status: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'pending'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW')
      }
    });

    // Create deployment_logs table
    await queryInterface.createTable('deployment_logs', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      token_config_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'token_configurations',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      chain_name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      chain_id: {
        type: Sequelize.STRING,
        allowNull: false
      },
      contract_address: {
        type: Sequelize.STRING
      },
      status: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'pending'
      },
      transaction_hash: {
        type: Sequelize.STRING
      },
      error_message: {
        type: Sequelize.TEXT
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW')
      }
    });

    // Create token_distributions table
    await queryInterface.createTable('token_distributions', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      token_config_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'token_configurations',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      recipient_address: {
        type: Sequelize.STRING,
        allowNull: false
      },
      chain_id: {
        type: Sequelize.STRING,
        allowNull: false
      },
      token_amount: {
        type: Sequelize.DECIMAL,
        allowNull: false
      },
      status: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'pending'
      },
      transaction_hash: {
        type: Sequelize.STRING
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW')
      }
    });

    // Add index for performance
    await queryInterface.addIndex('token_configurations', ['creator_wallet']);
    await queryInterface.addIndex('deployment_logs', ['token_config_id', 'chain_id']);
    await queryInterface.addIndex('token_distributions', ['token_config_id', 'recipient_address']);
  },

  down: async (queryInterface, Sequelize) => {
    // Drop tables in reverse order
    await queryInterface.dropTable('token_distributions');
    await queryInterface.dropTable('deployment_logs');
    await queryInterface.dropTable('token_configurations');
  }
}; 