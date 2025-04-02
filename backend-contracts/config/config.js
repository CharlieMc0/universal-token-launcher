require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') }); // Adjust path to .env

module.exports = {
  development: {
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432', 10), // Ensure port is integer
    dialect: 'postgres'
  },
  test: {
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE_TEST || process.env.DB_DATABASE + '_test',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432', 10),
    dialect: 'postgres'
  },
  production: {
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432', 10),
    dialect: 'postgres',
    dialectOptions: {
      // Add production-specific options like SSL if needed
      // ssl: {
      //   require: true,
      //   rejectUnauthorized: false // Adjust as per your SSL setup
      // }
    }
  }
};
