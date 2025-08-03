// src/utils/proxyDetection.js
import { supabase } from '../store/supaStore';

export const detectProxy = async (requestData) => {
  const { ip_address, user_agent, headers = {} } = requestData;
  
  let proxyScore = 0;
  let proxyType = null;
  const detectionDetails = {
    knownProxy: false,
    suspiciousHeaders: [],
    geoInconsistencies: false,
    datacenterIP: false
  };

  try {
    // 1. Check against known proxy database
    const knownProxyCheck = await checkKnownProxyDatabase(ip_address);
    if (knownProxyCheck.isProxy) {
      proxyScore += 80;
      proxyType = knownProxyCheck.type;
      detectionDetails.knownProxy = true;
    }

    // 2. Analyze headers for proxy signatures
    const headerAnalysis = analyzeProxyHeaders(headers);
    proxyScore += headerAnalysis.score;
    detectionDetails.suspiciousHeaders = headerAnalysis.suspiciousHeaders;

    // 3. Check for datacenter/hosting IP
    const datacenterCheck = await checkDatacenterIP(ip_address);
    if (datacenterCheck.isDatacenter) {
      proxyScore += 60;
      proxyType = 'datacenter';
      detectionDetails.datacenterIP = true;
    }

    // 4. Geolocation consistency check
    const geoCheck = await checkGeolocationConsistency(ip_address, headers);
    if (geoCheck.inconsistent) {
      proxyScore += 40;
      detectionDetails.geoInconsistencies = true;
    }

    // 5. Check IP reputation
    const reputationCheck = await checkIPReputation(ip_address);
    if (reputationCheck.isSuspicious) {
      proxyScore += reputationCheck.score;
    }

    return {
      isProxy: proxyScore >= 50,
      proxyType,
      confidence: Math.min(proxyScore, 100),
      details: detectionDetails,
      score: proxyScore
    };

  } catch (error) {
    console.error('Proxy detection error:', error);
    return {
      isProxy: false,
      proxyType: null,
      confidence: 0,
      details: detectionDetails,
      score: 0,
      error: error.message
    };
  }
};

const checkKnownProxyDatabase = async (ip) => {
  try {
    // Check our internal known_proxies table
    const { data: knownProxy } = await supabase
      .from('known_proxies')
      .select('*')
      .eq('ip_address', ip)
      .single();

    if (knownProxy) {
      return {
        isProxy: true,
        type: knownProxy.proxy_type,
        confidence: knownProxy.confidence_score || 80
      };
    }

    // You can add external proxy detection services here
    // Example: IPQualityScore, MaxMind, etc.
    
    return { isProxy: false, type: null, confidence: 0 };

  } catch (error) {
    return { isProxy: false, type: null, confidence: 0 };
  }
};

const analyzeProxyHeaders = (headers) => {
  const proxyHeaders = [
    'x-forwarded-for',
    'x-real-ip',
    'x-proxy-id',
    'x-forwarded-host',
    'via',
    'forwarded',
    'x-cluster-client-ip',
    'x-forwarded-proto',
    'x-originating-ip',
    'x-remote-ip'
  ];

  let score = 0;
  const suspiciousHeaders = [];

  // Check for proxy-specific headers
  proxyHeaders.forEach(header => {
    if (headers[header.toLowerCase()] || headers[header.toUpperCase()]) {
      score += 15;
      suspiciousHeaders.push(header);
    }
  });

  // Check for header manipulation patterns
  if (hasHeaderManipulation(headers)) {
    score += 25;
    suspiciousHeaders.push('header_manipulation');
  }

  // Check for missing common headers
  if (!headers['accept-language']) {
    score += 10;
    suspiciousHeaders.push('missing_accept_language');
  }

  if (!headers['accept-encoding']) {
    score += 10;
    suspiciousHeaders.push('missing_accept_encoding');
  }

  return {
    score: Math.min(score, 100),
    suspiciousHeaders
  };
};

const hasHeaderManipulation = (headers) => {
  // Check for unusual header patterns that indicate manipulation
  const userAgent = headers['user-agent'] || '';
  const acceptLanguage = headers['accept-language'] || '';
  
  // Very generic or suspicious user agents
  if (userAgent.length < 10 || userAgent === 'Mozilla/5.0') {
    return true;
  }

  // Inconsistent language settings
  if (acceptLanguage && acceptLanguage.includes('*')) {
    return true;
  }

  return false;
};

const checkDatacenterIP = async (ip) => {
  try {
    // This would integrate with services like IPinfo, MaxMind, etc.
    // For now, we'll use a simple heuristic based on known patterns
    
    // Common datacenter IP ranges (simplified)
    const datacenterRanges = [
      '104.', '107.', '162.', '172.', '185.', '188.', '192.', '195.'
    ];

    const isLikelyDatacenter = datacenterRanges.some(range => ip.startsWith(range));

    if (isLikelyDatacenter) {
      // Add to known proxies database
      await supabase.from('known_proxies').upsert({
        ip_address: ip,
        proxy_type: 'datacenter',
        detected_at: new Date().toISOString(),
        confidence_score: 60
      });
    }

    return {
      isDatacenter: isLikelyDatacenter,
      type: isLikelyDatacenter ? 'datacenter' : null
    };

  } catch (error) {
    console.error('Datacenter check error:', error);
    return { isDatacenter: false, type: null };
  }
};

const checkGeolocationConsistency = async (ip, headers) => {
  try {
    // This would use a geolocation service
    // For demonstration, we'll use a simple check
    
    const acceptLanguage = headers['accept-language'] || '';
    const timezone = headers['x-timezone'] || '';

    // Basic inconsistency checks
    let inconsistencies = 0;

    // Check for common proxy giveaways
    if (acceptLanguage.includes('en-US') && timezone && !timezone.includes('America')) {
      inconsistencies++;
    }

    // Add more sophisticated geo checks here
    // - Compare IP location with browser timezone
    // - Check for VPN/proxy service provider locations
    // - Analyze time zone vs claimed location

    return {
      inconsistent: inconsistencies > 0,
      score: inconsistencies * 20
    };

  } catch (error) {
    return { inconsistent: false, score: 0 };
  }
};

const checkIPReputation = async (ip) => {
  try {
    // Check for recent suspicious activity from this IP
    const { data: recentSuspicious } = await supabase
      .from('request_tracking')
      .select('suspicious_score')
      .eq('ip_address', ip)
      .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('suspicious_score', { ascending: false })
      .limit(10);

    if (!recentSuspicious || recentSuspicious.length === 0) {
      return { isSuspicious: false, score: 0 };
    }

    const avgSuspiciousScore = recentSuspicious.reduce((sum, req) => 
      sum + req.suspicious_score, 0) / recentSuspicious.length;

    const highSuspiciousRequests = recentSuspicious.filter(req => 
      req.suspicious_score > 70).length;

    let score = 0;
    if (avgSuspiciousScore > 50) score += 30;
    if (highSuspiciousRequests > 5) score += 40;

    return {
      isSuspicious: score > 0,
      score,
      avgSuspiciousScore,
      highSuspiciousRequests
    };

  } catch (error) {
    console.error('IP reputation check error:', error);
    return { isSuspicious: false, score: 0 };
  }
};

// Export utility functions for external use
export {
  checkKnownProxyDatabase,
  analyzeProxyHeaders,
  checkDatacenterIP,
  checkGeolocationConsistency,
  checkIPReputation
};
