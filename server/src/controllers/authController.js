const { User } = require('../models');
const { generateToken } = require('../services/jwt');
const { generateOTP, verifyOTP } = require('../services/otp');
const { trackReferral } = require('./referralController');
const logger = require('../services/logger');
const geoip = require('geoip-lite');

/**
 * Register new user
 */
const register = async (req, res) => {
  try {
    const { name, email, phone, password, roles, deviceFingerprint, deviceInfo } = req.body;

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

    // Capture IP address (handle various proxy scenarios)
    const ipAddress = req.headers['x-forwarded-for']?.split(',')[0].trim() || 
                     req.headers['x-real-ip'] || 
                     req.ip || 
                     req.connection.remoteAddress || 
                     'unknown';

    // STRICT DEVICE AND IP LIMIT CHECKS
    // Only allow registration if limits are not exceeded
    const MAX_USERS_PER_IP = 2;
    const MAX_USERS_PER_DEVICE = 1;

    // Skip these checks for local/development IPs
    const isLocalIP = ipAddress.includes('127.0.0.1') || 
                      ipAddress.includes('localhost') || 
                      ipAddress.includes('::1') ||
                      ipAddress.startsWith('192.168.') ||
                      ipAddress.startsWith('10.') ||
                      ipAddress.startsWith('172.');

    // ETHIOPIA-ONLY REGISTRATION - IP GEOLOCATION CHECK
    // Check if user is from Ethiopia, but be lenient with unknown IPs
    if (!isLocalIP) {
      const geo = geoip.lookup(ipAddress);
      
      if (!geo) {
        // IP lookup failed - this could be due to incomplete database, not necessarily VPN/Proxy
        // Allow registration but log it for monitoring
        logger.warn(`⚠️ IP geolocation lookup failed - allowing registration but logging for review`);
        logger.warn(`   IP: ${ipAddress}`);
        logger.warn(`   Email: ${email}`);
        logger.warn(`   Note: This could be a new IP range not in the geoip database`);
      } else {
        // Check if IP is from Ethiopia
        const isEthiopianIP = geo.country === 'ET'; // Ethiopia country code
        
        if (!isEthiopianIP) {
          logger.error(`🚫 Registration BLOCKED: Non-Ethiopian IP detected`);
          logger.error(`   IP: ${ipAddress}`);
          logger.error(`   Country: ${geo.country} (${geo.region})`);
          logger.error(`   Email: ${email}`);
          return res.status(403).json({
            error: true,
            message: 'Registration is only available for users in Ethiopia. Your location has been detected as outside Ethiopia.',
            code: 'NON_ETHIOPIAN_IP'
          });
        }

        logger.info(`✅ IP Geolocation check PASSED - Ethiopian IP confirmed: ${geo.country} - ${geo.region} - ${geo.city}`);
      }
    } else {
      logger.warn(`⚠️ Local IP detected - skipping geolocation check for development: ${ipAddress}`);
    }

    // Log warning if fingerprint is missing but don't block (privacy-conscious users)
    if (!isLocalIP && (!deviceFingerprint || deviceFingerprint === 'unknown')) {
      logger.warn(`⚠️ Registration with missing/unknown device fingerprint - allowing but logging`);
      logger.warn(`   IP: ${ipAddress}, Fingerprint: ${deviceFingerprint}`);
      logger.warn(`   Email: ${email}`);
      // Use user-agent as fallback fingerprint
      const fallbackFingerprint = req.headers['user-agent'] || 'no-fingerprint';
      // Continue with registration using fallback
    }

    if (!isLocalIP) {
      // Use user-agent as fallback if fingerprint is missing
      const effectiveFingerprint = (deviceFingerprint && deviceFingerprint !== 'unknown') 
        ? deviceFingerprint 
        : req.headers['user-agent'] || 'no-fingerprint';

      // Check 1: Device fingerprint limit (only if we have a valid fingerprint)
      if (effectiveFingerprint !== 'no-fingerprint') {
        const deviceCount = await User.countDocuments({
          'registrationMetadata.deviceFingerprint': effectiveFingerprint
        });

        logger.info(`🔍 Device fingerprint check: ${effectiveFingerprint.substring(0, 20)}... has ${deviceCount} existing registrations`);

        if (deviceCount >= MAX_USERS_PER_DEVICE) {
          logger.error(`🚫 Registration BLOCKED: Device fingerprint already used (${deviceCount} users)`);
          logger.error(`   Device: ${effectiveFingerprint.substring(0, 30)}...`);
          logger.error(`   IP: ${ipAddress}`);
          logger.error(`   Attempted email: ${email}`);
          return res.status(403).json({
            error: true,
            message: 'This device has already been used to register an account. Only one account per device is allowed.',
            code: 'DEVICE_LIMIT_EXCEEDED'
          });
        }
      } else {
        logger.warn(`⚠️ Skipping device fingerprint check - no valid fingerprint available`);
      }

      // Check 2: IP address limit (GLOBAL - across entire platform)
      const ipCount = await User.countDocuments({
        'registrationMetadata.ipAddress': ipAddress
      });

      logger.info(`🔍 IP address check: ${ipAddress} has ${ipCount} existing registrations`);

      if (ipCount >= MAX_USERS_PER_IP) {
        logger.error(`🚫 Registration BLOCKED: IP address limit exceeded (${ipCount} users)`);
        logger.error(`   IP: ${ipAddress}`);
        logger.error(`   Device: ${effectiveFingerprint.substring(0, 30)}...`);
        logger.error(`   Attempted email: ${email}`);
        return res.status(403).json({
          error: true,
          message: 'Maximum number of accounts from this network has been reached. Only 2 accounts per network are allowed.',
          code: 'IP_LIMIT_EXCEEDED'
        });
      }

      logger.info(`✅ Device and IP limits check PASSED - IP: ${ipCount}/${MAX_USERS_PER_IP}`);
    } else {
      logger.warn(`⚠️ Local IP detected - skipping device/IP limits for development: ${ipAddress}`);
      logger.warn(`   Fingerprint: ${deviceFingerprint}`);
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

    // Prepare registration metadata with fallback fingerprint
    const effectiveFingerprint = (deviceFingerprint && deviceFingerprint !== 'unknown') 
      ? deviceFingerprint 
      : req.headers['user-agent'] || 'no-fingerprint';

    const registrationData = {
      ipAddress: ipAddress,
      deviceFingerprint: effectiveFingerprint,
      userAgent: req.headers['user-agent'] || 'unknown',
      deviceInfo: deviceInfo || {},
      registeredAt: new Date(),
    };

    // Track referral if present
    const referralCode = req.body.referralCode;
    if (referralCode) {
      // Update user with referral info and metadata
      user.referredBy = referralCode;
      user.registrationMetadata = registrationData;
      await user.save();

      // Track in referral system with fraud detection
      logger.info(`Tracking referral for user ${user._id} with code ${referralCode}`);
      logger.info(`IP: ${registrationData.ipAddress}, Fingerprint: ${registrationData.deviceFingerprint.substring(0, 30)}...`);
      
      trackReferral(referralCode, user._id, registrationData).catch(err => 
        logger.error('Failed to track referral:', err)
      );
    } else {
      // Even without referral, store basic registration metadata
      user.registrationMetadata = registrationData;
      await user.save();
    }

    // Generate token
    const token = generateToken(user._id);

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    logger.info(`User registered: ${user.email} from IP: ${ipAddress}`);

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

