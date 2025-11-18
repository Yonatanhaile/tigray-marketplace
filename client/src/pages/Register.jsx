import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';
import { getAdvancedDeviceInfo } from '../utils/advancedFingerprint';

const Register = () => {
  const navigate = useNavigate();
  const { register: registerUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const referralCodeFromUrl = searchParams.get('ref');

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm();

  // Pre-fill referral code if it comes from URL
  useEffect(() => {
    if (referralCodeFromUrl) {
      setValue('referralCode', referralCodeFromUrl);
      toast.success(`🎉 Referral code applied: ${referralCodeFromUrl}`, {
        duration: 4000,
      });
    }
  }, [referralCodeFromUrl, setValue]);

  const password = watch('password');

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

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const { confirmPassword, ...registerData } = data;
      
      // Normalize phone number to international format
      registerData.phone = normalizePhoneNumber(registerData.phone);
      
      // Add referral code if present (from form input)
      if (registerData.referralCode && registerData.referralCode.trim()) {
        registerData.referralCode = registerData.referralCode.trim().toUpperCase();
      } else {
        delete registerData.referralCode;
      }
      
      // Collect ADVANCED device fingerprint for fraud detection (20+ methods)
      // CRITICAL: Fingerprint is REQUIRED for registration (fraud prevention)
      try {
        console.log('🔍 Collecting advanced device fingerprint...');
        const deviceInfo = await getAdvancedDeviceInfo();
        
        if (!deviceInfo || !deviceInfo.fingerprint || deviceInfo.fingerprint === 'unknown') {
          throw new Error('Device fingerprint collection failed');
        }
        
        registerData.deviceFingerprint = deviceInfo.fingerprint;
        registerData.deviceInfo = deviceInfo;
        
        console.log('✅ Advanced device fingerprint collected successfully');
        console.log('   Fingerprint:', deviceInfo.fingerprint);
        console.log('   Methods: Canvas, WebGL, Audio, WebRTC, Fonts, Battery, Media, etc.');
      } catch (fpError) {
        console.error('❌ Failed to collect device fingerprint:', fpError);
        setLoading(false);
        toast.error('Device verification failed. Please disable any privacy extensions or ad blockers that might be blocking device fingerprinting, then try again.');
        return; // STOP registration if fingerprinting fails
      }
      
      // All users are both buyers and sellers by default
      await registerUser(registerData);
      navigate('/');
    } catch (error) {
      console.error('Registration error:', error);
      
      // Handle specific error codes
      if (error.code === 'VPN_DETECTED') {
        toast.error('Registration blocked: VPN or proxy detected. Please disable VPN and try again with your real Ethiopian IP address.');
      } else if (error.code === 'NON_ETHIOPIAN_IP') {
        toast.error('Registration is only available from Ethiopia. Your location has been detected as outside Ethiopia.');
      } else if (error.code === 'DEVICE_LIMIT_EXCEEDED') {
        toast.error('This device has already been used to register an account. Only one account per device is allowed.');
      } else if (error.code === 'IP_LIMIT_EXCEEDED') {
        toast.error('Maximum number of accounts from this network reached. Only 2 accounts per network are allowed.');
      } else if (error.code === 'FINGERPRINT_REQUIRED') {
        toast.error('Device verification required. Please disable privacy extensions and try again.');
      } else {
        toast.error(error.message || 'Registration failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        <div className="card">
          <h2 className="text-3xl font-bold text-center mb-6">Create Account</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                {...register('name', {
                  required: 'Name is required',
                  minLength: { value: 2, message: 'Name must be at least 2 characters' },
                })}
                className="input"
                placeholder="John Doe"
              />
              {errors.name && (
                <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                {...register('email', {
                  required: 'Email is required',
                  pattern: {
                    value: /^\S+@\S+\.\S+$/,
                    message: 'Invalid email address',
                  },
                })}
                className="input"
                placeholder="you@example.com"
              />
              {errors.email && (
                <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                {...register('phone', {
                  required: 'Phone is required',
                  pattern: {
                    value: /^(\+251|0)?[9]\d{8}$/,
                    message: 'Invalid Ethiopian phone number (e.g., 0912345678 or +251912345678)',
                  },
                  minLength: {
                    value: 10,
                    message: 'Phone number must be at least 10 digits',
                  },
                })}
                className="input"
                placeholder="0912345678 or +251912345678"
              />
              {errors.phone && (
                <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                You can use Ethiopian format (0912345678) or international format (+251912345678)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                {...register('password', {
                  required: 'Password is required',
                  minLength: { value: 8, message: 'Password must be at least 8 characters' },
                })}
                className="input"
                placeholder="••••••••"
              />
              {errors.password && (
                <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password
              </label>
              <input
                type="password"
                {...register('confirmPassword', {
                  required: 'Please confirm your password',
                  validate: (value) => value === password || 'Passwords do not match',
                })}
                className="input"
                placeholder="••••••••"
              />
              {errors.confirmPassword && (
                <p className="text-red-500 text-sm mt-1">{errors.confirmPassword.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Referral Code (Optional)
              </label>
              <input
                type="text"
                {...register('referralCode', {
                  pattern: {
                    value: /^[A-Z0-9]{8}$/i,
                    message: 'Invalid referral code format (should be 8 characters)',
                  },
                })}
                className="input uppercase"
                placeholder="Enter referral code"
                maxLength={8}
                style={{ textTransform: 'uppercase' }}
              />
              {errors.referralCode && (
                <p className="text-red-500 text-sm mt-1">{errors.referralCode.message}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                💡 Have a referral code? Enter it here to help your friend earn rewards!
              </p>
            </div>

            <div className="bg-yellow-50 p-3 rounded text-xs text-gray-700">
              <strong>Terms of Service:</strong> The platform does not handle payments. 
              Any transaction is between buyer and seller. We are not liable for off-site payment disputes.
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn btn-primary disabled:opacity-50"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="text-primary-600 hover:text-primary-700 font-semibold">
                Login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;

