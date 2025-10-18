import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { messagesAPI, ordersAPI } from '../services/api';
import { useSocket } from '../hooks/useSocket';
import { sendMessage, joinOrderRoom } from '../services/socket';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

const Messages = () => {
  const { orderId } = useParams();
  const { user } = useAuth();
  const { socket } = useSocket();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef(null);
  // Normalize current user id (some environments use id, others _id)
  const currentUserId = String(user?._id || user?.id || '');
  const inputRef = useRef(null);

  const [messageText, setMessageText] = useState('');

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
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      });

      socket.on('message_sent', (data) => {
        queryClient.invalidateQueries(['messages', orderId]);
        toast.success('Message sent');
      });

      socket.on('error', (data) => {
        toast.error(data.message || 'An error occurred');
      });
    }

    return () => {
      if (socket) {
        socket.off('new_message');
        socket.off('message_sent');
        socket.off('error');
      }
    };
  }, [orderId, socket, queryClient]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messagesData]);

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
    } catch (error) {
      toast.error('Failed to send message');
      console.error('Message send error:', error);
    }
  };

  const order = orderData?.order;
  const isBuyer = String(order?.buyerId?._id || order?.buyerId || '') === currentUserId;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Order Messages</h1>
        {order && (
          <div className="flex items-center justify-between bg-gray-100 p-3 rounded-lg">
            <div>
              <p className="text-sm text-gray-600">
                <span className="font-semibold">Order:</span> {order.listingId?.title || 'N/A'}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-semibold">Price:</span> {order.price_agreed} {order.currency}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-700">
                {isBuyer ? 'Seller' : 'Buyer'}: {isBuyer ? order.sellerId?.name : order.buyerId?.name}
              </p>
              <p className="text-xs text-gray-500">Status: {order.status}</p>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden h-[650px] flex flex-col">
        {/* Messages Container */}
        <div 
          className="flex-1 overflow-y-auto p-6 space-y-4" 
          style={{ 
            backgroundImage: 'linear-gradient(to bottom, #f3f4f6 0%, #e5e7eb 100%)',
            backgroundAttachment: 'fixed'
          }}
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
              return (
                <div key={msg._id} className={`w-full flex ${isMyMessage ? 'justify-end' : 'justify-start'} mb-4`}>
                  <div className={`flex flex-col ${isMyMessage ? 'items-end' : 'items-start'} max-w-[70%] min-w-[200px]`}>
                    {/* Sender name - only for received messages */}
                    {!isMyMessage && (
                      <span className="text-xs font-semibold text-gray-600 mb-1 ml-4">
                        {senderName || 'User'}
                      </span>
                    )}
                    
                    {/* Message bubble */}
                    <div className={`relative px-6 py-4 shadow-lg ${
                      isMyMessage 
                        ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-3xl rounded-br-md ml-auto' 
                        : 'bg-white text-gray-900 rounded-3xl rounded-bl-md border border-gray-200 mr-auto'
                    }`}>
                      {/* Tail/pointer */}
                      <div className={`absolute bottom-0 w-0 h-0 ${
                        isMyMessage 
                          ? 'right-0 border-l-[15px] border-l-transparent border-t-[15px] border-t-blue-600 border-r-0'
                          : 'left-0 border-r-[15px] border-r-transparent border-t-[15px] border-t-white border-l-0'
                      }`} style={{ 
                        [isMyMessage ? 'right' : 'left']: '-7px',
                        bottom: '0px'
                      }}></div>
                      
                      {/* Message text */}
                      <p className={`text-[15px] leading-relaxed break-words ${
                        isMyMessage ? 'text-white' : 'text-gray-800'
                      }`}>
                        {msg.text}
                      </p>
                      
                      {/* Timestamp */}
                      <p className={`text-[11px] mt-2 text-right ${
                        isMyMessage ? 'text-blue-100' : 'text-gray-500'
                      }`}>
                        {new Date(msg.createdAt).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                    </div>
                    
                    {/* "You" label for sent messages */}
                    {isMyMessage && (
                      <span className="text-xs text-gray-600 mt-1 mr-4 font-medium">
                        You
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <form onSubmit={handleSend} className="bg-white border-t border-gray-200 p-4">
          <div className="flex items-center space-x-3">
            <input 
              value={messageText} 
              onChange={e => setMessageText(e.target.value)} 
              placeholder="Type your message here..." 
              className="flex-1 px-5 py-3 border-2 border-gray-200 rounded-full focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all" 
              disabled={!orderData?.order}
              ref={inputRef}
            />
            <button 
              type="submit" 
              className={`px-6 py-3 rounded-full font-semibold transition-all transform hover:scale-105 ${
                !orderData?.order || !messageText.trim()
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg hover:shadow-xl'
              }`}
              disabled={!orderData?.order || !messageText.trim()}
            >
              <div className="flex items-center space-x-2">
                <span>Send</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </div>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Messages;

