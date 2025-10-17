const express = require('express');
const router = express.Router();
const {
  createDispute,
  getDisputeById,
  getMyDisputes,
  addDisputeComment,
} = require('../controllers/disputeController');
const { authenticateJWT } = require('../middleware/auth');
const {
  createDisputeValidation,
  mongoIdValidation,
  paginationValidation,
} = require('../middleware/validation');

// All dispute routes require authentication
router.use(authenticateJWT);

router.post('/', createDisputeValidation, createDispute);
router.get('/my-disputes', paginationValidation, getMyDisputes);
router.get('/:id', mongoIdValidation, getDisputeById);
router.post('/:id/comments', mongoIdValidation, addDisputeComment);

module.exports = router;

