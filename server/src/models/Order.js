const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  listingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Listing',
    required: [true, 'Listing ID is required'],
    index: true,
  },
  buyerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Buyer ID is required'],
    index: true,
  },
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Seller ID is required'],
    index: true,
  },
  status: {
    type: String,
    enum: [
      'requested',
      'seller_confirmed',
      'awaiting_payment_confirmation',
      'paid_offsite',
      'shipped',
      'collected',
      'delivered',
      'cancelled',
      'disputed',
    ],
    default: 'requested',
    index: true,
  },
  payment_status: {
    type: String,
    enum: ['none', 'pending', 'paid_offsite', 'disputed'],
    default: 'none',
  },
  selected_payment_method: {
    type: String,
    required: [true, 'Payment method must be selected'],
  },
  payment_evidence: [{
    url: String,
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
    _id: false,
  }],
  meeting_info: {
    date: Date,
    place: String,
    notes: String,
  },
  buyer_note: String,
  seller_note: String,
  price_agreed: {
    type: Number,
    required: true,
  },
  currency: {
    type: String,
    default: 'ETB',
  },
  statusHistory: [{
    status: String,
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    note: String,
    _id: false,
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Compound indexes for queries
orderSchema.index({ buyerId: 1, status: 1 });
orderSchema.index({ sellerId: 1, status: 1 });
orderSchema.index({ listingId: 1 });
orderSchema.index({ createdAt: -1 });

// Method to update status with history
orderSchema.methods.updateStatus = function(newStatus, userId, note = '') {
  this.status = newStatus;
  this.statusHistory.push({
    status: newStatus,
    changedBy: userId,
    timestamp: new Date(),
    note,
  });
  return this.save();
};

// Virtual for populating related data
orderSchema.virtual('listing', {
  ref: 'Listing',
  localField: 'listingId',
  foreignField: '_id',
  justOne: true,
});

orderSchema.virtual('buyer', {
  ref: 'User',
  localField: 'buyerId',
  foreignField: '_id',
  justOne: true,
});

orderSchema.virtual('seller', {
  ref: 'User',
  localField: 'sellerId',
  foreignField: '_id',
  justOne: true,
});

// Clean JSON output
orderSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;

