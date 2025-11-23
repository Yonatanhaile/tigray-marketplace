const express = require('express');
const router = express.Router();
const {
  register,
  login,
  sendOTP,
  verifyOTPHandler,
  getProfile,
  updateProfile,
  sendEmailOTP,
  verifyEmailOTPAndRegister,
} = require('../controllers/authController');
const {
  registerValidation,
  loginValidation,
  otpSendValidation,
  otpVerifyValidation,
} = require('../middleware/validation');
const { authLimiter, otpLimiter } = require('../middleware/rateLimiter');
const { authenticateJWT } = require('../middleware/auth');

// Public routes with rate limiting
router.post('/register', authLimiter, registerValidation, register);
router.post('/login', authLimiter, loginValidation, login);
router.post('/otp/send', otpLimiter, otpSendValidation, sendOTP);
router.post('/otp/verify', authLimiter, otpVerifyValidation, verifyOTPHandler);

// Email OTP routes for email verification
router.post('/email-otp/send', otpLimiter, sendEmailOTP);
router.post('/email-otp/verify', authLimiter, verifyEmailOTPAndRegister);

// Protected routes
router.get('/profile', authenticateJWT, getProfile);
router.patch('/profile', authenticateJWT, updateProfile);

module.exports = router;

