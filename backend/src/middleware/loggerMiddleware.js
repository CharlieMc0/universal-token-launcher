const { logger } = require('../utils/logger');

/**
 * Middleware to log all API requests
 */
const loggerMiddleware = (req, res, next) => {
  // Generate a unique request ID
  const requestId = Math.random().toString(36).substring(2, 15);
  
  // Add request ID to the request object
  req.requestId = requestId;
  
  // Log the request
  logger.info(`API Request`, {
    requestId,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    walletAddress: req.headers['x-wallet-address'] || req.query.walletAddress
  });

  // Capture the start time
  const start = Date.now();
  
  // Override the response end method to log the response
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    // Calculate response time
    const responseTime = Date.now() - start;
    
    // Log the response
    logger.info(`API Response`, {
      requestId,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`
    });
    
    // Call the original end method
    return originalEnd.call(this, chunk, encoding);
  };
  
  next();
};

module.exports = loggerMiddleware; 