import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { uploadImage } from '../services/upload';
import toast from 'react-hot-toast';
import axios from 'axios';
import BackButton from '../components/BackButton';

const Profile = () => {
  const { user, updateUser } = useAuth();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [profileImage, setProfileImage] = useState(user?.profileImage || null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Sync profileImage state when user changes
  useEffect(() => {
    if (user?.profileImage) {
      setProfileImage(user.profileImage);
    }
  }, [user?.profileImage]);

  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    defaultValues: {
      name: user?.name || '',
      phone: user?.phone || '',
    }
  });

  // Normalize phone number to international format
  const normalizePhoneNumber = (phone) => {
    // Remove all spaces and dashes
    let normalized = phone.replace(/[\s-]/g, '');
    
    // If starts with 0, convert to +251 (Ethiopian format)
    if (normalized.startsWith('0')) {
      normalized = '+251' + normalized.substring(1);
    }
    
    // If doesn't start with +, add +251
    if (!normalized.startsWith('+')) {
      normalized = '+251' + normalized;
    }
    
    return normalized;
  };

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
      toast.success('✅ Profile updated successfully!', { duration: 3000 });
      
      // Update user in auth context and localStorage
      const updatedUser = { ...user, ...data.user };
      updateUser(updatedUser);
      
      // Update local state
      setProfileImage(data.user.profileImage || null);
      
      // Invalidate all queries that might display user profile
      queryClient.invalidateQueries(['user']);
      queryClient.invalidateQueries(['messages']);
      queryClient.invalidateQueries(['orders']);
      queryClient.invalidateQueries(['listings']);
      
      setIsEditing(false);
    },
    onError: (error) => {
      toast.error(`❌ ${error.response?.data?.message || 'Failed to update profile'}`, { duration: 4000 });
    }
  });

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    console.log('📸 Starting image upload:', file.name, file.type, file.size);
    setUploadingImage(true);
    
    try {
      // Upload to Cloudinary
      console.log('⬆️ Uploading to Cloudinary...');
      const uploadedImage = await uploadImage(file);
      console.log('✅ Cloudinary upload success:', uploadedImage);
      
      setProfileImage(uploadedImage);
      
      // Automatically save the profile image to backend
      const token = localStorage.getItem('token');
      console.log('💾 Saving to database...', { profileImage: uploadedImage });
      
      const response = await axios.patch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/profile`,
        { profileImage: uploadedImage },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      console.log('✅ Database save success:', response.data);
      
      // Update user in auth context
      const updatedUser = { ...user, ...response.data.user };
      updateUser(updatedUser);
      
      // Invalidate all queries that might display user profile
      queryClient.invalidateQueries(['user']);
      queryClient.invalidateQueries(['messages']);
      queryClient.invalidateQueries(['orders']);
      queryClient.invalidateQueries(['listings']);
      
      toast.success('✅ Profile picture updated successfully!', { duration: 3000 });
      
      // Reset file input
      e.target.value = '';
    } catch (error) {
      console.error('❌ Profile image upload error:', error);
      console.error('Error details:', error.response?.data || error.message);
      
      const errorMsg = error.response?.data?.message || error.message || 'Failed to upload image';
      toast.error(`❌ ${errorMsg}`, { duration: 4000 });
      
      // Reset to previous image on error
      setProfileImage(user?.profileImage || null);
      
      // Reset file input
      e.target.value = '';
    } finally {
      setUploadingImage(false);
    }
  };

  const onSubmit = (data) => {
    // Normalize phone number to international format
    const normalizedData = {
      ...data,
      phone: normalizePhoneNumber(data.phone),
    };
    // Profile image is saved automatically on upload, so we don't need to include it here
    updateMutation.mutate(normalizedData);
  };

  const handleCancel = () => {
    reset({
      name: user?.name || '',
      phone: user?.phone || '',
    });
    setProfileImage(user?.profileImage || null);
    setIsEditing(false);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-4">
        <BackButton />
      </div>
      <h1 className="text-3xl font-bold mb-6">My Profile</h1>

      <div className="card">
        {/* Profile Header */}
        <div className="flex items-start gap-6 mb-6 pb-6 border-b border-gray-200">
          {/* Profile Image */}
          <div className="relative flex-shrink-0 group">
            {profileImage?.url ? (
              <img 
                src={profileImage.url} 
                alt={user?.name} 
                className="w-24 h-24 rounded-full object-cover border-4 border-[color:var(--color-primary-soft)]"
              />
            ) : (
              <div className="w-24 h-24 bg-[color:var(--color-primary-soft)] rounded-full flex items-center justify-center text-3xl font-bold text-[color:var(--color-primary)] border-4 border-[color:var(--color-primary)]">
                {user?.name?.charAt(0)?.toUpperCase()}
              </div>
            )}
            
            {/* Upload Button - Always visible on hover */}
            <label 
              htmlFor="profile-image-upload" 
              className="absolute bottom-0 right-0 bg-white border-2 border-[color:var(--color-primary)] text-[color:var(--color-primary)] rounded-full p-2 cursor-pointer hover:bg-[color:var(--color-primary-soft)] transition-all shadow-lg hover:scale-110"
              title="Click to change profile picture"
            >
              {uploadingImage ? (
                <div className="w-5 h-5 border-2 border-[color:var(--color-primary)] border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
              <input
                id="profile-image-upload"
                type="file"
                accept="image/*,.heic,.heif"
                onChange={handleImageUpload}
                className="hidden"
                disabled={uploadingImage}
              />
            </label>
            
            {/* Helper text */}
            {!isEditing && (
              <p className="absolute -bottom-6 left-0 text-xs text-gray-500 whitespace-nowrap">
                Click camera to change
              </p>
            )}
          </div>

          {/* Profile Info */}
          <div className="flex-1">
            <h2 className="text-2xl font-bold">{user?.name}</h2>
            <p className="text-gray-600">{user?.email}</p>
            {user?.roles && (
              <div className="flex gap-2 mt-2">
                {user.roles.map((role) => (
                  <span key={role} className="text-xs bg-[color:var(--color-primary-soft)] text-[color:var(--color-primary)] px-2 py-1 rounded-full">
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
                    required: 'Phone is required',
                    pattern: {
                      value: /^(\+251|0)?[9]\d{8}$/,
                      message: 'Invalid Ethiopian phone number (e.g., 0912345678 or +251912345678)',
                    },
                  })} 
                  className="input" 
                  placeholder="0912345678 or +251912345678"
                />
                {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>}
                <p className="text-xs text-gray-500 mt-1">
                  You can use Ethiopian format (0912345678) or international format (+251912345678)
                </p>
              </>
            ) : (
              <p className="text-gray-800 py-2">{user?.phone || 'Not provided'}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Account Type</label>
            <div className="flex gap-2">
              {user?.roles?.includes('buyer') && (
                <span className="inline-flex items-center px-3 py-1.5 bg-[color:var(--color-primary-soft)] text-[color:var(--color-primary)] rounded-lg text-sm font-semibold">
                  Buyer
                </span>
              )}
              {user?.roles?.includes('seller') && (
                <span className="inline-flex items-center px-3 py-1.5 bg-green-100 text-green-800 rounded-lg text-sm font-semibold">
                  Seller
                </span>
              )}
              {user?.roles?.includes('admin') && (
                <span className="inline-flex items-center px-3 py-1.5 bg-[color:var(--color-accent)]/20 text-[color:var(--color-accent)] rounded-lg text-sm font-semibold">
                  Admin
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

