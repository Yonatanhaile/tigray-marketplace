const express = require('express');
const router = express.Router();
const {
  getUploadSignature,
  validateUpload,
} = require('../controllers/uploadController');
const { authenticateJWT } = require('../middleware/auth');

// All upload routes require authentication
router.use(authenticateJWT);

router.post('/sign', getUploadSignature);
router.post('/validate', validateUpload);

module.exports = router;

