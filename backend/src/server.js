require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

// Import routes
const tokenRoutes = require('./routes/tokens');
const deploymentRoutes = require('./routes/deployments');
const transferRoutes = require('./routes/transfers');
const distributionRoutes = require('./routes/distributions');
const authRoutes = require('./routes/auth');

// Import database
const { sequelize } = require('./models');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet()); // Security headers
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev')); // Logging

// Static uploads directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tokens', tokenRoutes);
app.use('/api/deployments', deploymentRoutes);
app.use('/api/transfers', transferRoutes);
app.use('/api/distributions', distributionRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({
    status: 'healthy',
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
async function startServer() {
  try {
    // Sync database
    await sequelize.sync({ force: true }); // Use { force: true } only in development
    console.log('Database synced');

    // Start server
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer(); 