/**
 * Device Fingerprinting Utility
 * Collects browser and device information to create a unique fingerprint
 * Used for fraud detection in the referral program
 */

/**
 * Get screen information
 */
const getScreenInfo = () => {
  return {
    width: window.screen.width,
    height: window.screen.height,
    colorDepth: window.screen.colorDepth,
    pixelDepth: window.screen.pixelDepth,
    availWidth: window.screen.availWidth,
    availHeight: window.screen.availHeight,
  };
};

/**
 * Get browser information
 */
const getBrowserInfo = () => {
  const ua = navigator.userAgent;
  return {
    userAgent: ua,
    language: navigator.language || navigator.userLanguage,
    languages: navigator.languages ? navigator.languages.join(',') : '',
    platform: navigator.platform,
    vendor: navigator.vendor,
    cookieEnabled: navigator.cookieEnabled,
    doNotTrack: navigator.doNotTrack,
    hardwareConcurrency: navigator.hardwareConcurrency || 0,
    maxTouchPoints: navigator.maxTouchPoints || 0,
  };
};

/**
 * Get timezone information
 */
const getTimezoneInfo = () => {
  const offset = new Date().getTimezoneOffset();
  return {
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    timezoneOffset: offset,
  };
};

/**
 * Get WebGL information (for more unique fingerprinting)
 */
const getWebGLInfo = () => {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    if (!gl) {
      return { webglVendor: 'none', webglRenderer: 'none' };
    }

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    return {
      webglVendor: debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : 'unknown',
      webglRenderer: debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'unknown',
    };
  } catch (e) {
    return { webglVendor: 'error', webglRenderer: 'error' };
  }
};

/**
 * Get Canvas fingerprint
 */
const getCanvasFingerprint = () => {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return 'none';

    // Draw text with specific styling
    ctx.textBaseline = 'top';
    ctx.font = '14px "Arial"';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('Device Fingerprint 🖐️', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('Device Fingerprint 🖐️', 4, 17);

    // Get canvas data as hash
    return canvas.toDataURL();
  } catch (e) {
    return 'error';
  }
};

/**
 * Get installed fonts (limited check)
 */
const getFonts = () => {
  const baseFonts = ['monospace', 'sans-serif', 'serif'];
  const testString = 'mmmmmmmmmmlli';
  const testSize = '72px';
  
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  const baseFontWidths = {};
  baseFonts.forEach(baseFont => {
    ctx.font = testSize + ' ' + baseFont;
    baseFontWidths[baseFont] = ctx.measureText(testString).width;
  });

  const fonts = [
    'Arial', 'Verdana', 'Times New Roman', 'Courier New', 'Georgia',
    'Palatino', 'Garamond', 'Bookman', 'Comic Sans MS', 'Trebuchet MS',
    'Impact', 'Lucida Console', 'Tahoma'
  ];

  const detectedFonts = [];
  fonts.forEach(font => {
    baseFonts.forEach(baseFont => {
      ctx.font = testSize + ' ' + font + ', ' + baseFont;
      const width = ctx.measureText(testString).width;
      if (width !== baseFontWidths[baseFont]) {
        if (!detectedFonts.includes(font)) {
          detectedFonts.push(font);
        }
      }
    });
  });

  return detectedFonts.join(',');
};

/**
 * Get audio context fingerprint
 */
const getAudioFingerprint = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return 'none';

    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const analyser = context.createAnalyser();
    const gainNode = context.createGain();
    const scriptProcessor = context.createScriptProcessor(4096, 1, 1);

    gainNode.gain.value = 0; // Mute
    oscillator.type = 'triangle';
    oscillator.connect(analyser);
    analyser.connect(scriptProcessor);
    scriptProcessor.connect(gainNode);
    gainNode.connect(context.destination);

    oscillator.start(0);
    
    const audioData = analyser.frequencyBinCount;
    oscillator.stop();
    context.close();

    return audioData.toString();
  } catch (e) {
    return 'error';
  }
};

/**
 * Simple hash function
 */
const simpleHash = (str) => {
  let hash = 0;
  if (str.length === 0) return hash.toString();
  
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  return Math.abs(hash).toString(36);
};

/**
 * Generate a unique device fingerprint
 * @returns {Promise<string>} A unique hash representing this device
 */
export const generateDeviceFingerprint = async () => {
  try {
    const components = {
      screen: getScreenInfo(),
      browser: getBrowserInfo(),
      timezone: getTimezoneInfo(),
      webgl: getWebGLInfo(),
      canvas: getCanvasFingerprint(),
      fonts: getFonts(),
      audio: getAudioFingerprint(),
    };

    // Create a string from all components
    const fingerprintString = JSON.stringify(components);
    
    // Hash the fingerprint string
    const hash = simpleHash(fingerprintString);
    
    // Return a more secure hash (you could use crypto.subtle.digest for SHA-256)
    return hash;
  } catch (error) {
    console.error('Error generating device fingerprint:', error);
    // Fallback to basic fingerprint
    return simpleHash(navigator.userAgent + navigator.language + screen.width + screen.height);
  }
};

/**
 * Get detailed device information for fraud detection
 * @returns {Promise<object>} Detailed device information
 */
export const getDeviceInfo = async () => {
  const fingerprint = await generateDeviceFingerprint();
  
  return {
    fingerprint,
    userAgent: navigator.userAgent,
    language: navigator.language,
    platform: navigator.platform,
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    timezoneOffset: new Date().getTimezoneOffset(),
    colorDepth: window.screen.colorDepth,
    deviceMemory: navigator.deviceMemory || null,
    hardwareConcurrency: navigator.hardwareConcurrency || null,
    maxTouchPoints: navigator.maxTouchPoints || 0,
    cookieEnabled: navigator.cookieEnabled,
    timestamp: Date.now(),
  };
};

export default {
  generateDeviceFingerprint,
  getDeviceInfo,
};

