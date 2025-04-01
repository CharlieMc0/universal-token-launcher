const { DataTypes } = require('sequelize');
const sequelize = require('../db/config');

const TokenConfiguration = sequelize.define('TokenConfiguration', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  creatorWallet: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'creator_wallet'
  },
  tokenName: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'token_name'
  },
  tokenSymbol: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'token_symbol'
  },
  iconUrl: {
    type: DataTypes.STRING,
    field: 'icon_url'
  },
  decimals: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 18
  },
  totalSupply: {
    type: DataTypes.DECIMAL,
    allowNull: false,
    field: 'total_supply'
  },
  distributionsJson: {
    type: DataTypes.JSONB,
    field: 'distributions_json'
  },
  selectedChains: {
    type: DataTypes.JSONB,
    field: 'selected_chains'
  },
  feePaidTx: {
    type: DataTypes.STRING,
    field: 'fee_paid_tx'
  },
  deploymentStatus: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'pending',
    field: 'deployment_status'
  },
  deploymentError: {
    type: DataTypes.TEXT,
    field: 'deployment_error'
  }
}, {
  tableName: 'token_configurations',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = TokenConfiguration; 