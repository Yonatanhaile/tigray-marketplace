import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';

const OAuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const handleCallback = () => {
      const token = searchParams.get('token');
      const error = searchParams.get('error');

      if (error) {
        toast.error('Authentication failed. Please try again.');
        navigate('/login');
        return;
      }

      if (token) {
        // Store token
        localStorage.setItem('token', token);
        
        // Fetch user profile
        fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/auth/profile`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.error) {
              throw new Error(data.message);
            }
            
            // Store user data
            localStorage.setItem('user', JSON.stringify(data.user));
            
            toast.success('Successfully logged in with Google!');
            
            // Redirect to home
            navigate('/');
            
            // Reload to update auth context
            window.location.reload();
          })
          .catch((error) => {
            console.error('Profile fetch error:', error);
            toast.error('Failed to fetch profile. Please try logging in again.');
            localStorage.removeItem('token');
            navigate('/login');
          });
      } else {
        toast.error('No authentication token received.');
        navigate('/login');
      }
    };

    handleCallback();
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary-600 mx-auto mb-4"></div>
        <p className="text-lg text-gray-600">Completing authentication...</p>
      </div>
    </div>
  );
};

export default OAuthCallback;

