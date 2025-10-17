const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: true,
    index: true,
  },
  otp: {
    type: String,
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true,
  },
  attempts: {
    type: Number,
    default: 0,
  },
  verified: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 600, // Auto-delete after 10 minutes (TTL index)
  },
});

// Compound index for quick lookups
otpSchema.index({ phone: 1, verified: 1 });

// Static method to generate random OTP
otpSchema.statics.generateOTP = function() {
  return String(Math.floor(100000 + Math.random() * 900000));
};

// Method to check if OTP is expired
otpSchema.methods.isExpired = function() {
  return new Date() > this.expiresAt;
};

// Method to increment attempts
otpSchema.methods.incrementAttempts = function() {
  this.attempts += 1;
  return this.save();
};

const OTP = mongoose.model('OTP', otpSchema);

module.exports = OTP;

