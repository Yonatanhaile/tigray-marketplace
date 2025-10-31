import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { listingsAPI, ordersAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';
import BackButton from '../components/BackButton';

const ListingDetail = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const queryClient = useQueryClient();

  const [showIntentModal, setShowIntentModal] = useState(false);
  const [showSafetyModal, setShowSafetyModal] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [buyerNote, setBuyerNote] = useState('');
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [viewerImageIndex, setViewerImageIndex] = useState(0);
  
  // Function to get default zoom based on device
  const getDefaultZoom = () => {
    // Check if mobile device (screen width less than 768px)
    return window.innerWidth < 768 ? 1 : 0.5;
  };
  
  const [imageZoom, setImageZoom] = useState(getDefaultZoom());

  const { data: listing, isLoading } = useQuery({
    queryKey: ['listing', id],
    queryFn: () => listingsAPI.getById(id),
  });

  // Check buyer's order history for this listing
  const { data: orderHistory } = useQuery({
    queryKey: ['order-history', id],
    queryFn: async () => {
      if (!isAuthenticated) return { activeOrder: null, totalOrders: 0 };
      const ordersData = await ordersAPI.getMyOrders({ role: 'buyer' });
      const listingOrders = ordersData.orders.filter(order => order.listingId?._id === id);
      const activeOrder = listingOrders.find(order => 
        ['requested', 'confirmed', 'paid', 'delivered'].includes(order.status)
      );
      return {
        activeOrder,
        totalOrders: listingOrders.length,
      };
    },
    enabled: isAuthenticated && !!id,
  });

  const createOrderMutation = useMutation({
    mutationFn: ordersAPI.create,
    onSuccess: (data) => {
      if (data.isExisting) {
        // Buyer already has an order for this item
        toast.success('You already have an order for this item. Redirecting...', {
          duration: 3000,
          icon: 'ℹ️',
        });
      } else {
        // New order created
        toast.success('Order intent created successfully!', {
          duration: 3000,
        });
      }
      setShowIntentModal(false);
      navigate(`/orders/${data.order._id}`);
      queryClient.invalidateQueries(['orders']);
      queryClient.invalidateQueries(['order-history', id]);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create order intent', {
        duration: 4000,
      });
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

  const handleZoomIn = () => {
    setImageZoom((prev) => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setImageZoom((prev) => Math.max(prev - 0.25, 0.5));
  };

  const handleZoomReset = () => {
    setImageZoom(getDefaultZoom());
  };

  const handleImageChange = (newIndex) => {
    setViewerImageIndex(newIndex);
    setImageZoom(getDefaultZoom()); // Reset zoom when changing images
  };

  const handleCloseViewer = () => {
    setShowImageViewer(false);
    setImageZoom(getDefaultZoom()); // Reset zoom when closing
  };

  if (isLoading) {
    return <div className="max-w-7xl mx-auto px-4 py-12 text-center">{t('listingDetail.loading')}</div>;
  }

  if (!listing) {
    return <div className="max-w-7xl mx-auto px-4 py-12 text-center">{t('listingDetail.listingNotFound')}</div>;
  }

  const isOwnListing = user?._id === listing.listing.sellerId._id;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-4">
        <BackButton />
      </div>
      <div className="grid md:grid-cols-2 gap-8">
        {/* Images */}
        <div>
          {listing.listing.images?.length > 0 ? (
            <div>
              <div 
                className="w-full h-96 bg-gray-50 rounded-lg shadow-lg flex items-center justify-center mb-3 cursor-pointer hover:shadow-xl transition-shadow relative group"
                onClick={() => {
                  setViewerImageIndex(activeImageIndex);
                  setShowImageViewer(true);
                }}
              >
                <img
                  src={listing.listing.images[activeImageIndex]?.url}
                  alt={listing.listing.title}
                  className="max-h-96 object-contain"
                />
                {/* Zoom icon overlay */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white rounded-full p-3 shadow-lg">
                    <svg className="w-8 h-8 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                    </svg>
                  </div>
                </div>
              </div>
              {listing.listing.images.length > 1 && (
                <div className="grid grid-cols-5 gap-2">
                  {listing.listing.images.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveImageIndex(idx)}
                      className={`relative rounded overflow-hidden hover:ring-2 hover:ring-primary-300 transition-all ${activeImageIndex === idx ? 'ring-2 ring-primary-500' : ''}`}
                      title={`${t('listingDetail.image')} ${idx + 1}`}
                    >
                      <img src={img.url} alt="" className="w-full h-20 object-contain bg-gray-50" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="w-full h-96 bg-gray-200 rounded-lg flex items-center justify-center">
              <span className="text-gray-400">{t('listingDetail.noImage')}</span>
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
                {listing.listing.priceType === 'per-hour' && t('listingDetail.perHour')}
                {listing.listing.priceType === 'per-day' && t('listingDetail.perDay')}
                {listing.listing.priceType === 'per-month' && t('listingDetail.perMonth')}
                {listing.listing.priceType === 'contract' && t('listingDetail.perProject')}
                {listing.listing.priceType === 'negotiable' && t('listingDetail.priceNegotiable')}
              </p>
            )}
          </div>

          {listing.listing.condition && listing.listing.condition !== 'not-applicable' && (
            <div className="mb-6">
              <span className="inline-block bg-gray-100 px-3 py-1 rounded-full text-sm">
                {t('listingDetail.conditionLabel')} {listing.listing.condition}
              </span>
            </div>
          )}

          <nav className="text-sm text-gray-500 mb-4">
            <button className="hover:underline" onClick={() => navigate('/search')}>{t('listingDetail.browse')}</button>
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
            <h3 className="font-semibold mb-2">{t('listing.description')}</h3>
            <p className="text-gray-700 whitespace-pre-wrap">{listing.listing.description}</p>
          </div>

          {/* Location */}
          <div className="mb-6 card bg-blue-50">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <span>📍</span> {t('listing.location')}
            </h3>
            <div className="space-y-2 text-gray-700">
              <div className="flex items-start gap-2">
                <span className="font-medium min-w-[80px]">{t('listingDetail.region')}</span>
                <span>{listing.listing.location.region}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-medium min-w-[80px]">{t('listingDetail.zone')}</span>
                <span>{listing.listing.location.zone}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-medium min-w-[80px]">{t('listingDetail.address')}</span>
                <span>{listing.listing.location.specificAddress}</span>
              </div>
            </div>
          </div>

          {/* Payment Methods */}
          <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4">
            <h3 className="font-semibold mb-2">{t('listingDetail.paymentMethods')}</h3>
            <div className="flex flex-wrap gap-2 mb-2">
              {listing.listing.payment_methods.map((method, idx) => (
                <span key={idx} className="bg-white px-3 py-1 rounded-full text-sm border">
                  {method}
                </span>
              ))}
            </div>
            {listing.listing.payment_instructions && (
              <div className="text-sm text-gray-700 mt-3 space-y-2">
                <strong className="block mb-1">{t('listingDetail.paymentInstructions')}</strong>
                {typeof listing.listing.payment_instructions === 'object' ? (
                  // New format: object with keys (cash, bank, telebirr, mpesa)
                  <div className="space-y-2 bg-white p-3 rounded">
                    {listing.listing.payment_instructions.cash && (
                      <div>
                        <span className="font-medium text-gray-900">💵 {t('listingDetail.cash')}</span>
                        <p className="text-gray-700 ml-5">{listing.listing.payment_instructions.cash}</p>
                      </div>
                    )}
                    {listing.listing.payment_instructions.bank && (
                      <div>
                        <span className="font-medium text-gray-900">🏦 {t('listingDetail.bankTransfer')}</span>
                        <p className="text-gray-700 ml-5 whitespace-pre-wrap">{listing.listing.payment_instructions.bank}</p>
                      </div>
                    )}
                    {listing.listing.payment_instructions.telebirr && (
                      <div>
                        <span className="font-medium text-gray-900">📱 {t('listingDetail.telebirr')}</span>
                        <p className="text-gray-700 ml-5">{listing.listing.payment_instructions.telebirr}</p>
                      </div>
                    )}
                    {listing.listing.payment_instructions.mpesa && (
                      <div>
                        <span className="font-medium text-gray-900">📲 {t('listingDetail.mpesa')}</span>
                        <p className="text-gray-700 ml-5">{listing.listing.payment_instructions.mpesa}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  // Old format: plain string (for backward compatibility)
                  <p className="bg-white p-3 rounded">{listing.listing.payment_instructions}</p>
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
                    toast.success(t('listingDetail.copyPaymentDetails'));
                  }}
                  className="text-primary-600 text-sm mt-2 hover:underline inline-flex items-center gap-1"
                >
                  📋 {t('listingDetail.copyPaymentDetails')}
                </button>
              </div>
            )}
          </div>

          {/* Seller Info */}
          <div className="mb-6 card">
            <h3 className="font-semibold mb-2">{t('listing.seller')}</h3>
            <div className="flex items-center space-x-3">
              {listing.listing.sellerId.profileImage?.url ? (
                <img 
                  src={listing.listing.sellerId.profileImage.url} 
                  alt={listing.listing.sellerId.name} 
                  className="w-12 h-12 rounded-full object-cover border-2 border-purple-200"
                />
              ) : (
                <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  {listing.listing.sellerId.name.charAt(0).toUpperCase()}
                </div>
              )}
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
                  <div className="text-xs text-green-600">{t('listingDetail.verifiedSeller')}</div>
                )}
              </div>
            </div>
          </div>

          {/* Safety Notice */}
          <div className="mb-6 bg-gradient-to-r from-purple-50 to-indigo-50 border-l-4 border-purple-500 p-4 rounded-lg">
            <p className="text-sm text-gray-700">
              <strong>🛡️ {t('listingDetail.safetyNotice')}</strong> {t('listingDetail.safetyShort')}
            </p>
            <button
              onClick={() => setShowSafetyModal(true)}
              className="text-purple-600 text-sm mt-1 hover:underline font-medium"
            >
              {t('listingDetail.readSafetyGuidelines')}
            </button>
          </div>

          {/* Actions */}
          {!isOwnListing && listing.listing.status === 'active' && (
            <>
              {orderHistory?.activeOrder ? (
                <button
                  onClick={() => navigate(`/orders/${orderHistory.activeOrder._id}`)}
                  className="w-full btn btn-success text-lg py-3 bg-green-600 hover:bg-green-700"
                >
                  {t('listingDetail.viewYourOrder')}
                </button>
              ) : orderHistory?.totalOrders >= 2 ? (
                <div className="w-full text-center py-4 px-6 bg-yellow-50 border-2 border-yellow-400 rounded-lg">
                  <p className="text-yellow-800 font-semibold mb-2">⚠️ {t('listingDetail.maxOrdersReached')}</p>
                  <p className="text-yellow-700 text-sm">{t('listingDetail.maxOrdersMessage')}</p>
                </div>
              ) : (
                <button
                  onClick={() => setShowIntentModal(true)}
                  className="w-full btn btn-primary text-lg py-3"
                >
                  {t('listingDetail.intentToBuy')}
                </button>
              )}
            </>
          )}

          {isOwnListing && (
            <div className="text-center text-gray-500">
              {t('listingDetail.thisIsYourListing')}
            </div>
          )}
        </div>
      </div>

      {/* Intent Modal */}
      {showIntentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">{t('listingDetail.createOrderIntent')}</h2>
            
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
              <p className="text-sm font-semibold text-gray-800">
                ⚠️ {t('listingDetail.platformDisclaimer')}
              </p>
              <p className="text-sm text-gray-700 mt-1">
                {t('listingDetail.paymentMethodNote')}
              </p>
            </div>

            <form onSubmit={handleIntentSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">{t('listingDetail.paymentMethodLabel')}</label>
                <select
                  value={selectedPaymentMethod}
                  onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                  className="input"
                  required
                >
                  <option value="">{t('listingDetail.selectPaymentMethod')}</option>
                  {listing.listing.payment_methods.map((method, idx) => (
                    <option key={idx} value={method}>
                      {method}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {t('listingDetail.paymentInstructionsNote')}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">{t('listingDetail.noteOptional')}</label>
                <textarea
                  value={buyerNote}
                  onChange={(e) => setBuyerNote(e.target.value)}
                  placeholder={t('listingDetail.notePlaceholder')}
                  className="input"
                  rows="3"
                />
                <p className="text-xs text-gray-500 mt-1">
                  💬 {t('listingDetail.chatNote')}
                </p>
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowIntentModal(false)}
                  className="flex-1 btn btn-secondary"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={createOrderMutation.isPending}
                  className="flex-1 btn btn-primary"
                >
                  {createOrderMutation.isPending ? t('listingDetail.creating') : t('listingDetail.createIntent')}
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
            <h2 className="text-2xl font-bold mb-4">🛡️ {t('listingDetail.safetyGuidelines')}</h2>
            <ul className="space-y-2 text-gray-700 mb-6">
              <li>✓ {t('listingDetail.safetyRule1')}</li>
              <li>✓ {t('listingDetail.safetyRule2')}</li>
              <li>✓ {t('listingDetail.safetyRule3')}</li>
              <li>✓ {t('listingDetail.safetyRule4')}</li>
              <li>✓ {t('listingDetail.safetyRule5')}</li>
              <li>✓ {t('listingDetail.safetyRule6')}</li>
              <li>✓ {t('listingDetail.safetyRule7')}</li>
            </ul>
            <button onClick={() => setShowSafetyModal(false)} className="w-full btn btn-primary">
              {t('listingDetail.gotIt')}
            </button>
          </div>
        </div>
      )}

      {/* Image Viewer Modal */}
      {showImageViewer && listing?.listing?.images?.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center z-50">
          {/* Close button */}
          <button
            onClick={handleCloseViewer}
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors p-2 bg-black bg-opacity-50 rounded-full z-10"
            aria-label="Close"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Image counter and zoom controls */}
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 flex items-center gap-4 z-10">
            <div className="text-white bg-black bg-opacity-50 px-4 py-2 rounded-full">
              {viewerImageIndex + 1} / {listing.listing.images.length}
            </div>
            <div className="flex items-center gap-2 bg-black bg-opacity-50 px-3 py-2 rounded-full">
              <button
                onClick={handleZoomOut}
                disabled={imageZoom <= 0.5}
                className="text-white hover:text-gray-300 transition-colors disabled:opacity-30 disabled:cursor-not-allowed p-1"
                aria-label="Zoom out"
                title="Zoom out"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
                </svg>
              </button>
              <span className="text-white text-sm min-w-[4rem] text-center">{Math.round(imageZoom * 100)}%</span>
              <button
                onClick={handleZoomIn}
                disabled={imageZoom >= 3}
                className="text-white hover:text-gray-300 transition-colors disabled:opacity-30 disabled:cursor-not-allowed p-1"
                aria-label="Zoom in"
                title="Zoom in"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                </svg>
              </button>
              <button
                onClick={handleZoomReset}
                disabled={imageZoom === getDefaultZoom()}
                className="text-white hover:text-gray-300 transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-xs px-2 py-1 border border-white border-opacity-30 rounded"
                aria-label="Reset zoom"
                title={`Reset zoom to ${getDefaultZoom() * 100}%`}
              >
                Reset
              </button>
            </div>
          </div>

          {/* Previous button */}
          {listing.listing.images.length > 1 && (
            <button
              onClick={() => handleImageChange(viewerImageIndex === 0 ? listing.listing.images.length - 1 : viewerImageIndex - 1)}
              className="absolute left-4 text-white hover:text-gray-300 transition-colors p-3 bg-black bg-opacity-50 rounded-full z-10"
              aria-label="Previous image"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          {/* Main image container with overflow for zoom */}
          <div 
            className="absolute inset-0 overflow-auto" 
            style={{ 
              paddingTop: '80px', 
              paddingBottom: listing.listing.images.length > 1 ? '100px' : '80px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              minWidth: '100%',
              minHeight: '100%',
              padding: '20px'
            }}>
              <img
                src={listing.listing.images[viewerImageIndex]?.url}
                alt={`${listing.listing.title} - Image ${viewerImageIndex + 1}`}
                style={{
                  transform: `scale(${imageZoom})`,
                  transformOrigin: 'center center',
                  transition: 'transform 0.2s ease-out',
                  width: 'auto',
                  height: 'auto',
                  maxWidth: '100%',
                  maxHeight: '100%',
                }}
              />
            </div>
          </div>

          {/* Next button */}
          {listing.listing.images.length > 1 && (
            <button
              onClick={() => handleImageChange(viewerImageIndex === listing.listing.images.length - 1 ? 0 : viewerImageIndex + 1)}
              className="absolute right-4 text-white hover:text-gray-300 transition-colors p-3 bg-black bg-opacity-50 rounded-full z-10"
              aria-label="Next image"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}

          {/* Thumbnail strip */}
          {listing.listing.images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 max-w-full overflow-x-auto px-4 z-10">
              {listing.listing.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => handleImageChange(idx)}
                  className={`flex-shrink-0 w-16 h-16 rounded overflow-hidden transition-all ${
                    viewerImageIndex === idx ? 'ring-4 ring-white' : 'ring-2 ring-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={img.url} alt="" className="w-full h-full object-cover bg-gray-800" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ListingDetail;

