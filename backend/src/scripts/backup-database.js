/**
 * Database Backup Script
 * 
 * This script creates a backup of the database schema and optionally data.
 * Requires pg_dump to be installed and accessible on the system.
 */

require('dotenv').config();
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const { URL } = require('url');

// Parse DATABASE_URL to get connection details
function getDatabaseConnectionInfo() {
  const dbUrl = process.env.DATABASE_URL;
  
  if (!dbUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  
  try {
    const url = new URL(dbUrl);
    return {
      host: url.hostname,
      port: url.port || '5432',
      database: url.pathname.substring(1), // Remove leading '/'
      username: url.username,
      password: url.password
    };
  } catch (error) {
    throw new Error(`Invalid DATABASE_URL: ${error.message}`);
  }
}

function createBackupDirectory() {
  const backupDir = path.resolve(__dirname, '../../backups');
  
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
    console.log(`Created backup directory: ${backupDir}`);
  }
  
  return backupDir;
}

function backupDatabase(includeData = false) {
  try {
    const { host, port, database, username, password } = getDatabaseConnectionInfo();
    const backupDir = createBackupDirectory();
    
    // Create a timestamped filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupType = includeData ? 'full' : 'schema';
    const filename = `${database}_${backupType}_${timestamp}.sql`;
    const filePath = path.join(backupDir, filename);
    
    // Set password as environment variable to avoid it appearing in process list
    const env = { ...process.env, PGPASSWORD: password };
    
    // Build the pg_dump command
    let command = `pg_dump -h ${host} -p ${port} -U ${username} -d ${database} `;
    
    // Add schema-only flag if not including data
    if (!includeData) {
      command += '--schema-only ';
    }
    
    command += `--file="${filePath}"`;
    
    // Execute the backup command
    console.log(`Creating ${backupType} backup of database ${database}...`);
    execSync(command, { env, stdio: ['ignore', 'pipe', 'pipe'] });
    
    console.log(`✅ Backup created successfully: ${filePath}`);
    return filePath;
  } catch (error) {
    console.error(`❌ Error backing up database: ${error.message}`);
    throw error;
  }
}

// Run the function if this script is executed directly
if (require.main === module) {
  // Check if the --with-data flag is provided
  const includeData = process.argv.includes('--with-data');
  
  backupDatabase(includeData)
    .then((filePath) => {
      console.log(`Database backup saved to: ${filePath}`);
      process.exit(0);
    })
    .catch(error => {
      console.error(`Database backup failed: ${error}`);
      process.exit(1);
    });
}

module.exports = { backupDatabase }; 