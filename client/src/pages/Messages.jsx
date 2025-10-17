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

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Messages</h1>

      <div className="card h-[600px] flex flex-col">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messagesData?.messages?.map(msg => (
            <div key={msg._id} className={`flex ${msg.senderId._id === user?._id ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xs px-4 py-2 rounded-lg ${msg.senderId._id === user?._id ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-800'}`}>
                <p className="text-sm">{msg.text}</p>
                <p className="text-xs mt-1 opacity-70">{new Date(msg.createdAt).toLocaleTimeString()}</p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="border-t p-4 flex space-x-2">
          <input value={messageText} onChange={e => setMessageText(e.target.value)} placeholder="Type a message..." className="input flex-1" />
          <button type="submit" className="btn btn-primary">Send</button>
        </form>
      </div>
    </div>
  );
};

export default Messages;

