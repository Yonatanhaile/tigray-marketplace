const { body, param, query, validationResult } = require('express-validator');

/**
 * Middleware to check validation results
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: true,
      message: 'Validation failed',
      details: errors.array().map(err => ({
        field: err.param,
        message: err.msg,
      })),
    });
  }
  
  next();
};

/**
 * Validation rules for user registration
 */
const registerValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Must be a valid email')
    .normalizeEmail(),
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone is required')
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage('Must be a valid phone number'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),
  validate,
];

/**
 * Validation rules for login
 */
const loginValidation = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Must be a valid email')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  validate,
];

/**
 * Validation rules for OTP send
 */
const otpSendValidation = [
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone is required')
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage('Must be a valid phone number'),
  validate,
];

/**
 * Validation rules for OTP verify
 */
const otpVerifyValidation = [
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone is required'),
  body('otp')
    .trim()
    .notEmpty()
    .withMessage('OTP is required')
    .isLength({ min: 6, max: 6 })
    .withMessage('OTP must be 6 digits'),
  validate,
];

/**
 * Validation rules for creating listing
 */
const createListingValidation = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 200 })
    .withMessage('Title cannot exceed 200 characters'),
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ max: 5000 })
    .withMessage('Description cannot exceed 5000 characters'),
  body('price')
    .notEmpty()
    .withMessage('Price is required')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  body('payment_methods')
    .isArray({ min: 1 })
    .withMessage('At least one payment method is required'),
  body('images')
    .optional()
    .isArray()
    .withMessage('Images must be an array'),
  validate,
];

/**
 * Validation rules for creating order
 */
const createOrderValidation = [
  body('listingId')
    .notEmpty()
    .withMessage('Listing ID is required')
    .isMongoId()
    .withMessage('Invalid listing ID'),
  body('selected_payment_method')
    .notEmpty()
    .withMessage('Payment method is required'),
  body('meeting_info.date')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format'),
  validate,
];

/**
 * Validation rules for creating dispute
 */
const createDisputeValidation = [
  body('orderId')
    .notEmpty()
    .withMessage('Order ID is required')
    .isMongoId()
    .withMessage('Invalid order ID'),
  body('reason')
    .trim()
    .notEmpty()
    .withMessage('Reason is required')
    .isLength({ max: 2000 })
    .withMessage('Reason cannot exceed 2000 characters'),
  body('category')
    .optional()
    .isIn(['payment_not_received', 'item_not_received', 'item_not_as_described', 'counterfeit', 'safety_concern', 'other'])
    .withMessage('Invalid category'),
  validate,
];

/**
 * Validation for MongoDB ObjectId params
 */
const mongoIdValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid ID format'),
  validate,
];

/**
 * Validation for pagination queries
 */
const paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  validate,
];

module.exports = {
  validate,
  registerValidation,
  loginValidation,
  otpSendValidation,
  otpVerifyValidation,
  createListingValidation,
  createOrderValidation,
  createDisputeValidation,
  mongoIdValidation,
  paginationValidation,
};

