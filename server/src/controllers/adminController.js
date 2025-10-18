const { User, Order, Dispute, Listing } = require('../models');
const { sendKYCNotification } = require('../services/email');
const logger = require('../services/logger');

const getPendingListings = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [listings, total] = await Promise.all([
      Listing.find({ status: 'pending' })
        .populate('sellerId', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Listing.countDocuments({ status: 'pending' }),
    ]);
    res.json({ listings, pagination: { page: parseInt(page), limit: parseInt(limit), total } });
  } catch (e) {
    res.status(500).json({ error: true, message: 'Failed to fetch pending listings' });
  }
};

const approveListing = async (req, res) => {
  try {
    const { id } = req.params;
    const listing = await Listing.findById(id);
    if (!listing) return res.status(404).json({ error: true, message: 'Listing not found' });
    listing.status = 'active';
    await listing.save();
    res.json({ error: false, message: 'Listing approved', listing });
  } catch (e) {
    res.status(500).json({ error: true, message: 'Failed to approve listing' });
  }
};

const rejectListing = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const listing = await Listing.findById(id);
    if (!listing) return res.status(404).json({ error: true, message: 'Listing not found' });
    listing.status = 'suspended';
    listing.moderation_reason = reason || 'Rejected by admin';
    await listing.save();
    res.json({ error: false, message: 'Listing rejected', listing });
  } catch (e) {
    res.status(500).json({ error: true, message: 'Failed to reject listing' });
  }
};

/**
 * Get all orders (admin only)
 */
const getAllOrders = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const filter = {};
    if (status) {
      filter.status = status;
    }

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('listingId', 'title price')
        .populate('buyerId', 'name email')
        .populate('sellerId', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Order.countDocuments(filter),
    ]);

    res.status(200).json({
      error: false,
      orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    logger.error('Get all orders error:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to fetch orders',
      details: error.message,
    });
  }
};

/**
 * Get all disputes (admin only)
 */
const getAllDisputes = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const filter = {};
    if (status) {
      filter.status = status;
    }

    const [disputes, total] = await Promise.all([
      Dispute.find(filter)
        .populate('orderId')
        .populate('reporterId', 'name email phone')
        .populate('reviewedBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Dispute.countDocuments(filter),
    ]);

    res.status(200).json({
      error: false,
      disputes,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    logger.error('Get all disputes error:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to fetch disputes',
      details: error.message,
    });
  }
};

/**
 * Update dispute status (resolve/reject)
 */
const updateDispute = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes, resolution } = req.body;

    const dispute = await Dispute.findById(id).populate('orderId');

    if (!dispute) {
      return res.status(404).json({
        error: true,
        message: 'Dispute not found',
      });
    }

    // Update dispute
    dispute.status = status;
    if (adminNotes) dispute.adminNotes = adminNotes;
    if (resolution) dispute.resolution = resolution;
    dispute.reviewedBy = req.userId;
    dispute.reviewedAt = new Date();

    await dispute.save();

    // Update order status based on resolution
    if (status === 'resolved') {
      const order = dispute.orderId;
      order.status = 'cancelled'; // or other appropriate status
      await order.save();
    }

    logger.info(`Dispute ${id} updated to ${status} by admin ${req.userId}`);

    res.status(200).json({
      error: false,
      message: 'Dispute updated successfully',
      dispute,
    });
  } catch (error) {
    logger.error('Update dispute error:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to update dispute',
      details: error.message,
    });
  }
};

/**
 * Update user KYC status
 */
const updateKYC = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, notes } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        error: true,
        message: 'User not found',
      });
    }

    // Update KYC
    user.kyc.status = status;
    if (notes) user.kyc.notes = notes;
    user.kyc.reviewedBy = req.userId;
    user.kyc.reviewedAt = new Date();

    // Add seller role if approved
    if (status === 'approved' && !user.roles.includes('seller')) {
      user.roles.push('seller');
      user.badges.push('verified-seller');
    }

    await user.save();

    // Send notification email
    try {
      await sendKYCNotification(user.email, status, notes);
    } catch (emailError) {
      logger.error('Failed to send KYC notification email:', emailError);
    }

    logger.info(`KYC ${status} for user ${userId} by admin ${req.userId}`);

    res.status(200).json({
      error: false,
      message: `KYC ${status} successfully`,
      user: user.profile,
    });
  } catch (error) {
    logger.error('Update KYC error:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to update KYC',
      details: error.message,
    });
  }
};

/**
 * Get all users (admin only)
 */
const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, kycStatus, role } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const filter = {};
    if (kycStatus) {
      filter['kyc.status'] = kycStatus;
    }
    if (role) {
      filter.roles = role;
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-passwordHash')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      User.countDocuments(filter),
    ]);

    res.status(200).json({
      error: false,
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    logger.error('Get all users error:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to fetch users',
      details: error.message,
    });
  }
};

/**
 * Get platform statistics
 */
const getStats = async (req, res) => {
  try {
    const [
      totalUsers,
      totalListings,
      activeListings,
      totalOrders,
      totalDisputes,
      openDisputes,
      pendingKYC,
    ] = await Promise.all([
      User.countDocuments(),
      Listing.countDocuments(),
      Listing.countDocuments({ status: 'active' }),
      Order.countDocuments(),
      Dispute.countDocuments(),
      Dispute.countDocuments({ status: { $in: ['open', 'under_review'] } }),
      User.countDocuments({ 'kyc.status': 'pending' }),
    ]);

    res.status(200).json({
      error: false,
      stats: {
        users: {
          total: totalUsers,
          pendingKYC,
        },
        listings: {
          total: totalListings,
          active: activeListings,
        },
        orders: {
          total: totalOrders,
        },
        disputes: {
          total: totalDisputes,
          open: openDisputes,
        },
      },
    });
  } catch (error) {
    logger.error('Get stats error:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to fetch statistics',
      details: error.message,
    });
  }
};

/**
 * Suspend/unsuspend user
 */
const toggleUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { isActive } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        error: true,
        message: 'User not found',
      });
    }

    user.isActive = isActive;
    await user.save();

    logger.info(`User ${userId} ${isActive ? 'activated' : 'suspended'} by admin ${req.userId}`);

    res.status(200).json({
      error: false,
      message: `User ${isActive ? 'activated' : 'suspended'} successfully`,
      user: user.profile,
    });
  } catch (error) {
    logger.error('Toggle user status error:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to update user status',
      details: error.message,
    });
  }
};

module.exports = {
  getAllOrders,
  getAllDisputes,
  updateDispute,
  updateKYC,
  getAllUsers,
  getStats,
  toggleUserStatus,
  getPendingListings,
  approveListing,
  rejectListing,
};

