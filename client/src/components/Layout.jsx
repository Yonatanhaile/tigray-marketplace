import { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../hooks/useSocket';
import { messagesAPI } from '../services/api';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { setLanguage } from '../i18n';

const Layout = () => {
  const { isAuthenticated, user, logout, isAdmin, isSeller } = useAuth();
  const { socket, connected, notifications, clearAllNotifications } = useSocket();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const { t, i18n } = useTranslation();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Fetch unread message count
  useEffect(() => {
    if (isAuthenticated) {
      const fetchUnreadCount = async () => {
        try {
          const data = await messagesAPI.getUnreadCount();
          setUnreadCount(data.unreadCount || 0);
        } catch (error) {
          console.error('Failed to fetch unread count:', error);
        }
      };
      
      fetchUnreadCount();
      
      // Refresh count every 30 seconds
      const interval = setInterval(fetchUnreadCount, 30000);
      
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  // Listen for new messages via socket
  useEffect(() => {
    if (socket && isAuthenticated) {
      const handleNewMessage = (data) => {
        // Only show notification if message is for current user
        if (data.message?.recipientId?._id === user?._id || data.message?.recipientId === user?._id) {
          setUnreadCount(prev => prev + 1);
          
          // Show toast notification
          toast.success(`New message from ${data.message?.senderId?.name || 'someone'}`, {
            duration: 4000,
            icon: '💬',
          });
        }
      };

      socket.on('new_message', handleNewMessage);

      return () => {
        socket.off('new_message', handleNewMessage);
      };
    }
  }, [socket, isAuthenticated, user]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <Link to="/" className="flex items-center">
                <span className="text-2xl font-bold text-primary-600">
                  {t('appName')}
                </span>
              </Link>
              
              <div className="hidden md:flex space-x-4">
                <Link to="/search" className="text-gray-700 hover:text-primary-600 px-3 py-2">
                  {t('browse')}
                </Link>
                {isSeller && (
                  <Link to="/seller-dashboard" className="text-gray-700 hover:text-primary-600 px-3 py-2">
                    {t('myListings')}
                  </Link>
                )}
                {isAuthenticated && (
                  <Link to="/orders" className="text-gray-700 hover:text-primary-600 px-3 py-2">
                    {t('myOrders')}
                  </Link>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Language switcher */}
              <select
                onChange={(e) => setLanguage(e.target.value)}
                defaultValue={i18n.language}
                className="input py-1 px-2 text-sm"
                title="Language"
              >
                <option value="en">English</option>
                <option value="am">አማርኛ</option>
                <option value="ti">ትግርኛ</option>
                <option value="om">Afaan Oromo</option>
              </select>
              {/* Socket connection indicator */}
              {isAuthenticated && (
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="text-xs text-gray-500">{connected ? 'Live' : 'Offline'}</span>
                </div>
              )}

              {/* Unread Messages */}
              {isAuthenticated && (
                <Link
                  to="/messages"
                  className="relative p-2 text-gray-700 hover:text-primary-600 hover:bg-gray-100 rounded-lg transition"
                  title="Messages"
                >
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[20px] h-5 px-1 text-xs font-bold text-white bg-red-500 rounded-full animate-pulse">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </Link>
              )}

              {/* Notifications */}
              {isAuthenticated && notifications.length > 0 && (
                <div className="relative">
                  <button
                    onClick={clearAllNotifications}
                    className="relative p-2 text-gray-700 hover:text-primary-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    <span className="absolute top-0 right-0 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
                      {notifications.length}
                    </span>
                  </button>
                </div>
              )}

              {isAuthenticated ? (
                <>
                  {isSeller && (
                    <Link
                      to="/create-listing"
                      className="inline-flex items-center gap-2 bg-gradient-to-r from-primary-600 to-primary-700 text-white font-semibold px-4 py-2 rounded-full shadow-lg hover:shadow-xl hover:from-primary-500 hover:to-primary-600 transform hover:scale-105 transition focus:outline-none focus:ring-2 focus:ring-primary-300"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                      <span>{t('createListing')}</span>
                    </Link>
                  )}
                  
                  {isAdmin && (
                    <Link to="/admin" className="btn btn-secondary">
                      {t('adminPanel')}
                    </Link>
                  )}

                  <div className="flex items-center space-x-3">
                    <div className="text-sm">
                      <div className="font-medium text-gray-900">{user?.name}</div>
                      <div className="text-gray-500 text-xs">
                        {user?.roles?.join(', ')}
                      </div>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="text-gray-700 hover:text-primary-600 px-3 py-2"
                    >
                      Logout
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <Link to="/login" className="text-gray-700 hover:text-primary-600 px-3 py-2">
                    {t('login')}
                  </Link>
                  <Link to="/register" className="btn btn-primary">
                    {t('signup')}
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main>
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-500 text-sm">
            <p className="mb-2">
              <strong>⚠️ Payment Disclaimer:</strong> This platform does NOT process payments. 
              All transactions are between buyer and seller. We are not liable for off-site payment disputes.
            </p>
            <p>&copy; 2024 Tigray Marketplace. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;

