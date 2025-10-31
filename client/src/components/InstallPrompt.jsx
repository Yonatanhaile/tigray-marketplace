import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const InstallPrompt = () => {
  const { t } = useTranslation();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [browserType, setBrowserType] = useState('');

  useEffect(() => {
    // Check if already installed (standalone mode)
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true ||
      document.referrer.includes('android-app://');
    
    setIsStandalone(isInStandaloneMode);

    // Detect iOS (including iPadOS)
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
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

    if (!isInStandaloneMode && (!dismissed || shouldShowAgain)) {
      // For iOS, always show instructions (regardless of browser)
      if (isIOSDevice) {
        setTimeout(() => setShowInstallPrompt(true), 2000); // Show after 2 seconds
      }
    }

    // For Android/Desktop - listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (shouldShowAgain && !isIOSDevice) {
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

  if (!showInstallPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-2xl animate-slideUp max-h-[85vh] overflow-y-auto">
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
              {isIOS ? (
                <div className="bg-blue-500/20 border-l-4 border-blue-300 px-2 py-1.5 mb-2 rounded">
                  <p className="text-xs text-blue-100 font-semibold">
                    ℹ️ On iPhone/iPad, you need to manually add this to your home screen using Safari's built-in feature. Follow the steps below:
                  </p>
                </div>
              ) : (
                <p className="text-xs sm:text-sm text-purple-100 mb-2 sm:mb-3">
                  Install our app for instant access and a better experience!
                </p>
              )}
              
              {isIOS ? (
                <div className="space-y-2">
                  {browserType !== 'safari' && (
                    <div className="bg-yellow-400 text-yellow-900 px-3 py-2 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-2">
                      <span className="text-xl">⚠️</span>
                      <span>You must use <strong>Safari browser</strong> to install. Please open this site in Safari.</span>
                    </div>
                  )}
                  
                  <div className="bg-white text-purple-900 rounded-lg p-3 sm:p-4">
                    <div className="bg-purple-100 px-3 py-2 rounded-lg mb-3 text-center">
                      <p className="text-xs sm:text-sm font-bold">📱 iOS Installation - Follow These 3 Steps:</p>
                    </div>
                    
                    <div className="space-y-3">
                      {/* Step 1 */}
                      <div className="flex gap-3 items-start bg-purple-50 p-2 sm:p-3 rounded-lg">
                        <div className="flex-shrink-0 w-6 h-6 sm:w-7 sm:h-7 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold text-sm">1</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs sm:text-sm font-bold mb-1">Tap the Share button</p>
                          <div className="flex items-center gap-2 bg-white px-2 py-1.5 rounded border-2 border-purple-200">
                            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/>
                            </svg>
                            <span className="text-xs font-semibold text-gray-700">Look at the bottom of Safari</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Step 2 */}
                      <div className="flex gap-3 items-start bg-purple-50 p-2 sm:p-3 rounded-lg">
                        <div className="flex-shrink-0 w-6 h-6 sm:w-7 sm:h-7 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold text-sm">2</div>
                        <div className="flex-1">
                          <p className="text-xs sm:text-sm font-bold mb-1">Scroll down in the menu</p>
                          <p className="text-xs sm:text-sm">Find and tap <span className="bg-white px-2 py-0.5 rounded font-bold border border-purple-300">"Add to Home Screen"</span></p>
                        </div>
                      </div>
                      
                      {/* Step 3 */}
                      <div className="flex gap-3 items-start bg-purple-50 p-2 sm:p-3 rounded-lg">
                        <div className="flex-shrink-0 w-6 h-6 sm:w-7 sm:h-7 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold text-sm">3</div>
                        <div className="flex-1">
                          <p className="text-xs sm:text-sm font-bold mb-1">Confirm installation</p>
                          <p className="text-xs sm:text-sm">Tap the <span className="bg-white px-2 py-0.5 rounded font-bold border border-purple-300">"Add"</span> button at the top right</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-3 pt-3 border-t border-purple-200">
                      <p className="text-xs text-center text-purple-700">
                        ✨ <strong>YohaTrade</strong> will appear on your home screen!
                      </p>
                    </div>
                  </div>
                </div>
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

