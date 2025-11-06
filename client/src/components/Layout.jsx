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
    <div className="min-h-screen bg-[color:var(--color-bg)] text-[color:var(--color-text)]">
      <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <Link to="/" className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold tracking-tight text-[color:var(--color-primary)]">YohaTrade</span>
            <span className="hidden text-sm font-medium text-[color:var(--color-muted)] sm:block">
              {t('nav.tagline', { defaultValue: 'Tigray markets, human connections' })}
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-6 text-sm font-medium">
            <Link to="/search" className="text-[color:var(--color-text)] transition-colors hover:text-[color:var(--color-primary)]">
              {t('nav.browse')}
            </Link>
            {isSeller && (
              <Link to="/seller-dashboard" className="text-[color:var(--color-text)] transition-colors hover:text-[color:var(--color-primary)]">
                {t('nav.myListings')}
              </Link>
            )}
            {isAuthenticated && (
              <Link to="/orders" className="relative text-[color:var(--color-text)] transition-colors hover:text-[color:var(--color-primary)]">
                {t('nav.myOrders')}
                {isSeller && pendingOrdersCount > 0 && (
                  <span className="absolute -top-3 -right-4 inline-flex h-5 min-w-[1.2rem] items-center justify-center rounded-full bg-[color:var(--color-accent)] px-1 text-[10px] font-semibold text-white">
                    {pendingOrdersCount}
                  </span>
                )}
              </Link>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
            <LanguageSwitcher />

            {isAuthenticated && (
              <Link
                to="/messages"
                className="relative rounded-lg p-2 text-[color:var(--color-text)] transition-colors hover:bg-[color:var(--color-primary-soft)] hover:text-[color:var(--color-primary)]"
                title={t('nav.messages', { defaultValue: 'Messages' })}
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 inline-flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[color:var(--color-accent)] px-1 text-[10px] font-semibold text-white">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Link>
            )}

            {isAuthenticated && isSeller && (
              <Link
                to="/seller-dashboard#recent-orders"
                className="relative rounded-lg p-2 text-[color:var(--color-text)] transition-colors hover:bg-[color:var(--color-primary-soft)] hover:text-[color:var(--color-primary)]"
                title={t('nav.orderRequests', { defaultValue: 'Order requests' })}
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                {pendingOrdersCount > 0 && (
                  <span className="absolute -top-1 -right-1 inline-flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[color:var(--color-primary)] px-1 text-[10px] font-semibold text-white">
                    {pendingOrdersCount > 99 ? '99+' : pendingOrdersCount}
                  </span>
                )}
              </Link>
            )}

            {isAuthenticated && notifications.length > 0 && (
              <Link
                to="/orders"
                onClick={clearAllNotifications}
                className="relative rounded-lg p-2 text-[color:var(--color-text)] transition-colors hover:bg-[color:var(--color-primary-soft)] hover:text-[color:var(--color-primary)]"
                title={t('nav.notifications', { defaultValue: 'Notifications' })}
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <span className="absolute -top-1 -right-1 inline-flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
                  {notifications.length}
                </span>
              </Link>
            )}

            {isAuthenticated ? (
              <>
                {isSeller && (
                  <Link to="/create-listing" className="hidden md:inline-flex items-center gap-2 btn btn-primary">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                    <span>{t('nav.createListing')}</span>
                  </Link>
                )}

                {isAdmin && (
                  <Link to="/admin" className="hidden md:inline-flex btn btn-secondary">
                    {t('nav.admin')}
                  </Link>
                )}

                <div className="hidden lg:flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <Link to="/profile" className="flex items-center gap-3">
                    {user?.profileImage?.url ? (
                      <img
                        src={user.profileImage.url}
                        alt={user?.name}
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[color:var(--color-primary)] text-sm font-semibold text-white">
                        {user?.name?.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="text-left">
                      <p className="text-sm font-semibold text-[color:var(--color-text)]">{user?.name}</p>
                      {user?.roles?.length > 0 && (
                        <p className="text-xs text-[color:var(--color-muted)]">{user.roles.join(', ')}</p>
                      )}
                    </div>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="rounded-full p-2 text-[color:var(--color-muted)] transition-colors hover:bg-[color:var(--color-primary-soft)] hover:text-[color:var(--color-primary)]"
                    title={t('nav.logout')}
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </button>
                </div>

                <button
                  onClick={handleLogout}
                  className="lg:hidden rounded-lg p-2 text-[color:var(--color-muted)] transition-colors hover:bg-rose-50 hover:text-rose-600"
                  title={t('nav.logout')}
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="hidden sm:inline-flex text-sm font-medium text-[color:var(--color-text)] transition-colors hover:text-[color:var(--color-primary)]"
                >
                  {t('nav.login')}
                </Link>
                <Link to="/register" className="btn btn-primary text-sm">
                  {t('nav.signup')}
                </Link>
              </>
            )}

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden rounded-lg p-2 text-[color:var(--color-text)] transition-colors hover:bg-[color:var(--color-primary-soft)] hover:text-[color:var(--color-primary)]"
              aria-label={t('nav.toggleMenu', { defaultValue: 'Toggle menu' })}
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="lg:hidden space-y-3 border-t border-slate-200 bg-white px-4 py-5">
              <Link
                to="/search"
                className="block rounded-lg px-3 py-2 text-sm font-semibold text-[color:var(--color-text)] transition-colors hover:bg-[color:var(--color-primary-soft)] hover:text-[color:var(--color-primary)]"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t('nav.browseListing')}
              </Link>
              {isSeller && (
                <>
                  <Link
                    to="/seller-dashboard"
                    className="block rounded-lg px-3 py-2 text-sm font-semibold text-[color:var(--color-text)] transition-colors hover:bg-[color:var(--color-primary-soft)] hover:text-[color:var(--color-primary)]"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {t('nav.myListings')}
                  </Link>
                  <Link
                    to="/create-listing"
                    className="block rounded-lg bg-[color:var(--color-primary)] px-3 py-2 text-center text-sm font-semibold text-white transition-colors hover:bg-[color:var(--color-primary-strong)]"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {t('nav.createNewListing')}
                  </Link>
                </>
              )}
              {isAuthenticated && (
                <>
                  <Link
                    to={isSeller ? '/seller-dashboard#recent-orders' : '/orders'}
                    className="flex items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold text-[color:var(--color-text)] transition-colors hover:bg-[color:var(--color-primary-soft)] hover:text-[color:var(--color-primary)]"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span>{t('nav.myOrders')}</span>
                    {isSeller && pendingOrdersCount > 0 && (
                      <span className="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-[color:var(--color-primary)] px-1 text-xs font-semibold text-white">
                        {pendingOrdersCount}
                      </span>
                    )}
                  </Link>
                  <Link
                    to="/profile"
                    className="block rounded-lg px-3 py-2 text-sm font-semibold text-[color:var(--color-text)] transition-colors hover:bg-[color:var(--color-primary-soft)] hover:text-[color:var(--color-primary)]"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {t('nav.profile')}
                  </Link>
                </>
              )}
              {isAdmin && (
                <Link
                  to="/admin"
                  className="block rounded-lg px-3 py-2 text-sm font-semibold text-[color:var(--color-text)] transition-colors hover:bg-[color:var(--color-primary-soft)] hover:text-[color:var(--color-primary)]"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t('nav.adminPanel')}
                </Link>
              )}
              {!isAuthenticated && (
                <Link
                  to="/login"
                  className="block rounded-lg px-3 py-2 text-sm font-semibold text-[color:var(--color-text)] transition-colors hover:bg-[color:var(--color-primary-soft)] hover:text-[color:var(--color-primary)] sm:hidden"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t('nav.login')}
                </Link>
              )}
              {isAuthenticated && (
                <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-[color:var(--color-primary-soft)] px-3 py-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[color:var(--color-primary)] text-base font-semibold text-white">
                    {user?.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[color:var(--color-text)]">{user?.name}</p>
                    {user?.roles?.length > 0 && (
                      <p className="text-xs text-[color:var(--color-muted)]">{user.roles.join(', ')}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </nav>

      <main className="pb-16">
        <Outlet />
      </main>

      <footer className="mt-16 border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-10 sm:grid-cols-2">
            <div className="space-y-3 text-sm text-[color:var(--color-muted)]">
              <h3 className="text-base font-semibold text-[color:var(--color-text)]">
                {t('footer.disclaimer')}
              </h3>
              <p className="leading-relaxed">{t('footer.disclaimerText')}</p>
            </div>

            <div className="space-y-3 text-sm text-[color:var(--color-muted)] sm:text-right">
              <h3 className="text-base font-semibold text-[color:var(--color-text)]">
                {t('footer.contactDeveloper')}
              </h3>
              <div>
                <a
                  href="https://personal-web-nine-tau.vercel.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-[color:var(--color-text)] transition-colors hover:border-[color:var(--color-primary)] hover:text-[color:var(--color-primary)]"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                  {t('footer.visitPortfolio')}
                </a>
              </div>
            </div>
          </div>

          <div className="mt-10 border-t border-slate-200 pt-6 text-center text-sm text-[color:var(--color-muted)]">
            &copy; {new Date().getFullYear()} YohaTrade. {t('footer.copyright')}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
