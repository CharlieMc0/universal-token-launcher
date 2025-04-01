const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const { DEPLOYMENT_STATUS } = require('../config/constants');

const DeploymentLog = sequelize.define('DeploymentLog', {
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
  chainName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  chainId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  contractAddress: {
    type: DataTypes.STRING,
    allowNull: true
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: DEPLOYMENT_STATUS.PENDING,
    validate: {
      isIn: [Object.values(DEPLOYMENT_STATUS)]
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
  tableName: 'deployment_logs',
  timestamps: true
});

module.exports = DeploymentLog; 