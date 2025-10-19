import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listingsAPI, ordersAPI } from '../services/api';
import toast from 'react-hot-toast';

const SellerDashboard = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('active'); // 'active', 'pending', 'sold'

  const { data: listingsData, isLoading: listingsLoading } = useQuery({
    queryKey: ['listings', 'my-listings'],
    queryFn: () => listingsAPI.getAll({ sellerId: 'me' }),
  });

  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['orders', 'seller'],
    queryFn: () => ordersAPI.getMyOrders({ role: 'seller' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => listingsAPI.delete(id),
    onSuccess: () => {
      toast.success('Listing deleted');
      queryClient.invalidateQueries(['listings']);
      queryClient.invalidateQueries(['listings', 'my-listings']);
    },
    onError: (e) => {
      toast.error(e?.message || 'Failed to delete');
    }
  });

  const markAsSoldMutation = useMutation({
    mutationFn: ({ id, status }) => listingsAPI.update(id, { status }),
    onSuccess: (_, variables) => {
      const statusText = variables.status === 'sold' ? 'sold' : 'active';
      toast.success(`Listing marked as ${statusText}`);
      queryClient.invalidateQueries(['listings']);
      queryClient.invalidateQueries(['listings', 'my-listings']);
    },
    onError: (e) => {
      toast.error(e?.message || 'Failed to update status');
    }
  });

  const onDelete = (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    if (deleteMutation.isPending) return;
    if (window.confirm('Delete this listing? This cannot be undone.')) {
      deleteMutation.mutate(id);
    }
  };

  const toggleSoldStatus = (e, listing) => {
    e.preventDefault();
    e.stopPropagation();
    const newStatus = listing.status === 'sold' ? 'active' : 'sold';
    markAsSoldMutation.mutate({ id: listing._id, status: newStatus });
  };

  const activeListings = listingsData?.listings?.filter(l => l.status === 'active') || [];
  const soldListings = listingsData?.listings?.filter(l => l.status === 'sold') || [];
  const pendingListings = listingsData?.listings?.filter(l => l.status === 'pending') || [];
  const totalViews = listingsData?.listings?.reduce((sum, l) => sum + (l.views || 0), 0) || 0;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold">Seller Dashboard</h1>
          <p className="text-gray-600 mt-1">Manage your listings and orders</p>
        </div>
        <div className="flex gap-3">
          <Link to="/profile" className="btn btn-secondary">
            👤 My Profile
          </Link>
          <Link to="/create-listing" className="btn btn-primary">
            + Create Listing
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="card bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm text-green-700 font-medium mb-1">Active Listings</h3>
              <p className="text-3xl font-bold text-green-900">{activeListings.length}</p>
            </div>
            <div className="w-12 h-12 bg-green-200 rounded-full flex items-center justify-center">
              <span className="text-2xl">✅</span>
            </div>
          </div>
        </div>
        
        <div className="card bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm text-red-700 font-medium mb-1">Sold Items</h3>
              <p className="text-3xl font-bold text-red-900">{soldListings.length}</p>
            </div>
            <div className="w-12 h-12 bg-red-200 rounded-full flex items-center justify-center">
              <span className="text-2xl">🔴</span>
            </div>
          </div>
        </div>
        
        <div className="card bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm text-yellow-700 font-medium mb-1">Pending Review</h3>
              <p className="text-3xl font-bold text-yellow-900">{pendingListings.length}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-200 rounded-full flex items-center justify-center">
              <span className="text-2xl">⏳</span>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm text-purple-700 font-medium mb-1">Total Views</h3>
              <p className="text-3xl font-bold text-purple-900">{totalViews}</p>
            </div>
            <div className="w-12 h-12 bg-purple-200 rounded-full flex items-center justify-center">
              <span className="text-2xl">👁️</span>
            </div>
          </div>
        </div>
      </div>

      {/* My Listings with Tabs */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">My Listings</h2>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200 overflow-x-auto">
          <button
            onClick={() => setActiveTab('active')}
            className={`px-4 py-3 font-semibold whitespace-nowrap border-b-2 transition-colors ${
              activeTab === 'active'
                ? 'border-green-500 text-green-700 bg-green-50'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            ✅ Active ({activeListings.length})
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-3 font-semibold whitespace-nowrap border-b-2 transition-colors ${
              activeTab === 'pending'
                ? 'border-yellow-500 text-yellow-700 bg-yellow-50'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            ⏳ Pending Review ({pendingListings.length})
          </button>
          <button
            onClick={() => setActiveTab('sold')}
            className={`px-4 py-3 font-semibold whitespace-nowrap border-b-2 transition-colors ${
              activeTab === 'sold'
                ? 'border-red-500 text-red-700 bg-red-50'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            🔴 Sold ({soldListings.length})
          </button>
        </div>

        {/* Listings Grid */}
        {listingsLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            <p className="ml-3 text-gray-600">Loading listings...</p>
          </div>
        ) : (
          <>
            {/* Active Listings */}
            {activeTab === 'active' && (
              activeListings.length === 0 ? (
                <div className="text-center py-12 card">
                  <div className="text-6xl mb-4">📦</div>
                  <p className="text-gray-500 text-lg mb-2">No active listings</p>
                  <p className="text-sm text-gray-400">Create a new listing to get started!</p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeListings.map(listing => (
                    <ListingCard key={listing._id} listing={listing} onToggleSold={toggleSoldStatus} onDelete={onDelete} markAsSoldMutation={markAsSoldMutation} deleteMutation={deleteMutation} />
                  ))}
                </div>
              )
            )}

            {/* Pending Listings */}
            {activeTab === 'pending' && (
              pendingListings.length === 0 ? (
                <div className="text-center py-12 card">
                  <div className="text-6xl mb-4">⏳</div>
                  <p className="text-gray-500 text-lg mb-2">No pending listings</p>
                  <p className="text-sm text-gray-400">New listings you create will appear here for admin review</p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pendingListings.map(listing => (
                    <ListingCard key={listing._id} listing={listing} onToggleSold={toggleSoldStatus} onDelete={onDelete} markAsSoldMutation={markAsSoldMutation} deleteMutation={deleteMutation} />
                  ))}
                </div>
              )
            )}

            {/* Sold Listings */}
            {activeTab === 'sold' && (
              soldListings.length === 0 ? (
                <div className="text-center py-12 card">
                  <div className="text-6xl mb-4">🔴</div>
                  <p className="text-gray-500 text-lg mb-2">No sold items yet</p>
                  <p className="text-sm text-gray-400">Items you mark as sold will appear here</p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {soldListings.map(listing => (
                    <ListingCard key={listing._id} listing={listing} onToggleSold={toggleSoldStatus} onDelete={onDelete} markAsSoldMutation={markAsSoldMutation} deleteMutation={deleteMutation} />
                  ))}
                </div>
              )
            )}
          </>
        )}
      </div>

      {/* Recent Orders */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Recent Orders</h2>
        {ordersLoading ? (
          <p>Loading...</p>
        ) : ordersData?.orders?.length === 0 ? (
          <p className="text-gray-500">No orders yet.</p>
        ) : (
          <div className="space-y-3">
            {ordersData?.orders?.slice(0, 5).map(order => (
              <Link key={order._id} to={`/orders/${order._id}`} className="card flex justify-between items-center hover:shadow-lg">
                <div>
                  <h4 className="font-semibold">{order.listingId?.title}</h4>
                  <p className="text-sm text-gray-500">Buyer: {order.buyerId?.name}</p>
                </div>
                <div className="text-right">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs ${order.status === 'requested' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                    {order.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Listing Card Component
const ListingCard = ({ listing, onToggleSold, onDelete, markAsSoldMutation, deleteMutation }) => {
  return (
    <div className="card hover:shadow-lg transition-shadow relative">
      {/* Status Badge */}
      <div className="absolute top-3 right-3 z-10">
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
          listing.status === 'sold' ? 'bg-red-100 text-red-800' :
          listing.status === 'active' ? 'bg-green-100 text-green-800' :
          listing.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {listing.status === 'sold' && '🔴 '}
          {listing.status === 'active' && '✅ '}
          {listing.status === 'pending' && '⏳ '}
          {listing.status.toUpperCase()}
        </span>
      </div>

      <Link to={`/listings/${listing._id}`} className="block">
        {listing.images?.[0] ? (
          <img src={listing.images[0].url} alt={listing.title} className="w-full h-40 object-cover bg-gray-50 rounded-lg mb-3" />
        ) : (
          <div className="w-full h-40 bg-gray-200 rounded-lg mb-3 flex items-center justify-center">
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        <h3 className="font-semibold truncate text-lg">{listing.title}</h3>
      </Link>
      
      <div className="mt-2 mb-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-purple-600 font-bold text-xl">{listing.price} ETB</p>
            {listing.priceType && listing.priceType !== 'fixed' && (
              <p className="text-xs text-gray-500 mt-0.5">
                {listing.priceType === 'per-hour' && 'Per Hour'}
                {listing.priceType === 'per-day' && 'Per Day'}
                {listing.priceType === 'per-month' && 'Per Month'}
                {listing.priceType === 'contract' && 'Contract'}
                {listing.priceType === 'negotiable' && 'Negotiable'}
              </p>
            )}
          </div>
          <div className="text-xs text-gray-500">
            <p>{listing.views || 0} views</p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-2 mt-3 pt-3 border-t border-gray-100">
        {/* Quick Actions Row */}
        {listing.status !== 'pending' && (
          <div className="flex gap-2">
            <button 
              onClick={(e) => onToggleSold(e, listing)}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all ${
                listing.status === 'sold' 
                  ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                  : 'bg-red-100 text-red-700 hover:bg-red-200'
              }`}
              disabled={markAsSoldMutation.isPending}
            >
              {markAsSoldMutation.isPending ? '...' : (
                listing.status === 'sold' ? '✓ Mark Available' : '✗ Mark as Sold'
              )}
            </button>
          </div>
        )}

        {/* Pending Notice */}
        {listing.status === 'pending' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 text-xs text-yellow-800">
            ⏳ Waiting for admin approval
          </div>
        )}

        {/* Edit & Delete Row */}
        <div className="flex gap-2">
          <Link 
            to={`/listings/${listing._id}/edit`} 
            className="flex-1 text-center py-2 px-3 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-sm font-semibold transition-all"
          >
            ✏️ Edit
          </Link>
          <button 
            onClick={(e) => onDelete(e, listing._id)} 
            className="flex-1 py-2 px-3 bg-gray-100 text-gray-700 hover:bg-red-50 hover:text-red-700 rounded-lg text-sm font-semibold transition-all"
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? '...' : '🗑️ Delete'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SellerDashboard;
