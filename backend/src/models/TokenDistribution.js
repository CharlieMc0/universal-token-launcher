const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const { DISTRIBUTION_STATUS } = require('../config/constants');

const TokenDistribution = sequelize.define('TokenDistribution', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  tokenConfigId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'token_configurations',
      key: 'id'
    }
  },
  recipientAddress: {
    type: DataTypes.STRING,
    allowNull: false
  },
  chainId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  tokenAmount: {
    type: DataTypes.DECIMAL(78, 18),
    allowNull: false
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: DISTRIBUTION_STATUS.PENDING,
    validate: {
      isIn: [Object.values(DISTRIBUTION_STATUS)]
    }
  },
  transactionHash: {
    type: DataTypes.STRING,
    allowNull: true
  },
  errorMessage: {
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
  tableName: 'token_distributions',
  timestamps: true
});

module.exports = TokenDistribution; 