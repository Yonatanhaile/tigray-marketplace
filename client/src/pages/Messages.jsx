import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { messagesAPI } from '../services/api';
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
    }

    return () => {
      if (socket) {
        socket.off('new_message');
      }
    };
  }, [orderId, socket, queryClient]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messagesData]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!messageText.trim()) return;

    sendMessage({
      orderId,
      toUserId: 'recipient-id', // Should be determined from order
      text: messageText,
    });

    setMessageText('');
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

