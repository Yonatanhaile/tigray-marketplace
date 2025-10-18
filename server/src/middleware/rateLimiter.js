const rateLimit = require('express-rate-limit');

/**
 * Rate limiter for authentication endpoints
 * Uses composite key (IP + email/phone) to prevent global blocking
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Increased from 5 to 10 for better UX
  message: {
    error: true,
    message: 'Too many authentication attempts. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Use IP + identifier (email/phone) as key to scope per user
  keyGenerator: (req) => {
    const identifier = req.body.email || req.body.phone || 'unknown';
    return `${req.ip}-${identifier}`;
  },
  // Custom handler to provide better error messages
  handler: (req, res) => {
    const identifier = req.body.email || req.body.phone;
    res.status(429).json({
      error: true,
      message: `Too many authentication attempts for ${identifier ? 'this account' : 'your IP'}. Please try again in 15 minutes.`,
    });
  },
});

/**
 * Rate limiter for OTP endpoints
 * Uses phone number as key to prevent abuse per phone
 */
const otpLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 3, // Limit each phone to 3 OTP requests per minute
  message: {
    error: true,
    message: 'Too many OTP requests. Please try again in a minute.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Use phone number as key to scope per user
  keyGenerator: (req) => {
    const phone = req.body.phone || req.ip;
    return `otp-${phone}`;
  },
  handler: (req, res) => {
    res.status(429).json({
      error: true,
      message: 'Too many OTP requests for this phone number. Please try again in 1 minute.',
    });
  },
});

/**
 * General API rate limiter
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: true,
    message: 'Too many requests. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Strict rate limiter for sensitive operations
 */
const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: {
    error: true,
    message: 'Rate limit exceeded. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  authLimiter,
  otpLimiter,
  apiLimiter,
  strictLimiter,
};

