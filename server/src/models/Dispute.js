const mongoose = require('mongoose');

const disputeSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: [true, 'Order ID is required'],
    index: true,
  },
  reporterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Reporter ID is required'],
    index: true,
  },
  reason: {
    type: String,
    required: [true, 'Dispute reason is required'],
    trim: true,
    maxlength: [2000, 'Reason cannot exceed 2000 characters'],
  },
  category: {
    type: String,
    enum: [
      'payment_not_received',
      'item_not_received',
      'item_not_as_described',
      'counterfeit',
      'safety_concern',
      'other',
    ],
    default: 'other',
  },
  attachments: [{
    url: String,
    type: String, // 'image', 'pdf', etc.
    _id: false,
  }],
  status: {
    type: String,
    enum: ['open', 'under_review', 'resolved', 'rejected'],
    default: 'open',
    index: true,
  },
  adminNotes: {
    type: String,
    trim: true,
  },
  resolution: {
    type: String,
    trim: true,
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  reviewedAt: Date,
  comments: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    text: String,
    timestamp: {
      type: Date,
      default: Date.now,
    },
    isAdminComment: {
      type: Boolean,
      default: false,
    },
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

// Indexes
disputeSchema.index({ orderId: 1 });
disputeSchema.index({ reporterId: 1 });
disputeSchema.index({ status: 1 });
disputeSchema.index({ createdAt: -1 });

// Virtual for order details
disputeSchema.virtual('order', {
  ref: 'Order',
  localField: 'orderId',
  foreignField: '_id',
  justOne: true,
});

disputeSchema.virtual('reporter', {
  ref: 'User',
  localField: 'reporterId',
  foreignField: '_id',
  justOne: true,
});

// Method to add comment
disputeSchema.methods.addComment = function(userId, text, isAdmin = false) {
  this.comments.push({
    userId,
    text,
    isAdminComment: isAdmin,
    timestamp: new Date(),
  });
  return this.save();
};

// Clean JSON output
disputeSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

const Dispute = mongoose.model('Dispute', disputeSchema);

module.exports = Dispute;

