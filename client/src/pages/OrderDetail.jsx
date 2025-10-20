import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersAPI, disputesAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { markOrderStatus } from '../services/socket';
import toast from 'react-hot-toast';

const OrderDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: () => ordersAPI.getById(id),
  });

  const updateMutation = useMutation({
    mutationFn: (updates) => ordersAPI.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries(['order', id]);
      toast.success('Order updated');
    },
  });

  const disputeMutation = useMutation({
    mutationFn: disputesAPI.create,
    onSuccess: () => {
      toast.success('Dispute filed successfully');
      setShowDisputeModal(false);
      queryClient.invalidateQueries(['order', id]);
    },
  });

  if (isLoading) return <div className="max-w-4xl mx-auto px-4 py-12 text-center">Loading...</div>;
  if (!data?.order) return <div className="max-w-4xl mx-auto px-4 py-12 text-center">Order not found</div>;

  const order = data.order;
  const isSeller = user?._id === order.sellerId?._id;
  const isBuyer = user?._id === order.buyerId?._id;

  const handleStatusUpdate = (newStatus) => {
    markOrderStatus({ orderId: id, status: newStatus });
    updateMutation.mutate({ status: newStatus });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Order Details</h1>
        <Link to={`/orders/${id}/messages`} className="btn btn-secondary">💬 Messages</Link>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Order Info */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Order Information</h2>
          <div className="space-y-2 text-sm">
            <p><strong>Order ID:</strong> {order._id.slice(-8).toUpperCase()}</p>
            <p><strong>Status:</strong> <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded">{order.status}</span></p>
            <p><strong>Payment Status:</strong> <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">{order.payment_status}</span></p>
            <p><strong>Amount:</strong> {order.price_agreed} {order.currency}</p>
            <p><strong>Payment Method:</strong> {order.selected_payment_method}</p>
            <p><strong>Created:</strong> {new Date(order.createdAt).toLocaleString()}</p>
          </div>
        </div>

        {/* Listing Info */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Item</h2>
          {order.listingId?.images?.[0] && <img src={order.listingId.images[0].url} alt="" className="w-full h-32 object-cover rounded mb-2" />}
          <h3 className="font-semibold">{order.listingId?.title}</h3>
          <p className="text-gray-600 text-sm">{order.listingId?.description?.slice(0, 100)}...</p>
        </div>

        {/* Buyer Info */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Buyer</h2>
          <p><strong>Name:</strong> {order.buyerId?.name}</p>
          <p><strong>Email:</strong> {order.buyerId?.email}</p>
          <p><strong>Phone:</strong> {order.buyerId?.phone}</p>
        </div>

        {/* Seller Info */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Seller</h2>
          <p><strong>Name:</strong> {order.sellerId?.name}</p>
          <p><strong>Email:</strong> {order.sellerId?.email}</p>
          <p><strong>Phone:</strong> {order.sellerId?.phone}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="card mt-6">
        <h2 className="text-xl font-semibold mb-4">Actions</h2>
        <div className="flex flex-wrap gap-3">
          {/* Seller Actions */}
          {isSeller && order.status === 'requested' && (
            <>
              <button 
                onClick={() => handleStatusUpdate('seller_confirmed')} 
                className="btn btn-primary"
                disabled={updateMutation.isPending}
              >
                ✅ Confirm Order
              </button>
              <button 
                onClick={() => handleStatusUpdate('cancelled')} 
                className="btn bg-gray-500 hover:bg-gray-600 text-white"
                disabled={updateMutation.isPending}
              >
                ❌ Cancel Order
              </button>
            </>
          )}
          {isSeller && order.status === 'seller_confirmed' && (
            <button 
              onClick={() => handleStatusUpdate('paid_offsite')} 
              className="btn btn-primary"
              disabled={updateMutation.isPending}
            >
              💰 Mark as Paid
            </button>
          )}
          {isSeller && order.status === 'paid_offsite' && (
            <button 
              onClick={() => handleStatusUpdate('delivered')} 
              className="btn btn-primary"
              disabled={updateMutation.isPending}
            >
              📦 Mark as Delivered
            </button>
          )}

          {/* Buyer Actions */}
          {isBuyer && order.status === 'requested' && (
            <button 
              onClick={() => handleStatusUpdate('cancelled')} 
              className="btn bg-gray-500 hover:bg-gray-600 text-white"
              disabled={updateMutation.isPending}
            >
              ❌ Cancel Order
            </button>
          )}
          {isBuyer && order.status === 'delivered' && (
            <button 
              onClick={() => handleStatusUpdate('completed')} 
              className="btn btn-primary"
              disabled={updateMutation.isPending}
            >
              ✅ Confirm Received
            </button>
          )}

          {/* Dispute Action */}
          {(isBuyer || isSeller) && !['disputed', 'cancelled', 'delivered', 'completed'].includes(order.status) && (
            <button 
              onClick={() => setShowDisputeModal(true)} 
              className="btn bg-red-500 hover:bg-red-600 text-white"
              disabled={updateMutation.isPending || disputeMutation.isPending}
            >
              ⚠️ File Dispute
            </button>
          )}

          {/* No actions available */}
          {!isSeller && !isBuyer && (
            <p className="text-gray-500 text-sm">You don't have permission to perform actions on this order.</p>
          )}
          {(isSeller || isBuyer) && 
           ['completed', 'cancelled', 'disputed'].includes(order.status) && 
           (
            <div className="w-full">
              <p className="text-gray-600 text-sm mb-2">
                {order.status === 'completed' && '✅ This order has been completed successfully.'}
                {order.status === 'cancelled' && '❌ This order has been cancelled.'}
                {order.status === 'disputed' && '⚠️ This order is under dispute. Please wait for admin resolution.'}
              </p>
              {order.status === 'disputed' && (
                <Link to={`/disputes?orderId=${order._id}`} className="text-purple-600 hover:underline text-sm">
                  View Dispute Details →
                </Link>
              )}
            </div>
           )}
        </div>
      </div>

      {/* Dispute Modal */}
      {showDisputeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full">
            <h2 className="text-2xl font-bold mb-4">File Dispute</h2>
            <textarea value={disputeReason} onChange={e => setDisputeReason(e.target.value)} placeholder="Describe the issue..." className="input" rows="6" />
            <div className="flex space-x-3 mt-4">
              <button onClick={() => setShowDisputeModal(false)} className="btn btn-secondary flex-1">Cancel</button>
              <button onClick={() => disputeMutation.mutate({ orderId: id, reason: disputeReason })} className="btn btn-danger flex-1">Submit Dispute</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderDetail;

