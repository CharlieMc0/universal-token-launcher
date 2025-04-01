const { DataTypes } = require('sequelize');
const sequelize = require('../db/config');
const TokenConfiguration = require('./TokenConfiguration');

const TokenDistribution = sequelize.define('TokenDistribution', {
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
  recipientAddress: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'recipient_address'
  },
  chainId: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'chain_id'
  },
  tokenAmount: {
    type: DataTypes.DECIMAL,
    allowNull: false,
    field: 'token_amount'
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'pending'
  },
  transactionHash: {
    type: DataTypes.STRING,
    field: 'transaction_hash'
  }
}, {
  tableName: 'token_distributions',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// Establish relationship
TokenDistribution.belongsTo(TokenConfiguration, { foreignKey: 'tokenConfigId' });
TokenConfiguration.hasMany(TokenDistribution, { foreignKey: 'tokenConfigId' });

module.exports = TokenDistribution; 