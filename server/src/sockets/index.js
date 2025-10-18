const { verifyToken } = require('../services/jwt');
const { User, Order, Message } = require('../models');
const logger = require('../services/logger');
const { addInvoiceJob } = require('../queues');

/**
 * Socket.io event handlers with JWT authentication
 */
const initializeSocketHandlers = (io) => {
  // Middleware: Authenticate socket connections using JWT
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication required'));
      }

      // Verify token
      const decoded = verifyToken(token);
      
      // Fetch user
      const user = await User.findById(decoded.userId);
      
      if (!user || !user.isActive) {
        return next(new Error('User not found or inactive'));
      }

      // Attach user to socket
      socket.userId = user._id.toString();
      socket.user = user;
      
      next();
    } catch (error) {
      logger.error('Socket authentication error:', error);
      next(new Error('Invalid token'));
    }
  });

  // Connection handler
  io.on('connection', (socket) => {
    logger.info(`✅ Socket connected: ${socket.id} (User: ${socket.userId})`);
    
    // Join user's personal room
    socket.join(`user:${socket.userId}`);
    
    // Emit successful authentication
    socket.emit('auth_success', { userId: socket.userId });

    // =========================
    // Event: Join order room
    // =========================
    socket.on('join_order', async ({ orderId }) => {
      try {
        // Verify user is part of this order
        const order = await Order.findById(orderId);
        
        if (!order) {
          return socket.emit('error', { message: 'Order not found' });
        }

        const isBuyer = order.buyerId.toString() === socket.userId;
        const isSeller = order.sellerId.toString() === socket.userId;
        const isAdmin = socket.user.roles.includes('admin');

        if (!isBuyer && !isSeller && !isAdmin) {
          return socket.emit('error', { message: 'Not authorized to access this order' });
        }

        socket.join(`order:${orderId}`);
        logger.info(`User ${socket.userId} joined order room: ${orderId}`);
        
        socket.emit('joined_order', { orderId });
      } catch (error) {
        logger.error('Error joining order:', error);
        socket.emit('error', { message: 'Failed to join order room' });
      }
    });

    // =========================
    // Event: Create order intent
    // =========================
    socket.on('create_order_intent', async (data) => {
      try {
        const { listingId, meeting_info, selected_payment_method, buyer_note } = data;

        // Fetch listing
        const Listing = require('../models/Listing');
        const listing = await Listing.findById(listingId);

        if (!listing || listing.status !== 'active') {
          return socket.emit('error', { message: 'Listing not available' });
        }

        // Create order
        const order = await Order.create({
          listingId,
          buyerId: socket.userId,
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
            changedBy: socket.userId,
            timestamp: new Date(),
            note: 'Order intent created',
          }],
        });

        // Notify seller
        io.to(`user:${listing.sellerId}`).emit('order_update', {
          orderId: order._id,
          status: order.status,
          message: 'New order intent received',
        });

        io.to(`user:${listing.sellerId}`).emit('notification', {
          type: 'new_order',
          payload: {
            orderId: order._id,
            listingTitle: listing.title,
            buyerName: socket.user.name,
          },
        });

        // Send confirmation to buyer
        socket.emit('order_created', {
          orderId: order._id,
          order,
        });

        logger.info(`Order intent created: ${order._id}`);
      } catch (error) {
        logger.error('Error creating order intent:', error);
        socket.emit('error', { message: 'Failed to create order intent' });
      }
    });

    // =========================
    // Event: New message
    // =========================
    socket.on('new_message', async (data) => {
      try {
        const { orderId, toUserId, text, attachments = [] } = data;

        // Verify order exists and user is authorized
        const order = await Order.findById(orderId);
        
        if (!order) {
          return socket.emit('error', { message: 'Order not found' });
        }

        const isBuyer = order.buyerId.toString() === socket.userId;
        const isSeller = order.sellerId.toString() === socket.userId;

        if (!isBuyer && !isSeller) {
          return socket.emit('error', { message: 'Not authorized' });
        }

        // Create message
        const message = await Message.create({
          orderId,
          senderId: socket.userId,
          recipientId: toUserId,
          text,
          attachments,
          deliveredAt: new Date(),
        });

        // Populate sender info
        await message.populate('senderId', 'name email');

        // Emit to recipient
        io.to(`user:${toUserId}`).emit('new_message', {
          message,
        });

        // Emit to order room
        io.to(`order:${orderId}`).emit('new_message', {
          message,
        });

        // Confirm to sender
        socket.emit('message_sent', {
          messageId: message._id,
          message,
        });

        logger.info(`Message sent in order ${orderId}`);
      } catch (error) {
        logger.error('Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // =========================
    // Event: Mark order status
    // =========================
    socket.on('mark_order_status', async (data) => {
      try {
        const { orderId, status, note = '' } = data;

        const order = await Order.findById(orderId);
        
        if (!order) {
          return socket.emit('error', { message: 'Order not found' });
        }

        // Only seller or admin can update status
        const isSeller = order.sellerId.toString() === socket.userId;
        const isAdmin = socket.user.roles.includes('admin');

        if (!isSeller && !isAdmin) {
          return socket.emit('error', { message: 'Not authorized' });
        }

        // Update order status
        await order.updateStatus(status, socket.userId, note);

        // Update payment status based on order status
        if (status === 'paid_offsite') {
          order.payment_status = 'paid_offsite';
          await order.save();
        }

        // Notify both parties
        io.to(`order:${orderId}`).emit('order_update', {
          orderId: order._id,
          status: order.status,
          payment_status: order.payment_status,
          message: `Order status updated to: ${status}`,
        });

        io.to(`user:${order.buyerId}`).emit('notification', {
          type: 'order_status_changed',
          payload: {
            orderId: order._id,
            status: order.status,
          },
        });

        logger.info(`Order ${orderId} status updated to ${status}`);
      } catch (error) {
        logger.error('Error updating order status:', error);
        socket.emit('error', { message: 'Failed to update order status' });
      }
    });

    // =========================
    // Event: Generate invoice
    // =========================
    socket.on('generate_invoice', async (data) => {
      try {
        const { orderId } = data;

        const order = await Order.findById(orderId)
          .populate('listingId')
          .populate('buyerId', 'name email phone')
          .populate('sellerId', 'name email phone');
        
        if (!order) {
          return socket.emit('error', { message: 'Order not found' });
        }

        // Only seller or admin can generate invoice
        const isSeller = order.sellerId._id.toString() === socket.userId;
        const isAdmin = socket.user.roles.includes('admin');

        if (!isSeller && !isAdmin) {
          return socket.emit('error', { message: 'Not authorized' });
        }

        // Add job to queue
        const job = await addInvoiceJob({
          orderId: order._id,
          issuerId: socket.userId,
          orderData: {
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

        socket.emit('invoice_queued', {
          orderId,
          jobId: job.id,
          message: 'Invoice generation started',
        });

        logger.info(`Invoice generation queued for order ${orderId}`);
      } catch (error) {
        logger.error('Error queueing invoice:', error);
        socket.emit('error', { message: 'Failed to generate invoice' });
      }
    });

    // =========================
    // Event: Mark message as read
    // =========================
    socket.on('mark_message_read', async (data) => {
      try {
        const { messageId } = data;

        const message = await Message.findById(messageId);
        
        if (!message) {
          return socket.emit('error', { message: 'Message not found' });
        }

        if (message.recipientId.toString() !== socket.userId) {
          return socket.emit('error', { message: 'Not authorized' });
        }

        await message.markAsRead();

        // Notify recipient to update unread count
        io.to(`user:${socket.userId}`).emit('messages_read', {
          messageId: message._id,
          count: 1,
        });

        // Notify sender
        io.to(`user:${message.senderId}`).emit('message_read', {
          messageId: message._id,
          readAt: message.readAt,
        });
      } catch (error) {
        logger.error('Error marking message as read:', error);
      }
    });

    // =========================
    // Disconnect handler
    // =========================
    socket.on('disconnect', (reason) => {
      logger.info(`❌ Socket disconnected: ${socket.id} (User: ${socket.userId}) - ${reason}`);
    });

    // =========================
    // Error handler
    // =========================
    socket.on('error', (error) => {
      logger.error('Socket error:', error);
    });
  });

  logger.info('✅ Socket.io handlers initialized');
};

module.exports = {
  initializeSocketHandlers,
};

