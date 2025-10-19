import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tantml:parameter>
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';
import axios from 'axios';

const Profile = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    defaultValues: {
      name: user?.name || '',
      phone: user?.phone || '',
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      const token = localStorage.getItem('token');
      const response = await axios.patch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/profile`,
        data,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    },
    onSuccess: (data) => {
      toast.success('Profile updated successfully!');
      // Update user in localStorage
      const updatedUser = { ...user, ...data.user };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      queryClient.invalidateQueries(['user']);
      setIsEditing(false);
      window.location.reload(); // Refresh to update user context
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    }
  });

  const onSubmit = (data) => {
    updateMutation.mutate(data);
  };

  const handleCancel = () => {
    reset({
      name: user?.name || '',
      phone: user?.phone || '',
    });
    setIsEditing(false);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">My Profile</h1>

      <div className="card">
        {/* Profile Header */}
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-200">
          <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-full flex items-center justify-center text-3xl font-bold text-white">
            {user?.name?.charAt(0)?.toUpperCase()}
          </div>
          <div>
            <h2 className="text-2xl font-bold">{user?.name}</h2>
            <p className="text-gray-600">{user?.email}</p>
            {user?.roles && (
              <div className="flex gap-2 mt-2">
                {user.roles.map((role) => (
                  <span key={role} className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                    {role}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Profile Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Full Name</label>
            {isEditing ? (
              <>
                <input 
                  {...register('name', { 
                    required: 'Name is required',
                    minLength: { value: 2, message: 'Name must be at least 2 characters' }
                  })} 
                  className="input" 
                  placeholder="Enter your full name"
                />
                {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
              </>
            ) : (
              <p className="text-gray-800 py-2">{user?.name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <p className="text-gray-600 py-2">{user?.email}</p>
            <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Phone Number</label>
            {isEditing ? (
              <>
                <input 
                  {...register('phone', {
                    pattern: { 
                      value: /^[0-9]{10}$/, 
                      message: 'Enter a valid 10-digit phone number' 
                    }
                  })} 
                  className="input" 
                  placeholder="0912345678"
                  maxLength="10"
                />
                {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>}
              </>
            ) : (
              <p className="text-gray-800 py-2">{user?.phone || 'Not provided'}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Account Type</label>
            <div className="flex gap-2">
              {user?.roles?.includes('buyer') && (
                <span className="inline-flex items-center px-3 py-1.5 bg-blue-100 text-blue-800 rounded-lg text-sm">
                  🛒 Buyer
                </span>
              )}
              {user?.roles?.includes('seller') && (
                <span className="inline-flex items-center px-3 py-1.5 bg-green-100 text-green-800 rounded-lg text-sm">
                  🏪 Seller
                </span>
              )}
              {user?.roles?.includes('admin') && (
                <span className="inline-flex items-center px-3 py-1.5 bg-purple-100 text-purple-800 rounded-lg text-sm">
                  👑 Admin
                </span>
              )}
            </div>
          </div>

          {user?.kyc && (
            <div>
              <label className="block text-sm font-medium mb-2">KYC Status</label>
              <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm ${
                user.kyc.status === 'verified' ? 'bg-green-100 text-green-800' :
                user.kyc.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {user.kyc.status === 'verified' && '✓ '}
                {user.kyc.status.charAt(0).toUpperCase() + user.kyc.status.slice(1)}
              </span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-4 pt-4">
            {isEditing ? (
              <>
                <button 
                  type="button" 
                  onClick={handleCancel} 
                  className="btn btn-secondary"
                  disabled={updateMutation.isPending}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </>
            ) : (
              <button 
                type="button" 
                onClick={() => setIsEditing(true)} 
                className="btn btn-primary"
              >
                Edit Profile
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default Profile;

