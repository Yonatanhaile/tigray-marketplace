const { User } = require('../models');
const { generateToken } = require('../services/jwt');
const { generateOTP, verifyOTP } = require('../services/otp');
const { trackReferral } = require('./referralController');
const logger = require('../services/logger');

/**
 * Register new user
 */
const register = async (req, res) => {
  try {
    const { name, email, phone, password, roles } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { phone }],
    });

    if (existingUser) {
      return res.status(400).json({
        error: true,
        message: 'User with this email or phone already exists.',
      });
    }

    // Hash password
    const passwordHash = await User.hashPassword(password);

    // Create user
    const user = await User.create({
      name,
      email,
      phone,
      passwordHash,
      roles: roles || ['buyer', 'seller'], // All users are both buyers and sellers by default
    });

    // Track referral if present
    const referralCode = req.body.referralCode;
    if (referralCode) {
      const registrationData = {
        ipAddress: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        deviceFingerprint: req.headers['user-agent'] || 'unknown',
      };

      // Update user with referral info
      user.referredBy = referralCode;
      user.registrationMetadata = {
        ...registrationData,
        userAgent: req.headers['user-agent'],
        registeredAt: new Date(),
      };
      await user.save();

      // Track in referral system (async, don't wait)
      trackReferral(referralCode, user._id, registrationData).catch(err => 
        logger.error('Failed to track referral:', err)
      );
    }

    // Generate token
    const token = generateToken(user._id);

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    logger.info(`User registered: ${user.email}`);

    res.status(201).json({
      error: false,
      message: 'User registered successfully',
      user: user.profile,
      token,
    });
  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({
      error: true,
      message: 'Registration failed',
      details: error.message,
    });
  }
};

/**
 * Login user with email and password
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user with password field
    const user = await User.findOne({ email }).select('+passwordHash');

    if (!user) {
      return res.status(401).json({
        error: true,
        message: 'Invalid email or password.',
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({
        error: true,
        message: 'Account is inactive. Please contact support.',
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        error: true,
        message: 'Invalid email or password.',
      });
    }

    // Generate token
    const token = generateToken(user._id);

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    logger.info(`User logged in: ${user.email}`);

    res.status(200).json({
      error: false,
      message: 'Login successful',
      user: user.profile,
      token,
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({
      error: true,
      message: 'Login failed',
      details: error.message,
    });
  }
};

/**
 * Send OTP to phone number
 */
const sendOTP = async (req, res) => {
  try {
    const { phone } = req.body;

    const result = await generateOTP(phone);

    res.status(200).json({
      error: false,
      message: 'OTP sent successfully',
      expiresAt: result.expiresAt,
      // Include OTP in development mode
      ...(process.env.NODE_ENV === 'development' && result.otp && { otp: result.otp }),
    });
  } catch (error) {
    logger.error('OTP send error:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to send OTP',
      details: error.message,
    });
  }
};

/**
 * Verify OTP and login/register user
 */
const verifyOTPHandler = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    const result = await verifyOTP(phone, otp);

    if (!result.success) {
      return res.status(400).json({
        error: true,
        message: result.message,
        attemptsRemaining: result.attemptsRemaining,
      });
    }

    // Find or create user
    let user = await User.findOne({ phone });

    if (!user) {
      // Auto-register user with phone number
      user = await User.create({
        phone,
        name: `User ${phone.slice(-4)}`,
        email: `${phone}@temp.local`, // Temporary email
        roles: ['buyer'],
      });
      logger.info(`New user auto-registered via OTP: ${phone}`);
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({
        error: true,
        message: 'Account is inactive. Please contact support.',
      });
    }

    // Generate token
    const token = generateToken(user._id);

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    logger.info(`User verified via OTP: ${phone}`);

    res.status(200).json({
      error: false,
      message: 'OTP verified successfully',
      user: user.profile,
      token,
    });
  } catch (error) {
    logger.error('OTP verify error:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to verify OTP',
      details: error.message,
    });
  }
};

/**
 * Get current user profile
 */
const getProfile = async (req, res) => {
  try {
    res.status(200).json({
      error: false,
      user: req.user.profile,
    });
  } catch (error) {
    logger.error('Get profile error:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to get profile',
      details: error.message,
    });
  }
};

/**
 * Update user profile
 */
const updateProfile = async (req, res) => {
  try {
    const { name, phone, profileImage } = req.body;
    
    logger.info(`Update profile request for user ${req.userId}`);
    logger.info(`Request body:`, { name, phone, profileImage: !!profileImage });
    
    const user = await User.findById(req.userId);
    if (!user) {
      logger.error(`User not found: ${req.userId}`);
      return res.status(404).json({
        error: true,
        message: 'User not found',
      });
    }

    logger.info(`Current user data:`, { 
      name: user.name, 
      phone: user.phone, 
      hasProfileImage: !!user.profileImage 
    });

    // Update fields
    if (name !== undefined) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (profileImage !== undefined) {
      user.profileImage = profileImage;
    }

    logger.info(`Updated user data:`, { 
      name: user.name, 
      phone: user.phone, 
      hasProfileImage: !!user.profileImage 
    });

    await user.save();

    logger.info(`✅ Profile updated successfully for user ${req.userId}`);

    res.status(200).json({
      error: false,
      message: 'Profile updated successfully',
      user: user.profile,
    });
  } catch (error) {
    logger.error('❌ Update profile error:', error);
    logger.error('Error name:', error.name);
    logger.error('Error message:', error.message);
    
    // Check for validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(e => e.message);
      logger.error('Validation errors:', validationErrors);
      
      return res.status(400).json({
        error: true,
        message: 'Validation failed',
        details: validationErrors.join(', '),
      });
    }
    
    res.status(500).json({
      error: true,
      message: 'Failed to update profile',
      details: error.message,
    });
  }
};

module.exports = {
  register,
  login,
  sendOTP,
  verifyOTPHandler,
  getProfile,
  updateProfile,
};

