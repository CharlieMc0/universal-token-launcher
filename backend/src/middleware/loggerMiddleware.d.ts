import { Request, Response, NextFunction } from 'express';

/**
 * Express middleware for logging API requests and responses
 */
export default function loggerMiddleware(
  req: Request, 
  res: Response, 
  next: NextFunction
): void; 