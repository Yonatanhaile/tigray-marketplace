import { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../hooks/useSocket';
import { messagesAPI } from '../services/api';
import toast from 'react-hot-toast';
import LanguageSwitcher from './LanguageSwitcher';

const Layout = () => {
  const { t } = useTranslation();
  const { isAuthenticated, user, logout, isAdmin, isSeller } = useAuth();
  const { socket, connected, notifications, clearAllNotifications } = useSocket();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    setMobileMenuOpen(false);
  };

  // Fetch unread message count and pending orders count
  useEffect(() => {
    if (isAuthenticated) {
      const fetchUnreadCount = async () => {
        try {
          const data = await messagesAPI.getUnreadCount();
          console.log('📬 Fetched unread count:', data.unreadCount);
          setUnreadCount(data.unreadCount || 0);
        } catch (error) {
          // Silently fail - API might be deploying
          if (error.code !== 'ERR_NETWORK' && error.message !== 'Network Error') {
            console.warn('Could not fetch unread count:', error.message);
          }
        }
      };

      const fetchPendingOrdersCount = async () => {
        if (isSeller) {
          try {
            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/orders/pending/count`, {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
              },
            });
            
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            setPendingOrdersCount(data.pendingCount || 0);
          } catch (error) {
            // Silently fail - API might be deploying or sleeping (Render free tier)
            // Keep the last known count instead of showing error
          }
        }
      };
      
      fetchUnreadCount();
      fetchPendingOrdersCount();
      
      // Refresh counts every 30 seconds
      const interval = setInterval(() => {
        fetchUnreadCount();
        fetchPendingOrdersCount();
      }, 30000);
      
      // Listen for custom event to clear order notifications
      const handleClearOrderNotifications = () => {
        console.log('🔔 Clearing order notifications');
        setPendingOrdersCount(0);
      };
      
      // Listen for custom event to clear message notifications
      const handleClearMessageNotifications = () => {
        console.log('🔔 Clearing message notifications');
        fetchUnreadCount();
      };
      
      window.addEventListener('clear-order-notifications', handleClearOrderNotifications);
      window.addEventListener('clear-message-notifications', handleClearMessageNotifications);
      
      return () => {
        clearInterval(interval);
        window.removeEventListener('clear-order-notifications', handleClearOrderNotifications);
        window.removeEventListener('clear-message-notifications', handleClearMessageNotifications);
      };
    }
  }, [isAuthenticated, isSeller]);

  // Listen for new messages via socket
  useEffect(() => {
    if (socket && isAuthenticated && user) {
      console.log('🔌 [Layout] Setting up socket listeners...');
      console.log('Socket connected:', socket.connected);
      console.log('User ID:', user.id);
      console.log('Is Seller:', isSeller);
      
      const currentUserId = user._id?.toString() || user.id?.toString();
      
      const handleNewMessage = (data) => {
        // Normalize recipient ID
        const recipientId = data.message?.recipientId?._id?.toString() 
          || data.message?.recipientId?.toString();
        
        // Only increment and notify if message is for current user
        if (recipientId === currentUserId) {
          setUnreadCount(prev => prev + 1);
          
          // Invalidate unread count query to refresh across all components
          queryClient.invalidateQueries(['messages', 'unread-count']);
          
          // Show toast notification
          const senderName = data.message?.senderId?.name || 'someone';
          toast(`💬 New message from ${senderName}`, {
            duration: 4000,
            style: {
              background: '#2563eb',
              color: '#fff',
            },
          });
        }
      };

      const handleMessagesRead = (data) => {
        console.log('🔔 Messages marked as read, updating count. Data:', data);
        // Immediately fetch fresh unread count from server
        messagesAPI.getUnreadCount()
          .then(data => {
            console.log('📊 New unread count after read:', data.unreadCount);
            setUnreadCount(data.unreadCount || 0);
            // Invalidate unread count query to refresh across all components
            queryClient.invalidateQueries(['messages', 'unread-count']);
          })
          .catch(err => console.error('Failed to refresh unread count:', err));
      };

      const handleMessagesReadByRecipient = (data) => {
        console.log('✅ Your messages were read by recipient:', data);
        // Refresh orders to update any UI indicators
        queryClient.invalidateQueries(['orders']);
      };

      const handleListingStatusChanged = (data) => {
        console.log('🔄 [Layout] Listing status changed:', data);
        queryClient.invalidateQueries(['listings']);
        queryClient.invalidateQueries(['listings', 'my-listings']);
        
        // Only show approval message if it was pending before (admin approval)
        if (data.newStatus === 'active' && data.oldStatus === 'pending') {
          toast.success('🎉 Your listing has been approved and is now active!');
        } else if (data.newStatus === 'suspended') {
          toast.error(`❌ Your listing was rejected. Reason: ${data.reason || 'Not specified'}`);
        }
        // Don't show toast for sold status - seller dashboard handles that
      };

      const handleNewActiveListing = (data) => {
        console.log('✨ [Layout] New active listing:', data);
        queryClient.invalidateQueries(['listings']);
      };

      const handleNewOrder = (data) => {
        console.log('🛒 [Layout] New order received!');
        console.log('Order data:', data);
        console.log('Current pending count:', pendingOrdersCount);
        
        // Update pending orders count
        setPendingOrdersCount(prev => {
          const newCount = prev + 1;
          console.log('Updated pending count:', newCount);
          return newCount;
        });
        
        // Invalidate orders queries
        queryClient.invalidateQueries(['orders']);
        console.log('✅ Order notification handled');
      };

      socket.on('new_message', handleNewMessage);
      socket.on('messages_read', handleMessagesRead);
      socket.on('messages_read_by_recipient', handleMessagesReadByRecipient);
      socket.on('listing_status_changed', handleListingStatusChanged);
      socket.on('new_active_listing', handleNewActiveListing);
      socket.on('new_order', handleNewOrder);
      
      console.log('✅ All socket listeners registered (including new_order and messages_read_by_recipient)');

      return () => {
        socket.off('new_message', handleNewMessage);
        socket.off('messages_read', handleMessagesRead);
        socket.off('messages_read_by_recipient', handleMessagesReadByRecipient);
        socket.off('listing_status_changed', handleListingStatusChanged);
        socket.off('new_active_listing', handleNewActiveListing);
        socket.off('new_order', handleNewOrder);
      };
    }
  }, [socket, isAuthenticated, user, queryClient]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-50">
      {/* Modern Navigation with Glass Morphism */}
      <nav className="sticky top-0 z-50 glass border-b border-white/20 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16 md:h-20">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-1.5 sm:space-x-2 group">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <span className="text-white text-lg sm:text-xl font-bold">Y</span>
              </div>
              <span className="text-lg sm:text-xl md:text-2xl font-bold text-gradient hidden sm:block">
                YohaTrade
              </span>
            </Link>
            
            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-6">
              <Link to="/search" className="nav-link text-gray-700 hover:text-purple-600 px-4 py-2 rounded-lg transition-colors font-medium">
                🔍 {t('nav.browse')}
              </Link>
              {isSeller && (
                <Link to="/seller-dashboard" className="nav-link text-gray-700 hover:text-purple-600 px-4 py-2 rounded-lg transition-colors font-medium">
                  📦 {t('nav.myListings')}
                </Link>
              )}
              {isAuthenticated && (
                <Link to="/orders" className="nav-link text-gray-700 hover:text-purple-600 px-4 py-2 rounded-lg transition-colors font-medium relative">
                  🛒 {t('nav.myOrders')}
                  {isSeller && pendingOrdersCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-green-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                      {pendingOrdersCount}
                    </span>
                  )}
                </Link>
              )}
            </div>

            <div className="flex items-center space-x-1 sm:space-x-2 md:space-x-4">
              {/* Language Switcher */}
              <LanguageSwitcher />

              {/* Socket connection indicator - Desktop only */}
              {isAuthenticated && (
                <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 bg-white/50 rounded-full border border-gray-200">
                  <div className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                  <span className="text-xs font-medium text-gray-600">{connected ? t('nav.live') : t('nav.offline')}</span>
                </div>
              )}

              {/* Unread Messages */}
              {isAuthenticated && (
                <Link
                  to="/messages"
                  className="relative p-1.5 sm:p-2 md:p-2.5 text-gray-700 hover:text-purple-600 hover:bg-purple-50 rounded-lg sm:rounded-xl transition-all"
                  title="Messages"
                >
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 inline-flex items-center justify-center min-w-[18px] h-[18px] sm:min-w-[22px] sm:h-[22px] px-1 sm:px-1.5 text-[10px] sm:text-xs font-bold text-white bg-gradient-to-r from-red-500 to-pink-500 rounded-full shadow-lg animate-pulse">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </Link>
              )}

              {/* Pending Orders (Sellers Only) */}
              {isAuthenticated && isSeller && (
                <Link
                  to="/seller-dashboard#recent-orders"
                  className="relative p-1.5 sm:p-2 md:p-2.5 text-gray-700 hover:text-green-600 hover:bg-green-50 rounded-lg sm:rounded-xl transition-all"
                  title="Order Requests"
                >
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                  {pendingOrdersCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 inline-flex items-center justify-center min-w-[18px] h-[18px] sm:min-w-[22px] sm:h-[22px] px-1 sm:px-1.5 text-[10px] sm:text-xs font-bold text-white bg-gradient-to-r from-green-500 to-emerald-500 rounded-full shadow-lg animate-pulse">
                      {pendingOrdersCount > 99 ? '99+' : pendingOrdersCount}
                    </span>
                  )}
                </Link>
              )}

              {/* Notifications */}
              {isAuthenticated && notifications.length > 0 && (
                <div className="relative">
                  <Link
                    to="/orders"
                    onClick={clearAllNotifications}
                    className="relative p-1.5 sm:p-2 md:p-2.5 text-gray-700 hover:text-purple-600 hover:bg-purple-50 rounded-lg sm:rounded-xl transition-all block"
                    title="View notifications"
                  >
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    <span className="absolute top-0 right-0 inline-flex items-center justify-center w-4 h-4 sm:w-5 sm:h-5 text-[10px] sm:text-xs font-bold text-white bg-gradient-to-r from-red-500 to-pink-500 rounded-full shadow-lg">
                      {notifications.length}
                    </span>
                  </Link>
                </div>
              )}

              {isAuthenticated ? (
                <>
                  {/* Create Listing - Desktop */}
                  {isSeller && (
                    <Link
                      to="/create-listing"
                      className="hidden md:inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold px-5 py-2.5 rounded-xl shadow-lg shadow-purple-500/50 hover:shadow-xl hover:scale-105 transform transition-all"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                      <span>{t('nav.createListing')}</span>
                    </Link>
                  )}
                  
                  {/* Admin Panel - Desktop */}
                  {isAdmin && (
                    <Link to="/admin" className="hidden md:inline-flex btn btn-secondary">
                      ⚙️ {t('nav.admin')}
                    </Link>
                  )}

                  {/* User Menu - Desktop */}
                  <div className="hidden lg:flex items-center space-x-3 px-4 py-2 bg-white/50 rounded-xl border border-gray-200">
                    <Link to="/profile" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
                      {user?.profileImage?.url ? (
                        <img 
                          src={user.profileImage.url} 
                          alt={user?.name} 
                          className="w-8 h-8 rounded-full object-cover border-2 border-purple-200"
                        />
                      ) : (
                        <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                          {user?.name?.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="text-sm">
                        <div className="font-semibold text-gray-900">{user?.name}</div>
                        <div className="text-gray-500 text-xs">
                          {user?.roles?.join(', ')}
                        </div>
                      </div>
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="ml-2 p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      title="Logout"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                    </button>
                  </div>
                  
                  {/* Mobile Logout Button */}
                  <button
                    onClick={handleLogout}
                    className="lg:hidden p-1.5 sm:p-2 md:p-2.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg sm:rounded-xl transition-all"
                    title="Logout"
                  >
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="hidden sm:inline-flex text-gray-700 hover:text-purple-600 px-3 sm:px-4 py-2 font-medium transition-colors text-sm sm:text-base">
                    {t('nav.login')}
                  </Link>
                  <Link to="/register" className="btn btn-primary text-xs sm:text-sm md:text-base px-3 sm:px-4 py-1.5 sm:py-2">
                    {t('nav.signup')}
                  </Link>
                </>
              )}

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-1.5 sm:p-2 md:p-2.5 text-gray-700 hover:bg-purple-50 rounded-lg sm:rounded-xl transition-all"
                aria-label="Toggle menu"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {mobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="lg:hidden py-4 border-t border-gray-200 space-y-2 animate-fadeIn">
              <Link 
                to="/search" 
                className="block px-4 py-3 text-gray-700 hover:bg-purple-50 hover:text-purple-600 rounded-xl transition-colors font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                🔍 {t('nav.browseListing')}
              </Link>
              {isSeller && (
                <>
                  <Link 
                    to="/seller-dashboard" 
                    className="block px-4 py-3 text-gray-700 hover:bg-purple-50 hover:text-purple-600 rounded-xl transition-colors font-medium"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    📦 {t('nav.myListings')}
                  </Link>
                  <Link 
                    to="/create-listing" 
                    className="block px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-xl shadow-lg text-center"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    ➕ {t('nav.createNewListing')}
                  </Link>
                </>
              )}
              {isAuthenticated && (
                <>
                  <Link 
                    to={isSeller ? "/seller-dashboard#recent-orders" : "/orders"}
                    className="block px-4 py-3 text-gray-700 hover:bg-purple-50 hover:text-purple-600 rounded-xl transition-colors font-medium relative"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span className="flex items-center justify-between">
                      <span>🛒 {t('nav.myOrders')}</span>
                      {isSeller && pendingOrdersCount > 0 && (
                        <span className="bg-green-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center animate-pulse">
                          {pendingOrdersCount}
                        </span>
                      )}
                    </span>
                  </Link>
                  <Link 
                    to="/profile" 
                    className="block px-4 py-3 text-gray-700 hover:bg-purple-50 hover:text-purple-600 rounded-xl transition-colors font-medium"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    👤 {t('nav.profile')}
                  </Link>
                </>
              )}
              {isAdmin && (
                <Link 
                  to="/admin" 
                  className="block px-4 py-3 bg-gray-100 text-gray-900 font-semibold rounded-xl hover:bg-gray-200 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  ⚙️ {t('nav.adminPanel')}
                </Link>
              )}
              {!isAuthenticated && (
                <Link 
                  to="/login" 
                  className="block px-4 py-3 text-gray-700 hover:bg-purple-50 hover:text-purple-600 rounded-xl transition-colors font-medium sm:hidden"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  🔐 {t('nav.login')}
                </Link>
              )}
              {isAuthenticated && (
                <div className="lg:hidden px-4 py-3 bg-white/50 rounded-xl border border-gray-200">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold">
                      {user?.name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">{user?.name}</div>
                      <div className="text-gray-500 text-xs">{user?.roles?.join(', ')}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </nav>

      {/* Main content */}
      <main className="pb-16">
        <Outlet />
      </main>

      {/* Modern Footer */}
      <footer className="glass border-t border-white/20 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
            {/* Disclaimer */}
            <div className="text-center md:text-left">
              <h3 className="font-bold text-gray-900 mb-3 flex items-center justify-center md:justify-start gap-2 text-lg">
                <span className="text-2xl">⚠️</span>
                {t('footer.disclaimer')}
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                {t('footer.disclaimerText')}
              </p>
            </div>

            {/* Contact Developer */}
            <div className="text-center md:text-right">
              <h3 className="font-bold text-gray-900 mb-3 flex items-center justify-center md:justify-end gap-2 text-lg">
                <span className="text-2xl">💻</span>
                {t('footer.contactDeveloper')}
              </h3>
              <div className="text-sm text-gray-600">
                <a 
                  href="https://personal-web-nine-tau.vercel.app" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                  {t('footer.visitPortfolio')}
                </a>
              </div>
            </div>
          </div>

          {/* Copyright */}
          <div className="text-center pt-6 border-t border-gray-200">
            <p className="text-gray-500 text-sm">
              &copy; {new Date().getFullYear()} YohaTrade. {t('footer.copyright')}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
