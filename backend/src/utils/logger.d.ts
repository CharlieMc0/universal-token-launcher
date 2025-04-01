import { Logger } from 'winston';

export const logger: Logger;
export const deploymentLogger: Logger;

/**
 * Log deployment activity with structured metadata
 * @param {string} action - The action being performed (e.g., 'deploy', 'verify')
 * @param {string|number} tokenId - The token ID
 * @param {string|number} chainId - The chain ID
 * @param {string} status - The status of the operation
 * @param {Record<string, any>} metadata - Additional metadata
 */
export function logDeployment(
  action: string, 
  tokenId: string | number, 
  chainId: string | number, 
  status: string, 
  metadata?: Record<string, any>
): void; 