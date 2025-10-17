const mongoose = require('mongoose');

// Import or define Invoice model
// This is a duplicate of the server model, needed for worker access

const invoiceSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
    index: true,
  },
  issuerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
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
  generatedPdfUrl: String,
  generatedPdfPublicId: String,
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

// Generate invoice number before saving
invoiceSchema.pre('save', async function(next) {
  if (!this.invoiceNumber) {
    const year = new Date().getFullYear();
    const count = await this.constructor.countDocuments();
    this.invoiceNumber = `INV-${year}-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Invoice', invoiceSchema);

