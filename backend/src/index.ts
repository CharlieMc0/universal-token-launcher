import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';

// Import routes
import tokenRoutes from './routes/tokenRoutes';

// Import custom logger and middleware
import { logger } from './utils/logger';
import loggerMiddleware from './middleware/loggerMiddleware';

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add custom logger middleware
app.use(loggerMiddleware);

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api', tokenRoutes);

// Health check route
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Start server
app.listen(PORT, () => {
  logger.info(`Server started`, {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    debugMode: process.env.DEBUG === 'true'
  });
  
  logger.info(`Health check available at http://localhost:${PORT}/health`);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error(`Uncaught exception`, {
    error: error.message,
    stack: error.stack
  });
  
  // Exit with error
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error(`Unhandled promise rejection`, {
    reason,
    promise
  });
});

export default app; 