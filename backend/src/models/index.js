const { sequelize } = require('../config/database');
const TokenConfiguration = require('./TokenConfiguration');
const DeploymentLog = require('./DeploymentLog');
const TokenDistribution = require('./TokenDistribution');

// Define model associations
TokenConfiguration.hasMany(DeploymentLog, {
  foreignKey: 'tokenConfigId',
  onDelete: 'CASCADE'
});
DeploymentLog.belongsTo(TokenConfiguration, {
  foreignKey: 'tokenConfigId'
});

TokenConfiguration.hasMany(TokenDistribution, {
  foreignKey: 'tokenConfigId',
  onDelete: 'CASCADE'
});
TokenDistribution.belongsTo(TokenConfiguration, {
  foreignKey: 'tokenConfigId'
});

module.exports = {
  sequelize,
  TokenConfiguration,
  DeploymentLog,
  TokenDistribution
}; 