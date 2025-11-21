import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';

const UpdateNotification = () => {
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const currentVersion = useRef(null);
  const hasShownToast = useRef(false);

  // Get current version from build-time variable
  const getCurrentBuildVersion = () => {
    return typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : Date.now().toString();
  };

  // Hard refresh function that bypasses all caches
  const performHardRefresh = () => {
    console.log('🔄 Performing hard refresh to apply updates...');
    
    // Clear all caches
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => caches.delete(name));
      });
    }
    
    // Clear service worker cache and reload
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(registration => {
          registration.unregister();
        });
      }).finally(() => {
        // Force hard reload bypassing cache
        window.location.reload(true);
      });
    } else {
      // Force hard reload bypassing cache
      window.location.reload(true);
    }
  };

  // Check for new version by comparing version.json
  const checkForNewVersion = async () => {
    try {
      // Add cache-busting parameter to ensure fresh request
      const cacheBuster = Date.now();
      const response = await fetch(`/version.json?_=${cacheBuster}`, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      if (!response.ok) {
        console.log('Version check: version.json not found, skipping check');
        return;
      }

      const data = await response.json();
      const serverVersion = data.version;
      
      // Initialize current version on first check
      if (currentVersion.current === null) {
        currentVersion.current = serverVersion;
        console.log('📌 Initial version set:', serverVersion);
        return;
      }

      // Compare versions
      if (serverVersion !== currentVersion.current) {
        console.log('🔄 New version detected!');
        console.log('   Current:', currentVersion.current);
        console.log('   Server:', serverVersion);
        
        setUpdateAvailable(true);
        setShowUpdateBanner(true);
        
        // Show toast only once
        if (!hasShownToast.current) {
          hasShownToast.current = true;
          toast.success('New update detected! Refreshing in 3 seconds...', {
            duration: 3000,
            icon: '🔄',
          });
        }

        // Auto hard-refresh after 3 seconds
        setTimeout(() => {
          performHardRefresh();
        }, 3000);
      }
    } catch (error) {
      console.log('Version check failed:', error.message);
    }
  };

  useEffect(() => {
    // Check for updates every 30 seconds (frequent checks to catch updates quickly)
    const checkInterval = setInterval(checkForNewVersion, 30 * 1000);

    // Check when page becomes visible (user returns to tab)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('👀 Page visible, checking for updates...');
        checkForNewVersion();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Check when page gains focus
    const handleFocus = () => {
      console.log('🎯 Page focused, checking for updates...');
      checkForNewVersion();
    };
    window.addEventListener('focus', handleFocus);

    // Initial check after 2 seconds (give app time to load)
    const initialCheckTimeout = setTimeout(checkForNewVersion, 2000);

    // Listen for service worker updates (keep existing functionality)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'SW_UPDATED') {
          console.log('🔄 Service worker updated:', event.data.version);
          setUpdateAvailable(true);
          setShowUpdateBanner(true);
          
          if (!hasShownToast.current) {
            hasShownToast.current = true;
            toast.success('New update available! Refreshing...', {
              duration: 2000,
              icon: '🔄',
            });
          }

          setTimeout(performHardRefresh, 2000);
        }
      });
    }

    return () => {
      clearInterval(checkInterval);
      clearTimeout(initialCheckTimeout);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Handle manual refresh
  const handleRefresh = () => {
    performHardRefresh();
  };

  // Don't render anything - we're using toast notifications
  // But keep the banner as a fallback for users who dismiss the toast
  if (!showUpdateBanner) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-r from-[color:var(--color-primary)] to-[color:var(--color-primary-strong)] text-white p-4 shadow-lg animate-slideUp">
      <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
          <div>
            <p className="font-semibold">🔄 Update Available</p>
            <p className="text-sm text-white/80">A new version is ready. The page will refresh automatically.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            className="bg-white text-[color:var(--color-primary)] px-4 py-2 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
          >
            Refresh Now
          </button>
          <button
            onClick={() => setShowUpdateBanner(false)}
            className="text-white hover:text-white/80 px-3 py-2 rounded-lg transition-colors"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpdateNotification;

