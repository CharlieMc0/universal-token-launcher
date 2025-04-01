const { DataTypes } = require('sequelize');
const sequelize = require('../db/config');
const TokenConfiguration = require('./TokenConfiguration');

const DeploymentLog = sequelize.define('DeploymentLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  tokenConfigId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'token_config_id',
    references: {
      model: 'token_configurations',
      key: 'id'
    }
  },
  chainName: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'chain_name'
  },
  chainId: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'chain_id'
  },
  contractAddress: {
    type: DataTypes.STRING,
    field: 'contract_address'
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'pending'
  },
  transactionHash: {
    type: DataTypes.STRING,
    field: 'transaction_hash'
  },
  errorMessage: {
    type: DataTypes.TEXT,
    field: 'error_message'
  }
}, {
  tableName: 'deployment_logs',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// Establish relationship
DeploymentLog.belongsTo(TokenConfiguration, { foreignKey: 'tokenConfigId' });
TokenConfiguration.hasMany(DeploymentLog, { foreignKey: 'tokenConfigId' });

module.exports = DeploymentLog; 