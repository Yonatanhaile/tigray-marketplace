import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

const UpdateNotification = () => {
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    // Check if service worker is supported
    if (!('serviceWorker' in navigator)) {
      console.log('Service Worker not supported');
      return;
    }

    // Listen for service worker updates
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'SW_UPDATED') {
        console.log('🔄 New version available:', event.data.version);
        setUpdateAvailable(true);
        setShowUpdateBanner(true);
        
        // Show toast notification
        toast.success('New update available! The page will refresh automatically.', {
          duration: 3000,
          icon: '🔄',
        });

        // Auto-refresh after 3 seconds to apply updates
        setTimeout(() => {
          console.log('🔄 Auto-refreshing to apply updates...');
          window.location.reload();
        }, 3000);
      }
    });

    // Check for updates periodically (every 5 minutes)
    const checkForUpdates = () => {
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'CHECK_FOR_UPDATES'
        });
      }
    };

    const updateCheckInterval = setInterval(checkForUpdates, 5 * 60 * 1000);

    // Initial check
    checkForUpdates();

    return () => {
      clearInterval(updateCheckInterval);
    };
  }, []);

  // Handle manual refresh
  const handleRefresh = () => {
    window.location.reload();
  };

  // Don't render anything - we're using toast notifications
  // But keep the banner as a fallback for users who dismiss the toast
  if (!showUpdateBanner) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-4 shadow-lg animate-slideUp">
      <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
          <div>
            <p className="font-semibold">🔄 Update Available</p>
            <p className="text-sm text-purple-100">A new version is ready. The page will refresh automatically.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            className="bg-white text-purple-600 px-4 py-2 rounded-lg font-semibold hover:bg-purple-50 transition-colors"
          >
            Refresh Now
          </button>
          <button
            onClick={() => setShowUpdateBanner(false)}
            className="text-white hover:text-purple-100 px-3 py-2 rounded-lg transition-colors"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpdateNotification;

