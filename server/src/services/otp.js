const { OTP } = require('../models');
const logger = require('./logger');

const OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES) || 5;
const OTP_DEV_MODE = process.env.OTP_DEV_MODE === 'true' || process.env.NODE_ENV === 'development';
const MAX_ATTEMPTS = 3;

/**
 * Generate and save OTP for phone number
 */
const generateOTP = async (phone) => {
  try {
    // Generate 6-digit OTP
    const otpCode = OTP.generateOTP();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    // Delete any existing OTPs for this phone
    await OTP.deleteMany({ phone, verified: false });

    // Create new OTP
    const otp = await OTP.create({
      phone,
      otp: otpCode,
      expiresAt,
    });

    // In development mode, log OTP to console
    if (OTP_DEV_MODE) {
      logger.info(`🔐 OTP for ${phone}: ${otpCode} (expires in ${OTP_EXPIRY_MINUTES} minutes)`);
    } else {
      // In production, send via SMS service (Twilio, etc.)
      // await sendSMS(phone, `Your verification code is: ${otpCode}`);
      logger.info(`OTP sent to ${phone}`);
    }

    return {
      success: true,
      expiresAt,
      // Return OTP only in dev mode
      ...(OTP_DEV_MODE && { otp: otpCode }),
    };
  } catch (error) {
    logger.error('Error generating OTP:', error);
    throw error;
  }
};

/**
 * Verify OTP for phone number
 */
const verifyOTP = async (phone, otpCode) => {
  try {
    // Find the most recent unverified OTP for this phone
    const otpRecord = await OTP.findOne({
      phone,
      verified: false,
    }).sort({ createdAt: -1 });

    if (!otpRecord) {
      return {
        success: false,
        message: 'OTP not found or already verified.',
      };
    }

    // Check if expired
    if (otpRecord.isExpired()) {
      await otpRecord.deleteOne();
      return {
        success: false,
        message: 'OTP has expired. Please request a new one.',
      };
    }

    // Check max attempts
    if (otpRecord.attempts >= MAX_ATTEMPTS) {
      await otpRecord.deleteOne();
      return {
        success: false,
        message: 'Maximum verification attempts exceeded. Please request a new OTP.',
      };
    }

    // Verify OTP
    if (otpRecord.otp !== otpCode) {
      await otpRecord.incrementAttempts();
      return {
        success: false,
        message: 'Invalid OTP.',
        attemptsRemaining: MAX_ATTEMPTS - otpRecord.attempts - 1,
      };
    }

    // Mark as verified
    otpRecord.verified = true;
    await otpRecord.save();

    // Clean up old OTPs for this phone
    await OTP.deleteMany({
      phone,
      _id: { $ne: otpRecord._id },
    });

    return {
      success: true,
      message: 'OTP verified successfully.',
    };
  } catch (error) {
    logger.error('Error verifying OTP:', error);
    throw error;
  }
};

/**
 * Placeholder for SMS sending (integrate Twilio, AWS SNS, etc.)
 */
const sendSMS = async (phone, message) => {
  // TODO: Integrate with SMS service
  // Example with Twilio:
  // const client = require('twilio')(accountSid, authToken);
  // await client.messages.create({
  //   body: message,
  //   from: twilioPhoneNumber,
  //   to: phone,
  // });
  
  logger.info(`SMS would be sent to ${phone}: ${message}`);
};

module.exports = {
  generateOTP,
  verifyOTP,
  sendSMS,
};

