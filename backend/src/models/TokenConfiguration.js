const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const { DEPLOYMENT_STATUS } = require('../config/constants');

const TokenConfiguration = sequelize.define('TokenConfiguration', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  tokenName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  tokenSymbol: {
    type: DataTypes.STRING,
    allowNull: false
  },
  decimals: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 18
  },
  totalSupply: {
    type: DataTypes.DECIMAL(78, 18),
    allowNull: false
  },
  creatorWallet: {
    type: DataTypes.STRING,
    allowNull: false
  },
  iconUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  deploymentStatus: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: DEPLOYMENT_STATUS.PENDING,
    validate: {
      isIn: [Object.values(DEPLOYMENT_STATUS)]
    }
  },
  feeTransactionHash: {
    type: DataTypes.STRING,
    allowNull: true
  },
  selectedChains: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: []
  },
  csvDataRaw: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'token_configurations',
  timestamps: true
});

module.exports = TokenConfiguration; 