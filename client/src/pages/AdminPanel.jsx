import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminAPI } from '../services/api';
import toast from 'react-hot-toast';

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

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Admin Panel</h1>

      {/* Tabs */}
      <div className="flex space-x-4 mb-6 border-b">
        {['stats', 'kyc', 'disputes'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium ${activeTab === tab ? 'border-b-2 border-primary-600 text-primary-600' : 'text-gray-600'}`}
          >
            {tab.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Stats Tab */}
      {activeTab === 'stats' && (
        <div className="grid md:grid-cols-4 gap-6">
          <div className="card">
            <h3 className="text-sm text-gray-500">Total Users</h3>
            <p className="text-3xl font-bold">{stats?.stats?.users?.total || 0}</p>
          </div>
          <div className="card">
            <h3 className="text-sm text-gray-500">Active Listings</h3>
            <p className="text-3xl font-bold">{stats?.stats?.listings?.active || 0}</p>
          </div>
          <div className="card">
            <h3 className="text-sm text-gray-500">Total Orders</h3>
            <p className="text-3xl font-bold">{stats?.stats?.orders?.total || 0}</p>
          </div>
          <div className="card">
            <h3 className="text-sm text-gray-500">Open Disputes</h3>
            <p className="text-3xl font-bold">{stats?.stats?.disputes?.open || 0}</p>
          </div>
        </div>
      )}

      {/* KYC Tab */}
      {activeTab === 'kyc' && (
        <div className="space-y-4">
          {users?.users?.map(user => (
            <div key={user._id} className="card flex justify-between items-center">
              <div>
                <h3 className="font-semibold">{user.name}</h3>
                <p className="text-sm text-gray-600">{user.email} · {user.phone}</p>
                <p className="text-xs text-gray-500">KYC Status: {user.kyc.status}</p>
              </div>
              <div className="space-x-2">
                <button onClick={() => kycMutation.mutate({ userId: user._id, status: 'approved' })} className="btn btn-primary btn-sm">Approve</button>
                <button onClick={() => kycMutation.mutate({ userId: user._id, status: 'rejected' })} className="btn btn-danger btn-sm">Reject</button>
              </div>
            </div>
          ))}
          {users?.users?.length === 0 && <p className="text-center text-gray-500">No pending KYC requests</p>}
        </div>
      )}

      {/* Disputes Tab */}
      {activeTab === 'disputes' && (
        <div className="space-y-4">
          {disputes?.disputes?.map(dispute => (
            <div key={dispute._id} className="card">
              <h3 className="font-semibold mb-2">Dispute #{dispute._id.slice(-6)}</h3>
              <p className="text-sm text-gray-600 mb-2">{dispute.reason}</p>
              <p className="text-xs text-gray-500 mb-3">Reporter: {dispute.reporterId?.name}</p>
              <div className="space-x-2">
                <button onClick={() => disputeMutation.mutate({ id: dispute._id, status: 'resolved' })} className="btn btn-primary btn-sm">Resolve</button>
                <button onClick={() => disputeMutation.mutate({ id: dispute._id, status: 'rejected' })} className="btn btn-secondary btn-sm">Reject</button>
              </div>
            </div>
          ))}
          {disputes?.disputes?.length === 0 && <p className="text-center text-gray-500">No open disputes</p>}
        </div>
      )}
    </div>
  );
};

export default AdminPanel;

