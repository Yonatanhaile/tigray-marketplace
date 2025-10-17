const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: [true, 'Order ID is required'],
    index: true,
  },
  issuerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Issuer ID is required'],
  },
  invoiceNumber: {
    type: String,
    unique: true,
    index: true,
  },
  templateData: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  generatedPdfUrl: {
    type: String,
  },
  generatedPdfPublicId: {
    type: String, // For Cloudinary deletion
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending',
  },
  errorMessage: String,
  metadata: {
    fileSize: Number,
    generationTimeMs: Number,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  completedAt: Date,
}, {
  timestamps: true,
});

// Indexes
invoiceSchema.index({ orderId: 1 });
invoiceSchema.index({ issuerId: 1 });
invoiceSchema.index({ invoiceNumber: 1 });
invoiceSchema.index({ createdAt: -1 });

// Generate invoice number before saving
invoiceSchema.pre('save', async function(next) {
  if (!this.invoiceNumber) {
    const year = new Date().getFullYear();
    const count = await this.constructor.countDocuments();
    this.invoiceNumber = `INV-${year}-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

// Virtual for order details
invoiceSchema.virtual('order', {
  ref: 'Order',
  localField: 'orderId',
  foreignField: '_id',
  justOne: true,
});

invoiceSchema.virtual('issuer', {
  ref: 'User',
  localField: 'issuerId',
  foreignField: '_id',
  justOne: true,
});

// Clean JSON output
invoiceSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

const Invoice = mongoose.model('Invoice', invoiceSchema);

module.exports = Invoice;

