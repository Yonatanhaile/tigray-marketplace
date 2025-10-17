const { Message, Order } = require('../models');
const logger = require('../services/logger');

/**
 * Create new message (REST fallback - prefer Socket.io)
 */
const createMessage = async (req, res) => {
  try {
    const { orderId, toUserId, text, attachments } = req.body;

    // Verify order exists and user is authorized
    const order = await Order.findById(orderId);
    
    if (!order) {
      return res.status(404).json({
        error: true,
        message: 'Order not found',
      });
    }

    const isBuyer = order.buyerId.toString() === req.userId;
    const isSeller = order.sellerId.toString() === req.userId;

    if (!isBuyer && !isSeller) {
      return res.status(403).json({
        error: true,
        message: 'You do not have permission to message in this order',
      });
    }

    // Create message
    const message = await Message.create({
      orderId,
      senderId: req.userId,
      recipientId: toUserId,
      text,
      attachments: attachments || [],
      deliveredAt: new Date(),
    });

    // Populate sender info
    await message.populate('senderId', 'name email');

    logger.info(`Message created: ${message._id}`);

    res.status(201).json({
      error: false,
      message: 'Message sent successfully',
      data: message,
    });
  } catch (error) {
    logger.error('Create message error:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to send message',
      details: error.message,
    });
  }
};

/**
 * Get messages for an order
 */
const getOrderMessages = async (req, res) => {
  try {
    const { id: orderId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Verify order exists and user is authorized
    const order = await Order.findById(orderId);
    
    if (!order) {
      return res.status(404).json({
        error: true,
        message: 'Order not found',
      });
    }

    const isBuyer = order.buyerId.toString() === req.userId;
    const isSeller = order.sellerId.toString() === req.userId;
    const isAdmin = req.user.roles.includes('admin');

    if (!isBuyer && !isSeller && !isAdmin) {
      return res.status(403).json({
        error: true,
        message: 'You do not have permission to view these messages',
      });
    }

    // Fetch messages
    const [messages, total] = await Promise.all([
      Message.find({ orderId })
        .populate('senderId', 'name email')
        .populate('recipientId', 'name email')
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Message.countDocuments({ orderId }),
    ]);

    // Mark messages as read if user is recipient
    const unreadMessages = messages.filter(
      msg => msg.recipientId._id.toString() === req.userId && !msg.isRead
    );
    
    if (unreadMessages.length > 0) {
      await Promise.all(unreadMessages.map(msg => msg.markAsRead()));
    }

    res.status(200).json({
      error: false,
      messages,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    logger.error('Get order messages error:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to fetch messages',
      details: error.message,
    });
  }
};

/**
 * Get unread message count for user
 */
const getUnreadCount = async (req, res) => {
  try {
    const count = await Message.countDocuments({
      recipientId: req.userId,
      isRead: false,
    });

    res.status(200).json({
      error: false,
      unreadCount: count,
    });
  } catch (error) {
    logger.error('Get unread count error:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to fetch unread count',
      details: error.message,
    });
  }
};

module.exports = {
  createMessage,
  getOrderMessages,
  getUnreadCount,
};

