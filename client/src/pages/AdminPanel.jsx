import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminAPI } from '../services/api';
import api from '../services/api';
import { onListingCreated, onListingStatusChanged, offListingCreated, offListingStatusChanged } from '../services/socket';
import toast from 'react-hot-toast';
import BackButton from '../components/BackButton';

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState('stats');
  const queryClient = useQueryClient();

  const { data: stats } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: adminAPI.getStats,
  });

  const { data: users } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => adminAPI.getAllUsers({ kycStatus: 'pending' }),
    enabled: activeTab === 'kyc',
  });

  const { data: disputes } = useQuery({
    queryKey: ['admin', 'disputes'],
    queryFn: () => adminAPI.getAllDisputes({ status: 'open' }),
    enabled: activeTab === 'disputes',
  });

  const kycMutation = useMutation({
    mutationFn: ({ userId, status }) => adminAPI.updateKYC(userId, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin', 'users']);
      toast.success('KYC updated');
    },
  });

  const disputeMutation = useMutation({
    mutationFn: ({ id, status }) => adminAPI.updateDispute(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin', 'disputes']);
      toast.success('Dispute updated');
    },
  });

  // Pending listings moderation
  const { data: pendingListings, isLoading: loadingPending } = useQuery({
    queryKey: ['admin', 'pending-listings'],
    queryFn: () => api.get('/admin/listings/pending'),
    enabled: activeTab === 'moderation',
  });
  const approveListing = useMutation({
    mutationFn: (id) => api.patch(`/admin/listings/${id}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin', 'pending-listings']);
      queryClient.invalidateQueries(['admin', 'stats']);
      toast.success('✅ Listing approved');
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to approve listing');
    }
  });
  const rejectListing = useMutation({
    mutationFn: ({ id, reason }) => api.patch(`/admin/listings/${id}/reject`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin', 'pending-listings']);
      queryClient.invalidateQueries(['admin', 'stats']);
      toast.success('❌ Listing rejected');
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to reject listing');
    }
  });

  // Real-time updates for admin panel
  useEffect(() => {
    const handleListingCreated = (data) => {
      console.log('📦 [AdminPanel] New listing created:', data);
      // Invalidate pending listings to show new listing
      queryClient.invalidateQueries(['admin', 'pending-listings']);
      queryClient.invalidateQueries(['admin', 'stats']);
      
      // Refetch if on moderation tab
      if (activeTab === 'moderation') {
        queryClient.refetchQueries(['admin', 'pending-listings']);
      }
      
      // Show toast notification
      toast.info('📦 New listing pending review');
    };

    const handleListingStatusChanged = (data) => {
      console.log('🔄 [AdminPanel] Listing status changed:', data);
      // Invalidate queries when listing is approved/rejected
      queryClient.invalidateQueries(['admin', 'pending-listings']);
      queryClient.invalidateQueries(['admin', 'stats']);
      
      // Refetch if on moderation tab
      if (activeTab === 'moderation') {
        queryClient.refetchQueries(['admin', 'pending-listings']);
      }
    };

    onListingCreated(handleListingCreated);
    onListingStatusChanged(handleListingStatusChanged);

    return () => {
      offListingCreated(handleListingCreated);
      offListingStatusChanged(handleListingStatusChanged);
    };
  }, [queryClient, activeTab]);

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
      <div className="mb-3 sm:mb-4">
        <BackButton />
      </div>
      <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-4 sm:mb-6">Admin Panel</h1>

      {/* Tabs */}
      <div className="flex flex-wrap sm:space-x-2 md:space-x-4 mb-4 sm:mb-6 border-b overflow-x-auto">
        {['stats', 'kyc', 'disputes', 'moderation'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 sm:px-4 py-2 font-medium text-xs sm:text-sm md:text-base whitespace-nowrap ${activeTab === tab ? 'border-b-2 border-primary-600 text-primary-600' : 'text-gray-600'}`}
          >
            {tab.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Stats Tab */}
      {activeTab === 'stats' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
          <div className="card p-3 sm:p-4">
            <h3 className="text-xs sm:text-sm text-gray-500 mb-1 sm:mb-0">Total Users</h3>
            <p className="text-xl sm:text-2xl md:text-3xl font-bold">{stats?.stats?.users?.total || 0}</p>
          </div>
          <div className="card p-3 sm:p-4">
            <h3 className="text-xs sm:text-sm text-gray-500 mb-1 sm:mb-0">Active Listings</h3>
            <p className="text-xl sm:text-2xl md:text-3xl font-bold">{stats?.stats?.listings?.active || 0}</p>
          </div>
          <div className="card p-3 sm:p-4">
            <h3 className="text-xs sm:text-sm text-gray-500 mb-1 sm:mb-0">Total Orders</h3>
            <p className="text-xl sm:text-2xl md:text-3xl font-bold">{stats?.stats?.orders?.total || 0}</p>
          </div>
          <div className="card p-3 sm:p-4">
            <h3 className="text-xs sm:text-sm text-gray-500 mb-1 sm:mb-0">Open Disputes</h3>
            <p className="text-xl sm:text-2xl md:text-3xl font-bold">{stats?.stats?.disputes?.open || 0}</p>
          </div>
        </div>
      )}

      {/* KYC Tab */}
      {activeTab === 'kyc' && (
        <div className="space-y-3 sm:space-y-4">
          {users?.users?.map(user => (
            <div key={user._id} className="card p-3 sm:p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm sm:text-base truncate">{user.name}</h3>
                <p className="text-xs sm:text-sm text-gray-600 truncate">{user.email} · {user.phone}</p>
                <p className="text-xs text-gray-500">KYC Status: {user.kyc.status}</p>
              </div>
              <div className="flex gap-2 sm:space-x-2">
                <button onClick={() => kycMutation.mutate({ userId: user._id, status: 'approved' })} className="btn btn-primary btn-sm flex-1 sm:flex-none text-xs sm:text-sm">Approve</button>
                <button onClick={() => kycMutation.mutate({ userId: user._id, status: 'rejected' })} className="btn btn-danger btn-sm flex-1 sm:flex-none text-xs sm:text-sm">Reject</button>
              </div>
            </div>
          ))}
          {users?.users?.length === 0 && <p className="text-center text-gray-500 py-8 text-sm sm:text-base">No pending KYC requests</p>}
        </div>
      )}

      {/* Disputes Tab */}
      {activeTab === 'disputes' && (
        <div className="space-y-3 sm:space-y-4">
          {disputes?.disputes?.map(dispute => (
            <div key={dispute._id} className="card p-3 sm:p-4">
              <h3 className="font-semibold text-sm sm:text-base mb-2">Dispute #{dispute._id.slice(-6)}</h3>
              <p className="text-xs sm:text-sm text-gray-600 mb-2 line-clamp-3">{dispute.reason}</p>
              <p className="text-xs text-gray-500 mb-3 truncate">Reporter: {dispute.reporterId?.name}</p>
              <div className="flex gap-2 sm:space-x-2">
                <button onClick={() => disputeMutation.mutate({ id: dispute._id, status: 'resolved' })} className="btn btn-primary btn-sm flex-1 sm:flex-none text-xs sm:text-sm">Resolve</button>
                <button onClick={() => disputeMutation.mutate({ id: dispute._id, status: 'rejected' })} className="btn btn-secondary btn-sm flex-1 sm:flex-none text-xs sm:text-sm">Reject</button>
              </div>
            </div>
          ))}
          {disputes?.disputes?.length === 0 && <p className="text-center text-gray-500 py-8 text-sm sm:text-base">No open disputes</p>}
        </div>
      )}

      {activeTab === 'moderation' && (
        <div className="space-y-3 sm:space-y-4">
          {loadingPending ? (
            <div className="text-center py-8 text-sm sm:text-base">Loading...</div>
          ) : (pendingListings?.listings || []).map((l) => (
            <div key={l._id} className="card p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
                {l.images?.[0] && (
                  <img src={l.images[0].url} alt={l.title} className="w-full sm:w-20 md:w-24 h-32 sm:h-20 md:h-24 object-contain bg-gray-50 rounded" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col gap-3">
                    <div>
                      <h3 className="font-semibold text-sm sm:text-base mb-1 line-clamp-1">{l.title}</h3>
                      <p className="text-xs sm:text-sm text-gray-600 line-clamp-2 mb-2">{l.description}</p>
                      <p className="text-xs text-gray-500 truncate">Seller: {l.sellerId?.name} ({l.sellerId?.email})</p>
                    </div>
                    <div className="flex gap-2">
                      <button className="btn btn-secondary flex-1 sm:flex-none text-xs sm:text-sm" onClick={() => approveListing.mutate(l._id)}>Approve</button>
                      <button className="btn btn-danger flex-1 sm:flex-none text-xs sm:text-sm" onClick={() => {
                        const reason = prompt('Reason (optional)');
                        rejectListing.mutate({ id: l._id, reason });
                      }}>Reject</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {pendingListings?.listings?.length === 0 && <p className="text-center text-gray-500 py-8 text-sm sm:text-base">No pending listings.</p>}
        </div>
      )}
    </div>
  );
};

export default AdminPanel;

