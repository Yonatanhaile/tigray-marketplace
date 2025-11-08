import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ordersAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../hooks/useSocket';
import { useEffect } from 'react';
import BackButton from '../components/BackButton';

const AllMessages = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { socket } = useSocket();

  // Fetch orders as buyer
  const { data: buyerOrders, isLoading: buyerLoading, refetch: refetchBuyer } = useQuery({
    queryKey: ['orders', 'buyer'],
    queryFn: () => ordersAPI.getMyOrders({ role: 'buyer' }),
  });

  // Fetch orders as seller
  const { data: sellerOrders, isLoading: sellerLoading, refetch: refetchSeller } = useQuery({
    queryKey: ['orders', 'seller'],
    queryFn: () => ordersAPI.getMyOrders({ role: 'seller' }),
  });

  // Refresh on new messages
  useEffect(() => {
    if (socket) {
      const handleNewMessage = () => {
        refetchBuyer();
        refetchSeller();
      };

      const handleMessagesRead = () => {
        refetchBuyer();
        refetchSeller();
      };

      socket.on('new_message', handleNewMessage);
      socket.on('messages_read', handleMessagesRead);

      return () => {
        socket.off('new_message', handleNewMessage);
        socket.off('messages_read', handleMessagesRead);
      };
    }
  }, [socket, refetchBuyer, refetchSeller]);

  const isLoading = buyerLoading || sellerLoading;

  // Combine all orders
  const allOrders = [
    ...(buyerOrders?.orders || []).map(o => ({ ...o, myRole: 'buyer' })),
    ...(sellerOrders?.orders || []).map(o => ({ ...o, myRole: 'seller' })),
  ];

  // Group orders by the other person and keep only the most recent conversation
  const conversationsMap = new Map();
  
  allOrders.forEach(order => {
    const isBuyer = order.myRole === 'buyer';
    const otherPersonId = isBuyer 
      ? (order.sellerId?._id || order.sellerId) 
      : (order.buyerId?._id || order.buyerId);
    
    const otherPersonIdStr = String(otherPersonId);
    
    // Check if we already have a conversation with this person
    const existing = conversationsMap.get(otherPersonIdStr);
    
    if (!existing || new Date(order.updatedAt) > new Date(existing.updatedAt)) {
      // Keep the most recent order with this person
      conversationsMap.set(otherPersonIdStr, order);
    } else if (existing) {
      // Add unread count from this order to existing
      existing.unreadCount = (existing.unreadCount || 0) + (order.unreadCount || 0);
    }
  });

  // Convert map to array and sort by most recent
  const uniqueConversations = Array.from(conversationsMap.values())
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-4">
        <BackButton />
      </div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{t('allMessages.title')}</h1>
        <p className="text-gray-600 mt-2">{t('allMessages.subtitle')}</p>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <p className="mt-2 text-gray-500">{t('allMessages.loadingConversations')}</p>
        </div>
      ) : uniqueConversations.length === 0 ? (
        <div className="text-center py-12 card">
          <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <p className="text-gray-500 mb-4">{t('allMessages.noConversations')}</p>
          <p className="text-sm text-gray-400 mb-6">{t('allMessages.noConversationsHint')}</p>
          <Link to="/search" className="btn btn-primary">{t('allMessages.browseListings')}</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {uniqueConversations.map(order => {
            const isBuyer = order.myRole === 'buyer';
            const otherPerson = isBuyer ? order.sellerId : order.buyerId;
            const hasUnread = order.unreadCount > 0;

            return (
              <Link
                key={order._id}
                to={`/orders/${order._id}/messages`}
                className={`card flex items-start space-x-4 hover:shadow-lg transition-shadow ${
                  hasUnread ? 'bg-[color:var(--color-primary-soft)] border-l-4 border-[color:var(--color-primary)]' : ''
                }`}
              >
                {/* Avatar/Image - User Profile Picture */}
                <div className="flex-shrink-0">
                  {otherPerson?.profileImage?.url ? (
                    <img 
                      src={otherPerson.profileImage.url} 
                      alt={otherPerson?.name || 'User'} 
                      className="w-16 h-16 object-cover rounded-full border-2 border-gray-200" 
                    />
                  ) : (
                    <div className="w-16 h-16 bg-gradient-to-br from-[color:var(--color-primary)] to-[color:var(--color-primary-strong)] rounded-full flex items-center justify-center text-white font-bold text-2xl border-2 border-gray-200">
                      {otherPerson?.name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* Other person's name */}
                      <h3 className={`font-semibold text-lg mb-1 ${hasUnread ? 'text-[color:var(--color-primary)]' : 'text-gray-900'}`}>
                        {otherPerson?.name || t('allMessages.unknownUser')}
                      </h3>
                      
                      {/* Listing title */}
                      <p className="text-gray-600 text-sm truncate">
                        {order.listingId?.title || t('allMessages.listing')}
                      </p>

                      {/* Role badge */}
                      <span className={`inline-block px-2 py-1 rounded-full text-xs mt-2 ${
                        isBuyer ? 'bg-[color:var(--color-primary-soft)] text-[color:var(--color-primary)]' : 'bg-green-100 text-green-800'
                      }`}>
                        {isBuyer ? t('allMessages.youAreTheBuyer') : t('allMessages.youAreTheSeller')}
                      </span>
                    </div>

                    {/* Right side - status and time */}
                    <div className="text-right ml-4">
                      {/* Unread badge */}
                      {hasUnread && (
                        <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-bold text-white bg-red-500 rounded-full mb-2">
                          {order.unreadCount > 9 ? '9+' : order.unreadCount}
                        </span>
                      )}
                      
                      {/* Status */}
                      <span className={`inline-block px-2 py-1 rounded-full text-xs ${
                        order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                        order.status === 'disputed' ? 'bg-red-100 text-red-800' :
                        order.status === 'confirmed' ? 'bg-[color:var(--color-primary-soft)] text-[color:var(--color-primary)]' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {order.status}
                      </span>

                      {/* Time */}
                      <p className="text-xs text-gray-500 mt-2">
                        {new Date(order.updatedAt).toLocaleDateString([], { 
                          month: 'short', 
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>

                      {/* Price */}
                      <p className="text-sm font-bold text-gray-700 mt-1">
                        {order.price_agreed} {order.currency}
                      </p>
                    </div>
                  </div>

                  {/* Last message preview (if available) */}
                  {order.lastMessage && order.lastMessage.text && (
                    <p className={`text-sm mt-2 truncate ${hasUnread ? 'font-semibold text-gray-900' : 'text-gray-500'}`}>
                      {String(order.lastMessage.senderId) === String(user?._id || user?.id) && (
                        <span className="font-medium">{t('allMessages.you')}: </span>
                      )}
                      {order.lastMessage.text}
                    </p>
                  )}
                </div>

                {/* Arrow indicator */}
                <div className="flex-shrink-0 self-center">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AllMessages;

