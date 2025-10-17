const { Order, Listing, Invoice } = require('../models');
const { addInvoiceJob } = require('../queues');
const logger = require('../services/logger');

/**
 * Create new order (intent to buy)
 */
const createOrder = async (req, res) => {
  try {
    const {
      listingId,
      selected_payment_method,
      meeting_info,
      buyer_note,
    } = req.body;

    // Fetch listing
    const listing = await Listing.findById(listingId);

    if (!listing || listing.status !== 'active') {
      return res.status(404).json({
        error: true,
        message: 'Listing not available',
      });
    }

    // Prevent self-purchase
    if (listing.sellerId.toString() === req.userId) {
      return res.status(400).json({
        error: true,
        message: 'You cannot purchase your own listing',
      });
    }

    // Verify payment method is available
    if (!listing.payment_methods.includes(selected_payment_method)) {
      return res.status(400).json({
        error: true,
        message: 'Selected payment method not available for this listing',
      });
    }

    // Create order
    const order = await Order.create({
      listingId,
      buyerId: req.userId,
      sellerId: listing.sellerId,
      status: 'requested',
      payment_status: 'none',
      selected_payment_method,
      meeting_info,
      buyer_note,
      price_agreed: listing.price,
      currency: listing.currency,
      statusHistory: [{
        status: 'requested',
        changedBy: req.userId,
        timestamp: new Date(),
        note: 'Order intent created',
      }],
    });

    // Populate for response
    await order.populate([
      { path: 'listingId', select: 'title price images' },
      { path: 'buyerId', select: 'name email phone' },
      { path: 'sellerId', select: 'name email phone' },
    ]);

    logger.info(`Order created: ${order._id}`);

    res.status(201).json({
      error: false,
      message: 'Order intent created successfully',
      order,
    });
  } catch (error) {
    logger.error('Create order error:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to create order',
      details: error.message,
    });
  }
};

/**
 * Get single order by ID
 */
const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id)
      .populate('listingId')
      .populate('buyerId', 'name email phone badges')
      .populate('sellerId', 'name email phone badges kyc.status');

    if (!order) {
      return res.status(404).json({
        error: true,
        message: 'Order not found',
      });
    }

    // Check authorization
    const isBuyer = order.buyerId._id.toString() === req.userId;
    const isSeller = order.sellerId._id.toString() === req.userId;
    const isAdmin = req.user.roles.includes('admin');

    if (!isBuyer && !isSeller && !isAdmin) {
      return res.status(403).json({
        error: true,
        message: 'You do not have permission to view this order',
      });
    }

    res.status(200).json({
      error: false,
      order,
    });
  } catch (error) {
    logger.error('Get order error:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to fetch order',
      details: error.message,
    });
  }
};

/**
 * Get all orders for current user
 */
const getMyOrders = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, role = 'buyer' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build filter based on role
    const filter = role === 'seller' 
      ? { sellerId: req.userId }
      : { buyerId: req.userId };

    if (status) {
      filter.status = status;
    }

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('listingId', 'title price images')
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
    logger.error('Get my orders error:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to fetch orders',
      details: error.message,
    });
  }
};

/**
 * Update order status
 */
const updateOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, payment_status, payment_evidence, seller_note, meeting_info } = req.body;

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        error: true,
        message: 'Order not found',
      });
    }

    // Check authorization (seller, buyer for some fields, or admin)
    const isBuyer = order.buyerId.toString() === req.userId;
    const isSeller = order.sellerId.toString() === req.userId;
    const isAdmin = req.user.roles.includes('admin');

    if (!isBuyer && !isSeller && !isAdmin) {
      return res.status(403).json({
        error: true,
        message: 'You do not have permission to update this order',
      });
    }

    // Update status (only seller or admin)
    if (status && (isSeller || isAdmin)) {
      await order.updateStatus(status, req.userId);
    }

    // Update payment status
    if (payment_status && (isSeller || isAdmin)) {
      order.payment_status = payment_status;
    }

    // Add payment evidence (buyer or seller)
    if (payment_evidence) {
      order.payment_evidence.push({
        url: payment_evidence,
        uploadedBy: req.userId,
        uploadedAt: new Date(),
      });
    }

    // Update seller note
    if (seller_note && (isSeller || isAdmin)) {
      order.seller_note = seller_note;
    }

    // Update meeting info (buyer, seller, or admin)
    if (meeting_info) {
      order.meeting_info = { ...order.meeting_info, ...meeting_info };
    }

    await order.save();

    // Populate for response
    await order.populate([
      { path: 'listingId', select: 'title price' },
      { path: 'buyerId', select: 'name email' },
      { path: 'sellerId', select: 'name email' },
    ]);

    logger.info(`Order updated: ${order._id}`);

    res.status(200).json({
      error: false,
      message: 'Order updated successfully',
      order,
    });
  } catch (error) {
    logger.error('Update order error:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to update order',
      details: error.message,
    });
  }
};

/**
 * Request invoice generation
 */
const requestInvoice = async (req, res) => {
  try {
    const { id: orderId } = req.params;

    const order = await Order.findById(orderId)
      .populate('listingId')
      .populate('buyerId', 'name email phone')
      .populate('sellerId', 'name email phone');

    if (!order) {
      return res.status(404).json({
        error: true,
        message: 'Order not found',
      });
    }

    // Only seller or admin can generate invoice
    const isSeller = order.sellerId._id.toString() === req.userId;
    const isAdmin = req.user.roles.includes('admin');

    if (!isSeller && !isAdmin) {
      return res.status(403).json({
        error: true,
        message: 'Only the seller or admin can generate invoices',
      });
    }

    // Check if invoice already exists
    const existingInvoice = await Invoice.findOne({ orderId });
    
    if (existingInvoice && existingInvoice.status === 'completed') {
      return res.status(200).json({
        error: false,
        message: 'Invoice already exists',
        invoice: existingInvoice,
      });
    }

    // Create invoice record
    const invoice = await Invoice.create({
      orderId: order._id,
      issuerId: req.userId,
      status: 'pending',
      templateData: {
        orderNumber: order._id.toString().slice(-8).toUpperCase(),
        listingTitle: order.listingId.title,
        price: order.price_agreed,
        currency: order.currency,
        buyer: {
          name: order.buyerId.name,
          email: order.buyerId.email,
          phone: order.buyerId.phone,
        },
        seller: {
          name: order.sellerId.name,
          email: order.sellerId.email,
          phone: order.sellerId.phone,
        },
        createdAt: order.createdAt,
        status: order.status,
      },
    });

    // Add job to queue
    const job = await addInvoiceJob({
      invoiceId: invoice._id,
      orderId: order._id,
      issuerId: req.userId,
      orderData: invoice.templateData,
    });

    logger.info(`Invoice generation queued: ${invoice._id} (Job: ${job.id})`);

    res.status(202).json({
      error: false,
      message: 'Invoice generation started',
      invoice,
      jobId: job.id,
    });
  } catch (error) {
    logger.error('Request invoice error:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to request invoice',
      details: error.message,
    });
  }
};

/**
 * Get invoice for order
 */
const getInvoice = async (req, res) => {
  try {
    const { id: orderId } = req.params;

    const invoice = await Invoice.findOne({ orderId })
      .populate('orderId')
      .populate('issuerId', 'name email');

    if (!invoice) {
      return res.status(404).json({
        error: true,
        message: 'Invoice not found',
      });
    }

    // Check authorization
    const order = invoice.orderId;
    const isBuyer = order.buyerId.toString() === req.userId;
    const isSeller = order.sellerId.toString() === req.userId;
    const isAdmin = req.user.roles.includes('admin');

    if (!isBuyer && !isSeller && !isAdmin) {
      return res.status(403).json({
        error: true,
        message: 'You do not have permission to view this invoice',
      });
    }

    res.status(200).json({
      error: false,
      invoice,
    });
  } catch (error) {
    logger.error('Get invoice error:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to fetch invoice',
      details: error.message,
    });
  }
};

module.exports = {
  createOrder,
  getOrderById,
  getMyOrders,
  updateOrder,
  requestInvoice,
  getInvoice,
};

