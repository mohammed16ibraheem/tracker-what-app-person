// Comprehensive Data Collection for Scammer Detection
import { generateFingerprint } from './fingerprint';

export interface CollectedData {
  // Location Data
  gpsLocation: {
    latitude: number;
    longitude: number;
    accuracy: number;
  } | null;
  
  // IP & Network Data
  ipAddress: string;
  ipLocation: {
    ip?: string; // IP address (if available from API)
    country: string;
    countryCode: string;
    region: string;
    regionCode: string;
    city: string;
    postal: string;
    latitude: number;
    longitude: number;
    timezone: string;
    utcOffset: string;
    isp: string;
    org: string;
    asn: string;
    isVPN: boolean;
    isProxy: boolean;
    currency: string;
    currencyName: string;
    continentCode: string;
    inEU: boolean;
  } | null;
  
  // Device Fingerprint
  deviceFingerprint: string;
  
  // Device Information
  deviceInfo: {
    type: 'mobile' | 'tablet' | 'desktop';
    os: string;
    osVersion: string;
    browser: string;
    browserVersion: string;
    userAgent: string;
    platform: string;
    hardwareConcurrency: number;
    deviceMemory: number | null;
    touchSupport: boolean;
  };
  
  // Screen & Display
  screenInfo: {
    width: number;
    height: number;
    colorDepth: number;
    pixelRatio: number;
    orientation: 'portrait' | 'landscape';
  };
  
  // Network Connection
  networkInfo: {
    connectionType: string;
    effectiveType: string;
    downlink: number;
    rtt: number;
  } | null;
  
  // Time & Timezone
  timeData: {
    timezone: string;
    timezoneOffset: number;
    localTime: string;
    utcTime: string;
  };
  
  // Language & Locale
  localeInfo: {
    language: string;
    languages: string[];
    locale: string;
  };
  
  // Referrer & Source
  referrerInfo: {
    referrer: string;
    referrerDomain: string;
    isDirect: boolean;
    source: string;
  };
  
  // Behavioral Data
  behavioralData: {
    pageLoadTime: number;
    timeToInteraction: number;
    mouseMovements: number;
    clicks: number;
    scrolls: number;
    isAutomated: boolean;
    suspiciousPatterns: string[];
  };
  
  // Analysis Results
  analysis: {
    locationMismatch: boolean;
    timezoneMismatch: boolean;
    deviceMismatch: boolean;
    networkMismatch: boolean;
    suspiciousReferrer: boolean;
    isAutomated: boolean;
    flags: string[];
  };
  
  // Camera Image (if permission granted)
  cameraImage: string | null; // Base64 encoded image
  
  // Metadata
  metadata: {
    timestamp: string;
    sessionId: string;
    groupId: string;
    permissionStatus: 'granted' | 'denied' | 'prompt' | 'unknown';
    cameraPermissionStatus: 'granted' | 'denied' | 'prompt' | 'unknown';
  };
}

let interactionStartTime: number = Date.now();
let mouseMoveCount = 0;
let clickCount = 0;
let scrollCount = 0;

export function initializeBehavioralTracking() {
  interactionStartTime = Date.now();
  mouseMoveCount = 0;
  clickCount = 0;
  scrollCount = 0;
  
  // Track mouse movements
  document.addEventListener('mousemove', () => {
    mouseMoveCount++;
  }, { once: false });
  
  // Track clicks
  document.addEventListener('click', () => {
    clickCount++;
  }, { once: false });
  
  // Track scrolls
  let lastScrollTop = window.pageYOffset;
  window.addEventListener('scroll', () => {
    const currentScrollTop = window.pageYOffset;
    if (currentScrollTop !== lastScrollTop) {
      scrollCount++;
      lastScrollTop = currentScrollTop;
    }
  }, { once: false });
}

// Collect data WITHOUT GPS location (background collection)
export async function collectDataWithoutGPS(groupId: string): Promise<Omit<CollectedData, 'gpsLocation'>> {
  const pageLoadTime = performance.timing ? performance.timing.loadEventEnd - performance.timing.navigationStart : 0;
  const timeToInteraction = Date.now() - interactionStartTime;
  
  // Get IP Address and Location
  const ipData = await getIPLocation();
  
  // Generate Device Fingerprint
  const deviceFingerprint = await generateFingerprint();
  
  // Parse User Agent
  const deviceInfo = parseUserAgent();
  
  // Get Network Info
  const networkInfo = getNetworkInfo();
  
  // Get Referrer Info
  const referrerInfo = getReferrerInfo();
  
  // Get permission status
  const permissionStatus = await getPermissionStatus();
  
  // Analyze for suspicious patterns (without GPS)
  const analysis = analyzeDataWithoutGPS(
    ipData,
    deviceInfo,
    networkInfo,
    referrerInfo,
    timeToInteraction,
    mouseMoveCount,
    clickCount,
    scrollCount
  );
  
  return {
    ipAddress: ipData?.ip || 'unknown',
    ipLocation: ipData,
    deviceFingerprint,
    deviceInfo,
    screenInfo: {
      width: screen.width,
      height: screen.height,
      colorDepth: screen.colorDepth,
      pixelRatio: window.devicePixelRatio || 1,
      orientation: screen.width > screen.height ? 'landscape' : 'portrait',
    },
    networkInfo,
    timeData: {
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      timezoneOffset: new Date().getTimezoneOffset(),
      localTime: new Date().toLocaleString(),
      utcTime: new Date().toISOString(),
    },
    localeInfo: {
      language: navigator.language,
      languages: [...(navigator.languages || [])], // Convert readonly array to mutable array
      locale: Intl.DateTimeFormat().resolvedOptions().locale,
    },
    referrerInfo,
    behavioralData: {
      pageLoadTime,
      timeToInteraction,
      mouseMovements: mouseMoveCount,
      clicks: clickCount,
      scrolls: scrollCount,
      isAutomated: detectAutomation(),
      suspiciousPatterns: [],
    },
    analysis,
    cameraImage: null, // Will be set by the component if camera permission is granted
    metadata: {
      timestamp: new Date().toISOString(),
      sessionId: generateSessionId(),
      groupId,
      permissionStatus,
      cameraPermissionStatus: 'unknown',
    },
  };
}

// Collect ALL data (with GPS location)
export async function collectAllData(groupId: string, gpsLocation: GeolocationCoordinates | null): Promise<CollectedData> {
  const pageLoadTime = performance.timing ? performance.timing.loadEventEnd - performance.timing.navigationStart : 0;
  const timeToInteraction = Date.now() - interactionStartTime;
  
  // Get IP Address and Location
  const ipData = await getIPLocation();
  
  // Generate Device Fingerprint
  const deviceFingerprint = await generateFingerprint();
  
  // Parse User Agent
  const deviceInfo = parseUserAgent();
  
  // Get Network Info
  const networkInfo = getNetworkInfo();
  
  // Get Referrer Info
  const referrerInfo = getReferrerInfo();
  
  // Get permission status
  const permissionStatus = await getPermissionStatus();
  
  // Analyze for suspicious patterns
  const analysis = analyzeData(
    gpsLocation,
    ipData,
    deviceInfo,
    networkInfo,
    referrerInfo,
    timeToInteraction,
    mouseMoveCount,
    clickCount,
    scrollCount
  );
  
  return {
    gpsLocation: gpsLocation ? {
      latitude: gpsLocation.latitude,
      longitude: gpsLocation.longitude,
      accuracy: gpsLocation.accuracy,
    } : null,
    ipAddress: ipData?.ip || 'unknown',
    ipLocation: ipData,
    deviceFingerprint,
    deviceInfo,
    screenInfo: {
      width: screen.width,
      height: screen.height,
      colorDepth: screen.colorDepth,
      pixelRatio: window.devicePixelRatio || 1,
      orientation: screen.width > screen.height ? 'landscape' : 'portrait',
    },
    networkInfo,
    timeData: {
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      timezoneOffset: new Date().getTimezoneOffset(),
      localTime: new Date().toLocaleString(),
      utcTime: new Date().toISOString(),
    },
    localeInfo: {
      language: navigator.language,
      languages: [...(navigator.languages || [])], // Convert readonly array to mutable array
      locale: Intl.DateTimeFormat().resolvedOptions().locale,
    },
    referrerInfo,
    behavioralData: {
      pageLoadTime,
      timeToInteraction,
      mouseMovements: mouseMoveCount,
      clicks: clickCount,
      scrolls: scrollCount,
      isAutomated: detectAutomation(),
      suspiciousPatterns: [],
    },
    analysis,
    cameraImage: null, // Will be set by the component if camera permission is granted
    metadata: {
      timestamp: new Date().toISOString(),
      sessionId: generateSessionId(),
      groupId,
      permissionStatus,
      cameraPermissionStatus: 'unknown',
    },
  };
}

// Get Permission Status
async function getPermissionStatus(): Promise<'granted' | 'denied' | 'prompt' | 'unknown'> {
  if (!navigator.permissions) {
    return 'unknown';
  }
  
  try {
    const result = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
    return result.state as 'granted' | 'denied' | 'prompt';
  } catch (error) {
    return 'unknown';
  }
}

// Get Camera Permission Status
export async function getCameraPermissionStatus(): Promise<'granted' | 'denied' | 'prompt' | 'unknown'> {
  if (!navigator.permissions) {
    return 'unknown';
  }
  
  try {
    const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
    return result.state as 'granted' | 'denied' | 'prompt';
  } catch (error) {
    return 'unknown';
  }
}

// Capture Camera Image
export async function captureCameraImage(): Promise<string | null> {
  try {
    // Request camera access (user will see browser prompt)
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { 
        facingMode: 'user', // Front camera
        width: { ideal: 640 },
        height: { ideal: 480 }
      } 
    });
    
    // Create video element to capture frame
    const video = document.createElement('video');
    video.srcObject = stream;
    video.autoplay = true;
    video.playsInline = true;
    
    // Wait for video to be ready
    await new Promise((resolve) => {
      video.onloadedmetadata = () => {
        video.play();
        resolve(null);
      };
    });
    
    // Wait a moment for camera to focus
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Capture frame to canvas
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      stream.getTracks().forEach(track => track.stop());
      return null;
    }
    
    ctx.drawImage(video, 0, 0);
    
    // Convert to base64
    const imageData = canvas.toDataURL('image/jpeg', 0.8);
    
    // Stop camera stream
    stream.getTracks().forEach(track => track.stop());
    
    return imageData;
  } catch (error) {
    // Permission denied or error - that's fine
    console.log('Camera permission denied or error:', error);
    return null;
  }
}

/**
 * Get IP Address and Location using ipapi.co API
 * 
 * Free Tier Limits:
 * - 30,000 requests per month
 * - Up to 1,000 requests per day
 * 
 * Best Practices:
 * - Includes User-Agent header (required for some APIs)
 * - Handles rate limits (429 status) gracefully
 * - Falls back to ip-api.com if ipapi.co is unavailable
 * - Returns comprehensive location data including timezone, currency, VPN detection
 * 
 * API Documentation: https://ipapi.co/documentation
 * 
 * @returns IP location data or null if all services fail
 */
async function getIPLocation(): Promise<CollectedData['ipLocation']> {
  try {
    // Using ipapi.co API (free tier: 30,000/month, 1,000/day)
    // Best practice: Include User-Agent header
    const response = await fetch('https://ipapi.co/json/', {
      method: 'GET',
      headers: {
        'User-Agent': 'WhatsApp-Group-Tracker/1.0',
        'Accept': 'application/json',
      },
    });
    
    // Check for rate limit (429 status)
    if (response.status === 429) {
      console.warn('ipapi.co rate limit reached, using fallback');
      return await getIPLocationFallback();
    }
    
    // Check for other errors
    if (!response.ok) {
      console.warn(`ipapi.co returned status ${response.status}, using fallback`);
      return await getIPLocationFallback();
    }
    
    const data = await response.json();
    
    // Check if API returned an error in the response body
    if (data.error) {
      console.warn('ipapi.co returned error:', data.reason, 'using fallback');
      return await getIPLocationFallback();
    }
    
    // Success - return comprehensive data from ipapi.co
    return {
      ip: data.ip || 'unknown', // IP address from API
      country: data.country_name || data.country || 'Unknown',
      countryCode: data.country_code || data.country || 'Unknown',
      region: data.region || 'Unknown',
      regionCode: data.region_code || 'Unknown',
      city: data.city || 'Unknown',
      postal: data.postal || '',
      latitude: data.latitude || 0,
      longitude: data.longitude || 0,
      timezone: data.timezone || 'Unknown',
      utcOffset: data.utc_offset || '',
      isp: data.org || 'Unknown',
      org: data.org || 'Unknown',
      asn: data.asn || 'Unknown',
      isVPN: data.vpn === true || false,
      isProxy: data.proxy === true || false,
      currency: data.currency || 'Unknown',
      currencyName: data.currency_name || 'Unknown',
      continentCode: data.continent_code || 'Unknown',
      inEU: data.in_eu === true || false,
    };
  } catch (error) {
    console.error('Error fetching IP location from ipapi.co:', error);
    // Try fallback on any error
    return await getIPLocationFallback();
  }
}

// Fallback IP location service (ip-api.com)
// Used when ipapi.co is rate-limited or unavailable
async function getIPLocationFallback(): Promise<CollectedData['ipLocation']> {
  try {
    const fallback = await fetch('http://ip-api.com/json/', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!fallback.ok) {
      console.error('Fallback IP service also failed');
      return null;
    }
    
    const fallbackData = await fallback.json();
    
    // ip-api.com uses different field names
    return {
      ip: fallbackData.query || 'unknown', // IP address from fallback API
      country: fallbackData.country || 'Unknown',
      countryCode: fallbackData.countryCode || 'Unknown',
      region: fallbackData.regionName || 'Unknown',
      regionCode: fallbackData.region || 'Unknown',
      city: fallbackData.city || 'Unknown',
      postal: fallbackData.zip || '',
      latitude: fallbackData.lat || 0,
      longitude: fallbackData.lon || 0,
      timezone: fallbackData.timezone || 'Unknown',
      utcOffset: fallbackData.timezone || '',
      isp: fallbackData.isp || 'Unknown',
      org: fallbackData.org || fallbackData.isp || 'Unknown',
      asn: fallbackData.as || 'Unknown',
      isVPN: false, // ip-api.com doesn't provide VPN detection
      isProxy: fallbackData.proxy === true || false,
      currency: 'Unknown',
      currencyName: 'Unknown',
      continentCode: 'Unknown',
      inEU: false,
    };
  } catch (error) {
    console.error('Error fetching IP location from fallback service:', error);
    return null;
  }
}

// Parse User Agent
function parseUserAgent(): CollectedData['deviceInfo'] {
  const ua = navigator.userAgent;
  
  // Detect device type
  let deviceType: 'mobile' | 'tablet' | 'desktop' = 'desktop';
  if (/mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(ua)) {
    deviceType = 'mobile';
  } else if (/tablet|ipad|playbook|silk/i.test(ua)) {
    deviceType = 'tablet';
  }
  
  // Detect OS
  let os = 'Unknown';
  let osVersion = 'Unknown';
  if (ua.includes('Windows')) {
    os = 'Windows';
    const match = ua.match(/Windows NT (\d+\.\d+)/);
    if (match) osVersion = match[1];
  } else if (ua.includes('Mac OS')) {
    os = 'macOS';
    const match = ua.match(/Mac OS X (\d+[._]\d+)/);
    if (match) osVersion = match[1].replace('_', '.');
  } else if (ua.includes('Linux')) {
    os = 'Linux';
  } else if (ua.includes('Android')) {
    os = 'Android';
    const match = ua.match(/Android (\d+\.\d+)/);
    if (match) osVersion = match[1];
  } else if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) {
    os = 'iOS';
    const match = ua.match(/OS (\d+[._]\d+)/);
    if (match) osVersion = match[1].replace('_', '.');
  }
  
  // Detect Browser
  let browser = 'Unknown';
  let browserVersion = 'Unknown';
  if (ua.includes('Chrome') && !ua.includes('Edg')) {
    browser = 'Chrome';
    const match = ua.match(/Chrome\/(\d+\.\d+)/);
    if (match) browserVersion = match[1];
  } else if (ua.includes('Firefox')) {
    browser = 'Firefox';
    const match = ua.match(/Firefox\/(\d+\.\d+)/);
    if (match) browserVersion = match[1];
  } else if (ua.includes('Safari') && !ua.includes('Chrome')) {
    browser = 'Safari';
    const match = ua.match(/Version\/(\d+\.\d+)/);
    if (match) browserVersion = match[1];
  } else if (ua.includes('Edg')) {
    browser = 'Edge';
    const match = ua.match(/Edg\/(\d+\.\d+)/);
    if (match) browserVersion = match[1];
  }
  
  return {
    type: deviceType,
    os,
    osVersion,
    browser,
    browserVersion,
    userAgent: ua,
    platform: navigator.platform,
    hardwareConcurrency: navigator.hardwareConcurrency || 0,
    deviceMemory: (navigator as any).deviceMemory || null,
    touchSupport: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
  };
}

// Get Network Info
function getNetworkInfo(): CollectedData['networkInfo'] {
  const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
  
  if (!connection) return null;
  
  return {
    connectionType: connection.type || 'unknown',
    effectiveType: connection.effectiveType || 'unknown',
    downlink: connection.downlink || 0,
    rtt: connection.rtt || 0,
  };
}

// Get Referrer Info
function getReferrerInfo(): CollectedData['referrerInfo'] {
  const referrer = document.referrer;
  const isDirect = !referrer || referrer === '';
  
  let referrerDomain = 'direct';
  if (!isDirect) {
    try {
      const url = new URL(referrer);
      referrerDomain = url.hostname;
    } catch (e) {
      referrerDomain = 'unknown';
    }
  }
  
  let source = 'direct';
  if (referrer.includes('whatsapp.com') || referrer.includes('wa.me')) {
    source = 'whatsapp';
  } else if (referrer.includes('google.com')) {
    source = 'google';
  } else if (referrer.includes('facebook.com')) {
    source = 'facebook';
  } else if (referrer.includes('twitter.com') || referrer.includes('x.com')) {
    source = 'twitter';
  } else if (!isDirect) {
    source = 'other';
  }
  
  return {
    referrer,
    referrerDomain,
    isDirect,
    source,
  };
}

// Detect Automation
function detectAutomation(): boolean {
  // Check for automation indicators
  const checks = [
    // WebDriver
    (window as any).navigator.webdriver === true,
    // Chrome automation
    (window as any).chrome && !(window as any).chrome.runtime,
    // PhantomJS
    (window as any).callPhantom !== undefined,
    // Selenium
    (window as any).__selenium_unwrapped !== undefined,
    // Puppeteer
    (window as any).__puppeteer_evaluation__ !== undefined,
    // Playwright
    (window as any).__playwright__ !== undefined,
    // Missing plugins (automated browsers often have no plugins)
    navigator.plugins.length === 0,
    // Missing languages
    navigator.languages.length === 0,
  ];
  
  return checks.some(check => check === true);
}

// Analyze Data WITHOUT GPS (for background collection)
function analyzeDataWithoutGPS(
  ipLocation: CollectedData['ipLocation'],
  deviceInfo: CollectedData['deviceInfo'],
  networkInfo: CollectedData['networkInfo'],
  referrerInfo: CollectedData['referrerInfo'],
  timeToInteraction: number,
  mouseMovements: number,
  clicks: number,
  scrolls: number
): CollectedData['analysis'] {
  const flags: string[] = [];
  
  // Device Mismatch Check
  let deviceMismatch = false;
  if (deviceInfo.type === 'mobile' && screen.width > 768) {
    deviceMismatch = true;
    flags.push('Device type mismatch (mobile UA but large screen)');
  }
  if (deviceInfo.type === 'desktop' && screen.width < 768 && navigator.maxTouchPoints > 0) {
    deviceMismatch = true;
    flags.push('Device type mismatch (desktop UA but touch device)');
  }
  
  // Network Mismatch Check
  let networkMismatch = false;
  if (networkInfo) {
    if (deviceInfo.type === 'desktop' && networkInfo.connectionType === 'cellular') {
      networkMismatch = true;
      flags.push('Network type mismatch (desktop on mobile network)');
    }
  }
  
  // Suspicious Referrer
  let suspiciousReferrer = false;
  if (referrerInfo && referrerInfo.isDirect && !referrerInfo.referrer && flags.length > 0) {
    suspiciousReferrer = true;
    flags.push('Direct access with other suspicious indicators');
  }
  
  // Automation Detection
  const isAutomated = detectAutomation();
  if (isAutomated) {
    flags.push('Automation detected (bot/scraper)');
  }
  
  // Behavioral Analysis
  if (timeToInteraction < 100) {
    flags.push('Very fast interaction (possible automation)');
  }
  if (mouseMovements === 0 && clicks > 0) {
    flags.push('Clicks without mouse movement (suspicious)');
  }
  if (scrolls === 0 && timeToInteraction > 2000) {
    flags.push('No scrolling activity (possible bot)');
  }
  
  // VPN/Proxy Detection
  if (ipLocation?.isVPN || ipLocation?.isProxy) {
    flags.push('VPN or Proxy detected');
  }
  
  return {
    locationMismatch: false, // Can't check without GPS
    timezoneMismatch: false, // Can't check without GPS
    deviceMismatch,
    networkMismatch,
    suspiciousReferrer,
    isAutomated,
    flags,
  };
}

// Analyze Data for Suspicious Patterns
function analyzeData(
  gpsLocation: GeolocationCoordinates | null,
  ipLocation: CollectedData['ipLocation'],
  deviceInfo: CollectedData['deviceInfo'],
  networkInfo: CollectedData['networkInfo'],
  referrerInfo: CollectedData['referrerInfo'],
  timeToInteraction: number,
  mouseMovements: number,
  clicks: number,
  scrolls: number
): CollectedData['analysis'] {
  const flags: string[] = [];
  
  // Location Mismatch Check
  let locationMismatch = false;
  if (gpsLocation && ipLocation) {
    const distance = calculateDistance(
      gpsLocation.latitude,
      gpsLocation.longitude,
      ipLocation.latitude,
      ipLocation.longitude
    );
    // If GPS and IP location are more than 100km apart, likely VPN
    if (distance > 100) {
      locationMismatch = true;
      flags.push('GPS and IP location mismatch (possible VPN)');
    }
  }
  
  // Timezone Mismatch Check
  let timezoneMismatch = false;
  if (gpsLocation && ipLocation && ipLocation.timezone) {
    // Use the actual timezone from IP location API (more accurate)
    const expectedTimezone = ipLocation.timezone;
    const actualTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    // Compare timezone strings (e.g., "America/Los_Angeles" vs "America/Los_Angeles")
    if (expectedTimezone !== actualTimezone && expectedTimezone !== 'Unknown') {
      timezoneMismatch = true;
      flags.push(`Timezone mismatch (IP: ${expectedTimezone}, Device: ${actualTimezone})`);
    }
  }
  
  // Device Mismatch Check
  let deviceMismatch = false;
  if (deviceInfo.type === 'mobile' && screen.width > 768) {
    deviceMismatch = true;
    flags.push('Device type mismatch (mobile UA but large screen)');
  }
  if (deviceInfo.type === 'desktop' && screen.width < 768 && navigator.maxTouchPoints > 0) {
    deviceMismatch = true;
    flags.push('Device type mismatch (desktop UA but touch device)');
  }
  
  // Network Mismatch Check
  let networkMismatch = false;
  if (networkInfo) {
    if (deviceInfo.type === 'desktop' && networkInfo.connectionType === 'cellular') {
      networkMismatch = true;
      flags.push('Network type mismatch (desktop on mobile network)');
    }
  }
  
  // Suspicious Referrer
  let suspiciousReferrer = false;
  if (referrerInfo && referrerInfo.isDirect && !referrerInfo.referrer && flags.length > 0) {
    suspiciousReferrer = true;
    flags.push('Direct access with other suspicious indicators');
  }
  
  // Automation Detection
  const isAutomated = detectAutomation();
  if (isAutomated) {
    flags.push('Automation detected (bot/scraper)');
  }
  
  // Behavioral Analysis
  if (timeToInteraction < 100) {
    flags.push('Very fast interaction (possible automation)');
  }
  if (mouseMovements === 0 && clicks > 0) {
    flags.push('Clicks without mouse movement (suspicious)');
  }
  if (scrolls === 0 && timeToInteraction > 2000) {
    flags.push('No scrolling activity (possible bot)');
  }
  
  // VPN/Proxy Detection
  if (ipLocation?.isVPN || ipLocation?.isProxy) {
    flags.push('VPN or Proxy detected');
  }
  
  return {
    locationMismatch,
    timezoneMismatch,
    deviceMismatch,
    networkMismatch,
    suspiciousReferrer,
    isAutomated,
    flags,
  };
}

// Calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Note: Timezone is now obtained directly from ipapi.co API response
// which provides accurate IANA timezone format (e.g., "America/Los_Angeles")

// Generate Session ID
function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}
