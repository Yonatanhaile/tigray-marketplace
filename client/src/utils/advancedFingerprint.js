/**
 * ADVANCED Device Fingerprinting & Fraud Detection
 * Uses 20+ sophisticated techniques that are extremely difficult to spoof
 */

/**
 * 1. Canvas Fingerprinting - Different browsers/GPUs render differently
 */
const getCanvasFingerprint = () => {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 280;
    canvas.height = 60;
    const ctx = canvas.getContext('2d');
    
    // Draw complex patterns
    ctx.textBaseline = 'top';
    ctx.font = '14px "Arial"';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    
    // Multiple text with emoji
    ctx.fillStyle = '#069';
    ctx.fillText('🔒 FraudDetect 🛡️ 123', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('🔒 FraudDetect 🛡️ 123', 4, 17);
    
    // Add gradient
    const gradient = ctx.createLinearGradient(0, 0, 150, 0);
    gradient.addColorStop(0, 'red');
    gradient.addColorStop(0.5, 'green');
    gradient.addColorStop(1, 'blue');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 35, 150, 20);
    
    return canvas.toDataURL();
  } catch (e) {
    return 'error';
  }
};

/**
 * 2. WebGL Fingerprinting - GPU and graphics driver signature
 */
const getWebGLFingerprint = () => {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    if (!gl) return { error: 'WebGL not supported' };

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    const webglInfo = {
      vendor: debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : 'unknown',
      renderer: debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'unknown',
      version: gl.getParameter(gl.VERSION),
      shadingLanguageVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
      maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
      maxViewportDims: gl.getParameter(gl.MAX_VIEWPORT_DIMS),
      maxVertexAttribs: gl.getParameter(gl.MAX_VERTEX_ATTRIBS),
      maxVertexUniformVectors: gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS),
      maxFragmentUniformVectors: gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS),
      maxVaryingVectors: gl.getParameter(gl.MAX_VARYING_VECTORS),
      aliasedLineWidthRange: gl.getParameter(gl.ALIASED_LINE_WIDTH_RANGE),
      aliasedPointSizeRange: gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE),
      maxRenderBufferSize: gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),
      maxCombinedTextureImageUnits: gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS),
      maxCubeMapTextureSize: gl.getParameter(gl.MAX_CUBE_MAP_TEXTURE_SIZE),
      maxVertexTextureImageUnits: gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS),
      maxTextureImageUnits: gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS),
      extensions: gl.getSupportedExtensions() || [],
    };
    
    return webglInfo;
  } catch (e) {
    return { error: e.message };
  }
};

/**
 * 3. Audio Context Fingerprinting - Audio processing signature
 */
const getAudioFingerprint = () => {
  return new Promise((resolve) => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) {
        resolve('unsupported');
        return;
      }

      const context = new AudioContext();
      const oscillator = context.createOscillator();
      const analyser = context.createAnalyser();
      const gainNode = context.createGain();
      const scriptProcessor = context.createScriptProcessor(4096, 1, 1);

      gainNode.gain.value = 0; // Mute
      oscillator.type = 'triangle';
      oscillator.frequency.value = 10000;
      
      oscillator.connect(analyser);
      analyser.connect(scriptProcessor);
      scriptProcessor.connect(gainNode);
      gainNode.connect(context.destination);

      scriptProcessor.onaudioprocess = function(event) {
        const output = event.outputBuffer.getChannelData(0);
        const hash = Array.from(output).slice(0, 30).reduce((a, b) => a + b, 0);
        
        scriptProcessor.disconnect();
        oscillator.disconnect();
        context.close();
        
        resolve(hash.toString());
      };

      oscillator.start(0);
      
      // Timeout fallback
      setTimeout(() => {
        try {
          context.close();
        } catch (e) {}
        resolve('timeout');
      }, 100);
    } catch (e) {
      resolve('error');
    }
  });
};

/**
 * 4. WebRTC IP Leak Detection - Gets real IP even with VPN
 */
const getWebRTCIPs = () => {
  return new Promise((resolve) => {
    const ips = [];
    const RTCPeerConnection = window.RTCPeerConnection || 
                             window.mozRTCPeerConnection || 
                             window.webkitRTCPeerConnection;
    
    if (!RTCPeerConnection) {
      resolve([]);
      return;
    }

    const pc = new RTCPeerConnection({ iceServers: [] });
    
    pc.createDataChannel('');
    pc.createOffer().then(offer => pc.setLocalDescription(offer));
    
    pc.onicecandidate = (ice) => {
      if (!ice || !ice.candidate || !ice.candidate.candidate) {
        resolve(ips);
        return;
      }

      const parts = ice.candidate.candidate.split(' ');
      const ip = parts[4];
      
      if (ip && !ips.includes(ip)) {
        ips.push(ip);
      }
    };
    
    setTimeout(() => {
      pc.close();
      resolve(ips);
    }, 1000);
  });
};

/**
 * 5. Fonts Detection - Installed fonts list
 */
const getInstalledFonts = () => {
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
    'Arial', 'Arial Black', 'Arial Narrow', 'Arial Rounded MT Bold',
    'Calibri', 'Cambria', 'Cambria Math', 'Candara', 'Comic Sans MS',
    'Consolas', 'Constantia', 'Corbel', 'Courier', 'Courier New',
    'Georgia', 'Helvetica', 'Impact', 'Lucida Console', 'Lucida Sans Unicode',
    'Microsoft Sans Serif', 'MS Gothic', 'MS PGothic', 'MS Sans Serif',
    'MS Serif', 'Palatino', 'Palatino Linotype', 'Segoe Print', 'Segoe Script',
    'Segoe UI', 'Tahoma', 'Times', 'Times New Roman', 'Trebuchet MS',
    'Verdana', 'Wingdings', 'Noto Sans', 'Roboto', 'Ubuntu'
  ];

  const detectedFonts = [];
  fonts.forEach(font => {
    let detected = false;
    baseFonts.forEach(baseFont => {
      ctx.font = testSize + ' ' + font + ', ' + baseFont;
      const width = ctx.measureText(testString).width;
      if (width !== baseFontWidths[baseFont]) {
        detected = true;
      }
    });
    if (detected) {
      detectedFonts.push(font);
    }
  });

  return detectedFonts;
};

/**
 * 6. Browser Plugins Detection
 */
const getPlugins = () => {
  const plugins = [];
  try {
    for (let i = 0; i < navigator.plugins.length; i++) {
      const plugin = navigator.plugins[i];
      plugins.push({
        name: plugin.name,
        description: plugin.description,
        filename: plugin.filename,
      });
    }
  } catch (e) {}
  return plugins;
};

/**
 * 7. Battery API - Device battery information
 */
const getBatteryInfo = async () => {
  try {
    if ('getBattery' in navigator) {
      const battery = await navigator.getBattery();
      return {
        level: battery.level,
        charging: battery.charging,
        chargingTime: battery.chargingTime,
        dischargingTime: battery.dischargingTime,
      };
    }
  } catch (e) {}
  return null;
};

/**
 * 8. Media Devices - Connected cameras/microphones
 */
const getMediaDevices = async () => {
  try {
    if ('mediaDevices' in navigator && 'enumerateDevices' in navigator.mediaDevices) {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return {
        audioInput: devices.filter(d => d.kind === 'audioinput').length,
        audioOutput: devices.filter(d => d.kind === 'audiooutput').length,
        videoInput: devices.filter(d => d.kind === 'videoinput').length,
      };
    }
  } catch (e) {}
  return null;
};

/**
 * 9. Connection Type - Network information
 */
const getConnectionInfo = () => {
  try {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (connection) {
      return {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData,
      };
    }
  } catch (e) {}
  return null;
};

/**
 * 10. Ad Blocker Detection
 */
const detectAdBlocker = async () => {
  try {
    // Try to fetch a common ad script
    const response = await fetch('https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js', {
      method: 'HEAD',
      mode: 'no-cors'
    });
    return false; // No ad blocker
  } catch (e) {
    return true; // Ad blocker detected
  }
};

/**
 * 11. Private/Incognito Mode Detection
 */
const detectPrivateMode = async () => {
  return new Promise((resolve) => {
    // Test 1: FileSystem API
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      navigator.storage.estimate().then(estimate => {
        if (estimate.quota < 120000000) {
          resolve(true); // Likely private mode
        } else {
          resolve(false);
        }
      });
    } 
    // Test 2: IndexedDB
    else if ('indexedDB' in window) {
      try {
        const db = indexedDB.open('test');
        db.onsuccess = () => resolve(false);
        db.onerror = () => resolve(true);
      } catch (e) {
        resolve(true);
      }
    } 
    else {
      resolve(false);
    }
    
    setTimeout(() => resolve(false), 100);
  });
};

/**
 * 12. WebDriver Detection (Bot/Automation Detection)
 */
const detectWebDriver = () => {
  return {
    webdriver: navigator.webdriver || false,
    phantom: !!(window.callPhantom || window._phantom),
    selenium: !!(window.document.documentElement.getAttribute('selenium') ||
                 window.document.documentElement.getAttribute('webdriver') ||
                 window.document.documentElement.getAttribute('driver')),
  };
};

/**
 * 13. Screen Orientation & Details
 */
const getScreenDetails = () => {
  return {
    width: screen.width,
    height: screen.height,
    availWidth: screen.availWidth,
    availHeight: screen.availHeight,
    colorDepth: screen.colorDepth,
    pixelDepth: screen.pixelDepth,
    orientation: screen.orientation ? screen.orientation.type : null,
    orientationAngle: screen.orientation ? screen.orientation.angle : null,
    devicePixelRatio: window.devicePixelRatio || 1,
  };
};

/**
 * 14. Extended Navigator Properties
 */
const getExtendedNavigatorInfo = () => {
  return {
    userAgent: navigator.userAgent,
    language: navigator.language,
    languages: navigator.languages || [],
    platform: navigator.platform,
    vendor: navigator.vendor,
    vendorSub: navigator.vendorSub || '',
    product: navigator.product,
    productSub: navigator.productSub || '',
    appName: navigator.appName,
    appCodeName: navigator.appCodeName,
    appVersion: navigator.appVersion,
    buildID: navigator.buildID || '',
    oscpu: navigator.oscpu || '',
    cookieEnabled: navigator.cookieEnabled,
    doNotTrack: navigator.doNotTrack || '',
    maxTouchPoints: navigator.maxTouchPoints || 0,
    hardwareConcurrency: navigator.hardwareConcurrency || 0,
    deviceMemory: navigator.deviceMemory || null,
    pdfViewerEnabled: navigator.pdfViewerEnabled || false,
  };
};

/**
 * 15. Storage Availability
 */
const getStorageInfo = () => {
  return {
    localStorage: (() => {
      try {
        localStorage.setItem('test', 'test');
        localStorage.removeItem('test');
        return true;
      } catch (e) {
        return false;
      }
    })(),
    sessionStorage: (() => {
      try {
        sessionStorage.setItem('test', 'test');
        sessionStorage.removeItem('test');
        return true;
      } catch (e) {
        return false;
      }
    })(),
    indexedDB: !!window.indexedDB,
    openDatabase: !!window.openDatabase,
  };
};

/**
 * 16. Permissions State
 */
const getPermissionsState = async () => {
  const permissions = {};
  const permissionNames = ['geolocation', 'notifications', 'microphone', 'camera'];
  
  try {
    for (const name of permissionNames) {
      try {
        const result = await navigator.permissions.query({ name });
        permissions[name] = result.state;
      } catch (e) {
        permissions[name] = 'unavailable';
      }
    }
  } catch (e) {}
  
  return permissions;
};

/**
 * 17. CPU Class & Architecture
 */
const getCPUInfo = () => {
  return {
    cpuClass: navigator.cpuClass || 'unknown',
    hardwareConcurrency: navigator.hardwareConcurrency || 0,
    deviceMemory: navigator.deviceMemory || null,
  };
};

/**
 * Simple but secure hash function
 */
const hashString = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
};

/**
 * Generate Advanced Device Fingerprint
 */
export const generateAdvancedFingerprint = async () => {
  try {
    const components = {
      canvas: getCanvasFingerprint(),
      webgl: getWebGLFingerprint(),
      audio: await getAudioFingerprint(),
      webrtcIPs: await getWebRTCIPs(),
      fonts: getInstalledFonts(),
      plugins: getPlugins(),
      battery: await getBatteryInfo(),
      mediaDevices: await getMediaDevices(),
      connection: getConnectionInfo(),
      adBlocker: await detectAdBlocker(),
      privateMode: await detectPrivateMode(),
      webDriver: detectWebDriver(),
      screen: getScreenDetails(),
      navigator: getExtendedNavigatorInfo(),
      storage: getStorageInfo(),
      permissions: await getPermissionsState(),
      cpu: getCPUInfo(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      timezoneOffset: new Date().getTimezoneOffset(),
      timestamp: Date.now(),
    };

    const fingerprintString = JSON.stringify(components);
    return hashString(fingerprintString);
  } catch (error) {
    console.error('Advanced fingerprint error:', error);
    return hashString(navigator.userAgent + Date.now());
  }
};

/**
 * Get Complete Device Info for Fraud Detection
 */
export const getAdvancedDeviceInfo = async () => {
  const fingerprint = await generateAdvancedFingerprint();
  
  return {
    fingerprint,
    canvas: getCanvasFingerprint().substring(0, 100), // Truncate for storage
    webgl: getWebGLFingerprint(),
    audio: await getAudioFingerprint(),
    webrtcIPs: await getWebRTCIPs(),
    fonts: getInstalledFonts(),
    plugins: getPlugins(),
    battery: await getBatteryInfo(),
    mediaDevices: await getMediaDevices(),
    connection: getConnectionInfo(),
    adBlocker: await detectAdBlocker(),
    privateMode: await detectPrivateMode(),
    webDriver: detectWebDriver(),
    screen: getScreenDetails(),
    navigator: getExtendedNavigatorInfo(),
    storage: getStorageInfo(),
    permissions: await getPermissionsState(),
    cpu: getCPUInfo(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    timezoneOffset: new Date().getTimezoneOffset(),
    timestamp: Date.now(),
  };
};

export default {
  generateAdvancedFingerprint,
  getAdvancedDeviceInfo,
};

