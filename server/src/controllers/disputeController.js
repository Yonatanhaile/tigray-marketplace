const { Dispute, Order } = require('../models');
const { sendDisputeNotification } = require('../services/email');
const logger = require('../services/logger');

/**
 * Create new dispute
 */
const createDispute = async (req, res) => {
  try {
    const { orderId, reason, category, attachments } = req.body;

    // Verify order exists
    const order = await Order.findById(orderId);
    
    if (!order) {
      return res.status(404).json({
        error: true,
        message: 'Order not found',
      });
    }

    // Verify user is buyer or seller
    const isBuyer = order.buyerId.toString() === req.userId.toString();
    const isSeller = order.sellerId.toString() === req.userId.toString();

    if (!isBuyer && !isSeller) {
      return res.status(403).json({
        error: true,
        message: 'You do not have permission to file a dispute for this order',
      });
    }

    // Check if dispute already exists for this order
    const existingDispute = await Dispute.findOne({
      orderId,
      status: { $in: ['open', 'under_review'] },
    });

    if (existingDispute) {
      return res.status(400).json({
        error: true,
        message: 'An active dispute already exists for this order',
        disputeId: existingDispute._id,
      });
    }

    // Create dispute
    const dispute = await Dispute.create({
      orderId,
      reporterId: req.userId,
      reason,
      category: category || 'other',
      attachments: attachments || [],
      status: 'open',
    });

    // Update order status
    order.status = 'disputed';
    order.payment_status = 'disputed';
    await order.save();

    // Notify admin (in production, fetch admin email from DB)
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@tigraymarket.com';
    try {
      await sendDisputeNotification(adminEmail, {
        orderId: order._id,
        reporterName: req.user.name,
        reason,
        category: category || 'other',
      });
    } catch (emailError) {
      logger.error('Failed to send dispute notification email:', emailError);
    }

    logger.info(`Dispute created: ${dispute._id} for order ${orderId}`);

    res.status(201).json({
      error: false,
      message: 'Dispute filed successfully',
      dispute,
    });
  } catch (error) {
    logger.error('Create dispute error:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to create dispute',
      details: error.message,
    });
  }
};

/**
 * Get single dispute by ID
 */
const getDisputeById = async (req, res) => {
  try {
    const { id } = req.params;

    const dispute = await Dispute.findById(id)
      .populate('orderId')
      .populate('reporterId', 'name email phone')
      .populate('reviewedBy', 'name email');

    if (!dispute) {
      return res.status(404).json({
        error: true,
        message: 'Dispute not found',
      });
    }

    // Check authorization
    const order = dispute.orderId;
    const isBuyer = order.buyerId.toString() === req.userId.toString();
    const isSeller = order.sellerId.toString() === req.userId.toString();
    const isReporter = dispute.reporterId._id.toString() === req.userId.toString();
    const isAdmin = req.user.roles.includes('admin');

    if (!isBuyer && !isSeller && !isReporter && !isAdmin) {
      return res.status(403).json({
        error: true,
        message: 'You do not have permission to view this dispute',
      });
    }

    res.status(200).json({
      error: false,
      dispute,
    });
  } catch (error) {
    logger.error('Get dispute error:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to fetch dispute',
      details: error.message,
    });
  }
};

/**
 * Get disputes for current user
 */
const getMyDisputes = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Find all orders where user is buyer or seller
    const orders = await Order.find({
      $or: [
        { buyerId: req.userId },
        { sellerId: req.userId },
      ],
    }).select('_id');

    const orderIds = orders.map(o => o._id);

    // Build filter
    const filter = { orderId: { $in: orderIds } };
    if (status) {
      filter.status = status;
    }

    const [disputes, total] = await Promise.all([
      Dispute.find(filter)
        .populate('orderId', 'status')
        .populate('reporterId', 'name email')
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
    logger.error('Get my disputes error:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to fetch disputes',
      details: error.message,
    });
  }
};

/**
 * Add comment to dispute
 */
const addDisputeComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;

    const dispute = await Dispute.findById(id).populate('orderId');

    if (!dispute) {
      return res.status(404).json({
        error: true,
        message: 'Dispute not found',
      });
    }

    // Check authorization
    const order = dispute.orderId;
    const isBuyer = order.buyerId.toString() === req.userId.toString();
    const isSeller = order.sellerId.toString() === req.userId.toString();
    const isReporter = dispute.reporterId.toString() === req.userId.toString();
    const isAdmin = req.user.roles.includes('admin');

    if (!isBuyer && !isSeller && !isReporter && !isAdmin) {
      return res.status(403).json({
        error: true,
        message: 'You do not have permission to comment on this dispute',
      });
    }

    await dispute.addComment(req.userId, text, isAdmin);

    res.status(200).json({
      error: false,
      message: 'Comment added successfully',
      dispute,
    });
  } catch (error) {
    logger.error('Add dispute comment error:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to add comment',
      details: error.message,
    });
  }
};

module.exports = {
  createDispute,
  getDisputeById,
  getMyDisputes,
  addDisputeComment,
};

