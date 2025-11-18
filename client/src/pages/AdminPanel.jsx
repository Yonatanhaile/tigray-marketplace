import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminAPI } from '../services/api';
import api from '../services/api';
import { onListingCreated, onListingStatusChanged, offListingCreated, offListingStatusChanged } from '../services/socket';
import toast from 'react-hot-toast';
import BackButton from '../components/BackButton';

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState('stats');
  const [selectedReferral, setSelectedReferral] = useState(null);
  const queryClient = useQueryClient();

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const { data: stats } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: adminAPI.getStats,
  });

  const { data: users } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => adminAPI.getAllUsers({ kycStatus: 'pending' }),
    enabled: activeTab === 'kyc',
  });

  // All users for user management tab
  const { data: allUsers, isLoading: loadingAllUsers } = useQuery({
    queryKey: ['admin', 'all-users'],
    queryFn: () => adminAPI.getAllUsers({}),
    enabled: activeTab === 'users',
  });

  const { data: disputes } = useQuery({
    queryKey: ['admin', 'disputes'],
    queryFn: () => adminAPI.getAllDisputes({ status: 'open' }),
    enabled: activeTab === 'disputes',
  });

  const { data: referralPrograms, isLoading: loadingReferrals } = useQuery({
    queryKey: ['admin', 'referrals'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/referrals/admin/programs`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch referral programs');
      return response.json();
    },
    enabled: activeTab === 'referrals',
  });

  const { data: withdrawalRequests, isLoading: loadingWithdrawals } = useQuery({
    queryKey: ['admin', 'withdrawals'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/referrals/admin/withdrawals`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch withdrawal requests');
      return response.json();
    },
    enabled: activeTab === 'referrals' || activeTab === 'stats', // Fetch on both tabs
    refetchInterval: 30000, // Auto-refresh every 30 seconds for new withdrawal notifications
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

  const processWithdrawalMutation = useMutation({
    mutationFn: async ({ referralId, withdrawalId, status, rejectionReason }) => {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/referrals/admin/withdrawals/${referralId}/${withdrawalId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status, rejectionReason }),
      });
      if (!response.ok) throw new Error('Failed to process withdrawal');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin', 'withdrawals']);
      queryClient.invalidateQueries(['admin', 'referrals']);
      toast.success('Withdrawal processed');
    },
  });

  const toggleFlagMutation = useMutation({
    mutationFn: async ({ referralId, flagged, reasons }) => {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/referrals/admin/programs/${referralId}/flag`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ flagged, reasons }),
      });
      if (!response.ok) throw new Error('Failed to update flag status');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin', 'referrals']);
      toast.success('Flag status updated');
    },
  });

  // Pending listings moderation
  const { data: pendingListings, isLoading: loadingPending } = useQuery({
    queryKey: ['admin', 'pending-listings'],
    queryFn: () => api.get('/admin/listings/pending'),
    enabled: activeTab === 'moderation' || activeTab === 'stats', // Fetch on both tabs
    refetchInterval: 30000, // Auto-refresh every 30 seconds for new listing notifications
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

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId) => {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete user');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin', 'all-users']);
      queryClient.invalidateQueries(['admin', 'stats']);
      toast.success('User deleted successfully');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete user');
    },
  });

  const handleDeleteUser = (user) => {
    if (window.confirm(`Are you sure you want to permanently delete user "${user.name}"? This action cannot be undone!`)) {
      deleteUserMutation.mutate(user._id);
    }
  };

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
        {['stats', 'users', 'kyc', 'disputes', 'moderation', 'referrals'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 sm:px-4 py-2 font-medium text-xs sm:text-sm md:text-base whitespace-nowrap relative ${activeTab === tab ? 'border-b-2 border-primary-600 text-primary-600' : 'text-gray-600'}`}
          >
            {tab.toUpperCase()}
            {/* Notification Badge for Pending Withdrawals */}
            {tab === 'referrals' && withdrawalRequests?.withdrawals?.filter(w => w.withdrawal.status === 'pending').length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                {withdrawalRequests.withdrawals.filter(w => w.withdrawal.status === 'pending').length}
              </span>
            )}
            {/* Notification Badge for Pending Moderation */}
            {tab === 'moderation' && pendingListings?.listings?.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                {pendingListings.listings.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Stats Tab */}
      {activeTab === 'stats' && (
        <>
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

          {/* Pending Moderation Alert */}
          {pendingListings?.listings?.length > 0 && (
            <div className="mt-6 bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg shadow-md">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-blue-500 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-blue-900">
                    Pending Listing Reviews
                  </h3>
                  <p className="text-sm text-blue-800 mt-1">
                    You have <span className="font-bold">{pendingListings.listings.length}</span> listing(s) waiting for approval or rejection.
                  </p>
                  <button
                    onClick={() => setActiveTab('moderation')}
                    className="mt-3 text-sm font-medium text-blue-700 hover:text-blue-900 underline"
                  >
                    Review Listings →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Pending Withdrawals Alert */}
          {withdrawalRequests?.withdrawals?.filter(w => w.withdrawal.status === 'pending').length > 0 && (
            <div className="mt-6 bg-orange-50 border-l-4 border-orange-500 p-4 rounded-r-lg shadow-md">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-orange-500 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-orange-900">
                    Pending Withdrawal Requests
                  </h3>
                  <p className="text-sm text-orange-800 mt-1">
                    You have <span className="font-bold">{withdrawalRequests.withdrawals.filter(w => w.withdrawal.status === 'pending').length}</span> pending withdrawal request(s) waiting for your review.
                  </p>
                  <button
                    onClick={() => setActiveTab('referrals')}
                    className="mt-3 text-sm font-medium text-orange-700 hover:text-orange-900 underline"
                  >
                    View Withdrawals →
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Users Tab - User Management */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">User Management</h2>
            <p className="text-sm text-gray-600">Total Users: {allUsers?.users?.length || 0}</p>
          </div>

          {loadingAllUsers ? (
            <div className="text-center py-8">Loading users...</div>
          ) : (
            <div className="space-y-3">
              {allUsers?.users?.map(user => (
                <div key={user._id} className="card p-4 hover:shadow-md transition-shadow">
                  <div className="flex flex-col sm:flex-row justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-base">{user.name}</h3>
                        {user.roles?.includes('admin') && (
                          <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full font-medium">
                            Admin
                          </span>
                        )}
                        {!user.isActive && (
                          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded-full font-medium">
                            Suspended
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-sm text-gray-600">
                        <p>📧 {user.email}</p>
                        <p>📱 {user.phone}</p>
                        <p>🆔 ID: {user._id.slice(-8)}</p>
                        <p>📅 Joined: {new Date(user.createdAt).toLocaleDateString()}</p>
                        {user.registrationMetadata?.ipAddress && (
                          <p>🌐 IP: {user.registrationMetadata.ipAddress}</p>
                        )}
                        <p>✅ KYC: {user.kyc?.status || 'pending'}</p>
                      </div>
                      {user.referredBy && (
                        <p className="text-xs text-purple-600 mt-1">
                          🎁 Referred by: {user.referredBy}
                        </p>
                      )}
                    </div>
                    <div className="flex sm:flex-col gap-2">
                      <button
                        onClick={() => handleDeleteUser(user)}
                        disabled={deleteUserMutation.isLoading || user.roles?.includes('admin')}
                        className={`btn btn-sm px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                          user.roles?.includes('admin')
                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            : 'bg-red-500 hover:bg-red-600 text-white'
                        }`}
                        title={user.roles?.includes('admin') ? 'Cannot delete admin users' : 'Delete user permanently'}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {allUsers?.users?.length === 0 && (
                <p className="text-center text-gray-500 py-8">No users found</p>
              )}
            </div>
          )}
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
        <div className="space-y-6">
          {/* Pending Listings Alert */}
          {pendingListings?.listings?.length > 0 && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-400 rounded-lg p-5 shadow-lg">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex-shrink-0">
                  <div className="h-12 w-12 rounded-full bg-blue-500 flex items-center justify-center animate-pulse">
                    <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-blue-900">
                    🔍 Action Required: Pending Listing Reviews
                  </h3>
                  <p className="text-sm text-blue-800 mt-1">
                    <span className="font-bold text-lg">{pendingListings.listings.length}</span> listing(s) waiting for your approval or rejection. Review and moderate below.
                  </p>
                </div>
              </div>
            </div>
          )}

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

      {/* Referrals Tab */}
      {activeTab === 'referrals' && (
        <div className="space-y-6">
          {/* Pending Withdrawals Alert */}
          {withdrawalRequests?.withdrawals?.filter(w => w.withdrawal.status === 'pending').length > 0 && (
            <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border-2 border-orange-400 rounded-lg p-5 shadow-lg">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex-shrink-0">
                  <div className="h-12 w-12 rounded-full bg-orange-500 flex items-center justify-center animate-pulse">
                    <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-orange-900">
                    💰 Action Required: Pending Withdrawal Requests
                  </h3>
                  <p className="text-sm text-orange-800 mt-1">
                    <span className="font-bold text-lg">{withdrawalRequests.withdrawals.filter(w => w.withdrawal.status === 'pending').length}</span> user(s) waiting for withdrawal approval. Review and process payments below.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-xs sm:text-sm text-gray-600">Total Programs</p>
              <p className="text-xl sm:text-2xl font-semibold text-gray-900">
                {referralPrograms?.programs?.length || 0}
              </p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-xs sm:text-sm text-gray-600">Flagged Accounts</p>
              <p className="text-xl sm:text-2xl font-semibold text-red-600">
                {referralPrograms?.programs?.filter(p => p.suspiciousActivity?.flagged).length || 0}
              </p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-xs sm:text-sm text-gray-600">Pending Withdrawals</p>
              <p className="text-xl sm:text-2xl font-semibold text-orange-600">
                {withdrawalRequests?.withdrawals?.filter(w => w.withdrawal.status === 'pending').length || 0}
              </p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-xs sm:text-sm text-gray-600">Total Withdrawn</p>
              <p className="text-xl sm:text-2xl font-semibold text-green-600">
                {referralPrograms?.programs?.reduce((sum, p) => sum + (p.totalWithdrawn || 0), 0) || 0} Birr
              </p>
            </div>
          </div>

          {loadingReferrals ? (
            <div className="text-center py-8">Loading referral programs...</div>
          ) : (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Referral Programs</h2>
              
              {referralPrograms?.programs?.map((program) => (
                <div key={program._id} className="bg-white rounded-lg border border-gray-200 p-4 sm:p-5">
                  {/* User Info Header */}
                  <div className="flex flex-col sm:flex-row justify-between gap-3 mb-4 pb-4 border-b">
                    <div className="flex-1">
                      <h3 className="font-semibold text-base sm:text-lg text-gray-900">
                        {program.userId?.name}
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-600">
                        {program.userId?.email} · {program.userId?.phone}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Code: <span className="font-mono font-semibold">{program.referralCode}</span>
                      </p>
                    </div>
                    
                    {/* Flag Status */}
                    {program.suspiciousActivity?.flagged && (
                      <div className="flex items-start gap-2">
                        <span className="text-xs px-3 py-1 bg-red-100 text-red-700 rounded-full font-medium">
                          Flagged
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                    <div>
                      <p className="text-xs text-gray-600">Total Referrals</p>
                      <p className="text-lg font-semibold text-gray-900">{program.totalReferrals}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Available</p>
                      <p className="text-lg font-semibold text-gray-900">{program.availableReferrals}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Balance</p>
                      <p className="text-lg font-semibold text-green-600">{program.availableBalance} Birr</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Withdrawn</p>
                      <p className="text-lg font-semibold text-gray-900">{program.totalWithdrawn} Birr</p>
                    </div>
                  </div>

                  {/* Payment Method - Always Visible */}
                  <div className={`rounded-lg p-4 mb-4 border-2 ${
                    program.paymentMethod?.type
                      ? 'bg-blue-50 border-blue-200' 
                      : 'bg-yellow-50 border-yellow-300'
                  }`}>
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-sm font-bold text-gray-900">💳 Payment Method</p>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        program.paymentMethod?.type
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {program.paymentMethod?.type ? 'Set' : 'Not Set'}
                      </span>
                    </div>
                    {program.paymentMethod && program.paymentMethod.type ? (
                      <div className="space-y-1">
                        <p className="text-sm text-gray-900">
                          <span className="font-semibold">Type:</span>{' '}
                          <span className="capitalize">{program.paymentMethod.type.replace('_', ' ')}</span>
                        </p>
                        <p className="text-sm text-gray-900">
                          <span className="font-semibold">Details:</span>{' '}
                          <span className="font-mono bg-white px-2 py-1 rounded">
                            {program.paymentMethod.details || 'Not provided'}
                          </span>
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-yellow-800">
                        ⚠️ User has not set up payment method yet. Cannot process withdrawals.
                      </p>
                    )}
                  </div>

                  {/* Flagged Reasons */}
                  {program.suspiciousActivity?.flagged && (
                    <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
                      <p className="text-xs font-semibold text-red-900 mb-2">Fraud Detection Reasons:</p>
                      <ul className="text-xs text-red-800 space-y-1">
                        {program.suspiciousActivity.reasons.map((reason, i) => (
                          <li key={i}>• {reason}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Expandable Details */}
                  <div className="space-y-3">
                    <button
                      onClick={() => setSelectedReferral(selectedReferral === program._id ? null : program._id)}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      {selectedReferral === program._id ? 'Hide Details' : 'Show Details'}
                    </button>

                    {selectedReferral === program._id && (
                      <div className="space-y-4 pt-3 border-t">
                        {/* Referred Users */}
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900 mb-2">
                            Referred Users ({program.referredUsers?.length || 0})
                          </h4>
                          <div className="space-y-2 max-h-60 overflow-y-auto">
                            {program.referredUsers?.map((ref, i) => (
                              <div key={i} className="bg-gray-50 rounded p-3 text-xs">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <p className="font-medium text-gray-900">{ref.userId?.name || 'User deleted'}</p>
                                    <p className="text-gray-600">{ref.userId?.email}</p>
                                    <p className="text-gray-500 mt-1">
                                      Registered: {new Date(ref.registeredAt).toLocaleDateString()}
                                    </p>
                                  </div>
                                  <span className={`px-2 py-1 rounded text-xs ${ref.withdrawn ? 'bg-gray-200 text-gray-700' : 'bg-green-100 text-green-700'}`}>
                                    {ref.withdrawn ? 'Withdrawn' : 'Available'}
                                  </span>
                                </div>
                                {ref.ipAddress && (
                                  <p className="text-gray-500 mt-2">IP: {ref.ipAddress}</p>
                                )}
                              </div>
                            ))}
                            {program.referredUsers?.length === 0 && (
                              <p className="text-gray-500 text-center py-4">No referrals yet</p>
                            )}
                          </div>
                        </div>

                        {/* Withdrawal History */}
                        {program.withdrawalRequests?.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-gray-900 mb-2">
                              Withdrawal History ({program.withdrawalRequests.length})
                            </h4>
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                              {program.withdrawalRequests.map((wd) => (
                                <div key={wd._id} className="bg-gray-50 rounded p-3 text-xs">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <p className="font-medium text-gray-900">{wd.amount} Birr</p>
                                      <p className="text-gray-600">
                                        Requested: {new Date(wd.requestedAt).toLocaleDateString()}
                                      </p>
                                      {wd.rejectionReason && (
                                        <p className="text-red-600 mt-1">Reason: {wd.rejectionReason}</p>
                                      )}
                                    </div>
                                    <span className={`px-2 py-1 rounded text-xs ${
                                      wd.status === 'paid' ? 'bg-green-100 text-green-700' :
                                      wd.status === 'approved' ? 'bg-blue-100 text-blue-700' :
                                      wd.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                      'bg-yellow-100 text-yellow-700'
                                    }`}>
                                      {wd.status}
                                    </span>
                                  </div>
                                  {wd.status === 'pending' && (
                                    <div className="flex gap-2 mt-3">
                                      <button
                                        onClick={() => processWithdrawalMutation.mutate({
                                          referralId: program._id,
                                          withdrawalId: wd._id,
                                          status: 'approved'
                                        })}
                                        className="btn btn-primary btn-sm text-xs flex-1"
                                      >
                                        Approve
                                      </button>
                                      <button
                                        onClick={() => {
                                          const reason = prompt('Rejection reason:');
                                          if (reason) {
                                            processWithdrawalMutation.mutate({
                                              referralId: program._id,
                                              withdrawalId: wd._id,
                                              status: 'rejected',
                                              rejectionReason: reason
                                            });
                                          }
                                        }}
                                        className="btn btn-danger btn-sm text-xs flex-1"
                                      >
                                        Reject
                                      </button>
                                    </div>
                                  )}
                                  {wd.status === 'approved' && (
                                    <button
                                      onClick={() => processWithdrawalMutation.mutate({
                                        referralId: program._id,
                                        withdrawalId: wd._id,
                                        status: 'paid'
                                      })}
                                      className="btn btn-primary btn-sm text-xs mt-3 w-full"
                                    >
                                      Mark as Paid
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Admin Actions */}
                  <div className="flex gap-2 mt-4 pt-4 border-t">
                    {program.suspiciousActivity?.flagged ? (
                      <button
                        onClick={() => toggleFlagMutation.mutate({
                          referralId: program._id,
                          flagged: false,
                          reasons: []
                        })}
                        className="btn btn-secondary btn-sm text-xs flex-1"
                      >
                        Unflag Account
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          const reason = prompt('Reason for flagging:');
                          if (reason) {
                            toggleFlagMutation.mutate({
                              referralId: program._id,
                              flagged: true,
                              reasons: [reason]
                            });
                          }
                        }}
                        className="btn btn-danger btn-sm text-xs flex-1"
                      >
                        Flag Account
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {referralPrograms?.programs?.length === 0 && (
                <p className="text-center text-gray-500 py-8">No referral programs yet</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminPanel;

