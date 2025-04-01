import { Router } from 'express';
// Using require instead of import to fix TypeScript issues with JS modules
const TokenController = require('../controllers/TokenController');
const { upload } = require('../utils/fileUpload');
const { getCurrentWallet } = require('../middleware/auth');

const router = Router();

// Apply authentication middleware to all routes
router.use(getCurrentWallet);

// Configure file upload fields for token creation
const tokenUploadFields = [
  { name: 'icon', maxCount: 1 },
  { name: 'distributions_csv', maxCount: 1 }
];

// Token configuration routes
router.post('/tokens', upload.fields(tokenUploadFields), TokenController.createToken);
router.get('/tokens', TokenController.getTokens);
router.get('/tokens/:id', TokenController.getTokenById);
router.post('/tokens/:id/deploy', TokenController.deployToken);

// Add route for getting tokens held by a specific user
router.get('/users/:walletAddress/tokens', TokenController.getUserTokens);

// CSV upload and processing route
router.post('/distributions/csv', upload.single('distributions_csv'), TokenController.uploadDistributionsCSV);

export default router; 