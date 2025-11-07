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
    // Check if app was already installed
    const appInstalled = localStorage.getItem('appInstalled');
    if (appInstalled === 'true') {
      setIsStandalone(true);
      return;
    }

    // Comprehensive check if already in standalone mode
    const checkStandalone = () => {
      return (
        window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true ||
        document.referrer.includes('android-app://') ||
        window.matchMedia('(display-mode: fullscreen)').matches ||
        window.matchMedia('(display-mode: minimal-ui)').matches
      );
    };
    
    const isInStandaloneMode = checkStandalone();
    setIsStandalone(isInStandaloneMode);
    
    // If in standalone mode, save to localStorage
    if (isInStandaloneMode) {
      localStorage.setItem('appInstalled', 'true');
      return;
    }

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
        setTimeout(() => setShowInstallPrompt(true), 3000); // Show after 3 seconds
      }
    }

    // For Android - listen for beforeinstallprompt event (only on mobile)
    const handleBeforeInstallPrompt = (e) => {
      console.log('📱 beforeinstallprompt event fired');
      e.preventDefault();
      setDeferredPrompt(e);
      if (isMobileDevice && shouldShowAgain && !isIOSDevice) {
        setTimeout(() => setShowInstallPrompt(true), 3000); // Show after 3 seconds
      }
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      console.log('✅ App successfully installed');
      localStorage.setItem('appInstalled', 'true');
      setIsStandalone(true);
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
    };

    // Monitor display mode changes
    const displayModeQuery = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = (e) => {
      if (e.matches) {
        console.log('✅ App is now in standalone mode');
        localStorage.setItem('appInstalled', 'true');
        setIsStandalone(true);
        setShowInstallPrompt(false);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    displayModeQuery.addEventListener('change', handleDisplayModeChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      displayModeQuery.removeEventListener('change', handleDisplayModeChange);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt && !isIOS) {
      console.log('❌ No deferred prompt available');
      return;
    }

    if (deferredPrompt) {
      try {
        console.log('📱 Showing install prompt...');
        // Show the install prompt for Android/Desktop
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        
        console.log(`📊 Install prompt outcome: ${outcome}`);
        
        if (outcome === 'accepted') {
          console.log('✅ User accepted the install prompt');
          localStorage.setItem('appInstalled', 'true');
        } else {
          console.log('❌ User dismissed the install prompt');
        }
        
        setDeferredPrompt(null);
        setShowInstallPrompt(false);
      } catch (error) {
        console.error('❌ Error during installation:', error);
      }
    }
  };

  const handleDismiss = () => {
    console.log('👋 User dismissed install prompt');
    setShowInstallPrompt(false);
    localStorage.setItem('installPromptDismissed', 'true');
    localStorage.setItem('installPromptDismissedTime', Date.now().toString());
  };

  // Debug function - can be called from console: window.resetPWAPrompt()
  useEffect(() => {
    window.resetPWAPrompt = () => {
      localStorage.removeItem('installPromptDismissed');
      localStorage.removeItem('installPromptDismissedTime');
      localStorage.removeItem('appInstalled');
      console.log('🔄 PWA prompt reset - refresh the page to see the prompt again');
    };

    window.checkPWAStatus = () => {
      console.log('📱 PWA Installation Status:');
      console.log('  - Is Standalone:', isStandalone);
      console.log('  - Is Mobile:', isMobile);
      console.log('  - Is iOS:', isIOS);
      console.log('  - Browser Type:', browserType);
      console.log('  - Has Deferred Prompt:', !!deferredPrompt);
      console.log('  - Show Install Prompt:', showInstallPrompt);
      console.log('  - App Installed (localStorage):', localStorage.getItem('appInstalled'));
      console.log('  - Prompt Dismissed:', localStorage.getItem('installPromptDismissed'));
      console.log('  - Display Mode:', window.matchMedia('(display-mode: standalone)').matches ? 'standalone' : 'browser');
    };

    return () => {
      delete window.resetPWAPrompt;
      delete window.checkPWAStatus;
    };
  }, [isStandalone, isMobile, isIOS, browserType, deferredPrompt, showInstallPrompt]);

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
                  ? browserType === 'safari'
                    ? 'Get the app experience with offline access and notifications!'
                    : 'Get quick access to YohaTrade from your home screen!'
                  : 'Install our app for instant access and a better experience!'
                }
              </p>
              
              {isIOS ? (
                browserType === 'safari' ? (
                  <div className="bg-white/95 text-purple-900 px-3 py-2.5 rounded-lg text-xs sm:text-sm space-y-2">
                    <div className="flex items-start gap-2">
                      <span className="text-2xl">⬇️</span>
                      <div>
                        <p className="font-bold mb-1">How to install:</p>
                      </div>
                    </div>
                    <ol className="space-y-2 text-purple-800">
                      <li className="flex items-start gap-2">
                        <span className="font-bold">1.</span>
                        <span>Tap the <strong>Share button</strong> 
                          <svg className="inline w-4 h-4 mx-1" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M16 5l-1.42 1.42-1.59-1.59V16h-1.98V4.83L9.42 6.42 8 5l4-4 4 4zm4 5v11c0 1.1-.9 2-2 2H6c-1.11 0-2-.9-2-2V10c0-1.11.89-2 2-2h3v2H6v11h12V10h-3V8h3c1.1 0 2 .89 2 2z"/>
                          </svg>
                          at the <strong>bottom of the screen</strong></span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-bold">2.</span>
                        <span>Scroll down and tap <strong>"Add to Home Screen"</strong>
                          <svg className="inline w-4 h-4 mx-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-bold">3.</span>
                        <span>Tap <strong>"Add"</strong> in the top right corner</span>
                      </li>
                    </ol>
                  </div>
                ) : (
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
                        <span>Follow the instructions that will appear</span>
                      </li>
                    </ol>
                  </div>
                )
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

