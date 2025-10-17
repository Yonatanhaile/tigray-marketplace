import { createContext, useContext, useEffect, useState } from 'react';
import { getSocket, initializeSocket } from '../services/socket';
import { useAuth } from './useAuth';
import toast from 'react-hot-toast';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { token, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (isAuthenticated && token) {
      const socketInstance = initializeSocket(token);
      setSocket(socketInstance);

      // Setup event listeners
      socketInstance.on('connect', () => {
        setConnected(true);
      });

      socketInstance.on('disconnect', () => {
        setConnected(false);
      });

      socketInstance.on('auth_success', (data) => {
        console.log('Socket authenticated:', data);
      });

      socketInstance.on('notification', (data) => {
        setNotifications((prev) => [...prev, data]);
        
        // Show toast notification
        if (data.type === 'new_order') {
          toast.success(`New order: ${data.payload.listingTitle}`);
        } else if (data.type === 'order_status_changed') {
          toast.info(`Order status updated: ${data.payload.status}`);
        }
      });

      socketInstance.on('order_update', (data) => {
        console.log('Order update:', data);
      });

      socketInstance.on('new_message', (data) => {
        console.log('New message:', data);
      });

      socketInstance.on('invoice_ready', (data) => {
        toast.success('Invoice is ready for download!');
        console.log('Invoice ready:', data);
      });

      socketInstance.on('error', (error) => {
        console.error('Socket error:', error);
        toast.error(error.message || 'Socket error occurred');
      });

      return () => {
        socketInstance.off('connect');
        socketInstance.off('disconnect');
        socketInstance.off('auth_success');
        socketInstance.off('notification');
        socketInstance.off('order_update');
        socketInstance.off('new_message');
        socketInstance.off('invoice_ready');
        socketInstance.off('error');
      };
    }
  }, [isAuthenticated, token]);

  const clearNotification = (index) => {
    setNotifications((prev) => prev.filter((_, i) => i !== index));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const value = {
    socket,
    connected,
    notifications,
    clearNotification,
    clearAllNotifications,
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
};

