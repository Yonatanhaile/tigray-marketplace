const express = require('express');
const router = express.Router();
const {
  createMessage,
  getOrderMessages,
  getUnreadCount,
} = require('../controllers/messageController');
const { authenticateJWT } = require('../middleware/auth');
const { mongoIdValidation } = require('../middleware/validation');

// All message routes require authentication
router.use(authenticateJWT);

router.post('/', createMessage);
router.get('/unread-count', getUnreadCount);
router.get('/order/:id', mongoIdValidation, getOrderMessages);

module.exports = router;

