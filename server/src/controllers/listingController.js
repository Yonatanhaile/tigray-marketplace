const { Listing } = require('../models');
const logger = require('../services/logger');

/**
 * Create new listing
 */
const createListing = async (req, res) => {
  try {
    const {
      title,
      description,
      price,
      currency,
      condition,
      category,
      images,
      payment_methods,
      payment_instructions,
      pickup_options,
      highValue,
    } = req.body;

    // Check if user is seller or admin
    if (!req.user.roles.includes('seller') && !req.user.roles.includes('admin')) {
      return res.status(403).json({
        error: true,
        message: 'Only sellers can create listings. Please update your profile role.',
      });
    }

    // Create listing
    const listing = await Listing.create({
      sellerId: req.userId,
      title,
      description,
      price,
      currency,
      condition,
      category,
      images: images || [],
      payment_methods,
      payment_instructions,
      pickup_options,
      highValue,
      status: 'active',
    });

    logger.info(`Listing created: ${listing._id} by user ${req.userId}`);

    res.status(201).json({
      error: false,
      message: 'Listing created successfully',
      listing,
    });
  } catch (error) {
    logger.error('Create listing error:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to create listing',
      details: error.message,
    });
  }
};

/**
 * Get all listings with filters and pagination
 */
const getListings = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      query,
      payment_methods,
      minPrice,
      maxPrice,
      category,
      condition,
      sellerId,
      status = 'active',
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build filter
    const filter = { status };

    if (query) {
      filter.$text = { $search: query };
    }

    if (payment_methods) {
      filter.payment_methods = { $in: payment_methods.split(',') };
    }

    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }

    if (category) {
      filter.category = category;
    }

    if (condition) {
      filter.condition = condition;
    }

    if (sellerId) {
      // Handle 'me' as current user
      filter.sellerId = sellerId === 'me' ? req.userId : sellerId;
    }

    // Execute query
    const [listings, total] = await Promise.all([
      Listing.find(filter)
        .populate('sellerId', 'name email badges kyc.status')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Listing.countDocuments(filter),
    ]);

    res.status(200).json({
      error: false,
      listings,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    logger.error('Get listings error:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to fetch listings',
      details: error.message,
    });
  }
};

/**
 * Get single listing by ID
 */
const getListingById = async (req, res) => {
  try {
    const { id } = req.params;

    const listing = await Listing.findById(id)
      .populate('sellerId', 'name email phone badges kyc.status createdAt');

    if (!listing) {
      return res.status(404).json({
        error: true,
        message: 'Listing not found',
      });
    }

    // Increment views (don't await to avoid slowing down response)
    if (req.userId && req.userId !== listing.sellerId._id.toString()) {
      listing.incrementViews().catch(err => logger.error('Error incrementing views:', err));
    }

    res.status(200).json({
      error: false,
      listing,
    });
  } catch (error) {
    logger.error('Get listing error:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to fetch listing',
      details: error.message,
    });
  }
};

/**
 * Update listing
 */
const updateListing = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const listing = await Listing.findById(id);

    if (!listing) {
      return res.status(404).json({
        error: true,
        message: 'Listing not found',
      });
    }

    // Check ownership (normalize to string)
    const currentUserId = req.userId?.toString();
    if (listing.sellerId.toString() !== currentUserId && !req.user.roles.includes('admin')) {
      return res.status(403).json({
        error: true,
        message: 'You do not have permission to update this listing',
      });
    }

    // Update allowed fields
    const allowedUpdates = [
      'title',
      'description',
      'price',
      'currency',
      'condition',
      'category',
      'images',
      'payment_methods',
      'payment_instructions',
      'pickup_options',
      'highValue',
      'status',
    ];

    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined) {
        listing[field] = updates[field];
      }
    });

    await listing.save();

    logger.info(`Listing updated: ${listing._id}`);

    res.status(200).json({
      error: false,
      message: 'Listing updated successfully',
      listing,
    });
  } catch (error) {
    logger.error('Update listing error:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to update listing',
      details: error.message,
    });
  }
};

/**
 * Delete listing (soft delete by setting status)
 */
const deleteListing = async (req, res) => {
  try {
    const { id } = req.params;

    const listing = await Listing.findById(id);

    if (!listing) {
      return res.status(404).json({
        error: true,
        message: 'Listing not found',
      });
    }

    // Check ownership (normalize to string)
    const currentUserId = req.userId?.toString();
    if (listing.sellerId.toString() !== currentUserId && !req.user.roles.includes('admin')) {
      return res.status(403).json({
        error: true,
        message: 'You do not have permission to delete this listing',
      });
    }

    // Soft delete
    listing.status = 'deleted';
    await listing.save();

    logger.info(`Listing deleted: ${listing._id}`);

    res.status(200).json({
      error: false,
      message: 'Listing deleted successfully',
    });
  } catch (error) {
    logger.error('Delete listing error:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to delete listing',
      details: error.message,
    });
  }
};

module.exports = {
  createListing,
  getListings,
  getListingById,
  updateListing,
  deleteListing,
};

