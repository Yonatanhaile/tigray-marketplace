import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

let socket = null;

export const initializeSocket = (token) => {
  if (socket?.connected) {
    return socket;
  }

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
  });

  socket.on('connect', () => {
    console.log('✅ Socket connected:', socket.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('❌ Socket disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
  });

  socket.on('auth_error', (data) => {
    console.error('Socket auth error:', data);
  });

  return socket;
};

export const getSocket = () => {
  if (!socket) {
    throw new Error('Socket not initialized. Call initializeSocket first.');
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const joinOrderRoom = (orderId) => {
  if (socket?.connected) {
    socket.emit('join_order', { orderId });
  }
};

export const createOrderIntent = (data) => {
  if (socket?.connected) {
    socket.emit('create_order_intent', data);
  }
};

export const sendMessage = (data) => {
  if (socket?.connected) {
    socket.emit('new_message', data);
  }
};

export const markOrderStatus = (data) => {
  if (socket?.connected) {
    socket.emit('mark_order_status', data);
  }
};

export const generateInvoice = (orderId) => {
  if (socket?.connected) {
    socket.emit('generate_invoice', { orderId });
  }
};

export const markMessageRead = (messageId) => {
  if (socket?.connected) {
    socket.emit('mark_message_read', { messageId });
  }
};

// Listing event listeners
export const onListingCreated = (callback) => {
  if (socket) {
    socket.on('listing_created', callback);
  }
};

export const onListingStatusChanged = (callback) => {
  if (socket) {
    socket.on('listing_status_changed', callback);
  }
};

export const onNewActiveListing = (callback) => {
  if (socket) {
    socket.on('new_active_listing', callback);
  }
};

export const offListingCreated = (callback) => {
  if (socket) {
    socket.off('listing_created', callback);
  }
};

export const offListingStatusChanged = (callback) => {
  if (socket) {
    socket.off('listing_status_changed', callback);
  }
};

export const offNewActiveListing = (callback) => {
  if (socket) {
    socket.off('new_active_listing', callback);
  }
};

