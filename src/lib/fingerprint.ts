// Device Fingerprinting Utility
export interface DeviceFingerprint {
  canvas: string;
  webgl: string;
  audio: string;
  fonts: string[];
  screen: {
    width: number;
    height: number;
    colorDepth: number;
    pixelRatio: number;
  };
  timezone: string;
  timezoneOffset: number;
  language: string;
  languages: string[];
  platform: string;
  hardwareConcurrency: number;
  deviceMemory: number | null;
  touchSupport: boolean;
  userAgent: string;
}

export async function generateFingerprint(): Promise<string> {
  const fingerprint: DeviceFingerprint = {
    canvas: await getCanvasFingerprint(),
    webgl: getWebGLFingerprint(),
    audio: await getAudioFingerprint(),
    fonts: await getFontFingerprint(),
    screen: {
      width: screen.width,
      height: screen.height,
      colorDepth: screen.colorDepth,
      pixelRatio: window.devicePixelRatio || 1,
    },
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    timezoneOffset: new Date().getTimezoneOffset(),
    language: navigator.language,
    languages: [...(navigator.languages || [])], // Convert readonly array to mutable array
    platform: navigator.platform,
    hardwareConcurrency: navigator.hardwareConcurrency || 0,
    deviceMemory: (navigator as any).deviceMemory || null,
    touchSupport: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
    userAgent: navigator.userAgent,
  };

  // Create a hash from the fingerprint
  const fingerprintString = JSON.stringify(fingerprint);
  return await hashString(fingerprintString);
}

// Canvas Fingerprinting
async function getCanvasFingerprint(): Promise<string> {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return 'no-canvas';
    
    canvas.width = 200;
    canvas.height = 50;
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('Fingerprint', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('Test', 4, 17);
    
    return canvas.toDataURL();
  } catch (e) {
    return 'error';
  }
}

// WebGL Fingerprinting
function getWebGLFingerprint(): string {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return 'no-webgl';

    // Type assertion: getContext returns WebGLRenderingContext | null
    const webglContext = gl as WebGLRenderingContext;
    const debugInfo = webglContext.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      return `${webglContext.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL)}|${webglContext.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)}`;
    }
    return 'no-debug-info';
  } catch (e) {
    return 'error';
  }
}

// Audio Fingerprinting
async function getAudioFingerprint(): Promise<string> {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const analyser = audioContext.createAnalyser();
    const gainNode = audioContext.createGain();
    
    oscillator.type = 'triangle';
    oscillator.frequency.value = 10000;
    gainNode.gain.value = 0;
    
    oscillator.connect(analyser);
    analyser.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.start(0);
    
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(dataArray);
    
    oscillator.stop();
    audioContext.close();
    
    return Array.from(dataArray).slice(0, 10).join(',');
  } catch (e) {
    return 'error';
  }
}

// Font Fingerprinting
async function getFontFingerprint(): Promise<string[]> {
  const baseFonts = ['monospace', 'sans-serif', 'serif'];
  const testFonts = [
    'Arial', 'Verdana', 'Times New Roman', 'Courier New', 'Georgia',
    'Palatino', 'Garamond', 'Bookman', 'Comic Sans MS', 'Trebuchet MS',
    'Impact', 'Tahoma', 'Lucida Console', 'Courier', 'Lucida Sans Unicode'
  ];
  
  const detectedFonts: string[] = [];
  
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return [];
  
  const testString = 'mmmmmmmmmmlli';
  const testSize = '72px';
  
  const baseWidths: { [key: string]: number } = {};
  
  baseFonts.forEach(baseFont => {
    ctx.font = `${testSize} ${baseFont}`;
    baseWidths[baseFont] = ctx.measureText(testString).width;
  });
  
  for (const font of testFonts) {
    let detected = false;
    for (const baseFont of baseFonts) {
      ctx.font = `${testSize} ${font}, ${baseFont}`;
      const width = ctx.measureText(testString).width;
      if (width !== baseWidths[baseFont]) {
        detected = true;
        break;
      }
    }
    if (detected) {
      detectedFonts.push(font);
    }
  }
  
  return detectedFonts;
}

// Hash function with fallbacks (handles browsers without crypto.subtle)
async function hashString(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);

  try {
    if (typeof crypto !== 'undefined' && crypto.subtle?.digest) {
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
  } catch (e) {
    // fall through to fallback hash
  }

  // Fallback hash (Murmur-ish simple hash) to avoid throwing
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    hash = Math.imul(31, hash) + data[i];
    hash |= 0; // convert to 32-bit int
  }
  // Convert to hex string
  return ('00000000' + (hash >>> 0).toString(16)).slice(-8);
}

