import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const InstallPrompt = () => {
  const { t } = useTranslation();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [browserType, setBrowserType] = useState('');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if already installed (standalone mode)
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true ||
      document.referrer.includes('android-app://');
    
    setIsStandalone(isInStandaloneMode);

    // Detect if device is mobile (phone or tablet)
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) || // iPadOS
      window.matchMedia('(max-width: 1024px)').matches; // Also check screen size
    
    setIsMobile(isMobileDevice);

    // Detect iOS (including iPadOS)
    const isIOSDevice = /iPad|iPhone|iPod/.test(userAgent) || 
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); // iPadOS detection
    
    setIsIOS(isIOSDevice);

    // Detect browser type
    const isSafari = /Safari/.test(userAgent) && !/Chrome|CriOS|FxiOS/.test(userAgent);
    const isChrome = /Chrome|CriOS/.test(userAgent);
    setBrowserType(isSafari ? 'safari' : isChrome ? 'chrome' : 'other');

    // Check if user has dismissed the prompt before
    const dismissed = localStorage.getItem('installPromptDismissed');
    const dismissedTime = localStorage.getItem('installPromptDismissedTime');
    
    // Show again after 7 days
    const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
    const shouldShowAgain = !dismissedTime || (Date.now() - parseInt(dismissedTime)) > sevenDaysInMs;

    // Only show on mobile devices, not on desktop computers
    if (isMobileDevice && !isInStandaloneMode && (!dismissed || shouldShowAgain)) {
      // For iOS, always show instructions (regardless of browser)
      if (isIOSDevice) {
        setTimeout(() => setShowInstallPrompt(true), 2000); // Show after 2 seconds
      }
    }

    // For Android - listen for beforeinstallprompt event (only on mobile)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (isMobileDevice && shouldShowAgain && !isIOSDevice) {
        setTimeout(() => setShowInstallPrompt(true), 2000); // Show after 2 seconds
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt && !isIOS) {
      return;
    }

    if (deferredPrompt) {
      // Show the install prompt for Android/Desktop
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
      }
      
      setDeferredPrompt(null);
      setShowInstallPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
    localStorage.setItem('installPromptDismissed', 'true');
    localStorage.setItem('installPromptDismissedTime', Date.now().toString());
  };

  // Don't show if already installed
  if (isStandalone) {
    return null;
  }

  // Don't show on desktop computers - only on mobile devices
  if (!isMobile) {
    return null;
  }

  if (!showInstallPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-2xl animate-slideUp">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
        <div className="flex items-start justify-between gap-2 sm:gap-3">
          <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
            <div className="flex-shrink-0 mt-0.5 sm:mt-1">
              <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm sm:text-base md:text-lg font-bold mb-1">
                {isIOS ? '📱 Add YohaTrade to Home Screen' : '📲 Install YohaTrade'}
              </h3>
              <p className="text-xs sm:text-sm text-purple-100 mb-2">
                {isIOS 
                  ? browserType !== 'safari'
                    ? 'Get quick access to YohaTrade from your home screen!'
                    : 'Tap the Share button at the bottom, then select "Add to Home Screen"'
                  : 'Install our app for instant access and a better experience!'
                }
              </p>
              
              {isIOS ? (
                browserType !== 'safari' ? (
                  <div className="bg-white/95 text-purple-900 px-3 py-2.5 rounded-lg text-xs sm:text-sm space-y-2">
                    <div className="flex items-start gap-2">
                      <span className="text-base sm:text-lg">ℹ️</span>
                      <div>
                        <p className="font-bold mb-1">Apple requires Safari for installation</p>
                        <p className="text-purple-700">To add YohaTrade to your home screen:</p>
                      </div>
                    </div>
                    <ol className="space-y-1 ml-6 text-purple-800">
                      <li className="flex items-start gap-2">
                        <span className="font-bold">1.</span>
                        <span>Copy this URL or tap the share icon in your browser</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-bold">2.</span>
                        <span>Select "Open in Safari"</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-bold">3.</span>
                        <span>In Safari, tap Share → "Add to Home Screen"</span>
                      </li>
                    </ol>
                  </div>
                ) : null
              ) : (
                deferredPrompt && (
                  <button
                    onClick={handleInstallClick}
                    className="bg-white text-purple-600 px-4 sm:px-6 py-2 rounded-lg font-bold hover:bg-purple-50 transition-all transform hover:scale-105 shadow-lg text-xs sm:text-sm md:text-base w-full sm:w-auto"
                  >
                    ⬇️ Install Now
                  </button>
                )
              )}
            </div>
          </div>
          
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 text-white hover:text-purple-200 transition-colors p-1"
            aria-label="Close"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default InstallPrompt;

