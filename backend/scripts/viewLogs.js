/**
 * Log Viewer Utility
 * 
 * This script helps to view and search through application logs.
 * 
 * Usage:
 *   View all logs:
 *     node viewLogs.js
 *   
 *   View specific log file:
 *     node viewLogs.js --file=deployment.log
 *   
 *   Search for specific token:
 *     node viewLogs.js --search=tokenId:123
 *   
 *   View logs for a specific date range:
 *     node viewLogs.js --from=2023-01-01 --to=2023-01-31
 *   
 *   Combine options:
 *     node viewLogs.js --file=deployment.log --search=tokenId:123 --from=2023-01-01
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Parse command line arguments
const args = process.argv.slice(2).reduce((acc, arg) => {
  if (arg.startsWith('--')) {
    const [key, value] = arg.slice(2).split('=');
    acc[key] = value || true;
  }
  return acc;
}, {});

// Default log file
const logFile = args.file || 'deployment.log';
const logPath = path.join(__dirname, '..', 'logs', logFile);

// Check if log file exists
if (!fs.existsSync(logPath)) {
  console.error(`Log file not found: ${logPath}`);
  console.log('Available log files:');
  
  const logsDir = path.join(__dirname, '..', 'logs');
  if (fs.existsSync(logsDir)) {
    const files = fs.readdirSync(logsDir);
    files.forEach(file => console.log(`  - ${file}`));
  } else {
    console.log('  No log files found. The logs directory does not exist.');
  }
  
  process.exit(1);
}

// Parse search parameter
let searchKey, searchValue;
if (args.search) {
  const searchParts = args.search.split(':');
  if (searchParts.length === 2) {
    [searchKey, searchValue] = searchParts;
  } else {
    searchValue = args.search;
  }
}

// Parse date range
const fromDate = args.from ? new Date(args.from) : null;
const toDate = args.to ? new Date(args.to) : null;

// Create interface to read the file line by line
const rl = readline.createInterface({
  input: fs.createReadStream(logPath),
  crlfDelay: Infinity
});

console.log(`Viewing logs from ${logFile}${args.search ? ` matching "${args.search}"` : ''}${fromDate ? ` from ${fromDate.toISOString().split('T')[0]}` : ''}${toDate ? ` to ${toDate.toISOString().split('T')[0]}` : ''}\n`);

let matchCount = 0;

// Process each line
rl.on('line', (line) => {
  try {
    // Parse the JSON log entry
    const logEntry = JSON.parse(line);
    
    // Check date range if specified
    if (fromDate || toDate) {
      const logDate = new Date(logEntry.timestamp);
      if (fromDate && logDate < fromDate) return;
      if (toDate && logDate > toDate) return;
    }
    
    // Check search criteria if specified
    if (searchKey && searchValue) {
      // Search in nested properties
      const nestedValue = getNestedProperty(logEntry, searchKey);
      if (nestedValue === undefined || !String(nestedValue).includes(searchValue)) {
        return;
      }
    } else if (searchValue) {
      // Search in entire log entry
      if (!JSON.stringify(logEntry).includes(searchValue)) {
        return;
      }
    }
    
    // Format and print the log entry
    const timestamp = new Date(logEntry.timestamp).toISOString();
    const level = logEntry.level.toUpperCase().padEnd(5);
    
    // Extract main message
    const message = logEntry.message || '';
    
    // Format metadata
    const metadata = { ...logEntry };
    delete metadata.message;
    delete metadata.timestamp;
    delete metadata.level;
    delete metadata.service;
    
    // Print the log entry
    console.log(`[${timestamp}] ${level} ${message}`);
    
    // Print metadata if any
    if (Object.keys(metadata).length > 0) {
      console.log('  Metadata:');
      Object.entries(metadata).forEach(([key, value]) => {
        // Handle nested objects and arrays
        if (typeof value === 'object' && value !== null) {
          console.log(`    ${key}:`);
          Object.entries(value).forEach(([subKey, subValue]) => {
            console.log(`      ${subKey}: ${JSON.stringify(subValue)}`);
          });
        } else {
          console.log(`    ${key}: ${JSON.stringify(value)}`);
        }
      });
    }
    
    console.log(''); // Add empty line for readability
    matchCount++;
  } catch (error) {
    // Skip lines that are not valid JSON
    console.error(`Error parsing log entry: ${error.message}`);
  }
});

rl.on('close', () => {
  console.log(`Found ${matchCount} matching log entries.`);
});

/**
 * Get a nested property from an object using dot notation
 * @param {Object} obj - The object to extract from
 * @param {string} path - The property path using dot notation (e.g., "tokenId" or "status.code")
 * @returns {any} The property value or undefined if not found
 */
function getNestedProperty(obj, path) {
  return path.split('.').reduce((prev, curr) => {
    return prev && prev[curr] !== undefined ? prev[curr] : undefined;
  }, obj);
} 