const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const logger = require('./utils/logger');
const deployRoutes = require('./routes/deployRoutes');
const verifyRoutes = require('./routes/verifyRoutes');
const chainRoutes = require('./routes/chainRoutes');
const db = require('./models'); // Import Sequelize models

// Add debug code to log available models
logger.info('Available database models:');
logger.info(Object.keys(db).join(', '));

// If tokendeployment exists, log its details
if (db.tokendeployment) {
  logger.info('tokendeployment model found with tableName:', db.tokendeployment.tableName);
} else {
  logger.error('tokendeployment model NOT FOUND in db object!');
}

const app = express();

// Middleware
app.use(cors()); // Configure CORS properly for production
app.use(express.json());
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Routes
app.use('/api', deployRoutes);
app.use('/api', verifyRoutes);
app.use('/api', chainRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.send('Universal Token Contract Deployment Service is running.');
});

// Error handling middleware (optional but recommended)
app.use((err, req, res, next) => {
  logger.error(`Unhandled error: ${err.message}`, { stack: err.stack });
  res.status(500).json({ success: false, message: 'Internal Server Error' });
});

// Initialize Database and Start Server
const PORT = process.env.PORT || 3001;

async function startServer() {
  try {
    await db.sequelize.authenticate();
    logger.info('Database connection has been established successfully. [RUNTIME CHECK]');
    // Optional: Sync models (use with caution in production, migrations are preferred)
    // await db.sequelize.sync(); 
    // logger.info("All models were synchronized successfully.");

    app.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Unable to connect to the database:', error);
    process.exit(1); // Exit if DB connection fails
  }
}

startServer();

module.exports = app; // Export for testing purposes 