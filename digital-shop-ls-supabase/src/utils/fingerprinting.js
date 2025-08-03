// src/utils/fingerprinting.js
import { supabase } from '../store/supaStore';

/**
 * Generate a unique fingerprint for the current browser/device
 * This helps identify unique visitors even when they use proxies
 */
export const generateFingerprint = (requestData = {}) => {
  try {
    const { headers = {}, userAgent, ip_address } = requestData;
    
    // Create fingerprint object with available data
    const fingerprint = {
      // User Agent components
      userAgent: userAgent || navigator?.userAgent || headers['user-agent'] || 'unknown',
      
      // Browser capabilities
      language: navigator?.language || headers['accept-language'] || 'unknown',
      languages: navigator?.languages ? navigator.languages.join(',') : 'unknown',
      platform: navigator?.platform || 'unknown',
      cookieEnabled: navigator?.cookieEnabled || false,
      doNotTrack: navigator?.doNotTrack || headers['dnt'] || 'unknown',
      
      // Screen and display info (if available in browser)
      screenResolution: typeof window !== 'undefined' ? 
        `${screen?.width || 0}x${screen?.height || 0}` : 'unknown',
      colorDepth: screen?.colorDepth || 'unknown',
      pixelRatio: window?.devicePixelRatio || 'unknown',
      
      // Timezone
      timezone: Intl?.DateTimeFormat()?.resolvedOptions()?.timeZone || 'unknown',
      timezoneOffset: new Date().getTimezoneOffset(),
      
      // HTTP headers that are hard to fake
      acceptEncoding: headers['accept-encoding'] || 'unknown',
      acceptLanguage: headers['accept-language'] || 'unknown',
      connection: headers['connection'] || 'unknown',
      cacheControl: headers['cache-control'] || 'unknown',
      upgradeInsecureRequests: headers['upgrade-insecure-requests'] || 'unknown',
      
      // TLS/SSL info (if available)
      tlsVersion: headers['ssl-version'] || 'unknown',
      cipherSuite: headers['ssl-cipher'] || 'unknown',
      
      // Additional entropy
      timestamp: Date.now(),
      random: Math.random().toString(36).substring(2, 15)
    };
    
    // Create a hash of the fingerprint
    const fingerprintString = JSON.stringify(fingerprint);
    return hashString(fingerprintString);
    
  } catch (error) {
    console.error('Error generating fingerprint:', error);
    // Return a basic fallback fingerprint
    return hashString(`${Date.now()}-${Math.random()}`);
  }
};

/**
 * Simple hash function for fingerprint generation
 */
const hashString = (str) => {
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
 * Track fingerprint changes for an IP address
 * Multiple fingerprints from same IP = suspicious
 */
export const trackFingerprintChanges = async (ip_address, newFingerprint) => {
  try {
    // Get recent fingerprints for this IP
    const { data: existing, error } = await supabase
      .from('request_tracking')
      .select('fingerprint_hash')
      .eq('ip_address', ip_address)
      .not('fingerprint_hash', 'is', null)
      .order('timestamp', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error fetching fingerprint history:', error);
      return { suspicious: false, score: 0, error: error.message };
    }

    if (!existing || existing.length === 0) {
      // First time seeing this IP
      return { suspicious: false, score: 0, reason: 'First request from IP' };
    }

    // Get unique fingerprints
    const uniqueFingerprints = [...new Set(existing.map(r => r.fingerprint_hash))];
    
    // Check if this is a new fingerprint
    const isNewFingerprint = !uniqueFingerprints.includes(newFingerprint);
    
    let suspiciousScore = 0;
    let reasons = [];
    
    // Multiple fingerprints from same IP = suspicious
    if (uniqueFingerprints.length > 3) {
      suspiciousScore += 25;
      reasons.push(`Multiple fingerprints from IP (${uniqueFingerprints.length})`);
    }
    
    // Rapid fingerprint changes = very suspicious
    if (uniqueFingerprints.length > 1 && existing.length < 10) {
      suspiciousScore += 35;
      reasons.push('Rapid fingerprint changes');
    }
    
    // New fingerprint from known IP
    if (isNewFingerprint && uniqueFingerprints.length > 0) {
      suspiciousScore += 15;
      reasons.push('New fingerprint from known IP');
    }

    return {
      suspicious: suspiciousScore > 30,
      score: Math.min(suspiciousScore, 100),
      uniqueFingerprints: uniqueFingerprints.length,
      isNewFingerprint,
      reasons,
      details: {
        totalRequests: existing.length,
        uniqueFingerprints: uniqueFingerprints.length,
        newFingerprint: newFingerprint
      }
    };

  } catch (error) {
    console.error('Error tracking fingerprint changes:', error);
    return { suspicious: false, score: 0, error: error.message };
  }
};

/**
 * Analyze fingerprint consistency for behavioral patterns
 */
export const analyzeFingerprintConsistency = (fingerprintHistory) => {
  if (!fingerprintHistory || fingerprintHistory.length < 2) {
    return { consistent: true, score: 0 };
  }

  const uniqueFingerprints = [...new Set(fingerprintHistory)];
  const consistencyRatio = uniqueFingerprints.length / fingerprintHistory.length;
  
  // Low consistency = high suspicion
  let suspiciousScore = 0;
  
  if (consistencyRatio > 0.8) {
    // Too many different fingerprints
    suspiciousScore = 80;
  } else if (consistencyRatio > 0.5) {
    suspiciousScore = 50;
  } else if (consistencyRatio > 0.3) {
    suspiciousScore = 20;
  }

  return {
    consistent: consistencyRatio <= 0.3,
    score: suspiciousScore,
    ratio: consistencyRatio,
    uniqueCount: uniqueFingerprints.length,
    totalCount: fingerprintHistory.length
  };
};

/**
 * Advanced fingerprint analysis using canvas and WebGL
 * Only works in browser environment
 */
export const generateAdvancedFingerprint = () => {
  if (typeof window === 'undefined') {
    return null; // Server-side, can't generate advanced fingerprint
  }

  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Canvas fingerprinting
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('Bot detection fingerprint test 🤖', 2, 2);
    
    const canvasFingerprint = canvas.toDataURL();
    
    // WebGL fingerprinting
    let webglFingerprint = 'unavailable';
    try {
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (gl) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          webglFingerprint = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        }
      }
    } catch (e) {
      // WebGL not available
    }
    
    return {
      canvas: hashString(canvasFingerprint),
      webgl: hashString(webglFingerprint),
      combined: hashString(canvasFingerprint + webglFingerprint)
    };
    
  } catch (error) {
    console.error('Error generating advanced fingerprint:', error);
    return null;
  }
};

export default {
  generateFingerprint,
  trackFingerprintChanges,
  analyzeFingerprintConsistency,
  generateAdvancedFingerprint
};
