import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ordersAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';

const AllMessages = () => {
  const { user } = useAuth();

  // Fetch orders as buyer
  const { data: buyerOrders, isLoading: buyerLoading } = useQuery({
    queryKey: ['orders', 'buyer'],
    queryFn: () => ordersAPI.getMyOrders({ role: 'buyer' }),
  });

  // Fetch orders as seller
  const { data: sellerOrders, isLoading: sellerLoading } = useQuery({
    queryKey: ['orders', 'seller'],
    queryFn: () => ordersAPI.getMyOrders({ role: 'seller' }),
  });

  const isLoading = buyerLoading || sellerLoading;

  // Combine and sort all orders by last message time
  const allOrders = [
    ...(buyerOrders?.orders || []).map(o => ({ ...o, myRole: 'buyer' })),
    ...(sellerOrders?.orders || []).map(o => ({ ...o, myRole: 'seller' })),
  ].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Messages</h1>
        <p className="text-gray-600 mt-2">All your conversations in one place</p>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <p className="mt-2 text-gray-500">Loading conversations...</p>
        </div>
      ) : allOrders.length === 0 ? (
        <div className="text-center py-12 card">
          <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <p className="text-gray-500 mb-4">No conversations yet</p>
          <p className="text-sm text-gray-400 mb-6">Start by creating an order or listing</p>
          <Link to="/search" className="btn btn-primary">Browse Listings</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {allOrders.map(order => {
            const isBuyer = order.myRole === 'buyer';
            const otherPerson = isBuyer ? order.sellerId : order.buyerId;
            const hasUnread = order.unreadCount > 0;

            return (
              <Link
                key={order._id}
                to={`/orders/${order._id}/messages`}
                className={`card flex items-start space-x-4 hover:shadow-lg transition-shadow ${
                  hasUnread ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                }`}
              >
                {/* Avatar/Image */}
                <div className="flex-shrink-0">
                  {order.listingId?.images?.[0] ? (
                    <img 
                      src={order.listingId.images[0].url} 
                      alt="" 
                      className="w-16 h-16 object-contain bg-gray-50 rounded-lg" 
                    />
                  ) : (
                    <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* Other person's name */}
                      <h3 className={`font-semibold text-lg mb-1 ${hasUnread ? 'text-blue-900' : 'text-gray-900'}`}>
                        {otherPerson?.name || 'Unknown User'}
                      </h3>
                      
                      {/* Listing title */}
                      <p className="text-gray-600 text-sm truncate">
                        {order.listingId?.title || 'Listing'}
                      </p>

                      {/* Role badge */}
                      <span className={`inline-block px-2 py-1 rounded-full text-xs mt-2 ${
                        isBuyer ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'
                      }`}>
                        You are the {isBuyer ? 'buyer' : 'seller'}
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
                        order.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
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
                  {order.lastMessage && (
                    <p className={`text-sm mt-2 truncate ${hasUnread ? 'font-semibold text-gray-900' : 'text-gray-500'}`}>
                      {order.lastMessage.senderId === user?._id ? 'You: ' : ''}
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

