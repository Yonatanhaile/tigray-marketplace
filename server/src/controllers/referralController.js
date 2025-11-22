const { Referral, User } = require('../models');
const crypto = require('crypto');
const logger = require('../services/logger');
const geoip = require('geoip-lite');

// Constants
const WITHDRAWAL_THRESHOLD = 25; // Minimum referrals for withdrawal
const EARNINGS_PER_REFERRAL = 10; // 10 birr per referral
const MAX_REGISTRATIONS_PER_IP = 2; // Only 2 users per IP address (same network)
const MAX_REGISTRATIONS_PER_DEVICE = 1; // Only 1 user per device fingerprint
const SUSPICIOUS_TIME_WINDOW = 3600000; // 1 hour in ms

/**
 * Generate unique referral code
 */
const generateReferralCode = (userId) => {
  const hash = crypto.createHash('sha256').update(userId.toString()).digest('hex');
  return hash.substring(0, 8).toUpperCase();
};

/**
 * Fraud detection: Check for suspicious patterns
 */
const detectFraud = async (referralCode, registrationData) => {
  const referral = await Referral.findOne({ referralCode });
  if (!referral) return { suspicious: false, reasons: [] };

  const { ipAddress, deviceFingerprint } = registrationData;
  const reasons = [];
  const warnings = [];
  
  logger.info(`Running fraud detection for referral ${referralCode}`);
  logger.info(`Checking IP: ${ipAddress}, Device: ${deviceFingerprint}`);
  
  // Check 0: IP Location - Only allow Ethiopian IPs for referrals
  let geo = null;
  let isEthiopianIP = false;
  
  // Skip geolocation check for local/private IPs (development)
  if (!ipAddress.includes('127.0.0.1') && 
      !ipAddress.includes('localhost') && 
      !ipAddress.includes('::1') &&
      !ipAddress.startsWith('192.168.') &&
      !ipAddress.startsWith('10.') &&
      !ipAddress.startsWith('172.')) {
    
    geo = geoip.lookup(ipAddress);
    
    if (geo) {
      logger.info(`IP geolocation: ${geo.country} - ${geo.region} - ${geo.city}`);
      isEthiopianIP = geo.country === 'ET'; // Ethiopia country code
      
      if (!isEthiopianIP) {
        reasons.push(`Referrals only allowed from Ethiopia. IP location: ${geo.country} (${geo.city || 'Unknown city'})`);
        logger.error(`🚨 NON-ETHIOPIAN IP BLOCKED: ${ipAddress} from ${geo.country}`);
      } else {
        logger.info(`✅ Ethiopian IP confirmed: ${ipAddress} from ${geo.region}, ${geo.city}`);
      }
    } else {
      // IP lookup failed - could be proxy/VPN
      warnings.push('IP geolocation lookup failed - possible VPN or proxy detected');
      logger.warn(`⚠️ Geolocation lookup failed for IP: ${ipAddress}`);
    }
  } else {
    // Local IP - allow in development mode
    logger.info(`Local/Private IP detected (development mode): ${ipAddress}`);
    isEthiopianIP = true; // Allow local IPs for testing
  }
  
  // Check 1: Multiple registrations from same IP (strict: max 2 per IP)
  const ipCount = referral.referredUsers.filter(r => 
    r.ipAddress === ipAddress
  ).length;
  
  logger.info(`IP ${ipAddress} has ${ipCount} existing registrations for this referral code`);
  
  if (ipCount >= MAX_REGISTRATIONS_PER_IP) {
    reasons.push(`Maximum ${MAX_REGISTRATIONS_PER_IP} registrations per IP exceeded. IP: ${ipAddress} has ${ipCount + 1} total`);
  } else if (ipCount >= 1) {
    warnings.push(`Second registration from same IP detected: ${ipAddress}`);
  }

  // Check 2: Multiple registrations from same device (strict: max 1 per device)
  const deviceCount = referral.referredUsers.filter(r => 
    r.deviceFingerprint === deviceFingerprint
  ).length;
  
  logger.info(`Device ${deviceFingerprint} has ${deviceCount} existing registrations for this referral code`);
  
  if (deviceCount >= MAX_REGISTRATIONS_PER_DEVICE) {
    reasons.push(`Device already used for a referral. Only ${MAX_REGISTRATIONS_PER_DEVICE} registration per device allowed`);
  }

  // Check 3: Rapid registrations (5+ within 1 hour)
  const recentRegistrations = referral.referredUsers.filter(r => 
    Date.now() - new Date(r.registeredAt).getTime() < SUSPICIOUS_TIME_WINDOW
  );
  
  logger.info(`Found ${recentRegistrations.length} registrations in the last hour`);
  
  if (recentRegistrations.length >= 5) {
    reasons.push(`Too many registrations in short time period (${recentRegistrations.length + 1} in 1 hour)`);
  } else if (recentRegistrations.length >= 3) {
    warnings.push(`Multiple recent registrations detected (${recentRegistrations.length + 1} in 1 hour)`);
  }

  // Check 4: Same IP as referrer
  const referrer = await User.findById(referral.userId);
  if (referrer?.registrationMetadata?.ipAddress === ipAddress) {
    reasons.push('Registration IP matches referrer IP - possible self-referral');
  }

  // Check 5: Same device fingerprint as referrer
  if (referrer?.registrationMetadata?.deviceFingerprint === deviceFingerprint) {
    reasons.push('Device fingerprint matches referrer - possible self-referral');
  }

  // Check 6: Check for duplicate device across all referrals (global check)
  // With strict 1 device = 1 user policy, this should never happen legitimately
  const globalDeviceCheck = await Referral.countDocuments({
    'referredUsers.deviceFingerprint': deviceFingerprint
  });
  
  if (globalDeviceCheck >= 2) {
    reasons.push(`Device fingerprint used across multiple referral programs (${globalDeviceCheck} times) - IMPOSSIBLE with 1 device per user policy`);
    logger.error(`🚨 CRITICAL: Device fingerprint appears in ${globalDeviceCheck} different referral accounts - system bypass detected!`);
  }

  // Check 7: Check for suspicious IP patterns (e.g., VPN detection - basic)
  if (ipAddress.includes('10.') || ipAddress.includes('192.168.') || ipAddress === '127.0.0.1') {
    warnings.push('Private/Local IP address detected - may indicate VPN or proxy');
  }

  // Log results
  if (reasons.length > 0) {
    logger.warn(`🚨 FRAUD DETECTED for referral ${referralCode}:`, reasons);
  } else if (warnings.length > 0) {
    logger.warn(`⚠️ Suspicious activity warnings for referral ${referralCode}:`, warnings);
  } else {
    logger.info(`✅ No fraud detected for referral ${referralCode}`);
  }

  return {
    suspicious: reasons.length > 0,
    reasons,
    warnings,
  };
};

/**
 * Create or get referral program for user
 */
const createReferralProgram = async (req, res) => {
  try {
    const userId = req.userId;

    let referral = await Referral.findOne({ userId });

    if (!referral) {
      const referralCode = generateReferralCode(userId);
      
      referral = await Referral.create({
        userId,
        referralCode,
      });

      logger.info(`Referral program created for user: ${userId}`);
    }

    // Calculate current balance
    referral.calculateAvailableBalance();
    await referral.save();

    res.status(200).json({
      error: false,
      referral: {
        referralCode: referral.referralCode,
        totalReferrals: referral.referredUsers.length,
        availableBalance: referral.availableBalance,
        totalEarnings: referral.totalEarnings,
        totalWithdrawn: referral.totalWithdrawn,
        canWithdraw: referral.canWithdraw(),
        withdrawalThreshold: WITHDRAWAL_THRESHOLD,
        paymentMethod: referral.paymentMethod,
        flagged: referral.suspiciousActivity?.flagged || false,
      },
    });
  } catch (error) {
    logger.error('Create referral program error:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to create referral program',
      details: error.message,
    });
  }
};

/**
 * Set payment method (can only be set once)
 */
const updatePaymentMethod = async (req, res) => {
  try {
    const userId = req.userId;
    const { paymentType, paymentDetails } = req.body;

    if (!['bank_transfer', 'telebirr', 'mpesa'].includes(paymentType)) {
      return res.status(400).json({
        error: true,
        message: 'Invalid payment method',
      });
    }

    const referral = await Referral.findOne({ userId });
    
    if (!referral) {
      return res.status(404).json({
        error: true,
        message: 'Referral program not found. Create one first.',
      });
    }

    // Check if payment method is already set
    if (referral.paymentMethod && referral.paymentMethod.type) {
      return res.status(403).json({
        error: true,
        message: 'Payment method already set. Contact support to change it.',
      });
    }

    referral.paymentMethod = {
      type: paymentType,
      details: paymentDetails,
    };

    await referral.save();

    logger.info(`Payment method set for user: ${userId} - ${paymentType}`);

    res.status(200).json({
      error: false,
      message: 'Payment method saved successfully',
      paymentMethod: referral.paymentMethod,
    });
  } catch (error) {
    logger.error('Set payment method error:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to update payment method',
      details: error.message,
    });
  }
};

/**
 * Get referral statistics
 */
const getReferralStats = async (req, res) => {
  try {
    const userId = req.userId;

    const referral = await Referral.findOne({ userId })
      .populate('referredUsers.userId', 'name email createdAt');

    if (!referral) {
      return res.status(404).json({
        error: true,
        message: 'Referral program not found',
      });
    }

    // Calculate balance
    referral.calculateAvailableBalance();
    await referral.save();

    const availableReferrals = referral.getAvailableReferrals();

    res.status(200).json({
      error: false,
      stats: {
        referralCode: referral.referralCode,
        totalReferrals: referral.referredUsers.length,
        availableReferrals: availableReferrals.length,
        availableBalance: referral.availableBalance,
        totalEarnings: referral.totalEarnings,
        totalWithdrawn: referral.totalWithdrawn,
        canWithdraw: referral.canWithdraw(),
        withdrawalThreshold: WITHDRAWAL_THRESHOLD,
        earningsPerReferral: EARNINGS_PER_REFERRAL,
        paymentMethod: referral.paymentMethod,
        referredUsers: referral.referredUsers.map(r => ({
          name: r.userId?.name || 'Anonymous',
          registeredAt: r.registeredAt,
          withdrawn: !!r.includeInWithdrawal,
        })),
        withdrawalHistory: referral.withdrawalRequests.map(w => ({
          id: w.requestId,
          amount: w.amount,
          referralCount: w.referralCount,
          status: w.status,
          requestedAt: w.requestedAt,
          processedAt: w.processedAt,
          rejectionReason: w.rejectionReason,
        })),
        paymentHistory: referral.paymentHistory.map(p => ({
          amount: p.amount,
          paidAt: p.paidAt,
          paymentMethod: p.paymentMethod,
          transactionId: p.transactionId,
          notes: p.notes,
        })),
        totalReceived: referral.totalWithdrawn,
        flagged: referral.suspiciousActivity?.flagged || false,
        flagReasons: referral.suspiciousActivity?.reasons || [],
      },
    });
  } catch (error) {
    logger.error('Get referral stats error:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to get referral statistics',
      details: error.message,
    });
  }
};

/**
 * Request withdrawal
 */
const requestWithdrawal = async (req, res) => {
  try {
    const userId = req.userId;

    const referral = await Referral.findOne({ userId });
    
    if (!referral) {
      return res.status(404).json({
        error: true,
        message: 'Referral program not found',
      });
    }

    // Check if account is flagged (must be explicitly true)
    if (referral.suspiciousActivity?.flagged === true) {
      return res.status(403).json({
        error: true,
        message: 'Your account is flagged for suspicious activity. Withdrawals are not allowed.',
        flagReasons: referral.suspiciousActivity?.reasons || []
      });
    }

    // Check if payment method is set
    if (!referral.paymentMethod || !referral.paymentMethod.type) {
      return res.status(400).json({
        error: true,
        message: 'Please set up your payment method before requesting withdrawal',
      });
    }

    // Check minimum threshold
    if (!referral.canWithdraw()) {
      const availableReferrals = referral.getAvailableReferrals();
      return res.status(400).json({
        error: true,
        message: `Minimum ${WITHDRAWAL_THRESHOLD} referrals required for withdrawal. You have ${availableReferrals.length} available referrals.`,
        required: WITHDRAWAL_THRESHOLD,
        current: availableReferrals.length,
      });
    }

    // Check for pending withdrawal
    const hasPendingWithdrawal = referral.withdrawalRequests.some(
      w => w.status === 'pending'
    );

    if (hasPendingWithdrawal) {
      return res.status(400).json({
        error: true,
        message: 'You already have a pending withdrawal request. Please wait for it to be processed.',
      });
    }

    // Get available referrals for this withdrawal
    const availableReferrals = referral.getAvailableReferrals();
    const withdrawalCount = Math.floor(availableReferrals.length / WITHDRAWAL_THRESHOLD) * WITHDRAWAL_THRESHOLD;
    const withdrawalAmount = withdrawalCount * EARNINGS_PER_REFERRAL;

    // Create withdrawal request
    const withdrawalRequest = {
      amount: withdrawalAmount,
      referralCount: withdrawalCount,
      status: 'pending',
      requestedAt: new Date(),
      paymentMethodSnapshot: {
        type: referral.paymentMethod.type,
        details: referral.paymentMethod.details,
      },
    };

    referral.withdrawalRequests.push(withdrawalRequest);

    // Mark referrals as included in withdrawal (using the withdrawal request ID)
    const newWithdrawalId = referral.withdrawalRequests[referral.withdrawalRequests.length - 1].requestId;
    
    for (let i = 0; i < withdrawalCount; i++) {
      availableReferrals[i].includeInWithdrawal = newWithdrawalId;
    }

    // Update balance
    referral.calculateAvailableBalance();

    await referral.save();

    logger.info(`Withdrawal requested by user ${userId}: ${withdrawalAmount} Birr for ${withdrawalCount} referrals`);

    res.status(200).json({
      error: false,
      message: 'Withdrawal request submitted successfully. You will be notified when it is processed.',
      withdrawal: {
        amount: withdrawalAmount,
        referralCount: withdrawalCount,
        status: 'pending',
        requestedAt: withdrawalRequest.requestedAt,
      },
    });
  } catch (error) {
    logger.error('Request withdrawal error:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to request withdrawal',
      details: error.message,
    });
  }
};

/**
 * Track referral (called during registration)
 */
const trackReferral = async (referralCode, newUserId, registrationData) => {
  try {
    const referral = await Referral.findOne({ referralCode });
    
    if (!referral) {
      logger.warn(`Invalid referral code used: ${referralCode}`);
      return;
    }

    // Fraud detection
    const fraudCheck = await detectFraud(referralCode, registrationData);

    // Check if this is a non-Ethiopian IP (critical fraud - reject completely)
    const hasLocationViolation = fraudCheck.reasons.some(reason => 
      reason.includes('Referrals only allowed from Ethiopia')
    );

    if (hasLocationViolation) {
      // DO NOT ADD the referral - completely reject
      logger.error(`🚫 REFERRAL REJECTED - Non-Ethiopian IP: ${registrationData.ipAddress}`);
      logger.error(`   User ${newUserId} attempted to use referral code ${referralCode} from outside Ethiopia`);
      
      // Flag the referrer's account for attempting to get referrals from outside Ethiopia
      if (referral.suspiciousActivity && referral.suspiciousActivity.flagged) {
        referral.suspiciousActivity.reasons = [
          ...new Set([...referral.suspiciousActivity.reasons, ...fraudCheck.reasons])
        ];
      } else {
        referral.suspiciousActivity = {
          flagged: true,
          reasons: fraudCheck.reasons,
          flaggedAt: new Date(),
        };
      }
      
      await referral.save();
      
      logger.error(`⚠️ ADMIN ALERT: Referral account ${referral.userId} received registration from outside Ethiopia and has been flagged`);
      return; // Exit without adding the referral
    }

    // Add referred user with metadata (only if passed location check)
    referral.referredUsers.push({
      userId: newUserId,
      ipAddress: registrationData.ipAddress,
      deviceFingerprint: registrationData.deviceFingerprint,
      registeredAt: new Date(),
    });

    // Update balance
    referral.calculateAvailableBalance();

    // Flag if suspicious (for other fraud types)
    if (fraudCheck.suspicious) {
      // Update or create suspicious activity record
      if (referral.suspiciousActivity && referral.suspiciousActivity.flagged) {
        // Append new reasons to existing ones
        referral.suspiciousActivity.reasons = [
          ...new Set([...referral.suspiciousActivity.reasons, ...fraudCheck.reasons])
        ];
      } else {
        referral.suspiciousActivity = {
          flagged: true,
          reasons: fraudCheck.reasons,
          flaggedAt: new Date(),
        };
      }
      
      logger.error(`🚨 FRAUD ALERT - Referral ${referralCode} flagged:`, fraudCheck.reasons);
      logger.error(`   User: ${newUserId}, IP: ${registrationData.ipAddress}, Device: ${registrationData.deviceFingerprint}`);
    } else if (fraudCheck.warnings && fraudCheck.warnings.length > 0) {
      logger.warn(`⚠️ WARNING - Suspicious patterns detected for referral ${referralCode}:`, fraudCheck.warnings);
    } else {
      logger.info(`✅ Referral tracked successfully: ${referralCode} -> User ${newUserId}`);
    }

    await referral.save();
    
    // Send notification to admin if account was flagged
    if (fraudCheck.suspicious) {
      logger.error(`⚠️ ADMIN ALERT: Referral account ${referral.userId} has been flagged for fraud`);
    }
    
  } catch (error) {
    logger.error('Track referral error:', error);
    logger.error('Stack:', error.stack);
  }
};

/**
 * Admin: Get all withdrawal requests
 */
const getAllWithdrawals = async (req, res) => {
  try {
    const { status } = req.query;

    const query = {};
    if (status) {
      query['withdrawalRequests.status'] = status;
    }

    const referrals = await Referral.find(query)
      .populate('userId', 'name email phone')
      .select('userId withdrawalRequests paymentMethod');

    // Flatten withdrawal requests
    const withdrawals = [];
    referrals.forEach(referral => {
      referral.withdrawalRequests.forEach(withdrawal => {
        if (!status || withdrawal.status === status) {
          withdrawals.push({
            withdrawalId: withdrawal.requestId,
            referralId: referral._id,
            user: referral.userId,
            amount: withdrawal.amount,
            referralCount: withdrawal.referralCount,
            status: withdrawal.status,
            requestedAt: withdrawal.requestedAt,
            processedAt: withdrawal.processedAt,
            paymentMethod: withdrawal.paymentMethodSnapshot,
            rejectionReason: withdrawal.rejectionReason,
          });
        }
      });
    });

    // Sort by requested date (newest first)
    withdrawals.sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt));

    res.status(200).json({
      error: false,
      withdrawals,
    });
  } catch (error) {
    logger.error('Get all withdrawals error:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to get withdrawals',
      details: error.message,
    });
  }
};

/**
 * Admin: Process withdrawal (approve/reject)
 */
const processWithdrawal = async (req, res) => {
  try {
    const { referralId, withdrawalId } = req.params;
    const { action, paymentProof, rejectionReason } = req.body;
    const adminId = req.userId;

    if (!['approve', 'reject', 'paid'].includes(action)) {
      return res.status(400).json({
        error: true,
        message: 'Invalid action. Use: approve, reject, or paid',
      });
    }

    const referral = await Referral.findById(referralId);
    
    if (!referral) {
      return res.status(404).json({
        error: true,
        message: 'Referral not found',
      });
    }

    const withdrawal = referral.withdrawalRequests.id(withdrawalId);
    
    if (!withdrawal) {
      return res.status(404).json({
        error: true,
        message: 'Withdrawal request not found',
      });
    }

    if (withdrawal.status !== 'pending' && action !== 'paid') {
      return res.status(400).json({
        error: true,
        message: 'Can only process pending withdrawals',
      });
    }

    // Update withdrawal status
    if (action === 'approve') {
      withdrawal.status = 'approved';
      withdrawal.processedAt = new Date();
      withdrawal.processedBy = adminId;
    } else if (action === 'paid') {
      withdrawal.status = 'paid';
      withdrawal.processedAt = new Date();
      withdrawal.processedBy = adminId;
      withdrawal.paymentProof = paymentProof;
      
      // Update totals
      referral.totalEarnings += withdrawal.amount;
      referral.totalWithdrawn += withdrawal.amount;
    } else if (action === 'reject') {
      withdrawal.status = 'rejected';
      withdrawal.processedAt = new Date();
      withdrawal.processedBy = adminId;
      withdrawal.rejectionReason = rejectionReason;
      
      // Release referrals back to available pool
      referral.referredUsers.forEach(r => {
        if (r.includeInWithdrawal && r.includeInWithdrawal.toString() === withdrawalId) {
          r.includeInWithdrawal = null;
        }
      });
    }

    // Recalculate balance
    referral.calculateAvailableBalance();

    await referral.save();

    logger.info(`Withdrawal ${action}d: ${withdrawalId} by admin ${adminId}`);

    res.status(200).json({
      error: false,
      message: `Withdrawal ${action}d successfully`,
      withdrawal,
    });
  } catch (error) {
    logger.error('Process withdrawal error:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to process withdrawal',
      details: error.message,
    });
  }
};

/**
 * Admin: Get all referral programs with detailed stats
 */
const getAllReferralPrograms = async (req, res) => {
  try {
    const { flagged, hasWithdrawals } = req.query;

    const query = {};
    if (flagged === 'true') {
      query['suspiciousActivity.flagged'] = true;
    }
    if (hasWithdrawals === 'true') {
      query['withdrawalRequests.0'] = { $exists: true };
    }

    const referrals = await Referral.find(query)
      .populate('userId', 'name email phone registrationMetadata')
      .populate('referredUsers.userId', 'name email phone')
      .sort({ createdAt: -1 });

    const programs = referrals.map(ref => {
      const totalReferrals = ref.referredUsers.length;
      const withdrawnReferrals = ref.referredUsers.filter(r => r.withdrawn).length;
      const availableReferrals = totalReferrals - withdrawnReferrals;
      const availableBalance = availableReferrals * EARNINGS_PER_REFERRAL;
      const totalWithdrawn = ref.withdrawalRequests
        .filter(w => w.status === 'paid')
        .reduce((sum, w) => sum + w.amount, 0);

      return {
        _id: ref._id,
        userId: ref.userId,
        referralCode: ref.referralCode,
        totalReferrals,
        availableReferrals,
        withdrawnReferrals,
        availableBalance,
        totalWithdrawn,
        paymentMethod: ref.paymentMethod,
        suspiciousActivity: ref.suspiciousActivity,
        referredUsers: ref.referredUsers,
        withdrawalRequests: ref.withdrawalRequests,
        paymentHistory: ref.paymentHistory || [],
        createdAt: ref.createdAt,
      };
    });

    res.json({
      success: true,
      programs,
      total: programs.length,
    });
  } catch (error) {
    logger.error('Get all referral programs error:', error);
    res.status(500).json({
      error: 'Failed to fetch referral programs',
      message: error.message,
    });
  }
};

/**
 * Admin: Manually record a payment to a referral user
 */
const recordManualPayment = async (req, res) => {
  try {
    const { referralId } = req.params;
    const { amount, paymentMethod, transactionId, notes } = req.body;
    const adminId = req.userId;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        error: true,
        message: 'Invalid payment amount',
      });
    }

    const referral = await Referral.findById(referralId);
    
    if (!referral) {
      return res.status(404).json({
        error: true,
        message: 'Referral program not found',
      });
    }

    // Add payment to history
    referral.paymentHistory.push({
      amount: amount,
      paidAt: new Date(),
      paidBy: adminId,
      paymentMethod: paymentMethod || referral.paymentMethod?.type || 'manual',
      transactionId: transactionId || '',
      notes: notes || '',
    });

    // Update total withdrawn
    referral.totalWithdrawn += amount;

    // Recalculate available balance
    referral.calculateAvailableBalance();

    await referral.save();

    logger.info(`Manual payment recorded by admin ${adminId}: ${amount} Birr to referral ${referralId}`);

    res.status(200).json({
      error: false,
      message: 'Payment recorded successfully',
      payment: referral.paymentHistory[referral.paymentHistory.length - 1],
      totalWithdrawn: referral.totalWithdrawn,
      availableBalance: referral.availableBalance,
    });
  } catch (error) {
    logger.error('Record manual payment error:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to record payment',
      details: error.message,
    });
  }
};

/**
 * Admin: Update referral program flagged status
 */
const updateReferralFlag = async (req, res) => {
  try {
    const { referralId } = req.params;
    const { flagged, reasons } = req.body;

    const referral = await Referral.findById(referralId);
    if (!referral) {
      return res.status(404).json({ error: 'Referral program not found' });
    }

    if (flagged) {
      referral.suspiciousActivity = {
        flagged: true,
        reasons: reasons || [],
        flaggedAt: new Date(),
      };
    } else {
      referral.suspiciousActivity = {
        flagged: false,
        reasons: [],
        flaggedAt: null,
      };
    }

    await referral.save();

    logger.info(`Admin ${flagged ? 'flagged' : 'unflagged'} referral program ${referralId}`);

    res.json({
      success: true,
      message: `Referral program ${flagged ? 'flagged' : 'unflagged'} successfully`,
      referral,
    });
  } catch (error) {
    logger.error('Update referral flag error:', error);
    res.status(500).json({
      error: 'Failed to update referral flag',
      message: error.message,
    });
  }
};

module.exports = {
  createReferralProgram,
  updatePaymentMethod,
  getReferralStats,
  requestWithdrawal,
  trackReferral,
  getAllWithdrawals,
  processWithdrawal,
  getAllReferralPrograms,
  updateReferralFlag,
  recordManualPayment,
};

