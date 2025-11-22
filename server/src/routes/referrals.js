const express = require('express');
const router = express.Router();
const {
  createReferralProgram,
  updatePaymentMethod,
  getReferralStats,
  requestWithdrawal,
  getAllWithdrawals,
  processWithdrawal,
  getAllReferralPrograms,
  updateReferralFlag,
  recordManualPayment,
} = require('../controllers/referralController');
const { authenticateJWT } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/rbac');

// User routes (require authentication)
router.use(authenticateJWT);

router.get('/program', createReferralProgram);
router.patch('/payment-method', updatePaymentMethod);
router.get('/stats', getReferralStats);
router.post('/withdraw', requestWithdrawal);

// Admin routes
router.get('/admin/programs', requireAdmin, getAllReferralPrograms);
router.get('/admin/withdrawals', requireAdmin, getAllWithdrawals);
router.patch('/admin/withdrawals/:referralId/:withdrawalId', requireAdmin, processWithdrawal);
router.patch('/admin/programs/:referralId/flag', requireAdmin, updateReferralFlag);
router.post('/admin/programs/:referralId/payment', requireAdmin, recordManualPayment);

module.exports = router;

