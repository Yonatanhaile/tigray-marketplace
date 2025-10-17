const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters'],
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    unique: true,
    trim: true,
    index: true,
    match: [/^\+?[1-9]\d{1,14}$/, 'Please provide a valid phone number'],
  },
  passwordHash: {
    type: String,
    select: false, // Don't include by default in queries
  },
  roles: {
    type: [String],
    enum: ['buyer', 'seller', 'courier', 'admin'],
    default: ['buyer'],
  },
  badges: {
    type: [String],
    default: [],
  },
  kyc: {
    idDocUrl: String,
    businessDocUrl: String,
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    reviewedAt: Date,
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    notes: String,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  lastLogin: Date,
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Indexes for performance
userSchema.index({ email: 1 });
userSchema.index({ phone: 1 });
userSchema.index({ 'kyc.status': 1 });

// Virtual for full profile
userSchema.virtual('profile').get(function() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    phone: this.phone,
    roles: this.roles,
    badges: this.badges,
    kyc: this.kyc,
  };
});

// Method to check if user has a specific role
userSchema.methods.hasRole = function(role) {
  return this.roles.includes(role);
};

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.passwordHash) return false;
  return await bcrypt.compare(candidatePassword, this.passwordHash);
};

// Static method to hash password
userSchema.statics.hashPassword = async function(password) {
  return await bcrypt.hash(password, 12);
};

// Don't return passwordHash in JSON
userSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret.passwordHash;
    delete ret.__v;
    return ret;
  },
});

const User = mongoose.model('User', userSchema);

module.exports = User;

