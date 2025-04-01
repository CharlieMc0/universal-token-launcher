const multer = require('multer');
const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');
const { ethers } = require('ethers');

// Create upload directories if they don't exist
const uploadDir = path.join(__dirname, '../../uploads');
const iconDir = path.join(uploadDir, 'icons');
const csvDir = path.join(uploadDir, 'csv');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}
if (!fs.existsSync(iconDir)) {
  fs.mkdirSync(iconDir);
}
if (!fs.existsSync(csvDir)) {
  fs.mkdirSync(csvDir);
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.fieldname === 'icon') {
      cb(null, iconDir);
    } else if (file.fieldname === 'distributions_csv') {
      cb(null, csvDir);
    } else {
      cb(new Error('Invalid file field'));
    }
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// File filter function
const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'icon') {
    // Accept only image files
    const filetypes = /jpeg|jpg|png|gif|svg/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      return cb(new Error('Invalid image format! Only jpeg, jpg, png, gif, and svg are allowed.'));
    }
  } else if (file.fieldname === 'distributions_csv') {
    // Accept only CSV files
    const filetypes = /csv/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

    if (extname) {
      return cb(null, true);
    } else {
      return cb(new Error('Invalid file format! Only CSV files are allowed.'));
    }
  } else {
    return cb(new Error('Unexpected file field'));
  }
};

// Configure upload middleware
let uploadMiddleware;
try {
  uploadMiddleware = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
  });
} catch (error) {
  console.error('Error initializing multer:', error);
  // Fallback for tests
  uploadMiddleware = {
    single: () => (req, res, next) => next(),
    fields: () => (req, res, next) => next()
  };
}

/**
 * Basic CSV validation function to check if CSV has required columns
 * @param {Array} records - Parsed CSV records
 * @returns {Object} - Validation result with isValid and error
 */
const validateCSV = (records) => {
  if (!records || records.length === 0) {
    return { isValid: false, error: 'CSV file is empty' };
  }

  const firstRecord = records[0];
  const requiredColumns = ['recipient_address', 'chain_id', 'token_amount'];

  // Check if required columns exist
  const missingColumns = requiredColumns.filter(column => !firstRecord.hasOwnProperty(column));
  
  if (missingColumns.length > 0) {
    return { 
      isValid: false, 
      error: `CSV is missing required columns: ${missingColumns.join(', ')}` 
    };
  }

  return { isValid: true };
};

/**
 * Validate a single distribution entry
 * @param {Object} entry - Distribution entry to validate
 * @returns {Object} - Validation result with isValid and error
 */
const validateDistributionEntry = (entry) => {
  // Check recipient address
  if (!entry.recipient_address) {
    return { 
      isValid: false, 
      error: `Missing recipient address` 
    };
  }
  
  // In ethers v6, address validation is much stricter with checksum
  // If an address has mixed case (upper and lowercase), it MUST follow the EIP-55 standard
  // See: https://eips.ethereum.org/EIPS/eip-55
  //
  // For most use cases, it's safer to use lowercase addresses to avoid checksum issues,
  // or ensure mixed-case addresses properly follow the EIP-55 standard.
  try {
    // For addresses with mixed case, ethers.getAddress will validate the checksum
    // For lowercase/uppercase addresses, we can just check the format directly
    const addr = entry.recipient_address.toLowerCase();
    
    // Basic format check: 0x followed by 40 hex characters
    if (!addr.match(/^0x[0-9a-f]{40}$/)) {
      return { 
        isValid: false, 
        error: `Invalid recipient address format: ${entry.recipient_address}` 
      };
    }
    
    // If the original address had mixed case, validate the checksum
    if (entry.recipient_address !== addr && entry.recipient_address !== entry.recipient_address.toUpperCase()) {
      try {
        // ethers.getAddress will throw an error if the checksum is invalid
        ethers.getAddress(entry.recipient_address);
      } catch (error) {
        return { 
          isValid: false, 
          error: `Invalid address checksum: ${entry.recipient_address}` 
        };
      }
    }
  } catch (error) {
    return { 
      isValid: false, 
      error: `Invalid recipient address: ${entry.recipient_address}` 
    };
  }

  // Check chain ID
  if (!entry.chain_id || isNaN(parseInt(entry.chain_id))) {
    return { 
      isValid: false, 
      error: `Invalid chain ID: ${entry.chain_id}` 
    };
  }

  // Check token amount
  if (!entry.token_amount || isNaN(parseFloat(entry.token_amount)) || parseFloat(entry.token_amount) <= 0) {
    return { 
      isValid: false, 
      error: `Invalid token amount: ${entry.token_amount}` 
    };
  }

  return { isValid: true };
};

/**
 * Parse a CSV file into JSON with validation
 * @param {string} filePath - Path to CSV file
 * @returns {Promise<Array>} - Parsed CSV data as distribution objects
 */
const parseCSV = async (filePath) => {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(filePath)) {
      return reject(new Error(`File not found: ${filePath}`));
    }
    
    const results = [];
    
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => {
        // Validate CSV structure
        const structureValidation = validateCSV(results);
        if (!structureValidation.isValid) {
          return reject(new Error(structureValidation.error));
        }
        
        resolve(results);
      })
      .on('error', (error) => {
        reject(new Error(`Error parsing CSV: ${error.message}`));
      });
  });
};

/**
 * Process a distributions CSV file and convert it to a valid format for token configuration
 * @param {string} filePath - Path to CSV file
 * @returns {Promise<Array>} - Array of valid distribution objects
 */
const processDistributionsFile = async (filePath) => {
  try {
    // Parse the CSV file
    const records = await parseCSV(filePath);
    
    // Validate and transform each record
    const validatedRecords = [];
    const errors = [];
    
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const validation = validateDistributionEntry(record);
      
      if (validation.isValid) {
        validatedRecords.push({
          recipient_address: record.recipient_address,
          chain_id: record.chain_id,
          token_amount: record.token_amount
        });
      } else {
        errors.push({
          row: i + 2, // +2 for header row and 1-indexing
          error: validation.error
        });
      }
    }
    
    // If there were any errors, attach them to the result for reporting
    if (errors.length > 0) {
      console.warn(`Found ${errors.length} invalid entries in CSV file:`);
      errors.forEach(err => console.warn(`  Row ${err.row}: ${err.error}`));
    }
    
    return {
      distributions: validatedRecords,
      errors: errors,
      totalRows: records.length,
      validRows: validatedRecords.length
    };
  } catch (error) {
    throw error;
  }
};

module.exports = {
  upload: uploadMiddleware,
  parseCSV,
  processDistributionsFile,
  validateCSV,
  validateDistributionEntry,
  getIconUrl: (filename) => `/uploads/icons/${filename}`,
  getCsvPath: (filename) => path.join(csvDir, filename)
}; 