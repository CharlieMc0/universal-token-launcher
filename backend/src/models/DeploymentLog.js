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
  },
  verificationStatus: {
    type: DataTypes.STRING,
    field: 'verification_status',
    defaultValue: 'pending'
  },
  verificationError: {
    type: DataTypes.TEXT,
    field: 'verification_error'
  },
  verifiedUrl: {
    type: DataTypes.STRING,
    field: 'verified_url'
  },
  deployAttempts: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'deploy_attempts'
  },
  lastRetryAt: {
    type: DataTypes.DATE,
    field: 'last_retry_at'
  },
  lastError: {
    type: DataTypes.TEXT,
    field: 'last_error'
  },
  completedAt: {
    type: DataTypes.DATE,
    field: 'completed_at'
  }
}, {
  tableName: 'deployment_logs',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// Establish relationship
DeploymentLog.belongsTo(TokenConfiguration, { foreignKey: 'tokenConfigId' });
TokenConfiguration.hasMany(DeploymentLog, { foreignKey: 'tokenConfigId' });

module.exports = DeploymentLog; 