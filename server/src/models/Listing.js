const mongoose = require('mongoose');

const listingSchema = new mongoose.Schema({
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Seller ID is required'],
    index: true,
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters'],
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [5000, 'Description cannot exceed 5000 characters'],
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price must be positive'],
  },
  currency: {
    type: String,
    default: 'ETB',
    enum: ['ETB', 'USD', 'EUR'],
  },
  condition: {
    type: String,
    enum: ['new', 'like-new', 'good', 'fair', 'poor', 'not-applicable'],
    default: 'good',
  },
  category: {
    type: String,
    trim: true,
  },
  images: [{
    url: {
      type: String,
      required: true,
    },
    publicId: String, // Cloudinary public ID for deletion
    _id: false,
  }],
  payment_methods: {
    type: [String],
    required: [true, 'At least one payment method is required'],
    validate: {
      validator: (arr) => arr.length > 0,
      message: 'At least one payment method must be specified',
    },
  },
  payment_instructions: {
    type: String,
    trim: true,
    maxlength: [1000, 'Payment instructions cannot exceed 1000 characters'],
  },
  pickup_options: {
    pickup: {
      type: Boolean,
      default: false,
    },
    courier: {
      type: Boolean,
      default: false,
    },
    meeting_spots: [String],
  },
  highValue: {
    type: Boolean,
    default: false,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  views: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'sold', 'suspended', 'deleted'],
    default: 'active',
  },
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

// Indexes for efficient queries
listingSchema.index({ sellerId: 1, status: 1 });
listingSchema.index({ price: 1 });
listingSchema.index({ createdAt: -1 });
listingSchema.index({ category: 1 });
listingSchema.index({ title: 'text', description: 'text' }); // Text search

// Virtual for seller info (populated)
listingSchema.virtual('seller', {
  ref: 'User',
  localField: 'sellerId',
  foreignField: '_id',
  justOne: true,
});

// Method to increment views
listingSchema.methods.incrementViews = function() {
  this.views += 1;
  return this.save();
};

// Clean up JSON output
listingSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

const Listing = mongoose.model('Listing', listingSchema);

module.exports = Listing;

