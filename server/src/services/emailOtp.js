const crypto = require('crypto');
const nodemailer = require('nodemailer');
const logger = require('./logger');

// In-memory store for development (use Redis in production)
const emailOtpStore = new Map();

const OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES) || 10;
const MAX_ATTEMPTS = 3;

// Configure email transporter
const createTransporter = () => {
  if (process.env.NODE_ENV === 'development' || !process.env.SMTP_HOST) {
    // Use ethereal.email for testing in development
    logger.warn('⚠️ Using development email mode - OTPs will be logged to console');
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

/**
 * Generate 6-digit OTP
 */
const generateOtpCode = () => {
  return crypto.randomInt(100000, 999999).toString();
};

/**
 * Send OTP email
 */
const sendOtpEmail = async (email, otpCode) => {
  const transporter = createTransporter();
  
  if (!transporter) {
    // Development mode - log to console
    logger.info(`📧 EMAIL OTP for ${email}: ${otpCode}`);
    logger.info(`   This OTP expires in ${OTP_EXPIRY_MINUTES} minutes`);
    return;
  }

  try {
    const mailOptions = {
      from: process.env.SMTP_FROM || '"Tigray Market" <noreply@tigraymarket.com>',
      to: email,
      subject: 'Verify Your Email - Tigray Market',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .otp-box { background: white; border: 2px dashed #667eea; border-radius: 10px; padding: 20px; text-align: center; margin: 20px 0; }
            .otp-code { font-size: 36px; font-weight: bold; color: #667eea; letter-spacing: 5px; font-family: 'Courier New', monospace; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
            .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 5px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">🛒 Tigray Market</h1>
              <p style="margin: 10px 0 0 0;">Email Verification</p>
            </div>
            <div class="content">
              <h2>Verify Your Email Address</h2>
              <p>Thank you for signing up with Tigray Market! To complete your registration, please use the following verification code:</p>
              
              <div class="otp-box">
                <p style="margin: 0; font-size: 14px; color: #666;">Your Verification Code</p>
                <div class="otp-code">${otpCode}</div>
                <p style="margin: 10px 0 0 0; font-size: 12px; color: #666;">Valid for ${OTP_EXPIRY_MINUTES} minutes</p>
              </div>

              <div class="warning">
                <strong>⚠️ Security Notice:</strong>
                <ul style="margin: 10px 0 0 0; padding-left: 20px;">
                  <li>Never share this code with anyone</li>
                  <li>Tigray Market staff will never ask for your verification code</li>
                  <li>If you didn't request this code, please ignore this email</li>
                </ul>
              </div>

              <p>Enter this code in the verification page to activate your account.</p>
              
              <div class="footer">
                <p>This is an automated email. Please do not reply to this message.</p>
                <p>&copy; ${new Date().getFullYear()} Tigray Market. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Verify Your Email - Tigray Market
        
        Your verification code is: ${otpCode}
        
        This code will expire in ${OTP_EXPIRY_MINUTES} minutes.
        
        Never share this code with anyone. If you didn't request this code, please ignore this email.
        
        © ${new Date().getFullYear()} Tigray Market
      `,
    };

    await transporter.sendMail(mailOptions);
    logger.info(`✅ OTP email sent successfully to ${email}`);
  } catch (error) {
    logger.error(`❌ Failed to send OTP email to ${email}:`, error);
    throw new Error('Failed to send verification email. Please try again.');
  }
};

/**
 * Generate and store OTP for email
 */
const generateEmailOTP = async (email) => {
  try {
    const otpCode = generateOtpCode();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    // Store OTP in memory (use Redis in production for scalability)
    emailOtpStore.set(email.toLowerCase(), {
      otp: otpCode,
      expiresAt,
      attempts: 0,
      createdAt: new Date(),
    });

    // Send OTP via email
    await sendOtpEmail(email, otpCode);

    // Clean up old OTPs periodically
    cleanupExpiredOtps();

    return {
      success: true,
      expiresAt,
      message: 'Verification code sent to your email',
      // Include OTP in development mode for testing
      ...(process.env.NODE_ENV === 'development' && { otp: otpCode }),
    };
  } catch (error) {
    logger.error('Error generating email OTP:', error);
    throw error;
  }
};

/**
 * Verify email OTP
 */
const verifyEmailOTP = async (email, otpCode) => {
  try {
    const normalizedEmail = email.toLowerCase();
    const otpRecord = emailOtpStore.get(normalizedEmail);

    if (!otpRecord) {
      return {
        success: false,
        message: 'Verification code not found or expired. Please request a new one.',
      };
    }

    // Check if expired
    if (new Date() > otpRecord.expiresAt) {
      emailOtpStore.delete(normalizedEmail);
      return {
        success: false,
        message: 'Verification code has expired. Please request a new one.',
      };
    }

    // Check max attempts
    if (otpRecord.attempts >= MAX_ATTEMPTS) {
      emailOtpStore.delete(normalizedEmail);
      return {
        success: false,
        message: 'Maximum verification attempts exceeded. Please request a new code.',
      };
    }

    // Verify OTP
    if (otpRecord.otp !== otpCode.trim()) {
      otpRecord.attempts += 1;
      emailOtpStore.set(normalizedEmail, otpRecord);
      
      return {
        success: false,
        message: 'Invalid verification code.',
        attemptsRemaining: MAX_ATTEMPTS - otpRecord.attempts,
      };
    }

    // Mark as verified and remove from store
    emailOtpStore.delete(normalizedEmail);

    return {
      success: true,
      message: 'Email verified successfully.',
    };
  } catch (error) {
    logger.error('Error verifying email OTP:', error);
    throw error;
  }
};

/**
 * Clean up expired OTPs from memory
 */
const cleanupExpiredOtps = () => {
  const now = new Date();
  for (const [email, otpData] of emailOtpStore.entries()) {
    if (now > otpData.expiresAt) {
      emailOtpStore.delete(email);
      logger.info(`🧹 Cleaned up expired OTP for ${email}`);
    }
  }
};

// Run cleanup every 5 minutes
setInterval(cleanupExpiredOtps, 5 * 60 * 1000);

module.exports = {
  generateEmailOTP,
  verifyEmailOTP,
};

