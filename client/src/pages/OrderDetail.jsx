import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ordersAPI, disputesAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { markOrderStatus } from '../services/socket';
import toast from 'react-hot-toast';
import BackButton from '../components/BackButton';

const OrderDetail = () => {
  const { t } = useTranslation();
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
    onSuccess: (data) => {
      queryClient.invalidateQueries(['order', id]);
      queryClient.invalidateQueries(['orders']);
      
      // Show specific success message based on status
      const status = data?.order?.status;
      if (status === 'seller_confirmed') {
        toast.success('✅ ' + t('orderDetail.orderConfirmed'));
      } else if (status === 'paid_offsite') {
        toast.success('💰 ' + t('orderDetail.paymentConfirmed'));
      } else if (status === 'delivered') {
        toast.success('📦 ' + t('orderDetail.orderDelivered'));
      } else if (status === 'completed') {
        toast.success('✅ ' + t('orderDetail.orderCompleted'));
      } else if (status === 'cancelled') {
        toast.success(t('orderDetail.orderCancelled'));
      } else {
        toast.success(t('orderDetail.orderUpdated'));
      }
    },
    onError: (error) => {
      toast.error(error?.message || t('orderDetail.updateFailed'));
    },
  });

  const disputeMutation = useMutation({
    mutationFn: disputesAPI.create,
    onSuccess: () => {
      toast.success('⚠️ ' + t('orderDetail.disputeFiled'));
      setShowDisputeModal(false);
      setDisputeReason('');
      queryClient.invalidateQueries(['order', id]);
      queryClient.invalidateQueries(['orders']);
    },
    onError: (error) => {
      toast.error(error?.message || t('orderDetail.disputeFailed'));
    },
  });

  if (isLoading) return <div className="max-w-4xl mx-auto px-4 py-12 text-center">{t('orderDetail.loading')}</div>;
  if (!data?.order) return <div className="max-w-4xl mx-auto px-4 py-12 text-center">{t('orderDetail.orderNotFound')}</div>;

  const order = data.order;
  
  // Handle both string IDs and populated objects
  const sellerId = typeof order.sellerId === 'object' ? order.sellerId?._id : order.sellerId;
  const buyerId = typeof order.buyerId === 'object' ? order.buyerId?._id : order.buyerId;
  
  // User object uses "id" not "_id" (from profile virtual)
  const userId = user?.id;
  
  const isSeller = userId && sellerId && userId.toString() === sellerId.toString();
  const isBuyer = userId && buyerId && userId.toString() === buyerId.toString();

  const handleStatusUpdate = (newStatus) => {
    markOrderStatus({ orderId: id, status: newStatus });
    updateMutation.mutate({ status: newStatus });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-4">
        <BackButton />
      </div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">{t('orderDetail.title')}</h1>
        <Link to={`/orders/${id}/messages`} className="btn btn-secondary">💬 {t('orderDetail.messages')}</Link>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Order Info */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">{t('orderDetail.orderInformation')}</h2>
          <div className="space-y-2 text-sm">
            <p><strong>{t('orderDetail.orderId')}</strong> {order._id.slice(-8).toUpperCase()}</p>
            <p><strong>{t('orderDetail.status')}</strong> <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded">{order.status}</span></p>
            <p><strong>{t('orderDetail.paymentMethod')}</strong> <span className="px-2 py-1 bg-[color:var(--color-primary-soft)] text-[color:var(--color-primary)] rounded">{order.payment_status}</span></p>
            <p><strong>{t('orderDetail.price')}</strong> {order.price_agreed} {order.currency}</p>
            <p><strong>{t('orderDetail.paymentMethod')}</strong> {order.selected_payment_method}</p>
            <p><strong>{t('orderDetail.created')}</strong> {new Date(order.createdAt).toLocaleString()}</p>
          </div>
        </div>

        {/* Listing Info */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Item</h2>
          {order.listingId?.images?.[0] && <img src={order.listingId.images[0].url} alt="" className="w-full h-32 object-cover rounded mb-2" />}
          <h3 className="font-semibold">{order.listingId?.title}</h3>
          <p className="text-gray-600 text-sm">{order.listingId?.description?.slice(0, 100)}...</p>
        </div>

        {/* Payment Instructions */}
        {isBuyer && order.listingId?.payment_instructions && (
          <div className="card col-span-full bg-yellow-50 border-l-4 border-yellow-400">
            <h2 className="text-xl font-semibold mb-4">{t('orderDetail.paymentInstructions')}</h2>
            <div className="text-sm text-gray-700 space-y-2">
              {typeof order.listingId.payment_instructions === 'object' ? (
                <div className="space-y-3">
                  {order.listingId.payment_instructions.cash && (
                    <div>
                      <span className="font-medium text-gray-900">💵 {t('orderDetail.cash')}</span>
                      <p className="text-gray-700 ml-5">{order.listingId.payment_instructions.cash}</p>
                    </div>
                  )}
                  {order.listingId.payment_instructions.bank && (
                    <div>
                      <span className="font-medium text-gray-900">🏦 {t('orderDetail.bankTransfer')}</span>
                      <p className="text-gray-700 ml-5 whitespace-pre-wrap">{order.listingId.payment_instructions.bank}</p>
                    </div>
                  )}
                  {order.listingId.payment_instructions.telebirr && (
                    <div>
                      <span className="font-medium text-gray-900">📱 {t('orderDetail.telebirr')}</span>
                      <p className="text-gray-700 ml-5">{order.listingId.payment_instructions.telebirr}</p>
                    </div>
                  )}
                  {order.listingId.payment_instructions.mpesa && (
                    <div>
                      <span className="font-medium text-gray-900">📲 {t('orderDetail.mpesa')}</span>
                      <p className="text-gray-700 ml-5">{order.listingId.payment_instructions.mpesa}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="bg-white p-3 rounded">{order.listingId.payment_instructions}</p>
              )}
              <button
                onClick={() => {
                  const instructions = order.listingId.payment_instructions;
                  let textToCopy = '';
                  
                  if (typeof instructions === 'object') {
                    if (instructions.cash) textToCopy += `Cash: ${instructions.cash}\n\n`;
                    if (instructions.bank) textToCopy += `Bank Transfer:\n${instructions.bank}\n\n`;
                    if (instructions.telebirr) textToCopy += `Telebirr: ${instructions.telebirr}\n\n`;
                    if (instructions.mpesa) textToCopy += `M-Pesa: ${instructions.mpesa}\n\n`;
                  } else {
                    textToCopy = instructions || '';
                  }
                  
                  navigator.clipboard.writeText(textToCopy.trim());
                  toast.success('Payment details copied to clipboard');
                }}
                className="text-primary-600 text-sm mt-2 hover:underline inline-flex items-center gap-1"
              >
                📋 Copy payment details
              </button>
            </div>
          </div>
        )}

        {/* Buyer Info */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Buyer</h2>
          <div className="flex items-center gap-3 mb-3">
            {order.buyerId?.profileImage?.url ? (
              <img 
                src={order.buyerId.profileImage.url} 
                alt={order.buyerId?.name} 
                className="w-12 h-12 rounded-full object-cover border-2 border-[color:var(--color-primary)]/20"
              />
            ) : (
              <div className="w-12 h-12 bg-gradient-to-br from-[color:var(--color-primary)] to-[color:var(--color-primary-strong)] rounded-full flex items-center justify-center text-white font-bold">
                {order.buyerId?.name?.charAt(0)?.toUpperCase()}
              </div>
            )}
            <div>
              <p className="font-semibold">{order.buyerId?.name}</p>
            </div>
          </div>
          <p><strong>Email:</strong> {order.buyerId?.email}</p>
          <p><strong>Phone:</strong> {order.buyerId?.phone}</p>
        </div>

        {/* Seller Info */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Seller</h2>
          <div className="flex items-center gap-3 mb-3">
            {order.sellerId?.profileImage?.url ? (
              <img 
                src={order.sellerId.profileImage.url} 
                alt={order.sellerId?.name} 
                className="w-12 h-12 rounded-full object-cover border-2 border-[color:var(--color-primary)]/20"
              />
            ) : (
              <div className="w-12 h-12 bg-gradient-to-br from-[color:var(--color-primary)] to-[color:var(--color-primary-strong)] rounded-full flex items-center justify-center text-white font-bold">
                {order.sellerId?.name?.charAt(0)?.toUpperCase()}
              </div>
            )}
            <div>
              <p className="font-semibold">{order.sellerId?.name}</p>
            </div>
          </div>
          <p><strong>Email:</strong> {order.sellerId?.email}</p>
          <p><strong>Phone:</strong> {order.sellerId?.phone}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="card mt-6">
        <h2 className="text-xl font-semibold mb-4">{t('orderDetail.actions')}</h2>
        <div className="flex flex-wrap gap-3">
          {/* Seller Actions */}
          {isSeller && order.status === 'requested' && (
            <>
              <button 
                onClick={() => window.confirm(t('orderDetail.confirmConfirm')) && handleStatusUpdate('seller_confirmed')} 
                className="btn btn-primary"
                disabled={updateMutation.isPending}
              >
                ✅ {t('orderDetail.confirmOrder')}
              </button>
              <button 
                onClick={() => window.confirm(t('orderDetail.confirmCancel')) && handleStatusUpdate('cancelled')} 
                className="btn bg-gray-500 hover:bg-gray-600 text-white"
                disabled={updateMutation.isPending}
              >
                ❌ {t('orderDetail.cancelOrder')}
              </button>
            </>
          )}
          {isSeller && order.status === 'seller_confirmed' && (
            <button 
              onClick={() => window.confirm(t('orderDetail.confirmPaid')) && handleStatusUpdate('paid_offsite')} 
              className="btn btn-primary"
              disabled={updateMutation.isPending}
            >
              💰 {t('orderDetail.markPaid')}
            </button>
          )}
          {isSeller && order.status === 'paid_offsite' && (
            <button 
              onClick={() => window.confirm(t('orderDetail.confirmDelivered')) && handleStatusUpdate('delivered')} 
              className="btn btn-primary"
              disabled={updateMutation.isPending}
            >
              📦 {t('orderDetail.markDelivered')}
            </button>
          )}

          {/* Buyer Actions */}
          {isBuyer && order.status === 'requested' && (
            <button 
              onClick={() => window.confirm(t('orderDetail.confirmCancel')) && handleStatusUpdate('cancelled')} 
              className="btn bg-gray-500 hover:bg-gray-600 text-white"
              disabled={updateMutation.isPending}
            >
              ❌ {t('orderDetail.cancelOrder')}
            </button>
          )}
          {isBuyer && order.status === 'delivered' && (
            <button 
              onClick={() => window.confirm(t('orderDetail.confirmComplete')) && handleStatusUpdate('completed')} 
              className="btn btn-primary"
              disabled={updateMutation.isPending}
            >
              ✅ {t('orderDetail.completeOrder')}
            </button>
          )}

          {/* Dispute Action */}
          {(isBuyer || isSeller) && !['disputed', 'cancelled', 'delivered', 'completed'].includes(order.status) && (
            <button 
              onClick={() => setShowDisputeModal(true)} 
              className="btn bg-red-500 hover:bg-red-600 text-white"
              disabled={updateMutation.isPending || disputeMutation.isPending}
            >
              ⚠️ {t('orderDetail.fileDispute')}
            </button>
          )}

          {/* No actions available */}
          {!isSeller && !isBuyer && (
            <p className="text-gray-500 text-sm">You don't have permission to perform actions on this order.</p>
          )}
          
          {/* Status messages for completed/cancelled/disputed orders */}
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
                <Link to={`/disputes?orderId=${order._id}`} className="text-[color:var(--color-primary)] hover:underline text-sm">
                  View Dispute Details →
                </Link>
              )}
            </div>
           )}
          
          {/* Waiting messages for buyers in other statuses */}
          {isBuyer && ['seller_confirmed', 'paid_offsite'].includes(order.status) && (
            <p className="text-gray-600 text-sm">
              ⏳ Waiting for seller to complete the order process...
            </p>
          )}
          
          {/* Waiting messages for sellers */}
          {isSeller && order.status === 'delivered' && (
            <p className="text-gray-600 text-sm">
              ⏳ Waiting for buyer to confirm delivery...
            </p>
          )}
        </div>
      </div>

      {/* Dispute Modal */}
      {showDisputeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full">
            <h2 className="text-2xl font-bold mb-4">⚠️ {t('orderDetail.disputeReason')}</h2>
            <p className="text-gray-600 text-sm mb-4">
              Please describe the issue with this order. An admin will review your dispute and help resolve it.
            </p>
            <textarea 
              value={disputeReason} 
              onChange={e => setDisputeReason(e.target.value)} 
              placeholder={t('orderDetail.reasonPlaceholder')} 
              className="input" 
              rows="6"
              disabled={disputeMutation.isPending}
            />
            {disputeReason.trim().length < 10 && disputeReason.length > 0 && (
              <p className="text-red-500 text-xs mt-1">Please provide at least 10 characters</p>
            )}
            <div className="flex space-x-3 mt-4">
              <button 
                onClick={() => {
                  setShowDisputeModal(false);
                  setDisputeReason('');
                }} 
                className="btn btn-secondary flex-1"
                disabled={disputeMutation.isPending}
              >
                {t('common.cancel')}
              </button>
              <button 
                onClick={() => {
                  if (disputeReason.trim().length < 10) {
                    toast.error('Please describe the issue in more detail (minimum 10 characters)');
                    return;
                  }
                  disputeMutation.mutate({ orderId: id, reason: disputeReason });
                }} 
                className="btn bg-red-500 hover:bg-red-600 text-white flex-1"
                disabled={disputeMutation.isPending || disputeReason.trim().length < 10}
              >
                {disputeMutation.isPending ? 'Submitting...' : t('orderDetail.submitDispute')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderDetail;

