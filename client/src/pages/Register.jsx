import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';
import { getAdvancedDeviceInfo } from '../utils/advancedFingerprint';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const Register = () => {
  const navigate = useNavigate();
  const { register: registerUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const referralCodeFromUrl = searchParams.get('ref');
  const [step, setStep] = useState(1); // 1: Enter details, 2: Verify OTP
  const [email, setEmail] = useState('');
  const [registrationData, setRegistrationData] = useState(null);
  const [otpCode, setOtpCode] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

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

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const password = watch('password');

  // Normalize phone number to international format
  const normalizePhoneNumber = (phone) => {
    let normalized = phone.replace(/[\s-]/g, '');
    
    if (normalized.startsWith('0')) {
      normalized = '+251' + normalized.substring(1);
    }
    
    if (!normalized.startsWith('+')) {
      normalized = '+251' + normalized;
    }
    
    return normalized;
  };

  // Google OAuth handler
  const handleGoogleSignup = () => {
    window.location.href = `${API_URL}/api/oauth/google`;
  };

  // Step 1: Send OTP to email
  const onSubmitStep1 = async (data) => {
    setLoading(true);
    try {
      const { confirmPassword, ...regData } = data;
      
      // Normalize phone number
      regData.phone = normalizePhoneNumber(regData.phone);
      
      // Collect device fingerprint
      try {
        console.log('🔍 Collecting advanced device fingerprint...');
        const deviceInfo = await getAdvancedDeviceInfo();
        
        if (!deviceInfo || !deviceInfo.fingerprint || deviceInfo.fingerprint === 'unknown') {
          throw new Error('Device fingerprint collection failed');
        }
        
        regData.deviceFingerprint = deviceInfo.fingerprint;
        regData.deviceInfo = deviceInfo;
        
        console.log('✅ Device fingerprint collected successfully');
      } catch (fpError) {
        console.error('❌ Failed to collect device fingerprint:', fpError);
        setLoading(false);
        toast.error('Device verification failed. Please disable any privacy extensions or ad blockers.');
        return;
      }

      // Send OTP to email
      const response = await fetch(`${API_URL}/api/auth/email-otp/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: regData.email }),
      });

      const result = await response.json();

      if (result.error) {
        throw new Error(result.message);
      }

      // Store registration data for step 2
      setEmail(regData.email);
      setRegistrationData(regData);
      setStep(2);
      setResendCooldown(60);

      toast.success(`Verification code sent to ${regData.email}!`);
      
      // Show OTP in dev mode
      if (result.otp) {
        toast.success(`DEV MODE - OTP: ${result.otp}`, { duration: 10000 });
      }
    } catch (error) {
      console.error('Send OTP error:', error);
      toast.error(error.message || 'Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP and complete registration
  const onSubmitStep2 = async (e) => {
    e.preventDefault();
    
    if (!otpCode || otpCode.length !== 6) {
      toast.error('Please enter a valid 6-digit code');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/email-otp/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          otp: otpCode,
          ...registrationData,
        }),
      });

      const result = await response.json();

      if (result.error) {
        if (result.attemptsRemaining !== undefined) {
          toast.error(`${result.message} (${result.attemptsRemaining} attempts remaining)`);
        } else {
          toast.error(result.message);
        }
        return;
      }

      // Save token and user data
      localStorage.setItem('token', result.token);
      localStorage.setItem('user', JSON.stringify(result.user));

      toast.success('Registration successful! Welcome to Tigray Market!');
      navigate('/');
      window.location.reload();
    } catch (error) {
      console.error('Verification error:', error);
      
      // Handle specific error codes
      if (error.code === 'VPN_DETECTED') {
        toast.error('Registration blocked: VPN or proxy detected.');
      } else if (error.code === 'NON_ETHIOPIAN_IP') {
        toast.error('Registration is only available from Ethiopia.');
      } else if (error.code === 'DEVICE_LIMIT_EXCEEDED') {
        toast.error('This device has already been used to register an account.');
      } else if (error.code === 'IP_LIMIT_EXCEEDED') {
        toast.error('Maximum number of accounts from this network reached.');
      } else {
        toast.error(error.message || 'Verification failed');
      }
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOTP = async () => {
    if (resendCooldown > 0) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/email-otp/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();

      if (result.error) {
        throw new Error(result.message);
      }

      toast.success('Verification code resent!');
      setResendCooldown(60);
      
      // Show OTP in dev mode
      if (result.otp) {
        toast.success(`DEV MODE - OTP: ${result.otp}`, { duration: 10000 });
      }
    } catch (error) {
      toast.error(error.message || 'Failed to resend code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        <div className="card">
          <h2 className="text-3xl font-bold text-center mb-6">Create Account</h2>

          {step === 1 ? (
            <>
              {/* Google OAuth Button */}
              <button
                onClick={handleGoogleSignup}
                type="button"
                className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors mb-4"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span className="font-medium text-gray-700">Continue with Google</span>
              </button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Or sign up with email</span>
                </div>
              </div>

              <form onSubmit={handleSubmit(onSubmitStep1)} className="space-y-4">
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
                  <p className="text-xs text-gray-500 mt-1">
                    ✅ We'll send a verification code to this email
                  </p>
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
                        message: 'Invalid Ethiopian phone number',
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
                        message: 'Invalid referral code format',
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
                </div>

                <div className="bg-yellow-50 p-3 rounded text-xs text-gray-700">
                  <strong>Terms:</strong> The platform does not handle payments. 
                  Any transaction is between buyer and seller.
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full btn btn-primary disabled:opacity-50"
                >
                  {loading ? 'Sending verification code...' : 'Continue'}
                </button>
              </form>
            </>
          ) : (
            <>
              {/* Step 2: OTP Verification */}
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
                  <svg
                    className="w-8 h-8 text-primary-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-2">Verify Your Email</h3>
                <p className="text-gray-600">
                  We've sent a 6-digit code to <br />
                  <strong>{email}</strong>
                </p>
              </div>

              <form onSubmit={onSubmitStep2} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Verification Code
                  </label>
                  <input
                    type="text"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="input text-center text-2xl font-bold tracking-widest"
                    placeholder="000000"
                    maxLength={6}
                    autoFocus
                  />
                  <p className="text-xs text-gray-500 mt-1 text-center">
                    Enter the 6-digit code from your email
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading || otpCode.length !== 6}
                  className="w-full btn btn-primary disabled:opacity-50"
                >
                  {loading ? 'Verifying...' : 'Verify & Create Account'}
                </button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={handleResendOTP}
                    disabled={resendCooldown > 0 || loading}
                    className="text-sm text-primary-600 hover:text-primary-700 disabled:text-gray-400 disabled:cursor-not-allowed"
                  >
                    {resendCooldown > 0
                      ? `Resend code in ${resendCooldown}s`
                      : 'Resend verification code'}
                  </button>
                </div>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setStep(1);
                      setOtpCode('');
                    }}
                    className="text-sm text-gray-600 hover:text-gray-800"
                  >
                    ← Back to registration
                  </button>
                </div>
              </form>
            </>
          )}

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
