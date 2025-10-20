const express = require('express');
const router = express.Router();
const {
  createOrder,
  getOrderById,
  getMyOrders,
  updateOrder,
  requestInvoice,
  getInvoice,
  getPendingOrdersCount,
} = require('../controllers/orderController');
const { authenticateJWT } = require('../middleware/auth');
const {
  createOrderValidation,
  mongoIdValidation,
  paginationValidation,
} = require('../middleware/validation');

// All order routes require authentication
router.use(authenticateJWT);

// Order routes
router.post('/', createOrderValidation, createOrder);
router.get('/my-orders', paginationValidation, getMyOrders);
router.get('/pending/count', getPendingOrdersCount); // Must be before /:id route
router.get('/:id', mongoIdValidation, getOrderById);
router.patch('/:id', mongoIdValidation, updateOrder);

// Invoice routes
router.post('/:id/invoice', mongoIdValidation, requestInvoice);
router.get('/:id/invoice', mongoIdValidation, getInvoice);

module.exports = router;

