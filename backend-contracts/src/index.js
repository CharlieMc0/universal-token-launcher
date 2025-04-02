const express = require('express');
const cors = require('cors');
const config = require('./config');
const logger = require('./utils/logger');
const deploymentRoutes = require('./routes/deploymentRoutes');

// Initialize express app
const app = express();
const port = config.server.port;

// Middleware
app.use(cors({
  origin: config.server.corsOrigin,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  logger.http(`${req.method} ${req.url}`);
  next();
});

// Routes
app.use('/api', deploymentRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(`Error: ${err.message}`);
  res.status(500).json({
    success: false,
    message: 'Internal Server Error',
    details: config.server.env === 'development' ? err.message : undefined
  });
});

// Start server
app.listen(port, () => {
  logger.info(`Contract deployment service running on port ${port}`);
  logger.info(`Environment: ${config.server.env}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

module.exports = app; 