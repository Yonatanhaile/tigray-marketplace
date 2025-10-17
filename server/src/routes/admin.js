const express = require('express');
const router = express.Router();
const {
  getAllOrders,
  getAllDisputes,
  updateDispute,
  updateKYC,
  getAllUsers,
  getStats,
  toggleUserStatus,
} = require('../controllers/adminController');
const { authenticateJWT } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/rbac');
const {
  mongoIdValidation,
  paginationValidation,
} = require('../middleware/validation');

// All admin routes require authentication and admin role
router.use(authenticateJWT, requireAdmin);

// Statistics
router.get('/stats', getStats);

// Orders
router.get('/orders', paginationValidation, getAllOrders);

// Disputes
router.get('/disputes', paginationValidation, getAllDisputes);
router.patch('/disputes/:id', mongoIdValidation, updateDispute);

// Users
router.get('/users', paginationValidation, getAllUsers);
router.patch('/users/:userId/status', toggleUserStatus);

// KYC
router.patch('/kyc/:userId', updateKYC);

module.exports = router;

