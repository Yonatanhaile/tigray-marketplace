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

  const handleSend = (e) => {
    e.preventDefault();
    if (!messageText.trim()) return;

    if (!orderData?.order) {
      toast.error('Order data not loaded');
      return;
    }

    // Determine recipient: if current user is buyer, send to seller, and vice versa
    const order = orderData.order;
    const isBuyer = order.buyerId._id === user._id;
    const recipientId = isBuyer ? order.sellerId._id : order.buyerId._id;

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
  const isBuyer = order?.buyerId?._id === user?._id;

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

      <div className="card h-[600px] flex flex-col">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
          {messagesData?.messages?.map(msg => {
            const isMyMessage = msg.senderId._id === user?._id;
            return (
              <div key={msg._id} className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'}`}>
                <div className="flex flex-col max-w-md">
                  {/* Sender name */}
                  {!isMyMessage && (
                    <span className="text-xs text-gray-500 mb-1 ml-3">
                      {msg.senderId.name}
                    </span>
                  )}
                  
                  {/* Message bubble */}
                  <div className={`px-4 py-3 rounded-2xl ${
                    isMyMessage 
                      ? 'bg-blue-600 text-white rounded-tr-sm' 
                      : 'bg-white text-gray-800 border border-gray-200 rounded-tl-sm shadow-sm'
                  }`}>
                    <p className="text-sm leading-relaxed">{msg.text}</p>
                    <p className={`text-xs mt-1 ${isMyMessage ? 'text-blue-100' : 'text-gray-500'}`}>
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  
                  {/* My message label */}
                  {isMyMessage && (
                    <span className="text-xs text-gray-500 mt-1 mr-3 text-right">
                      You
                    </span>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="border-t bg-white p-4 flex space-x-2">
          <input 
            value={messageText} 
            onChange={e => setMessageText(e.target.value)} 
            placeholder="Type a message..." 
            className="input flex-1" 
            disabled={!orderData?.order}
          />
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={!orderData?.order || !messageText.trim()}
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
};

export default Messages;

