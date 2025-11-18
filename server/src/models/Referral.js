const mongoose = require('mongoose');

const referralSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true,
  },
  referralCode: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  paymentMethod: {
    type: {
      type: String,
      enum: ['bank_transfer', 'telebirr', 'mpesa'],
    },
    details: String,
  },
  referredUsers: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    registeredAt: {
      type: Date,
      default: Date.now,
    },
    ipAddress: String,
    deviceFingerprint: String,
    // Track which withdrawal this referral was included in
    includeInWithdrawal: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
  }],
  // Withdrawal requests tracking
  withdrawalRequests: [{
    requestId: {
      type: mongoose.Schema.Types.ObjectId,
      auto: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    referralCount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'paid', 'rejected'],
      default: 'pending',
    },
    requestedAt: {
      type: Date,
      default: Date.now,
    },
    processedAt: Date,
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    paymentProof: String,
    rejectionReason: String,
    // Snapshot of payment method at time of request
    paymentMethodSnapshot: {
      type: String,
      details: String,
    },
  }],
  totalEarnings: {
    type: Number,
    default: 0,
  },
  totalWithdrawn: {
    type: Number,
    default: 0,
  },
  availableBalance: {
    type: Number,
    default: 0,
  },
  // Fraud detection metadata
  suspiciousActivity: {
    flagged: {
      type: Boolean,
      default: false,
    },
    reasons: [String],
    flaggedAt: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Indexes for performance
referralSchema.index({ referralCode: 1 });
referralSchema.index({ userId: 1 });
referralSchema.index({ 'suspiciousActivity.flagged': 1 });
referralSchema.index({ 'withdrawalRequests.status': 1 });

// Constants
const WITHDRAWAL_THRESHOLD = 25; // Minimum referrals needed
const EARNINGS_PER_REFERRAL = 10; // 10 birr per referral

// Method to get available referrals for withdrawal (not yet withdrawn)
referralSchema.methods.getAvailableReferrals = function() {
  return this.referredUsers.filter(r => !r.includeInWithdrawal);
};

// Method to check if withdrawal is available
referralSchema.methods.canWithdraw = function() {
  const availableReferrals = this.getAvailableReferrals();
  return availableReferrals.length >= WITHDRAWAL_THRESHOLD;
};

// Method to calculate available balance
referralSchema.methods.calculateAvailableBalance = function() {
  const availableReferrals = this.getAvailableReferrals();
  this.availableBalance = availableReferrals.length * EARNINGS_PER_REFERRAL;
  return this.availableBalance;
};

const Referral = mongoose.model('Referral', referralSchema);

module.exports = Referral;

