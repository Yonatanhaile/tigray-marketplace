import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { messagesAPI, ordersAPI } from '../services/api';
import { useSocket } from '../hooks/useSocket';
import { sendMessage, joinOrderRoom } from '../services/socket';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';
import BackButton from '../components/BackButton';

const Messages = () => {
  const { orderId } = useParams();
  const { user } = useAuth();
  const { socket } = useSocket();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  // Normalize current user id (some environments use id, others _id)
  const currentUserId = String(user?._id || user?.id || '');
  const inputRef = useRef(null);

  const [messageText, setMessageText] = useState('');

  // Helper function to scroll messages container to bottom
  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  // Fetch order details to get buyer and seller IDs
  const { data: orderData } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => ordersAPI.getById(orderId),
    enabled: !!orderId,
  });

  const { data: messagesData } = useQuery({
    queryKey: ['messages', orderId],
    queryFn: () => messagesAPI.getOrderMessages(orderId),
  });

  useEffect(() => {
    if (orderId && socket) {
      joinOrderRoom(orderId);
    }

    if (socket) {
      socket.on('new_message', (data) => {
        queryClient.invalidateQueries(['messages', orderId]);
        setTimeout(scrollToBottom, 100);
      });

      socket.on('message_sent', (data) => {
        queryClient.invalidateQueries(['messages', orderId]);
      });

      socket.on('messages_read', (data) => {
        console.log('📬 Messages read event received:', data);
        // When messages are marked as read, update the unread count
        queryClient.invalidateQueries(['messages', 'unread-count']);
        // Also emit custom event to update Layout immediately
        window.dispatchEvent(new CustomEvent('clear-message-notifications'));
      });

      socket.on('error', (data) => {
        toast.error(data.message || 'An error occurred');
      });
    }

    return () => {
      if (socket) {
        socket.off('new_message');
        socket.off('message_sent');
        socket.off('messages_read');
        socket.off('error');
      }
    };
  }, [orderId, socket, queryClient]);

  useEffect(() => {
    setTimeout(scrollToBottom, 100);
    
    if (messagesData?.messages) {
      // Emit custom event to Layout component to clear message notifications
      window.dispatchEvent(new CustomEvent('clear-message-notifications'));
      
      // Manually fetch and update unread count to ensure UI updates immediately
      const updateUnreadCount = async () => {
        try {
          const data = await messagesAPI.getUnreadCount();
          console.log('📊 Updated unread count after viewing messages:', data.unreadCount);
          // This will trigger a re-render in Layout component
          queryClient.setQueryData(['messages', 'unread-count'], data);
          // Also invalidate to refetch in other components
          queryClient.invalidateQueries(['messages', 'unread-count']);
        } catch (error) {
          console.error('Failed to update unread count:', error);
        }
      };
      
      // Delay to ensure server has marked messages as read
      // The delay accounts for API processing time
      setTimeout(updateUnreadCount, 800);
    }
  }, [messagesData, queryClient]);

  useEffect(() => {
    // Focus input when page opens and after sending
    inputRef.current?.focus();
  }, []);

  const handleSend = (e) => {
    e.preventDefault();
    if (!messageText.trim()) return;

    if (!orderData?.order) {
      toast.error('Order data not loaded');
      return;
    }

    // Determine recipient: if current user is buyer, send to seller, and vice versa
    const order = orderData.order;
    const buyerId = String(order?.buyerId?._id || order?.buyerId || '');
    const sellerId = String(order?.sellerId?._id || order?.sellerId || '');
    const isBuyer = buyerId === currentUserId;
    const recipientId = isBuyer ? sellerId : buyerId;

    try {
      sendMessage({
        orderId,
        toUserId: recipientId,
        text: messageText,
      });

      setMessageText('');
      
      // Scroll messages container to bottom after sending message
      setTimeout(scrollToBottom, 100);
    } catch (error) {
      toast.error('Failed to send message');
      console.error('Message send error:', error);
    }
  };

  const order = orderData?.order;
  const isBuyer = String(order?.buyerId?._id || order?.buyerId || '') === currentUserId;

  return (
    <div className="min-h-screen bg-[color:var(--color-bg)] pb-20">
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="mb-4">
          <BackButton />
        </div>
        
        <div className="mb-4">
          <h1 className="text-2xl font-bold mb-3">Order Messages</h1>
          {order && (
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:justify-between gap-2">
                <div>
                  <p className="text-sm text-gray-600">
                    <span className="font-semibold">Order:</span> {order.listingId?.title || 'N/A'}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-semibold">Price:</span> {order.price_agreed} {order.currency}
                  </p>
                </div>
                <div className="sm:text-right">
                  <p className="text-sm font-semibold text-gray-700">
                    {isBuyer ? 'Seller' : 'Buyer'}: {isBuyer ? order.sellerId?.name : order.buyerId?.name}
                  </p>
                  <p className="text-xs text-gray-500">Status: {order.status}</p>
                </div>
              </div>
            </div>
          )}
        </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 flex flex-col" style={{ height: 'calc(100vh - 320px)', minHeight: '400px', maxHeight: '600px' }}>
        {/* Messages Container */}
        <div 
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide bg-gray-50" 
        >
          {messagesData?.messages?.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <svg className="w-16 h-16 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p className="text-gray-500 font-medium">No messages yet</p>
                <p className="text-sm text-gray-400 mt-1">Start the conversation!</p>
              </div>
            </div>
          ) : (
            messagesData?.messages?.map(msg => {
              const senderRaw = typeof msg.senderId === 'object' ? (msg.senderId?._id || msg.senderId?.id) : msg.senderId;
              const senderId = String(senderRaw || '');
              const isMyMessage = senderId === currentUserId;
              const buyerId = String(order?.buyerId?._id || order?.buyerId || '');
              const sellerId = String(order?.sellerId?._id || order?.sellerId || '');
              const senderName = typeof msg.senderId === 'object' && msg.senderId?.name
                ? msg.senderId.name
                : (senderId === buyerId ? order?.buyerId?.name : order?.sellerId?.name);
              const senderInfo = senderId === buyerId ? order?.buyerId : order?.sellerId;
              const senderProfileImage = senderInfo?.profileImage?.url;
              
              return (
                <div key={msg._id} className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'} mb-3`}>
                  <div className={`flex ${isMyMessage ? 'flex-row-reverse' : 'flex-row'} items-end gap-2 max-w-[85%] sm:max-w-[75%]`}>
                    {/* Profile Image */}
                    <div className="flex-shrink-0">
                      {senderProfileImage ? (
                        <img 
                          src={senderProfileImage} 
                          alt={senderName} 
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-xs">
                          {senderName?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                      )}
                    </div>

                    <div className={`flex flex-col ${isMyMessage ? 'items-end' : 'items-start'}`}>
                      {/* Sender name - only for received messages */}
                      {!isMyMessage && (
                        <span className="text-[10px] sm:text-xs font-semibold text-gray-600 mb-1 ml-2 sm:ml-4">
                          {senderName || 'User'}
                        </span>
                      )}
                    
                    {/* Message bubble */}
                    <div className={`px-4 py-3 rounded-2xl shadow-sm ${
                      isMyMessage 
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white' 
                        : 'bg-white text-gray-900 border border-gray-200'
                    }`}>
                      {/* Message text */}
                      <p className="text-sm leading-relaxed break-words">
                        {msg.text}
                      </p>
                      
                      {/* Timestamp */}
                      <p className={`text-[11px] mt-2 ${
                        isMyMessage ? 'text-purple-100' : 'text-gray-500'
                      }`}>
                        {new Date(msg.createdAt).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                    </div>
                    
                      {/* "You" label for sent messages */}
                      {isMyMessage && (
                        <span className="text-[10px] sm:text-xs text-gray-600 mt-1 mr-2 sm:mr-4 font-medium">
                          You
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <form onSubmit={handleSend} className="bg-white border-t border-gray-200 p-4">
          <div className="flex items-center gap-2">
            <input 
              value={messageText} 
              onChange={e => setMessageText(e.target.value)} 
              placeholder="Type your message here..." 
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 text-sm" 
              disabled={!orderData?.order}
              ref={inputRef}
            />
            <button 
              type="submit" 
              className={`px-4 py-2.5 rounded-lg font-semibold transition-all text-sm ${
                !orderData?.order || !messageText.trim()
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:shadow-lg'
              }`}
              disabled={!orderData?.order || !messageText.trim()}
            >
              Send
            </button>
          </div>
        </form>
      </div>
      </div>
    </div>
  );
};

export default Messages;

