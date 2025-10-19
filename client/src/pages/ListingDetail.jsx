import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listingsAPI, ordersAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

const ListingDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const queryClient = useQueryClient();

  const [showIntentModal, setShowIntentModal] = useState(false);
  const [showSafetyModal, setShowSafetyModal] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [buyerNote, setBuyerNote] = useState('');
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const { data: listing, isLoading } = useQuery({
    queryKey: ['listing', id],
    queryFn: () => listingsAPI.getById(id),
  });

  const createOrderMutation = useMutation({
    mutationFn: ordersAPI.create,
    onSuccess: (data) => {
      toast.success('Order intent created successfully!');
      setShowIntentModal(false);
      navigate(`/orders/${data.order._id}`);
      queryClient.invalidateQueries(['orders']);
    },
  });

  const handleIntentSubmit = (e) => {
    e.preventDefault();

    if (!isAuthenticated) {
      toast.error('Please login to create an order');
      navigate('/login');
      return;
    }

    if (!selectedPaymentMethod) {
      toast.error('Please select a payment method');
      return;
    }

    createOrderMutation.mutate({
      listingId: id,
      selected_payment_method: selectedPaymentMethod,
      buyer_note: buyerNote || undefined,
    });
  };

  if (isLoading) {
    return <div className="max-w-7xl mx-auto px-4 py-12 text-center">Loading...</div>;
  }

  if (!listing) {
    return <div className="max-w-7xl mx-auto px-4 py-12 text-center">Listing not found</div>;
  }

  const isOwnListing = user?._id === listing.listing.sellerId._id;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid md:grid-cols-2 gap-8">
        {/* Images */}
        <div>
          {listing.listing.images?.length > 0 ? (
            <div>
              <div className="w-full h-96 bg-gray-50 rounded-lg shadow-lg flex items-center justify-center mb-3">
                <img
                  src={listing.listing.images[activeImageIndex]?.url}
                  alt={listing.listing.title}
                  className="max-h-96 object-contain"
                />
              </div>
              {listing.listing.images.length > 1 && (
                <div className="grid grid-cols-5 gap-2">
                  {listing.listing.images.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveImageIndex(idx)}
                      className={`relative rounded overflow-hidden ${activeImageIndex === idx ? 'ring-2 ring-primary-500' : ''}`}
                      title={`Image ${idx + 1}`}
                    >
                      <img src={img.url} alt="" className="w-full h-20 object-contain bg-gray-50" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="w-full h-96 bg-gray-200 rounded-lg flex items-center justify-center">
              <span className="text-gray-400">No image</span>
            </div>
          )}
        </div>

        {/* Details */}
        <div>
          <h1 className="text-3xl font-bold mb-4">{listing.listing.title}</h1>
          
          <div className="mb-6">
            <div className="text-4xl font-bold text-primary-600">
              {listing.listing.price} {listing.listing.currency}
            </div>
            {listing.listing.priceType && listing.listing.priceType !== 'fixed' && (
              <p className="text-sm text-gray-600 mt-1">
                {listing.listing.priceType === 'per-hour' && 'Per Hour'}
                {listing.listing.priceType === 'per-day' && 'Per Day'}
                {listing.listing.priceType === 'per-month' && 'Per Month'}
                {listing.listing.priceType === 'contract' && 'Contract/Project Based'}
                {listing.listing.priceType === 'negotiable' && 'Price Negotiable'}
              </p>
            )}
          </div>

          {listing.listing.condition && listing.listing.condition !== 'not-applicable' && (
            <div className="mb-6">
              <span className="inline-block bg-gray-100 px-3 py-1 rounded-full text-sm">
                Condition: {listing.listing.condition}
              </span>
            </div>
          )}

          <nav className="text-sm text-gray-500 mb-4">
            <button className="hover:underline" onClick={() => navigate('/search')}>Browse</button>
            <span className="mx-2">/</span>
            <span>{listing.listing.category}</span>
            {listing.listing.subcategory && (
              <>
                <span className="mx-2">/</span>
                <span>{listing.listing.subcategory}</span>
              </>
            )}
          </nav>

          <div className="mb-6">
            <h3 className="font-semibold mb-2">Description</h3>
            <p className="text-gray-700 whitespace-pre-wrap">{listing.listing.description}</p>
          </div>

          {/* Payment Methods */}
          <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4">
            <h3 className="font-semibold mb-2">Payment Methods</h3>
            <div className="flex flex-wrap gap-2 mb-2">
              {listing.listing.payment_methods.map((method, idx) => (
                <span key={idx} className="bg-white px-3 py-1 rounded-full text-sm border">
                  {method}
                </span>
              ))}
            </div>
            {listing.listing.payment_instructions && (
              <div className="text-sm text-gray-700 mt-3 space-y-2">
                <strong className="block mb-1">Payment Instructions:</strong>
                {typeof listing.listing.payment_instructions === 'object' ? (
                  // New format: object with keys (cash, bank, telebirr, mpesa)
                  <div className="space-y-2 bg-white p-3 rounded">
                    {listing.listing.payment_instructions.cash && (
                      <div>
                        <span className="font-medium text-gray-900">💵 Cash:</span>
                        <p className="text-gray-700 ml-5">{listing.listing.payment_instructions.cash}</p>
                      </div>
                    )}
                    {listing.listing.payment_instructions.bank && (
                      <div>
                        <span className="font-medium text-gray-900">🏦 Bank Transfer:</span>
                        <p className="text-gray-700 ml-5 whitespace-pre-wrap">{listing.listing.payment_instructions.bank}</p>
                      </div>
                    )}
                    {listing.listing.payment_instructions.telebirr && (
                      <div>
                        <span className="font-medium text-gray-900">📱 Telebirr:</span>
                        <p className="text-gray-700 ml-5">{listing.listing.payment_instructions.telebirr}</p>
                      </div>
                    )}
                    {listing.listing.payment_instructions.mpesa && (
                      <div>
                        <span className="font-medium text-gray-900">📲 M-Pesa:</span>
                        <p className="text-gray-700 ml-5">{listing.listing.payment_instructions.mpesa}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  // Old format: plain string (for backward compatibility)
                  <p className="bg-white p-3 rounded">{listing.listing.payment_instructions}</p>
                )}
              </div>
            )}
            <button
              onClick={() => {
                const instructions = listing.listing.payment_instructions;
                let textToCopy = '';
                
                if (typeof instructions === 'object') {
                  // Format object as readable text
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

          {/* Seller Info */}
          <div className="mb-6 card">
            <h3 className="font-semibold mb-2">Seller</h3>
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
                {listing.listing.sellerId.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="font-medium">
                  <button
                    type="button"
                    className="text-primary-600 hover:underline"
                    onClick={() => navigate(`/sellers/${listing.listing.sellerId._id}`)}
                    title="View seller profile"
                  >
                    {listing.listing.sellerId.name}
                  </button>
                </div>
                <div className="text-sm text-gray-500">{listing.listing.sellerId.email}</div>
                {listing.listing.sellerId.badges?.includes('verified-seller') && (
                  <div className="text-xs text-green-600">✓ Verified Seller</div>
                )}
              </div>
            </div>
          </div>

          {/* Safety Notice */}
          <div className="mb-6 bg-gradient-to-r from-purple-50 to-indigo-50 border-l-4 border-purple-500 p-4 rounded-lg">
            <p className="text-sm text-gray-700">
              <strong>🛡️ Safety:</strong> Meet in public; confirm mobile-money receipt before handing the item.
            </p>
            <button
              onClick={() => setShowSafetyModal(true)}
              className="text-purple-600 text-sm mt-1 hover:underline font-medium"
            >
              Read full safety guidelines →
            </button>
          </div>

          {/* Actions */}
          {!isOwnListing && listing.listing.status === 'active' && (
            <button
              onClick={() => setShowIntentModal(true)}
              className="w-full btn btn-primary text-lg py-3"
            >
              Intent to Buy
            </button>
          )}

          {isOwnListing && (
            <div className="text-center text-gray-500">
              This is your listing
            </div>
          )}
        </div>
      </div>

      {/* Intent Modal */}
      {showIntentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">Create Order Intent</h2>
            
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
              <p className="text-sm font-semibold text-gray-800">
                ⚠️ This platform does NOT process payments.
              </p>
              <p className="text-sm text-gray-700 mt-1">
                Select your payment method. You can discuss meeting details in the message chat with the seller.
              </p>
            </div>

            <form onSubmit={handleIntentSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Payment Method *</label>
                <select
                  value={selectedPaymentMethod}
                  onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                  className="input"
                  required
                >
                  <option value="">Select payment method</option>
                  {listing.listing.payment_methods.map((method, idx) => (
                    <option key={idx} value={method}>
                      {method}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Payment instructions will be shown after creating the order
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Note (optional)</label>
                <textarea
                  value={buyerNote}
                  onChange={(e) => setBuyerNote(e.target.value)}
                  placeholder="Any special requests or questions for the seller..."
                  className="input"
                  rows="3"
                />
                <p className="text-xs text-gray-500 mt-1">
                  💬 You can chat with the seller after creating the order to discuss meeting details
                </p>
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowIntentModal(false)}
                  className="flex-1 btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createOrderMutation.isPending}
                  className="flex-1 btn btn-primary"
                >
                  {createOrderMutation.isPending ? 'Creating...' : 'Create Intent'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Safety Modal */}
      {showSafetyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full">
            <h2 className="text-2xl font-bold mb-4">🛡️ Safety Guidelines</h2>
            <ul className="space-y-2 text-gray-700 mb-6">
              <li>✓ Always meet in public places during daylight</li>
              <li>✓ Bring a friend or inform someone about the meeting</li>
              <li>✓ Inspect the item thoroughly before payment</li>
              <li>✓ Verify payment confirmation (e.g., SMS receipt) before handing over item</li>
              <li>✓ Never share sensitive personal information</li>
              <li>✓ Report suspicious behavior to admins immediately</li>
              <li>✓ Use dispute resolution if issues arise</li>
            </ul>
            <button onClick={() => setShowSafetyModal(false)} className="w-full btn btn-primary">
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ListingDetail;

