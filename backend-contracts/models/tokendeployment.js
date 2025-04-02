'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class tokendeployment extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  tokendeployment.init({
    zc_contract_address: DataTypes.STRING,
    deployer_address: DataTypes.STRING,
    token_name: DataTypes.STRING,
    token_symbol: DataTypes.STRING,
    decimals: DataTypes.INTEGER,
    total_supply: DataTypes.STRING,
    connected_chains_json: DataTypes.JSONB,
    deployment_status: DataTypes.STRING,
    error_message: DataTypes.TEXT
  }, {
    sequelize,
    modelName: 'tokendeployment',
    tableName: 'token_deployments',
    underscored: true,
  });
  return tokendeployment;
};