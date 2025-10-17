const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: [true, 'Order ID is required'],
    index: true,
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Sender ID is required'],
    index: true,
  },
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Recipient ID is required'],
    index: true,
  },
  text: {
    type: String,
    required: [true, 'Message text is required'],
    trim: true,
    maxlength: [5000, 'Message cannot exceed 5000 characters'],
  },
  attachments: [{
    url: String,
    type: String, // 'image', 'pdf', 'file'
    name: String,
    size: Number,
    _id: false,
  }],
  isRead: {
    type: Boolean,
    default: false,
  },
  readAt: Date,
  deliveredAt: Date,
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
}, {
  timestamps: true,
});

// Compound indexes for efficient queries
messageSchema.index({ orderId: 1, createdAt: 1 });
messageSchema.index({ senderId: 1, recipientId: 1 });
messageSchema.index({ recipientId: 1, isRead: 1 });

// Virtual for sender details
messageSchema.virtual('sender', {
  ref: 'User',
  localField: 'senderId',
  foreignField: '_id',
  justOne: true,
});

messageSchema.virtual('recipient', {
  ref: 'User',
  localField: 'recipientId',
  foreignField: '_id',
  justOne: true,
});

// Method to mark as read
messageSchema.methods.markAsRead = function() {
  if (!this.isRead) {
    this.isRead = true;
    this.readAt = new Date();
    return this.save();
  }
  return Promise.resolve(this);
};

// Clean JSON output
messageSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;

